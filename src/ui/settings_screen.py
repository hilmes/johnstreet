# src/ui/settings_screen.py

import logging
from typing import Dict

from textual.app import ComposeResult
from textual.screen import Screen
from textual.widgets import (
    Header, Footer, Label, DataTable, Static,
    Button, Input, LoadingIndicator
)
from textual.containers import Vertical, Horizontal
from textual.reactive import reactive

# Reuse the same sidebar used by the main app
from src.ui.components import NavigationSidebar


class SettingsScreen(Screen):
    """
    A separate screen to manage app settings (API keys, risk management, etc.).
    Includes a NavigationSidebar for consistency with other screens,
    and demonstrates how to use Textual's reactive API for loading states
    and notifications.
    """

    # ------------------------------------
    # Reactive Properties
    # ------------------------------------
    loading: bool = reactive(False)
    notification_message: str = reactive("")

    def __init__(
        self,
        config,
        risk_manager,
        websocket,
        db
        # If you need more references from the main app (like kraken_api), add them here
    ):
        super().__init__()
        self.config = config
        self.risk_manager = risk_manager
        self.websocket = websocket
        self.db = db

        # We'll watch changes in `loading` to show/hide a LoadingIndicator,
        # and watch `notification_message` to update a label with success/error info.
        self.loading_indicator = LoadingIndicator()
        self.notification_label = Label("")  # We'll update this in watch_notification_message

        # Input fields (and other widgets) are declared in `compose`.
        # We keep references here for clarity.
        self.api_key_input: Input = None
        self.api_secret_input: Input = None
        self.max_position_input: Input = None
        self.max_daily_loss_input: Input = None
        self.ws_retries_input: Input = None
        self.ws_delay_input: Input = None

    # ------------------------------------
    # Reactive Watchers
    # ------------------------------------
    def watch_loading(self, old_val: bool, new_val: bool) -> None:
        """
        Automatically called when `self.loading` changes.
        We show/hide the LoadingIndicator accordingly.
        """
        if new_val:
            self.loading_indicator.display = True
            logging.debug("SettingsScreen is now loading...")
        else:
            self.loading_indicator.display = False
            logging.debug("SettingsScreen finished loading.")

    def watch_notification_message(self, old_val: str, new_val: str) -> None:
        """
        Automatically called when `self.notification_message` changes.
        We update the notification_label text accordingly.
        """
        if new_val:
            self.notification_label.update(new_val)
        else:
            self.notification_label.update("")

    # ------------------------------------
    # UI Layout (compose)
    # ------------------------------------
    def compose(self) -> ComposeResult:
        """Build the screen UI."""
        yield Header()

        # Horizontal layout: sidebar on the left, main content on the right
        with Horizontal():
            yield NavigationSidebar()

            with Vertical(id="main-content"):
                yield Label("[bold]Settings[/bold]", classes="screen-title")

                # A small area for notifications and loading indicator
                # We'll show/hide or update them via watchers.
                with Horizontal():
                    yield self.notification_label
                    yield self.loading_indicator

                # API Configuration
                with Vertical(classes="metrics-panel"):
                    yield Label("[bold]API Configuration[/bold]")
                    with Horizontal():
                        yield Label("API Key:")
                        self.api_key_input = Input(value="*" * 20, password=True)
                        yield self.api_key_input
                    with Horizontal():
                        yield Label("API Secret:")
                        self.api_secret_input = Input(value="*" * 20, password=True)
                        yield self.api_secret_input
                    yield Button("Update API Keys", id="update-api-keys")

                # Risk Management
                with Vertical(classes="metrics-panel"):
                    yield Label("[bold]Risk Management[/bold]")
                    with Horizontal():
                        yield Label("Max Position Size:")
                        self.max_position_input = Input(value=str(self.config.MAX_POSITION_SIZE))
                        yield self.max_position_input
                    with Horizontal():
                        yield Label("Max Daily Loss (%):")
                        self.max_daily_loss_input = Input(value="2.0")
                        yield self.max_daily_loss_input
                    yield Button("Update Risk Parameters", id="update-risk")

                # WebSocket Settings
                with Vertical(classes="metrics-panel"):
                    yield Label("[bold]WebSocket Settings[/bold]")
                    with Horizontal():
                        yield Label("Max Retries:")
                        self.ws_retries_input = Input(value=str(self.config.MAX_RETRIES))
                        yield self.ws_retries_input
                    with Horizontal():
                        yield Label("Retry Delay (s):")
                        self.ws_delay_input = Input(value=str(self.config.RETRY_DELAY))
                        yield self.ws_delay_input
                    yield Button("Update WebSocket Settings", id="update-ws")

                # Database Management
                with Vertical(classes="metrics-panel"):
                    yield Label("[bold]Database Management[/bold]")
                    yield Button("Backup Database", id="backup-db")
                    yield Button("Clear Trade History", id="clear-history")

        yield Footer()

    def on_mount(self) -> None:
        """
        Called once the screen is displayed.
        You could load or refresh any settings data here if needed.
        """
        pass

    # ------------------------------------
    # Button Handlers
    # ------------------------------------
    def on_button_pressed(self, event: Button.Pressed) -> None:
        """
        Handle button presses:
         - The NavigationSidebar (nav-) buttons
         - The "Update" and "Backup/Clear" settings actions
        """
        try:
            btn_id = event.button.id
            if not btn_id:
                return

            # -- Navigation Buttons --
            if btn_id == "nav-dashboard":
                self.app.pop_screen()
            elif btn_id == "nav-trading":
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
                # Already here
                pass

            # -- Settings Buttons --
            elif btn_id == "update-api-keys":
                self.update_api_keys()
            elif btn_id == "update-risk":
                self.update_risk_params()
            elif btn_id == "update-ws":
                self.update_ws_settings()
            elif btn_id == "backup-db":
                self.backup_database()
            elif btn_id == "clear-history":
                self.clear_trade_history()

        except Exception as e:
            logging.error(f"Error handling button press: {e}")

    # ------------------------------------
    # Actual update methods
    # (calling back to the main app or self.config).
    # Adjust to match your app’s architecture.
    # ------------------------------------
    def update_api_keys(self):
        """Example method to handle the 'Update API Keys' logic."""
        try:
            self.loading = True
            new_key = self.api_key_input.value
            new_secret = self.api_secret_input.value
            self.app.handle_api_key_update(new_key, new_secret)
            self.notification_message = "API keys updated successfully!"
        except Exception as e:
            logging.error(f"Error updating API keys: {e}")
            self.notification_message = "[red]Failed to update API keys[/red]"
        finally:
            self.loading = False

    def update_risk_params(self):
        """Example method to handle 'Update Risk Parameters'."""
        try:
            self.loading = True
            new_max_position = float(self.max_position_input.value)
            new_daily_loss = float(self.max_daily_loss_input.value)
            self.app.handle_risk_update(new_max_position, new_daily_loss)
            self.notification_message = "Risk parameters updated successfully!"
        except Exception as e:
            logging.error(f"Error updating risk parameters: {e}")
            self.notification_message = "[red]Failed to update risk parameters[/red]"
        finally:
            self.loading = False

    def update_ws_settings(self):
        """Example method to handle 'Update WebSocket Settings'."""
        try:
            self.loading = True
            new_retries = int(self.ws_retries_input.value)
            new_delay = int(self.ws_delay_input.value)
            self.app.handle_websocket_update(new_retries, new_delay)
            self.notification_message = "WebSocket settings updated successfully!"
        except Exception as e:
            logging.error(f"Error updating WebSocket settings: {e}")
            self.notification_message = "[red]Failed to update WebSocket settings[/red]"
        finally:
            self.loading = False

    def backup_database(self):
        """Example method to handle 'Backup Database'."""
        try:
            self.loading = True
            self.app.backup_database()
            self.notification_message = "Database backup completed successfully!"
        except Exception as e:
            logging.error(f"Error backing up database: {e}")
            self.notification_message = "[red]Failed to backup database[/red]"
        finally:
            self.loading = False

    def clear_trade_history(self):
        """Example method to handle 'Clear Trade History'."""
        try:
            self.loading = True
            self.app.clear_trade_history()
            self.notification_message = "Trade history cleared successfully!"
        except Exception as e:
            logging.error(f"Error clearing trade history: {e}")
            self.notification_message = "[red]Failed to clear trade history[/red]"
        finally:
            self.loading = False
