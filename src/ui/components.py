import logging
import time
from datetime import datetime, timedelta
import asyncio
from typing import List, Dict, Optional, Callable, Awaitable
from enum import Enum
from dataclasses import dataclass
from math import sin  # <-- For sine wave simulation

# ------------------- ADD THESE IMPORTS FOR TEXTUAL WIDGETS -------------------
from textual.app import ComposeResult
from textual.widget import Widget
from textual.containers import Horizontal, VerticalScroll, Vertical
from textual.widgets import (
    Label,
    DataTable,
    Button,
    Static,
    LoadingIndicator,
    Sparkline
)
from textual.reactive import reactive
# ------------------------------------------------------------------------------

########################################################################
# SUPPORTING ENUM AND DATACLASS
########################################################################
class TradingMode(Enum):
    """Trading mode enumeration"""
    PAPER = "PAPER"
    LIVE = "LIVE"


@dataclass
class RuntimeState:
    """Track runtime state for an algo"""
    start_time: Optional[float] = None
    accumulated_time: float = 0.0
    is_running: bool = False
    mode: TradingMode = TradingMode.PAPER

    def start(self) -> None:
        """Start tracking runtime"""
        if not self.is_running:
            self.start_time = datetime.now().timestamp()
            self.is_running = True

    def stop(self) -> None:
        """Stop tracking and accumulate runtime"""
        if self.is_running and self.start_time:
            now = datetime.now().timestamp()
            self.accumulated_time += now - self.start_time
            self.start_time = None
            self.is_running = False

    def get_current_runtime(self) -> float:
        """Get runtime of current session"""
        if not self.is_running or not self.start_time:
            return 0.0
        return datetime.now().timestamp() - self.start_time

    def get_total_runtime(self) -> float:
        """Get total runtime including current session if running"""
        current = self.get_current_runtime()
        return self.accumulated_time + current

    def format_runtime(self, seconds: float) -> str:
        """Format runtime in HH:MM:SS"""
        return str(timedelta(seconds=int(seconds)))


########################################################################
# DIALOG STUB (Replace or integrate with your UI dialog system)
########################################################################
class ConfirmationDialog:
    """
    Simple stub for a confirmation dialog used in the snippet.
    Replace with your real modal/dialog system.
    """
    def __init__(self, title: str, message: str):
        self.title = title
        self.message = message

    async def show(self) -> bool:
        """
        Stub method: always returns True for demonstration.
        Replace with real UI logic to capture user confirmation.
        """
        logging.info(f"[ConfirmationDialog] {self.title}: {self.message}")
        # In a real app, you'd block/wait for user input.
        # For now, we'll just log and return True.
        return True


########################################################################
# ENHANCED COLLAPSIBLE ALGO ROW (with Reactive + Sparklines)
########################################################################
class EnhancedCollapsibleAlgoRow(Static):
    """
    Enhanced algo row with real market data, improved runtime tracking,
    and demonstration of Textual's reactive API.
    """

    row_number: int = reactive(0)
    collapsed: bool = reactive(True)
    algo_on: bool = reactive(False)
    drawdown: float = reactive(0.0)
    pnl: float = reactive(0.0)

    def __init__(self, row_number: int, kraken_api, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.row_number = row_number
        self.kraken_api = kraken_api
        self.selected_pair = "XBT/USD"
        self.selected_strategy = "Trend Following"

        # Runtime state
        self.runtime_state = RuntimeState()
        self._update_task: Optional[asyncio.Task] = None

        # Performance history for sparklines
        self.pnl_history = []
        self.drawdown_history = []
        self.max_history_points = 100

        # Initialize sparkline data with sine wave
        self.initialize_sparkline_data()

        # A performance label we’ll update in watchers
        self.perf_label = Label("")

    def initialize_sparkline_data(self):
        """Initialize sparkline data with some starting values (sine wave)."""
        for i in range(self.max_history_points):
            # Simple sine-based variation
            self.pnl_history.append(
                100 * (1 + 0.5 * abs(sin(i / 20)))
            )
            self.drawdown_history.append(
                -10 * (1 + 0.5 * abs(sin(i / 15)))
            )

    def compose(self) -> ComposeResult:
        """
        Define all widgets that make up this collapsible row.
        """
        with Horizontal(classes="row-controls"):
            # Toggle collapse button
            self.toggle_btn = Button("►", id=f"toggle-collapse-{self.row_number}")
            yield self.toggle_btn

            # Info labels (always visible)
            yield Label(f"Pair: {self.selected_pair}")
            yield Label(f"Strategy: {self.selected_strategy}")

            # Runtime labels
            self.current_runtime_label = Label("Current: 00:00:00")
            yield self.current_runtime_label
            self.total_runtime_label = Label("Total: 00:00:00")
            yield self.total_runtime_label

            # Performance label
            self.perf_label.update(self.format_performance())
            yield self.perf_label

        with VerticalScroll(classes="expanded-content"):
            with Horizontal():
                self.onoff_btn = Button(
                    "Off",
                    id=f"toggle-onoff-{self.row_number}",
                    classes="off-state"
                )
                yield self.onoff_btn

                self.mode_btn = Button(
                    self.runtime_state.mode.value,
                    id=f"mode-toggle-{self.row_number}",
                    classes="mode-button paper-mode"
                )
                yield self.mode_btn

            # Pair selection
            with Horizontal():
                yield Label("Pair:")
                self.pair_selector = EnhancedPairSelector(self.kraken_api)
                yield self.pair_selector

            # Strategy selection
            with Horizontal():
                yield Label("Strategy:")
                self.strategy_selector = DataTable()
                yield self.strategy_selector

            # Market data displays
            with Horizontal():
                self.orderbook = EnhancedOrderBook(self.selected_pair)
                yield self.orderbook
                self.trades_display = EnhancedTradesDisplay()
                yield self.trades_display

            # Performance metrics
            with Vertical():
                yield Label("[bold]Performance Metrics[/bold]")
                self.metrics_table = DataTable()
                yield self.metrics_table

                # Sparkline for PnL
                with Vertical():
                    yield Label("PnL Trend")
                    self.pnl_sparkline = Sparkline(
                        self.pnl_history,
                        summary_function=max,
                        classes="sparkline-pnl"
                    )
                    yield self.pnl_sparkline

                # Sparkline for drawdown
                with Vertical():
                    yield Label("Drawdown")
                    self.drawdown_sparkline = Sparkline(
                        self.drawdown_history,
                        summary_function=min,
                        classes="sparkline-drawdown"
                    )
                    yield self.drawdown_sparkline

    def on_mount(self) -> None:
        """Initialize child components after mounting."""
        self.setup_strategy_selector()
        self.setup_metrics_table()

        # Periodic tasks
        self.set_interval(1.0, self.update_market_data)
        self.set_interval(5.0, self.update_performance)

    ####################################################################
    # Reactive watchers
    ####################################################################
    def watch_collapsed(self, old_val: bool, new_val: bool) -> None:
        self.toggle_btn.label = "▼" if not new_val else "►"
        expanded_region = self.query(".expanded-content")
        if expanded_region:
            for widget in expanded_region:
                widget.styles.display = "none" if new_val else "block"

    def watch_algo_on(self, old_val: bool, new_val: bool) -> None:
        if hasattr(self, "onoff_btn"):
            if new_val:
                self.onoff_btn.label = "On"
                self.onoff_btn.remove_class("off-state")
                self.onoff_btn.add_class("on-state")
            else:
                self.onoff_btn.label = "Off"
                self.onoff_btn.remove_class("on-state")
                self.onoff_btn.add_class("off-state")

    def watch_drawdown(self, old_val: float, new_val: float) -> None:
        self._update_perf_label()

    def watch_pnl(self, old_val: float, new_val: float) -> None:
        self._update_perf_label()

    ####################################################################
    # Button Handlers
    ####################################################################
    async def on_button_pressed(self, event: Button.Pressed) -> None:
        button_id = event.button.id
        if button_id == f"toggle-collapse-{self.row_number}":
            self.collapsed = not self.collapsed
        elif button_id == f"toggle-onoff-{self.row_number}":
            await self._handle_onoff_toggle()
        elif button_id == f"mode-toggle-{self.row_number}":
            await self._handle_mode_toggle()

    async def _handle_onoff_toggle(self) -> None:
        if self.runtime_state.is_running:
            # Turning off
            self.runtime_state.stop()
            self.algo_on = False
            if self._update_task and not self._update_task.done():
                self._update_task.cancel()
        else:
            # Turning on
            self.runtime_state.start()
            self.algo_on = True
            if not self._update_task or self._update_task.done():
                self._update_task = asyncio.create_task(self._update_runtime_display())

    async def _handle_mode_toggle(self) -> None:
        if self.runtime_state.is_running:
            logging.warning("Cannot change mode while algo is running")
            return

        if self.runtime_state.mode == TradingMode.PAPER:
            if await self.confirm_live_mode():
                self.runtime_state.mode = TradingMode.LIVE
                if hasattr(self, "mode_btn"):
                    self.mode_btn.label = "LIVE"
                    self.mode_btn.remove_class("paper-mode")
                    self.mode_btn.add_class("live-mode")
        else:
            # Switch back to Paper
            self.runtime_state.mode = TradingMode.PAPER
            if hasattr(self, "mode_btn"):
                self.mode_btn.label = "PAPER"
                self.mode_btn.remove_class("live-mode")
                self.mode_btn.add_class("paper-mode")

    async def confirm_live_mode(self) -> bool:
        dialog = ConfirmationDialog(
            "Switch to LIVE mode?",
            "Are you sure you want to switch to LIVE trading? Real funds will be used."
        )
        return await dialog.show()

    ####################################################################
    # Runtime Display
    ####################################################################
    async def _update_runtime_display(self) -> None:
        try:
            while True:
                if self.runtime_state.is_running:
                    current = self.runtime_state.get_current_runtime()
                    total = self.runtime_state.get_total_runtime()
                    self.current_runtime_label.update(
                        f"Current: {self.runtime_state.format_runtime(current)}"
                    )
                    self.total_runtime_label.update(
                        f"Total: {self.runtime_state.format_runtime(total)}"
                    )
                await asyncio.sleep(1)
        except asyncio.CancelledError:
            # Final update
            current = self.runtime_state.get_current_runtime()
            total = self.runtime_state.get_total_runtime()
            self.current_runtime_label.update(
                f"Current: {self.runtime_state.format_runtime(current)}"
            )
            self.total_runtime_label.update(
                f"Total: {self.runtime_state.format_runtime(total)}"
            )
            raise

    ####################################################################
    # Strategy & Metrics Table Setup
    ####################################################################
    def setup_strategy_selector(self):
        if self.strategy_selector:
            self.strategy_selector.add_column("Strategy")
            self.strategy_selector.add_column("Description")

            strategies = [
                ("Trend Following", "Follow market momentum with customizable parameters"),
                ("Mean Reversion", "Trade price returns to moving average"),
                ("Market Making", "Provide liquidity with configurable spreads"),
                ("Arbitrage", "Cross-exchange price differential trading")
            ]
            for strat, desc in strategies:
                self.strategy_selector.add_row(strat, desc)

    def setup_metrics_table(self):
        if self.metrics_table:
            self.metrics_table.add_column("Metric")
            self.metrics_table.add_column("Value")
            metrics = [
                "Total P&L",
                "Win Rate",
                "Avg Trade P&L",
                "Sharpe Ratio",
                "Max Drawdown",
                "Total Trades"
            ]
            for metric in metrics:
                self.metrics_table.add_row(metric, "---")

    ####################################################################
    # Market Data & Performance Updates
    ####################################################################
    def update_market_data(self):
        if not self.is_mounted or self.collapsed:
            return
        try:
            # Update order book
            book_data = self.kraken_api.get_order_book(self.selected_pair)
            if book_data:
                self.orderbook.update_book(book_data)

            # Update trades
            trades_data = self.kraken_api.get_trade_history(self.selected_pair)
            if trades_data:
                self.trades_display.update_trades(trades_data)
        except Exception as e:
            logging.error(f"Error updating market data: {e}")

    def update_performance(self):
        if not self.is_mounted:
            return
        try:
            # Simulate new performance values
            new_drawdown = -5.0 * (1 + 0.5 * abs(sin(time.time() / 10)))
            new_pnl = 1000 * (1 + 0.3 * abs(sin(time.time() / 15)))

            self.drawdown = new_drawdown
            self.pnl = new_pnl

            # Update sparkline histories
            self.pnl_history.append(new_pnl)
            self.drawdown_history.append(new_drawdown)

            # Truncate history
            if len(self.pnl_history) > self.max_history_points:
                self.pnl_history = self.pnl_history[-self.max_history_points:]
            if len(self.drawdown_history) > self.max_history_points:
                self.drawdown_history = self.drawdown_history[-self.max_history_points:]

            self.pnl_sparkline.data = self.pnl_history
            self.drawdown_sparkline.data = self.drawdown_history

            # Update the metrics table
            metrics = {
                "Total P&L": f"${self.pnl:,.2f}",
                "Win Rate": "60.5%",
                "Avg Trade P&L": "$125.50",
                "Sharpe Ratio": "1.85",
                "Max Drawdown": f"{self.drawdown:.1f}%",
                "Total Trades": "42"
            }
            if self.metrics_table:
                self.metrics_table.clear()
                for metric, value in metrics.items():
                    self.metrics_table.add_row(metric, value)
        except Exception as e:
            logging.error(f"Error updating performance: {e}")

    ####################################################################
    # Performance Label
    ####################################################################
    def format_performance(self) -> str:
        dd_color = "red" if self.drawdown < 0 else "green"
        pnl_color = "green" if self.pnl >= 0 else "red"
        return f"(DD: [{dd_color}]{self.drawdown:.1f}%[/{dd_color}], PnL: [{pnl_color}]${self.pnl:,.2f}[/{pnl_color}])"

    def _update_perf_label(self) -> None:
        dd_color = "red" if self.drawdown < 0 else "green"
        pnl_color = "green" if self.pnl >= 0 else "red"
        self.perf_label.update(
            f"(DD: [{dd_color}]{self.drawdown:.1f}%[/{dd_color}], "
            f"PnL: [{pnl_color}]${self.pnl:,.2f}[/{pnl_color}])"
        )

    def on_unmount(self) -> None:
        if self._update_task and not self._update_task.done():
            self._update_task.cancel()


########################################################################
# ENHANCED PORTFOLIO TABLE
########################################################################
class EnhancedPortfolioTable(Static):
    """A widget that displays real balances for default assets."""

    DEFAULT_ASSETS = ["XBT", "ETH", "SOL", "AVAX", "LINK", "DOT"]

    def __init__(
        self,
        kraken_api,
        portfolio_manager,
        label_text: str = "Default Asset Allocation",
        *args,
        **kwargs
    ):
        super().__init__(*args, **kwargs)
        self.kraken_api = kraken_api
        self.portfolio_manager = portfolio_manager
        self.label_text = label_text

        self._table: Optional[DataTable] = None
        self._loading: Optional[LoadingIndicator] = None

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label(f"[bold]{self.label_text}[/bold]")
            self._loading = LoadingIndicator()
            self._loading.styles.display = "none"
            yield self._loading

            self._table = DataTable()
            yield self._table

    def on_mount(self) -> None:
        if self._table:
            self._table.add_column("Asset", width=8)
            self._table.add_column("Balance", width=12)
            self._table.add_column("Price (USD)", width=12)
            self._table.add_column("Value (USD)", width=12)
            self._table.add_column("Allocation %", width=12)

    async def update_portfolio(self):
        if not self._table:
            return

        self.show_loading()
        try:
            balances = await self.portfolio_manager.get_balances()
            logging.info(f"[EnhancedPortfolioTable] Balances: {balances}")

            pairs_to_fetch = [f"{asset}/USD" for asset in self.DEFAULT_ASSETS]
            ticker_data = await asyncio.to_thread(
                self.kraken_api.get_ticker_info,
                pairs_to_fetch
            )
            logging.info(f"[EnhancedPortfolioTable] Ticker data: {ticker_data}")

            total_value = 0.0
            results = []
            for asset in self.DEFAULT_ASSETS:
                balance = balances.get(asset, 0.0)
                pair_key = asset + "USD"  # e.g. "XBTUSD"
                
                price = 0.0
                value = 0.0
                if pair_key in ticker_data and ticker_data[pair_key].get("c"):
                    try:
                        price = float(ticker_data[pair_key]["c"][0])
                        value = balance * price
                    except (ValueError, IndexError) as e:
                        logging.warning(
                            f"[EnhancedPortfolioTable] Error parsing price for {asset}: {e}"
                        )
                
                total_value += value
                results.append({
                    "asset": asset,
                    "balance": balance,
                    "price": price,
                    "value": value
                })

            self._table.clear()
            for row in results:
                alloc_str = "0.00%"
                if total_value > 0:
                    alloc_str = f"{(row['value'] / total_value) * 100:.2f}%"

                self._table.add_row(
                    row["asset"],
                    f"{row['balance']:.8f}",
                    f"{row['price']:,.2f}",
                    f"${row['value']:,.2f}",
                    alloc_str
                )

        except Exception as e:
            logging.error(f"[EnhancedPortfolioTable] update_portfolio failed: {e}")
        finally:
            self.hide_loading()

    def show_loading(self):
        if self._loading:
            self._loading.styles.display = "block"

    def hide_loading(self):
        if self._loading:
            self._loading.styles.display = "none"


########################################################################
# ASYNC BUTTON
########################################################################
class AsyncButton(Button):
    """A button that handles async operations without freezing the UI."""
    
    def __init__(
        self, 
        label: str,
        handler: Callable[[], Awaitable[None]],
        loading_text: str = "Processing...",
        *args,
        **kwargs
    ):
        super().__init__(label, *args, **kwargs)
        self.original_label = label
        self.loading_text = loading_text
        self.handler = handler
        self._loading_indicator: Optional[LoadingIndicator] = None
        self._is_processing = False

    def compose(self) -> ComposeResult:
        yield super().compose()
        self._loading_indicator = LoadingIndicator()
        self._loading_indicator.styles.display = "none"
        yield self._loading_indicator

    async def _start_loading(self):
        if self._loading_indicator:
            self._loading_indicator.styles.display = "block"
        self.label = self.loading_text
        self.disabled = True
        self._is_processing = True

    async def _stop_loading(self):
        if self._loading_indicator:
            self._loading_indicator.styles.display = "none"
        self.label = self.original_label
        self.disabled = False
        self._is_processing = False

    async def on_button_pressed(self, event: Button.Pressed) -> None:
        if self._is_processing:
            return
        try:
            await self._start_loading()
            await asyncio.create_task(self.handler())
        except Exception as e:
            logging.error(f"AsyncButton operation failed: {str(e)}", exc_info=True)
        finally:
            await self._stop_loading()


########################################################################
# NAVIGATION SIDEBAR (EMPTY WIDGET) - FIXED TO RETURN INSTEAD OF YIELD
########################################################################
class NavigationSidebar(Widget):
    """Minimal navigation sidebar that doesn't yield any nav buttons."""
    def compose(self) -> ComposeResult:
        # Return an empty generator.
        yield from ()


########################################################################
# ENHANCED PAIR SELECTOR
########################################################################
class EnhancedPairSelector(Static):
    """Enhanced pair selector with live Kraken data."""
    
    def __init__(self, kraken_api):
        super().__init__()
        self.kraken_api = kraken_api
        self.pairs: List[str] = []

    def compose(self) -> ComposeResult:
        with VerticalScroll():
            yield Label("[bold]Trading Pairs[/bold]")
            self.pairs_table = DataTable()
            yield self.pairs_table

    def on_mount(self) -> None:
        self.pairs_table.add_column("Pair", width=20)
        self.pairs_table.add_column("Last", width=20)
        self.pairs_table.add_column("24h Volume", width=20)
        self.refresh_pairs()
        self.set_interval(5, self.refresh_pairs)

    def refresh_pairs(self, selected_pairs: List[str] = None):
        try:
            all_pairs = self.kraken_api.get_tradable_pairs()
            pairs_to_show = selected_pairs or all_pairs
            ticker_info = self.kraken_api.get_ticker_info(pairs_to_show)

            self.pairs_table.clear()
            for pair in pairs_to_show:
                if pair in ticker_info:
                    info = ticker_info[pair]
                    last_price = float(info['c'][0])
                    volume = float(info['v'][1])  # 24h volume
                    self.pairs_table.add_row(
                        pair,
                        f"${last_price:,.2f}",
                        f"{volume:,.2f}"
                    )
        except Exception as e:
            logging.error(f"Failed to refresh pairs: {e}")


########################################################################
# ENHANCED ORDER BOOK
########################################################################
class EnhancedOrderBook(Static):
    """Live order book display."""
    
    def __init__(self, pair: str):
        super().__init__()
        self.pair = pair
        self.bids: Dict[float, float] = {}
        self.asks: Dict[float, float] = {}

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label(f"[bold]Order Book: {self.pair}[/bold]")
            with Horizontal():
                with VerticalScroll():
                    yield Label("[green]Bids[/green]")
                    self.bids_table = DataTable()
                    yield self.bids_table
                with VerticalScroll():
                    yield Label("[red]Asks[/red]")
                    self.asks_table = DataTable()
                    yield self.asks_table

    def on_mount(self) -> None:
        for table in [self.bids_table, self.asks_table]:
            table.add_column("Price", width=20)
            table.add_column("Size", width=20)
            table.add_column("Total", width=20)

    def update_book(self, book_data: dict):
        if not book_data:
            return

        self.bids_table.clear()
        bids = sorted(book_data["bids"].items(), reverse=True)[:10]
        total = 0
        for price, size in bids:
            total += size
            self.bids_table.add_row(
                f"${float(price):,.2f}",
                f"{size:,.6f}",
                f"{total:,.6f}"
            )

        self.asks_table.clear()
        asks = sorted(book_data["asks"].items())[:10]
        total = 0
        for price, size in asks:
            total += size
            self.asks_table.add_row(
                f"${float(price):,.2f}",
                f"{size:,.6f}",
                f"{total:,.6f}"
            )


########################################################################
# ENHANCED TRADES DISPLAY
########################################################################
class EnhancedTradesDisplay(Static):
    """Live trades display."""
    
    def compose(self) -> ComposeResult:
        yield Label("[bold]Recent Trades[/bold]")
        self.trades_table = DataTable()
        yield self.trades_table

    def on_mount(self) -> None:
        self.trades_table.add_column("Time", width=12)
        self.trades_table.add_column("Price", width=20)
        self.trades_table.add_column("Size", width=20)
        self.trades_table.add_column("Side", width=10)

    def update_trades(self, trades_data: List[dict]):
        self.trades_table.clear()
        for trade in trades_data[-10:]:
            price, size, timestamp, side = trade
            trade_time = time.strftime("%H:%M:%S", time.localtime(timestamp))
            side_color = "[green]BUY[/green]" if side == "b" else "[red]SELL[/red]"
            self.trades_table.add_row(
                trade_time,
                f"${float(price):,.2f}",
                f"{float(size):,.6f}",
                side_color
            )


########################################################################
# ENHANCED SYSTEM STATUS (UPDATED!)
########################################################################
class EnhancedSystemStatus(Static):
    """
    System status monitor with real Kraken status and WebSocket metrics.

    - `refresh_status()` fetches data from `kraken_api` and `websocket`.
    - `get_status()` returns the stored data so the application can read it.
    """

    def __init__(self, kraken_api=None, websocket=None):
        super().__init__()
        self.kraken_api = kraken_api
        self.websocket = websocket

        # Store the last known status in instance variables so `get_status()` can return them
        self._kraken_status = "UNKNOWN"
        self._kraken_update_ts = None
        self._ws_status = "N/A"
        self._ws_msg_count = 0
        self._ws_error_count = 0
        self._ws_latency = 0.0

    def compose(self) -> ComposeResult:
        yield Label("[bold]System Status[/bold]")
        self.status_label = Label()
        yield self.status_label
        self.ws_status_label = Label()
        yield self.ws_status_label

    def on_mount(self) -> None:
        # Refresh status periodically
        self.set_interval(5, self.refresh_status)

    def set_api(self, kraken_api, websocket):
        """Allow the application to set or update references."""
        self.kraken_api = kraken_api
        self.websocket = websocket

    def refresh_status(self):
        """
        Called by the application or on a schedule. 
        Fetch Kraken system status and WebSocket metrics, then update labels.
        """
        try:
            if not self.kraken_api or not self.websocket:
                return

            # Example: get system status from kraken_api
            status = self.kraken_api.get_system_status()
            kraken_status = status.get("status", "UNKNOWN")
            ts = status.get("timestamp", None)

            # Store in instance variables so get_status() can read them
            self._kraken_status = kraken_status
            self._kraken_update_ts = ts

            # Display text
            status_text = f"Kraken Status: {kraken_status}"
            if ts:
                status_text += f"\nLast Update: {ts}"
            self.status_label.update(status_text)

            # Example: get performance metrics from the websocket
            ws_metrics = self.websocket.get_performance_metrics()
            self._ws_status = ws_metrics.get("status", "N/A")
            self._ws_msg_count = ws_metrics.get("message_count", 0)
            self._ws_error_count = ws_metrics.get("error_count", 0)
            self._ws_latency = ws_metrics.get("last_latency", 0.0)

            ws_text = (
                f"WebSocket Status: {self._ws_status}\n"
                f"Messages: {self._ws_msg_count}\n"
                f"Errors: {self._ws_error_count}\n"
                f"Latency: {self._ws_latency:.2f}ms"
            )
            self.ws_status_label.update(ws_text)

        except Exception as e:
            logging.error(f"Failed to refresh status: {e}")
            self.status_label.update(f"Error: {str(e)}")
            self.ws_status_label.update("Connection Error")

    def get_status(self) -> dict:
        """
        Returns a dict with the current Kraken/WebSocket status info,
        so the application can do further handling/logging as needed.
        """
        return {
            "kraken_status": self._kraken_status,
            "kraken_last_update": self._kraken_update_ts,
            "ws_status": self._ws_status,
            "ws_message_count": self._ws_msg_count,
            "ws_error_count": self._ws_error_count,
            "ws_latency": self._ws_latency,
        }
