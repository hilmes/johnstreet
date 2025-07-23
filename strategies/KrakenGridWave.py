import logging
import time
from typing import List, Dict, Optional
from src.core.strategies import TradingStrategy

class GridTradingStrategy(TradingStrategy):
    """
    A grid trading strategy that:
    1. Defines a price range with upper and lower bounds
    2. Creates multiple price levels within that range
    3. Places limit orders at each level
    4. Manages the grid of orders
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the grid trading strategy.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.lower_bound = config.get('lower_bound', 25000.0)
        self.upper_bound = config.get('upper_bound', 30000.0)
        self.grid_levels = config.get('grid_levels', 5)
        self.base_order_size = config.get('base_order_size', 0.001)
        self.simulate = config.get('simulate', True)
        
        # Get Kraken API from config
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")
        
        # Validate basic parameters
        if self.lower_bound >= self.upper_bound:
            raise ValueError("Lower bound must be less than upper bound")
        if self.grid_levels <= 0:
            raise ValueError("Grid levels must be a positive integer")

        # Calculate grid step size
        self.price_step = (self.upper_bound - self.lower_bound) / self.grid_levels
        
        # Track placed orders
        self.active_orders = []

    def get_current_price(self) -> Optional[float]:
        """
        Fetch current market price.
        
        :return: Current price or None on error
        """
        try:
            current_price = self.kraken_api.get_ticker_price(self.pair)
            if current_price <= 0.0:
                logging.error("Invalid ticker price received")
                return None
            return current_price
        except Exception as e:
            logging.error(f"Error fetching current price: {e}")
            return None

    def calculate_grid_levels(self, current_price: float) -> List[Dict]:
        """
        Calculate grid levels and determine order types.
        
        :param current_price: Current market price
        :return: List of grid levels with order information
        """
        grid_levels = []
        
        for i in range(self.grid_levels + 1):
            grid_price = self.lower_bound + (self.price_step * i)
            grid_price = round(grid_price, 2)
            
            # Determine order type based on price level
            order_type = "buy" if grid_price < current_price else "sell"
            
            grid_levels.append({
                "price": grid_price,
                "type": order_type,
                "size": self.base_order_size
            })
            
        return grid_levels

    def place_grid_order(self, level: Dict) -> Dict:
        """
        Place or simulate a single grid order.
        
        :param level: Grid level information
        :return: Order information dictionary
        """
        order_params = {
            "pair": self.pair,
            "type": level["type"],
            "ordertype": "limit",
            "price": str(level["price"]),
            "volume": str(level["size"])
        }
        
        if self.simulate:
            logging.info(
                f"[SIMULATION] Would place {level['type']} limit @ {level['price']}"
            )
            return {
                **order_params,
                "status": "simulated"
            }
        else:
            logging.info(f"Placing REAL {level['type']} limit order @ {level['price']}")
            try:
                response = self.kraken_api.create_order(**order_params)
                return {
                    **order_params,
                    "status": "submitted",
                    "exchange_response": response
                }
            except Exception as e:
                logging.error(f"Error placing order: {e}")
                return {
                    **order_params,
                    "status": "failed",
                    "error": str(e)
                }

    def run_once(self) -> List[Dict]:
        """
        Execute one iteration of the grid trading strategy.
        
        :return: List of placed orders
        """
        try:
            # 1. Get current market price
            current_price = self.get_current_price()
            if current_price is None:
                return []

            logging.info(
                f"[Grid Strategy] Pair: {self.pair}, Current Price: {current_price:.2f}"
            )
            logging.info(
                f"Lower Bound: {self.lower_bound:.2f}, "
                f"Upper Bound: {self.upper_bound:.2f}, "
                f"Levels: {self.grid_levels}"
            )

            # 2. Calculate grid levels
            grid_levels = self.calculate_grid_levels(current_price)

            # 3. Place orders at each level
            placed_orders = []
            for level in grid_levels:
                order_info = self.place_grid_order(level)
                placed_orders.append(order_info)
                
                # Rate limiting pause
                time.sleep(1.0)

            # 4. Update active orders
            self.active_orders = placed_orders
            
            logging.info(f"Grid strategy complete. {len(placed_orders)} orders processed.")
            return placed_orders

        except Exception as e:
            logging.error(f"Error in grid trading strategy: {e}", exc_info=True)
            return []

    def on_candle(self, candle_data: dict = None):
        """
        Process new candle data.
        
        :param candle_data: New candle data (unused in grid trading)
        """
        pass  # Grid trading doesn't primarily use candle data

    def on_tick(self, tick_data: dict):
        """
        Process new tick data.
        
        :param tick_data: New tick data
        """
        # Could be implemented to dynamically adjust grid levels
        pass

    def run_forever(self, sleep_time: int = 60):
        """
        Run the strategy continuously.
        
        :param sleep_time: Time to sleep between iterations in seconds
        """
        while True:
            self.run_once()
            time.sleep(sleep_time)

    def get_active_orders(self) -> List[Dict]:
        """
        Get current active grid orders.
        
        :return: List of active orders
        """
        return self.active_orders

    def cancel_all_orders(self) -> bool:
        """
        Cancel all active grid orders.
        
        :return: True if successful, False otherwise
        """
        if self.simulate:
            logging.info("[SIMULATION] Would cancel all active orders")
            self.active_orders = []
            return True
            
        try:
            # Implementation would depend on your Kraken API wrapper
            # This is a placeholder for the actual implementation
            for order in self.active_orders:
                if order.get("exchange_response", {}).get("id"):
                    self.kraken_api.cancel_order(order["exchange_response"]["id"])
            self.active_orders = []
            return True
        except Exception as e:
            logging.error(f"Error cancelling orders: {e}")
            return False