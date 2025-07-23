import aiosqlite
import logging
import asyncio
import os
from pathlib import Path
from datetime import datetime
from typing import List, Optional, Dict, Any

class Database:
    """Async SQLite database handler for the trading application."""
    
    def __init__(self, db_path: str):
        """Initialize the database with the given path."""
        try:
            # Convert to Path object and resolve to absolute path
            self.db_path = Path(db_path).resolve()
            self._conn: Optional[aiosqlite.Connection] = None
            self._initialized = False
            
            logging.info(f"Database initialized with path: {self.db_path}")
            logging.info(f"Database directory exists: {self.db_path.parent.exists()}")
            logging.info(f"Database directory is writable: {os.access(self.db_path.parent, os.W_OK)}")
            
            # Directory should already exist from AppConfig.ensure_directories()
            if not self.db_path.parent.exists():
                logging.warning(f"Database directory does not exist: {self.db_path.parent}")
                self.db_path.parent.mkdir(parents=True, exist_ok=True)
                logging.info("Created database directory")
                
        except Exception as e:
            logging.error(f"Failed to initialize database object: {e}", exc_info=True)
            raise RuntimeError(f"Database initialization failed: {e}") from e

    async def connect(self) -> None:
        """Establish the database connection and initialize tables."""
        try:
            logging.info(f"Attempting to connect to database at {self.db_path}")
            
            # Set a reasonable timeout for the connection
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

    async def _initialize_tables(self) -> None:
        """Create necessary tables if they don't exist."""
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
        
        try:
            async with self._conn.cursor() as cursor:
                await cursor.execute(create_trades_table)
                await cursor.execute(create_performance_table)
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
                
                # Convert to list of dicts
                columns = ['timestamp', 'pair', 'side', 'price', 'volume', 'pnl', 'strategy', 'metadata']
                return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            logging.error(f"Error retrieving trades: {e}", exc_info=True)
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
            # Create a new connection for the backup
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