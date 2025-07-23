from typing import Optional
from textual.containers import Horizontal
from textual.widgets import Static, Label, Digits
from textual.app import ComposeResult

# If you’re using EnhancedSystemStatus or something similar:
from src.ui.components import EnhancedSystemStatus

class JohnStreetHeader(Static):
    """
    A custom header that displays:
      - The 'JohnStreet' logo text
      - BTC price
      - All-time PnL
      - System status widget
    """

    def __init__(
        self,
        sys_status: EnhancedSystemStatus,
        btc_price: float = 0.0,
        all_time_pnl: float = 0.0,
        **kwargs
    ):
        super().__init__(**kwargs)
        self.sys_status = sys_status
        self.btc_price_value = btc_price
        self.all_time_pnl_value = all_time_pnl
        self.btc_digits: Optional[Digits] = None
        self.pnl_digits: Optional[Digits] = None

    def compose(self) -> ComposeResult:
        # Outer horizontal container
        with Horizontal(classes="header-content"):
            # The logo
            yield Static(
                "JohnStreet",
                id="ascii-logo",
                markup=False,
                classes="header-item"
            )

            # BTC price
            with Horizontal(classes="header-item"):
                yield Label("BTC: $")
                self.btc_digits = Digits(
                    f"{self.btc_price_value:.2f}",
                    id="btc-price"
                )
                yield self.btc_digits

            # PnL
            with Horizontal(classes="header-item"):
                yield Label("PnL: $")
                self.pnl_digits = Digits(
                    f"{self.all_time_pnl_value:.2f}",
                    id="all-time-pnl"
                )
                yield self.pnl_digits

            # System Status widget (already a Textual widget)
            yield self.sys_status

    def update_btc_price(self, new_price: float) -> None:
        """
        Optional helper method if you want to update
        the displayed BTC price in real-time.
        """
        if self.btc_digits:
            self.btc_digits.update(f"{new_price:.2f}")

    def update_all_time_pnl(self, new_pnl: float) -> None:
        """Optional helper to update the displayed PnL."""
        if self.pnl_digits:
            self.pnl_digits.update(f"{new_pnl:.2f}")
