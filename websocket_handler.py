import asyncio
import json
import logging
import socket
import traceback
import websockets
from typing import List, Dict, Optional, Set, Callable
from datetime import datetime
from collections import defaultdict
import psutil
import ssl


class EnhancedWebSocketHandler:
    def __init__(
        self,
        wss_uri: str = "wss://ws.kraken.com",
        max_retries: int = 5,
        retry_delay: int = 5,
        portfolio_manager=None,
        ssl_context: Optional[ssl.SSLContext] = None,
        logger: Optional[logging.Logger] = None
    ):
        """
        Initialize the WebSocket handler with enhanced configuration and logging.
        
        :param wss_uri: WebSocket URI to connect to
        :param max_retries: Maximum number of connection retry attempts
        :param retry_delay: Delay between retry attempts in seconds
        :param portfolio_manager: Optional portfolio manager to update
        :param ssl_context: Optional SSL context for secure connections
        :param logger: Optional logger to use (if None, uses a default logger)
        """
        # If no logger is provided, create or get a module-level logger
        self.logger = logger if logger else logging.getLogger(__name__)

        # Connection Configuration
        self.wss_uri = wss_uri
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self.ssl_context = ssl_context or self._create_default_ssl_context()

        # WebSocket and Connection State
        self.websocket = None
        self._running = False
        self._connected = False
        self._connected_event = asyncio.Event()
        
        # Enhanced Connection Tracking
        self.connection_state = "disconnected"
        self._connection_attempts = 0
        self._successful_connections = 0
        self._connection_errors = 0
        
        # Network Connection Tracking
        self._network_connections: List[Dict] = []
        self._last_network_scan = datetime.now()

        # Portfolio and Callback Management
        self.portfolio_manager = portfolio_manager
        self._tasks = []
        self._callbacks: Dict[str, List[Callable]] = defaultdict(list)

        # Queues and Synchronization
        self._message_queue: Optional[asyncio.Queue] = None
        self._callback_queue: Optional[asyncio.Queue] = None
        self._data_lock: Optional[asyncio.Lock] = None

        # Data Caches
        self._ticker_data: Dict[str, Dict] = {}
        self._orderbook_data: Dict[str, Dict] = {}
        self._trades_data: Dict[str, List] = {}

        # Performance and Logging Metrics
        self._message_count = 0
        self._error_count = 0
        self._reconnect_count = 0
        self._last_update = datetime.now()

        # Track active subscriptions
        self._active_subscriptions: Set[str] = set()

    def _create_default_ssl_context(self) -> ssl.SSLContext:
        """
        Create a default SSL context with enhanced security settings.
        
        :return: Configured SSL context
        """
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
        return ssl_context

    def _scan_network_connections(self) -> List[Dict]:
        """
        Scan and log detailed network connections for the current process.
        
        :return: List of network connection details
        """
        try:
            current_process = psutil.Process()
            connections = current_process.connections()
            
            detailed_connections = []
            for conn in connections:
                connection_info = {
                    "fd": conn.fd,
                    "family": str(conn.family),
                    "type": str(conn.type),
                    "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else "N/A",
                    "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else "N/A",
                    "status": conn.status
                }
                detailed_connections.append(connection_info)
            
            self._network_connections = detailed_connections
            self._last_network_scan = datetime.now()
            
            self.logger.info(f"Network Connections Scan: {len(detailed_connections)} connections found")
            for conn in detailed_connections:
                self.logger.debug(f"Connection: {conn}")
            
            return detailed_connections
        
        except Exception as e:
            self.logger.error(f"Error scanning network connections: {e}")
            return []

    def _log_connection_attempt(self, success: bool, error: Optional[Exception] = None):
        """
        Log detailed information about connection attempts.
        
        :param success: Whether the connection attempt was successful
        :param error: Optional error that occurred during connection
        """
        self._connection_attempts += 1
        
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "uri": self.wss_uri,
            "success": success,
            "attempt_number": self._connection_attempts
        }
        
        if success:
            self._successful_connections += 1
            self.logger.info(f"WebSocket Connection Successful: {log_entry}")
        else:
            self._connection_errors += 1
            error_details = {
                "type": type(error).__name__ if error else "Unknown",
                "message": str(error) if error else "No specific error"
            }
            log_entry["error"] = error_details
            self.logger.error(f"WebSocket Connection Failed: {log_entry}")

    @property
    def connected(self) -> bool:
        """Property to check if websocket is connected."""
        return self._connected and self.websocket is not None

    @property
    def is_ready(self) -> bool:
        """Property to check if websocket is fully initialized and ready."""
        return (
            self._message_queue is not None
            and self._callback_queue is not None
            and self._data_lock is not None
        )

    async def init_async(self):
        """Initialize async components."""
        if not self.is_ready:
            self._message_queue = asyncio.Queue()
            self._callback_queue = asyncio.Queue()
            self._data_lock = asyncio.Lock()
            self.logger.info("Async components initialized")

    async def _maintain_connection(self):
        """
        Maintain WebSocket connection with comprehensive error handling and logging.
        """
        while self._running:
            try:
                # Log detailed connection attempt information
                self.logger.info(f"Attempting WebSocket connection to {self.wss_uri}")
                self.logger.info("Connection parameters:")
                self.logger.info(f"  Max Retries: {self.max_retries}")
                self.logger.info(f"  Retry Delay: {self.retry_delay}")

                # Scan network connections before attempting to connect
                self._scan_network_connections()

                # Track when we started the connection attempt
                connection_start = datetime.now()

                async with websockets.connect(
                    self.wss_uri, 
                    ssl=self.ssl_context,
                    ping_interval=20,    # Ping every 20 seconds
                    ping_timeout=10      # Wait 10 seconds for ping response
                ) as websocket:
                    # Mark a successful connection
                    self.websocket = websocket
                    self._connected = True
                    self.connection_state = "connected"
                    self._connected_event.set()

                    # Log that the connection succeeded
                    self._log_connection_attempt(success=True)

                    self.logger.info("WebSocket connected successfully!")
                    elapsed = datetime.now() - connection_start
                    self.logger.info(f"Connection established in {elapsed}")
                    self.logger.info(f"Local Address: {websocket.local_address}")
                    self.logger.info(f"Remote Address: {websocket.remote_address}")
                    
                    # Resubscribe to any channels we had subscribed to before disconnect
                    await self._resubscribe()

                    # Main connection loop
                    while self._running:
                        try:
                            message = await websocket.recv()
                            await self._message_queue.put(message)
                        except websockets.ConnectionClosed:
                            self.logger.warning("WebSocket connection closed")
                            break
                        except Exception as recv_error:
                            self.logger.error(f"Error receiving message: {recv_error}")
                            break

            except Exception as connect_error:
                # Log the failure
                self._log_connection_attempt(success=False, error=connect_error)

                self.logger.error("WebSocket Connection Failed!")
                self.logger.error(f"Error Details: {type(connect_error).__name__}")
                self.logger.error(f"Error Message: {str(connect_error)}")
                self.logger.error(traceback.format_exc())

                # Additional checks for specific error strings
                if "Name or service not known" in str(connect_error):
                    self.logger.critical("DNS resolution failed. Check your network and WebSocket URI.")
                elif "Connection refused" in str(connect_error):
                    self.logger.critical("Connection refused. Verify WebSocket server is running.")
                elif "SSL" in str(connect_error):
                    self.logger.critical("SSL/TLS connection error. Check your SSL configuration.")

                # Update connection status
                self.connection_state = "error"
                self._connected = False
                self._connected_event.clear()
                self.websocket = None
                self._reconnect_count += 1

                # Retry after delay if still running
                if self._running:
                    await asyncio.sleep(self.retry_delay)

            finally:
                # Cleanup connection state
                self._connected = False
                self._connected_event.clear()
                self.websocket = None

                # If not in an error state, set to disconnected
                if self.connection_state != "error":
                    self.connection_state = "disconnected"

    async def start(self):
        """
        Start the WebSocket handler with comprehensive initialization.
        """
        if self._running:
            self.logger.warning("WebSocket handler is already running")
            return

        await self.init_async()
        self._running = True
        self.connection_state = "connecting"

        # Log WebSocket configuration
        self.logger.info("WebSocket Configuration:")
        self.logger.info(f"  URI: {self.wss_uri}")
        self.logger.info(f"  Max Retries: {self.max_retries}")
        self.logger.info(f"  Retry Delay: {self.retry_delay} seconds")

        # Start background tasks
        processor_task = asyncio.create_task(self._process_messages())
        callback_task = asyncio.create_task(self._process_callbacks())
        connection_task = asyncio.create_task(self._maintain_connection())
        self._tasks.extend([processor_task, callback_task, connection_task])

        # Wait for initial connection
        await self._connected_event.wait()

        # Optional: Send authentication if required (assuming _authenticate exists or will be added)
        if hasattr(self, 'api_key') and hasattr(self, 'api_secret'):
            try:
                await self._authenticate()
            except Exception as auth_error:
                self.logger.error(f"WebSocket authentication failed: {auth_error}")

        # Subscribe to BTC (now uses the updated method below)
        await self.subscribe_to_btc()

        # Wait for initial data with a (longer) timeout using the updated method
        try:
            await self._wait_for_initial_data()
        except asyncio.TimeoutError:
            # The new _wait_for_initial_data handles its own timeout, 
            # so this exception would only arise if we raised it ourselves
            self.logger.warning("Timeout waiting for initial ticker data.")

        self.logger.info("WebSocket handler started successfully")

    async def ensure_connection(self):
        """Ensure websocket is connected and initialized."""
        if not self.is_ready:
            await self.init_async()
        if not self.connected:
            self.connection_state = "connecting"
            await self._connected_event.wait()
            self.connection_state = "connected"

    #
    # --- REPLACED METHOD #1: Updated _wait_for_initial_data ---
    #
    async def _wait_for_initial_data(self):
        """Wait until we have received some valid ticker data."""
        start_time = datetime.now()
        timeout = 30.0  # 30 seconds timeout
        check_interval = 0.5  # Check every 500ms
        
        while self._running:
            # If any pair has non-zero ask, bid, close => we have valid data
            if any(
                pair_data.get("close", 0) > 0
                and pair_data.get("ask", 0) > 0
                and pair_data.get("bid", 0) > 0
                for pair_data in self._ticker_data.values()
            ):
                self.logger.info("Valid ticker data received")
                return True

            # Check for timeout
            if (datetime.now() - start_time).total_seconds() > timeout:
                self.logger.warning(f"Timeout waiting for valid ticker data after {timeout}s")
                return False
                
            await asyncio.sleep(check_interval)

    async def _process_messages(self):
        """Process messages from the queue in a separate task."""
        while self._running:
            try:
                message = await self._message_queue.get()
                await self._handle_message(message)
                self._message_queue.task_done()
            except Exception as e:
                self.logger.error(f"Error processing message: {e}")

    async def _process_callbacks(self):
        """Process callbacks in a separate task."""
        while self._running:
            try:
                channel, data = await self._callback_queue.get()
                for callback in self._callbacks[channel]:
                    try:
                        await callback(data)
                    except Exception as e:
                        self.logger.error(f"Error in callback: {e}")
                self._callback_queue.task_done()
            except Exception as e:
                self.logger.error(f"Error processing callback: {e}")

    #
    # --- REPLACED METHOD #2: Updated subscribe_to_btc ---
    #
    async def subscribe_to_btc(self):
        """Subscribe to BTC ticker using common pairs that need to be monitored."""
        btc_pairs = [
            "XXBTZUSD",  # Bitcoin/USD - Primary pair
        ]
        # First subscribe to primary pair
        try:
            self.logger.info("Subscribing to primary BTC pair...")
            await self.subscribe("ticker", ["XXBTZUSD"])
            await asyncio.sleep(1.0)  # Wait a bit longer for primary pair
            
            # Wait up to 10s for primary pair data
            start_time = datetime.now()
            while (datetime.now() - start_time).total_seconds() < 10.0:
                if (
                    "XXBTZUSD" in self._ticker_data and 
                    self._ticker_data["XXBTZUSD"].get("close", 0) > 0
                ):
                    break
                await asyncio.sleep(0.5)
            
            # Then subscribe to additional pairs
            additional_pairs = [
                "XBTUSDT",     # Bitcoin/USDT
                "XETHZUSD",    # Ethereum/USD
                "ETHUSDT",     # Ethereum/USDT
            ]
            
            for pair in additional_pairs:
                try:
                    self.logger.info(f"Subscribing to additional pair {pair}")
                    await self.subscribe("ticker", [pair])
                    await asyncio.sleep(0.5)  # Small delay between subscriptions
                except Exception as e:
                    self.logger.error(f"Failed to subscribe to {pair}: {e}")
                    
        except Exception as e:
            self.logger.error(f"Failed to subscribe to primary BTC pair: {e}")
            raise  # Re-raise for higher-level handling if needed

    async def _resubscribe(self):
        """Resubscribe to all active subscriptions after reconnect."""
        self.logger.info("Resubscribing to active channels...")
        for subscription in self._active_subscriptions:
            try:
                channel, pairs_str = subscription.split(":", 1)
                pairs = pairs_str.split(",")
                await self.subscribe(channel, pairs)
                self.logger.info(f"Resubscribed to {channel} for pairs {pairs}")
            except Exception as e:
                self.logger.error(f"Error resubscribing: {e}")

    async def subscribe(self, channel: str, pairs: List[str], callback: Optional[Callable] = None):
        """Subscribe to a channel with an optional callback."""
        await self.ensure_connection()

        message = {
            "event": "subscribe",
            "pair": pairs,
            "subscription": {"name": channel},
        }
        self.logger.debug(f"Sending subscription message: {message}")

        if callback:
            key = f"{channel}:{','.join(pairs)}"
            self._callbacks[key].append(callback)

        if self.connected:
            try:
                await self.websocket.send(json.dumps(message))
                self._active_subscriptions.add(f"{channel}:{','.join(pairs)}")
                self.logger.info(f"Subscribed to {channel} for pairs {pairs}")
            except Exception as e:
                self.logger.error(f"Error sending subscription message: {e}")
        else:
            self.logger.warning(f"Attempted to subscribe while disconnected: {channel} {pairs}")

    async def _handle_message(self, message: str):
        """Process incoming WebSocket messages with proper locking."""
        self._message_count += 1
        self._last_update = datetime.now()

        try:
            data = json.loads(message)
            self.logger.debug(f"Received message: {message}")

            # Handle system messages (dict-based)
            if isinstance(data, dict):
                if "event" in data:
                    # e.g., subscriptionStatus or systemStatus
                    if data.get("event") in ["systemStatus", "subscriptionStatus"]:
                        return

            # Handle data messages (list-based)
            if isinstance(data, list):
                channel_name = data[2]
                pair = data[3]

                async with self._data_lock:
                    if channel_name == "ticker":
                        self._handle_ticker(pair, data[1])
                    elif channel_name == "trade":
                        self._handle_trades(pair, data[1])
                        if self.portfolio_manager:
                            try:
                                balances = await self.portfolio_manager.get_balances()
                                self.logger.info(f"Updated balances: {balances}")
                            except Exception as e:
                                self.logger.error(f"Error fetching balances: {e}")
                    elif channel_name == "book":
                        self._handle_orderbook(pair, data[1])

                subscription_key = f"{channel_name}:{pair}"
                if subscription_key in self._callbacks:
                    await self._callback_queue.put((subscription_key, data[1]))

        except Exception as e:
            self._error_count += 1
            self.logger.error(f"Error processing message: {e}, message: {message}")

    def _handle_ticker(self, pair: str, data: Dict):
        """Handle ticker data updates with improved logging and validation."""
        try:
            required_fields = ["a", "b", "c", "v", "p", "t", "l", "h", "o"]
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                self.logger.error(f"Missing required fields {missing_fields} in ticker data for {pair}")
                return

            def safe_float(value, field):
                try:
                    return float(value[0] if isinstance(value, list) else value)
                except (ValueError, IndexError, TypeError) as exc:
                    self.logger.error(f"Error parsing {field} for {pair}: {exc}")
                    return 0.0

            new_ticker_data = {
                "ask": safe_float(data["a"], "ask"),
                "bid": safe_float(data["b"], "bid"),
                "close": safe_float(data["c"], "close"),
                "volume": safe_float(data["v"][1] if len(data["v"]) > 1 else data["v"][0], "volume"),
                "vwap": safe_float(data["p"][1] if len(data["p"]) > 1 else data["p"][0], "vwap"),
                "trades": int(float(data["t"][1] if len(data["t"]) > 1 else data["t"][0])),
                "low": safe_float(data["l"][1] if len(data["l"]) > 1 else data["l"][0], "low"),
                "high": safe_float(data["h"][1] if len(data["h"]) > 1 else data["h"][0], "high"),
                "open": safe_float(data["o"], "open"),
                "last_update": datetime.now().isoformat()
            }

            # Log a warning if key values are zero, but store them anyway
            if (
                new_ticker_data["ask"] == 0.0 or
                new_ticker_data["bid"] == 0.0 or
                new_ticker_data["close"] == 0.0
            ):
                self.logger.warning(f"Ticker for {pair} has zero in ask/bid/close. Storing partial data anyway.")

            self._ticker_data[pair] = new_ticker_data
            self.logger.debug(f"Updated ticker data for {pair}")

        except Exception as e:
            self.logger.error(f"Error handling ticker data for {pair}: {e}, data: {data}")
            self.logger.debug(f"Raw ticker data received: {data}")

    def _handle_trades(self, pair: str, trades: List):
        """Handle trades data updates with improved validation."""
        if pair not in self._trades_data:
            self._trades_data[pair] = []

        try:
            for trade in trades:
                if len(trade) >= 4:
                    self._trades_data[pair].append({
                        "price": float(trade[0]),
                        "volume": float(trade[1]),
                        "time": float(trade[2]),
                        "side": "sell" if trade[3] == "s" else "buy",
                        "market": trade[4] if len(trade) > 4 else "market",
                        "misc": trade[5] if len(trade) > 5 else ""
                    })
                else:
                    self.logger.warning(f"Incomplete trade data received for {pair}: {trade}")

            # Keep only the latest 1000 trades
            self._trades_data[pair] = self._trades_data[pair][-1000:]
            
        except Exception as e:
            self.logger.error(f"Error handling trades for {pair}: {e}")

    def _handle_orderbook(self, pair: str, data: Dict):
        """Handle orderbook data updates with improved validation."""
        try:
            if pair not in self._orderbook_data:
                self._orderbook_data[pair] = {
                    "asks": {},
                    "bids": {},
                    "last_update": datetime.now().isoformat()
                }

            # Handle snapshot
            if "as" in data and "bs" in data:
                self._orderbook_data[pair]["asks"].clear()
                self._orderbook_data[pair]["bids"].clear()

                for price, volume, timestamp in data["as"]:
                    if float(volume) > 0:
                        self._orderbook_data[pair]["asks"][price] = [
                            float(price),
                            float(volume),
                            timestamp
                        ]

                for price, volume, timestamp in data["bs"]:
                    if float(volume) > 0:
                        self._orderbook_data[pair]["bids"][price] = [
                            float(price),
                            float(volume),
                            timestamp
                        ]

            else:
                # Handle updates
                if "a" in data:  # Asks updates
                    for price, volume, timestamp in data["a"]:
                        if float(volume) == 0:
                            self._orderbook_data[pair]["asks"].pop(price, None)
                        else:
                            self._orderbook_data[pair]["asks"][price] = [
                                float(price),
                                float(volume),
                                timestamp
                            ]

                if "b" in data:  # Bids updates
                    for price, volume, timestamp in data["b"]:
                        if float(volume) == 0:
                            self._orderbook_data[pair]["bids"].pop(price, None)
                        else:
                            self._orderbook_data[pair]["bids"][price] = [
                                float(price),
                                float(volume),
                                timestamp
                            ]

            self._orderbook_data[pair]["last_update"] = datetime.now().isoformat()

        except Exception as e:
            self.logger.error(f"Error handling orderbook for {pair}: {e}, data: {data}")

    def _all_data_initializing(self) -> bool:
        """
        Check if all pairs in _ticker_data have 'status' == 'initializing' 
        (meaning we haven't gotten real data yet).
        """
        if not self._ticker_data:
            return True
        for pair_data in self._ticker_data.values():
            if pair_data.get("status") != "initializing":
                return False
        return True

    #
    # --- REPLACED METHOD #3: Updated get_ticker_data ---
    #
    def get_ticker_data(self, pairs: List[str] = None) -> Dict:
        """
        Get ticker data with improved validation and error handling.
        """
        if not self.connected:
            self.logger.warning("WebSocket not connected when getting ticker data")

        def get_default_ticker():
            return {
                "ask": 0.0,
                "bid": 0.0,
                "close": 0.0,
                "volume": 0.0,
                "vwap": 0.0,
                "trades": 0,
                "low": 0.0,
                "high": 0.0,
                "open": 0.0,
                "last_update": None,
                "status": "initializing"
            }

        # If there's no data at all or if the connection isn't established
        if not self._ticker_data or not self.connected:
            if self.connection_state != "connected":
                self.logger.warning(f"Ticker data requested while connection state is: {self.connection_state}")
            else:
                self.logger.warning("Ticker data cache is empty, returning default values")
            if pairs:
                return {pair: get_default_ticker() for pair in pairs}
            return {}

        # If pairs specified, return only those pairs
        if pairs:
            result = {}
            all_zeros = True
            for pair in pairs:
                if pair in self._ticker_data:
                    data = self._ticker_data[pair]
                    # Check if we have valid data
                    if data.get("close", 0) > 0 or data.get("ask", 0) > 0 or data.get("bid", 0) > 0:
                        all_zeros = False
                    result[pair] = data.copy()
                    result[pair].setdefault("status", "active")
                else:
                    result[pair] = get_default_ticker()
            
            if all_zeros and self.connected:
                self.logger.warning("All requested pairs have zero values despite being connected")
            
            return result

        # Return all cached data
        return {
            p: {
                **data,
                "status": data.get("status", "active")
            }
            for p, data in self._ticker_data.items()
        }

    def get_network_connection_metrics(self) -> Dict:
        """
        Provide comprehensive network connection metrics.
        
        :return: Dictionary of network connection statistics
        """
        return {
            "total_connection_attempts": self._connection_attempts,
            "successful_connections": self._successful_connections,
            "connection_errors": self._connection_errors,
            "current_connections": len(self._network_connections),
            "last_network_scan": self._last_network_scan.isoformat(),
            "connection_state": self.connection_state,
            "network_connections": self._network_connections
        }

    async def close(self):
        """
        Gracefully close the connection with enhanced cleanup and logging.
        """
        self.logger.info("Initiating WebSocket handler shutdown...")
        
        if not self._running:
            self.logger.info("WebSocket handler already stopped")
            return

        self._running = False
        self._connected = False
        self._connected_event.clear()
        self.connection_state = "disconnected"

        # Log final network state before closing
        final_connections = self._scan_network_connections()
        self.logger.info(f"Final network connections before shutdown: {len(final_connections)}")

        # Cancel all tasks with logging
        for task in self._tasks:
            if not task.done():
                task.cancel()
                self.logger.debug(f"Cancelled task: {task}")

        try:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        except asyncio.CancelledError:
            self.logger.info("Tasks cancelled during shutdown")

        if self.websocket:
            await self.websocket.close()
            self.websocket = None
            self.logger.info("WebSocket connection closed")

        # Clear queues with logging
        for queue_name, queue in [
            ("message queue", self._message_queue), 
            ("callback queue", self._callback_queue)
        ]:
            if queue:
                queue_size = queue.qsize()
                if queue_size > 0:
                    self.logger.warning(f"{queue_name} not empty: {queue_size} items")
                while not queue.empty():
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break

        self._tasks.clear()
        self.logger.info("WebSocket handler shutdown complete")

    async def unsubscribe(self, channel: str, pairs: List[str]):
        """Unsubscribe from a channel."""
        await self.ensure_connection()

        message = {
            "event": "unsubscribe",
            "pair": pairs,
            "subscription": {"name": channel},
        }

        if self.connected:
            try:
                await self.websocket.send(json.dumps(message))
                subscription_key = f"{channel}:{','.join(pairs)}"
                self._active_subscriptions.discard(subscription_key)
                self._callbacks.pop(subscription_key, None)
                self.logger.info(f"Unsubscribed from {channel} for pairs {pairs}")
            except Exception as e:
                self.logger.error(f"Error sending unsubscribe message: {e}")
        else:
            self.logger.warning(f"Attempted to unsubscribe while disconnected: {channel} {pairs}")

    async def ping(self) -> bool:
        """Send a ping message to check connection health."""
        if not self.connected:
            return False

        try:
            message = {"event": "ping", "reqid": self._message_count + 1}
            await self.websocket.send(json.dumps(message))
            return True
        except Exception as e:
            self.logger.error(f"Error sending ping: {e}")
            return False

    def get_performance_metrics(self) -> Dict:
        """Get performance metrics and connection status."""
        queue_size = self._message_queue.qsize() if self._message_queue else 0
        return {
            "message_count": self._message_count,
            "error_count": self._error_count,
            "reconnect_count": self._reconnect_count,
            "last_update": self._last_update.isoformat(),
            "active_subscriptions": len(self._active_subscriptions),
            "connection_status": self.connection_state,
            "queue_size": queue_size,
        }

    def clear_data_caches(self):
        """Clear all data caches."""
        self._ticker_data.clear()
        self._orderbook_data.clear()
        self._trades_data.clear()
        self.logger.info("All data caches cleared")
