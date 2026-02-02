#!/usr/bin/env python3
"""
ML Feature Engineering
Extract features voor machine learning model
"""

from typing import Dict, List, Optional
import numpy as np

class MLFeatureEngineer:
    def __init__(self):
        self.feature_names = []
    
    def extract_features(self, candles: List[Dict], lookback: int = 50) -> Dict:
        """
        Extract alle features voor ML model
        
        Args:
            candles: List of candlestick data
            lookback: Number of candles to use for feature calculation
        
        Returns:
            Dict with feature names and values
        """
        if len(candles) < lookback:
            lookback = len(candles)
        
        recent_candles = candles[-lookback:] if candles else []
        
        if not recent_candles:
            return {}
        
        # Extract price data
        opens = [float(c.get('open', 0)) for c in recent_candles]
        highs = [float(c.get('high', 0)) for c in recent_candles]
        lows = [float(c.get('low', 0)) for c in recent_candles]
        closes = [float(c.get('close', 0)) for c in recent_candles]
        volumes = [float(c.get('volume', 0)) for c in recent_candles]
        
        features = {}
        
        # 1. Technical Indicators
        features.update(self._get_technical_indicators(closes, highs, lows))
        
        # 2. Candlestick Patterns
        features.update(self._get_pattern_features(recent_candles))
        
        # 3. Support/Resistance Features
        features.update(self._get_sr_features(highs, lows, closes))
        
        # 4. Volume Features
        features.update(self._get_volume_features(volumes, closes))
        
        # 5. Momentum Features
        features.update(self._get_momentum_features(closes))
        
        # 6. Volatility Features
        features.update(self._get_volatility_features(highs, lows, closes))
        
        # 7. Market Structure Features
        features.update(self._get_market_structure_features(closes, highs, lows))
        
        self.feature_names = list(features.keys())
        return features
    
    def _get_technical_indicators(self, closes: List[float], highs: List[float], lows: List[float]) -> Dict:
        """Extract technical indicator features"""
        features = {}
        
        if len(closes) < 50:
            return features
        
        # Moving Averages
        features['sma_20'] = np.mean(closes[-20:]) if len(closes) >= 20 else closes[-1]
        features['sma_50'] = np.mean(closes[-50:]) if len(closes) >= 50 else features['sma_20']
        features['ema_12'] = self._calculate_ema(closes, 12)
        features['ema_26'] = self._calculate_ema(closes, 26) if len(closes) >= 26 else features['ema_12']
        
        # RSI
        features['rsi'] = self._calculate_rsi(closes, 14)
        
        # MACD
        macd = self._calculate_macd(closes)
        features['macd'] = macd.get('macd', 0)
        features['macd_signal'] = macd.get('signal', 0)
        features['macd_histogram'] = macd.get('histogram', 0)
        
        # Bollinger Bands
        bb = self._calculate_bollinger_bands(closes, 20)
        features['bb_upper'] = bb.get('upper', 0)
        features['bb_middle'] = bb.get('middle', 0)
        features['bb_lower'] = bb.get('lower', 0)
        features['bb_width'] = bb.get('width', 0)
        features['bb_position'] = bb.get('position', 0)  # 0-1, where price is in band
        
        # ATR (Average True Range)
        features['atr'] = self._calculate_atr(highs, lows, closes, 14)
        
        # ADX (Average Directional Index)
        features['adx'] = self._calculate_adx(highs, lows, closes, 14)
        
        # Price position relative to indicators
        current_price = closes[-1]
        features['price_vs_sma20'] = (current_price - features['sma_20']) / features['sma_20'] if features['sma_20'] > 0 else 0
        features['price_vs_sma50'] = (current_price - features['sma_50']) / features['sma_50'] if features['sma_50'] > 0 else 0
        
        return features
    
    def _get_pattern_features(self, candles: List[Dict]) -> Dict:
        """Extract candlestick pattern features"""
        features = {}
        
        if len(candles) < 3:
            return features
        
        # Analyze last 3 candles
        recent = candles[-3:]
        
        # Pattern flags (one-hot encoded)
        features['pattern_hammer'] = 0
        features['pattern_shooting_star'] = 0
        features['pattern_doji'] = 0
        features['pattern_bullish_engulfing'] = 0
        features['pattern_bearish_engulfing'] = 0
        
        for candle in recent:
            open_price = float(candle.get('open', 0))
            close_price = float(candle.get('close', 0))
            high_price = float(candle.get('high', 0))
            low_price = float(candle.get('low', 0))
            
            if open_price == 0 or close_price == 0:
                continue
            
            body_size = abs(close_price - open_price)
            total_range = high_price - low_price
            
            if total_range == 0:
                continue
            
            body_ratio = body_size / total_range
            upper_wick = high_price - max(open_price, close_price)
            lower_wick = min(open_price, close_price) - low_price
            
            # Doji
            if body_ratio < 0.1:
                features['pattern_doji'] = 1
            
            # Hammer
            if body_ratio < 0.3 and lower_wick > body_size * 2 and upper_wick < body_size:
                features['pattern_hammer'] = 1
            
            # Shooting Star
            if body_ratio < 0.3 and upper_wick > body_size * 2 and lower_wick < body_size:
                features['pattern_shooting_star'] = 1
        
        # Engulfing patterns (need 2 candles)
        if len(recent) >= 2:
            prev = recent[-2]
            curr = recent[-1]
            
            prev_open = float(prev.get('open', 0))
            prev_close = float(prev.get('close', 0))
            curr_open = float(curr.get('open', 0))
            curr_close = float(curr.get('close', 0))
            
            # Bullish engulfing
            if prev_close < prev_open and curr_close > curr_open:
                if curr_open < prev_close and curr_close > prev_open:
                    features['pattern_bullish_engulfing'] = 1
            
            # Bearish engulfing
            if prev_close > prev_open and curr_close < curr_open:
                if curr_open > prev_close and curr_close < prev_open:
                    features['pattern_bearish_engulfing'] = 1
        
        return features
    
    def _get_sr_features(self, highs: List[float], lows: List[float], closes: List[float]) -> Dict:
        """Extract support/resistance features"""
        features = {}
        
        if len(closes) < 20:
            return features
        
        current_price = closes[-1]
        
        # Find local minima (support) and maxima (resistance)
        support_levels = []
        resistance_levels = []
        
        for i in range(2, len(lows) - 2):
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                support_levels.append(lows[i])
            if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                resistance_levels.append(highs[i])
        
        # Distance to nearest support/resistance
        valid_support = [s for s in support_levels if s < current_price]
        valid_resistance = [r for r in resistance_levels if r > current_price]
        
        if valid_support:
            nearest_support = max(valid_support)
            features['distance_to_support'] = (current_price - nearest_support) / current_price if current_price > 0 else 0
            features['support_strength'] = sum(1 for s in support_levels if abs(s - nearest_support) < (nearest_support * 0.001))
        else:
            features['distance_to_support'] = 0.1  # Default
            features['support_strength'] = 0
        
        if valid_resistance:
            nearest_resistance = min(valid_resistance)
            features['distance_to_resistance'] = (nearest_resistance - current_price) / current_price if current_price > 0 else 0
            features['resistance_strength'] = sum(1 for r in resistance_levels if abs(r - nearest_resistance) < (nearest_resistance * 0.001))
        else:
            features['distance_to_resistance'] = 0.1  # Default
            features['resistance_strength'] = 0
        
        return features
    
    def _get_volume_features(self, volumes: List[float], closes: List[float]) -> Dict:
        """Extract volume-based features"""
        features = {}
        
        if len(volumes) < 20:
            return features
        
        # Volume moving average
        features['volume_sma_20'] = np.mean(volumes[-20:]) if len(volumes) >= 20 else volumes[-1] if volumes else 0
        features['volume_ratio'] = volumes[-1] / features['volume_sma_20'] if features['volume_sma_20'] > 0 else 1
        
        # Volume trend
        if len(volumes) >= 5:
            recent_volume = np.mean(volumes[-5:])
            older_volume = np.mean(volumes[-10:-5]) if len(volumes) >= 10 else recent_volume
            features['volume_trend'] = (recent_volume - older_volume) / older_volume if older_volume > 0 else 0
        else:
            features['volume_trend'] = 0
        
        return features
    
    def _get_momentum_features(self, closes: List[float]) -> Dict:
        """Extract momentum features"""
        features = {}
        
        if len(closes) < 10:
            return features
        
        # Price change over different periods
        features['momentum_5'] = (closes[-1] - closes[-5]) / closes[-5] if closes[-5] > 0 else 0
        features['momentum_10'] = (closes[-1] - closes[-10]) / closes[-10] if len(closes) >= 10 and closes[-10] > 0 else 0
        features['momentum_20'] = (closes[-1] - closes[-20]) / closes[-20] if len(closes) >= 20 and closes[-20] > 0 else 0
        
        # Rate of change
        features['roc_5'] = features['momentum_5'] * 100
        features['roc_10'] = features['momentum_10'] * 100
        
        return features
    
    def _get_volatility_features(self, highs: List[float], lows: List[float], closes: List[float]) -> Dict:
        """Extract volatility features"""
        features = {}
        
        if len(closes) < 20:
            return features
        
        # ATR already calculated in technical indicators
        # Additional volatility metrics
        price_changes = [abs(closes[i] - closes[i-1]) / closes[i-1] if closes[i-1] > 0 else 0 
                        for i in range(1, len(closes))]
        
        features['volatility_20'] = np.std(price_changes[-20:]) if len(price_changes) >= 20 else 0
        features['volatility_5'] = np.std(price_changes[-5:]) if len(price_changes) >= 5 else 0
        features['volatility_ratio'] = features['volatility_5'] / features['volatility_20'] if features['volatility_20'] > 0 else 1
        
        return features
    
    def _get_market_structure_features(self, closes: List[float], highs: List[float], lows: List[float]) -> Dict:
        """Extract market structure features"""
        features = {}
        
        if len(closes) < 20:
            return features
        
        # Higher highs / lower lows detection
        recent_highs = highs[-10:]
        recent_lows = lows[-10:]
        
        higher_highs = sum(1 for i in range(1, len(recent_highs)) if recent_highs[i] > recent_highs[i-1])
        lower_lows = sum(1 for i in range(1, len(recent_lows)) if recent_lows[i] < recent_lows[i-1])
        
        features['higher_highs_count'] = higher_highs
        features['lower_lows_count'] = lower_lows
        features['trend_strength'] = (higher_highs - lower_lows) / 10.0
        
        # Price position in recent range
        recent_range_high = max(highs[-20:])
        recent_range_low = min(lows[-20:])
        range_size = recent_range_high - recent_range_low
        
        if range_size > 0:
            features['price_position_in_range'] = (closes[-1] - recent_range_low) / range_size
        else:
            features['price_position_in_range'] = 0.5
        
        return features
    
    def prepare_training_data(self, historical_data: List[Dict], labels: List[str]) -> tuple:
        """
        Prepare training data for ML model
        
        Args:
            historical_data: List of historical candlestick data
            labels: List of labels ('BUY', 'SELL', 'NEUTRAL')
        
        Returns:
            (X, y) tuple where X is feature matrix and y is label array
        """
        X = []
        y = []
        
        for i, candles in enumerate(historical_data):
            features = self.extract_features(candles)
            if features and i < len(labels):
                # Convert to array
                feature_vector = [features.get(name, 0) for name in self.feature_names] if self.feature_names else list(features.values())
                X.append(feature_vector)
                
                # Convert label to numeric
                label = labels[i]
                if label == 'BUY':
                    y.append(1)
                elif label == 'SELL':
                    y.append(-1)
                else:
                    y.append(0)
        
        return np.array(X), np.array(y)
    
    # Helper methods for technical indicators
    def _calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return prices[-1] if prices else 0
        
        multiplier = 2.0 / (period + 1)
        ema = prices[0]
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        return ema
    
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0
        
        gains = []
        losses = []
        
        for i in range(1, len(prices)):
            change = prices[i] - prices[i-1]
            if change > 0:
                gains.append(change)
                losses.append(0)
            else:
                gains.append(0)
                losses.append(abs(change))
        
        if len(gains) < period:
            return 50.0
        
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        return rsi
    
    def _calculate_macd(self, prices: List[float], fast: int = 12, slow: int = 26) -> Dict:
        """Calculate MACD"""
        if len(prices) < slow:
            return {'macd': 0, 'signal': 0, 'histogram': 0}
        
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        macd = ema_fast - ema_slow
        
        signal_line = macd * 0.9  # Approximation
        histogram = macd - signal_line
        
        return {
            'macd': macd,
            'signal': signal_line,
            'histogram': histogram
        }
    
    def _calculate_bollinger_bands(self, prices: List[float], period: int = 20, std_dev: float = 2.0) -> Dict:
        """Calculate Bollinger Bands"""
        if len(prices) < period:
            current = prices[-1] if prices else 0
            return {'upper': current, 'middle': current, 'lower': current, 'width': 0, 'position': 0.5}
        
        sma = np.mean(prices[-period:])
        std = np.std(prices[-period:])
        
        upper = sma + (std * std_dev)
        lower = sma - (std * std_dev)
        width = upper - lower
        current_price = prices[-1]
        
        position = (current_price - lower) / width if width > 0 else 0.5
        
        return {
            'upper': upper,
            'middle': sma,
            'lower': lower,
            'width': width,
            'position': position
        }
    
    def _calculate_atr(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """Calculate Average True Range"""
        if len(highs) < period + 1:
            return 0
        
        true_ranges = []
        for i in range(1, len(highs)):
            tr1 = highs[i] - lows[i]
            tr2 = abs(highs[i] - closes[i-1])
            tr3 = abs(lows[i] - closes[i-1])
            true_ranges.append(max(tr1, tr2, tr3))
        
        if len(true_ranges) < period:
            return 0
        
        return np.mean(true_ranges[-period:])
    
    def _calculate_adx(self, highs: List[float], lows: List[float], closes: List[float], period: int = 14) -> float:
        """Calculate Average Directional Index (simplified)"""
        if len(highs) < period + 1:
            return 0
        
        # Simplified ADX calculation
        plus_dm = []
        minus_dm = []
        
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
        
        if len(plus_dm) < period:
            return 0
        
        avg_plus_dm = np.mean(plus_dm[-period:])
        avg_minus_dm = np.mean(minus_dm[-period:])
        
        if avg_plus_dm + avg_minus_dm == 0:
            return 0
        
        dx = 100 * abs(avg_plus_dm - avg_minus_dm) / (avg_plus_dm + avg_minus_dm)
        return dx

if __name__ == "__main__":
    # Test feature engineering
    engineer = MLFeatureEngineer()
    
    # Sample candles
    test_candles = [
        {'open': 2500, 'high': 2505, 'low': 2495, 'close': 2503, 'volume': 1000},
        {'open': 2503, 'high': 2510, 'low': 2500, 'close': 2508, 'volume': 1200},
        {'open': 2508, 'high': 2512, 'low': 2505, 'close': 2510, 'volume': 1100},
    ]
    
    features = engineer.extract_features(test_candles)
    print("Extracted Features:")
    for key, value in features.items():
        print(f"  {key}: {value:.4f}" if isinstance(value, (int, float)) else f"  {key}: {value}")
