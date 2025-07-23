import aiosqlite
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional


class DBManager:
    """
    An asynchronous SQLite database manager for storing and retrieving
    trades, equity curves, positions, metrics, balances, and other data
    needed by PortfolioManager.
    """

    def __init__(self, db_path: str):
        """
        :param db_path: Filesystem path to your SQLite database file.
        """
        self.db_path = db_path
        self.conn: aiosqlite.Connection = None

    async def connect(self):
        """
        Open an async connection to the database and initialize tables if needed.
        Call this once at application startup.
        """
        logging.info(f"Connecting to the database at {self.db_path}")
        self.conn = await aiosqlite.connect(self.db_path)
        await self.initialize_tables()

    async def initialize_tables(self):
        """
        Create the necessary tables if they don't already exist.
        Adjust the schemas to match your actual application needs.
        """
        schema = """
        -- Closed trades table
        CREATE TABLE IF NOT EXISTS closed_trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pair TEXT NOT NULL,
            side TEXT NOT NULL,
            pnl REAL NOT NULL,
            exit_time TEXT NOT NULL
        );

        -- Equity curve table
        CREATE TABLE IF NOT EXISTS equity_curve (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            equity REAL NOT NULL
        );

        -- Positions table (for open positions)
        CREATE TABLE IF NOT EXISTS positions (
            position_id TEXT PRIMARY KEY,
            pair TEXT NOT NULL,
            side TEXT NOT NULL,               -- 'buy' or 'sell'
            entry_price REAL NOT NULL,
            current_price REAL NOT NULL,
            volume REAL NOT NULL,
            pnl REAL NOT NULL,
            unrealized_pnl REAL NOT NULL,
            margin_used REAL NOT NULL,
            leverage INTEGER NOT NULL,
            entry_time TEXT NOT NULL,
            last_update TEXT NOT NULL,
            is_open INTEGER NOT NULL DEFAULT 1
        );

        -- Metrics table
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            total_equity REAL NOT NULL,
            used_margin REAL NOT NULL,
            available_margin REAL NOT NULL,
            margin_level REAL NOT NULL,
            unrealized_pnl REAL NOT NULL,
            realized_pnl REAL NOT NULL,
            daily_pnl REAL NOT NULL,
            total_exposure REAL NOT NULL,
            position_count INTEGER NOT NULL,
            win_rate REAL NOT NULL,
            sharpe_ratio REAL NOT NULL,
            max_drawdown REAL NOT NULL
        );

        -- Balances table
        CREATE TABLE IF NOT EXISTS balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            asset TEXT NOT NULL,
            amount REAL NOT NULL
        );
        """
        await self.conn.executescript(schema)
        await self.conn.commit()
        logging.info("Database tables initialized (if not existing).")

    async def get_open_positions(self) -> List[Dict[str, Any]]:
        """
        Fetch open positions from the 'positions' table where is_open = 1.

        :return: List of dictionaries representing open positions.
        """
        query = """
            SELECT
                position_id,
                pair,
                side,
                entry_price,
                current_price,
                volume,
                pnl,
                unrealized_pnl,
                margin_used,
                leverage,
                entry_time,
                last_update
            FROM positions
            WHERE is_open = 1
        """

        positions = []
        async with self.conn.execute(query) as cursor:
            async for row in cursor:
                (
                    position_id,
                    pair,
                    side,
                    entry_price,
                    current_price,
                    volume,
                    pnl,
                    unrealized_pnl,
                    margin_used,
                    leverage,
                    entry_time,
                    last_update
                ) = row

                positions.append({
                    'position_id': position_id,
                    'pair': pair,
                    'side': side,
                    'entry_price': entry_price,
                    'current_price': current_price,
                    'volume': volume,
                    'pnl': pnl,
                    'unrealized_pnl': unrealized_pnl,
                    'margin_used': margin_used,
                    'leverage': leverage,
                    'entry_time': entry_time,
                    'last_update': last_update
                })

        return positions

    async def get_last_metrics(self) -> Optional[Dict[str, Any]]:
        """
        Fetch the most recent metrics snapshot from the 'metrics' table.
        
        :return: A dictionary of the last metrics fields if found, otherwise None.
        """
        query = """
            SELECT
                total_equity,
                used_margin,
                available_margin,
                margin_level,
                unrealized_pnl,
                realized_pnl,
                daily_pnl,
                total_exposure,
                position_count,
                win_rate,
                sharpe_ratio,
                max_drawdown
            FROM metrics
            ORDER BY created_at DESC
            LIMIT 1
        """

        async with self.conn.execute(query) as cursor:
            row = await cursor.fetchone()
            if row is not None:
                (
                    total_equity,
                    used_margin,
                    available_margin,
                    margin_level,
                    unrealized_pnl,
                    realized_pnl,
                    daily_pnl,
                    total_exposure,
                    position_count,
                    win_rate,
                    sharpe_ratio,
                    max_drawdown
                ) = row

                return {
                    'total_equity': total_equity,
                    'used_margin': used_margin,
                    'available_margin': available_margin,
                    'margin_level': margin_level,
                    'unrealized_pnl': unrealized_pnl,
                    'realized_pnl': realized_pnl,
                    'daily_pnl': daily_pnl,
                    'total_exposure': total_exposure,
                    'position_count': position_count,
                    'win_rate': win_rate,
                    'sharpe_ratio': sharpe_ratio,
                    'max_drawdown': max_drawdown
                }

        return None

    async def record_metrics(self, metrics: Dict[str, Any]):
        """
        Insert a new metrics snapshot into the 'metrics' table.
        
        :param metrics: A dictionary containing keys like 'total_equity',
                        'used_margin', 'available_margin', 'margin_level',
                        'unrealized_pnl', 'realized_pnl', 'daily_pnl',
                        'total_exposure', 'position_count', 'win_rate',
                        'sharpe_ratio', 'max_drawdown'.
        """
        query = """
            INSERT INTO metrics (
                created_at,
                total_equity,
                used_margin,
                available_margin,
                margin_level,
                unrealized_pnl,
                realized_pnl,
                daily_pnl,
                total_exposure,
                position_count,
                win_rate,
                sharpe_ratio,
                max_drawdown
            )
            VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
        """
        now_str = datetime.now().isoformat()
        logging.debug(f"Recording new metrics at {now_str}")

        values = (
            now_str,
            metrics.get('total_equity', 0.0),
            metrics.get('used_margin', 0.0),
            metrics.get('available_margin', 0.0),
            metrics.get('margin_level', 0.0),
            metrics.get('unrealized_pnl', 0.0),
            metrics.get('realized_pnl', 0.0),
            metrics.get('daily_pnl', 0.0),
            metrics.get('total_exposure', 0.0),
            metrics.get('position_count', 0),
            metrics.get('win_rate', 0.0),
            metrics.get('sharpe_ratio', 0.0),
            metrics.get('max_drawdown', 0.0)
        )

        await self.conn.execute(query, values)
        await self.conn.commit()

    async def get_closed_trades(self, start_date: datetime, end_date: datetime) -> List[Dict[str, Any]]:
        """
        Fetch closed trades between start_date and end_date, inclusive.

        :param start_date: Start of the date range
        :param end_date: End of the date range
        :return: List of trades, each as a dict with keys like 'pair', 'side', 'pnl', 'exit_time'
        """
        query = """
            SELECT pair, side, pnl, exit_time
            FROM closed_trades
            WHERE exit_time >= ? AND exit_time <= ?
            ORDER BY exit_time ASC
        """
        start_str = start_date.isoformat()
        end_str = end_date.isoformat()
        logging.debug(f"Querying closed trades from {start_str} to {end_str}")

        trades = []
        async with self.conn.execute(query, (start_str, end_str)) as cursor:
            async for row in cursor:
                pair, side, pnl, exit_time = row
                trades.append({
                    'pair': pair,
                    'side': side,
                    'pnl': pnl,
                    'exit_time': exit_time
                })
        return trades

    async def get_equity_curve(self, start_date: datetime, end_date: datetime):
        """
        Fetch equity curve data between start_date and end_date as a DataFrame-like object.
        By default, we return a pandas DataFrame if available.

        :param start_date: Start of the date range
        :param end_date: End of the date range
        :return: A pandas DataFrame with columns ['timestamp', 'equity']
                 or an empty DataFrame if no data is found.
        """
        import pandas as pd  # Imported here so it’s only required if you use it
        query = """
            SELECT timestamp, equity
            FROM equity_curve
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
        """
        start_str = start_date.isoformat()
        end_str = end_date.isoformat()
        logging.debug(f"Querying equity curve from {start_str} to {end_str}")

        rows = []
        async with self.conn.execute(query, (start_str, end_str)) as cursor:
            async for row in cursor:
                ts, eq = row
                rows.append((ts, eq))

        if not rows:
            return pd.DataFrame(columns=["timestamp", "equity"])

        df = pd.DataFrame(rows, columns=["timestamp", "equity"])
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        return df

    async def record_closed_trade(self, pair: str, side: str, pnl: float, exit_time: datetime):
        """
        Insert a new closed trade into the database.

        :param pair: e.g. 'BTC/USD'
        :param side: 'buy' or 'sell'
        :param pnl: Realized PnL for the trade
        :param exit_time: The datetime the trade was closed
        """
        query = """
            INSERT INTO closed_trades (pair, side, pnl, exit_time)
            VALUES (?, ?, ?, ?)
        """
        logging.debug(f"Recording closed trade: pair={pair}, side={side}, pnl={pnl}, exit_time={exit_time}")
        await self.conn.execute(query, (pair, side, pnl, exit_time.isoformat()))
        await self.conn.commit()

    async def record_equity_point(self, timestamp: datetime, equity: float):
        """
        Insert a new equity data point into the database.

        :param timestamp: When the equity measurement was taken
        :param equity: The equity value at that time
        """
        query = """
            INSERT INTO equity_curve (timestamp, equity)
            VALUES (?, ?)
        """
        logging.debug(f"Recording equity curve point: timestamp={timestamp}, equity={equity}")
        await self.conn.execute(query, (timestamp.isoformat(), equity))
        await self.conn.commit()

    #
    # ---------------------------------------------------------------------
    # NEW METHOD: save_balances
    # ---------------------------------------------------------------------
    #
    async def save_balances(self, balances: Dict[str, float]) -> None:
        """
        Insert balance records into the 'balances' table.
        Each asset-balance pair will be stored along with a timestamp.

        :param balances: Dictionary where keys = asset symbol, values = balance (float).
        """
        if not balances:
            logging.info("No balances to save (empty dictionary).")
            return

        now_str = datetime.utcnow().isoformat()

        insert_query = """
            INSERT INTO balances (timestamp, asset, amount)
            VALUES (?, ?, ?)
        """

        try:
            async with self.conn.cursor() as cursor:
                for asset, amount in balances.items():
                    logging.debug(f"Saving balance for {asset}: {amount}")
                    await cursor.execute(insert_query, (now_str, asset, amount))
            await self.conn.commit()
            logging.info("Balances saved successfully.")
        except Exception as e:
            logging.error(f"Error inserting balances: {e}", exc_info=True)
            raise

    async def close(self):
        """
        Close the database connection. Call this when the application is shutting down.
        """
        if self.conn:
            await self.conn.close()
            self.conn = None
            logging.info("Database connection closed.")
