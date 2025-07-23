from __future__ import annotations

import logging
import asyncio
import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta

try:
    from pydantic import BaseModel
except ImportError:
    BaseModel = None


@dataclass
class Position:
    """Represents a trading position."""
    pair: str
    side: str  # 'buy' or 'sell'
    entry_price: float
    current_price: float
    volume: float
    pnl: float
    unrealized_pnl: float
    margin_used: float
    leverage: int
    entry_time: datetime
    last_update: datetime


@dataclass
class PortfolioMetrics:
    """Portfolio performance and risk metrics."""
    total_equity: float
    used_margin: float
    available_margin: float
    margin_level: float
    unrealized_pnl: float
    realized_pnl: float
    daily_pnl: float
    total_exposure: float
    position_count: int
    win_rate: float
    sharpe_ratio: float
    max_drawdown: float


# Optional Pydantic models if available
if BaseModel is not None:
    class ClosedTrade(BaseModel):
        """Represents a completed trade."""
        position_id: str
        pair: str
        side: str
        entry_price: float
        exit_price: float
        volume: float
        pnl: float
        entry_time: datetime
        exit_time: datetime

    class EquityCurvePoint(BaseModel):
        """Point in the equity curve."""
        timestamp: datetime
        equity: float
else:
    class ClosedTrade:
        pass

    class EquityCurvePoint:
        pass


class PortfolioManager:
    """
    Manages portfolio positions and performance tracking.
    Handles periodic updates, partial updates, and real-time streaming.
    """

    # Default assets to track
    DEFAULT_ASSETS = ["XBT", "ETH", "SOL", "AVAX", "LINK", "DOT"]

    # Asset name mappings from Kraken to standard form
    ASSET_MAP = {
        'XXBT': 'XBT',
        'XETH': 'ETH',
        'XSOL': 'SOL',
        'XAVAX': 'AVAX',
        'XLINK': 'LINK',
        'XDOT': 'DOT'
    }

    def __init__(
        self,
        config: Dict,
        db_manager,
        kraken_api,
        risk_manager=None,
        trade_executor=None
    ):
        """
        Initialize the PortfolioManager.

        Args:
            config: Configuration dictionary
            db_manager: Database manager instance
            kraken_api: EnhancedKrakenAPI instance
            risk_manager: Optional RiskManager instance
            trade_executor: Optional TradeExecutor instance
        """
        # Core components
        self.config = config
        self.db = db_manager
        self.kraken_api = kraken_api
        self.risk_manager = risk_manager
        self.trade_executor = trade_executor

        # Validate essential components
        if self.kraken_api is None:
            logging.warning(
                "No Kraken API instance provided. Methods requiring kraken_api "
                "may fail with NoneType errors."
            )

        # Core data structures
        self.positions: Dict[str, Position] = {}
        self.metrics: Optional[PortfolioMetrics] = None
        self.last_update = datetime.now()

        # Target allocations for rebalancing
        self.target_allocations = self._load_target_allocations()

        # Control flags and configuration
        self._running = False
        self._update_task: Optional[asyncio.Task] = None
        self.update_interval = config.get('PORTFOLIO_UPDATE_INTERVAL', 5)    # seconds
        self.api_timeout = config.get('API_TIMEOUT', 30)                    # seconds
        self.max_retries = config.get('MAX_RETRIES', 3)
        self.rebalance_threshold = config.get('REBALANCE_THRESHOLD', 0.05)  # 5%

        # Thread safety
        self._lock = asyncio.Lock()

        # Real-time updates queue
        self.stream_queue: asyncio.Queue = asyncio.Queue()

        # Default metrics time horizon
        self.default_metrics_days = config.get('METRICS_DAYS', 30)

        # Performance tracking
        self._operation_counts = {
            'balance_updates': 0,
            'position_updates': 0,
            'trades_processed': 0,
            'errors': 0
        }

        # Setup logging
        logging_level = config.get('LOGGING_LEVEL', 'INFO')
        logging.getLogger(__name__).setLevel(logging_level)

    @classmethod
    async def create(
        cls,
        config: Dict,
        db_manager,
        kraken_api,
        risk_manager=None,
        trade_executor=None
    ) -> PortfolioManager:
        """
        Create a PortfolioManager instance (async factory).
        Allows for any async initialization if needed.

        Args:
            config: Configuration dictionary
            db_manager: Database manager instance
            kraken_api: EnhancedKrakenAPI instance
            risk_manager: Optional RiskManager instance
            trade_executor: Optional TradeExecutor instance

        Returns:
            Initialized PortfolioManager instance
        """
        instance = cls(
            config=config,
            db_manager=db_manager,
            kraken_api=kraken_api,
            risk_manager=risk_manager,
            trade_executor=trade_executor
        )
        # Any async initialization can go here
        await instance._initialize_async()
        return instance

    async def _initialize_async(self):
        """Handle any async initialization tasks."""
        try:
            # Initialize database connection if needed
            if hasattr(self.db, 'initialize'):
                await self.db.initialize()

            # Load any initial state
            await self._load_initial_state()

            logging.info("Portfolio Manager async initialization complete.")
        except Exception as e:
            logging.error(f"Error during async initialization: {e}", exc_info=True)
            raise

    async def _load_initial_state(self):
        """Load any saved state from the database."""
        try:
            # Load last known positions
            saved_positions = await self.db.get_open_positions()
            if saved_positions:
                for pos_data in saved_positions:
                    position = Position(
                        pair=pos_data['pair'],
                        side=pos_data['side'],
                        entry_price=float(pos_data['entry_price']),
                        current_price=float(pos_data['current_price']),
                        volume=float(pos_data['volume']),
                        pnl=float(pos_data['pnl']),
                        unrealized_pnl=float(pos_data['unrealized_pnl']),
                        margin_used=float(pos_data['margin_used']),
                        leverage=int(pos_data['leverage']),
                        entry_time=datetime.fromisoformat(pos_data['entry_time']),
                        last_update=datetime.fromisoformat(pos_data['last_update'])
                    )
                    self.positions[pos_data['position_id']] = position

                logging.info(f"Loaded {len(saved_positions)} positions from database")

            # Load last metrics state if available
            last_metrics = await self.db.get_last_metrics()
            if last_metrics:
                self.metrics = PortfolioMetrics(
                    total_equity=float(last_metrics['total_equity']),
                    used_margin=float(last_metrics['used_margin']),
                    available_margin=float(last_metrics['available_margin']),
                    margin_level=float(last_metrics['margin_level']),
                    unrealized_pnl=float(last_metrics['unrealized_pnl']),
                    realized_pnl=float(last_metrics['realized_pnl']),
                    daily_pnl=float(last_metrics['daily_pnl']),
                    total_exposure=float(last_metrics['total_exposure']),
                    position_count=int(last_metrics['position_count']),
                    win_rate=float(last_metrics['win_rate']),
                    sharpe_ratio=float(last_metrics['sharpe_ratio']),
                    max_drawdown=float(last_metrics['max_drawdown'])
                )
                logging.info("Loaded last known metrics state from database")

        except Exception as e:
            logging.error(f"Error loading initial state: {e}", exc_info=True)
            # Don't raise - we can continue with empty state if needed

    def _load_target_allocations(self) -> Dict[str, float]:
        """
        Load target allocations from config or set defaults.
        
        Returns:
            Dict of asset -> allocation percentages (0 to 1).
        """
        allocations = self.config.get('TARGET_ALLOCATIONS', {})
        # If no allocations are provided, fallback to equal weighting
        if not allocations:
            default_allocation = 1.0 / len(self.DEFAULT_ASSETS)
            allocations = {asset: default_allocation for asset in self.DEFAULT_ASSETS}
        return allocations

    async def _calculate_metrics(self):
        """
        Calculate comprehensive portfolio metrics with validation.
        Includes equity, margins, PnL, and performance metrics.
        """
        async with self._lock:
            try:
                if not self.kraken_api:
                    logging.error("Cannot calculate metrics: kraken_api is None")
                    return

                # Get balances with timeout
                try:
                    balance = await self.get_balances()
                except asyncio.TimeoutError:
                    logging.error("Timeout getting balances for metrics")
                    return

                # Calculate total equity
                total_equity = 0.0
                if balance:
                    # Get current prices for all assets
                    prices = {}
                    for asset in balance.keys():
                        try:
                            # Use USD pair for price lookup
                            price = await asyncio.wait_for(
                                asyncio.to_thread(
                                    self.kraken_api.get_ticker_price,
                                    f"{asset}/USD"
                                ),
                                timeout=self.api_timeout
                            )
                            if price > 0:
                                prices[asset] = price
                                logging.debug(f"Got price for {asset}: {price}")
                        except Exception as e:
                            logging.error(f"Error getting price for {asset}: {e}")
                            continue

                    # Calculate total portfolio value
                    for asset, amount in balance.items():
                        if asset in prices:
                            value = amount * prices[asset]
                            total_equity += value
                            logging.debug(f"Asset {asset} value: {value:.2f} USD")

                # Calculate margin metrics
                used_margin = sum(p.margin_used for p in self.positions.values())
                available_margin = max(0.0, total_equity - used_margin)
                margin_level = (available_margin / used_margin) if used_margin > 0 else float('inf')

                # Calculate PnL metrics
                unrealized_pnl = sum(p.unrealized_pnl for p in self.positions.values())
                realized_pnl = await self._calculate_realized_pnl(self.default_metrics_days)
                daily_pnl = await self._calculate_daily_pnl()

                # Calculate exposure and position metrics
                total_exposure = sum(p.current_price * p.volume for p in self.positions.values())
                position_count = len(self.positions)

                # Calculate performance metrics
                win_rate = await self._calculate_win_rate(self.default_metrics_days)
                sharpe_ratio = await self._calculate_sharpe_ratio(self.default_metrics_days)
                max_drawdown = await self._calculate_max_drawdown(self.default_metrics_days)

                # Update metrics object
                self.metrics = PortfolioMetrics(
                    total_equity=total_equity,
                    used_margin=used_margin,
                    available_margin=available_margin,
                    margin_level=margin_level,
                    unrealized_pnl=unrealized_pnl,
                    realized_pnl=realized_pnl,
                    daily_pnl=daily_pnl,
                    total_exposure=total_exposure,
                    position_count=position_count,
                    win_rate=win_rate,
                    sharpe_ratio=sharpe_ratio,
                    max_drawdown=max_drawdown
                )

                logging.debug(
                    f"Updated metrics: equity={total_equity:.2f}, "
                    f"positions={position_count}, daily_pnl={daily_pnl:.2f}, "
                    f"margin_level={margin_level:.2f}"
                )

            except Exception as e:
                logging.error(f"Error calculating metrics: {e}", exc_info=True)
                self._operation_counts['errors'] += 1
                raise

    async def _calculate_daily_pnl(self) -> float:
        """
        Calculate total PnL for the current day.
        Includes both realized and unrealized PnL.
        """
        try:
            today = datetime.now().date()
            start_of_today = datetime.combine(today, datetime.min.time())

            # Get today's closed trades
            today_trades = await self.db.get_closed_trades(
                start_date=start_of_today,
                end_date=datetime.now()
            )
            realized_daily = sum(t['pnl'] for t in today_trades) if today_trades else 0.0

            # Add unrealized PnL from open positions
            unrealized_daily = sum(p.unrealized_pnl for p in self.positions.values())

            total_daily = realized_daily + unrealized_daily
            logging.debug(
                f"Daily PnL calculated: realized={realized_daily:.2f}, "
                f"unrealized={unrealized_daily:.2f}, total={total_daily:.2f}"
            )
            return total_daily

        except Exception as e:
            logging.error(f"Error calculating daily PnL: {e}", exc_info=True)
            self._operation_counts['errors'] += 1
            return 0.0

    async def _calculate_realized_pnl(self, days: int) -> float:
        """
        Calculate realized PnL for the specified period.
        
        Args:
            days: Number of days to look back
            
        Returns:
            float: Total realized PnL for the period
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            trades = await self.db.get_closed_trades(
                start_date=start_date,
                end_date=end_date
            )
            total_pnl = sum(t['pnl'] for t in trades) if trades else 0.0
            logging.debug(f"Calculated realized PnL for {days} days: {total_pnl:.2f}")
            return total_pnl

        except Exception as e:
            logging.error(f"Error calculating realized PnL: {e}", exc_info=True)
            self._operation_counts['errors'] += 1
            return 0.0

    async def _calculate_win_rate(self, days: int) -> float:
        """
        Calculate percentage of profitable trades.
        
        Args:
            days: Number of days to look back
            
        Returns:
            float: Win rate as a percentage (0-100)
        """
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            trades = await self.db.get_closed_trades(
                start_date=start_date,
                end_date=end_date
            )
            if not trades:
                return 0.0

            winning_trades = sum(1 for t in trades if t['pnl'] > 0)
            win_rate = (winning_trades / len(trades)) * 100
            logging.debug(
                f"Win rate calculated: {win_rate:.1f}% "
                f"({winning_trades}/{len(trades)} trades)"
            )
            return win_rate

        except Exception as e:
            logging.error(f"Error calculating win rate: {e}", exc_info=True)
            self._operation_counts['errors'] += 1
            return 0.0

    async def _calculate_sharpe_ratio(self, days: int) -> float:
        """
        Calculate Sharpe ratio from equity curve.
        
        Args:
            days: Number of days to look back
            
        Returns:
            float: Sharpe ratio or 0.0 if calculation fails
        """
        try:
            # Get equity curve data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            equity_curve = await self.db.get_equity_curve(
                start_date=start_date,
                end_date=end_date
            )

            if hasattr(equity_curve, 'empty') and equity_curve.empty:
                logging.warning("Empty equity curve data for Sharpe ratio calculation")
                return 0.0

            # Calculate daily returns
            daily_returns = equity_curve['equity'].pct_change().dropna()
            if len(daily_returns) < 2:
                logging.warning("Insufficient data for Sharpe ratio calculation")
                return 0.0

            # Calculate ratio
            risk_free_rate = self.config.get('RISK_FREE_RATE', 0.02)
            daily_rf = (1 + risk_free_rate) ** (1 / 252) - 1
            excess_returns = daily_returns - daily_rf

            # Annualize
            sharpe = np.sqrt(252) * excess_returns.mean() / excess_returns.std()
            sharpe_value = float(sharpe) if not pd.isna(sharpe) else 0.0
            logging.debug(
                f"Sharpe ratio calculated: {sharpe_value:.2f} "
                f"(rf={risk_free_rate:.1%})"
            )
            return sharpe_value

        except Exception as e:
            logging.error(f"Error calculating Sharpe ratio: {e}", exc_info=True)
            self._operation_counts['errors'] += 1
            return 0.0

    async def _calculate_max_drawdown(self, days: int) -> float:
        """
        Calculate maximum drawdown from equity curve.
        
        Args:
            days: Number of days to look back
            
        Returns:
            float: Maximum drawdown as a percentage (0-100)
        """
        try:
            # Get equity curve data
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            equity_curve = await self.db.get_equity_curve(
                start_date=start_date,
                end_date=end_date
            )

            if hasattr(equity_curve, 'empty') and equity_curve.empty:
                logging.warning("Empty equity curve data for drawdown calculation")
                return 0.0

            # Calculate drawdown
            running_max = equity_curve['equity'].cummax()
            drawdown = (equity_curve['equity'] - running_max) / running_max
            max_dd = abs(float(drawdown.min())) if not drawdown.empty else 0.0

            logging.debug(f"Maximum drawdown calculated: {max_dd:.1%}")
            return max_dd * 100  # Convert to percentage

        except Exception as e:
            logging.error(f"Error calculating max drawdown: {e}", exc_info=True)
            self._operation_counts['errors'] += 1
            return 0.0

    @staticmethod
    def _calculate_unrealized_pnl(
        side: str,
        entry_price: float,
        current_price: float,
        volume: float
    ) -> float:
        """
        Calculate unrealized PnL for a position.
        
        Args:
            side: Trade direction ('buy' or 'sell')
            entry_price: Position entry price
            current_price: Current market price
            volume: Position size
            
        Returns:
            float: Unrealized PnL value
        """
        try:
            if side.lower() == 'buy':
                return (current_price - entry_price) * volume
            else:  # 'sell'
                return (entry_price - current_price) * volume
        except Exception as e:
            logging.error(f"Error calculating unrealized PnL: {e}", exc_info=True)
            return 0.0

    async def get_balances(self) -> Dict[str, float]:
        """
        Example method to fetch balances (stub). Replace with your actual implementation.
        
        Returns:
            Dict of asset -> float balance
        """
        # Implement your actual logic to fetch balances here
        return {}

    #
    # ADDED METHODS
    #

    def get_positions(self) -> Dict[str, Position]:
        """
        Return a dictionary of all current open positions,
        keyed by position_id (or other unique identifier).
        
        Returns:
            Dict[str, Position]: current open positions
        """
        return self.positions

    async def commit_balances_to_db(self, balances: Dict[str, float]) -> None:
        """
        Commit the given balances to the database.
        
        Args:
            balances: Dictionary of asset -> balance to be stored
        """
        try:
            # Example: your DB manager might have a method like "save_balances"
            # Replace this with the real implementation.
            await self.db.save_balances(balances)
            logging.info("Committed balances to DB.")
        except Exception as e:
            logging.error(f"Error committing balances to DB: {e}", exc_info=True)
            # Reraise or handle error as needed
            raise
