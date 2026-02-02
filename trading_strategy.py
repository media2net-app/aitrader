#!/usr/bin/env python3
"""
AI Trading Strategy Module
Analyzes XAUUSD chart data (candlesticks/OHLC) to determine BUY or SELL signals
Uses technical indicators: Moving Averages, RSI, MACD, etc.
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from collections import defaultdict
import math

class TradingStrategy:
    def __init__(self, bridge_url: str = "http://localhost:5002", parameters: Optional[Dict] = None):
        self.bridge_url = bridge_url
        self.price_cache = None
        self.cache_time = None
        self.cache_duration = 60  # Cache for 60 seconds
        
        # Strategy parameters (can be customized)
        self.parameters = parameters or {}
        self.sma_short = self.parameters.get('sma_short', 20)
        self.sma_long = self.parameters.get('sma_long', 50)
        self.rsi_period = self.parameters.get('rsi_period', 14)
        self.confidence_threshold = self.parameters.get('confidence_threshold', 60)
        self.risk_reward_ratio = self.parameters.get('risk_reward_ratio', 2.0)
    
    def get_candlestick_data(self, symbol: str = "XAUUSD", timeframe: str = "H1", count: int = 100) -> List[Dict]:
        """Get real candlestick/OHLC data from MT5"""
        try:
            response = requests.get(f"{self.bridge_url}/candles/{symbol}/{timeframe}/{count}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    candles = data.get('candles', [])
                    return candles
            return []
        except Exception as e:
            print(f"Error fetching candlestick data: {e}")
            return []
    
    def get_price_history(self, symbol: str = "XAUUSD", count: int = 100) -> List[float]:
        """
        Get price history from candlestick data (close prices)
        """
        candles = self.get_candlestick_data(symbol=symbol, timeframe="H1", count=count)
        
        if candles:
            # Extract close prices from candles
            prices = [float(candle.get('close', 0)) for candle in candles if candle.get('close', 0) > 0]
            return prices
        
        # Fallback: try to get current price and simulate
        try:
            response = requests.get(f"{self.bridge_url}/symbol/{symbol}", timeout=2)
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    current_price = data.get('bid', 0)
                    if current_price > 0:
                        # Generate simulated price history around current price
                        import random
                        base_price = current_price
                        prices = []
                        for i in range(count):
                            variation = random.uniform(-0.001, 0.001)
                            price = base_price * (1 + variation)
                            prices.append(price)
                            base_price = price * (1 + random.uniform(-0.0001, 0.0001))
                        return prices
        except Exception as e:
            print(f"Error getting price history: {e}")
        return []
    
    def calculate_sma(self, prices: List[float], period: int) -> float:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return 0.0
        return sum(prices[-period:]) / period
    
    def calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return 0.0
        multiplier = 2.0 / (period + 1)
        ema = prices[0]
        for price in prices[1:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        return ema
    
    def calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral RSI
        
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
    
    def calculate_macd(self, prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Dict:
        """Calculate MACD (Moving Average Convergence Divergence)"""
        if len(prices) < slow:
            return {'macd': 0, 'signal': 0, 'histogram': 0}
        
        ema_fast = self.calculate_ema(prices, fast)
        ema_slow = self.calculate_ema(prices, slow)
        macd = ema_fast - ema_slow
        
        # For signal line, we'd need MACD history, simplified here
        signal_line = macd * 0.9  # Approximation
        histogram = macd - signal_line
        
        return {
            'macd': macd,
            'signal': signal_line,
            'histogram': histogram
        }
    
    def detect_support_resistance(self, candles: List[Dict], lookback: int = 20) -> Dict:
        """
        Detecteer support en resistance levels op basis van historische highs/lows
        Gebruikt pivot points en lokale minima/maxima
        """
        if len(candles) < lookback:
            return {'support': 0, 'resistance': 0, 'support_strength': 0, 'resistance_strength': 0}
        
        # Extract highs and lows
        highs = [float(c.get('high', 0)) for c in candles[-lookback:]]
        lows = [float(c.get('low', 0)) for c in candles[-lookback:]]
        closes = [float(c.get('close', 0)) for c in candles[-lookback:]]
        
        if not highs or not lows:
            return {'support': 0, 'resistance': 0, 'support_strength': 0, 'resistance_strength': 0}
        
        current_price = closes[-1] if closes else 0
        
        # Vind lokale minima (support) en maxima (resistance)
        # Support: lokale minima die meerdere keren zijn getest
        support_levels = []
        resistance_levels = []
        
        # Zoek naar pivot points (lokale minima/maxima)
        for i in range(2, len(lows) - 2):
            # Support: lokale minimum
            if lows[i] < lows[i-1] and lows[i] < lows[i-2] and lows[i] < lows[i+1] and lows[i] < lows[i+2]:
                support_levels.append(lows[i])
            # Resistance: lokale maximum
            if highs[i] > highs[i-1] and highs[i] > highs[i-2] and highs[i] > highs[i+1] and highs[i] > highs[i+2]:
                resistance_levels.append(highs[i])
        
        # Vind dichtstbijzijnde support en resistance
        valid_support = [s for s in support_levels if s < current_price]
        valid_resistance = [r for r in resistance_levels if r > current_price]
        
        # Sorteer en neem de meest relevante levels
        if valid_support:
            valid_support.sort(reverse=True)  # Dichtstbijzijnde support (hoogste onder current price)
            support = valid_support[0]
            # Bereken strength: hoeveel keer is dit level getest?
            support_strength = sum(1 for s in support_levels if abs(s - support) < (support * 0.001))
        else:
            # Fallback: gebruik recente low
            support = min(lows[-10:]) if lows else current_price * 0.99
            support_strength = 1
        
        if valid_resistance:
            valid_resistance.sort()  # Dichtstbijzijnde resistance (laagste boven current price)
            resistance = valid_resistance[0]
            # Bereken strength
            resistance_strength = sum(1 for r in resistance_levels if abs(r - resistance) < (resistance * 0.001))
        else:
            # Fallback: gebruik recente high
            resistance = max(highs[-10:]) if highs else current_price * 1.01
            resistance_strength = 1
        
        return {
            'support': round(support, 2),
            'resistance': round(resistance, 2),
            'support_strength': support_strength,
            'resistance_strength': resistance_strength,
            'current_price': round(current_price, 2)
        }
    
    def detect_candlestick_patterns(self, candles: List[Dict]) -> Dict:
        """
        Detecteer candlestick patronen (doji, hammer, engulfing, etc.)
        """
        if len(candles) < 3:
            return {'patterns': [], 'signal_strength': 0}
        
        patterns = []
        signal_strength = 0
        
        # Analyseer laatste 3 candles
        recent = candles[-3:]
        
        for i, candle in enumerate(recent):
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
            
            # Doji pattern (zeer kleine body)
            if body_ratio < 0.1:
                patterns.append('DOJI')
                signal_strength += 5  # Neutraal signaal
            
            # Hammer (kleine body bovenaan, lange onderste wick)
            upper_wick = high_price - max(open_price, close_price)
            lower_wick = min(open_price, close_price) - low_price
            if body_ratio < 0.3 and lower_wick > body_size * 2 and upper_wick < body_size:
                patterns.append('HAMMER')
                signal_strength += 15  # Bullish signaal
            
            # Shooting Star (kleine body onderaan, lange bovenste wick)
            if body_ratio < 0.3 and upper_wick > body_size * 2 and lower_wick < body_size:
                patterns.append('SHOOTING_STAR')
                signal_strength -= 15  # Bearish signaal
        
        # Engulfing pattern (twee candles)
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
                    patterns.append('BULLISH_ENGULFING')
                    signal_strength += 20
            
            # Bearish engulfing
            if prev_close > prev_open and curr_close < curr_open:
                if curr_open > prev_close and curr_close < prev_open:
                    patterns.append('BEARISH_ENGULFING')
                    signal_strength -= 20
        
        return {
            'patterns': patterns,
            'signal_strength': signal_strength
        }
    
    def calculate_dynamic_tp_sl(self, signal: str, entry_price: float, candles: List[Dict], 
                                 risk_reward_ratio: float = 2.0) -> Dict:
        """
        Bereken dynamische Take Profit en Stop Loss op basis van support/resistance levels
        """
        if not candles or len(candles) < 20:
            # Fallback naar vaste TP/SL
            if signal == 'BUY':
                return {
                    'tp': entry_price * 1.002,  # ~0.2% winst
                    'sl': entry_price * 0.998,  # ~0.2% verlies
                    'tp_pips': 20,
                    'sl_pips': 10,
                    'method': 'fixed'
                }
            else:  # SELL
                return {
                    'tp': entry_price * 0.998,
                    'sl': entry_price * 1.002,
                    'tp_pips': 20,
                    'sl_pips': 10,
                    'method': 'fixed'
                }
        
        # Detecteer support/resistance
        sr = self.detect_support_resistance(candles, lookback=min(50, len(candles)))
        
        if signal == 'BUY':
            # Voor BUY: TP richting resistance, SL onder support
            if sr['resistance'] > entry_price:
                # Gebruik resistance als TP target (maar niet te ver)
                tp_target = min(sr['resistance'], entry_price * 1.01)  # Max 1% winst
                tp_distance = tp_target - entry_price
                sl_distance = tp_distance / risk_reward_ratio
                sl_target = entry_price - sl_distance
                
                # Zorg dat SL onder support ligt als mogelijk
                if sr['support'] > 0 and sr['support'] < entry_price:
                    sl_target = min(sl_target, sr['support'] * 0.999)  # Net onder support
            else:
                # Geen resistance gevonden, gebruik vaste ratio
                sl_distance = (entry_price - sr['support']) * 0.5 if sr['support'] > 0 else entry_price * 0.002
                tp_distance = sl_distance * risk_reward_ratio
                tp_target = entry_price + tp_distance
                sl_target = entry_price - sl_distance
            
            # Convert naar pips (voor XAUUSD: 1 pip = 0.01)
            tp_pips = int((tp_target - entry_price) / 0.01)
            sl_pips = int((entry_price - sl_target) / 0.01)
            
            return {
                'tp': round(tp_target, 2),
                'sl': round(sl_target, 2),
                'tp_pips': tp_pips,
                'sl_pips': sl_pips,
                'method': 'support_resistance',
                'resistance_level': sr['resistance'],
                'support_level': sr['support']
            }
        
        else:  # SELL
            # Voor SELL: TP richting support, SL boven resistance
            if sr['support'] > 0 and sr['support'] < entry_price:
                # Gebruik support als TP target
                tp_target = max(sr['support'], entry_price * 0.99)  # Min 1% winst
                tp_distance = entry_price - tp_target
                sl_distance = tp_distance / risk_reward_ratio
                sl_target = entry_price + sl_distance
                
                # Zorg dat SL boven resistance ligt als mogelijk
                if sr['resistance'] > entry_price:
                    sl_target = max(sl_target, sr['resistance'] * 1.001)  # Net boven resistance
            else:
                # Geen support gevonden, gebruik vaste ratio
                sl_distance = (sr['resistance'] - entry_price) * 0.5 if sr['resistance'] > entry_price else entry_price * 0.002
                tp_distance = sl_distance * risk_reward_ratio
                tp_target = entry_price - tp_distance
                sl_target = entry_price + sl_distance
            
            # Convert naar pips
            tp_pips = int((entry_price - tp_target) / 0.01)
            sl_pips = int((sl_target - entry_price) / 0.01)
            
            return {
                'tp': round(tp_target, 2),
                'sl': round(sl_target, 2),
                'tp_pips': tp_pips,
                'sl_pips': sl_pips,
                'method': 'support_resistance',
                'resistance_level': sr['resistance'],
                'support_level': sr['support']
            }
    
    def get_history(self, days: int = 30) -> List[Dict]:
        """Get trade history from MT5"""
        try:
            response = requests.get(f"{self.bridge_url}/history", timeout=5)
            if response.status_code == 200:
                data = response.json()
                trades = data.get('trades', [])
                
                # Filter out invalid trades (deposits, withdrawals, etc.)
                valid_trades = []
                for trade in trades:
                    # Skip trades with no symbol (likely deposits/withdrawals)
                    if not trade.get('symbol') or trade.get('symbol') == '':
                        continue
                    # Skip trades with volume 0
                    if float(trade.get('volume', 0)) == 0:
                        continue
                    # Skip trades with unrealistic profit (likely deposits)
                    # But only if volume is 0 or symbol is missing
                    # Profit can be high for large volume trades
                    valid_trades.append(trade)
                
                # Filter by date if needed
                if days:
                    cutoff_date = datetime.now() - timedelta(days=days)
                    filtered_trades = []
                    for trade in valid_trades:
                        trade_time_str = trade.get('time', '')
                        try:
                            # Parse time string (format: "2026.01.30 22:53:38")
                            trade_time = datetime.strptime(trade_time_str, "%Y.%m.%d %H:%M:%S")
                            if trade_time >= cutoff_date:
                                filtered_trades.append(trade)
                        except:
                            # If parsing fails, include the trade anyway
                            filtered_trades.append(trade)
                    return filtered_trades
                return valid_trades
            return []
        except Exception as e:
            print(f"Error fetching history: {e}")
            return []
    
    def analyze_buy_vs_sell(self, trades: List[Dict]) -> Dict:
        """Analyze performance of BUY vs SELL trades"""
        buy_stats = {
            'count': 0,
            'wins': 0,
            'losses': 0,
            'total_profit': 0.0,
            'avg_profit': 0.0,
            'win_rate': 0.0
        }
        
        sell_stats = {
            'count': 0,
            'wins': 0,
            'losses': 0,
            'total_profit': 0.0,
            'avg_profit': 0.0,
            'win_rate': 0.0
        }
        
        for trade in trades:
            trade_type = trade.get('type', '').upper()
            profit = float(trade.get('profit', 0))
            
            if trade_type == 'BUY':
                buy_stats['count'] += 1
                buy_stats['total_profit'] += profit
                if profit > 0:
                    buy_stats['wins'] += 1
                elif profit < 0:
                    buy_stats['losses'] += 1
            elif trade_type == 'SELL':
                sell_stats['count'] += 1
                sell_stats['total_profit'] += profit
                if profit > 0:
                    sell_stats['wins'] += 1
                elif profit < 0:
                    sell_stats['losses'] += 1
        
        # Calculate averages and win rates
        if buy_stats['count'] > 0:
            buy_stats['avg_profit'] = buy_stats['total_profit'] / buy_stats['count']
            buy_stats['win_rate'] = (buy_stats['wins'] / buy_stats['count']) * 100
        
        if sell_stats['count'] > 0:
            sell_stats['avg_profit'] = sell_stats['total_profit'] / sell_stats['count']
            sell_stats['win_rate'] = (sell_stats['wins'] / sell_stats['count']) * 100
        
        return {
            'buy': buy_stats,
            'sell': sell_stats
        }
    
    def analyze_recent_trend(self, trades: List[Dict], recent_count: int = 10) -> Dict:
        """Analyze recent trades to determine trend"""
        if len(trades) < recent_count:
            recent_count = len(trades)
        
        recent_trades = trades[-recent_count:] if trades else []
        
        buy_wins = 0
        buy_total = 0
        sell_wins = 0
        sell_total = 0
        
        for trade in recent_trades:
            trade_type = trade.get('type', '').upper()
            profit = float(trade.get('profit', 0))
            
            if trade_type == 'BUY':
                buy_total += 1
                if profit > 0:
                    buy_wins += 1
            elif trade_type == 'SELL':
                sell_total += 1
                if profit > 0:
                    sell_wins += 1
        
        buy_recent_win_rate = (buy_wins / buy_total * 100) if buy_total > 0 else 0
        sell_recent_win_rate = (sell_wins / sell_total * 100) if sell_total > 0 else 0
        
        return {
            'recent_buy_win_rate': buy_recent_win_rate,
            'recent_sell_win_rate': sell_recent_win_rate,
            'recent_buy_count': buy_total,
            'recent_sell_count': sell_total,
            'recommendation': 'BUY' if buy_recent_win_rate > sell_recent_win_rate else 'SELL' if sell_recent_win_rate > buy_recent_win_rate else 'NEUTRAL'
        }
    
    def analyze_profit_trend(self, trades: List[Dict]) -> Dict:
        """Analyze profit trend over time"""
        if not trades:
            return {'trend': 'NEUTRAL', 'direction': 'NONE'}
        
        # Group by time periods
        buy_profits = []
        sell_profits = []
        
        for trade in trades:
            profit = float(trade.get('profit', 0))
            trade_type = trade.get('type', '').upper()
            
            if trade_type == 'BUY':
                buy_profits.append(profit)
            elif trade_type == 'SELL':
                sell_profits.append(profit)
        
        avg_buy_profit = sum(buy_profits) / len(buy_profits) if buy_profits else 0
        avg_sell_profit = sum(sell_profits) / len(sell_profits) if sell_profits else 0
        
        # Determine trend
        if avg_buy_profit > avg_sell_profit and avg_buy_profit > 0:
            trend = 'BUY'
        elif avg_sell_profit > avg_buy_profit and avg_sell_profit > 0:
            trend = 'SELL'
        else:
            trend = 'NEUTRAL'
        
        return {
            'avg_buy_profit': avg_buy_profit,
            'avg_sell_profit': avg_sell_profit,
            'trend': trend
        }
    
    def generate_signal_from_chart(self, symbol: str = "XAUUSD", timeframe: str = "H1", count: int = 100) -> Dict:
        """
        Generate trading signal based on XAUUSD chart/technical analysis
        Gebruikt: Moving Averages, RSI, MACD, Support/Resistance, Candlestick Patterns
        """
        # Haal ECHTE candlestick data op (niet alleen close prices!)
        candles = self.get_candlestick_data(symbol=symbol, timeframe=timeframe, count=count)
        
        if len(candles) < 20:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'Insufficient candlestick data for analysis',
                'analysis': {},
                'tp_sl': None
            }
        
        # Extract prices voor indicatoren
        prices = [float(c.get('close', 0)) for c in candles if c.get('close', 0) > 0]
        
        if len(prices) < 20:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'Insufficient price data for analysis',
                'analysis': {},
                'tp_sl': None
            }
        
        # Calculate technical indicators (use parameters)
        sma_20 = self.calculate_sma(prices, self.sma_short)
        sma_50 = self.calculate_sma(prices, self.sma_long) if len(prices) >= self.sma_long else sma_20
        ema_12 = self.calculate_ema(prices, 12)
        ema_26 = self.calculate_ema(prices, 26) if len(prices) >= 26 else ema_12
        rsi = self.calculate_rsi(prices, self.rsi_period)
        macd = self.calculate_macd(prices)
        
        current_price = prices[-1]
        
        # Detecteer support/resistance levels
        sr = self.detect_support_resistance(candles, lookback=min(50, len(candles)))
        
        # Detecteer candlestick patronen
        patterns = self.detect_candlestick_patterns(candles)
        
        # Signal logic met patroonherkenning
        signals = []
        confidence_factors = []
        
        # 1. Moving Average Crossover
        if sma_20 > sma_50 and current_price > sma_20:
            signals.append('BUY')
            confidence_factors.append(25)
        elif sma_20 < sma_50 and current_price < sma_20:
            signals.append('SELL')
            confidence_factors.append(25)
        
        # 2. RSI Analysis
        if rsi < 30:  # Oversold
            signals.append('BUY')
            confidence_factors.append(20)
        elif rsi > 70:  # Overbought
            signals.append('SELL')
            confidence_factors.append(20)
        elif 40 < rsi < 60:  # Neutral
            # No strong signal
            pass
        
        # 3. MACD Analysis
        if macd['histogram'] > 0 and macd['macd'] > macd['signal']:
            signals.append('BUY')
            confidence_factors.append(20)
        elif macd['histogram'] < 0 and macd['macd'] < macd['signal']:
            signals.append('SELL')
            confidence_factors.append(20)
        
        # 4. EMA Crossover
        if ema_12 > ema_26 and current_price > ema_12:
            signals.append('BUY')
            confidence_factors.append(15)
        elif ema_12 < ema_26 and current_price < ema_12:
            signals.append('SELL')
            confidence_factors.append(15)
        
        # 5. Support/Resistance Analysis (NIEUW!)
        if sr['support'] > 0 and sr['resistance'] > 0:
            # Als prijs dicht bij support is, bullish signaal
            distance_to_support = (current_price - sr['support']) / current_price * 100
            distance_to_resistance = (sr['resistance'] - current_price) / current_price * 100
            
            if distance_to_support < 0.2 and sr['support_strength'] >= 2:  # Binnen 0.2% van sterke support
                signals.append('BUY')
                confidence_factors.append(15)
            elif distance_to_resistance < 0.2 and sr['resistance_strength'] >= 2:  # Binnen 0.2% van sterke resistance
                signals.append('SELL')
                confidence_factors.append(15)
        
        # 6. Candlestick Patterns (NIEUW!)
        if patterns['signal_strength'] > 10:
            signals.append('BUY')
            confidence_factors.append(abs(patterns['signal_strength']))
        elif patterns['signal_strength'] < -10:
            signals.append('SELL')
            confidence_factors.append(abs(patterns['signal_strength']))
        
        # 7. Price momentum
        if len(prices) >= 5:
            recent_change = (prices[-1] - prices[-5]) / prices[-5] * 100
            if recent_change > 0.1:  # 0.1% increase
                signals.append('BUY')
                confidence_factors.append(10)
            elif recent_change < -0.1:  # 0.1% decrease
                signals.append('SELL')
                confidence_factors.append(10)
        
        # Count signals
        buy_count = signals.count('BUY')
        sell_count = signals.count('SELL')
        
        # Determine final signal
        if buy_count > sell_count:
            signal = 'BUY'
            confidence = min(100, sum(confidence_factors))
        elif sell_count > buy_count:
            signal = 'SELL'
            confidence = min(100, sum(confidence_factors))
        else:
            signal = 'NEUTRAL'
            confidence = 50
        
        # Generate reason
        reasons = []
        if sma_20 > sma_50:
            reasons.append(f"SMA20 ({sma_20:.2f}) > SMA50 ({sma_50:.2f})")
        elif sma_20 < sma_50:
            reasons.append(f"SMA20 ({sma_20:.2f}) < SMA50 ({sma_50:.2f})")
        
        if rsi < 30:
            reasons.append(f"RSI oversold ({rsi:.1f})")
        elif rsi > 70:
            reasons.append(f"RSI overbought ({rsi:.1f})")
        
        if macd['histogram'] > 0:
            reasons.append("MACD bullish")
        elif macd['histogram'] < 0:
            reasons.append("MACD bearish")
        
        reason = "; ".join(reasons) if reasons else "Mixed signals"
        
        # Bereken dynamische TP/SL als er een signaal is
        tp_sl = None
        if signal in ['BUY', 'SELL']:
            tp_sl = self.calculate_dynamic_tp_sl(signal, current_price, candles, risk_reward_ratio=self.risk_reward_ratio)
            # Voeg TP/SL info toe aan reason
            if tp_sl['method'] == 'support_resistance':
                if signal == 'BUY':
                    reason += f"; TP: {tp_sl['tp']:.2f} (Resistance: {sr['resistance']:.2f}), SL: {tp_sl['sl']:.2f} (Support: {sr['support']:.2f})"
                else:
                    reason += f"; TP: {tp_sl['tp']:.2f} (Support: {sr['support']:.2f}), SL: {tp_sl['sl']:.2f} (Resistance: {sr['resistance']:.2f})"
            else:
                reason += f"; TP: {tp_sl['tp']:.2f}, SL: {tp_sl['sl']:.2f} (Fixed)"
        
        return {
            'signal': signal,
            'confidence': round(confidence, 1),
            'reason': reason,
            'tp_sl': tp_sl,
            'analysis': {
                'current_price': current_price,
                'sma_20': sma_20,
                'sma_50': sma_50,
                'ema_12': ema_12,
                'ema_26': ema_26,
                'rsi': rsi,
                'macd': macd,
                'buy_signals': buy_count,
                'sell_signals': sell_count,
                'support': sr.get('support', 0),
                'resistance': sr.get('resistance', 0),
                'candlestick_patterns': patterns.get('patterns', []),
                'pattern_signal_strength': patterns.get('signal_strength', 0)
            }
        }
    
    def generate_signal(self, symbol: str = "XAUUSD", days: int = 30) -> Dict:
        """
        Generate trading signal based on history analysis
        Returns: {'signal': 'BUY'|'SELL'|'NEUTRAL', 'confidence': 0-100, 'reason': str}
        """
        trades = self.get_history(days=days)
        
        if not trades:
            return {
                'signal': 'NEUTRAL',
                'confidence': 0,
                'reason': 'No trade history available',
                'analysis': {
                    'buy_stats': {'count': 0, 'wins': 0, 'losses': 0, 'total_profit': 0.0, 'avg_profit': 0.0, 'win_rate': 0.0},
                    'sell_stats': {'count': 0, 'wins': 0, 'losses': 0, 'total_profit': 0.0, 'avg_profit': 0.0, 'win_rate': 0.0},
                    'recent_trend': {'recent_buy_win_rate': 0, 'recent_sell_win_rate': 0, 'recent_buy_count': 0, 'recent_sell_count': 0, 'recommendation': 'NEUTRAL'},
                    'profit_trend': {'avg_buy_profit': 0.0, 'avg_sell_profit': 0.0, 'trend': 'NEUTRAL'}
                }
            }
        
        # Analyze different aspects
        buy_vs_sell = self.analyze_buy_vs_sell(trades)
        recent_trend = self.analyze_recent_trend(trades, recent_count=10)
        profit_trend = self.analyze_profit_trend(trades)
        
        # Decision logic
        signals = []
        confidence_factors = []
        
        # Factor 1: Overall win rate
        buy_win_rate = buy_vs_sell['buy']['win_rate']
        sell_win_rate = buy_vs_sell['sell']['win_rate']
        
        if buy_win_rate > sell_win_rate + 10:  # 10% threshold
            signals.append('BUY')
            confidence_factors.append(min(40, (buy_win_rate - sell_win_rate) * 2))
        elif sell_win_rate > buy_win_rate + 10:
            signals.append('SELL')
            confidence_factors.append(min(40, (sell_win_rate - buy_win_rate) * 2))
        
        # Factor 2: Recent performance
        if recent_trend['recommendation'] != 'NEUTRAL':
            signals.append(recent_trend['recommendation'])
            recent_confidence = abs(recent_trend['recent_buy_win_rate'] - recent_trend['recent_sell_win_rate'])
            confidence_factors.append(min(30, recent_confidence))
        
        # Factor 3: Profit trend
        if profit_trend['trend'] != 'NEUTRAL':
            signals.append(profit_trend['trend'])
            profit_diff = abs(profit_trend['avg_buy_profit'] - profit_trend['avg_sell_profit'])
            confidence_factors.append(min(30, profit_diff / 10))  # Scale profit difference
        
        # Count signals
        buy_count = signals.count('BUY')
        sell_count = signals.count('SELL')
        
        # Determine final signal
        if buy_count > sell_count:
            signal = 'BUY'
            confidence = min(100, sum(confidence_factors))
        elif sell_count > buy_count:
            signal = 'SELL'
            confidence = min(100, sum(confidence_factors))
        else:
            signal = 'NEUTRAL'
            confidence = 50
        
        # Generate reason
        reasons = []
        if buy_win_rate > sell_win_rate:
            reasons.append(f"BUY win rate ({buy_win_rate:.1f}%) > SELL win rate ({sell_win_rate:.1f}%)")
        elif sell_win_rate > buy_win_rate:
            reasons.append(f"SELL win rate ({sell_win_rate:.1f}%) > BUY win rate ({buy_win_rate:.1f}%)")
        
        if recent_trend['recommendation'] != 'NEUTRAL':
            reasons.append(f"Recent trend favors {recent_trend['recommendation']}")
        
        if profit_trend['trend'] != 'NEUTRAL':
            reasons.append(f"Profit trend favors {profit_trend['trend']}")
        
        reason = "; ".join(reasons) if reasons else "Balanced performance"
        
        return {
            'signal': signal,
            'confidence': round(confidence, 1),
            'reason': reason,
            'analysis': {
                'buy_stats': buy_vs_sell['buy'],
                'sell_stats': buy_vs_sell['sell'],
                'recent_trend': recent_trend,
                'profit_trend': profit_trend
            }
        }
    
    def execute_signal(self, signal: Dict, symbol: str = "XAUUSD", volume: float = 0.20) -> Dict:
        """Execute trading signal"""
        if signal['signal'] == 'NEUTRAL':
            return {
                'success': False,
                'error': 'No clear signal to execute'
            }
        
        try:
            response = requests.post(
                f"{self.bridge_url}/place-order",
                json={
                    'symbol': symbol,
                    'type': signal['signal'],
                    'volume': volume
                },
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return {
                        'success': True,
                        'order': data,
                        'signal': signal
                    }
                else:
                    return {
                        'success': False,
                        'error': data.get('error', 'Unknown error')
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }


# CLI interface for testing
if __name__ == "__main__":
    strategy = TradingStrategy()
    
    print("🤖 AI Trading Strategy Analysis (Chart-Based)")
    print("=" * 50)
    print()
    
    # Generate signal from chart analysis
    signal = strategy.generate_signal_from_chart(symbol="XAUUSD", count=100)
    
    print(f"📊 Signal: {signal['signal']}")
    print(f"🎯 Confidence: {signal['confidence']}%")
    print(f"💡 Reason: {signal['reason']}")
    print()
    
    if 'analysis' in signal and signal['analysis']:
        print("📈 Technical Analysis:")
        analysis = signal['analysis']
        if 'current_price' in analysis:
            print(f"  Current Price: ${analysis['current_price']:.2f}")
        if 'sma_20' in analysis:
            print(f"  SMA 20: ${analysis['sma_20']:.2f}")
        if 'sma_50' in analysis:
            print(f"  SMA 50: ${analysis['sma_50']:.2f}")
        if 'rsi' in analysis:
            print(f"  RSI: {analysis['rsi']:.1f}")
        if 'macd' in analysis:
            macd = analysis['macd']
            print(f"  MACD: {macd.get('macd', 0):.2f} | Signal: {macd.get('signal', 0):.2f} | Histogram: {macd.get('histogram', 0):.2f}")
        if 'buy_signals' in analysis:
            print(f"  BUY Signals: {analysis['buy_signals']}")
        if 'sell_signals' in analysis:
            print(f"  SELL Signals: {analysis['sell_signals']}")
    print()
    
    # Ask for execution
    if signal['signal'] != 'NEUTRAL' and signal['confidence'] > 60:
        print(f"✅ Strong signal detected! Execute {signal['signal']}?")
        print("   (Run with execute=True to auto-execute)")
    else:
        print("⚠️  Signal is weak or neutral. Not recommended to execute.")
