"""
A set of widgets and components for controlling and displaying a trading portfolio
in a Textual-based application. Designed to work with a core PortfolioManager
(from core/portfolio.py) and an EnhancedKrakenAPI (from enhanced_kraken.py).
"""

from __future__ import annotations

import logging
import asyncio
from dataclasses import dataclass
from typing import Dict, Optional, Any, List
from datetime import datetime

from textual.app import ComposeResult
from textual.widget import Widget
from textual.widgets import Label, LoadingIndicator, Button
from textual.containers import Vertical, Horizontal
from textual.reactive import reactive
from textual.message import Message

#
# ----------------------------------------------------------------------
#  Kraken Pair Mapping
# ----------------------------------------------------------------------
#
# Here we define a dictionary that maps the short asset code
# to the full Kraken pair name. This ensures consistency when
# pulling data from Kraken's API (e.g., 'SOL' -> 'SOLUSD').
#
KRKN_MAP = {
    "XBT":  "XXBTZUSD",   # BTC
    "ETH":  "XETHZUSD",   # ETH
    "SOL":  "SOLUSD",
    "AVAX": "AVAXUSD",
    "LINK": "LINKUSD",
    "DOT":  "DOTUSD",
}


#
# ----------------------------------------------------------------------
#  Portfolio Data Classes
# ----------------------------------------------------------------------
#

@dataclass(frozen=True)
class PortfolioPerformanceMetrics:
    """
    Stores performance metrics for a single asset in the portfolio.
    All fields are immutable for thread safety.
    """
    balance: float = 0.0
    price_usd: float = 0.0
    value_usd: float = 0.0
    allocation_pct: float = 0.0
    last_updated: Optional[float] = None

    @property
    def formatted_timestamp(self) -> str:
        """
        Converts the 'last_updated' timestamp to a human-readable format.
        If none is available, returns 'N/A'.
        """
        if self.last_updated is None:
            return "N/A"
        return datetime.fromtimestamp(self.last_updated).strftime("%Y-%m-%d %H:%M:%S")

    @property
    def value_display(self) -> str:
        """Returns the total USD value formatted."""
        return f"${self.value_usd:,.2f}"

    @property
    def price_display(self) -> str:
        """Returns the asset price in USD formatted."""
        return f"${self.price_usd:,.2f}"

    @property
    def balance_display(self) -> str:
        """Returns the asset balance formatted."""
        return f"{self.balance:.8f}"

    @property
    def allocation_display(self) -> str:
        """Returns the allocation percentage formatted."""
        return f"{self.allocation_pct:.1f}%"


#
# ----------------------------------------------------------------------
#  Message Classes
# ----------------------------------------------------------------------
#

class PortfolioUpdatedMessage(Message):
    """Dispatched when the portfolio data has been refreshed."""
    def __init__(self, total_value: float) -> None:
        super().__init__()
        self.total_value = total_value


#
# ----------------------------------------------------------------------
#  UI Components
# ----------------------------------------------------------------------
#

class PortfolioRow(Widget):
    """Displays metrics for a single asset in a horizontal row."""

    def __init__(self, asset_name: str, metrics: PortfolioPerformanceMetrics) -> None:
        super().__init__()
        self.asset_name = asset_name
        self._metrics = metrics
        self._labels: Dict[str, Label] = {}

    def compose(self) -> ComposeResult:
        """Construct a row with multiple labeled segments for each data point."""
        with Horizontal(classes="asset-row"):
            # Name
            with Horizontal(classes="row-section"):
                yield Label("Name: ", classes="stat-label")
                self._labels["name"] = Label(self.asset_name, classes="stat-value")
                yield self._labels["name"]

            # Balance
            with Horizontal(classes="row-section"):
                yield Label("Balance: ", classes="stat-label")
                self._labels["balance"] = Label(
                    self._metrics.balance_display, classes="stat-value"
                )
                yield self._labels["balance"]

            # Price
            with Horizontal(classes="row-section"):
                yield Label("Price: ", classes="stat-label")
                self._labels["price"] = Label(
                    self._metrics.price_display, classes="stat-value"
                )
                yield self._labels["price"]

            # Value
            with Horizontal(classes="row-section"):
                yield Label("Value: ", classes="stat-label")
                self._labels["value"] = Label(
                    self._metrics.value_display, classes="stat-value"
                )
                yield self._labels["value"]

            # Allocation
            with Horizontal(classes="row-section"):
                yield Label("Allocation: ", classes="stat-label")
                self._labels["allocation"] = Label(
                    self._metrics.allocation_display, classes="stat-value"
                )
                yield self._labels["allocation"]

    def update_metrics(self, metrics: PortfolioPerformanceMetrics) -> None:
        """Update the row's metrics in place without a full re-render."""
        self._metrics = metrics
        updates = {
            "balance": metrics.balance_display,
            "price": metrics.price_display,
            "value": metrics.value_display,
            "allocation": metrics.allocation_display,
        }
        for key, value in updates.items():
            if label := self._labels.get(key):
                label.update(value)


class PortfolioSummary(Widget):
    """Summarizes overall portfolio details."""

    total_value: reactive[float] = reactive(0.0)
    asset_count: reactive[int] = reactive(0)

    def compose(self) -> ComposeResult:
        """Build the summary layout."""
        with Vertical():
            yield Label("Portfolio Overview", classes="summary-title")
            with Horizontal():
                yield Label("Total Assets: 0", id="assets-label")
                yield Label("Total Value: $0.00", id="value-label")
            yield Button("Refresh", id="summary-refresh-btn", variant="primary")

    def watch_total_value(self, old_val: float, new_val: float) -> None:
        """Update the total value label reactively."""
        if label := self.query_one("#value-label", Label):
            label.update(f"Total Value: ${new_val:,.2f}")

    def watch_asset_count(self, old_val: int, new_val: int) -> None:
        """Update the asset count label reactively."""
        if label := self.query_one("#assets-label", Label):
            label.update(f"Total Assets: {new_val}")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle refresh button clicks."""
        if event.button.id == "summary-refresh-btn":
            self.post_message(PortfolioUpdatedMessage(self.total_value))


class PortfolioPanel(Widget):
    """Main portfolio management widget."""

    DEFAULT_CSS = """
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

    # Assets to track with USD pairs; "XBT" is Kraken's symbol for BTC, etc.
    DEFAULT_ASSETS = ["XBT", "ETH", "SOL", "AVAX", "LINK", "DOT"]

    # Refresh interval in seconds
    REFRESH_INTERVAL = 5.0

    def __init__(
        self,
        portfolio_manager: Any,
        kraken_api: Any,
        pair_trading_modes: Optional[Dict[str, Dict[str, bool]]] = None
    ):
        """Initialize the panel."""
        super().__init__()
        self.portfolio_manager = portfolio_manager
        self.kraken_api = kraken_api
        self.pair_trading_modes = pair_trading_modes or {}

        self._rows: Dict[str, PortfolioRow] = {}
        self._metrics: Dict[str, PortfolioPerformanceMetrics] = {}
        self._refresh_task: Optional[asyncio.Task] = None

    def compose(self) -> ComposeResult:
        """Build the main panel layout."""
        with Vertical():
            yield Label("Portfolio Manager", classes="screen-title")

            self.loading_indicator = LoadingIndicator()
            yield self.loading_indicator

            with Horizontal(classes="total-value-container"):
                yield Label("Total Portfolio Value (USD): ")
                self.total_value_label = Label("$0.00", classes="total-value")
                yield self.total_value_label

            yield Vertical(id="asset-rows-container")

            self.summary = PortfolioSummary()
            yield self.summary

    async def on_mount(self) -> None:
        """Initialize the panel on mount."""
        # Ensure container exists
        try:
            container = self.query_one("#asset-rows-container")
            if container is None:
                container = Vertical(id="asset-rows-container")
                await self.mount(container)
        except Exception:
            container = Vertical(id="asset-rows-container")
            await self.mount(container)

        # Start refresh task
        self._refresh_task = asyncio.create_task(self._periodic_refresh())
        
        # Initial data refresh
        await self.refresh_portfolio_data()

    def on_unmount(self) -> None:
        """Clean up on unmount."""
        if self._refresh_task and not self._refresh_task.done():
            self._refresh_task.cancel()

    async def _periodic_refresh(self) -> None:
        """Periodically refresh data."""
        while True:
            try:
                await asyncio.sleep(self.REFRESH_INTERVAL)
                await self.refresh_portfolio_data()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"Error in periodic refresh: {e}")
                await asyncio.sleep(1.0)

    async def refresh_portfolio_data(self) -> None:
        """Refresh all portfolio data."""
        try:
            if hasattr(self, 'loading_indicator'):
                self.loading_indicator.display = True

            # 1) Build a dictionary of balances, defaulting to 0.0 for each asset
            balances = {asset: 0.0 for asset in self.DEFAULT_ASSETS}

            # 2) Attempt to get actual balances from the portfolio manager
            try:
                actual_balances = await self.portfolio_manager.get_balances()
                
                # If no balances are returned, we log a note,
                # but we still carry on with 0.0 for each asset.
                if not actual_balances:
                    logging.info("No balances retrieved or empty response. "
                                 "Defaulting to zero for all assets.")
                else:
                    for asset, balance in actual_balances.items():
                        try:
                            balances[asset] = float(balance)
                        except (ValueError, TypeError) as e:
                            logging.error(f"Invalid balance for {asset}: {balance} - {e}")
                            balances[asset] = 0.0
            except Exception as e:
                logging.error(f"Error getting balances: {e}")

            # 3) Commit balances to DB
            try:
                await self.portfolio_manager.commit_balances_to_db(balances)
            except Exception as db_err:
                logging.error(f"DB commit error: {db_err}")

            # 4) Build a list of Kraken pairs (from KRKN_MAP) and fetch ticker data
            validated_pairs = []
            pair_map = {}

            for asset in self.DEFAULT_ASSETS:
                kraken_pair = KRKN_MAP.get(asset)
                if kraken_pair is None:
                    logging.warning(f"No Kraken pair mapping for asset: {asset}")
                    pair_map[asset] = None
                else:
                    validated_pairs.append(kraken_pair)
                    pair_map[asset] = kraken_pair
                    logging.debug(f"Using Kraken pair {kraken_pair} for asset {asset}")

            # 5) Retrieve ticker info from Kraken for validated pairs
            try:
                ticker_data = self.kraken_api.get_ticker_info(validated_pairs) if validated_pairs else {}
                logging.debug(f"Retrieved ticker data for {len(ticker_data)} pairs")
            except Exception as e:
                logging.error(f"Error fetching ticker data: {e}")
                ticker_data = {}

            # 6) Calculate portfolio metrics
            total_value = 0.0
            timestamp = datetime.now().timestamp()

            for asset in self.DEFAULT_ASSETS:
                balance = balances.get(asset, 0.0)
                kraken_pair = pair_map.get(asset)

                price = 0.0
                value = 0.0
                if kraken_pair and kraken_pair in ticker_data:
                    try:
                        # Typically, "c" field => [<last_trade_price>, <lot_volume>]
                        current_price_list = ticker_data[kraken_pair].get("c", [])
                        price = float(current_price_list[0]) if current_price_list else 0.0
                        value = balance * price
                        logging.debug(f"Computed {asset} => price={price:.4f}, value={value:.4f}")
                    except (ValueError, IndexError, KeyError, TypeError) as ex:
                        logging.debug(f"No valid price data for {asset} ({kraken_pair}): {ex}")
                else:
                    logging.debug(f"Missing ticker info for asset={asset}, pair={kraken_pair}")

                total_value += value

                self._metrics[asset] = PortfolioPerformanceMetrics(
                    balance=balance,
                    price_usd=price,
                    value_usd=value,
                    allocation_pct=0.0,  # temp allocation
                    last_updated=timestamp,
                )

            # 7) Update allocation percentages
            if total_value > 0:
                for asset, pm in self._metrics.items():
                    allocation = (pm.value_usd / total_value) * 100
                    self._metrics[asset] = PortfolioPerformanceMetrics(
                        balance=pm.balance,
                        price_usd=pm.price_usd,
                        value_usd=pm.value_usd,
                        allocation_pct=allocation,
                        last_updated=pm.last_updated
                    )

            # 8) Update UI elements
            await self._ensure_and_update_ui_elements(total_value)

        except Exception as e:
            logging.error(f"Portfolio refresh error: {e}", exc_info=True)
        finally:
            if hasattr(self, 'loading_indicator'):
                self.loading_indicator.display = False

    async def _ensure_and_update_ui_elements(self, total_value: float) -> None:
        """Helper method to ensure UI elements exist and update them safely."""
        if hasattr(self, 'total_value_label'):
            self.total_value_label.update(f"${total_value:,.2f}")

        # Ensure container exists
        try:
            container = self.query_one("#asset-rows-container")
            if container is None:
                container = Vertical(id="asset-rows-container")
                await self.mount(container)
                logging.info("Created new asset rows container")
        except Exception as e:
            logging.error(f"Error with container: {e}")
            container = Vertical(id="asset-rows-container")
            await self.mount(container)
            logging.info("Created new asset rows container after error")

        # Update or create rows
        if container is not None:
            existing_rows = set(self._rows.keys())
            for asset, metrics in self._metrics.items():
                try:
                    if asset in self._rows:
                        self._rows[asset].update_metrics(metrics)
                        existing_rows.remove(asset)
                    else:
                        row = PortfolioRow(asset, metrics)
                        self._rows[asset] = row
                        await container.mount(row)
                except Exception as row_error:
                    logging.error(f"Error updating row for {asset}: {row_error}")
            
            # Remove rows for assets no longer in DEFAULT_ASSETS
            for old_asset in existing_rows:
                try:
                    if old_asset in self._rows:
                        await self._rows[old_asset].remove()
                        del self._rows[old_asset]
                except Exception as remove_error:
                    logging.error(f"Error removing old row for {old_asset}: {remove_error}")

        # Update summary widget
        if hasattr(self, 'summary'):
            self.summary.total_value = total_value
            self.summary.asset_count = len(self._rows)

    def get_current_unit_prices(self) -> Dict[str, float]:
        """
        Returns a snapshot of the latest unit prices for each known asset.
        If an asset doesn't exist or has no price, it returns 0.0.
        """
        return {
            asset: metrics.price_usd
            for asset, metrics in self._metrics.items()
        }

    def on_portfolio_updated_message(self, message: PortfolioUpdatedMessage) -> None:
        """Handle portfolio update messages."""
        asyncio.create_task(self.refresh_portfolio_data())

    def log_debug_info(self) -> None:
        """Log debug information about current state."""
        logging.debug("Portfolio Panel Debug Info:")
        logging.debug(f"Number of tracked assets: {len(self.DEFAULT_ASSETS)}")
        logging.debug(f"Number of active rows: {len(self._rows)}")
        logging.debug(f"Number of metrics entries: {len(self._metrics)}")
        logging.debug(f"Trading modes configured: {bool(self.pair_trading_modes)}")
        if hasattr(self, 'summary'):
            logging.debug(f"Current total value: ${self.summary.total_value:,.2f}")
        logging.debug("Active rows:")
        for asset, row in self._rows.items():
            if asset in self._metrics:
                pm = self._metrics[asset]
                logging.debug(
                    f"  {asset}: balance={pm.balance:.8f}, "
                    f"price=${pm.price_usd:.2f}, "
                    f"value=${pm.value_usd:.2f}, "
                    f"allocation={pm.allocation_pct:.1f}%"
                )
