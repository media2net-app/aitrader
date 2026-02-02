#!/usr/bin/env python3
"""
Market Regime Detection
Detect trending/ranging/volatile markets
"""

from typing import Dict, List
import numpy as np

class MarketRegimeDetector:
    def __init__(self):
        self.regimes = ['trending_bullish', 'trending_bearish', 'ranging', 'volatile']
    
    def detect_regime(self, candles: List[Dict], lookback: int = 50) -> str:
        """
        Detect current market regime
        
        Args:
            candles: List of candlestick data
            lookback: Number of candles to analyze
        
        Returns:
            Regime string: 'trending_bullish', 'trending_bearish', 'ranging', 'volatile'
        """
        if len(candles) < lookback:
            lookback = len(candles)
        
        if lookback < 20:
            return 'ranging'  # Default
        
        recent_candles = candles[-lookback:]
        
        # Extract price data
        highs = [float(c.get('high', 0)) for c in recent_candles]
        lows = [float(c.get('low', 0)) for c in recent_candles]
        closes = [float(c.get('close', 0)) for c in recent_candles]
        
        # Calculate indicators
        adx = self._calculate_adx(highs, lows, closes, 14)
        atr = self._calculate_atr(highs, lows, closes, 14)
        trend = self._detect_trend(closes)
        volatility = self._calculate_volatility(closes)
        
        # Regime detection logic
        # 1. Check for volatility
        avg_atr = np.mean([self._calculate_atr(highs[:i+20], lows[:i+20], closes[:i+20], 14) 
                           for i in range(20, len(closes))]) if len(closes) > 20 else atr
        if atr > avg_atr * 1.5:
            return 'volatile'
        
        # 2. Check for trending (ADX > 25)
        if adx > 25:
            if trend > 0:
                return 'trending_bullish'
            else:
                return 'trending_bearish'
        
        # 3. Default to ranging
        return 'ranging'
    
    def get_strategy_for_regime(self, regime: str) -> Dict:
        """
        Get beste strategie parameters voor regime
        
        Args:
            regime: Market regime
        
        Returns:
            Strategy parameters dict
        """
        strategies = {
            'trending_bullish': {
                'sma_short': 20,
                'sma_long': 50,
                'rsi_period': 14,
                'confidence_threshold': 60,
                'risk_reward_ratio': 2.0,
                'description': 'Trend following - bullish trend detected'
            },
            'trending_bearish': {
                'sma_short': 20,
                'sma_long': 50,
                'rsi_period': 14,
                'confidence_threshold': 60,
                'risk_reward_ratio': 2.0,
                'description': 'Trend following - bearish trend detected'
            },
            'ranging': {
                'sma_short': 10,
                'sma_long': 30,
                'rsi_period': 14,
                'confidence_threshold': 70,  # Hoger threshold voor ranging
                'risk_reward_ratio': 1.5,  # Tighter RR voor ranging
                'description': 'Range trading - market is sideways'
            },
            'volatile': {
                'sma_short': 25,
                'sma_long': 60,
                'rsi_period': 14,
                'confidence_threshold': 65,
                'risk_reward_ratio': 2.5,  # Wider RR voor volatile
                'description': 'Volatile market - wider stops needed'
            }
        }
        
        return strategies.get(regime, strategies['ranging'])
    
    def _calculate_adx(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """Calculate Average Directional Index"""
        if len(highs) < period + 1:
            return 0
        
        plus_dm = []
        minus_dm = []
        tr_list = []
        
        for i in range(1, len(highs)):
            up_move = highs[i] - highs[i-1]
            down_move = lows[i-1] - lows[i]
            
            if up_move > down_move and up_move > 0:
                plus_dm.append(up_move)
            else:
                plus_dm.append(0)
            
            if down_move > up_move and down_move > 0:
                minus_dm.append(down_move)
            else:
                minus_dm.append(0)
            
            # True Range
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            )
            tr_list.append(tr)
        
        if len(plus_dm) < period:
            return 0
        
        # Smooth DM and TR
        avg_plus_dm = np.mean(plus_dm[-period:])
        avg_minus_dm = np.mean(minus_dm[-period:])
        avg_tr = np.mean(tr_list[-period:])
        
        if avg_tr == 0:
            return 0
        
        # Calculate DI+ and DI-
        di_plus = 100 * (avg_plus_dm / avg_tr)
        di_minus = 100 * (avg_minus_dm / avg_tr)
        
        # Calculate DX
        di_sum = di_plus + di_minus
        if di_sum == 0:
            return 0
        
        dx = 100 * abs(di_plus - di_minus) / di_sum
        
        return dx
    
    def _calculate_atr(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """Calculate Average True Range"""
        if len(highs) < period + 1:
            return 0
        
        true_ranges = []
        for i in range(1, len(highs)):
            tr = max(
                highs[i] - lows[i],
                abs(highs[i] - closes[i-1]),
                abs(lows[i] - closes[i-1])
            )
            true_ranges.append(tr)
        
        if len(true_ranges) < period:
            return 0
        
        return np.mean(true_ranges[-period:])
    
    def _detect_trend(self, closes: List[float]) -> float:
        """
        Detect trend direction
        
        Returns:
            Positive value for uptrend, negative for downtrend
        """
        if len(closes) < 20:
            return 0
        
        # Use SMA crossover
        sma_short = np.mean(closes[-10:])
        sma_long = np.mean(closes[-20:])
        
        # Also check price momentum
        momentum = (closes[-1] - closes[-10]) / closes[-10] if closes[-10] > 0 else 0
        
        # Combined trend signal
        trend = (sma_short - sma_long) / sma_long if sma_long > 0 else 0
        trend += momentum * 0.5
        
        return trend * 100  # Scale to percentage
    
    def _calculate_volatility(self, closes: List[float]) -> float:
        """Calculate price volatility"""
        if len(closes) < 20:
            return 0
        
        returns = [(closes[i] - closes[i-1]) / closes[i-1] if closes[i-1] > 0 else 0 
                  for i in range(1, len(closes))]
        
        return np.std(returns[-20:]) * 100  # As percentage

if __name__ == "__main__":
    # Test market regime detection
    detector = MarketRegimeDetector()
    
    # Sample candles
    test_candles = [
        {'open': 2500, 'high': 2505, 'low': 2495, 'close': 2503, 'volume': 1000},
    ] * 50  # 50 candles
    
    regime = detector.detect_regime(test_candles)
    print(f"Detected Regime: {regime}")
    
    strategy_params = detector.get_strategy_for_regime(regime)
    print(f"Strategy Parameters: {strategy_params}")
