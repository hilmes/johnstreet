# /src/core/analysis.py
import logging
import statistics
from typing import Any, Dict, Optional, List


class PerformanceMonitor:
    """
    A class responsible for calculating or retrieving various
    performance metrics for display in your AnalysisWidget (or beyond).

    In a real app, you'd replace dummy data with actual queries
    from your data_source (database, CSV logs, etc.).
    """

    def __init__(self, data_source: Optional[Any] = None):
        """
        :param data_source: Optional object for pulling real trade or performance data.
                           Could be a database connection, an ORM model, etc.
        """
        self.data_source = data_source

    def calculate_metrics(self, timeframe: str) -> Dict[str, float]:
        """
        Calculate overall performance metrics for the given timeframe.

        Return a dictionary with fields your AnalysisWidget expects, e.g.:
            {
                "total_pnl": 12345.67,
                "win_rate": 0.64,
                "sharpe_ratio": 1.82,
                "max_drawdown": 0.12,
                "total_trades": 154,
                "avg_trade_pnl": 80.33,
                "winning_trades": 95,
                "losing_trades": 59,
                "max_win": 1400.00,
                "max_loss": 650.00
            }
        """
        logging.debug(f"[analysis.py] Calculating metrics for timeframe: {timeframe}")

        # Example dummy logic
        dummy_all_time = {
            "total_pnl": 12345.67,
            "win_rate": 0.645,
            "sharpe_ratio": 1.82,
            "max_drawdown": 0.123,
            "total_trades": 154,
            "avg_trade_pnl": 80.33,
            "winning_trades": 95,
            "losing_trades": 59,
            "max_win": 1400.00,
            "max_loss": 650.00,
        }

        dummy_monthly = {
            "total_pnl": 2123.45,
            "win_rate": 0.610,
            "sharpe_ratio": 1.35,
            "max_drawdown": 0.095,
            "total_trades": 42,
            "avg_trade_pnl": 50.28,
            "winning_trades": 26,
            "losing_trades": 16,
            "max_win": 600.00,
            "max_loss": 300.00,
        }

        # Convert user timeframe to a standard key
        tf_lower = timeframe.lower()
        if tf_lower in ["all", "lifetime"]:
            return dummy_all_time
        elif tf_lower in ["month", "30d"]:
            return dummy_monthly
        else:
            # Default to monthly data
            return dummy_monthly

    def get_pair_performance(self, timeframe: str) -> Dict[str, Dict[str, float]]:
        """
        Return per-pair performance metrics, for example:
            {
                "BTC/USD": {"total_pnl": 5250.00, "win_rate": 0.655, "max_drawdown": 0.062},
                "ETH/USD": {"total_pnl": 3100.00, "win_rate": 0.583, "max_drawdown": 0.081},
                ...
            }
        """
        logging.debug(f"[analysis.py] Getting pair performance for timeframe: {timeframe}")

        dummy_all_time_pairs = {
            "BTC/USD": {"total_pnl": 5250.00, "win_rate": 0.655, "max_drawdown": 0.062},
            "ETH/USD": {"total_pnl": 3100.00, "win_rate": 0.583, "max_drawdown": 0.081},
            "SOL/USD": {"total_pnl": 1750.00, "win_rate": 0.520, "max_drawdown": 0.115},
        }

        dummy_monthly_pairs = {
            "BTC/USD": {"total_pnl": 1500.00, "win_rate": 0.600, "max_drawdown": 0.040},
            "ETH/USD": {"total_pnl": 900.00,  "win_rate": 0.550, "max_drawdown": 0.075},
        }

        tf_lower = timeframe.lower()
        if tf_lower in ["all", "lifetime"]:
            return dummy_all_time_pairs
        elif tf_lower in ["month", "30d"]:
            return dummy_monthly_pairs
        else:
            # Default to monthly
            return dummy_monthly_pairs

    def get_trade_list(self, timeframe: str) -> List[Dict[str, Any]]:
        """
        Optional: Return a detailed list of trades for the timeframe.
        Each trade could have fields like 'pair', 'entry_time', 'exit_time',
        'pnl', 'duration', etc.
        
        e.g.,
        [
            {
                "pair": "BTC/USD",
                "entry_time": "2024-01-15 10:00:00",
                "exit_time": "2024-01-16 14:30:00",
                "pnl": 180.50,
                "duration": 1.1875  # days
            },
            ...
        ]
        """
        logging.debug(f"[analysis.py] Fetching trade list for timeframe: {timeframe}")

        # Dummy example data
        dummy_trades = [
            {
                "pair": "BTC/USD",
                "entry_time": "2024-01-15 10:00:00",
                "exit_time": "2024-01-16 14:30:00",
                "pnl": 180.50,
                "duration": 1.1875,  # days
            },
            {
                "pair": "ETH/USD",
                "entry_time": "2024-02-01 09:15:00",
                "exit_time": "2024-02-03 11:00:00",
                "pnl": -95.75,
                "duration": 2.0833,
            },
        ]
        return dummy_trades

    def get_equity_curve(self, timeframe: str) -> List[float]:
        """
        Optional: Return an equity curve (cumulative P&L) list for charting.
        Example result: [0.0, 50.0, 120.0, 90.0, 200.0, ...]
        """
        logging.debug(f"[analysis.py] Generating equity curve for timeframe: {timeframe}")

        # Example dummy data: a hypothetical P&L progression
        return [0.0, 50.0, 120.0, 90.0, 200.0, 180.0, 300.0]

    def rolling_drawdown(self, equity_curve: List[float]) -> float:
        """
        Optional: Compute a rolling drawdown given an equity curve.
        Return the maximum drawdown (as a fraction, e.g. 0.12 == 12%).
        """
        if not equity_curve:
            return 0.0

        peak = equity_curve[0]
        max_drawdown = 0.0
        for value in equity_curve:
            if value > peak:
                peak = value
            drawdown = (peak - value) / peak
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        return max_drawdown

    def rolling_sharpe_ratio(self, equity_curve: List[float], risk_free_rate: float = 0.02) -> float:
        """
        Optional: Compute a simplistic sharpe ratio over an equity curve.
        This is a *very naive* approach. In real usage, you'd do a daily returns log,
        annualize the returns, etc.
        """
        if len(equity_curve) < 2:
            return 0.0

        # Create daily (or period-based) returns
        returns = []
        for i in range(1, len(equity_curve)):
            prev = equity_curve[i - 1]
            curr = equity_curve[i]
            if prev == 0.0:
                returns.append(0.0)
            else:
                returns.append((curr - prev) / abs(prev))

        # Mean and std of returns
        avg_return = statistics.mean(returns) if returns else 0.0
        std_return = statistics.pstdev(returns) if len(returns) > 1 else 1e-9

        # Basic annualized Sharpe approximation if each step is ~1 day
        # (You might scale by sqrt(252) or 365 depending on your timescale.)
        sharpe = (avg_return - (risk_free_rate / 252)) / (std_return if std_return != 0 else 1e-9)
        return sharpe
