# database_pool.py (new file or existing data/database.py)

from contextlib import asynccontextmanager
import aiosqlite
import asyncio

class DatabasePool:
    def __init__(self, db_path: str, pool_size: int = 5):
        self._db_path = db_path
        self._pool = asyncio.Queue(maxsize=pool_size)
        self._pool_size = pool_size
        self._initialized = False
        self._lock = asyncio.Lock()

    async def initialize(self):
        """Initialize the connection pool."""
        if self._initialized:
            return
        
        async with self._lock:
            if self._initialized:
                return
                
            for _ in range(self._pool_size):
                conn = await aiosqlite.connect(self._db_path)
                await self._pool.put(conn)
            
            self._initialized = True

    @asynccontextmanager
    async def connection(self):
        """Get a connection from the pool."""
        if not self._initialized:
            await self.initialize()
            
        conn = await self._pool.get()
        try:
            yield conn
        finally:
            await self._pool.put(conn)

    async def close_all(self):
        """Close all connections in the pool."""
        while not self._pool.empty():
            conn = await self._pool.get()
            await conn.close()
