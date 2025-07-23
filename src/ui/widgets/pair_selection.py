from __future__ import annotations

import logging
import os
import json
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Dict, Union, Optional

from textual.app import ComposeResult, App
from textual.widget import Widget
from textual.widgets import Label, Switch, Static, Button, Checkbox
from textual.containers import Horizontal, Vertical
from textual.reactive import reactive
from textual.message import Message


#
# ----------------------------------------------------------------------
# PairRow code (two switches: paper, live)
# ----------------------------------------------------------------------
#

@dataclass(frozen=True)
class PairModes:
    """
    Represents modes for a trading pair:
      - paper=True => Paper mode is enabled
      - live=True => Live mode is enabled
    They can be toggled independently,
    or you can enforce single-mode in the parent widget.
    """
    paper: bool = True
    live: bool = False


class PairRowToggle(Message):
    """
    Dispatched when either the Paper or Live switch is toggled.
    Contains:
      - pair_name (str)
      - mode_type ("paper" or "live")
      - new_value (bool)
    """
    def __init__(self, pair_name: str, mode_type: str, new_value: bool) -> None:
        super().__init__()
        self.pair_name = pair_name
        self.mode_type = mode_type
        self.new_value = new_value


class PairRow(Widget):
    """
    A row widget for a single trading pair with two switches:
      - Paper mode
      - Live mode
    """

    pair_modes: reactive[PairModes] = reactive(PairModes(paper=True, live=False))

    def __init__(self, pair_name: str, paper: bool = True, live: bool = False) -> None:
        super().__init__()
        self.pair_name = pair_name
        self.pair_modes = PairModes(paper=paper, live=live)

    def compose(self) -> ComposeResult:
        """
        Create a horizontal row with:
          - The pair name label
          - Paper switch
          - Live switch
        """
        with Horizontal():
            yield Label(self.pair_name, classes="pair-label")

            yield Switch(
                value=self.pair_modes.paper,
                id=f"paper-{self.pair_name}",
                classes="paper-switch"
            )

            yield Switch(
                value=self.pair_modes.live,
                id=f"live-{self.pair_name}",
                classes="live-switch"
            )

    def on_switch_changed(self, event: Switch.Changed) -> None:
        """
        When a Switch is toggled, figure out if it's 'paper' or 'live',
        update the pair_modes, and notify the parent via PairRowToggle.
        """
        switch_id = event.switch.id
        if not switch_id:
            return

        if switch_id.startswith("paper-"):
            new_val = event.value
            self.pair_modes = PairModes(paper=new_val, live=self.pair_modes.live)
            self.post_message(PairRowToggle(self.pair_name, "paper", new_val))

        elif switch_id.startswith("live-"):
            new_val = event.value
            self.pair_modes = PairModes(paper=self.pair_modes.paper, live=new_val)
            self.post_message(PairRowToggle(self.pair_name, "live", new_val))


#
# ----------------------------------------------------------------------
# Main PairSelectionWidget
# ----------------------------------------------------------------------
#

class PairSelectionWidget(Widget):
    """
    Displays:
      - A "Save Selections" button at top-left,
      - "Selected Pairs: X" at top-right,
      - Checkboxes on the left to filter denominations,
      - A top row outside the pair container labeling "Paper" and "Live",
      - Scrollable list of PairRows on the right.
    Each pair row is ~25% taller than before (height=3.125).
    """

    class PairsSelected(Message):
        """Emitted when 'Save Selections' is pressed, carrying pair_trading_modes."""
        def __init__(self, pairs: Dict[str, Dict[str, bool]]) -> None:
            self.pairs = pairs
            super().__init__()

    # >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    # REPLACED DEFAULT_CSS with the new grid-based snippet:
    # >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    DEFAULT_CSS = """
    PairSelectionWidget {
        padding: 1;
        height: 100%;  /* Fill parent height */
        layout: grid;
        grid-rows: auto auto 1fr;  /* Title, top bar, and list area */
    }

    .screen-title {
        margin-bottom: 1;
    }

    /* Top bar with button on left, selected pairs count on right */
    .top-bar {
        width: 100%;
        height: auto;
        padding: 0 1;
        column-gap: 4;
    }

    /* The row that holds the checkboxes on the left and pairs area on right */
    .list-area {
        width: 100%;
        height: 100%;  /* Fill remaining space */
        layout: horizontal;  /* Side-by-side layout */
    }

    /* Left side with denomination checkboxes */
    .list-area > Vertical {
        width: auto;
        height: 100%;
    }

    /* Checkbox container and rows */
    #checkbox-container {
        width: auto;
        min-width: 24; /* Ensure enough width for 3 checkboxes */
        padding: 1;
    }

    .checkbox-row {
        height: auto;
        width: 100%;
        align-horizontal: left;
        padding: 0 1;
        margin-bottom: 1;
    }

    /* Individual checkbox styling */
    .filter-checkbox {
        width: 7;  /* Fixed width for each checkbox */
        margin-right: 1;
        padding: 0;
    }

    /* Container for the pairs label row + the actual pairs */
    #pairs-outer-container {
        width: 1fr;  /* Take remaining width */
        height: 100%;  /* Full height */
        border: solid $primary;
        layout: grid;
        grid-rows: auto 1fr;  /* Header row and pairs container */
        overflow: hidden;  /* Let inner container handle scroll */
    }

    /* A horizontal row labeling Paper / Live columns */
    .column-labels {
        width: 100%;
        height: auto;
        padding: 0 1;
    }

    /* The actual container for PairRow widgets */
    #pairs-container {
        height: 100%;  /* Fill remaining space */
        overflow-y: auto;  /* Scroll only the pairs */
    }

    /* Increase pair row height by 25% from 2.5 => 3.125 */
    PairRow {
        height: 3.125;
        width: 100%;
        border-bottom: solid $boost;
        margin: 0;
        padding: 0 1;
    }

    /* Label for the pair name */
    .pair-label {
        width: 12;
        text-align: right;
        padding-right: 1;
    }

    /* Switch styling */
    .paper-switch,
    .live-switch {
        margin-left: 2;
    }

    /* Paper/Live column labels */
    .paper-column-label {
        width: 14; 
        text-align: center;
    }
    .live-column-label {
        width: 14;
        text-align: center;
        margin-left: 2;
    }
    """
    # >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

    # Reactive fields
    selected_pairs_count: int = reactive(0)

    # Denomination filters
    show_usd: bool = reactive(True)  # <--- default True so we see pairs from the start
    show_gbp: bool = reactive(False)
    show_jpy: bool = reactive(False)
    show_eur: bool = reactive(False)
    show_xbt: bool = reactive(False)

    # Where we store paper/live toggles
    pair_trading_modes: Dict[str, Dict[str, bool]]

    # DB / Cache settings
    CACHE_FILE = "cached_pairs.json"
    BACKUP_FILE = "cached_pairs.bak"
    CACHE_DURATION_DAYS = 7
    DB_DIR = "data"
    DB_FILE = "data/trading_pairs.db"

    def __init__(
        self,
        kraken_api: Union[object, List[str]],
        pair_trading_modes: Optional[Dict[str, Dict[str, bool]]] = None
    ):
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.kraken_api = kraken_api
        self.pair_trading_modes = pair_trading_modes or {}

        # Ensure DB directory
        if not os.path.exists(self.DB_DIR):
            os.makedirs(self.DB_DIR, exist_ok=True)

        # DB initialization
        self._setup_db()
        self._load_modes_from_db()

        # The list of all pairs
        self._pairs: List[str] = []
        # References to each PairRow widget
        self._pair_rows: Dict[str, PairRow] = {}

    def compose(self) -> ComposeResult:
        """
        Layout:
          1) "Select Trading Pairs" title
          2) Horizontal top-bar => Save button (left), "Selected Pairs: X" (right)
          3) Horizontal list-area => 
               - left column of checkboxes
               - right side is #pairs-outer-container:
                    -> row of column labels ("Paper" and "Live")
                    -> #pairs-container for all PairRows
        """
        yield Static("[b]Select Trading Pairs[/b]\n", classes="screen-title")

        # Top bar (button on left, label on right)
        with Horizontal(classes="top-bar"):
            self.save_button = Button("Save Selections", variant="success")
            yield self.save_button

            self.summary_label = Static("Selected Pairs: 0")
            yield self.summary_label

        # list-area: checkboxes on left, pairs on right
        with Horizontal(classes="list-area"):
            with Vertical(id="checkbox-container"):
                # Denomination checkboxes.
                with Horizontal(classes="checkbox-row"):
                    yield Checkbox(
                        label="USD",
                        value=True,
                        id="filter-usd",
                        classes="filter-checkbox"
                    )
                    yield Checkbox(
                        label="GBP",
                        value=False,
                        id="filter-gbp",
                        classes="filter-checkbox"
                    )
                    yield Checkbox(
                        label="JPY",
                        value=False,
                        id="filter-jpy",
                        classes="filter-checkbox"
                    )

                with Horizontal(classes="checkbox-row"):
                    yield Checkbox(
                        label="EUR",
                        value=False,
                        id="filter-eur",
                        classes="filter-checkbox"
                    )
                    yield Checkbox(
                        label="XBT",
                        value=False,
                        id="filter-xbt",
                        classes="filter-checkbox"
                    )

            with Vertical(id="pairs-outer-container"):
                # 1) A small horizontal row labeling "Paper" & "Live" columns
                with Horizontal(classes="column-labels"):
                    yield Static("Paper", classes="paper-column-label")
                    yield Static("Live", classes="live-column-label")

                # 2) The actual container for PairRows
                yield Vertical(id="pairs-container")

    async def on_mount(self) -> None:
        """Called once the widget is on screen. Load & display pairs."""
        try:
            self._pairs = self._get_pairs_with_weekly_cache()
            self._render_all_pairs()
            self.selected_pairs_count = self._count_selected_pairs()
            self.summary_label.update(f"Selected Pairs: {self.selected_pairs_count}")
        except Exception as e:
            self.logger.error(f"Error in on_mount: {e}", exc_info=True)

    # -----------------------
    #  Checkbox Logic
    # -----------------------
    def on_checkbox_changed(self, event: Checkbox.Changed) -> None:
        """
        Update the relevant show_* bool when a checkbox toggles,
        then re-render the pairs.
        """
        cb_id = event.checkbox.id
        val = event.value

        if cb_id == "filter-usd":
            self.show_usd = val
        elif cb_id == "filter-gbp":
            self.show_gbp = val
        elif cb_id == "filter-jpy":
            self.show_jpy = val
        elif cb_id == "filter-eur":
            self.show_eur = val
        elif cb_id == "filter-xbt":
            self.show_xbt = val

        self._render_all_pairs()

    def _get_selected_denoms(self) -> set[str]:
        """Collect all denominations that are checked."""
        selected = set()
        if self.show_usd:
            selected.add("USD")
        if self.show_gbp:
            selected.add("GBP")
        if self.show_jpy:
            selected.add("JPY")
        if self.show_eur:
            selected.add("EUR")
        if self.show_xbt:
            selected.add("XBT")
        return selected

    def _matches_denom(self, pair: str, denoms: set[str]) -> bool:
        """
        Return True if 'pair' contains at least one denomination
        from the 'denoms' set (case-insensitive).
        """
        up = pair.upper()
        return any(d in up for d in denoms)

    # -----------------------
    #  Pair Rows
    # -----------------------
    def on_button_pressed(self, event: Button.Pressed) -> None:
        """If user clicks 'Save Selections', persist to DB & post message."""
        if event.button is self.save_button:
            self.save_pair_selections()

    def on_pair_row_toggle(self, event: PairRowToggle) -> None:
        """Respond to toggles in PairRow (paper/live)."""
        pair = event.pair_name
        mode_type = event.mode_type
        new_val = event.new_value

        if pair not in self.pair_trading_modes:
            self.pair_trading_modes[pair] = {"paper": True, "live": False}

        self.pair_trading_modes[pair][mode_type] = new_val

        self.selected_pairs_count = self._count_selected_pairs()
        self.summary_label.update(f"Selected Pairs: {self.selected_pairs_count}")

    def _render_all_pairs(self) -> None:
        """
        Clear #pairs-container, then show rows for pairs
        matching at least one selected denomination.
        """
        denoms = self._get_selected_denoms()

        container = self.query_one("#pairs-container", Vertical)
        for child in list(container.children):
            child.remove()

        self._pair_rows.clear()

        # By default we only show pairs that match at least one denom
        pairs_to_show = [p for p in self._pairs if self._matches_denom(p, denoms)]

        for pair in sorted(pairs_to_show):
            if pair not in self.pair_trading_modes:
                self.pair_trading_modes[pair] = {"paper": True, "live": False}

            row = PairRow(
                pair_name=pair,
                paper=self.pair_trading_modes[pair]["paper"],
                live=self.pair_trading_modes[pair]["live"]
            )
            self._pair_rows[pair] = row
            container.mount(row)

    def _count_selected_pairs(self) -> int:
        """Count how many pairs are toggled in either paper or live."""
        return sum(
            1 for modes in self.pair_trading_modes.values()
            if modes["paper"] or modes["live"]
        )

    def save_pair_selections(self) -> None:
        """Persist to DB and emit a PairsSelected event."""
        try:
            self._save_to_db()
            self.notify("Pair selections saved successfully!", severity="information")
            self.post_message(self.PairsSelected(self.pair_trading_modes))
        except Exception as e:
            self.logger.error(f"Error saving pair selections: {e}", exc_info=True)
            self.notify("Failed to save pair selections", severity="error")

    def refresh_pairs(self) -> None:
        """
        Optional: refresh logic to re-fetch pairs and re-render.
        """
        try:
            self._pairs = self._fetch_and_cache_pairs_from_kraken()
            self._render_all_pairs()
            self.selected_pairs_count = self._count_selected_pairs()
            self.summary_label.update(f"Selected Pairs: {self.selected_pairs_count}")
            self.notify("Pairs refreshed successfully", severity="information")
        except Exception as e:
            self.logger.error(f"Error refreshing pairs: {e}", exc_info=True)
            self.notify("Failed to refresh pairs", severity="error")

    # --------------------------
    #  Database / Cache Helpers
    # --------------------------
    def _get_pairs_with_weekly_cache(self) -> List[str]:
        pairs = self._load_cached_pairs()
        if pairs is not None and not self._is_cache_outdated(self.CACHE_FILE, self.CACHE_DURATION_DAYS):
            return self._filter_pairs(pairs)
        return self._fetch_and_cache_pairs_from_kraken()

    def _filter_pairs(self, pairs: List[str]) -> List[str]:
        """Optionally filter or normalize pairs here."""
        return pairs

    def _is_cache_outdated(self, file_path: str, max_age_days: int) -> bool:
        if not os.path.exists(file_path):
            return True
        file_mod_time = datetime.fromtimestamp(os.path.getmtime(file_path))
        return (datetime.now() - file_mod_time) > timedelta(days=max_age_days)

    def _load_cached_pairs(self) -> Union[List[str], None]:
        if not os.path.exists(self.CACHE_FILE):
            return None
        try:
            with open(self.CACHE_FILE, "r") as f:
                data = json.load(f)
                return data["pairs"] if isinstance(data, dict) else data
        except Exception as e:
            self.logger.error(f"Failed to load cached pairs: {e}", exc_info=True)
            return None

    def _fetch_and_cache_pairs_from_kraken(self) -> List[str]:
        try:
            if isinstance(self.kraken_api, list):
                pairs = self.kraken_api
            else:
                # e.g., pairs = self.kraken_api.get_tradable_pairs()
                pairs = [
                    "BTCUSD", "ETHUSD", "DOGEUSD", "AAVEXBT",
                    "XBTUSD", "XBTUSDT", "GBPUSD", "EURXBT", "JPYXBT"
                ]
            pairs = self._filter_pairs(pairs)
            self._write_cache_file(pairs)
            return pairs
        except Exception as e:
            self.logger.error(f"Error fetching pairs from Kraken: {e}", exc_info=True)
            return []

    def _write_cache_file(self, pairs: List[str]) -> None:
        if os.path.exists(self.CACHE_FILE):
            try:
                os.replace(self.CACHE_FILE, self.BACKUP_FILE)
            except Exception as e:
                self.logger.error(f"Failed to backup cache: {e}", exc_info=True)
        try:
            with open(self.CACHE_FILE, "w") as f:
                json.dump({"pairs": pairs}, f, indent=2)
        except Exception as e:
            self.logger.error(f"Failed to write cache: {e}", exc_info=True)

    def _setup_db(self) -> None:
        try:
            with sqlite3.connect(self.DB_FILE) as conn:
                conn.execute("""
                    CREATE TABLE IF NOT EXISTS pair_modes (
                        pair TEXT PRIMARY KEY,
                        paper INTEGER NOT NULL DEFAULT 1,
                        live INTEGER NOT NULL DEFAULT 0
                    );
                """)
        except Exception as e:
            self.logger.error(f"Database setup error: {e}", exc_info=True)
            raise

    def _save_to_db(self) -> None:
        """Save pair_trading_modes to SQLite."""
        try:
            with sqlite3.connect(self.DB_FILE) as conn:
                for pair, modes in self.pair_trading_modes.items():
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO pair_modes (pair, paper, live)
                        VALUES (?, ?, ?)
                        """,
                        (pair, int(modes["paper"]), int(modes["live"]))
                    )
        except Exception as e:
            self.logger.error(f"Database save error: {e}", exc_info=True)
            raise

    def _load_modes_from_db(self) -> None:
        """Load pair modes from DB."""
        try:
            with sqlite3.connect(self.DB_FILE) as conn:
                cursor = conn.execute("SELECT pair, paper, live FROM pair_modes")
                rows = cursor.fetchall()
                if not rows:
                    return
                for pair, paper, live in rows:
                    self.pair_trading_modes[pair] = {
                        "paper": bool(paper),
                        "live": bool(live)
                    }
        except Exception as e:
            self.logger.error(f"Database load error: {e}", exc_info=True)
            raise


#
# ---------------------------------------------
# Minimal test harness if running this file directly
# ---------------------------------------------
#

class TestApp(App):
    """
    A simple Textual app that runs our PairSelectionWidget in isolation.
    """

    CSS = """
    Screen {
        background: #1a1a1a;
    }
    """

    def compose(self) -> ComposeResult:
        # Provide a mock list of pairs
        mock_pairs = [
            "1INCHUSD", "AAVEUSD", "AAVEXBT",
            "ACAUSD", "ACHUSD", "ADAUSD",
            "ADAUSDC", "ADAUSDT", "ADAXBT",
            "ADXUSD", "AEV0USD"
        ]
        yield PairSelectionWidget(mock_pairs)

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        app = TestApp()
        app.run()
    else:
        print("Run with '--test' to start the Textual app.")
