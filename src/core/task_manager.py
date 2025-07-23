# task_manager.py (new file or a utility in src/core)

import asyncio
import logging
from typing import Dict

class EnhancedTaskManager:
    def __init__(self):
        self._tasks: Dict[str, asyncio.Task] = {}
        self._lock = asyncio.Lock()
        self._stats = {
            'completed': 0,
            'failed': 0,
            'cancelled': 0
        }

    async def spawn(self, name: str, coro) -> asyncio.Task:
        async with self._lock:
            if name in self._tasks and not self._tasks[name].done():
                raise RuntimeError(f"Task {name} already running")
            
            task = asyncio.create_task(coro)
            self._tasks[name] = task
            
            task.add_done_callback(
                lambda t: asyncio.create_task(self._handle_completion(name, t))
            )
            return task

    async def _handle_completion(self, name: str, task: asyncio.Task):
        async with self._lock:
            try:
                exc = task.exception()
                if exc:
                    self._stats['failed'] += 1
                    logging.error(f"Task {name} failed: {exc}")
                elif task.cancelled():
                    self._stats['cancelled'] += 1
                    logging.info(f"Task {name} was cancelled")
                else:
                    self._stats['completed'] += 1
                    logging.debug(f"Task {name} completed successfully")
            except asyncio.CancelledError:
                self._stats['cancelled'] += 1
            finally:
                del self._tasks[name]

    async def cancel_all(self):
        """Cancel all running tasks."""
        async with self._lock:
            for name, task in list(self._tasks.items()):
                task.cancel()
            await asyncio.gather(*self._tasks.values(), return_exceptions=True)
            self._tasks.clear()
