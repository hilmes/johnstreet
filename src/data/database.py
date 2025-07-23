import os
import aiosqlite
import logging
import asyncio
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

class Database:
    """Async SQLite database handler for the trading application."""
    
    def __init__(self, db_path: str):
        """Initialize the database with the given path."""
        try:
            self.db_path = Path(db_path).resolve()
            self._conn: Optional[aiosqlite.Connection] = None
            self._initialized = False
            
            logging.info(f"Database initialized with path: {self.db_path}")
            logging.info(f"Database directory exists: {self.db_path.parent.exists()}")
            logging.info(f"Database directory is writable: {os.access(self.db_path.parent, os.W_OK)}")
            
            if not self.db_path.parent.exists():
                logging.warning(f"Database directory does not exist: {self.db_path.parent}")
                self.db_path.parent.mkdir(parents=True, exist_ok=True)
                logging.info("Created database directory")
                
        except Exception as e:
            logging.error(f"Failed to initialize database object: {e}", exc_info=True)
            raise RuntimeError(f"Database initialization failed: {e}") from e

    @property
    def DB_PATH(self) -> str:
        """
        Provide a 'DB_PATH' property for backward compatibility.
        If external code calls config.DB_PATH (where config is actually this Database),
        it won't raise an AttributeError.
        """
        return str(self.db_path)

    async def connect(self) -> None:
        """Establish the database connection and initialize tables."""
        try:
            logging.info(f"Attempting to connect to database at {self.db_path}")
            
            self._conn = await asyncio.wait_for(
                aiosqlite.connect(str(self.db_path)),  # aiosqlite requires str path
                timeout=10.0
            )
            
            # Enable foreign keys and set pragmas for better performance
            async with self._conn.cursor() as cursor:
                await cursor.execute("PRAGMA foreign_keys = ON")
                await cursor.execute("PRAGMA journal_mode = WAL")
                await cursor.execute("PRAGMA synchronous = NORMAL")
            
            await self._initialize_tables()
            self._initialized = True
            logging.info("Database connection and initialization successful")
            
        except asyncio.TimeoutError:
            logging.error("Database connection timed out")
            raise RuntimeError("Database connection timed out") from None
        except aiosqlite.Error as e:
            logging.error(f"SQLite error while connecting to database: {e}", exc_info=True)
            raise RuntimeError(f"SQLite error: {e}") from e
        except Exception as e:
            logging.error(f"Failed to connect to database: {e}", exc_info=True)
            raise RuntimeError(f"Database connection failed: {e}") from e

    async def close(self) -> None:
        """Close the database connection."""
        if self._conn:
            try:
                await self._conn.close()
                self._conn = None
                self._initialized = False
                logging.info("Database connection closed successfully")
            except Exception as e:
                logging.error(f"Error closing database connection: {e}", exc_info=True)
                raise

    async def _ensure_column_exists(
        self,
        cursor: aiosqlite.Cursor,
        table_name: str,
        column_name: str,
        column_type: str
    ) -> None:
        """
        Check if a column exists in a given table; if not, add it.
        """
        await cursor.execute(f"PRAGMA table_info({table_name})")
        columns_info = await cursor.fetchall()
        existing_columns = [col[1] for col in columns_info]  # col[1] = column name
        if column_name not in existing_columns:
            logging.info(f"Column '{column_name}' not found in '{table_name}', adding it.")
            await cursor.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            )

    async def _initialize_tables(self) -> None:
        """Create necessary tables if they don't exist and handle migrations."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        create_trades_table = """
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            pair TEXT NOT NULL,
            side TEXT NOT NULL,
            price REAL NOT NULL,
            volume REAL NOT NULL,
            pnl REAL,
            strategy TEXT,
            metadata TEXT
        )
        """
        
        create_performance_table = """
        CREATE TABLE IF NOT EXISTS performance_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            metric_name TEXT NOT NULL,
            value REAL NOT NULL,
            period TEXT NOT NULL
        )
        """

        # NEW: balances table
        create_balances_table = """
        CREATE TABLE IF NOT EXISTS balances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME NOT NULL,
            asset TEXT NOT NULL,
            amount REAL NOT NULL
        )
        """

        try:
            async with self._conn.cursor() as cursor:
                # Create tables if they don't exist
                await cursor.execute(create_trades_table)
                await cursor.execute(create_performance_table)
                await cursor.execute(create_balances_table)
                
                # ---- MIGRATION STEP for older DB files ----
                # Ensure the 'metadata' column exists in the 'trades' table
                await self._ensure_column_exists(cursor, "trades", "metadata", "TEXT")
                
                await self._conn.commit()
            logging.info("Database tables initialized successfully")
        except Exception as e:
            logging.error(f"Failed to initialize database tables: {e}", exc_info=True)
            raise

    async def get_trades(self, since: datetime) -> List[Dict[str, Any]]:
        """Retrieve trades since the given datetime."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        query = """
        SELECT timestamp, pair, side, price, volume, pnl, strategy, metadata
        FROM trades
        WHERE timestamp >= ?
        ORDER BY timestamp DESC
        """
        
        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute(query, (since,))
                rows = await cursor.fetchall()
                
                columns = ['timestamp', 'pair', 'side', 'price', 'volume', 'pnl', 'strategy', 'metadata']
                return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logging.error(f"Error retrieving trades: {e}", exc_info=True)
            raise

    async def get_active_trades(self) -> List[Dict[str, Any]]:
        """Retrieve trades considered 'active' (pnl IS NULL => not closed)."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        query = """
        SELECT timestamp, pair, side, price, volume, pnl, strategy, metadata
        FROM trades
        WHERE pnl IS NULL
        ORDER BY timestamp DESC
        """
        
        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute(query)
                rows = await cursor.fetchall()
                
                columns = ['timestamp', 'pair', 'side', 'price', 'volume', 'pnl', 'strategy', 'metadata']
                return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logging.error(f"Error retrieving active trades: {e}", exc_info=True)
            raise

    async def insert_trade(self, trade_data: Dict[str, Any]) -> None:
        """Insert a new trade record."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        query = """
        INSERT INTO trades (timestamp, pair, side, price, volume, pnl, strategy, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        values = (
            trade_data['timestamp'],
            trade_data['pair'],
            trade_data['side'],
            trade_data['price'],
            trade_data['volume'],
            trade_data.get('pnl'),
            trade_data.get('strategy'),
            trade_data.get('metadata')
        )
        
        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute(query, values)
                await self._conn.commit()
        except Exception as e:
            logging.error(f"Error inserting trade: {e}", exc_info=True)
            raise

    async def clear_trades(self) -> None:
        """Clear all trades from the database."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute("DELETE FROM trades")
                await self._conn.commit()
            logging.info("Trades table cleared successfully")
        except Exception as e:
            logging.error(f"Error clearing trades: {e}", exc_info=True)
            raise

    async def backup_database(self, backup_path: str) -> bool:
        """Create a backup of the database."""
        if not self._conn:
            raise RuntimeError("Database not connected")
            
        try:
            backup_path = Path(backup_path).resolve()
            async with aiosqlite.connect(str(backup_path)) as backup_conn:
                await self._conn.backup(backup_conn)
            logging.info(f"Database backed up successfully to {backup_path}")
            return True
        except Exception as e:
            logging.error(f"Failed to backup database: {e}", exc_info=True)
            return False

    @property
    def is_connected(self) -> bool:
        """Check if database is connected."""
        return self._conn is not None and self._initialized
        
    @property
    def conn(self):
        """Get the raw database connection (for backwards compatibility)."""
        return self._conn

    async def fetch_to_dataframe(self, query: str, params: tuple = None) -> pd.DataFrame:
        """Execute a query and return results as a pandas DataFrame."""
        try:
            if not self._conn:
                raise RuntimeError("Database not connected")
                
            async with self._conn.cursor() as cursor:
                await cursor.execute(query, params or ())
                rows = await cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                
                df = pd.DataFrame(rows, columns=columns)
                return df
                
        except Exception as e:
            logging.error(f"Error executing query to DataFrame: {e}", exc_info=True)
            return pd.DataFrame()

    # ---------------------------------------------------------------------
    # UPDATED METHODS to ACCEPT start_date / end_date
    # ---------------------------------------------------------------------
    async def get_closed_trades(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieve trades that have a non-NULL PnL (closed trades),
        optionally filtering by timestamp >= start_date and <= end_date.
        """
        if not self._conn:
            raise RuntimeError("Database not connected")

        query = """
        SELECT timestamp, pair, side, price, volume, pnl, strategy, metadata
        FROM trades
        WHERE pnl IS NOT NULL
        """
        params = []

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        query += " ORDER BY timestamp DESC"

        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute(query, tuple(params))
                rows = await cursor.fetchall()
                columns = ['timestamp', 'pair', 'side', 'price', 'volume', 'pnl', 'strategy', 'metadata']
                return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logging.error(f"Error retrieving closed trades: {e}", exc_info=True)
            raise

    async def get_equity_curve(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Retrieve an equity curve from 'performance_metrics' (assuming metric_name='equity'),
        optionally filtering by timestamp >= start_date and <= end_date.
        Returns a DataFrame with at least ['timestamp', 'value'] columns (renamed to 'equity').
        """
        if not self._conn:
            raise RuntimeError("Database not connected")

        query = """
        SELECT timestamp, value AS equity
        FROM performance_metrics
        WHERE metric_name = 'equity'
        """
        params = []

        if start_date:
            query += " AND timestamp >= ?"
            params.append(start_date)

        if end_date:
            query += " AND timestamp <= ?"
            params.append(end_date)

        query += " ORDER BY timestamp ASC"

        try:
            df = await self.fetch_to_dataframe(query, tuple(params))
            return df
        except Exception as e:
            logging.error(f"Error retrieving equity curve: {e}", exc_info=True)
            raise

    # ---------------------------------------------------------------------
    # NEW METHOD: save_balances
    # ---------------------------------------------------------------------
    async def save_balances(self, balances: Dict[str, float]) -> None:
        """
        Insert balance records into the balances table.
        Each asset-balance pair will be stored along with a timestamp.

        Args:
            balances: Dictionary where keys = asset symbol, values = balance (float).
        """
        if not self._conn:
            raise RuntimeError("Database not connected")
        
        if not balances:
            logging.info("No balances to save (empty dictionary).")
            return

        now = datetime.utcnow()

        # We'll do one insert per asset
        insert_query = """
        INSERT INTO balances (timestamp, asset, amount)
        VALUES (?, ?, ?)
        """
        
        try:
            async with self._conn.cursor() as cursor:
                # Insert each balance record
                for asset, amount in balances.items():
                    await cursor.execute(insert_query, (now, asset, amount))
                await self._conn.commit()
            logging.info("Balances saved successfully.")
        except Exception as e:
            logging.error(f"Error inserting balances: {e}", exc_info=True)
            raise
