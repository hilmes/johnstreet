import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List
from datetime import datetime
import logging
from functools import partial

class PerformanceMonitor:
    """Trading performance monitoring and analysis with support for both sync and async operations."""
    
    def __init__(self, db):
        """
        Initialize the performance monitor.
        
        Args:
            db: Database instance for data access
        """
        self.db = db
        self.api_timeout = 30  # seconds
        self.chunk_size = 10000  # rows for chunked processing

    def get_trade_history_sync(self, scope: str = "all") -> pd.DataFrame:
        """
        Synchronous version of trade history retrieval that won't crash
        when an event loop is already running (e.g., in Textual).
        
        Args:
            scope: Strategy name to filter by, or "all" for all trades
            
        Returns:
            DataFrame containing trade history
        """
        try:
            if not self.db._conn:
                logging.error("Database not connected")
                return pd.DataFrame()
            
            async def fetch_trades():
                query = "SELECT * FROM trades WHERE 1=1"
                params = []
                
                if scope != "all":
                    query += " AND strategy = ?"
                    params.append(scope)
                    
                query += " ORDER BY timestamp"
                
                return await self.db.fetch_to_dataframe(query, tuple(params))

            # Attempt to get the currently running loop
            try:
                loop = asyncio.get_running_loop()
                # If we succeed, that means a loop is already running;
                # we schedule the coroutine thread-safe
                future = asyncio.run_coroutine_threadsafe(fetch_trades(), loop)
                df = future.result()
            except RuntimeError:
                # No event loop is running in this thread, so we create and run one
                loop = asyncio.new_event_loop()
                try:
                    df = loop.run_until_complete(fetch_trades())
                finally:
                    loop.close()

            # Convert timestamp strings to datetime objects if present
            if 'timestamp' in df.columns and not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                
            return df
                
        except Exception as e:
            logging.error(f"Error getting trade history: {e}")
            return pd.DataFrame()

    async def get_trade_history(self, strategy: str = "all") -> pd.DataFrame:
        """
        Get trade history from database asynchronously.
        
        Args:
            strategy: Strategy name to filter by, or "all" for all trades
            
        Returns:
            DataFrame containing trade history
        """
        try:
            query = "SELECT * FROM trades WHERE 1=1"
            params = []
            
            if strategy != "all":
                query += " AND strategy = ?"
                params.append(strategy)
                
            query += " ORDER BY timestamp"
            
            return await self.db.fetch_to_dataframe(query, tuple(params))
                
        except Exception as e:
            logging.error(f"Error getting trade history: {e}")
            return pd.DataFrame()

    def calculate_metrics(self, scope: str = "all", timeframe: str = 'daily') -> Dict:
        """
        Calculate performance metrics synchronously.
        
        Args:
            scope: Strategy name to filter by, or "all" for all trades
            timeframe: Timeframe for calculations ('daily', 'weekly', 'monthly')
            
        Returns:
            Dictionary containing calculated metrics
        """
        try:
            # Get trade history synchronously
            trades_df = self.get_trade_history_sync(scope)
                
            if trades_df.empty:
                return self._get_empty_metrics()
            
            # Process in chunks if dataset is large
            if len(trades_df) > self.chunk_size:
                return self._calculate_metrics_chunked_sync(trades_df, timeframe)
            
            return self._calculate_metrics_sync(trades_df, timeframe)
            
        except Exception as e:
            logging.error(f"Error calculating performance metrics: {e}", exc_info=True)
            return self._get_empty_metrics()

    async def calculate_metrics_async(self, strategy: str = "all", timeframe: str = 'daily') -> Dict:
        """
        Calculate performance metrics asynchronously.
        
        Args:
            strategy: Strategy name to filter by, or "all" for all trades
            timeframe: Timeframe for calculations ('daily', 'weekly', 'monthly')
            
        Returns:
            Dictionary containing calculated metrics
        """
        try:
            # Replace `asyncio.timeout` with `asyncio.wait_for`
            trades_df = await asyncio.wait_for(
                self.get_trade_history(strategy),
                timeout=self.api_timeout
            )
            
            if trades_df.empty:
                return self._get_empty_metrics()
            
            # Process in chunks if dataset is large
            if len(trades_df) > self.chunk_size:
                return await self._calculate_metrics_chunked(trades_df, timeframe)
            
            return await self._calculate_metrics_single(trades_df, timeframe)
            
        except asyncio.TimeoutError:
            logging.error("Timeout calculating performance metrics")
            return self._get_empty_metrics()
        except Exception as e:
            logging.error(f"Error calculating performance metrics: {e}")
            return self._get_empty_metrics()

    def _calculate_metrics_sync(self, trades_df: pd.DataFrame, timeframe: str) -> Dict:
        """Calculate metrics synchronously."""
        total_trades = len(trades_df)
        winning_trades = len(trades_df[trades_df['pnl'] > 0])
        losing_trades = len(trades_df[trades_df['pnl'] <= 0])
        
        win_rate = winning_trades / total_trades if total_trades > 0 else 0
        
        # Calculate PnL metrics
        total_pnl = trades_df['pnl'].sum()
        avg_win = trades_df[trades_df['pnl'] > 0]['pnl'].mean() or 0
        avg_loss = trades_df[trades_df['pnl'] <= 0]['pnl'].mean() or 0
        
        # Calculate drawdown
        cumulative_pnl = trades_df['pnl'].cumsum()
        rolling_max = cumulative_pnl.cummax()
        drawdowns = (cumulative_pnl - rolling_max) / rolling_max * 100
        max_drawdown = abs(drawdowns.min()) if not drawdowns.empty else 0
        
        # Calculate Sharpe Ratio
        returns = trades_df.groupby(trades_df['timestamp'].dt.date)['pnl'].sum()
        sharpe = self.calculate_sharpe_ratio(returns) if len(returns) > 1 else 0
        
        return {
            'total_pnl': total_pnl,
            'win_rate': win_rate * 100,
            'total_trades': total_trades,
            'winning_trades': winning_trades,
            'losing_trades': losing_trades,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'max_drawdown': max_drawdown,
            'sharpe_ratio': sharpe
        }

    def _calculate_metrics_chunked_sync(self, trades_df: pd.DataFrame, timeframe: str) -> Dict:
        """Calculate metrics in chunks synchronously."""
        try:
            chunks = [
                trades_df[i:i + self.chunk_size]
                for i in range(0, len(trades_df), self.chunk_size)
            ]
            
            chunk_results = [
                self._calculate_metrics_sync(chunk, timeframe)
                for chunk in chunks
            ]
            
            return self._combine_chunk_results(chunk_results)
        except Exception as e:
            logging.error(f"Error calculating chunked metrics: {e}")
            return self._get_empty_metrics()

    async def _calculate_metrics_single(self, trades_df: pd.DataFrame, timeframe: str) -> Dict:
        """Calculate metrics for a single chunk asynchronously."""
        try:
            loop = asyncio.get_running_loop()
            metrics = await loop.run_in_executor(
                None,
                partial(self._calculate_metrics_sync, trades_df, timeframe)
            )
            return metrics
        except Exception as e:
            logging.error(f"Error calculating single chunk metrics: {e}")
            return self._get_empty_metrics()

    async def _calculate_metrics_chunked(self, trades_df: pd.DataFrame, timeframe: str) -> Dict:
        """Calculate metrics in chunks asynchronously."""
        try:
            chunks = [
                trades_df[i:i + self.chunk_size]
                for i in range(0, len(trades_df), self.chunk_size)
            ]
            
            tasks = [
                self._calculate_metrics_single(chunk, timeframe)
                for chunk in chunks
            ]
            chunk_results = await asyncio.gather(*tasks)
            
            return self._combine_chunk_results(chunk_results)
        except Exception as e:
            logging.error(f"Error calculating chunked metrics: {e}")
            return self._get_empty_metrics()

    def _combine_chunk_results(self, chunk_results: List[Dict]) -> Dict:
        """Combine metrics from multiple chunks."""
        combined = {
            'total_pnl': sum(r['total_pnl'] for r in chunk_results),
            'total_trades': sum(r['total_trades'] for r in chunk_results),
            'winning_trades': sum(r['winning_trades'] for r in chunk_results),
            'losing_trades': sum(r['losing_trades'] for r in chunk_results),
        }
        
        combined['win_rate'] = (
            combined['winning_trades'] / combined['total_trades'] * 100
            if combined['total_trades'] > 0 else 0
        )
        
        weights = [r['total_trades'] for r in chunk_results]
        # Safely handle zero-weight scenario
        if sum(weights) == 0:
            return self._get_empty_metrics()
        
        combined['avg_win'] = np.average([r['avg_win'] for r in chunk_results], weights=weights)
        combined['avg_loss'] = np.average([r['avg_loss'] for r in chunk_results], weights=weights)
        combined['max_drawdown'] = max(r['max_drawdown'] for r in chunk_results)
        combined['sharpe_ratio'] = np.average([r['sharpe_ratio'] for r in chunk_results], weights=weights)
        
        return combined

    def calculate_sharpe_ratio(self, returns: pd.Series) -> float:
        """
        Calculate Sharpe ratio from returns.
        
        Args:
            returns: Series of daily returns
            
        Returns:
            float: Calculated Sharpe ratio
        """
        try:
            risk_free_rate = 0.02  # 2% annual risk-free rate
            
            # Annualize parameters
            avg_return = returns.mean() * 252  # Annualized return
            std_dev = returns.std() * np.sqrt(252)  # Annualized volatility
            
            if std_dev == 0:
                return 0
                
            return (avg_return - risk_free_rate) / std_dev
        except Exception as e:
            logging.error(f"Error calculating Sharpe ratio: {e}")
            return 0

    def _get_empty_metrics(self) -> Dict:
        """Return empty metrics structure for error cases."""
        return {
            'total_pnl': 0,
            'win_rate': 0,
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'avg_win': 0,
            'avg_loss': 0,
            'max_drawdown': 0,
            'sharpe_ratio': 0
        }

    async def get_performance_alerts(self) -> List[str]:
        """
        Generate performance-based alerts asynchronously.
        
        Returns:
            List of alert messages
        """
        alerts = []
        try:
            # Replace `asyncio.timeout` with `asyncio.wait_for`
            metrics = await asyncio.wait_for(self.calculate_metrics_async(), timeout=self.api_timeout)

            # Check drawdown
            if metrics['max_drawdown'] > 20:
                alerts.append(f"Critical drawdown alert: {metrics['max_drawdown']:.1f}%")
            elif metrics['max_drawdown'] > 10:
                alerts.append(f"High drawdown warning: {metrics['max_drawdown']:.1f}%")
            
            # Check win rate
            if metrics['win_rate'] < 40:
                alerts.append(f"Low win rate alert: {metrics['win_rate']:.1f}%")
            
            # Check Sharpe ratio
            if metrics['sharpe_ratio'] < 0.5:
                alerts.append(f"Low Sharpe ratio alert: {metrics['sharpe_ratio']:.2f}")
            
            # Check recent performance
            recent_metrics = await asyncio.wait_for(
                self.calculate_metrics_async(timeframe='daily'),
                timeout=self.api_timeout
            )
            if recent_metrics['total_pnl'] < -1000:  # Example threshold
                alerts.append(f"Significant daily loss: ${abs(recent_metrics['total_pnl']):.2f}")
                
        except asyncio.TimeoutError:
            logging.error("Timeout generating performance alerts")
        except Exception as e:
            logging.error(f"Error generating performance alerts: {e}")
            
        return alerts

    def get_performance_alerts_sync(self) -> List[str]:
        """
        Generate performance-based alerts synchronously.
        
        Returns:
            List of alert messages
        """
        alerts = []
        try:
            metrics = self.calculate_metrics()
            
            # Check drawdown
            if metrics['max_drawdown'] > 20:
                alerts.append(f"Critical drawdown alert: {metrics['max_drawdown']:.1f}%")
            elif metrics['max_drawdown'] > 10:
                alerts.append(f"High drawdown warning: {metrics['max_drawdown']:.1f}%")
            
            # Check win rate
            if metrics['win_rate'] < 40:
                alerts.append(f"Low win rate alert: {metrics['win_rate']:.1f}%")
            
            # Check Sharpe ratio
            if metrics['sharpe_ratio'] < 0.5:
                alerts.append(f"Low Sharpe ratio alert: {metrics['sharpe_ratio']:.2f}")
            
            # Check recent performance
            recent_metrics = self.calculate_metrics(timeframe='daily')
            if recent_metrics['total_pnl'] < -1000:  # Example threshold
                alerts.append(f"Significant daily loss: ${abs(recent_metrics['total_pnl']):.2f}")
                
        except Exception as e:
            logging.error(f"Error generating performance alerts: {e}")
            
        return alerts
