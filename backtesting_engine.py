#!/usr/bin/env python3
"""
Backtesting Engine voor AI Trader
Test strategie op historische data
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from trading_strategy import TradingStrategy
from performance_metrics import PerformanceMetrics
import requests

class BacktestingEngine:
    def __init__(self, strategy: TradingStrategy, initial_balance: float = 100000.0, bridge_url: str = "http://localhost:5002"):
        self.strategy = strategy
        self.bridge_url = bridge_url
        self.initial_balance = initial_balance
        self.current_balance = initial_balance
        self.trades = []
        self.equity_curve = [initial_balance]
        self.open_position = None
        self.current_candles = []
        
    def get_historical_data(self, symbol: str, timeframe: str, count: int = 1000) -> List[Dict]:
        """Haal historische candlestick data op van MT5 via bridge"""
        try:
            response = requests.get(
                f"{self.bridge_url}/candles/{symbol}/{timeframe}/{count}",
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    candles = data.get('candles', [])
                    # Sorteer op tijd (oudste eerst)
                    candles.sort(key=lambda x: x.get('time', ''))
                    return candles
            print(f"⚠️  Error getting historical data: {response.text}")
            return []
        except Exception as e:
            print(f"❌ Error fetching historical data: {e}")
            return []
    
    def calculate_pnl(self, entry_price: float, exit_price: float, position_type: str, volume: float) -> float:
        """
        Bereken profit/loss voor een trade
        Voor XAUUSD: 1 lot = 100 oz, 1 pip = $0.01 per oz
        """
        if position_type == 'BUY':
            price_diff = exit_price - entry_price
        else:  # SELL
            price_diff = entry_price - exit_price
        
        # Simplified P&L: price difference * volume * contract size
        # XAUUSD: 1 lot = 100 oz, so volume 0.20 = 20 oz
        contract_size = 100  # 1 lot = 100 oz
        pnl = price_diff * volume * contract_size
        
        return round(pnl, 2)
    
    def run_backtest(self, symbol: str = "XAUUSD", timeframe: str = "H1", 
                     days: int = 30, volume: float = 0.20) -> Dict:
        """
        Run backtest op historische data
        
        Args:
            symbol: Trading symbol
            timeframe: Timeframe (H1, H4, D1, etc.)
            days: Aantal dagen historische data
            volume: Trade volume in lots
        
        Returns:
            Dict met backtest results
        """
        print(f"\n{'='*70}")
        print(f"🧪 BACKTEST STARTING")
        print(f"{'='*70}")
        print(f"Symbol: {symbol}")
        print(f"Timeframe: {timeframe}")
        print(f"Period: {days} days")
        print(f"Volume: {volume} lots")
        print(f"Initial Balance: ${self.initial_balance:,.2f}")
        print()
        
        # Haal historische data op
        # Calculate candles needed based on timeframe
        candles_per_day = {
            'M1': 1440,   # 1 minute: 1440 candles per day
            'M5': 288,    # 5 minutes: 288 candles per day
            'M15': 96,    # 15 minutes: 96 candles per day
            'H1': 24,     # 1 hour: 24 candles per day
            'H4': 6,      # 4 hours: 6 candles per day
            'D1': 1       # 1 day: 1 candle per day
        }
        
        candles_per_day_count = candles_per_day.get(timeframe.upper(), 24)  # Default to H1
        count = days * candles_per_day_count
        if count > 1000:
            count = 1000  # Max 1000 candles
        
        print(f"📊 Fetching {count} candles...")
        candles = self.get_historical_data(symbol, timeframe, count)
        
        if not candles or len(candles) < 50:
            return {
                'error': 'Insufficient historical data',
                'message': f'Only {len(candles) if candles else 0} candles available, need at least 50',
                'trades': [],
                'metrics': {},
                'equity_curve': []
            }
        
        print(f"✅ Got {len(candles)} candles")
        print(f"📅 Date range: {candles[0].get('time')} to {candles[-1].get('time')}")
        print()
        
        # Reset state
        self.current_balance = self.initial_balance
        self.trades = []
        self.equity_curve = [self.initial_balance]
        self.open_position = None
        self.current_candles = []
        
        # Loop door elke candle (start na 50 candles voor indicatoren)
        print("🔄 Running backtest...")
        processed = 0
        for i in range(50, len(candles)):
            self.current_candles = candles[:i+1]
            current_candle = candles[i]
            current_price = float(current_candle.get('close', 0))
            current_time = current_candle.get('time', '')
            
            if current_price == 0:
                continue
            
            # Manage open position
            if self.open_position:
                self.manage_position(current_price, current_time)
            
            # Genereer signaal (gebruik laatste 100 candles voor analyse)
            analysis_candles = self.current_candles[-100:] if len(self.current_candles) > 100 else self.current_candles
            
            try:
                # Generate signal using strategy with timeframe support
                # Convert candles to format expected by strategy
                signal_data = self.strategy.generate_signal_from_chart(
                    symbol=symbol,
                    timeframe=timeframe,
                    count=min(len(analysis_candles), 100)  # Limit to 100 for performance
                )
                
                signal = signal_data.get('signal')
                confidence = signal_data.get('confidence', 0)
                tp_sl = signal_data.get('tp_sl')
                
                # Open nieuwe positie als signaal sterk genoeg is
                if signal in ['BUY', 'SELL'] and confidence >= 60 and not self.open_position:
                    if tp_sl and tp_sl.get('tp') and tp_sl.get('sl'):
                        self.open_position = {
                            'type': signal,
                            'entry_price': current_price,
                            'entry_time': current_time,
                            'volume': volume,
                            'tp': tp_sl.get('tp'),
                            'sl': tp_sl.get('sl'),
                            'confidence': confidence
                        }
                        print(f"  📈 {signal} signal @ ${current_price:.2f} (Confidence: {confidence}%)")
            
            except Exception as e:
                print(f"  ⚠️  Error generating signal: {e}")
                continue
            
            # Update equity curve
            self.update_equity_curve(current_price)
            processed += 1
            
            if processed % 100 == 0:
                print(f"  Processed {processed}/{len(candles)-50} candles...")
        
        # Close laatste positie als nog open
        if self.open_position:
            final_price = float(candles[-1].get('close', 0))
            final_time = candles[-1].get('time', '')
            self.close_position(final_price, final_time, reason='End of backtest')
        
        print()
        print("✅ Backtest completed!")
        print()
        
        # Bereken metrics
        metrics = PerformanceMetrics(self.trades, self.equity_curve)
        results = metrics.calculate_all_metrics()
        
        # Calculate total return
        final_balance = self.equity_curve[-1] if self.equity_curve else self.current_balance
        total_return = ((final_balance - self.initial_balance) / self.initial_balance) * 100
        
        return {
            'success': True,
            'trades': self.trades,
            'equity_curve': self.equity_curve,
            'metrics': results,
            'initial_balance': self.initial_balance,
            'final_balance': round(final_balance, 2),
            'total_return': round(total_return, 2),
            'total_return_pct': round(total_return, 2),
            'symbol': symbol,
            'timeframe': timeframe,
            'period_days': days,
            'total_candles': len(candles),
            'processed_candles': processed
        }
    
    def manage_position(self, current_price: float, current_time: str):
        """Manage open position - check TP/SL"""
        if not self.open_position:
            return
        
        pos_type = self.open_position['type']
        entry_price = self.open_position['entry_price']
        tp = self.open_position.get('tp')
        sl = self.open_position.get('sl')
        
        # Check TP/SL
        should_close = False
        close_reason = ''
        
        if pos_type == 'BUY':
            if tp and current_price >= tp:
                should_close = True
                close_reason = 'TP'
            elif sl and current_price <= sl:
                should_close = True
                close_reason = 'SL'
        elif pos_type == 'SELL':
            if tp and current_price <= tp:
                should_close = True
                close_reason = 'TP'
            elif sl and current_price >= sl:
                should_close = True
                close_reason = 'SL'
        
        if should_close:
            self.close_position(current_price, current_time, reason=close_reason)
    
    def close_position(self, exit_price: float, exit_time: str, reason: str = 'Manual'):
        """Close open position"""
        if not self.open_position:
            return
        
        pos_type = self.open_position['type']
        entry_price = self.open_position['entry_price']
        volume = self.open_position['volume']
        entry_time = self.open_position['entry_time']
        
        # Bereken profit/loss
        pnl = self.calculate_pnl(entry_price, exit_price, pos_type, volume)
        
        # Update balance
        self.current_balance += pnl
        
        # Record trade
        trade = {
            'type': pos_type,
            'entry_price': round(entry_price, 2),
            'exit_price': round(exit_price, 2),
            'entry_time': entry_time,
            'exit_time': exit_time,
            'volume': volume,
            'pnl': pnl,
            'reason': reason,
            'profit': pnl > 0,
            'duration_candles': len(self.current_candles) - (self.current_candles.index([c for c in self.current_candles if c.get('time') == entry_time][0]) if any(c.get('time') == entry_time for c in self.current_candles) else 0)
        }
        self.trades.append(trade)
        
        status = "✅ WIN" if pnl > 0 else "❌ LOSS"
        print(f"  {status} {pos_type} @ ${entry_price:.2f} → ${exit_price:.2f} | P&L: ${pnl:.2f} ({reason})")
        
        # Reset open position
        self.open_position = None
    
    def update_equity_curve(self, current_price: float):
        """Update equity curve met current position value"""
        if self.open_position:
            # Calculate unrealized P&L
            pos_type = self.open_position['type']
            entry_price = self.open_position['entry_price']
            volume = self.open_position['volume']
            
            unrealized_pnl = self.calculate_pnl(entry_price, current_price, pos_type, volume)
            equity = self.current_balance + unrealized_pnl
        else:
            equity = self.current_balance
        
        self.equity_curve.append(round(equity, 2))

if __name__ == "__main__":
    # Test backtesting engine
    from trading_strategy import TradingStrategy
    
    print("🧪 Testing Backtesting Engine...")
    print()
    
    strategy = TradingStrategy()
    engine = BacktestingEngine(strategy, initial_balance=100.0)  # Start with $100 for live trading scenario
    
    # Test M5 timeframe (recommended for live trading)
    print("Testing M5 timeframe (recommended for live trading)...")
    results = engine.run_backtest(
        symbol="XAUUSD",
        timeframe="M5",
        days=7,  # Test met 7 dagen
        volume=0.20
    )
    
    if results.get('error'):
        print(f"❌ Error: {results.get('error')}")
        print(f"   {results.get('message', '')}")
    else:
        print("="*70)
        print("📊 BACKTEST RESULTS")
        print("="*70)
        print(f"Total Trades: {results['metrics']['total_trades']}")
        print(f"Winning Trades: {results['metrics']['winning_trades']}")
        print(f"Losing Trades: {results['metrics']['losing_trades']}")
        print(f"Win Rate: {results['metrics']['win_rate']}%")
        print()
        print(f"Initial Balance: ${results['initial_balance']:,.2f}")
        print(f"Final Balance: ${results['final_balance']:,.2f}")
        print(f"Total Return: {results['total_return_pct']:.2f}%")
        print()
        print("📈 Performance Metrics:")
        print(f"  Profit Factor: {results['metrics']['profit_factor']:.2f}")
        print(f"  Sharpe Ratio: {results['metrics']['sharpe_ratio']:.2f}")
        print(f"  Sortino Ratio: {results['metrics']['sortino_ratio']:.2f}")
        print(f"  Max Drawdown: ${results['metrics']['max_drawdown']:,.2f} ({results['metrics']['max_drawdown_pct']:.2f}%)")
        print(f"  Expectancy: ${results['metrics']['expectancy']:.2f}")
        print(f"  Recovery Factor: {results['metrics']['recovery_factor']:.2f}")
        print(f"  Avg Win: ${results['metrics']['avg_win']:.2f}")
        print(f"  Avg Loss: ${results['metrics']['avg_loss']:.2f}")
