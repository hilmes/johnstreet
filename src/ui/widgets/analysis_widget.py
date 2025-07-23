# src/ui/widgets/analysis_widget.py
from __future__ import annotations

import logging
from decimal import Decimal
from dataclasses import dataclass, field
from datetime import datetime
from typing import (
    Dict,
    List,
    Any,
    Optional,
    Protocol,
    TypedDict
)

from textual.app import ComposeResult
from textual.widgets import Label, DataTable, Static, LoadingIndicator
from textual.containers import Vertical, Horizontal, Container
from textual.reactive import reactive
from textual.message import Message


###############################################################################
#                                 PROTOCOLS
###############################################################################

class PerformanceMetrics(TypedDict, total=False):
    """Type definition for performance metrics."""
    total_pnl: float
    win_rate: float
    sharpe_ratio: float
    max_drawdown: float
    total_trades: int
    winning_trades: int
    losing_trades: int
    max_win: float
    max_loss: float
    avg_trade_pnl: float


class PerformanceMonitor(Protocol):
    """
    Protocol for any performance monitor object used by AnalysisWidget.
    Must implement these two methods:
    """
    def calculate_metrics(self, timeframe: str) -> PerformanceMetrics: ...
    def get_pair_performance(self, timeframe: str) -> Dict[str, PerformanceMetrics]: ...


###############################################################################
#                                 CONFIG
###############################################################################

@dataclass
class AnalysisWidgetConfig:
    """
    Configuration for the AnalysisWidget.
    This merges ideas from your old AnalysisConfig & WidgetConfig.
    """
    update_interval: float = 60.0        # auto-refresh interval
    show_detailed_metrics: bool = True   # for toggling extra metrics
    chart_type: str = "candlestick"
    timeframe: str = "1h"                # current timeframe
    timeframes: List[str] = field(default_factory=lambda: ["1h", "4h", "1d", "all"])
    table_update_interval: float = 5.0   # how often we update tables
    auto_refresh: bool = True            # whether to refresh on a timer


###############################################################################
#                            ANALYSIS WIDGET
###############################################################################

class AnalysisWidget(Static):
    """
    A single widget that displays trading analysis data.
    In Approach B, you simply mount this widget in your main TUI's `main-content`.
    """

    # -------------------------------------------------------------------------
    # REACTIVE STATE
    # -------------------------------------------------------------------------
    loading: bool = reactive(False)            # currently loading data?
    current_timeframe: str = reactive("all")   # user-selected timeframe
    last_update: datetime = reactive(datetime.now())
    error_state: bool = reactive(False)
    error_message: str = reactive("")

    DEFAULT_CSS = """
    AnalysisWidget {
        width: 100%;
        height: 100%;
        padding: 1;
        background: $surface;
    }

    DataTable {
        height: auto;
        max-height: 20;
        border: solid $primary;
    }

    .section-title {
        text-style: bold;
        margin: 1 0;
        color: $text;
    }

    .error-message {
        color: $error;
        text-style: bold;
    }

    LoadingIndicator {
        align: center middle;
    }

    .timeframe-selector {
        padding: 1;
        margin-right: 2;
        background: $panel;
        opacity: 0.7;
    }

    .timeframe-selector:hover {
        opacity: 1.0;
        text-style: bold;
    }

    .timeframe-selector--active {
        background: $accent;
        color: $text;
        opacity: 1.0;
        text-style: bold;
    }

    #timeframe-controls {
        margin-bottom: 1;
        align: center middle;
    }

    .positive-value {
        color: $success;
    }

    .negative-value {
        color: $error;
    }

    .data-section {
        margin-bottom: 1;
    }
    """

    class DataRefreshed(Message):
        """
        Event emitted when new data is fully loaded/refreshed.
        """
        def __init__(self, timestamp: datetime) -> None:
            self.timestamp = timestamp
            super().__init__()

    # -------------------------------------------------------------------------
    # INIT
    # -------------------------------------------------------------------------
    def __init__(
        self,
        performance_monitor: PerformanceMonitor,
        kraken_api: Optional[Any] = None,
        pair_trading_modes: Optional[Dict[str, Dict[str, bool]]] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Initialize the AnalysisWidget with references & config.
        :param performance_monitor: an object implementing the PerformanceMonitor protocol
        :param kraken_api: optional reference if you need to fetch ticker data from Kraken
        :param pair_trading_modes: dict of { "XBTUSD": {"live": True, ...}, ... }
        :param config: optional dict to override AnalysisWidgetConfig
        """
        super().__init__()
        self.performance_monitor = performance_monitor
        self.kraken_api = kraken_api
        self.pair_trading_modes = pair_trading_modes or {}
        self._config = AnalysisWidgetConfig(**config) if config else AnalysisWidgetConfig()
        self._tables: Dict[str, DataTable] = {}  # store references to each table

    # -------------------------------------------------------------------------
    # LAYOUT
    # -------------------------------------------------------------------------
    def compose(self) -> ComposeResult:
        """
        Create and yield all sub-widgets (labels, tables, etc.).
        """
        with Container(id="analysis-content"):
            # Timeframe selector row
            with Horizontal(id="timeframe-controls"):
                for timeframe in self._config.timeframes:
                    is_active = (timeframe == self.current_timeframe)
                    yield Label(
                        f"[bold]{timeframe.upper()}[/bold]" if is_active else timeframe.upper(),
                        id=f"timeframe-{timeframe}",
                        classes=f"timeframe-selector {'timeframe-selector--active' if is_active else ''}"
                    )

            # The main vertical layout containing multiple sections
            with Vertical(id="data-sections"):
                # Performance Summary Section
                with Vertical(classes="data-section"):
                    yield Label("Performance Summary", classes="section-title")
                    table = DataTable(id="table-summary")
                    table.add_column("Metric")
                    table.add_column("Value")
                    self._tables["summary"] = table
                    yield table

                # Trading Metrics Section
                with Vertical(classes="data-section"):
                    yield Label("Trading Metrics", classes="section-title")
                    table = DataTable(id="table-metrics")
                    table.add_column("Metric")
                    table.add_column("Value")
                    self._tables["metrics"] = table
                    yield table

                # Pair Performance Section
                with Vertical(classes="data-section"):
                    yield Label("Pair Performance", classes="section-title")
                    table = DataTable(id="table-pairs")
                    table.add_column("Pair")
                    table.add_column("Total P&L")
                    table.add_column("Win Rate")
                    table.add_column("Max Drawdown")
                    self._tables["pairs"] = table
                    yield table

            # Loading indicator at the very bottom
            yield LoadingIndicator()

    async def on_mount(self) -> None:
        """
        Called once the widget is mounted in the DOM.
        We can initiate a data refresh here (and set up auto-refresh if desired).
        """
        # Kick off an immediate refresh
        await self.refresh_analysis_data()

        # If auto_refresh is True, schedule periodic refresh calls
        if self._config.auto_refresh:
            self.set_interval(self._config.table_update_interval, self.refresh_analysis_data)

    # -------------------------------------------------------------------------
    # DATA REFRESH LOGIC
    # -------------------------------------------------------------------------
    async def refresh_analysis_data(self) -> None:
        """
        Refresh all data in the widget.
        If already loading, skip to avoid re-entrant calls.
        """
        if self.loading:
            return

        try:
            self.loading = True
            self.error_state = False

            # Update each data section
            await self._update_performance_summary()
            await self._update_trading_metrics()
            await self._update_pair_performance()

            self.last_update = datetime.now()
            self.post_message(self.DataRefreshed(self.last_update))

        except Exception as e:
            logging.error("Error refreshing analysis data", exc_info=True)
            self.error_state = True
            self.error_message = str(e)
        finally:
            self.loading = False

    async def _update_performance_summary(self) -> None:
        """Update the Performance Summary table (P&L, Win rate, etc.)."""
        table = self._tables.get("summary")
        if not table or not self.performance_monitor:
            return

        try:
            table.clear()
            metrics = self.performance_monitor.calculate_metrics(self.current_timeframe)

            summary_data = [
                ("Total P&L",    metrics.get("total_pnl", 0),    "currency"),
                ("Win Rate",     metrics.get("win_rate", 0),     "percentage"),
                ("Sharpe Ratio", metrics.get("sharpe_ratio", 0), "number"),
                ("Max Drawdown", metrics.get("max_drawdown", 0), "percentage"),
            ]

            for label, value, value_type in summary_data:
                table.add_row(label, self._format_value(value, value_type))

        except Exception as e:
            logging.error("Error updating performance summary", exc_info=True)
            raise

    async def _update_trading_metrics(self) -> None:
        """Update the Trading Metrics table (trade counts, largest win/loss, etc.)."""
        table = self._tables.get("metrics")
        if not table or not self.performance_monitor:
            return

        try:
            table.clear()
            metrics = self.performance_monitor.calculate_metrics(self.current_timeframe)

            # Negative sign for largest loss if we want to color it negative
            metrics_data = [
                ("Total Trades",    metrics.get("total_trades", 0),    "number"),
                ("Winning Trades",  metrics.get("winning_trades", 0),  "number"),
                ("Losing Trades",   metrics.get("losing_trades", 0),   "number"),
                ("Avg Trade P&L",   metrics.get("avg_trade_pnl", 0),   "currency"),
                ("Largest Win",     metrics.get("max_win", 0),         "currency"),
                ("Largest Loss",   -metrics.get("max_loss", 0),        "currency"),
            ]

            for label, value, value_type in metrics_data:
                table.add_row(label, self._format_value(value, value_type))

        except Exception as e:
            logging.error("Error updating trading metrics", exc_info=True)
            raise

    async def _update_pair_performance(self) -> None:
        """Update the Pair Performance table for each live pair."""
        table = self._tables.get("pairs")
        if not table or not self.performance_monitor:
            return

        try:
            table.clear()
            pair_metrics = self.performance_monitor.get_pair_performance(self.current_timeframe)
            live_pairs = {
                pair for pair, modes in self.pair_trading_modes.items()
                if modes.get("live", False)
            }

            for pair, perf in pair_metrics.items():
                # If live_pairs is empty, we show all pairs;
                # otherwise only those that have 'live': True
                if not live_pairs or pair in live_pairs:
                    table.add_row(
                        pair,
                        self._format_value(perf.get("total_pnl", 0), "currency"),
                        self._format_value(perf.get("win_rate", 0), "percentage"),
                        self._format_value(perf.get("max_drawdown", 0), "percentage"),
                    )

        except Exception as e:
            logging.error("Error updating pair performance", exc_info=True)
            raise

    # -------------------------------------------------------------------------
    # EVENT HANDLERS & HELPERS
    # -------------------------------------------------------------------------
    def on_click(self, event) -> None:
        """
        If the user clicks on a timeframe label, switch timeframe & refresh.
        """
        if event.target.id and event.target.id.startswith("timeframe-"):
            new_timeframe = event.target.id.replace("timeframe-", "")
            if new_timeframe != self.current_timeframe:
                self.current_timeframe = new_timeframe
                self.refresh_analysis_data()

    def action_toggle_fullscreen(self) -> None:
        """
        If you want a “toggle fullscreen” action from your main TUI or a key binding,
        you can wire it here. The user can call `analysis_widget.action_toggle_fullscreen()`.
        """
        self.app.toggle_class("fullscreen")

    def _format_value(self, value: Any, value_type: str) -> str:
        """
        Convert raw data into a colored / formatted string. 
        e.g. currency => $1,234.56, percentage => 12.3%
        """
        if isinstance(value, (int, float, Decimal)):
            is_positive = value >= 0
            value_str = self._format_number(value, value_type)
            css_class = "positive-value" if is_positive else "negative-value"
            return f"[{css_class}]{value_str}[/{css_class}]"
        return str(value)

    def _format_number(self, value: Any, value_type: str) -> str:
        """Helper for numeric formatting."""
        if value_type == "currency":
            return f"${value:,.2f}"
        elif value_type == "percentage":
            return f"{value:.1%}"
        elif value_type == "number":
            return f"{value:,.0f}"
        return str(value)

    # -------------------------------------------------------------------------
    # CONFIG GETTER/SETTER
    # -------------------------------------------------------------------------
    @property
    def config(self) -> AnalysisWidgetConfig:
        """Get the current config object."""
        return self._config

    @config.setter
    def config(self, value: Dict[str, Any]) -> None:
        """
        Override config fields from a dictionary.
        Example usage:
            analysis_widget.config = {"timeframe": "4h", "auto_refresh": False}
        """
        self._config = AnalysisWidgetConfig(**value)
