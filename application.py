# application.py

import logging
import asyncio
import time
import json
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any, List, Callable, Awaitable, Deque, Tuple
from collections import deque
from functools import lru_cache, wraps

from textual.app import App, ComposeResult
from textual.widgets import (
    Footer, Label, Button, DataTable, Input, LoadingIndicator, Static, Digits, OptionList
)
from textual.containers import Horizontal, Vertical, VerticalScroll
from textual import on
from textual.reactive import reactive

# Logging at DEBUG level
logging.basicConfig(level=logging.DEBUG)

# Starlette-based server (if used)
from textual_serve.server import Server

# Local imports
from src.config import AppConfig
from src.api.enhanced_kraken import EnhancedKrakenAPI
from src.api.market_data_batcher import MarketDataBatcher
from src.core.task_manager import EnhancedTaskManager
from src.core.portfolio import PortfolioManager
from src.core.risk import RiskManager
from src.core.monitor import MonitoringSystem, SystemMonitor
from src.core.trade import TradeExecutor
from src.core.strategies import TrendFollowingStrategy, MeanReversionStrategy
from src.core.performance import PerformanceMonitor
from src.data.database import Database

# Components & Widgets
from src.ui.components import (
    NavigationSidebar,
    AsyncButton,
    EnhancedTradesDisplay,
    EnhancedSystemStatus,
    EnhancedCollapsibleAlgoRow
)
from src.ui.widgets.performance_widget import PerformanceWidget
from src.ui.widgets.pair_selection import PairSelectionWidget
from src.ui.widgets.portfolio_widget import PortfolioPanel
from src.ui.widgets.custom_header import JohnStreetHeader  # <-- Our custom header
from src.ui.performance_screen import PerformanceScreen
from src.ui.widgets.analysis_widget import AnalysisWidget
from ui.widgets.strategy_widget import StrategyManager

# WebSocket handler
from websocket_handler import EnhancedWebSocketHandler

# Helpers
from helpers import safe_backup_path


# -------------------------------------------------------------------------
# Helper for Safe Serialization
# -------------------------------------------------------------------------
def _safe_serialize(value: Any) -> str:
    """
    Recursively JSON-serialize any nested structure (dict/list/tuple).
    Falls back to str() for any object that can't be JSON-encoded.
    """
    # Use default=str to avoid errors on non-serializable objects
    return json.dumps(value, sort_keys=True, default=str)


# -------------------------------------------------------------------------
# Optimized & Utility Classes
# -------------------------------------------------------------------------
class EnhancedTaskTracker:
    """Enhanced task management with thread safety and automatic cleanup."""
    def __init__(self):
        self._tasks = set()
        self._lock = asyncio.Lock()
    
    async def add_task(self, task: asyncio.Task):
        async with self._lock:
            self._tasks.add(task)
            task.add_done_callback(self._tasks.discard)
    
    async def cancel_all(self):
        async with self._lock:
            for task in self._tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*self._tasks, return_exceptions=True)


class OptimizedMarketDataBatcher:
    """Optimized market data batching with memory management."""
    def __init__(self, batch_size: int = 50, flush_interval: float = 0.5):
        self._batch = []
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._lock = asyncio.Lock()
        self._last_flush = time.monotonic()
        self._process_batch_callback = None
    
    def set_process_callback(self, callback: Callable[[List[dict]], Awaitable[None]]):
        self._process_batch_callback = callback
    
    async def add(self, item: dict):
        async with self._lock:
            self._batch.append(item)
            current_time = time.monotonic()
            
            if (len(self._batch) >= self._batch_size or 
                current_time - self._last_flush >= self._flush_interval):
                await self._flush()
    
    async def _flush(self):
        if not self._batch or not self._process_batch_callback:
            return
            
        batch_to_process = self._batch
        self._batch = []
        self._last_flush = time.monotonic()
        
        try:
            await self._process_batch_callback(batch_to_process)
        except Exception as e:
            logging.error(f"Error processing batch: {e}", exc_info=True)


class UIComponentCache:
    """Cache for UI components to reduce recreation."""

    def __init__(self, max_size: int = 100):
        self._cache = {}
        self._max_size = max_size

    @lru_cache(maxsize=100)
    def get_component(self, component_type: str, **kwargs) -> Any:
        """
        Convert ANY non-primitive (dict, list, etc.) to JSON strings
        so we can build a frozenset without 'unhashable type' errors.
        """
        converted_kwargs = {}

        for key_name, val in kwargs.items():
            # If val is a dict, list, or any other non-primitive, we recursively JSON-serialize it
            if not isinstance(val, (str, int, float, bool, type(None))):
                val = _safe_serialize(val)
            converted_kwargs[key_name] = val

        key = (component_type, frozenset(converted_kwargs.items()))

        # If not in cache, create and store
        if key not in self._cache:
            if len(self._cache) >= self._max_size:
                self._cache.pop(next(iter(self._cache)))
            self._cache[key] = self._create_component(component_type, **kwargs)

        return self._cache[key]

    def _create_component(self, component_type: str, **kwargs) -> Any:
        if component_type == "system-status":
            component_class = kwargs.get("component")
            if component_class:
                return component_class()
        elif component_type == "navigation-sidebar":
            component_class = kwargs.get("component")
            if component_class:
                return component_class()
        elif component_type == "system-status-data":
            return kwargs.get("data")
        elif component_type == "performance-metrics":
            return kwargs.get("data")
        elif component_type == "home-screen":
            return kwargs.get("data")
        elif component_type == "main-content":
            return None
        return None


class OptimizedTradeHistory:
    """Optimized trade history with efficient lookups."""
    def __init__(self, max_size: int = 1000):
        self._trades: Deque[Dict] = deque(maxlen=max_size)
        self._index: Dict[str, int] = {}
    
    def add_trade(self, trade: Dict):
        trade_id = trade.get('id')
        if trade_id:
            self._trades.append(trade)
            self._index[trade_id] = len(self._trades) - 1
    
    def get_trade(self, trade_id: str) -> Optional[Dict]:
        if trade_id in self._index:
            return self._trades[self._index[trade_id]]
        return None


class WebSocketPool:
    """Connection pool for WebSocket connections."""
    def __init__(self, max_connections: int = 5):
        self._connections = []
        self._max_connections = max_connections
        self._lock = asyncio.Lock()
    
    async def get_connection(self):
        async with self._lock:
            for conn in self._connections:
                if not conn.active:
                    await conn.connect()
                    return conn
            
            if len(self._connections) < self._max_connections:
                conn = await self._create_connection()
                self._connections.append(conn)
                return conn
            
            return None
    
    async def _create_connection(self):
        # Create a new EnhancedWebSocketHandler connection
        pass


class RateLimiter:
    """Token bucket rate limiter for API requests."""
    def __init__(self, rate: float, capacity: int):
        self._rate = rate
        self._capacity = capacity
        self._tokens = capacity
        self._last_update = time.monotonic()
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self._last_update
            self._tokens = min(
                self._capacity,
                self._tokens + elapsed * self._rate
            )
            if self._tokens >= 1:
                self._tokens -= 1
                self._last_update = now
                return True
            return False


class DatabasePool:
    """Database connection pooling."""
    def __init__(self, max_connections: int = 10):
        self._pool = []
        self._max_connections = max_connections
        self._lock = asyncio.Lock()
        self._query_cache = QueryCache()
    
    async def acquire(self):
        async with self._lock:
            for conn in self._pool:
                if not conn.in_use:
                    conn.in_use = True
                    return conn
            
            if len(self._pool) < self._max_connections:
                conn = await self._create_connection()
                self._pool.append(conn)
                conn.in_use = True
                return conn
            return None
    
    async def execute_query(self, query: str, params: tuple = None):
        return await self._query_cache.get_or_execute(query, params)
    
    async def _create_connection(self):
        # Create a new database connection
        pass


class QueryCache:
    """Cache for database query results."""
    def __init__(self, ttl: int = 60):
        self._cache = {}
        self._ttl = ttl
    
    async def get_or_execute(self, query: str, params: tuple = None):
        cache_key = (query, params)
        cached = self._cache.get(cache_key)
        if cached and time.monotonic() - cached['timestamp'] < self._ttl:
            return cached['result']
        
        result = await self._execute_query(query, params)
        self._cache[cache_key] = {
            'result': result,
            'timestamp': time.monotonic()
        }
        return result
    
    async def _execute_query(self, query: str, params: tuple = None):
        # Database query execution logic here
        pass


class VirtualizedDataTable:
    """Virtual scrolling for large datasets."""
    def __init__(self, page_size: int = 50):
        self._data = []
        self._page_size = page_size
        self._current_page = 0
        
    async def load_page(self, page_num: int):
        start_idx = page_num * self._page_size
        end_idx = start_idx + self._page_size
        visible_data = self._data[start_idx:end_idx]
        return [self._render_row(row) for row in visible_data]
    
    def _render_row(self, row: Dict) -> List[str]:
        return [
            str(row.get("id", "")),
            str(row.get("symbol", "")),
            str(row.get("price", ""))
        ]


def debounce(delay: float):
    """Decorator for debounced function execution."""
    def decorator(func):
        task = None
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            nonlocal task
            if task is not None:
                task.cancel()
            
            async def delayed():
                await asyncio.sleep(delay)
                await func(*args, **kwargs)
            
            task = asyncio.create_task(delayed())
        return wrapper
    return decorator


class UIState(Enum):
    """Track UI state: IDLE, LOADING, or ERROR."""
    IDLE = "idle"
    LOADING = "loading"
    ERROR = "error"


# -------------------------------------------------------------------------
# Main Application Class (SINGLE-SCREEN Approach B)
# -------------------------------------------------------------------------
class EnhancedAlgoTradingTUI(App):
    """Enhanced TUI with integrated widgets and optimized operations."""

    STARTUP_SIZE = (1600, 800)
    
    CSS = """
    Screen {
        layout: vertical;
        height: 100%;
        width: 100%;
        background: #1a1a1a;
    }

    .header-content {
        width: 100%;
        height: auto;
        background: #2d2d2d;
        color: white;
        padding: 1;
    }

    .header-item {
        margin-right: 2;
        min-width: 15;
        height: 3;
    }

    #ascii-logo {
        color: white;
        padding: 0 2;
        text-align: center;
        min-width: 40;
    }

    Horizontal.main-container {
        height: 1fr;
    }

    NavigationSidebar {
        width: 30;
        background: #2d2d2d;
        color: white;
        padding: 1;
    }

    VerticalScroll#main-content {
        width: 1fr;
        overflow-y: auto;
        padding: 1;
    }

    .sidebar-btn {
        width: 100%;
        margin-bottom: 1;
        background: #3d3d3d;
        color: white;
    }

    .metrics-panel {
        height: auto;
        margin: 1;
        padding: 1;
        border: solid #3d3d3d;
        background: #2d2d2d;
        color: white;
    }

    LoadingIndicator {
        height: 3;
    }

    /* -----------------------------------
       Portfolio Panel Styles
       ----------------------------------- */
    PortfolioPanel {
        height: 100%;
        padding: 1;
        background: $surface;
    }

    .screen-title {
        width: 1fr;
        content-align: center middle;
        padding: 1;
        background: $accent;
        color: $text;
        margin-bottom: 1;
    }

    .total-value-container {
        width: 100%;
        height: auto;
        padding: 1;
        content-align: right middle;
        background: $panel;
        border-bottom: solid $primary-background;
    }

    .total-value {
        text-style: bold;
        min-width: 15;
        text-align: right;
        color: $success;
    }

    #asset-rows-container {
        border: heavy $accent;
        padding: 0;
    }

    .asset-row {
        width: 100%;
        height: 3;
        align: left middle;
    }

    .row-section {
        height: 100%;
        min-width: 25;
        padding: 0 1;
        border-right: solid $primary-background;
    }

    .stat-label {
        color: $text-muted;
        min-width: 8;
    }

    .stat-value {
        text-align: right;
        width: 1fr;
        padding-right: 1;
    }

    PortfolioRow {
        width: 100%;
        height: 3;
        border-bottom: solid $primary-background;
        background: $surface;
    }

    PortfolioRow:hover {
        background: $boost;
    }
    """

    BINDINGS = [("ctrl+q", "quit", "Quit")]

    loading: reactive[bool] = reactive(False)
    ui_state: reactive[UIState] = reactive(UIState.IDLE)
    all_time_pnl: reactive[float] = reactive(0.0)
    btc_price: reactive[float] = reactive(0.0)

    def __init__(
        self,
        websocket: Optional[EnhancedWebSocketHandler] = None,
        portfolio_manager: Optional[PortfolioManager] = None
    ):
        super().__init__()
        # Initialize your core + optimized + trading components
        self._init_core_components(websocket, portfolio_manager)
        self._init_optimized_components()
        self._init_trading_components()

        # Create or retrieve the system status widget
        self.sys_status = self.ui_cache.get_component(
            "system-status",
            component=EnhancedSystemStatus
        )

        # Instantiate your custom header with references
        self.custom_header = JohnStreetHeader(
            sys_status=self.sys_status,
            btc_price=self.btc_price,
            all_time_pnl=self.all_time_pnl
        )

    def _init_optimized_components(self):
        """Initialize optimized components."""
        self.task_tracker = EnhancedTaskTracker()
        self.market_data_batcher = OptimizedMarketDataBatcher()
        self.ui_cache = UIComponentCache()
        self.trade_history = OptimizedTradeHistory()
        self.ws_pool = WebSocketPool()
        self.rate_limiter = RateLimiter(rate=10.0, capacity=100)
        self.db_pool = DatabasePool()
        self.virtualized_table = VirtualizedDataTable()

    def _init_core_components(self, websocket, portfolio_manager):
        """Initialize core system components."""
        self._running = True
        self._is_server_mode = False

        self.config = AppConfig.from_env()
        self.db: Optional[Database] = None  # We'll connect DB later

        self.kraken_api = EnhancedKrakenAPI(
            self.config.API_KEY,
            self.config.API_SECRET
        )

        self.websocket = websocket or EnhancedWebSocketHandler(
            wss_uri=self.config.WSS_URI,
            max_retries=self.config.MAX_RETRIES,
            retry_delay=self.config.RETRY_DELAY,
            portfolio_manager=portfolio_manager
        )

        self.portfolio_manager = portfolio_manager or PortfolioManager.create(
            self.config,
            None,  # Set DB after connection
            self.kraken_api
        )

    def _init_trading_components(self):
        """Initialize trading-related components."""
        try:
            self.task_manager = EnhancedTaskManager()
            self.market_data_batcher.set_process_callback(self._process_batched_data)
            
            if not hasattr(self, 'performance_monitor') or self.performance_monitor is None:
                logging.info("Initializing performance monitor")
                self.performance_monitor = PerformanceMonitor(None)
                if not self.performance_monitor:
                    raise RuntimeError("Failed to initialize performance monitor")
            
            self.system_monitor = SystemMonitor()
            self.risk_manager = RiskManager(self.config, None)
            logging.info("Trading components initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing trading components: {e}", exc_info=True)
            raise
        
        self.trade_executor = TradeExecutor(
            self.kraken_api,
            self.risk_manager,
            None,
            self.config
        )

        self.monitoring_system = MonitoringSystem(
            self.portfolio_manager,
            self.risk_manager,
            self.trade_executor,
            self.websocket,
            self.config
        )

        self.pair_trading_modes = {}

    def compose(self) -> ComposeResult:
        """
        Build the app layout: 
          1) Custom header at the top 
          2) Horizontal container (sidebar + main-content)
          3) Footer at the bottom
        """
        # 1) Yield the custom header
        yield self.custom_header

        # 2) Main container: sidebar + main content
        with Horizontal(classes="main-container"):
            # Navigation sidebar
            with NavigationSidebar():
                yield Button("Home", id="nav-home", classes="sidebar-btn")
                yield Button("Dashboard", id="nav-dashboard", classes="sidebar-btn")
                yield Button("Trading", id="nav-trading", classes="sidebar-btn")
                yield Button("Pairs", id="nav-pairs", classes="sidebar-btn")
                yield Button("Portfolio", id="nav-portfolio", classes="sidebar-btn")
                yield Button("Strategies", id="nav-strategies", classes="sidebar-btn")
                yield Button("Analysis", id="nav-analysis", classes="sidebar-btn")
                yield Button("Settings", id="nav-settings", classes="sidebar-btn")

            # Main scrollable content
            with VerticalScroll(id="main-content"):
                yield Label("Welcome to JohnStreet", classes="welcome-label")

        # 3) Global loading indicator + footer
        self.loading_indicator = LoadingIndicator(id="global-loading-indicator")
        yield self.loading_indicator
        yield Footer()

    # -------------------------------------------------------------------------
    # App Lifecycle
    # -------------------------------------------------------------------------
    async def on_mount(self) -> None:
        """Initialize app on mount with minimal blocking."""
        try:
            self.loading_indicator.add_class("hidden")
            asyncio.create_task(self._async_init())
        except Exception as e:
            logging.error(f"Error in on_mount: {e}", exc_info=True)
            self.ui_state = UIState.ERROR
            await self.notify("Application initialization failed", severity="error")

    async def _async_init(self):
        """Handle potentially long-running initialization in a background task."""
        try:
            if not self.config.WSS_URI or not self.config.WSS_URI.startswith("wss://"):
                logging.error(
                    f"Invalid or missing WSS_URI: {self.config.WSS_URI}. "
                    "WebSocket will not connect."
                )
                return

            await self._init_async_components()
            await self._start_background_tasks()
            logging.info("Async initialization completed successfully.")
        except Exception as e:
            logging.error(f"Error during async initialization: {e}", exc_info=True)
            self.ui_state = UIState.ERROR
            await self.notify("Async initialization failed", severity="error")
            raise

    async def _init_async_components(self):
        """Connect to DB, set references, and do other async setup."""
        try:
            self.db = Database(str(self.config.get_db_path()))
            await self.db.connect()

            if not self.db.is_connected:
                raise RuntimeError("Failed to establish database connection")

            # Update references in other components
            self.portfolio_manager.db = self.db
            if self.performance_monitor:
                self.performance_monitor.db = self.db
            if self.risk_manager:
                self.risk_manager.db = self.db
            if self.trade_executor:
                self.trade_executor.db = self.db

            # Additional async init (WebSocket, etc.)
            async with asyncio.timeout(5):
                if self.websocket and not self.websocket.connected:
                    ws_conn = await self.ws_pool.get_connection()
                    if ws_conn:
                        await ws_conn.subscribe_to_btc()

            # Link the system status widget to the APIs
            self.sys_status.set_api(self.kraken_api, self.websocket)
        
        except asyncio.TimeoutError:
            logging.warning("Component initialization timed out - continuing with partial init")
        except Exception as e:
            logging.error(f"Failed to initialize async components: {e}", exc_info=True)
            raise RuntimeError(f"Async initialization failed: {e}") from e

    async def _start_background_tasks(self):
        """Start background tasks with enhanced task tracking and timeouts."""
        tasks = [
            self.update_market_data(),
            self.update_system_status(),
            self.update_keep_alive()
        ]
        for t in tasks:
            await self.task_tracker.add_task(asyncio.create_task(t))

    async def update_keep_alive(self):
        """Example keep-alive background task."""
        while self._running:
            await asyncio.sleep(60)
            logging.debug("Keep-alive task: Still running...")

    # -------------------------------------------------------------------------
    # Market Data & Background Tasks
    # -------------------------------------------------------------------------
    @debounce(0.5)
    async def update_market_data(self):
        if not self.is_mounted or self.collapsed:
            return
        try:
            # Possibly fetch an order book
            book_data = await asyncio.to_thread(
                self.kraken_api.get_order_book,
                self.selected_pair
            )
            if book_data:
                self.orderbook.update_book(book_data)

            # Possibly update trades
            trades_data = await asyncio.to_thread(
                self.kraken_api.get_trade_history,
                self.selected_pair
            )
            if trades_data:
                self.trades_display.update_trades(trades_data)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logging.error(f"Error updating market data: {e}")

    async def _process_batched_data(self, batch: List[dict]):
        """Process data in batch while respecting rate limits."""
        if not await self.rate_limiter.acquire():
            logging.warning("Rate limit exceeded, skipping batch")
            return
        try:
            for item in batch:
                self.trade_history.add_trade(item)
        except Exception as e:
            logging.error(f"Error processing batched market data: {e}", exc_info=True)

    async def refresh_market_data(self):
        """Refresh market data with connection pooling."""
        try:
            selected_pairs = self.get_active_trading_pairs()
            btc_pairs = set(selected_pairs)
            btc_pairs.add("TXBTZUSD")

            ws_conn = await self.ws_pool.get_connection()
            if not ws_conn:
                logging.warning("No available WebSocket connections")
                return

            ticker_data = await self._fetch_with_retries(list(btc_pairs))
            if ticker_data and "TXBTUSD" in ticker_data:
                btc_data = ticker_data["TXBTUSD"]
                if isinstance(btc_data, dict) and "close" in btc_data:
                    self.btc_price = float(btc_data["close"])
                    # Optionally update the custom header display
                    self.custom_header.update_btc_price(self.btc_price)
                else:
                    logging.warning(f"Unexpected BTC ticker data structure: {btc_data}")

            # If you want trades for the default pair
            if self.config.DEFAULT_PAIR in selected_pairs:
                trades_data = await asyncio.to_thread(
                    ws_conn.get_trades_data,
                    self.config.DEFAULT_PAIR
                )
                if trades_data:
                    await self.market_data_batcher.add({"trades_data": trades_data})

        except asyncio.TimeoutError:
            logging.error("Ticker data fetch: final timeout after retries.")
            self.ui_state = UIState.ERROR
            await self.notify("Timeout waiting for initial ticker data", severity="error")
        except Exception as e:
            logging.error(
                "Error refreshing market data",
                extra={'error': str(e), 'selected_pairs': selected_pairs}
            )
            self.ui_state = UIState.ERROR

    async def _fetch_with_retries(
        self,
        pairs: List[str],
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        timeout_seconds: float = 30.0
    ) -> Dict[str, Any]:
        """Fetch ticker data with retry logic + rate limiting."""
        attempt = 0
        while attempt < max_retries:
            if not await self.rate_limiter.acquire():
                await asyncio.sleep(1.0)
                continue

            try:
                ws_conn = await self.ws_pool.get_connection()
                if not ws_conn:
                    raise Exception("No available WebSocket connections")

                ticker_data = await asyncio.wait_for(
                    asyncio.to_thread(ws_conn.get_ticker_data, pairs),
                    timeout=timeout_seconds
                )
                return ticker_data
            except asyncio.TimeoutError:
                attempt += 1
                if attempt >= max_retries:
                    raise
                sleep_time = backoff_factor ** attempt
                logging.warning(
                    f"[Retry {attempt}/{max_retries}] "
                    f"Ticker data fetch timed out, retrying in {sleep_time:.1f}s..."
                )
                await asyncio.sleep(sleep_time)
            except Exception as e:
                logging.error(f"Error fetching ticker data: {e}", exc_info=True)
                raise
        return {}

    def get_active_trading_pairs(self) -> List[str]:
        """Which trading pairs are active? Possibly from config or user selection."""
        return [self.config.DEFAULT_PAIR]

    # -------------------------------------------------------------------------
    # System Status Updates
    # -------------------------------------------------------------------------
    @debounce(1.0)
    async def update_system_status(self):
        while self._running:
            try:
                self.ui_state = UIState.LOADING
                await self.refresh_system_status()
                self.ui_state = UIState.IDLE
                await asyncio.sleep(5.0)
            except Exception as e:
                logging.error("System status update failed", exc_info=True)
                self.ui_state = UIState.ERROR
                await asyncio.sleep(1.0)

    async def refresh_system_status(self):
        """Refresh system status with caching (pre-serialize the data)."""
        try:
            # Check if we have a recent cached status
            cached_status = self.ui_cache.get_component("system-status-data")
            if cached_status and time.monotonic() - cached_status.get("timestamp", 0) < 5:
                return cached_status["data"]

            # Update system status and PnL
            await asyncio.to_thread(self.sys_status.refresh_status)
            await self.update_pnl_label()

            # Build the status data
            status_data = {
                "timestamp": time.monotonic(),
                "data": self.sys_status.get_status()
            }

            # Pre-serialize the status data to avoid "unhashable type: 'dict'"
            serialized_status_data = json.dumps(status_data, sort_keys=True, default=str)

            # Store the *serialized* data in the cache
            self.ui_cache.get_component("system-status-data", data=serialized_status_data)

        except Exception as e:
            logging.error(f"Error refreshing system status: {e}")


    async def update_pnl_label(self):
        """Example: PnL update in the UI."""
        self.all_time_pnl = 1234.56
        # Optionally update the custom header’s PnL
        self.custom_header.update_all_time_pnl(self.all_time_pnl)

    # -------------------------------------------------------------------------
    # Performance Monitoring
    # -------------------------------------------------------------------------
    @debounce(5.0)
    async def update_performance_metrics(self):
        try:
            metrics = await self.get_performance_metrics()
            self.ui_cache.get_component("performance-metrics", data=metrics)
            return metrics
        except Exception as e:
            logging.error(f"Error updating performance metrics: {e}")
            return {}

    async def get_performance_metrics(self) -> Dict[str, float]:
        """Load performance metrics from the database (or a cache)."""
        try:
            conn = await self.db_pool.acquire()
            if not conn:
                raise Exception("No available database connections")

            result = await self.db_pool.execute_query("SELECT_PERFORMANCE_METRICS", ("all",))
            if not result:
                return {}
            return result
        except asyncio.TimeoutError:
            logging.error("Performance metrics calculation timed out")
            return {}
        except Exception as e:
            logging.error("Error in get_performance_metrics", exc_info=True)
            return {}

    # -------------------------------------------------------------------------
    # Content-Swapping (Approach B)
    # -------------------------------------------------------------------------
    async def _clear_main_content(self) -> VerticalScroll:
        """Clears and returns the main content area."""
        main_content = (
            self.ui_cache.get_component("main-content")
            or self.query_one("#main-content", VerticalScroll)
        )
        await main_content.remove_children()
        return main_content

    @debounce(0.1)
    async def _execute_screen_update(
        self,
        screen_name: str,
        coro: Callable[[], Awaitable[None]]
    ):
        """Helper for updating a 'screen' with error handling."""
        try:
            self.ui_state = UIState.LOADING
            await coro()
            self.ui_state = UIState.IDLE
        except Exception as e:
            logging.error(f"Error loading {screen_name} screen: {e}", exc_info=True)
            self.ui_state = UIState.ERROR
            await self.notify(f"Failed to load {screen_name} screen")

    async def _load_and_update_dashboard(self):
        async def coro():
            main_content = await self._clear_main_content()
            trades = await self.virtualized_table.load_page(0)
            for row in trades:
                await main_content.mount(Label(" | ".join(row)))
        await self._execute_screen_update("dashboard", coro)

    async def _load_and_update_trading(self):
        async def coro():
            main_content = await self._clear_main_content()
            conn = await self.db_pool.acquire()
            if not conn:
                raise Exception("No available database connections")

            # Example: retrieve trades from DB
            active_trades = await self.db.get_active_trades()
            positions = await asyncio.to_thread(self.portfolio_manager.get_positions)
            self.virtualized_table._data = active_trades
            
            container = Vertical()
            await main_content.mount(container)
            
            await container.mount(Label("[bold]Active Trades[/bold]"))
            rendered_trades = await self.virtualized_table.load_page(0)
            for row in rendered_trades:
                await container.mount(Label(" | ".join(row)))
            
            positions_container = await self._create_positions_table(positions)
            await container.mount(positions_container)
        await self._execute_screen_update("trading", coro)

    async def _create_positions_table(self, positions):
        container = Vertical()
        await container.mount(Label("[bold]Positions[/bold]"))
        for p in positions:
            await container.mount(Label(f"{p['symbol']}: {p['amount']} @ {p['price']}"))
        return container

    async def _load_pairs_screen(self):
        """Mount the PairSelectionWidget directly."""
        async def coro():
            main_content = await self._clear_main_content()
            pair_selection_widget = PairSelectionWidget(
                kraken_api=self.kraken_api,
                pair_trading_modes=self.pair_trading_modes
            )
            await main_content.mount(pair_selection_widget)
        await self._execute_screen_update("pairs", coro)

    async def _load_portfolio_screen(self):
        """Mount the PortfolioPanel widget."""
        async def coro():
            try:
                main_content = await self._clear_main_content()
                portfolio_panel = PortfolioPanel(
                    portfolio_manager=self.portfolio_manager,
                    kraken_api=self.kraken_api,
                    pair_trading_modes=self.pair_trading_modes
                )
                await main_content.mount(portfolio_panel)
            except Exception as e:
                logging.error(f"Error loading portfolio screen: {e}", exc_info=True)
                await self.notify("Failed to load portfolio screen", severity="error")
        await self._execute_screen_update("portfolio", coro)

    async def _load_strategies_screen(self):
        """Mount the StrategyManager widget."""
        async def coro():
            main_content = await self._clear_main_content()
            strategies_widget = StrategyManager(
                config=self.config,
                strategies={},  # or preloaded dict
                db=self.db,
                portfolio_manager=self.portfolio_manager,
                strategies_dir="strategies"
            )
            await main_content.mount(Label("[bold]Strategies[/bold]"))
            await main_content.mount(strategies_widget)
        await self._execute_screen_update("strategies", coro)

    async def _load_analysis_screen(self):
        """Mount the AnalysisWidget into main-content (Approach B)."""
        async def coro():
            main_content = await self._clear_main_content()
            analysis_widget = AnalysisWidget(
                performance_monitor=self.performance_monitor,
                kraken_api=self.kraken_api,
                pair_trading_modes=self.pair_trading_modes,
                config={
                    "update_interval": 30.0,
                    "chart_type": "candlestick",
                    "timeframe": "1h",
                    "timeframes": ["1h", "4h", "1d", "all"],
                    "table_update_interval": 5.0,
                    "auto_refresh": True
                }
            )
            await main_content.mount(Label("[bold]Analysis[/bold]"))
            await main_content.mount(analysis_widget)
        await self._execute_screen_update("analysis", coro)

    async def _load_settings_screen(self):
        """Mount a simple settings label."""
        async def coro():
            main_content = await self._clear_main_content()
            await main_content.mount(Label("[bold]Settings[/bold]"))
            await main_content.mount(Label("Update API keys, risk parameters, etc."))
        await self._execute_screen_update("settings", coro)

    # -------------------------------------------------------------------------
    # Navigation Handlers
    # -------------------------------------------------------------------------
    @on(Button.Pressed, "#nav-home")
    def handle_nav_home_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._show_home_screen())

    @on(Button.Pressed, "#nav-dashboard")
    def handle_nav_dashboard_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_and_update_dashboard())

    @on(Button.Pressed, "#nav-trading")
    def handle_nav_trading_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_and_update_trading())

    @on(Button.Pressed, "#nav-pairs")
    def handle_nav_pairs_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_pairs_screen())

    @on(Button.Pressed, "#nav-portfolio")
    def handle_nav_portfolio_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_portfolio_screen())

    @on(Button.Pressed, "#nav-strategies")
    def handle_nav_strategies_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_strategies_screen())

    @on(Button.Pressed, "#nav-analysis")
    def handle_nav_analysis_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_analysis_screen())

    @on(Button.Pressed, "#nav-settings")
    def handle_nav_settings_pressed(self, event: Button.Pressed) -> None:
        asyncio.create_task(self._load_settings_screen())

    async def _show_home_screen(self):
        main_content = await self._clear_main_content()
        home_widgets = [
            Label("Home Screen"), 
            Label("Welcome to the JohnStreet Home!")
        ]
        for widget in home_widgets:
            await main_content.mount(widget)

    # -------------------------------------------------------------------------
    # Settings Management
    # -------------------------------------------------------------------------
    async def update_api_keys(self, key: str, secret: str) -> None:
        try:
            self.config.API_KEY = key
            self.config.API_SECRET = secret
            self.kraken_api = EnhancedKrakenAPI(key, secret)
            await self.notify("API keys updated successfully", severity="information")
        except Exception as e:
            logging.error(f"Error updating API keys: {e}")
            await self.notify("Failed to update API keys", severity="error")

    async def update_risk_parameters(self, max_position: float, daily_loss: float) -> None:
        try:
            if max_position <= 0 or daily_loss <= 0:
                raise ValueError("Invalid risk parameters")
            self.config.MAX_POSITION_SIZE = max_position
            self.config.DAILY_LOSS_LIMIT = daily_loss
            self.risk_manager.update_parameters(max_position, daily_loss)
            await self.notify("Risk parameters updated", severity="information")
        except Exception as e:
            logging.error(f"Error updating risk parameters: {e}")
            await self.notify("Failed to update risk parameters", severity="error")

    # -------------------------------------------------------------------------
    # WebSocket Handlers
    # -------------------------------------------------------------------------
    async def on_ws_connection_state(self, connected: bool) -> None:
        try:
            if connected:
                await self.notify("WebSocket connected", severity="information")
            else:
                ws_conn = await self.ws_pool.get_connection()
                if ws_conn:
                    await self.notify("Reconnected to WebSocket", severity="information")
                else:
                    await self.notify("WebSocket disconnected", severity="warning")
        except Exception as e:
            logging.error(f"Error handling WebSocket state change: {e}")

    async def on_ws_error(self, error: Exception) -> None:
        try:
            logging.error(f"WebSocket error: {error}")
            await self.notify(f"WebSocket error: {str(error)}", severity="error")
            ws_conn = await self.ws_pool.get_connection()
            if ws_conn:
                await self.notify("WebSocket connection recovered", severity="information")
        except Exception as e:
            logging.error(f"Error handling WebSocket error: {e}")

    # -------------------------------------------------------------------------
    # Connection Management
    # -------------------------------------------------------------------------
    async def reconnect(self) -> None:
        try:
            db_conn = await self.db_pool.acquire()
            ws_conn = await self.ws_pool.get_connection()
            if not db_conn or not ws_conn:
                raise Exception("Failed to acquire connections")
            await self._init_async_components()
            await self.refresh_market_data()
        except Exception as e:
            logging.error(f"Error during reconnection: {e}")
            raise

    # -------------------------------------------------------------------------
    # Shutdown Procedure
    # -------------------------------------------------------------------------
    async def on_shutdown(self) -> None:
        try:
            logging.info("Starting application shutdown...")
            self._running = False

            await self.task_tracker.cancel_all()

            for _ in range(len(self.ws_pool._connections)):
                conn = self.ws_pool._connections.pop()
                if conn:
                    await conn.close()

            for _ in range(len(self.db_pool._pool)):
                conn = self.db_pool._pool.pop()
                if conn and not conn.closed:
                    await conn.close()

            if hasattr(self, 'db') and self.db is not None and self.db.is_connected:
                await self.db.close()

            self.ui_cache._cache.clear()
            logging.info("Application shutdown completed successfully")
        except Exception as e:
            logging.error(f"Error during shutdown: {e}", exc_info=True)
            raise

    # -------------------------------------------------------------------------
    # Server Entry Point
    # -------------------------------------------------------------------------
    def run_server(self, host: str = "0.0.0.0", port: int = 8080) -> None:
        try:
            logging.info(f"Starting server on {host}:{port}")
            server = Server(self, host=host, port=port)
            server.serve(auto_recovery=True)
        except Exception as e:
            logging.error(f"Server startup failed: {str(e)}")
            raise
