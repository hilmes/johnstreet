import asyncio
import logging
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

@dataclass
class TradeOrder:
    pair: str
    side: str
    order_type: str
    volume: float
    price: Optional[float] = None
    stop_loss: Optional[float] = None
    take_profit: Optional[float] = None
    leverage: int = 1
    
class OrderStatus(Enum):
    PENDING = "pending"
    OPEN = "open"
    CLOSED = "closed"
    CANCELLED = "cancelled"
    ERROR = "error"

class TradeExecutor:
    """Manages trade execution and order lifecycle"""
    
    def __init__(
        self,
        kraken_api,
        risk_manager,
        db_manager,
        config: Dict
    ):
        self.kraken_api = kraken_api
        self.risk_manager = risk_manager
        self.db = db_manager
        self.config = config
        self.active_orders: Dict[str, TradeOrder] = {}
        self.order_status: Dict[str, OrderStatus] = {}
        self._running = False
        self._monitor_task = None
        self.max_retries = 3
        self.api_timeout = 30  # seconds
        
    async def start(self):
        """Start the trade executor"""
        self._running = True
        self._monitor_task = asyncio.create_task(self.monitor_orders())
        
    async def stop(self):
        """Stop the trade executor"""
        self._running = False
        if self._monitor_task:
            self._monitor_task.cancel()
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
            self._monitor_task = None
            
    async def execute_trade(self, trade_signal: Dict) -> Optional[str]:
        """Execute a trade based on signal"""
        try:
            # Validate trade signal
            if not self._validate_trade_signal(trade_signal):
                return None
            
            # Check risk limits
            if not self.risk_manager.check_trade(trade_signal):
                logging.warning("Trade rejected by risk manager")
                return None
            
            # Prepare order
            order = self._prepare_order(trade_signal)
            
            # Execute order with timeout
            async with asyncio.timeout(self.api_timeout):
                order_id = await self._place_order(order)
                
            if order_id:
                self.active_orders[order_id] = order
                self.order_status[order_id] = OrderStatus.PENDING
                
                # Set stops and take profits with timeout
                async with asyncio.timeout(self.api_timeout):
                    await self._set_order_limits(order_id, order)
                
                # Record trade
                self._record_trade(order_id, order)
                
            return order_id
            
        except asyncio.TimeoutError:
            logging.error("Timeout while executing trade")
            return None
        except Exception as e:
            logging.error(f"Error executing trade: {e}")
            return None
    
    def _validate_trade_signal(self, trade_signal: Dict) -> bool:
        """Validate trade signal parameters"""
        required_fields = [
            'signal', 'strength', 'position_size',
            'stop_loss', 'take_profit'
        ]
        
        return all(
            field in trade_signal and trade_signal[field] is not None
            for field in required_fields
        )
    
    def _prepare_order(self, trade_signal: Dict) -> TradeOrder:
        """Prepare order from trade signal"""
        return TradeOrder(
            pair=trade_signal.get('pair', self.config['DEFAULT_PAIR']),
            side=trade_signal['signal'].lower(),
            order_type='market',
            volume=trade_signal['position_size'],
            stop_loss=trade_signal['stop_loss'],
            take_profit=trade_signal['take_profit']
        )
    
    async def _place_order(self, order: TradeOrder) -> Optional[str]:
        """Place order with Kraken"""
        try:
            async with asyncio.timeout(self.api_timeout):
                result = await self.kraken_api.create_order(
                    pair=order.pair,
                    type=order.order_type,
                    side=order.side,
                    volume=order.volume,
                    leverage=order.leverage
                )
            
            if 'result' in result and 'txid' in result['result']:
                return result['result']['txid'][0]
            else:
                logging.error(f"Invalid order response: {result}")
                return None
                
        except asyncio.TimeoutError:
            logging.error("Timeout while placing order")
            return None
        except Exception as e:
            logging.error(f"Error placing order: {e}")
            return None
    
    async def _set_order_limits(self, order_id: str, order: TradeOrder):
        """Set stop loss and take profit orders"""
        try:
            if order.stop_loss:
                async with asyncio.timeout(self.api_timeout):
                    await self.kraken_api.create_order(
                        pair=order.pair,
                        type='stop-loss',
                        side='sell' if order.side == 'buy' else 'buy',
                        price=order.stop_loss,
                        volume=order.volume
                    )
            
            if order.take_profit:
                async with asyncio.timeout(self.api_timeout):
                    await self.kraken_api.create_order(
                        pair=order.pair,
                        type='take-profit',
                        side='sell' if order.side == 'buy' else 'buy',
                        price=order.take_profit,
                        volume=order.volume
                    )
                
        except asyncio.TimeoutError:
            logging.error("Timeout while setting order limits")
        except Exception as e:
            logging.error(f"Error setting order limits: {e}")
            
        # Update order status regardless of limit order success
        self.order_status[order_id] = OrderStatus.OPEN
    
    def _record_trade(self, order_id: str, order: TradeOrder):
        """Record trade in database"""
        try:
            self.db.record_trade({
                'order_id': order_id,
                'timestamp': datetime.now(),
                'pair': order.pair,
                'side': order.side,
                'type': order.order_type,
                'volume': order.volume,
                'stop_loss': order.stop_loss,
                'take_profit': order.take_profit,
                'leverage': order.leverage,
                'status': OrderStatus.PENDING.value
            })
        except Exception as e:
            logging.error(f"Error recording trade: {e}")
    
    async def monitor_orders(self):
        """Monitor and update order statuses"""
        error_count = 0
        
        while self._running:
            try:
                # Get open orders with timeout
                async with asyncio.timeout(self.api_timeout):
                    open_orders = await self.kraken_api.get_open_orders()
                
                # Update status for each active order
                for order_id, order in list(self.active_orders.items()):  # Use list to avoid mutation during iteration
                    if order_id not in open_orders:
                        # Order might be filled
                        async with asyncio.timeout(self.api_timeout):
                            closed_orders = await self.kraken_api.get_closed_orders()
                            
                        if order_id in closed_orders:
                            self.order_status[order_id] = OrderStatus.CLOSED
                            await self._handle_closed_order(order_id, closed_orders[order_id])
                        else:
                            self.order_status[order_id] = OrderStatus.ERROR
                            await self._handle_error_order(order_id)
                
                # Reset error count on successful iteration
                error_count = 0
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except asyncio.TimeoutError:
                logging.error("Timeout while monitoring orders")
                error_count += 1
            except Exception as e:
                logging.error(f"Error monitoring orders: {e}")
                error_count += 1
                
            if error_count >= self.max_retries:
                logging.critical("Too many errors monitoring orders, stopping monitor")
                self._running = False
                break
                
            if self._running and error_count > 0:
                # Exponential backoff with max delay of 60 seconds
                delay = min(5.0 * (2 ** error_count), 60.0)
                await asyncio.sleep(delay)
    
    async def _handle_closed_order(self, order_id: str, order_info: Dict):
        """Handle closed order updates"""
        try:
            # Update trade record
            self.db.update_trade(order_id, {
                'status': OrderStatus.CLOSED.value,
                'close_price': order_info.get('price'),
                'close_time': datetime.now(),
                'pnl': self._calculate_pnl(self.active_orders[order_id], order_info)
            })
            
            # Clean up
            self._cleanup_order(order_id)
            
        except Exception as e:
            logging.error(f"Error handling closed order: {e}")
            # Still attempt cleanup even if update fails
            self._cleanup_order(order_id)
            
    async def _handle_error_order(self, order_id: str):
        """Handle error order cleanup"""
        try:
            # Update trade record with error status
            self.db.update_trade(order_id, {
                'status': OrderStatus.ERROR.value,
                'close_time': datetime.now()
            })
            
            # Clean up
            self._cleanup_order(order_id)
            
        except Exception as e:
            logging.error(f"Error handling error order: {e}")
            # Still attempt cleanup
            self._cleanup_order(order_id)
            
    def _cleanup_order(self, order_id: str):
        """Clean up order from tracking dictionaries"""
        self.active_orders.pop(order_id, None)
        self.order_status.pop(order_id, None)
        
    def _calculate_pnl(self, order: TradeOrder, order_info: Dict) -> float:
        """Calculate PnL for closed order"""
        try:
            # PnL calculation logic here
            return 0.0  # Placeholder
        except Exception as e:
            logging.error(f"Error calculating PnL: {e}")
            return 0.0