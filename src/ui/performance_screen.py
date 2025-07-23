import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Button, Static, DataTable, Label, Select
from textual.containers import Horizontal, Vertical
from textual.reactive import reactive

# If this component is part of your codebase, adjust the import:
# from src.ui.components import NavigationSidebar
# For demonstration, we'll assume it's in the same directory or adjust accordingly:
from src.ui.components import NavigationSidebar  # Change path if needed


# ------------------------------------------------------------------------------
# Panels for the PerformanceWidget
# ------------------------------------------------------------------------------

class MetricsPanel(Static):
    """Panel displaying performance metrics."""

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("[bold]Performance Summary[/bold]")
            self.metrics_table = DataTable()
            yield self.metrics_table

    def on_mount(self) -> None:
        self.metrics_table.add_column("Metric")
        self.metrics_table.add_column("Value")

    def update_metrics(self, metrics: dict) -> None:
        if not metrics:
            return

        # Check if metrics have changed
        new_hash = hash(str(metrics))
        if hasattr(self, '_last_metrics_hash') and new_hash == self._last_metrics_hash:
            return
        self._last_metrics_hash = new_hash

        self.metrics_table.clear()

        # Format and display metrics
        display_metrics = [
            ("Total PnL", f"${metrics.get('total_pnl', 0):,.2f}"),
            ("Win Rate", f"{metrics.get('win_rate', 0):.1f}%"),
            ("Total Trades", str(metrics.get('total_trades', 0))),
            ("Winning Trades", str(metrics.get('winning_trades', 0))),
            ("Losing Trades", str(metrics.get('losing_trades', 0))),
            ("Average Win", f"${metrics.get('avg_win', 0):,.2f}"),
            ("Average Loss", f"${metrics.get('avg_loss', 0):,.2f}"),
            ("Max Drawdown", f"{metrics.get('max_drawdown', 0):.1f}%"),
            ("Sharpe Ratio", f"{metrics.get('sharpe_ratio', 0):.2f}")
        ]

        for metric, value in display_metrics:
            self.metrics_table.add_row(metric, value)


class TradeHistoryPanel(Static):
    """Panel displaying recent trade history."""

    CHUNK_SIZE = 5  # Number of trades to process at once

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("[bold]Recent Trades[/bold]")
            self.trades_table = DataTable()
            yield self.trades_table

    def on_mount(self) -> None:
        for column in ["Time", "Pair", "Side", "Price", "Size", "PnL"]:
            self.trades_table.add_column(column)

    def update_trades(self, trades_df: pd.DataFrame) -> None:
        if trades_df is None or trades_df.empty:
            self.trades_table.clear()
            return

        # Only process last 20 trades
        recent_trades = trades_df.tail(20)

        # Check if data has changed
        if hasattr(self, '_last_trades_hash'):
            new_hash = hash(tuple(recent_trades.values.tobytes()))
            if new_hash == self._last_trades_hash:
                return
            self._last_trades_hash = new_hash

        self.trades_table.clear()

        # Process in chunks
        chunks = np.array_split(
            recent_trades,
            max(1, len(recent_trades) // self.CHUNK_SIZE)
        )
        for chunk in chunks:
            self._process_trade_chunk(chunk)

    def _process_trade_chunk(self, chunk) -> None:
        for _, trade in chunk.iterrows():
            side_color = "green" if trade['side'].lower() == 'buy' else "red"
            pnl_color = "green" if trade['pnl'] > 0 else "red"

            self.trades_table.add_row(
                trade['timestamp'].strftime("%Y-%m-%d %H:%M:%S"),
                trade['pair'],
                f"[{side_color}]{trade['side'].upper()}[/{side_color}]",
                f"${trade['price']:,.2f}",
                f"{trade['size']:.6f}",
                f"[{pnl_color}]${trade['pnl']:,.2f}[/{pnl_color}]"
            )


class AlertsPanel(Static):
    """Panel displaying performance alerts."""

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("[bold]Alerts[/bold]")
            self.alerts_table = DataTable()
            yield self.alerts_table

    def on_mount(self) -> None:
        self.alerts_table.add_column("Alert")

    def update_alerts(self, alerts: list) -> None:
        if not alerts:
            self.alerts_table.clear()
            return

        # Check if alerts have changed
        new_hash = hash(tuple(alerts))
        if hasattr(self, '_last_alerts_hash') and new_hash == self._last_alerts_hash:
            return
        self._last_alerts_hash = new_hash

        self.alerts_table.clear()
        for alert in alerts:
            self.alerts_table.add_row(f"[red]{alert}[/red]")


# ------------------------------------------------------------------------------
# Merged PerformanceWidget
# ------------------------------------------------------------------------------

class PerformanceWidget(Static):
    """Widget for displaying performance analysis with real-time updates."""

    # Reactive states
    loading: bool = reactive(False)
    error_count: int = reactive(0)
    last_update: datetime = reactive(None)
    metrics: dict = reactive({})
    trades: pd.DataFrame = reactive(pd.DataFrame())
    alerts: list = reactive([])
    current_timeframe: str = reactive('all')

    DEFAULT_CSS = """
    PerformanceWidget {
        width: 100%;
        height: 100%;
        padding: 1;
    }
    
    #controls {
        height: 3;
        margin-bottom: 1;
    }
    
    DataTable {
        height: 1fr;
    }
    """

    def __init__(
        self,
        performance_monitor,
        config: Optional[Dict] = None
    ):
        super().__init__()
        self.performance_monitor = performance_monitor
        
        # Default configuration
        self.config = {
            'update_interval': 5.0,
            'show_alerts': True,
            'max_error_retries': 3,
            'cache_duration': 60,  # seconds
            **(config or {})
        }
        
        # Internal state
        self._running = False
        self._update_task = None
        self._cache = {}
        
        # Timeframes
        self.timeframes = {
            '1D': 'daily',
            '1W': 'weekly',
            '1M': 'monthly',
            'ALL': 'all'
        }

    def compose(self) -> ComposeResult:
        """Create child widgets."""
        # Controls section
        with Horizontal(id="controls"):
            yield Button("Refresh", id="refresh-btn", variant="primary")
            yield Label("Timeframe:")
            yield Select(
                [(k, v) for k, v in self.timeframes.items()],
                id="timeframe-select"
            )
            self.status_label = Label("Last updated: Never")
            yield self.status_label

        # Main content
        with Horizontal():
            # Left side
            with Vertical():
                self.metrics_panel = MetricsPanel()
                yield self.metrics_panel

                if self.config['show_alerts']:
                    self.alerts_panel = AlertsPanel()
                    yield self.alerts_panel

            # Right side: Trade history
            with Vertical():
                self.trades_panel = TradeHistoryPanel()
                yield self.trades_panel

    def on_mount(self) -> None:
        """Start background updates when mounted."""
        self._running = True
        self._update_task = asyncio.create_task(self._continuous_update())

    def watch_loading(self, loading: bool) -> None:
        """Update status label when loading state changes."""
        if loading:
            self.status_label.update("Loading...")
        elif self.last_update:
            self.status_label.update(
                f"Last updated: {self.last_update.strftime('%H:%M:%S')}"
            )

    def watch_metrics(self, metrics: dict) -> None:
        """React to metrics changes."""
        self.metrics_panel.update_metrics(metrics)

    def watch_trades(self, trades: pd.DataFrame) -> None:
        """React to trades changes."""
        self.trades_panel.update_trades(trades)

    def watch_alerts(self, alerts: list) -> None:
        """React to alerts changes."""
        if self.config['show_alerts']:
            self.alerts_panel.update_alerts(alerts)

    def watch_current_timeframe(self, timeframe: str) -> None:
        """React to timeframe changes."""
        asyncio.create_task(self.refresh_data())

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle button presses."""
        if event.button.id == "refresh-btn":
            asyncio.create_task(self.refresh_data())

    def on_select_changed(self, event: Select.Changed) -> None:
        """Handle timeframe selection changes."""
        if event.select.id == "timeframe-select":
            self.current_timeframe = event.value

    async def _continuous_update(self) -> None:
        """Continuously update data with error handling."""
        while self._running:
            try:
                await self.refresh_data()
                await asyncio.sleep(self.config['update_interval'])
            except Exception as e:
                await self._handle_error(e)

    async def refresh_data(self) -> None:
        """Refresh all performance data."""
        try:
            self.loading = True

            # Update metrics
            self.metrics = await self._get_cached_data(
                f'metrics_{self.current_timeframe}',
                self.performance_monitor.calculate_metrics_async,
                self.current_timeframe
            )

            # Update trades
            self.trades = await self._get_cached_data(
                'trades',
                self.performance_monitor.get_trade_history,
                'all'
            )

            # Update alerts
            if self.config['show_alerts']:
                self.alerts = await self._get_cached_data(
                    'alerts',
                    self.performance_monitor.get_performance_alerts
                )

            self.last_update = datetime.now()
            self.error_count = 0

        except Exception as e:
            await self._handle_error(e)
        finally:
            self.loading = False

    async def _get_cached_data(self, key: str, fetch_func, *args):
        """Get data from cache or fetch if expired."""
        now = datetime.now()
        if key in self._cache:
            data, timestamp = self._cache[key]
            if (now - timestamp).seconds < self.config['cache_duration']:
                return data

        data = await self._with_timeout(fetch_func, *args)
        self._cache[key] = (data, now)
        return data

    async def _with_timeout(self, func, *args):
        """Execute function with timeout."""
        return await asyncio.wait_for(func(*args), timeout=30.0)

    async def _handle_error(self, e: Exception) -> None:
        """Handle errors with retry logic."""
        self.error_count += 1
        error_msg = f"Error updating performance data: {str(e)}"

        if isinstance(e, asyncio.TimeoutError):
            error_msg = "Timeout while fetching data"
        elif isinstance(e, ConnectionError):
            error_msg = "Connection error"

        logging.error(error_msg)

        if self.error_count >= self.config['max_error_retries']:
            self._running = False
            logging.critical("Too many errors; stopping updates")

    async def on_unmount(self) -> None:
        """Clean up when widget is unmounted."""
        self._running = False
        if self._update_task:
            self._update_task.cancel()
            try:
                await self._update_task
            except asyncio.CancelledError:
                pass
            self._update_task = None

    def stop_updates(self) -> None:
        """Stop background updates."""
        self._running = False


# ------------------------------------------------------------------------------
# Merged PerformanceScreen using PerformanceWidget
# ------------------------------------------------------------------------------

class PerformanceScreen(Screen):
    """Performance analysis screen using the PerformanceWidget."""

    DEFAULT_CSS = """
    PerformanceScreen {
        layout: grid;
        grid-size: 2;
        grid-columns: 15% 85%;
    }

    #main-content {
        width: 100%;
        height: 100%;
    }
    """

    def __init__(self, performance_monitor):
        super().__init__()
        self.performance_monitor = performance_monitor
        self._widget = None

    def compose(self) -> ComposeResult:
        """Create child widgets for the screen."""
        # Navigation sidebar
        yield NavigationSidebar()
        
        # Main content
        with Vertical(id="main-content"):
            yield Header()
            
            # Performance widget with default configuration
            self._widget = PerformanceWidget(
                self.performance_monitor,
                config={
                    'update_interval': 5.0,
                    'show_monthly': True,  # Custom config example
                    'show_alerts': True
                }
            )
            yield self._widget
            
            yield Footer()

    def _stop_widget_updates(self) -> None:
        """Safely stop performance widget updates."""
        try:
            if self._widget:
                self._widget.stop_updates()
        except Exception as e:
            logging.error(f"Error stopping widget updates: {e}")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle navigation button presses."""
        try:
            btn_id = event.button.id
            if not btn_id:
                return

            # Stop performance widget updates when navigating away
            if btn_id != "nav-performance":
                self._stop_widget_updates()

            # Navigation handling
            valid_nav_buttons = {
                "nav-dashboard", "nav-trading", "nav-pairs",
                "nav-portfolio", "nav-strategies", "nav-analysis",
                "nav-settings"
            }
            
            if btn_id in valid_nav_buttons:
                self.app.pop_screen()

        except Exception as e:
            logging.error(f"Error handling button press: {e}")
            raise

    async def on_unmount(self) -> None:
        """Clean up when screen is unmounted."""
        self._stop_widget_updates()
