import logging
from typing import Dict, Optional
from src.core.strategies import TradingStrategy
from src.api.enhanced_kraken import EnhancedKrakenAPI

class MarketMakingStrategy(TradingStrategy):
    """
    A market making strategy that places limit orders around the mid price
    while managing inventory risk.
    """

    def __init__(self, pair: str, config: dict):
        """
        Initialize the market making strategy with configuration parameters.
        
        :param pair: Trading pair (e.g. "XBT/USD")
        :param config: Configuration dictionary containing strategy parameters
        """
        super().__init__(pair, config)
        
        # Strategy parameters
        self.pair = pair
        self.base_order_size = config.get('base_order_size', 0.001)
        self.spread_pct = config.get('spread_pct', 0.1)
        self.inventory_limit = config.get('inventory_limit', 0.01)
        self.simulate = config.get('simulate', True)
        
        # Initialize the enhanced Kraken API
        self.kraken_api = config.get('kraken_api')
        if not self.kraken_api:
            raise ValueError("kraken_api instance must be provided in config")

    def get_order_book_mid_price(self) -> tuple:
        """
        Fetch order book and calculate mid price.
        
        :return: Tuple of (mid_price, best_bid, best_ask)
        """
        ob = self.kraken_api.get_order_book(self.pair, count=5)
        if not ob or "bids" not in ob or "asks" not in ob:
            raise ValueError("Failed to fetch a valid order book")
            
        best_bid_price = float(ob["bids"][0][0])
        best_ask_price = float(ob["asks"][0][0])
        mid_price = (best_bid_price + best_ask_price) / 2.0
        
        return mid_price, best_bid_price, best_ask_price

    def get_current_position(self) -> float:
        """
        Get current inventory position.
        
        :return: Current position size
        """
        balances = self.kraken_api.get_account_balance()
        if not balances:
            logging.warning("Cannot retrieve balances. Assuming zero position.")
            return 0.0
            
        asset_key = "XXBT" if "XBT" in self.pair or "BTC" in self.pair else "XETH"
        return float(balances.get(asset_key, "0.0"))

    def calculate_order_sizes(self, current_position: float) -> tuple:
        """
        Calculate order sizes based on inventory position.
        
        :param current_position: Current inventory position
        :return: Tuple of (buy_size, sell_size)
        """
        buy_size = self.base_order_size
        sell_size = self.base_order_size
        
        if current_position > self.inventory_limit:
            buy_size = 0.0
            logging.info("Inventory limit exceeded on long side. Suppressing buys.")
        elif current_position < -self.inventory_limit:
            sell_size = 0.0
            logging.info("Inventory limit exceeded on short side. Suppressing sells.")
            
        return buy_size, sell_size

    def place_limit_orders(self, buy_price: float, sell_price: float, 
                          buy_size: float, sell_size: float) -> Dict:
        """
        Place or simulate limit orders.
        
        :return: Dictionary containing order information
        """
        orders_info = {
            "pair": self.pair,
            "buy_price": buy_price,
            "sell_price": sell_price,
            "buy_size": buy_size,
            "sell_size": sell_size
        }

        if buy_size > 0:
            buy_order_params = {
                "pair": self.pair,
                "type": "buy",
                "ordertype": "limit",
                "price": str(buy_price),
                "volume": str(buy_size),
            }
            
            if self.simulate:
                logging.info(f"[SIMULATION] Would place BUY limit @ {buy_price}, size={buy_size}")
                orders_info["buy_order_status"] = "simulated"
            else:
                logging.info(f"Placing REAL BUY limit @ {buy_price}, size={buy_size}")
                res = self.kraken_api.create_order(**buy_order_params)
                orders_info["buy_order_response"] = res
                orders_info["buy_order_status"] = "submitted"

        if sell_size > 0:
            sell_order_params = {
                "pair": self.pair,
                "type": "sell",
                "ordertype": "limit",
                "price": str(sell_price),
                "volume": str(sell_size),
            }
            
            if self.simulate:
                logging.info(f"[SIMULATION] Would place SELL limit @ {sell_price}, size={sell_size}")
                orders_info["sell_order_status"] = "simulated"
            else:
                logging.info(f"Placing REAL SELL limit @ {sell_price}, size={sell_size}")
                res = self.kraken_api.create_order(**sell_order_params)
                orders_info["sell_order_response"] = res
                orders_info["sell_order_status"] = "submitted"

        return orders_info

    def run_once(self) -> Optional[Dict]:
        """
        Execute one iteration of the market making strategy.
        
        :return: Dictionary containing order information or None on error
        """
        try:
            # 1. Get order book and calculate mid price
            mid_price, best_bid, best_ask = self.get_order_book_mid_price()
            logging.info(f"[Market Maker] Pair={self.pair}, BestBid={best_bid:.2f}, "
                        f"BestAsk={best_ask:.2f}, Mid={mid_price:.2f}")

            # 2. Check current position
            current_position = self.get_current_position()
            logging.info(f"Current position: {current_position:.4f}")

            # 3. Calculate order sizes based on inventory
            buy_size, sell_size = self.calculate_order_sizes(current_position)

            # 4. Calculate limit order prices
            spread_factor = self.spread_pct / 100.0
            buy_price = round(mid_price * (1.0 - spread_factor), 2)
            sell_price = round(mid_price * (1.0 + spread_factor), 2)

            # 5. Place or simulate orders
            return self.place_limit_orders(buy_price, sell_price, buy_size, sell_size)

        except Exception as e:
            logging.error(f"Error in market making strategy: {e}", exc_info=True)
            return None

    def run_forever(self, sleep_time: int = 60):
        """
        Run the strategy continuously.
        
        :param sleep_time: Time to sleep between iterations in seconds
        """
        while True:
            self.run_once()
            time.sleep(sleep_time)

    def on_candle(self, candle_data: dict = None):
        """
        Handle new candle data (not primary execution method for this strategy).
        
        :param candle_data: New candle data (unused in market making)
        """
        pass  # Market making primarily uses order book data, not candles

    def on_tick(self, tick_data: dict):
        """
        Handle new tick data (potential future enhancement).
        
        :param tick_data: New tick data
        """
        pass  # Could be implemented for more responsive market making