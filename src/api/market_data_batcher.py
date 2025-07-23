import time
import asyncio
from typing import List, Dict

class MarketDataBatcher:
    """
    An asynchronous batcher for handling incoming market data in bulk.

    Usage:
    1. Create an instance with desired batch_size and flush_interval.
    2. Reassign `_process_batch` if you need custom logic, e.g.:
         market_data_batcher._process_batch = your_async_method
    3. Call `await market_data_batcher.add({...})` whenever you receive new data.
       The batcher automatically flushes when batch_size is reached
       or when flush_interval elapses, whichever comes first.
    """

    def __init__(self, batch_size: int = 100, flush_interval: float = 0.5):
        """
        :param batch_size: The max number of items before forcing a flush.
        :param flush_interval: Max seconds between flushes (keeps data timely).
        """
        self._batch: List[Dict] = []
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._last_flush = time.monotonic()
        self._lock = asyncio.Lock()

    async def add(self, data: dict):
        """
        Add an incoming data item to the batch. If the batch is large enough
        or enough time has elapsed since last flush, flush immediately.
        """
        async with self._lock:
            self._batch.append(data)
            current_time = time.monotonic()

            # Auto-flush if we've hit the batch size or if the flush interval is exceeded
            if (len(self._batch) >= self._batch_size
                or current_time - self._last_flush >= self._flush_interval):
                await self.flush()

    async def flush(self):
        """
        Flush (process) the current batch of data. Then clear the batch
        and reset the last_flush timer.
        """
        async with self._lock:
            if not self._batch:
                return

            try:
                # By default, _process_batch is a no-op, but you can reassign it externally.
                await self._process_batch(self._batch)
            finally:
                self._batch.clear()
                self._last_flush = time.monotonic()

    async def _process_batch(self, batch: List[dict]):
        """
        The main logic for handling a flushed batch.

        By default this is a no-op. Your TUI or app can assign a new async function:
            market_data_batcher._process_batch = your_async_processing_function

        For example, you might update the GUI, write to a database, or publish
        messages to a queue. The signature must be:
            async def some_function(batch: List[dict]) -> None
        """
        pass
