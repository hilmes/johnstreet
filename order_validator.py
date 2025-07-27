"""
Order Validation and Pre-Trade Checks

Ensures orders are valid before submission to prevent costly mistakes.
"""

import logging
from typing import Dict, Optional, Tuple, List
from dataclasses import dataclass
from decimal import Decimal
import asyncio

logger = logging.getLogger(__name__)


@dataclass
class OrderValidationResult:
    """Result of order validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    adjusted_volume: Optional[float] = None
    adjusted_price: Optional[float] = None


class OrderValidator:
    """
    Validates orders against account balance, market conditions, and safety rules
    """
    
    def __init__(self, kraken_api, risk_manager):
        self.api = kraken_api
        self.risk_manager = risk_manager
        
        # Safety parameters
        self.max_order_value_pct = 0.10  # Max 10% of account per order
        self.max_slippage_pct = 0.02  # Max 2% slippage allowed
        self.min_order_size_usd = 10.0  # Minimum order size
        self.price_deviation_pct = 0.05  # Max 5% from current market price
        
        # Cache for efficiency
        self._balance_cache = {}
        self._price_cache = {}
        self._cache_ttl = 5  # seconds
        
    async def validate_order(
        self,
        pair: str,
        side: str,
        volume: float,
        order_type: str,
        price: Optional[float] = None
    ) -> OrderValidationResult:
        """
        Comprehensive order validation
        """
        errors = []
        warnings = []
        
        # 1. Validate basic parameters
        if side not in ['buy', 'sell']:
            errors.append(f"Invalid side: {side}")
            
        if volume <= 0:
            errors.append(f"Invalid volume: {volume}")
            
        if order_type not in ['market', 'limit', 'stop-loss', 'take-profit']:
            errors.append(f"Invalid order type: {order_type}")
            
        if order_type in ['limit', 'stop-loss', 'take-profit'] and not price:
            errors.append(f"Price required for {order_type} orders")
            
        # Return early if basic validation fails
        if errors:
            return OrderValidationResult(False, errors, warnings)
            
        # 2. Get current market data
        try:
            market_price = await self._get_market_price(pair)
            if not market_price:
                errors.append(f"Cannot get market price for {pair}")
                return OrderValidationResult(False, errors, warnings)
        except Exception as e:
            errors.append(f"Market data error: {str(e)}")
            return OrderValidationResult(False, errors, warnings)
            
        # 3. Validate price against market
        if price:
            price_deviation = abs(price - market_price) / market_price
            if price_deviation > self.price_deviation_pct:
                errors.append(
                    f"Price {price} deviates {price_deviation:.1%} from market {market_price}"
                )
                
        # 4. Calculate order value
        order_price = price if price else market_price
        order_value = volume * order_price
        
        # 5. Check minimum order size
        if order_value < self.min_order_size_usd:
            errors.append(f"Order value ${order_value:.2f} below minimum ${self.min_order_size_usd}")
            
        # 6. Validate against account balance
        balance_check = await self._validate_balance(pair, side, volume, order_price)
        if not balance_check['valid']:
            errors.append(balance_check['error'])
            if balance_check.get('available_volume'):
                warnings.append(
                    f"Maximum available volume: {balance_check['available_volume']:.8f}"
                )
                
        # 7. Check risk limits
        risk_check = await self._validate_risk_limits(pair, side, volume, order_price)
        if not risk_check['valid']:
            errors.append(risk_check['error'])
            
        # 8. Check for existing positions
        position_check = await self._check_position_limits(pair, side, volume)
        if position_check.get('warning'):
            warnings.append(position_check['warning'])
            
        # 9. Slippage protection for market orders
        if order_type == 'market':
            slippage_check = await self._estimate_slippage(pair, side, volume)
            if slippage_check['estimated_slippage'] > self.max_slippage_pct:
                errors.append(
                    f"Estimated slippage {slippage_check['estimated_slippage']:.1%} "
                    f"exceeds maximum {self.max_slippage_pct:.1%}"
                )
                warnings.append("Consider using a limit order instead")
                
        # 10. Check pair trading status
        pair_info = await self._get_pair_info(pair)
        if pair_info and pair_info.get('status') != 'online':
            errors.append(f"Pair {pair} is not available for trading")
            
        return OrderValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            warnings=warnings
        )
        
    async def _validate_balance(
        self, pair: str, side: str, volume: float, price: float
    ) -> Dict:
        """Validate order against available balance"""
        try:
            balance = await self._get_cached_balance()
            
            # Extract base and quote currencies
            # Kraken uses format like XXBTZUSD, XETHZUSD
            base_currency = self._extract_base_currency(pair)
            quote_currency = self._extract_quote_currency(pair)
            
            if side == 'buy':
                # Need quote currency to buy base
                required = volume * price
                available = float(balance.get(quote_currency, 0))
                
                if available < required:
                    return {
                        'valid': False,
                        'error': f"Insufficient {quote_currency} balance. "
                                f"Required: {required:.2f}, Available: {available:.2f}",
                        'available_volume': available / price if price > 0 else 0
                    }
                    
            else:  # sell
                # Need base currency to sell
                available = float(balance.get(base_currency, 0))
                
                if available < volume:
                    return {
                        'valid': False,
                        'error': f"Insufficient {base_currency} balance. "
                                f"Required: {volume:.8f}, Available: {available:.8f}",
                        'available_volume': available
                    }
                    
            # Check max order value percentage
            total_balance_usd = await self._get_total_balance_usd(balance)
            order_value_usd = volume * price
            
            if order_value_usd > total_balance_usd * self.max_order_value_pct:
                return {
                    'valid': False,
                    'error': f"Order value ${order_value_usd:.2f} exceeds "
                            f"{self.max_order_value_pct:.0%} of account balance"
                }
                
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"Balance validation error: {e}")
            return {'valid': False, 'error': f"Balance check failed: {str(e)}"}
            
    async def _validate_risk_limits(
        self, pair: str, side: str, volume: float, price: float
    ) -> Dict:
        """Validate against risk management limits"""
        try:
            # Check if risk manager allows the trade
            can_trade = self.risk_manager.can_open_position(
                pair=pair,
                size=volume * price,  # USD value
                side=side
            )
            
            if not can_trade:
                # Get specific reason
                if self.risk_manager.is_max_positions_reached():
                    return {'valid': False, 'error': "Maximum open positions reached"}
                elif self.risk_manager.is_max_drawdown_exceeded():
                    return {'valid': False, 'error': "Maximum drawdown exceeded"}
                elif self.risk_manager.daily_loss_limit_exceeded():
                    return {'valid': False, 'error': "Daily loss limit exceeded"}
                else:
                    return {'valid': False, 'error': "Risk limits exceeded"}
                    
            return {'valid': True}
            
        except Exception as e:
            logger.error(f"Risk validation error: {e}")
            return {'valid': False, 'error': f"Risk check failed: {str(e)}"}
            
    async def _check_position_limits(self, pair: str, side: str, volume: float) -> Dict:
        """Check position concentration limits"""
        try:
            positions = await self.api.get_open_positions()
            
            # Calculate current exposure
            pair_exposure = 0
            for pos in positions:
                if pos.get('pair') == pair:
                    pair_exposure += abs(float(pos.get('vol', 0)))
                    
            # Warn if adding to a large position
            if pair_exposure > 0:
                return {
                    'warning': f"Adding to existing {pair} position. "
                              f"Current exposure: {pair_exposure:.8f}"
                }
                
            return {}
            
        except Exception as e:
            logger.error(f"Position check error: {e}")
            return {}
            
    async def _estimate_slippage(self, pair: str, side: str, volume: float) -> Dict:
        """Estimate potential slippage for market orders"""
        try:
            # Get order book
            orderbook = await self.api.get_orderbook(pair)
            
            if side == 'buy':
                orders = orderbook.get('asks', [])
            else:
                orders = orderbook.get('bids', [])
                
            # Calculate average fill price
            remaining_volume = volume
            total_cost = 0
            
            for price_level, level_volume, _ in orders:
                price = float(price_level)
                available = float(level_volume)
                
                fill_volume = min(remaining_volume, available)
                total_cost += fill_volume * price
                remaining_volume -= fill_volume
                
                if remaining_volume <= 0:
                    break
                    
            if remaining_volume > 0:
                return {
                    'estimated_slippage': 0.10,  # 10% if not enough liquidity
                    'warning': 'Insufficient liquidity in orderbook'
                }
                
            avg_price = total_cost / volume
            market_price = float(orders[0][0]) if orders else 0
            
            if market_price > 0:
                slippage = abs(avg_price - market_price) / market_price
            else:
                slippage = 0
                
            return {'estimated_slippage': slippage}
            
        except Exception as e:
            logger.error(f"Slippage estimation error: {e}")
            return {'estimated_slippage': 0.01}  # Conservative estimate
            
    async def _get_market_price(self, pair: str) -> Optional[float]:
        """Get current market price with caching"""
        cache_key = f"price_{pair}"
        
        if cache_key in self._price_cache:
            cached_time, price = self._price_cache[cache_key]
            if time.time() - cached_time < self._cache_ttl:
                return price
                
        try:
            ticker = await self.api.get_ticker(pair)
            price = float(ticker[pair]['c'][0])  # Last trade price
            self._price_cache[cache_key] = (time.time(), price)
            return price
        except Exception as e:
            logger.error(f"Failed to get market price for {pair}: {e}")
            return None
            
    async def _get_cached_balance(self) -> Dict:
        """Get account balance with caching"""
        cache_key = "balance"
        
        if cache_key in self._balance_cache:
            cached_time, balance = self._balance_cache[cache_key]
            if time.time() - cached_time < self._cache_ttl:
                return balance
                
        try:
            balance = await self.api.get_account_balance()
            self._balance_cache[cache_key] = (time.time(), balance)
            return balance
        except Exception as e:
            logger.error(f"Failed to get account balance: {e}")
            return {}
            
    async def _get_total_balance_usd(self, balance: Dict) -> float:
        """Calculate total balance in USD"""
        total_usd = float(balance.get('ZUSD', 0))
        
        # Add other major currencies (simplified)
        # In production, would convert all holdings to USD
        if 'XXBT' in balance:
            btc_price = await self._get_market_price('XBTUSD')
            if btc_price:
                total_usd += float(balance['XXBT']) * btc_price
                
        if 'XETH' in balance:
            eth_price = await self._get_market_price('ETHUSD')
            if eth_price:
                total_usd += float(balance['XETH']) * eth_price
                
        return total_usd
        
    async def _get_pair_info(self, pair: str) -> Optional[Dict]:
        """Get trading pair information"""
        try:
            assets = await self.api.get_tradable_asset_pairs()
            return assets.get(pair)
        except Exception:
            return None
            
    def _extract_base_currency(self, pair: str) -> str:
        """Extract base currency from pair"""
        # Kraken uses X prefix for crypto (XXBT, XETH) and Z for fiat (ZUSD, ZEUR)
        currency_map = {
            'XBT': 'XXBT', 'ETH': 'XETH', 'XRP': 'XXRP',
            'USD': 'ZUSD', 'EUR': 'ZEUR', 'GBP': 'ZGBP'
        }
        
        for symbol, kraken_symbol in currency_map.items():
            if pair.startswith(symbol):
                return kraken_symbol
                
        # Default: first 4 chars
        return pair[:4]
        
    def _extract_quote_currency(self, pair: str) -> str:
        """Extract quote currency from pair"""
        currency_map = {
            'USD': 'ZUSD', 'EUR': 'ZEUR', 'GBP': 'ZGBP',
            'XBT': 'XXBT', 'ETH': 'XETH'
        }
        
        for symbol, kraken_symbol in currency_map.items():
            if pair.endswith(symbol):
                return kraken_symbol
                
        # Default: last 4 chars
        return pair[-4:]