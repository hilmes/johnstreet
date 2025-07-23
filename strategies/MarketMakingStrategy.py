import logging
import time
import numpy as np
from typing import List, Dict, Optional, Tuple
from collections import deque
from src.core.strategies import TradingStrategy

class MarketMakingStrategy(TradingStrategy):
    """
    Market Making Strategy - A high-frequency quantitative strategy that provides
    liquidity to the market by continuously quoting bid and ask prices.
    
    This strategy:
    1. Analyzes order book depth and spread dynamics
    2. Calculates optimal bid/ask quotes based on fair value
    3. Places limit orders on both sides of the market
    4. Manages inventory risk through dynamic hedging
    5. Adjusts quotes based on market volatility and flow
    
    Best suited for liquid markets with tight spreads and high turnover.
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the Market Making strategy.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.target_spread_bps = config.get('target_spread_bps', 10)  # Basis points
        self.max_position_size = config.get('max_position_size', 1.0)
        self.max_inventory_usd = config.get('max_inventory_usd', 50000)
        self.quote_size = config.get('quote_size', 0.01)
        self.min_quote_size = config.get('min_quote_size', 0.001)
        self.inventory_target = config.get('inventory_target', 0.0)
        self.skew_factor = config.get('skew_factor', 0.5)  # Inventory skewing
        self.volatility_factor = config.get('volatility_factor', 2.0)
        self.order_refresh_time = config.get('order_refresh_time', 5)  # seconds
        self.fair_value_period = config.get('fair_value_period', 20)
        self.risk_limit_factor = config.get('risk_limit_factor', 0.02)  # 2% max risk
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        # Data storage
        self.price_history = deque(maxlen=self.fair_value_period)
        self.volume_history = deque(maxlen=self.fair_value_period)
        self.spread_history = deque(maxlen=100)
        self.trade_history = deque(maxlen=1000)
        
        # Order book tracking
        self.current_bid = None
        self.current_ask = None
        self.bid_depth = None
        self.ask_depth = None
        self.last_orderbook_time = 0
        
        # Position and inventory tracking
        self.current_inventory = 0.0  # Net position in base currency
        self.inventory_value = 0.0    # USD value of inventory
        self.avg_cost = 0.0          # Average cost of current inventory
        self.realized_pnl = 0.0
        self.unrealized_pnl = 0.0
        
        # Active orders tracking
        self.active_bid_orders = []
        self.active_ask_orders = []
        self.last_quote_time = 0
        
        # Market microstructure
        self.fair_value = None
        self.market_volatility = None
        self.order_flow_imbalance = 0.0
        self.recent_fills = deque(maxlen=50)

    def calculate_fair_value(self) -> Optional[float]:
        """
        Calculate fair value using VWAP and recent trade data.
        
        :return: Fair value price or None if insufficient data
        """
        if len(self.price_history) < 5:
            return None
        
        # Volume-weighted average price
        prices = np.array(list(self.price_history))
        volumes = np.array(list(self.volume_history))
        
        if np.sum(volumes) == 0:
            return np.mean(prices)
        
        vwap = np.sum(prices * volumes) / np.sum(volumes)
        
        # Adjust for recent order flow
        flow_adjustment = self.order_flow_imbalance * 0.001  # Small adjustment
        fair_value = vwap + flow_adjustment
        
        self.fair_value = fair_value
        return fair_value

    def calculate_volatility(self) -> float:
        """
        Calculate recent price volatility.
        
        :return: Volatility measure
        """
        if len(self.price_history) < 10:
            return 0.01  # Default volatility
        
        prices = np.array(list(self.price_history))
        returns = np.diff(np.log(prices))
        volatility = np.std(returns) * np.sqrt(252 * 24 * 60)  # Annualized
        
        self.market_volatility = volatility
        return volatility

    def calculate_optimal_spread(self, fair_value: float, volatility: float) -> float:
        """
        Calculate optimal bid-ask spread based on market conditions.
        
        :param fair_value: Current fair value
        :param volatility: Market volatility
        :return: Optimal spread in price units
        """
        # Base spread from configuration
        base_spread = fair_value * (self.target_spread_bps / 10000)
        
        # Adjust for volatility
        volatility_adjustment = 1 + (volatility * self.volatility_factor)
        
        # Adjust for inventory risk
        inventory_ratio = abs(self.current_inventory) / self.max_position_size
        inventory_adjustment = 1 + (inventory_ratio * 0.5)
        
        # Adjust for market depth (if available)
        depth_adjustment = 1.0
        if self.bid_depth and self.ask_depth:
            min_depth = min(self.bid_depth, self.ask_depth)
            if min_depth < self.quote_size * 2:
                depth_adjustment = 1.5  # Widen spread in thin markets
        
        optimal_spread = base_spread * volatility_adjustment * inventory_adjustment * depth_adjustment
        return optimal_spread

    def calculate_inventory_skew(self) -> float:
        """
        Calculate inventory skew adjustment for quotes.
        
        :return: Skew adjustment (positive = skew offers up, negative = skew bids up)
        """
        if self.max_position_size == 0:
            return 0.0
        
        # Normalize inventory to [-1, 1]
        inventory_ratio = self.current_inventory / self.max_position_size
        
        # Calculate skew - want to trade out of large positions
        skew = -inventory_ratio * self.skew_factor
        
        return skew

    def calculate_quote_sizes(self, fair_value: float) -> Tuple[float, float]:
        """
        Calculate bid and ask quote sizes based on inventory and risk.
        
        :return: Tuple of (bid_size, ask_size)
        """
        base_size = self.quote_size
        
        # Adjust size based on inventory
        inventory_ratio = abs(self.current_inventory) / self.max_position_size
        size_adjustment = max(0.1, 1.0 - inventory_ratio)
        
        # Reduce size if approaching risk limits
        risk_ratio = abs(self.inventory_value) / self.max_inventory_usd
        risk_adjustment = max(0.1, 1.0 - risk_ratio)
        
        adjusted_size = base_size * size_adjustment * risk_adjustment
        adjusted_size = max(adjusted_size, self.min_quote_size)
        
        # Different sizes for bid vs ask based on inventory
        if self.current_inventory > 0:  # Long inventory, eager to sell
            bid_size = adjusted_size * 0.7
            ask_size = adjusted_size * 1.3
        elif self.current_inventory < 0:  # Short inventory, eager to buy
            bid_size = adjusted_size * 1.3
            ask_size = adjusted_size * 0.7
        else:
            bid_size = ask_size = adjusted_size
        
        return bid_size, ask_size

    def should_quote(self) -> bool:
        """
        Determine if we should place new quotes.
        
        :return: True if should place quotes
        """
        # Time-based refresh
        if time.time() - self.last_quote_time > self.order_refresh_time:
            return True
        
        # Market moved significantly
        if self.fair_value and self.current_bid and self.current_ask:
            mid_price = (self.current_bid + self.current_ask) / 2
            price_move = abs(self.fair_value - mid_price) / mid_price
            if price_move > 0.001:  # 0.1% move
                return True
        
        # Inventory approaching limits
        inventory_ratio = abs(self.current_inventory) / self.max_position_size
        if inventory_ratio > 0.8:
            return True
        
        return False

    def is_within_risk_limits(self) -> bool:
        """
        Check if current position is within risk limits.
        
        :return: True if within limits
        """
        # Check position size limits
        if abs(self.current_inventory) > self.max_position_size:
            return False
        
        # Check inventory value limits
        if abs(self.inventory_value) > self.max_inventory_usd:
            return False
        
        # Check P&L drawdown limits
        total_pnl = self.realized_pnl + self.unrealized_pnl
        max_loss = self.max_inventory_usd * self.risk_limit_factor
        if total_pnl < -max_loss:
            return False
        
        return True

    def execute_quote_orders(self, bid_price: float, ask_price: float, 
                           bid_size: float, ask_size: float) -> Dict:
        """
        Execute bid and ask limit orders.
        
        :return: Dictionary with order results
        """
        orders = {"bid": None, "ask": None}
        
        # Only quote if within risk limits
        if not self.is_within_risk_limits():
            logging.warning("Outside risk limits, not placing quotes")
            return orders
        
        # Place bid order
        if bid_size >= self.min_quote_size:
            bid_order = {
                "pair": self.pair,
                "type": "buy",
                "ordertype": "limit",
                "price": str(bid_price),
                "volume": str(bid_size)
            }
            
            if self.simulate:
                logging.info(f"[SIMULATION] MM Bid {bid_size:.6f} @ {bid_price:.2f}")
                orders["bid"] = {**bid_order, "status": "simulated", "timestamp": time.time()}
            else:
                try:
                    response = self.kraken_api.create_order(**bid_order)
                    orders["bid"] = {**bid_order, "status": "submitted", "response": response}
                    self.active_bid_orders.append(orders["bid"])
                except Exception as e:
                    logging.error(f"Error placing bid order: {e}")
                    orders["bid"] = {**bid_order, "status": "failed", "error": str(e)}
        
        # Place ask order
        if ask_size >= self.min_quote_size:
            ask_order = {
                "pair": self.pair,
                "type": "sell",
                "ordertype": "limit",
                "price": str(ask_price),
                "volume": str(ask_size)
            }
            
            if self.simulate:
                logging.info(f"[SIMULATION] MM Ask {ask_size:.6f} @ {ask_price:.2f}")
                orders["ask"] = {**ask_order, "status": "simulated", "timestamp": time.time()}
            else:
                try:
                    response = self.kraken_api.create_order(**ask_order)
                    orders["ask"] = {**ask_order, "status": "submitted", "response": response}
                    self.active_ask_orders.append(orders["ask"])
                except Exception as e:
                    logging.error(f"Error placing ask order: {e}")
                    orders["ask"] = {**ask_order, "status": "failed", "error": str(e)}
        
        self.last_quote_time = time.time()
        return orders

    def update_inventory(self, side: str, size: float, price: float):
        """
        Update inventory tracking after a fill.
        
        :param side: 'buy' or 'sell'
        :param size: Fill size
        :param price: Fill price
        """
        if side == 'buy':
            # Buying increases inventory
            old_inventory = self.current_inventory
            new_inventory = old_inventory + size
            
            if old_inventory <= 0:
                # Starting fresh long position or reducing short
                self.avg_cost = price
            else:
                # Adding to long position
                total_cost = (old_inventory * self.avg_cost) + (size * price)
                self.avg_cost = total_cost / new_inventory
            
            self.current_inventory = new_inventory
            
        else:  # sell
            # Selling decreases inventory
            old_inventory = self.current_inventory
            new_inventory = old_inventory - size
            
            if old_inventory > 0 and new_inventory >= 0:
                # Selling from long position - realize P&L
                realized = (price - self.avg_cost) * size
                self.realized_pnl += realized
            elif old_inventory <= 0:
                # Going more short or starting short
                if old_inventory == 0:
                    self.avg_cost = price
                else:
                    # Adding to short position
                    total_cost = (abs(old_inventory) * self.avg_cost) + (size * price)
                    self.avg_cost = total_cost / abs(new_inventory)
            
            self.current_inventory = new_inventory
        
        # Update inventory value
        current_price = self.fair_value or price
        self.inventory_value = self.current_inventory * current_price
        
        # Update unrealized P&L
        if self.current_inventory != 0:
            self.unrealized_pnl = (current_price - self.avg_cost) * self.current_inventory
        else:
            self.unrealized_pnl = 0

    def update_market_data(self) -> Optional[Dict]:
        """
        Fetch and update market data including order book.
        
        :return: Current market data or None on error
        """
        try:
            # Get ticker data
            ticker = self.kraken_api.get_ticker_details(self.pair)
            # Get order book
            orderbook = self.kraken_api.get_order_book(self.pair, count=20)
            
            if ticker and orderbook:
                current_price = ticker['last']
                volume = ticker.get('volume_24h', 0)
                
                self.price_history.append(current_price)
                self.volume_history.append(volume)
                
                # Update order book data
                if 'bids' in orderbook and 'asks' in orderbook:
                    bids = orderbook['bids']
                    asks = orderbook['asks']
                    
                    if bids and asks:
                        self.current_bid = float(bids[0][0])
                        self.current_ask = float(asks[0][0])
                        
                        # Calculate depth
                        self.bid_depth = sum(float(bid[1]) for bid in bids[:5])
                        self.ask_depth = sum(float(ask[1]) for ask in asks[:5])
                        
                        # Calculate order flow imbalance
                        total_bid_volume = sum(float(bid[1]) for bid in bids[:10])
                        total_ask_volume = sum(float(ask[1]) for ask in asks[:10])
                        total_volume = total_bid_volume + total_ask_volume
                        
                        if total_volume > 0:
                            self.order_flow_imbalance = (total_bid_volume - total_ask_volume) / total_volume
                        
                        # Track spread
                        spread = self.current_ask - self.current_bid
                        self.spread_history.append(spread)
                
                self.last_orderbook_time = time.time()
                
                return {
                    'price': current_price,
                    'volume': volume,
                    'bid': self.current_bid,
                    'ask': self.current_ask,
                    'spread': self.current_ask - self.current_bid if self.current_ask and self.current_bid else 0
                }
        except Exception as e:
            logging.error(f"Error fetching market data: {e}")
        
        return None

    def run_once(self) -> Dict:
        """
        Execute one iteration of the market making strategy.
        
        :return: Dictionary with strategy status and any orders placed
        """
        try:
            # Update market data
            market_data = self.update_market_data()
            if market_data is None:
                return {"status": "error", "message": "Failed to fetch market data"}
            
            current_price = market_data['price']
            
            # Calculate fair value and volatility
            fair_value = self.calculate_fair_value()
            if fair_value is None:
                return {
                    "status": "waiting",
                    "message": f"Collecting data: {len(self.price_history)}/{self.fair_value_period}"
                }
            
            volatility = self.calculate_volatility()
            
            # Update unrealized P&L with current price
            if self.current_inventory != 0:
                self.unrealized_pnl = (current_price - self.avg_cost) * self.current_inventory
            
            logging.info(
                f"[Market Making] {self.pair} - Fair Value: {fair_value:.2f}, "
                f"Spread: {market_data['spread']:.2f}, Inventory: {self.current_inventory:.6f}, "
                f"Total P&L: {self.realized_pnl + self.unrealized_pnl:.2f}"
            )
            
            # Check if we should place new quotes
            if self.should_quote():
                # Calculate optimal spread and skew
                optimal_spread = self.calculate_optimal_spread(fair_value, volatility)
                inventory_skew = self.calculate_inventory_skew()
                
                # Calculate bid and ask prices
                half_spread = optimal_spread / 2
                bid_price = fair_value - half_spread + inventory_skew
                ask_price = fair_value + half_spread + inventory_skew
                
                # Ensure we don't cross the current market
                if self.current_bid and bid_price >= self.current_ask:
                    bid_price = self.current_bid - 0.01  # Stay below current ask
                if self.current_ask and ask_price <= self.current_bid:
                    ask_price = self.current_ask + 0.01  # Stay above current bid
                
                # Calculate quote sizes
                bid_size, ask_size = self.calculate_quote_sizes(fair_value)
                
                # Execute quotes
                orders = self.execute_quote_orders(bid_price, ask_price, bid_size, ask_size)
                
                return {
                    "status": "quotes_placed",
                    "orders": orders,
                    "fair_value": fair_value,
                    "spread": optimal_spread,
                    "inventory": self.current_inventory,
                    "realized_pnl": self.realized_pnl,
                    "unrealized_pnl": self.unrealized_pnl
                }
            
            # No action taken
            return {
                "status": "monitoring",
                "fair_value": fair_value,
                "volatility": volatility,
                "inventory": self.current_inventory,
                "inventory_value": self.inventory_value,
                "total_pnl": self.realized_pnl + self.unrealized_pnl,
                "spread": market_data['spread']
            }
            
        except Exception as e:
            logging.error(f"Error in market making strategy: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    def get_performance_metrics(self) -> Dict:
        """
        Calculate and return performance metrics.
        
        :return: Dictionary of performance metrics
        """
        # Calculate trading metrics
        total_trades = len(self.recent_fills)
        if total_trades == 0:
            return {
                "total_trades": 0,
                "total_pnl": self.realized_pnl,
                "unrealized_pnl": self.unrealized_pnl,
                "inventory": self.current_inventory,
                "inventory_value": self.inventory_value,
                "avg_spread": 0,
                "fill_rate": 0
            }
        
        # Calculate average spread
        avg_spread = np.mean(list(self.spread_history)) if self.spread_history else 0
        
        # Calculate fill rate (simplified)
        fill_rate = min(total_trades / 100, 1.0)  # Assume 100 quotes placed
        
        return {
            "total_trades": total_trades,
            "total_pnl": self.realized_pnl + self.unrealized_pnl,
            "realized_pnl": self.realized_pnl,
            "unrealized_pnl": self.unrealized_pnl,
            "inventory": self.current_inventory,
            "inventory_value": self.inventory_value,
            "avg_spread": avg_spread,
            "fill_rate": fill_rate,
            "volatility": self.market_volatility or 0,
            "order_flow_imbalance": self.order_flow_imbalance
        }

    def on_candle(self, candle_data: dict = None):
        """Process new candle data."""
        pass

    def on_tick(self, tick_data: dict):
        """
        Process new tick data for faster market making updates.
        
        :param tick_data: Real-time tick data
        """
        if 'price' in tick_data:
            self.price_history.append(tick_data['price'])
        
        # Update order flow metrics
        if 'side' in tick_data and 'size' in tick_data:
            # Track order flow for better fair value calculation
            flow_impact = tick_data['size'] if tick_data['side'] == 'buy' else -tick_data['size']
            self.order_flow_imbalance = self.order_flow_imbalance * 0.95 + flow_impact * 0.05