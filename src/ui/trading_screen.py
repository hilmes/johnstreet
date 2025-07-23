# src/ui/trading_screen.py

import logging
import asyncio
from datetime import datetime, timedelta
from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import Header, Footer, Label, Button, DataTable
from textual.containers import Vertical, Horizontal
from textual.reactive import reactive

# Import your custom UI components
from src.ui.components import NavigationSidebar, EnhancedOrderBook


class TradingScreen(Screen):
    """A dedicated screen to manage trading, showing both open orders and order history."""

    refresh_interval_seconds: float = 5.0

    def __init__(self, kraken_api, db):
        """Initialize the trading screen.

        Args:
            kraken_api: Instance of KrakenAPI (or your EnhancedKrakenAPI) for fetching order data
            db: Database instance for retrieving order history
        """
        super().__init__()
        self.kraken_api = kraken_api
        self.db = db
        self._refresh_task = None
        self._running = True  # For stopping periodic refresh gracefully
        self._error_count = 0  # Track consecutive refresh errors
        self.max_retries = 3   # Maximum number of consecutive errors before stopping refresh

        # [NEW] Create the order book widget (pass in whichever pair you want as default).
        # Replace "XBT/USD" with your preferred pair or something like self.kraken_api.default_pair.
        self.orderbook = EnhancedOrderBook("XBT/USD")

    def compose(self) -> ComposeResult:
        """Compose the UI layout."""
        yield Header()

        # Horizontal layout: nav on the left, main content on the right
        with Horizontal():
            yield NavigationSidebar()

            with Vertical(id="main-content"):
                yield Label("[bold]Trading[/bold]", classes="screen-title")

                # [NEW] Show the EnhancedOrderBook section
                yield Label("[bold]Order Book[/bold]")
                yield self.orderbook

                # Section: Open Orders
                yield Label("[bold]Open Orders[/bold]")
                self.open_orders_table = DataTable(id="open-orders-table")
                yield self.open_orders_table

                # Section: Order History
                yield Label("[bold]Order History[/bold]")
                self.order_history_table = DataTable(id="order-history-table")
                yield self.order_history_table

        yield Footer()

    def on_mount(self) -> None:
        """Initialize the screen when mounted."""
        try:
            # Setup data-table columns
            self._setup_table_columns()
            
            # Initial refresh of the data
            self.refresh_order_book()    # [NEW] Immediately fetch order book
            self.refresh_open_orders()
            self.refresh_order_history()

            # Start the periodic refresh task
            self._running = True
            self._refresh_task = asyncio.create_task(self._periodic_refresh())
            
        except Exception as e:
            logging.error(f"Error in TradingScreen on_mount: {e}")
            raise

    async def on_unmount(self) -> None:
        """Clean up resources when screen is unmounted."""
        try:
            # Stop the periodic refresh loop
            self._running = False
            
            # Cancel and await the refresh task if it exists
            if self._refresh_task and not self._refresh_task.done():
                self._refresh_task.cancel()
                try:
                    await self._refresh_task
                except asyncio.CancelledError:
                    pass
                finally:
                    self._refresh_task = None
            
            logging.info("TradingScreen cleanup completed")
            
        except Exception as e:
            logging.error(f"Error during TradingScreen cleanup: {e}")
            raise

    def _setup_table_columns(self):
        """Setup the columns for both data tables."""
        # Setup columns for open orders
        self.open_orders_table.add_column("Order ID", width=16)
        self.open_orders_table.add_column("Pair", width=12)
        self.open_orders_table.add_column("Side", width=8)
        self.open_orders_table.add_column("Price", width=12)
        self.open_orders_table.add_column("Volume", width=12)
        self.open_orders_table.add_column("Status", width=12)
        self.open_orders_table.add_column("Timestamp", width=18)

        # Setup columns for order history
        self.order_history_table.add_column("Order ID", width=16)
        self.order_history_table.add_column("Pair", width=12)
        self.order_history_table.add_column("Side", width=8)
        self.order_history_table.add_column("Price", width=12)
        self.order_history_table.add_column("Volume", width=12)
        self.order_history_table.add_column("PNL", width=10)
        self.order_history_table.add_column("Filled at", width=18)

    async def _periodic_refresh(self):
        """Periodically refresh the order book and tables."""
        while self._running:
            try:
                self.refresh_order_book()   # [NEW] Update order book each cycle
                self.refresh_open_orders()
                self.refresh_order_history()
                self._error_count = 0  # Reset error count on success

                await asyncio.sleep(self.refresh_interval_seconds)
                
            except Exception as e:
                self._error_count += 1
                logging.error(f"Error in periodic refresh (attempt {self._error_count}): {e}")
                
                if self._error_count >= self.max_retries:
                    logging.critical("Too many refresh errors, stopping updates.")
                    self._running = False
                    break
                
                if self._running:
                    # Exponential backoff with max delay of 30 seconds
                    delay = min(self.refresh_interval_seconds * (2 ** self._error_count), 30)
                    await asyncio.sleep(delay)

    # ----------------------------------------------------------------
    # Data Refresh Methods
    # ----------------------------------------------------------------

    def refresh_order_book(self):
        """Fetch and display the current order book."""
        try:
            # If your API supports a method like get_orderbook_data(pair)
            # Adjust to your actual method name as needed:
            book_data = self.kraken_api.get_orderbook_data("XBT/USD")
            
            # Now update the EnhancedOrderBook widget with the new data
            if book_data:
                self.orderbook.update_book(book_data)

        except Exception as e:
            logging.error(f"Error refreshing order book: {e}")
            raise  # Re-raise so the _periodic_refresh handles it

    def refresh_open_orders(self):
        """Fetch and display current open orders."""
        try:
            open_orders = self.kraken_api.get_open_orders()
            
            # Clear existing rows
            self.open_orders_table.clear()

            for order in open_orders:
                side_color = "green" if order["side"].lower() == "buy" else "red"
                self.open_orders_table.add_row(
                    order["order_id"],
                    order["pair"],
                    f"[{side_color}]{order['side'].upper()}[/{side_color}]",
                    f"${order['price']:,.2f}",
                    f"{order['volume']:.6f}",
                    order["status"].capitalize(),
                    datetime.fromtimestamp(order["timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
                )

        except Exception as e:
            logging.error(f"Error refreshing open orders: {e}")
            raise

    def refresh_order_history(self):
        """Fetch and display completed order history."""
        try:
            orders = self.db.get_order_history(
                start_time=datetime.now() - timedelta(days=7)
            )
            
            # Clear existing rows
            self.order_history_table.clear()

            for order in orders:
                side_color = "green" if order["side"].lower() == "buy" else "red"
                pnl_color = "green" if order["pnl"] >= 0 else "red"

                self.order_history_table.add_row(
                    order["order_id"],
                    order["pair"],
                    f"[{side_color}]{order['side'].upper()}[/{side_color}]",
                    f"${order['price']:,.2f}",
                    f"{order['volume']:.6f}",
                    f"[{pnl_color}]${order['pnl']:,.2f}[/{pnl_color}]",
                    datetime.fromtimestamp(order["filled_timestamp"]).strftime("%Y-%m-%d %H:%M:%S")
                )

        except Exception as e:
            logging.error(f"Error refreshing order history: {e}")
            raise

    # ----------------------------------------------------------------
    # Button Events (Navigation, etc.)
    # ----------------------------------------------------------------
    def on_button_pressed(self, event: Button.Pressed) -> None:
        """Handle navigation button presses."""
        try:
            btn_id = event.button.id
            if not btn_id:
                return

            # Stop refresh before navigating away
            if btn_id != "nav-trading":
                self._running = False

            # Example navigation logic
            if btn_id == "nav-dashboard":
                self.app.pop_screen()
            elif btn_id == "nav-pairs":
                self.app.pop_screen()
            elif btn_id == "nav-portfolio":
                self.app.pop_screen()
            elif btn_id == "nav-strategies":
                self.app.pop_screen()
            elif btn_id == "nav-analysis":
                self.app.pop_screen()
            elif btn_id == "nav-settings":
                self.app.pop_screen()

        except Exception as e:
            logging.error(f"Error handling button press: {e}")
            raise
