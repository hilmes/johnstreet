"""
API Rate Limiting and Request Management

Prevents API bans and ensures compliance with exchange limits.
"""

import asyncio
import time
import logging
from typing import Dict, Optional, Callable, Any
from collections import deque
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class RateLimiter:
    """
    Sophisticated rate limiter for Kraken API with multiple tiers
    """
    
    def __init__(self):
        # Kraken API limits (as of 2024)
        self.tiers = {
            'Starter': {'limit': 15, 'decay': 3},      # 15 calls, -1 every 3 seconds
            'Intermediate': {'limit': 20, 'decay': 2}, # 20 calls, -1 every 2 seconds
            'Pro': {'limit': 20, 'decay': 1},          # 20 calls, -1 every 1 second
        }
        
        # Default to most conservative tier
        self.current_tier = 'Starter'
        self.call_counter = 0
        self.max_calls = self.tiers[self.current_tier]['limit']
        self.decay_rate = self.tiers[self.current_tier]['decay']
        
        # Request tracking
        self.request_times = deque(maxlen=100)
        self.endpoint_counters: Dict[str, int] = {}
        
        # Burst protection
        self.burst_limit = 5  # Max calls in 1 second
        self.burst_window = deque(maxlen=self.burst_limit)
        
        # Circuit breaker for rate limit errors
        self.rate_limit_errors = 0
        self.max_rate_limit_errors = 3
        self.backoff_until: Optional[datetime] = None
        
        # Decay task
        self._decay_task = None
        
    async def start(self):
        """Start the rate limit decay process"""
        if not self._decay_task:
            self._decay_task = asyncio.create_task(self._decay_loop())
            logger.info(f"Rate limiter started with {self.current_tier} tier")
            
    async def stop(self):
        """Stop the rate limiter"""
        if self._decay_task:
            self._decay_task.cancel()
            await asyncio.gather(self._decay_task, return_exceptions=True)
            
    async def _decay_loop(self):
        """Decay call counter over time"""
        while True:
            await asyncio.sleep(self.decay_rate)
            if self.call_counter > 0:
                self.call_counter -= 1
                
    async def acquire(self, endpoint: str = 'default', priority: int = 0) -> bool:
        """
        Acquire permission to make an API call
        Returns True if allowed, False if should wait
        """
        # Check if in backoff period
        if self.backoff_until and datetime.now() < self.backoff_until:
            wait_time = (self.backoff_until - datetime.now()).total_seconds()
            logger.warning(f"Rate limiter in backoff for {wait_time:.1f}s")
            return False
            
        # Check burst limit
        now = time.time()
        self.burst_window.append(now)
        if len(self.burst_window) == self.burst_limit:
            if now - self.burst_window[0] < 1.0:
                logger.warning("Burst limit reached, throttling")
                await asyncio.sleep(1.0)
                
        # Check rate limit
        if self.call_counter >= self.max_calls:
            logger.warning(f"Rate limit reached ({self.call_counter}/{self.max_calls})")
            # Wait for decay
            await asyncio.sleep(self.decay_rate)
            return await self.acquire(endpoint, priority)  # Retry
            
        # Record the request
        self.call_counter += 1
        self.request_times.append(datetime.now())
        self.endpoint_counters[endpoint] = self.endpoint_counters.get(endpoint, 0) + 1
        
        return True
        
    def record_rate_limit_error(self):
        """Record a rate limit error from the API"""
        self.rate_limit_errors += 1
        logger.error(f"Rate limit error #{self.rate_limit_errors}")
        
        if self.rate_limit_errors >= self.max_rate_limit_errors:
            # Exponential backoff
            backoff_seconds = min(300, 10 * (2 ** self.rate_limit_errors))
            self.backoff_until = datetime.now() + timedelta(seconds=backoff_seconds)
            logger.warning(f"Entering backoff period for {backoff_seconds}s")
            
    def reset_errors(self):
        """Reset error counter after successful requests"""
        if self.rate_limit_errors > 0:
            self.rate_limit_errors = 0
            self.backoff_until = None
            
    def set_tier(self, tier: str):
        """Update rate limit tier"""
        if tier in self.tiers:
            self.current_tier = tier
            self.max_calls = self.tiers[tier]['limit']
            self.decay_rate = self.tiers[tier]['decay']
            logger.info(f"Rate limiter tier updated to {tier}")
            
    def get_stats(self) -> Dict:
        """Get rate limiter statistics"""
        return {
            'current_tier': self.current_tier,
            'call_counter': self.call_counter,
            'max_calls': self.max_calls,
            'requests_last_minute': len([t for t in self.request_times 
                                        if t > datetime.now() - timedelta(minutes=1)]),
            'endpoint_counts': dict(self.endpoint_counters),
            'rate_limit_errors': self.rate_limit_errors,
            'in_backoff': self.backoff_until is not None
        }


class RateLimitedAPI:
    """
    Wrapper for API calls with automatic rate limiting
    """
    
    def __init__(self, api_instance, rate_limiter: RateLimiter):
        self.api = api_instance
        self.rate_limiter = rate_limiter
        
        # Method categories for different rate limits
        self.heavy_endpoints = ['get_trade_history', 'get_ledgers', 'get_closed_orders']
        self.priority_endpoints = ['create_order', 'cancel_order']
        
    async def __getattr__(self, name: str):
        """Wrap API methods with rate limiting"""
        orig_method = getattr(self.api, name)
        
        if not callable(orig_method):
            return orig_method
            
        async def rate_limited_method(*args, **kwargs):
            # Determine priority
            priority = 1 if name in self.priority_endpoints else 0
            
            # Acquire rate limit token
            max_retries = 3
            for attempt in range(max_retries):
                if await self.rate_limiter.acquire(endpoint=name, priority=priority):
                    break
                    
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff
                    logger.warning(f"Rate limit retry {attempt + 1}/{max_retries}, "
                                 f"waiting {wait_time}s")
                    await asyncio.sleep(wait_time)
                else:
                    raise Exception("Failed to acquire rate limit token")
                    
            try:
                # Make the actual API call
                result = await orig_method(*args, **kwargs)
                
                # Reset error counter on success
                self.rate_limiter.reset_errors()
                
                return result
                
            except Exception as e:
                # Check if it's a rate limit error
                if 'rate limit' in str(e).lower() or 'EAPI:Rate limit exceeded' in str(e):
                    self.rate_limiter.record_rate_limit_error()
                    
                raise
                
        return rate_limited_method


class AdaptiveRateLimiter(RateLimiter):
    """
    Advanced rate limiter that adapts based on API responses
    """
    
    def __init__(self):
        super().__init__()
        
        # Adaptive parameters
        self.success_streak = 0
        self.target_utilization = 0.7  # Use 70% of limit
        self.adjustment_threshold = 10  # Adjust after 10 successful calls
        
        # Response time tracking
        self.response_times = deque(maxlen=50)
        self.slow_response_threshold = 2.0  # seconds
        
    def record_response_time(self, response_time: float):
        """Record API response time for adaptive adjustment"""
        self.response_times.append(response_time)
        
        # If responses are getting slow, reduce rate
        if response_time > self.slow_response_threshold:
            self.call_counter = min(self.call_counter + 1, self.max_calls)
            logger.warning(f"Slow API response ({response_time:.1f}s), reducing rate")
            
    def record_success(self):
        """Record successful API call"""
        self.success_streak += 1
        
        # Consider upgrading tier if consistently successful
        if self.success_streak >= self.adjustment_threshold:
            current_utilization = self.call_counter / self.max_calls
            
            if current_utilization < self.target_utilization:
                # We're under-utilizing, safe to be more aggressive
                if self.current_tier == 'Starter':
                    self.set_tier('Intermediate')
                elif self.current_tier == 'Intermediate':
                    self.set_tier('Pro')
                    
            self.success_streak = 0
            
    def record_failure(self):
        """Record failed API call"""
        self.success_streak = 0
        
        # Consider downgrading tier if getting errors
        if self.rate_limit_errors > 1:
            if self.current_tier == 'Pro':
                self.set_tier('Intermediate')
            elif self.current_tier == 'Intermediate':
                self.set_tier('Starter')
                
    def get_recommended_delay(self) -> float:
        """Get recommended delay between calls based on current state"""
        if not self.response_times:
            return 0.1  # Default 100ms
            
        # Base delay on recent response times
        avg_response_time = sum(self.response_times) / len(self.response_times)
        
        # Add buffer based on current utilization
        utilization = self.call_counter / self.max_calls
        
        if utilization > 0.9:
            return max(1.0, avg_response_time)  # Slow down when near limit
        elif utilization > 0.7:
            return max(0.5, avg_response_time * 0.5)
        else:
            return max(0.1, avg_response_time * 0.2)