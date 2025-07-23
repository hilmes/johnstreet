import pandas as pd
import numpy as np
from typing import Tuple, List, Dict
from dataclasses import dataclass
import logging

@dataclass
class IndicatorSignal:
    value: float
    signal: str
    description: str

class EnhancedTechnicalAnalysis:
    """Enhanced technical analysis and indicator calculations"""
    
    @staticmethod
    def calculate_sma(prices: pd.Series, period: int) -> pd.Series:
        """Calculate Simple Moving Average"""
        try:
            return prices.rolling(window=period).mean()
        except Exception as e:
            logging.error(f"Error calculating SMA: {e}")
            return pd.Series()
    
    @staticmethod
    def calculate_ema(prices: pd.Series, period: int) -> pd.Series:
        """Calculate Exponential Moving Average"""
        try:
            return prices.ewm(span=period, adjust=False).mean()
        except Exception as e:
            logging.error(f"Error calculating EMA: {e}")
            return pd.Series()
    
    @staticmethod
    def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index"""
        try:
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
            rs = gain / loss
            return 100 - (100 / (1 + rs))
        except Exception as e:
            logging.error(f"Error calculating RSI: {e}")
            return pd.Series()
    
    @staticmethod
    def calculate_bollinger_bands(
        prices: pd.Series, 
        period: int = 20, 
        std_dev: float = 2.0
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate Bollinger Bands"""
        try:
            middle = prices.rolling(window=period).mean()
            std = prices.rolling(window=period).std()
            upper = middle + (std * std_dev)
            lower = middle - (std * std_dev)
            return middle, upper, lower
        except Exception as e:
            logging.error(f"Error calculating Bollinger Bands: {e}")
            return pd.Series(), pd.Series(), pd.Series()
    
    @staticmethod
    def calculate_macd(
        prices: pd.Series,
        fast_period: int = 12,
        slow_period: int = 26,
        signal_period: int = 9
    ) -> Tuple[pd.Series, pd.Series, pd.Series]:
        """Calculate MACD"""
        try:
            fast_ema = prices.ewm(span=fast_period, adjust=False).mean()
            slow_ema = prices.ewm(span=slow_period, adjust=False).mean()
            macd = fast_ema - slow_ema
            signal = macd.ewm(span=signal_period, adjust=False).mean()
            histogram = macd - signal
            return macd, signal, histogram
        except Exception as e:
            logging.error(f"Error calculating MACD: {e}")
            return pd.Series(), pd.Series(), pd.Series()
    
    @staticmethod
    def calculate_atr(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        period: int = 14
    ) -> pd.Series:
        """Calculate Average True Range"""
        try:
            tr1 = high - low
            tr2 = abs(high - close.shift())
            tr3 = abs(low - close.shift())
            tr = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            return tr.rolling(window=period).mean()
        except Exception as e:
            logging.error(f"Error calculating ATR: {e}")
            return pd.Series()
    
    @staticmethod
    def calculate_stochastic(
        high: pd.Series,
        low: pd.Series,
        close: pd.Series,
        k_period: int = 14,
        d_period: int = 3
    ) -> Tuple[pd.Series, pd.Series]:
        """Calculate Stochastic Oscillator"""
        try:
            lowest_low = low.rolling(window=k_period).min()
            highest_high = high.rolling(window=k_period).max()
            k = 100 * (close - lowest_low) / (highest_high - lowest_low)
            d = k.rolling(window=d_period).mean()
            return k, d
        except Exception as e:
            logging.error(f"Error calculating Stochastic: {e}")
            return pd.Series(), pd.Series()

    def analyze_price_action(
        self,
        df: pd.DataFrame,
        pair: str
    ) -> Dict[str, IndicatorSignal]:
        """Comprehensive price action analysis"""
        try:
            results = {}
            
            # Calculate all indicators
            close = df['close']
            high = df['high']
            low = df['low']
            
            # SMA Crossover
            sma_20 = self.calculate_sma(close, 20)
            sma_50 = self.calculate_sma(close, 50)
            
            results['sma_cross'] = IndicatorSignal(
                value=sma_20.iloc[-1],
                signal="BUY" if sma_20.iloc[-1] > sma_50.iloc[-1] else "SELL",
                description="Moving Average Crossover"
            )
            
            # RSI
            rsi = self.calculate_rsi(close)
            results['rsi'] = IndicatorSignal(
                value=rsi.iloc[-1],
                signal="SELL" if rsi.iloc[-1] > 70 else "BUY" if rsi.iloc[-1] < 30 else "NEUTRAL",
                description="Relative Strength Index"
            )
            
            # Bollinger Bands
            bb_mid, bb_upper, bb_lower = self.calculate_bollinger_bands(close)
            bb_pct = (close.iloc[-1] - bb_lower.iloc[-1]) / (bb_upper.iloc[-1] - bb_lower.iloc[-1]) * 100
            
            results['bb'] = IndicatorSignal(
                value=bb_pct,
                signal="SELL" if bb_pct > 80 else "BUY" if bb_pct < 20 else "NEUTRAL",
                description="Bollinger Band Position"
            )
            
            # MACD
            macd, signal, hist = self.calculate_macd(close)
            results['macd'] = IndicatorSignal(
                value=macd.iloc[-1],
                signal="BUY" if macd.iloc[-1] > signal.iloc[-1] else "SELL",
                description="MACD Crossover"
            )
            
            # Stochastic
            k, d = self.calculate_stochastic(high, low, close)
            results['stoch'] = IndicatorSignal(
                value=k.iloc[-1],
                signal="SELL" if k.iloc[-1] > 80 else "BUY" if k.iloc[-1] < 20 else "NEUTRAL",
                description="Stochastic Oscillator"
            )
            
            # Volume Analysis
            volume = df['volume']
            vol_sma = self.calculate_sma(volume, 20)
            results['volume'] = IndicatorSignal(
                value=volume.iloc[-1],
                signal="STRONG" if volume.iloc[-1] > vol_sma.iloc[-1] * 1.5 else "WEAK",
                description="Volume Strength"
            )
            
            # Trend Strength
            atr = self.calculate_atr(high, low, close)
            atr_pct = (atr.iloc[-1] / close.iloc[-1]) * 100
            
            results['trend_strength'] = IndicatorSignal(
                value=atr_pct,
                signal="STRONG" if atr_pct > 2 else "WEAK",
                description="Trend Strength (ATR)"
            )
            
            return results
            
        except Exception as e:
            logging.error(f"Error in price action analysis: {e}")
            return {}

    def generate_trade_signals(
        self,
        df: pd.DataFrame,
        pair: str,
        risk_params: Dict
    ) -> Dict[str, any]:
        """Generate trading signals with risk management"""
        try:
            # Get all indicator signals
            analysis = self.analyze_price_action(df, pair)
            
            # Weight each indicator
            indicator_weights = {
                'sma_cross': 1.0,
                'rsi': 1.0,
                'bb': 0.8,
                'macd': 1.2,
                'stoch': 0.8
            }
            
            # Calculate weighted signals
            buy_signals = 0
            sell_signals = 0
            signal_count = 0
            
            for indicator, signal in analysis.items():
                if indicator in indicator_weights:
                    weight = indicator_weights[indicator]
                    if signal.signal == "BUY":
                        buy_signals += weight
                    elif signal.signal == "SELL":
                        sell_signals += weight
                    signal_count += weight
            
            # Calculate signal strengths
            if signal_count > 0:
                buy_strength = (buy_signals / signal_count) * 100
                sell_strength = (sell_signals / signal_count) * 100
            else:
                buy_strength = sell_strength = 0
            
            # Risk-adjusted position sizing
            max_position = risk_params.get('max_position_size', 1.0)
            account_size = risk_params.get('account_size', 100000)
            risk_per_trade = risk_params.get('risk_per_trade', 0.01)
            
            current_price = df['close'].iloc[-1]
            atr = self.calculate_atr(df['high'], df['low'], df['close']).iloc[-1]
            stop_distance = atr * 2
            
            # Determine signal and position size
            if buy_strength > sell_strength and buy_strength > 60:
                signal = "BUY"
                strength = buy_strength
                position_size = (strength / 100) * max_position
            elif sell_strength > buy_strength and sell_strength > 60:
                signal = "SELL"
                strength = sell_strength
                position_size = (strength / 100) * max_position
            else:
                signal = "NEUTRAL"
                strength = 0
                position_size = 0
            
            # Risk adjustment
            if stop_distance > 0:
                risk_amount = account_size * risk_per_trade
                risk_adjusted_size = risk_amount / stop_distance
                position_size = min(position_size, risk_adjusted_size)
            
            return {
                'signal': signal,
                'strength': strength,
                'position_size': position_size,
                'stop_loss': current_price - (stop_distance if signal == "BUY" else -stop_distance),
                'take_profit': current_price + (stop_distance * 2 if signal == "BUY" else -stop_distance * 2),
                'indicators': analysis
            }
            
        except Exception as e:
            logging.error(f"Error generating trade signals: {e}")
            return {
                'signal': 'ERROR',
                'strength': 0,
                'position_size': 0,
                'stop_loss': 0,
                'take_profit': 0,
                'indicators': {}
            }
    
    @staticmethod
    def calculate_pivot_points(
        high: float,
        low: float,
        close: float
    ) -> Dict[str, float]:
        """Calculate pivot points and support/resistance levels"""
        try:
            pivot = (high + low + close) / 3
            
            r1 = (2 * pivot) - low
            r2 = pivot + (high - low)
            r3 = high + 2 * (pivot - low)
            
            s1 = (2 * pivot) - high
            s2 = pivot - (high - low)
            s3 = low - 2 * (high - pivot)
            
            return {
                'pivot': pivot,
                'r1': r1, 'r2': r2, 'r3': r3,
                's1': s1, 's2': s2, 's3': s3
            }
        except Exception as e:
            logging.error(f"Error calculating pivot points: {e}")
            return {}

    @staticmethod
    def detect_pattern(
        df: pd.DataFrame,
        pattern_length: int = 5
    ) -> Dict[str, float]:
        """Detect common chart patterns"""
        try:
            patterns = {}
            close = df['close'].tail(pattern_length)
            high = df['high'].tail(pattern_length)
            low = df['low'].tail(pattern_length)
            
            # Double Top detection
            if len(high) >= pattern_length:
                peaks = []
                for i in range(1, len(high)-1):
                    if high.iloc[i] > high.iloc[i-1] and high.iloc[i] > high.iloc[i+1]:
                        peaks.append(high.iloc[i])
                if len(peaks) >= 2 and abs(peaks[-1] - peaks[-2]) / peaks[-1] < 0.01:
                    patterns['double_top'] = peaks[-1]
            
            # Double Bottom detection
            if len(low) >= pattern_length:
                troughs = []
                for i in range(1, len(low)-1):
                    if low.iloc[i] < low.iloc[i-1] and low.iloc[i] < low.iloc[i+1]:
                        troughs.append(low.iloc[i])
                if len(troughs) >= 2 and abs(troughs[-1] - troughs[-2]) / troughs[-1] < 0.01:
                    patterns['double_bottom'] = troughs[-1]
            
            return patterns
        except Exception as e:
            logging.error(f"Error detecting patterns: {e}")
            return {}