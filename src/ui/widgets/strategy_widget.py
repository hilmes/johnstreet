from __future__ import annotations

import asyncio
import importlib.util
import hashlib
import json
import logging
import sqlite3
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from dataclasses import dataclass, asdict
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from threading import Lock, RLock
from typing import Any, Dict, Optional, Tuple, TypeVar
from weakref import WeakValueDictionary

from textual.app import ComposeResult
from textual.containers import Horizontal, Vertical
from textual.message import Message
from textual.reactive import reactive
from textual.screen import Screen
from textual.widget import Widget
from textual.widgets import (
    Button,
    Label,
    LoadingIndicator,
    Switch,
    Header,
    Footer
)

# ---- EnhancedKrakenAPI or other custom API imports ----
from src.api.enhanced_kraken import EnhancedKrakenAPI, initialize_components
# -------------------------------------------------------

from src.core.strategies import (
    TradingStrategy,
    StrategyManager as CoreStrategyManager
)

from src.ui.components import NavigationSidebar
from src.config import AppConfig

T = TypeVar("T", bound=TradingStrategy)
StrategyTuple = Tuple[str, Dict[str, Any], "StrategyPerformanceMetrics", "StrategyMode"]


@dataclass(frozen=True)
class StrategyPerformanceMetrics:
    """
    Stores numeric performance details for a trading strategy.
    """

    total_pnl: float = 0.0
    win_rate: float = 0.0
    trades_count: int = 0
    uploaded_at: Optional[float] = None
    version: str = ""

    @property
    def formatted_timestamp(self) -> str:
        if self.uploaded_at:
            return datetime.fromtimestamp(self.uploaded_at).strftime("%Y-%m-%d %H:%M")
        return "N/A"

    @property
    def pnl_display(self) -> str:
        color = "green" if self.total_pnl >= 0 else "red"
        return f"[{color}]${self.total_pnl:,.2f}[/{color}]"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class StrategyMode:
    """
    Represents the operational modes of a trading strategy.
    """
    paper: bool = True
    live: bool = False


class StrategyDatabase:
    """
    Manages operations on the SQLite DB where strategies are stored.
    """

    def __init__(self, db_path: str = "strategies.db") -> None:
        self.logger = logging.getLogger(__name__)
        self.db_path: str = db_path
        self._init_lock = RLock()
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(
            self.db_path,
            timeout=30.0,
            isolation_level=None  # Autocommit
        )
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
            conn.execute("PRAGMA cache_size=-64000")  # 64MB
            conn.execute("PRAGMA temp_store=MEMORY")
            yield conn
        finally:
            conn.close()

    def _init_db(self) -> None:
        with self._init_lock:
            with self._get_connection() as conn:
                conn.execute(
                    """
                    CREATE TABLE IF NOT EXISTS strategies (
                        name TEXT PRIMARY KEY,
                        code TEXT NOT NULL,
                        config TEXT,
                        version TEXT,
                        uploaded_at REAL,
                        total_pnl REAL DEFAULT 0.0,
                        win_rate REAL DEFAULT 0.0,
                        trades_count INTEGER DEFAULT 0,
                        paper_trading BOOLEAN DEFAULT 1,
                        live_trading BOOLEAN DEFAULT 0
                    )
                    """
                )
                conn.execute("CREATE INDEX IF NOT EXISTS idx_strategy_name ON strategies(name)")
                conn.execute("CREATE INDEX IF NOT EXISTS idx_strategy_version ON strategies(version)")
                conn.commit()

    async def save_strategy(
        self,
        name: str,
        code: str,
        config: Dict[str, Any],
        metrics: StrategyPerformanceMetrics,
        mode: StrategyMode
    ) -> None:
        def _save():
            with self._get_connection() as conn:
                conn.execute(
                    """
                    INSERT OR REPLACE INTO strategies
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        name,
                        code,
                        json.dumps(config),
                        metrics.version,
                        metrics.uploaded_at,
                        metrics.total_pnl,
                        metrics.win_rate,
                        metrics.trades_count,
                        mode.paper,
                        mode.live,
                    ),
                )
                conn.commit()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self._executor, _save)

    @lru_cache(maxsize=128)
    def load_strategies(self) -> Dict[str, StrategyTuple]:
        with self._get_connection() as conn:
            cursor = conn.execute("SELECT * FROM strategies")
            strategies: Dict[str, StrategyTuple] = {}

            for row in cursor:
                if not row["code"]:
                    continue
                try:
                    config = json.loads(row["config"]) if row["config"] else {}
                    metrics = StrategyPerformanceMetrics(
                        total_pnl=row["total_pnl"],
                        win_rate=row["win_rate"],
                        trades_count=row["trades_count"],
                        uploaded_at=row["uploaded_at"],
                        version=row["version"] or "",
                    )
                    mode = StrategyMode(
                        paper=bool(row["paper_trading"]),
                        live=bool(row["live_trading"]),
                    )
                    strategies[row["name"]] = (row["code"], config, metrics, mode)
                except (json.JSONDecodeError, TypeError) as e:
                    self.logger.error(f"Error decoding data for strategy {row['name']}: {e}")
                    continue

            return strategies

    def invalidate_cache(self) -> None:
        self.load_strategies.cache_clear()

    async def delete_strategy(self, name: str) -> None:
        def _delete():
            with self._get_connection() as conn:
                conn.execute("DELETE FROM strategies WHERE name = ?", (name,))
                conn.commit()

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(self._executor, _delete)
        self.invalidate_cache()


class StrategyCache:
    """
    A thread-safe cache that associates strategy instances with their version.
    """

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        self._cache: Dict[str, Tuple[str, TradingStrategy]] = {}
        self._lock = Lock()

    def get(self, name: str, version: str) -> Optional[TradingStrategy]:
        with self._lock:
            if name in self._cache:
                cached_version, instance = self._cache[name]
                if cached_version == version:
                    return instance
            return None

    def set(self, name: str, version: str, instance: TradingStrategy) -> None:
        with self._lock:
            self._cache[name] = (version, instance)

    def invalidate(self, name: str) -> None:
        with self._lock:
            self._cache.pop(name, None)


class AsyncStrategyLoader:
    def __init__(self, strategy_manager) -> None:
        self.strategy_manager = strategy_manager
        self.logger = logging.getLogger(__name__)
        self._executor = ThreadPoolExecutor(max_workers=4)
        self._cache = StrategyCache()
        self.components: Optional[Dict[str, EnhancedKrakenAPI]] = None

    def _initialize_components(self) -> None:
        if self.components is None:
            self.components = initialize_components(
                config=self.strategy_manager.config,
                test_mode=True
            )

    async def load_strategy(
        self,
        name: str,
        code: str,
        config: Dict[str, Any],
        version: str
    ) -> Optional[TradingStrategy]:
        cached_strategy = self._cache.get(name, version)
        if cached_strategy:
            return cached_strategy

        try:
            loop = asyncio.get_event_loop()
            strategy = await loop.run_in_executor(
                self._executor,
                self._load_strategy_sync,
                name,
                code,
                config
            )
            if strategy:
                self._cache.set(name, version, strategy)
            return strategy
        except Exception as e:
            self.logger.error(f"Error loading strategy {name}: {e}")
            return None

    def _load_strategy_sync(
        self,
        name: str,
        code: str,
        config: Dict[str, Any]
    ) -> Optional[TradingStrategy]:
        try:
            self._initialize_components()
            # Inject Kraken API into config, if present
            if self.components and "kraken_api" in self.components:
                config["kraken_api"] = self.components["kraken_api"]

            spec = importlib.util.spec_from_loader(name, loader=None)
            if not spec:
                raise ImportError(f"Could not create a module spec for {name}.")

            module = importlib.util.module_from_spec(spec)
            exec(code, module.__dict__)

            # Look for a TradingStrategy subclass
            strategy_class = next(
                (
                    obj for obj in module.__dict__.values()
                    if (
                        isinstance(obj, type)
                        and issubclass(obj, TradingStrategy)
                        and obj is not TradingStrategy
                    )
                ),
                None
            )
            if not strategy_class:
                raise ValueError(f"No TradingStrategy subclass found in {name}.")

            # Instantiate and return
            strategy_instance = strategy_class(config.get("pair", "BTC/USD"), config)
            return strategy_instance
        except Exception as e:
            self.logger.error(f"Error in _load_strategy_sync for {name}: {e}")
            return None


#
# ──────────────── Message Classes ────────────────
#

class StrategyRowToggle(Message):
    def __init__(self, strategy_name: str, mode_type: str, enabled: bool) -> None:
        super().__init__()
        self.strategy_name = strategy_name
        self.mode_type = mode_type
        self.enabled = enabled


class StrategyUpdated(Message):
    def __init__(self, strategy_name: str) -> None:
        super().__init__()
        self.strategy_name = strategy_name


#
# ──────────────── UI Components ────────────────
#

class StrategySummary(Widget):
    strategies_count: reactive[int] = reactive(0)
    total_pnl: reactive[float] = reactive(0.0)
    active_strategies: reactive[int] = reactive(0)

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("Strategy Overview", classes="summary-title")
            with Horizontal():
                yield Label("Total Strategies: 0", id="total-label")
                yield Label("Active: 0", id="active-label")
                yield Label("Total P&L: $0.00", id="pnl-label")
            yield Button("Refresh", id="summary-refresh-btn", variant="primary")

    def watch_strategies_count(self, old_val: int, new_val: int) -> None:
        label = self.query_one("#total-label", Label)
        label.update(f"Total Strategies: {new_val}")

    def watch_active_strategies(self, old_val: int, new_val: int) -> None:
        label = self.query_one("#active-label", Label)
        label.update(f"Active: {new_val}")

    def watch_total_pnl(self, old_val: float, new_val: float) -> None:
        label = self.query_one("#pnl-label", Label)
        color = "green" if new_val >= 0 else "red"
        label.update(f"Total P&L: [{color}]${new_val:,.2f}[/{color}]")

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "summary-refresh-btn":
            asyncio.create_task(self.parent.refresh_strategies())


class StrategyRow(Widget):
    def __init__(
        self,
        strategy_name: str,
        metrics: StrategyPerformanceMetrics,
        mode: StrategyMode,
        error_state: Optional[str] = None
    ) -> None:
        super().__init__()
        self.strategy_name = strategy_name
        self._metrics = metrics
        self._mode = mode
        self._error_state = error_state
        self._labels: Dict[str, Label] = {}

    def compose(self) -> ComposeResult:
        with Horizontal():
            with Horizontal(classes="stat-container"):
                yield Label("Name: ", classes="stat-label")
                self._labels["name"] = Label(self.strategy_name, classes="stat-value")
                yield self._labels["name"]

            with Horizontal(classes="stat-container"):
                yield Label("Version: ", classes="stat-label")
                version_label = Label(self._metrics.version[:8], classes="stat-value")
                self._labels["version"] = version_label
                yield version_label

            with Horizontal(classes="stat-container"):
                yield Label("Updated: ", classes="stat-label")
                timestamp_label = Label(self._metrics.formatted_timestamp, classes="stat-value")
                self._labels["timestamp"] = timestamp_label
                yield timestamp_label

            with Horizontal(classes="stat-container"):
                yield Label("P&L: ", classes="stat-label")
                pnl_text = (
                    self._metrics.pnl_display
                    if not self._error_state
                    else f"[red]{self._error_state}[/red]"
                )
                pnl_label = Label(pnl_text, classes="stat-value")
                self._labels["pnl"] = pnl_label
                yield pnl_label

            with Horizontal(classes="stat-container"):
                yield Label("Win Rate: ", classes="stat-label")
                winrate_text = (
                    f"{self._metrics.win_rate:.1%}"
                    if not self._error_state else "-"
                )
                winrate_label = Label(winrate_text, classes="stat-value")
                self._labels["winrate"] = winrate_label
                yield winrate_label

            with Horizontal(classes="stat-container"):
                yield Label("Paper: ", classes="stat-label")
                yield Switch(
                    value=self._mode.paper,
                    id=f"paper-{self.strategy_name}",
                    disabled=bool(self._error_state),
                    classes="paper-switch"
                )

            with Horizontal(classes="stat-container"):
                yield Label("Live: ", classes="stat-label")
                yield Switch(
                    value=self._mode.live,
                    id=f"live-{self.strategy_name}",
                    disabled=bool(self._error_state),
                    classes="live-switch"
                )

    def update_metrics(self, metrics: StrategyPerformanceMetrics) -> None:
        self._metrics = metrics
        updates: Dict[str, str] = {
            "version": metrics.version[:8],
            "timestamp": metrics.formatted_timestamp,
            "pnl": (
                metrics.pnl_display
                if not self._error_state
                else f"[red]{self._error_state}[/red]"
            ),
            "winrate": (
                f"{metrics.win_rate:.1%}"
                if not self._error_state else "-"
            )
        }
        for key, val in updates.items():
            label = self._labels.get(key)
            if label:
                label.update(val)

    def on_switch_changed(self, event: Switch.Changed) -> None:
        switch_id = event.switch.id
        if not switch_id or "-" not in switch_id:
            return
        mode_type, name_part = switch_id.split("-", 1)
        if name_part == self.strategy_name:
            self.post_message(StrategyRowToggle(self.strategy_name, mode_type, event.value))


class StrategyRowsPanel(Widget):
    def __init__(self, manager: StrategyManager) -> None:
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.manager = manager
        self._rows: Dict[str, StrategyRow] = {}
        self._layout_lock = Lock()

    def compose(self) -> ComposeResult:
        with Horizontal():
            yield Label("Strategies", classes="screen-title")
            yield Button("Refresh", id="panel-refresh-btn", variant="primary")
        yield Vertical(id="strategy-rows-container")

    async def refresh_rows(self) -> None:
        async with asyncio.Lock():
            container = self.query_one("#strategy-rows-container", Vertical)
            stored_strategies = self.manager.strategy_db.load_strategies()
            processed_strategies = set()

            for name, (code, config, metrics, mode) in stored_strategies.items():
                processed_strategies.add(name)
                error_state = None
                if name not in self.manager.core_manager.strategies:
                    error_state = "Error loading strategy"

                if name in self._rows:
                    row = self._rows[name]
                    row.update_metrics(metrics)
                else:
                    row = StrategyRow(name, metrics, mode, error_state)
                    self._rows[name] = row
                    await container.mount(row)

            for name in list(self._rows.keys()):
                if name not in processed_strategies:
                    await self._rows[name].remove()
                    del self._rows[name]

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "panel-refresh-btn":
            asyncio.create_task(self.manager.refresh_strategies())

    def on_strategy_row_toggle(self, event: StrategyRowToggle) -> None:
        try:
            asyncio.create_task(
                self.manager.toggle_strategy_mode(
                    event.strategy_name,
                    event.mode_type,
                    event.enabled
                )
            )
        except Exception as e:
            self.logger.error(f"Error toggling {event.mode_type} for {event.strategy_name}: {e}")
            asyncio.create_task(self.refresh_rows())


class StrategyManager(Widget):
    DEFAULT_CSS = """
    StrategyManager {
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

    Horizontal {
        height: auto;
        align: left middle;
        margin: 0;
    }

    .summary-title {
        text-style: bold;
        color: $text;
        padding: 1;
    }

    Switch {
        margin: 0 1;
    }

    Button {
        margin: 0 1;
    }

    #strategy-rows-container {
        border: heavy $accent;
        padding: 0;
    }

    .stat-container {
        min-width: 15;
        max-width: 20;
        height: 100%;
        padding: 0 1;
        align: left middle;
        border-right: solid $primary-background;
    }

    .stat-label {
        width: auto;
        color: $text-muted;
        text-style: bold;
        height: 100%;
        content-align: left middle;
    }

    .stat-value {
        text-align: right;
        padding-left: 1;
        height: 100%;
        content-align: right middle;
    }

    StrategyRow {
        padding: 0 1;
        height: 7;
        width: 100%;
        border-bottom: solid $primary-background;
        transition: background 150ms linear;
    }

    StrategyRow > Horizontal {
        width: 100%;
        height: 100%;
        padding: 1 0;
    }

    StrategyRow:hover {
        background: $boost;
    }

    .stat-container .paper-switch,
    .stat-container .live-switch {
        margin: 1 0;
        height: 3;
    }
    """

    def __init__(
        self,
        config: AppConfig,
        strategies: Dict[str, Any],
        db: Any,
        portfolio_manager: Any,
        strategies_dir: str = "strategies"
    ) -> None:
        super().__init__()
        self.logger = logging.getLogger(__name__)

        self.config = config
        self.strategies = strategies
        self.db = db
        self.portfolio_manager = portfolio_manager

        self.strategies_dir = Path(strategies_dir) if strategies_dir else Path("src/strategies")
        self.strategies_dir.mkdir(parents=True, exist_ok=True)

        # Our *core* manager from core.strategies
        self.core_manager: CoreStrategyManager = CoreStrategyManager(
            strategies={},
            db=db,
            portfolio_manager=portfolio_manager
        )

        self.strategy_db: StrategyDatabase = StrategyDatabase()
        self.strategy_modes: Dict[str, StrategyMode] = {}
        self.performance_data: Dict[str, StrategyPerformanceMetrics] = {}
        self.strategy_cache: WeakValueDictionary = WeakValueDictionary()
        self.loader = AsyncStrategyLoader(self)
        self._setup_file_watchers()

    def compose(self) -> ComposeResult:
        with Vertical():
            yield Label("Strategy Manager", classes="screen-title")

            self.loading_indicator = LoadingIndicator()
            self.loading_indicator.display = False
            yield self.loading_indicator

            self.panel = StrategyRowsPanel(self)
            yield self.panel

            self.summary = StrategySummary()
            yield self.summary

    def _setup_file_watchers(self) -> None:
        try:
            from watchdog.observers import Observer
            from watchdog.events import FileSystemEventHandler

            class StrategyFileHandler(FileSystemEventHandler):
                def __init__(self, manager: StrategyManager) -> None:
                    self.manager = manager

                def on_modified(self, event) -> None:
                    if event.src_path.endswith(".py"):
                        asyncio.create_task(self.manager.refresh_strategies())

                def on_created(self, event) -> None:
                    if event.src_path.endswith(".py"):
                        asyncio.create_task(self.manager.refresh_strategies())

                def on_deleted(self, event) -> None:
                    if event.src_path.endswith(".py"):
                        strategy_name = Path(event.src_path).stem
                        asyncio.create_task(self.manager.delete_strategy(strategy_name))

            observer = Observer()
            observer.schedule(
                StrategyFileHandler(self),
                str(self.strategies_dir),
                recursive=False
            )
            observer.start()
        except ImportError:
            self.logger.warning("watchdog not installed. File watching is disabled.")

    @lru_cache(maxsize=1024)
    def _calculate_file_hash(self, filepath: str) -> str:
        try:
            return hashlib.sha256(Path(filepath).read_bytes()).hexdigest()
        except Exception as e:
            self.logger.error(f"Error calculating hash for {filepath}: {e}")
            return str(datetime.now().timestamp())

    async def refresh_strategies(self) -> None:
        try:
            files = list(self.strategies_dir.glob("*.py"))
            tasks = [self._process_strategy_file(f) for f in files]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            count = sum(1 for r in results if r and not isinstance(r, Exception))
            if hasattr(self, "summary"):
                self.summary.strategies_count = count
                active_count = sum(
                    1
                    for mode in self.strategy_modes.values()
                    if mode.paper or mode.live
                )
                self.summary.active_strategies = active_count
                self.summary.total_pnl = sum(m.total_pnl for m in self.performance_data.values())

            self.strategy_db.invalidate_cache()
            self._calculate_file_hash.cache_clear()
            await self.panel.refresh_rows()
        except Exception as e:
            self.logger.error(f"Error refreshing strategies: {e}")
            raise

    async def _process_strategy_file(self, filepath: Path) -> bool:
        strategy_name = filepath.stem
        try:
            loop = asyncio.get_event_loop()
            code = await loop.run_in_executor(None, filepath.read_text)
        except Exception as e:
            self.logger.error(f"Error reading file {filepath}: {e}")
            return False

        file_hash = self._calculate_file_hash(str(filepath))
        metrics = self.performance_data.get(
            strategy_name,
            StrategyPerformanceMetrics(
                version=file_hash[:8],
                uploaded_at=filepath.stat().st_mtime
            )
        )
        mode = self.strategy_modes.get(strategy_name, StrategyMode())

        await self.strategy_db.save_strategy(
            name=strategy_name,
            code=code,
            config={"pair": "BTC/USD"},
            metrics=metrics,
            mode=mode
        )

        try:
            config_for_loader = {"pair": "BTC/USD"}
            strategy_instance = await self.loader.load_strategy(
                strategy_name,
                code,
                config_for_loader,
                file_hash
            )
            if strategy_instance:
                pair = config_for_loader.get("pair", "BTC/USD")
                # ↓↓↓ Option B: pass the *instance* directly
                self.core_manager.add_strategy(strategy_name, strategy_instance)
                return True
        except Exception as e:
            self.logger.error(f"Error initializing strategy {strategy_name}: {e}")

        return False

    async def update_strategy_config(
        self,
        strategy_name: str,
        new_config: Dict[str, Any]
    ) -> None:
        if strategy_name not in self.core_manager.strategies:
            raise ValueError(f"Strategy {strategy_name} not found in core_manager.")

        stored = self.strategy_db.load_strategies()
        if strategy_name not in stored:
            raise ValueError(f"Strategy {strategy_name} not found in DB.")

        code, _, metrics, mode = stored[strategy_name]
        await self.strategy_db.save_strategy(
            strategy_name,
            code,
            new_config,
            metrics,
            mode
        )

        # Reload as a fresh instance
        strategy_instance = await self.loader.load_strategy(
            strategy_name,
            code,
            new_config,
            metrics.version
        )
        if strategy_instance:
            pair = new_config.get("pair", "BTC/USD")
            # Remove the extra arguments
            self.core_manager.add_strategy(name, strategy_instance)



    async def toggle_strategy_mode(
        self,
        strategy_name: str,
        mode_type: str,
        enabled: bool
    ) -> None:
        if strategy_name not in self.strategy_modes:
            raise ValueError(f"No such strategy: {strategy_name}")

        old_mode = self.strategy_modes[strategy_name]
        new_mode = StrategyMode(
            paper=(enabled if mode_type == "paper" else old_mode.paper),
            live=(enabled if mode_type == "live" else old_mode.live),
        )
        self.strategy_modes[strategy_name] = new_mode

        stored = self.strategy_db.load_strategies()
        if strategy_name in stored:
            code, config, metrics, _ = stored[strategy_name]
            await self.strategy_db.save_strategy(
                name=strategy_name,
                code=code,
                config=config,
                metrics=metrics,
                mode=new_mode
            )

    async def delete_strategy(self, strategy_name: str) -> None:
        self.core_manager.remove_strategy(strategy_name)
        self.strategy_modes.pop(strategy_name, None)
        self.performance_data.pop(strategy_name, None)
        self.strategy_cache.pop(strategy_name, None)
        self.loader._cache.invalidate(strategy_name)
        await self.strategy_db.delete_strategy(strategy_name)
        await self.panel.refresh_rows()

    async def on_mount(self) -> None:
        await self._load_from_database()
        await self.refresh_strategies()

    async def _load_from_database(self) -> None:
        stored = self.strategy_db.load_strategies()
        for name, (code, config, metrics, mode) in stored.items():
            self.strategy_modes[name] = mode
            self.performance_data[name] = metrics

            strategy_instance = await self.loader.load_strategy(name, code, config, metrics.version)
            if strategy_instance:
                pair = config.get("pair", "BTC/USD")
                # Again, pass the instance to core_manager
                # Remove the extra arguments
                self.core_manager.add_strategy(name, strategy_instance)


    def on_strategy_updated(self, event: StrategyUpdated) -> None:
        asyncio.create_task(self.refresh_strategies())


#
# ───────────────────────────────────────────────────
#  Finally, the StrategiesScreen
# ───────────────────────────────────────────────────
#

class StrategiesScreen(Screen):
    loading: bool = reactive(False, layout=True)

    def __init__(
        self,
        config: AppConfig,
        strategies: Dict[str, Any],
        db: Any,
        portfolio_manager: Any,
        strategies_dir: str = "strategies",
    ) -> None:
        super().__init__()
        self.logger = logging.getLogger(__name__)
        self.config = config
        self.strategies_data = strategies
        self.db = db
        self.portfolio_manager = portfolio_manager
        self.strategies_dir = strategies_dir
        self.strategy_manager: Optional[StrategyManager] = None

    def compose(self) -> ComposeResult:
        yield Header()
        with Horizontal():
            yield self._create_navigation_sidebar()
            yield self._create_main_content()
        yield Footer()

    def _create_navigation_sidebar(self) -> NavigationSidebar:
        return NavigationSidebar()

    def _create_main_content(self) -> Vertical:
        container = Vertical(id="main-content")
        self.strategy_manager = StrategyManager(
            config=self.config,
            strategies=self.strategies_data,
            db=self.db,
            portfolio_manager=self.portfolio_manager,
            strategies_dir=self.strategies_dir
        )
        container.add(self.strategy_manager)
        return container

    async def on_mount(self) -> None:
        self.logger.debug("StrategiesScreen mounted.")
        self.call_after_refresh(self._deferred_initial_load)

    async def _deferred_initial_load(self) -> None:
        self.loading = True
        try:
            pass
        finally:
            self.loading = False

    def on_button_pressed(self, event: Button.Pressed) -> None:
        button_id = event.button.id
        if not button_id:
            return

        actions = {
            "nav-home": self.app.pop_screen,
            "nav-settings": self.app.pop_screen,
        }
        if button_id in actions:
            actions[button_id]()
        else:
            self.logger.debug(f"Button '{button_id}' pressed on StrategiesScreen.")

    def watch_loading(self, old_val: bool, new_val: bool) -> None:
        if new_val:
            self.logger.debug("StrategiesScreen is now loading...")
        else:
            self.logger.debug("StrategiesScreen loading finished.")
