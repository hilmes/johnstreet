import logging
from typing import Dict, Any, Optional

class TradingStrategy:
    """
    A base class/interface for trading strategies.

    **How to Use**:
      - Create a *new* .py file in your "strategies" folder (e.g. my_strategy.py).
      - In that file, import this base class and subclass it, for example:

            from src.core.strategies import TradingStrategy

            class MyCustomStrategy(TradingStrategy):
                def run(self):
                    # Strategy logic here...

      - The application's StrategyManager (or StrategyRowsPanel) will scan for
        these .py files, load the subclass, and display them in the TUI if
        everything else is set up correctly (database path, etc.).
    """

    def __init__(self, pair: str, config: Dict[str, Any], db: Any = None) -> None:
        """
        Base constructor for a trading strategy.

        :param pair: The trading pair (e.g., 'XBT/USD').
        :param config: A dictionary of configurations specific to the strategy.
        :param db: Database connection object
        """
        self.pair = pair
        self.config = config
        self.db = db
        self.initialize_components()

    def initialize_components(self) -> None:
        """
        Initialize strategy-specific components.
        This method should be overridden by subclasses that need
        specific initialization logic.
        """
        pass

    def run(self) -> None:
        """Execute the strategy logic."""
        raise NotImplementedError("Subclasses must implement run()")


class TrendFollowingStrategy(TradingStrategy):
    """
    Example Trend-Following strategy that inherits from TradingStrategy.
    """

    def __init__(self, pair: str, config: Dict[str, Any], db: Any = None) -> None:
        """
        :param pair: The trading pair (e.g., 'XBT/USD').
        :param config: Strategy configuration dictionary. Must contain
                       any parameters needed by the strategy (e.g.,
                       account size, risk per trade, etc.).
        :param db: Database connection object
        """
        super().__init__(pair, config, db)
        # Example usage: self.risk_per_trade = config["risk_per_trade"]

    def initialize_components(self) -> None:
        """Initialize trend-following specific components."""
        if self.db is None:
            raise ValueError("Database connection is required for TrendFollowingStrategy")
        # Initialize any strategy-specific components that require DB access

    def run(self) -> None:
        """
        Implement the logic for your trend-following strategy.
        For example:
         1. Fetch the latest price data
         2. Run technical indicators
         3. Place trades if conditions are met
        """
        logging.info(f"[TrendFollowing] Running on pair {self.pair} with config: {self.config}")
        # Example placeholder logic:
        # 1. Check if price is above a certain moving average -> go long
        # 2. Otherwise -> do nothing (or short, etc.)
        pass


class MeanReversionStrategy(TradingStrategy):
    """
    Example Mean-Reversion strategy that inherits from TradingStrategy.
    """

    def __init__(self, pair: str, config: Dict[str, Any], db: Any = None) -> None:
        """
        :param pair: The trading pair (e.g., 'ETH/USD').
        :param config: Strategy configuration dictionary. Must contain
                       any parameters needed by the strategy (e.g.,
                       account size, risk per trade, etc.).
        :param db: Database connection object
        """
        super().__init__(pair, config, db)
        # Example usage: self.risk_per_trade = config["risk_per_trade"]

    def initialize_components(self) -> None:
        """Initialize mean-reversion specific components."""
        if self.db is None:
            raise ValueError("Database connection is required for MeanReversionStrategy")
        # Initialize any strategy-specific components that require DB access

    def run(self) -> None:
        """
        Implement the logic for your mean-reversion strategy.
        For example:
         1. If current price deviates too far above average, short
         2. If too low, buy (expecting reversion to the mean)
        """
        logging.info(f"[MeanReversion] Running on pair {self.pair} with config: {self.config}")
        pass


class StrategyManager:
    """
    Manages multiple *instantiated* strategy objects, allowing you to add, remove,
    retrieve, and run strategies as needed.

    **Note**: This class uses an in-memory dict by default.
    If you want it to persist or integrate with a database, you can:
      - On each add/remove, update a database record
      - Or rely on a higher-level class that uses a StrategyDatabase
    """

    def __init__(
        self,
        strategies: Optional[Dict[str, TradingStrategy]] = None,
        db: Any = None,
        portfolio_manager: Any = None
    ) -> None:
        """
        :param strategies: A dictionary of {strategy_name -> strategy_instance}.
        :param db: Reference to your database or data layer.
        :param portfolio_manager: Reference to your PortfolioManager or similar.
        """
        self.strategies = strategies or {}
        self.db = db
        self.portfolio_manager = portfolio_manager

    def add_strategy(
        self,
        name: str,
        strategy_instance: TradingStrategy
    ) -> None:
        """
        Add an *already-instantiated* strategy to the manager.

        :param name: A unique strategy name/key.
        :param strategy_instance: An instantiated strategy object
        """
        self.strategies[name] = strategy_instance
        logging.info(f"[StrategyManager] Strategy '{name}' added.")

    def remove_strategy(self, name: str) -> None:
        """
        Remove a strategy by name.

        :param name: The strategy name/key to remove.
        """
        if name in self.strategies:
            del self.strategies[name]
            logging.info(f"[StrategyManager] Strategy '{name}' removed.")
        else:
            logging.warning(f"[StrategyManager] Attempted to remove non-existent strategy '{name}'")

    def get_strategy(self, name: str) -> Optional[TradingStrategy]:
        """
        Retrieve a strategy by name.

        :param name: The strategy name/key to retrieve.
        :return: The strategy instance if found, else None.
        """
        return self.strategies.get(name)

    def list_strategies(self) -> Dict[str, TradingStrategy]:
        """
        Get a dictionary of all registered strategies.
        :return: The strategy dictionary (name -> Strategy instance).
        """
        return self.strategies

    def run_all_strategies(self) -> None:
        """
        Run all registered strategies.
        For example, you might call this periodically in a scheduler.
        """
        for name, strategy in self.strategies.items():
            logging.info(f"[StrategyManager] Running strategy '{name}'...")
            try:
                strategy.run()
            except Exception as e:
                logging.error(f"[StrategyManager] Error running strategy '{name}': {str(e)}")
