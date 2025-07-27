# terminal_monitor.py
"""
Terminal-based monitoring interface inspired by my_kraken_bot
Provides a TUI for monitoring johnstreet trading activity
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, List, Optional

from textual.app import App, ComposeResult
from textual.widgets import Static, Header, Footer, Label, Button, DataTable, Log
from textual.containers import Horizontal, Vertical, ScrollableContainer
from textual.reactive import reactive
from textual import events

# Import the enhanced WebSocket handler
from websocket_enhancements import KrakenWebSocketHandlerV2, ThreadedWebSocketManager
from kraken_utils import TradingMetricsCalculator


class TickerWidget(Static):
    """Display real-time ticker data for a pair"""
    
    pair: reactive[str] = reactive("XXBTZUSD")
    ticker_data: reactive[Dict] = reactive({})
    
    def compose(self) -> ComposeResult:
        yield Label(f"[bold]{self.pair}[/bold]", id="pair-label")
        yield Label("Price: --", id="price-label")
        yield Label("Bid/Ask: --/--", id="bid-ask-label")
        yield Label("24h Volume: --", id="volume-label")
        yield Label("24h Change: --", id="change-label")
        
    def watch_ticker_data(self, ticker_data: Dict) -> None:
        """Update display when ticker data changes"""
        if not ticker_data:
            return
            
        self.query_one("#price-label").update(
            f"Price: ${ticker_data.get('close', 0):,.2f}"
        )
        self.query_one("#bid-ask-label").update(
            f"Bid/Ask: ${ticker_data.get('bid', 0):,.2f}/${ticker_data.get('ask', 0):,.2f}"
        )
        self.query_one("#volume-label").update(
            f"24h Volume: {ticker_data.get('volume', 0):,.2f}"
        )
        
        # Calculate 24h change if we have open price
        if ticker_data.get('open', 0) > 0:
            change = ((ticker_data['close'] - ticker_data['open']) / ticker_data['open']) * 100
            change_str = f"{change:+.2f}%"
            color = "green" if change >= 0 else "red"
            self.query_one("#change-label").update(
                f"24h Change: [{color}]{change_str}[/{color}]"
            )


class IndicatorsWidget(Static):
    """Display technical indicators"""
    
    indicators: reactive[Dict] = reactive({})
    
    def compose(self) -> ComposeResult:
        yield Label("[bold]Technical Indicators[/bold]")
        yield Label("RSI: --", id="rsi")
        yield Label("MACD: --", id="macd")
        yield Label("SMA 20/50/200: --", id="sma")
        yield Label("BB: --", id="bb")
        
    def watch_indicators(self, indicators: Dict) -> None:
        """Update indicators display"""
        if not indicators:
            return
            
        # RSI with color coding
        rsi = indicators.get('rsi', 0)
        rsi_color = "red" if rsi > 70 else "green" if rsi < 30 else "white"
        self.query_one("#rsi").update(f"RSI: [{rsi_color}]{rsi:.1f}[/{rsi_color}]")
        
        # MACD
        macd = indicators.get('macd', 0)
        signal = indicators.get('macd_signal', 0)
        macd_color = "green" if macd > signal else "red"
        self.query_one("#macd").update(
            f"MACD: [{macd_color}]{macd:.4f}[/{macd_color}] / {signal:.4f}"
        )
        
        # SMAs
        sma_20 = indicators.get('sma_20', 0)
        sma_50 = indicators.get('sma_50', 0)
        sma_200 = indicators.get('sma_200', 0)
        self.query_one("#sma").update(
            f"SMA 20/50/200: {sma_20:.2f} / {sma_50:.2f} / {sma_200:.2f}"
        )
        
        # Bollinger Bands
        bb_upper = indicators.get('bb_upper', 0)
        bb_lower = indicators.get('bb_lower', 0)
        self.query_one("#bb").update(
            f"BB: {bb_lower:.2f} - {bb_upper:.2f}"
        )


class PositionsTable(Static):
    """Display current positions"""
    
    def compose(self) -> ComposeResult:
        yield Label("[bold]Open Positions[/bold]")
        yield DataTable(id="positions-table")
        
    def on_mount(self) -> None:
        table = self.query_one("#positions-table", DataTable)
        table.add_columns("Pair", "Side", "Size", "Entry", "Current", "P&L", "P&L %")
        
    def update_positions(self, positions: List[Dict], current_prices: Dict[str, float]) -> None:
        """Update positions table"""
        table = self.query_one("#positions-table", DataTable)
        table.clear()
        
        calculator = TradingMetricsCalculator()
        
        for pos in positions:
            pair = pos['pair']
            current_price = current_prices.get(pair, pos['entry_price'])
            
            metrics = calculator.calculate_pnl(
                entry_price=pos['entry_price'],
                current_price=current_price,
                quantity=pos['quantity'],
                side=pos['side']
            )
            
            pnl_color = "green" if metrics['pnl'] >= 0 else "red"
            
            table.add_row(
                pair,
                pos['side'].upper(),
                f"{pos['quantity']:.4f}",
                f"${pos['entry_price']:.2f}",
                f"${current_price:.2f}",
                f"[{pnl_color}]${metrics['pnl']:.2f}[/{pnl_color}]",
                f"[{pnl_color}]{metrics['pnl_percent']:.2f}%[/{pnl_color}]"
            )


class OrdersLog(Static):
    """Display recent orders and trades"""
    
    def compose(self) -> ComposeResult:
        yield Label("[bold]Recent Activity[/bold]")
        yield Log(id="orders-log", max_lines=20)
        
    def add_order(self, order: Dict) -> None:
        """Add order to log"""
        log = self.query_one("#orders-log", Log)
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        order_type = order.get('type', 'Unknown')
        side = order.get('side', 'Unknown')
        pair = order.get('pair', 'Unknown')
        price = order.get('price', 0)
        size = order.get('size', 0)
        
        color = "green" if side.lower() == 'buy' else "red"
        log.write_line(
            f"[{timestamp}] [{color}]{side.upper()}[/{color}] {pair} "
            f"{size:.4f} @ ${price:.2f} ({order_type})"
        )


class JohnStreetMonitor(App):
    """Terminal monitoring interface for johnstreet"""
    
    CSS = """
    TickerWidget {
        border: solid #444;
        padding: 1;
        margin: 1;
        height: 8;
    }
    
    IndicatorsWidget {
        border: solid #444;
        padding: 1;
        margin: 1;
        height: 8;
    }
    
    PositionsTable {
        border: solid #444;
        padding: 1;
        margin: 1;
        height: 15;
    }
    
    OrdersLog {
        border: solid #444;
        padding: 1;
        margin: 1;
    }
    
    #main-pairs {
        layout: grid;
        grid-size: 3 2;
        grid-rows: 1fr 1fr;
    }
    """
    
    BINDINGS = [
        ("q", "quit", "Quit"),
        ("r", "refresh", "Refresh"),
        ("p", "add_pair", "Add Pair"),
        ("o", "place_order", "Place Order"),
    ]
    
    def __init__(self, websocket_handler: Optional[KrakenWebSocketHandlerV2] = None):
        super().__init__()
        self.websocket_handler = websocket_handler
        self.ws_manager = None
        self.monitored_pairs = ["XXBTZUSD", "XETHZUSD", "XRPZUSD"]
        self.positions = []  # Would connect to actual position manager
        
    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield Footer()
        
        with Vertical():
            # Main ticker displays
            with Horizontal(id="main-pairs"):
                for pair in self.monitored_pairs[:6]:  # Show up to 6 pairs
                    ticker = TickerWidget()
                    ticker.pair = pair
                    yield ticker
            
            # Indicators for primary pair
            yield IndicatorsWidget(id="main-indicators")
            
            # Positions and orders
            with Horizontal():
                yield PositionsTable()
                yield OrdersLog()
    
    async def on_mount(self) -> None:
        """Set up WebSocket connection and data updates"""
        if not self.websocket_handler:
            self.websocket_handler = KrakenWebSocketHandlerV2()
            
        # Use threaded manager for non-async context
        self.ws_manager = ThreadedWebSocketManager(self.websocket_handler)
        self.ws_manager.start()
        
        # Subscribe to pairs
        await self._subscribe_to_pairs()
        
        # Set up periodic updates
        self.set_interval(0.5, self.update_data)
        self.set_interval(5.0, self.update_indicators)
        
    async def _subscribe_to_pairs(self) -> None:
        """Subscribe to WebSocket channels for monitored pairs"""
        # Subscribe to tickers
        for pair in self.monitored_pairs:
            await self.websocket_handler.subscribe("ticker", [pair])
            
        # Subscribe to OHLC for primary pair (for indicators)
        await self.websocket_handler.subscribe_ohlc_multi(
            [self.monitored_pairs[0]], 
            intervals=[1, 5, 15]
        )
        
    def update_data(self) -> None:
        """Update ticker displays"""
        if not self.ws_manager:
            return
            
        ticker_data = self.ws_manager.get_ticker_data(self.monitored_pairs)
        
        # Update each ticker widget
        for widget in self.query(TickerWidget):
            if widget.pair in ticker_data:
                widget.ticker_data = ticker_data[widget.pair]
                
        # Update positions with current prices
        current_prices = {
            pair: data.get('close', 0) 
            for pair, data in ticker_data.items()
        }
        
        positions_widget = self.query_one(PositionsTable)
        positions_widget.update_positions(self.positions, current_prices)
        
    def update_indicators(self) -> None:
        """Update technical indicators"""
        if not self.ws_manager:
            return
            
        # Get indicators for primary pair
        primary_pair = self.monitored_pairs[0]
        indicators = self.ws_manager.get_indicators(primary_pair)
        
        indicators_widget = self.query_one("#main-indicators", IndicatorsWidget)
        indicators_widget.indicators = indicators
        
    def action_refresh(self) -> None:
        """Force refresh all data"""
        self.update_data()
        self.update_indicators()
        
    def action_quit(self) -> None:
        """Clean shutdown"""
        if self.ws_manager:
            self.ws_manager.stop()
        self.exit()


def run_monitor():
    """Run the terminal monitor"""
    app = JohnStreetMonitor()
    app.run()


if __name__ == "__main__":
    run_monitor()