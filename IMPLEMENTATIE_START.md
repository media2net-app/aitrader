# 🚀 Quick Start: Begin met Implementatie

## 📋 Eerste Stap: Backtesting Engine

Dit is de **meest kritieke feature** - start hier!

### Stap 1: Maak nieuwe bestanden aan

```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
touch backtesting_engine.py
touch performance_metrics.py
```

### Stap 2: Basis Backtesting Engine

**Bestand:** `backtesting_engine.py`

```python
#!/usr/bin/env python3
"""
Backtesting Engine voor AI Trader
Test strategie op historische data
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
from trading_strategy import TradingStrategy
import requests

class BacktestingEngine:
    def __init__(self, strategy: TradingStrategy, initial_balance: float = 100000.0):
        self.strategy = strategy
        self.initial_balance = initial_balance
        self.current_balance = initial_balance
        self.trades = []
        self.equity_curve = [initial_balance]
        self.open_position = None
        
    def get_historical_data(self, symbol: str, timeframe: str, start_date: datetime, end_date: datetime) -> List[Dict]:
        """Haal historische candlestick data op"""
        # TODO: Implementeer historische data ophalen van MT5
        # Voor nu: gebruik bestaande get_candlestick_data met date filtering
        pass
    
    def run_backtest(self, symbol: str = "XAUUSD", timeframe: str = "H1", 
                     start_date: datetime = None, end_date: datetime = None,
                     volume: float = 0.20) -> Dict:
        """
        Run backtest op historische data
        
        Returns:
            Dict met backtest results
        """
        if start_date is None:
            start_date = datetime.now() - timedelta(days=30)
        if end_date is None:
            end_date = datetime.now()
        
        # Haal historische data op
        candles = self.get_historical_data(symbol, timeframe, start_date, end_date)
        
        if not candles or len(candles) < 20:
            return {
                'error': 'Insufficient historical data',
                'trades': [],
                'metrics': {}
            }
        
        # Loop door elke candle
        for i in range(20, len(candles)):  # Start na 20 candles voor indicatoren
            current_candles = candles[:i+1]
            current_price = float(current_candles[-1].get('close', 0))
            
            # Genereer signaal
            signal_data = self.strategy.generate_signal_from_chart(
                symbol=symbol,
                timeframe=timeframe,
                count=len(current_candles)
            )
            
            signal = signal_data.get('signal')
            confidence = signal_data.get('confidence', 0)
            tp_sl = signal_data.get('tp_sl')
            
            # Manage open position
            if self.open_position:
                self.manage_position(current_price, tp_sl)
            
            # Open nieuwe positie als signaal sterk genoeg is
            if signal in ['BUY', 'SELL'] and confidence >= 60 and not self.open_position:
                if tp_sl:
                    self.open_position = {
                        'type': signal,
                        'entry_price': current_price,
                        'entry_time': current_candles[-1].get('time'),
                        'volume': volume,
                        'tp': tp_sl.get('tp'),
                        'sl': tp_sl.get('sl')
                    }
            
            # Update equity curve
            self.update_equity_curve(current_price)
        
        # Close laatste positie als nog open
        if self.open_position:
            self.close_position(current_price, candles[-1].get('time'))
        
        # Bereken metrics
        from performance_metrics import PerformanceMetrics
        metrics = PerformanceMetrics(self.trades, self.equity_curve)
        results = metrics.calculate_all_metrics()
        
        return {
            'trades': self.trades,
            'equity_curve': self.equity_curve,
            'metrics': results,
            'initial_balance': self.initial_balance,
            'final_balance': self.current_balance,
            'total_return': ((self.current_balance - self.initial_balance) / self.initial_balance) * 100
        }
    
    def manage_position(self, current_price: float, tp_sl: Optional[Dict]):
        """Manage open position - check TP/SL"""
        if not self.open_position:
            return
        
        pos_type = self.open_position['type']
        entry_price = self.open_position['entry_price']
        tp = self.open_position.get('tp')
        sl = self.open_position.get('sl')
        
        # Check TP/SL
        if pos_type == 'BUY':
            if tp and current_price >= tp:
                self.close_position(current_price, datetime.now(), reason='TP')
            elif sl and current_price <= sl:
                self.close_position(current_price, datetime.now(), reason='SL')
        elif pos_type == 'SELL':
            if tp and current_price <= tp:
                self.close_position(current_price, datetime.now(), reason='TP')
            elif sl and current_price >= sl:
                self.close_position(current_price, datetime.now(), reason='SL')
    
    def close_position(self, exit_price: float, exit_time: str, reason: str = 'Manual'):
        """Close open position"""
        if not self.open_position:
            return
        
        pos_type = self.open_position['type']
        entry_price = self.open_position['entry_price']
        volume = self.open_position['volume']
        
        # Bereken profit/loss
        if pos_type == 'BUY':
            pnl = (exit_price - entry_price) * volume * 100  # Simplified P&L calculation
        else:  # SELL
            pnl = (entry_price - exit_price) * volume * 100
        
        # Update balance
        self.current_balance += pnl
        
        # Record trade
        trade = {
            'type': pos_type,
            'entry_price': entry_price,
            'exit_price': exit_price,
            'entry_time': self.open_position['entry_time'],
            'exit_time': exit_time,
            'volume': volume,
            'pnl': pnl,
            'reason': reason,
            'profit': pnl > 0
        }
        self.trades.append(trade)
        
        # Reset open position
        self.open_position = None
    
    def update_equity_curve(self, current_price: float):
        """Update equity curve met current position value"""
        if self.open_position:
            # Calculate unrealized P&L
            pos_type = self.open_position['type']
            entry_price = self.open_position['entry_price']
            volume = self.open_position['volume']
            
            if pos_type == 'BUY':
                unrealized_pnl = (current_price - entry_price) * volume * 100
            else:
                unrealized_pnl = (entry_price - current_price) * volume * 100
            
            equity = self.current_balance + unrealized_pnl
        else:
            equity = self.current_balance
        
        self.equity_curve.append(equity)

if __name__ == "__main__":
    # Test backtesting engine
    from trading_strategy import TradingStrategy
    
    strategy = TradingStrategy()
    engine = BacktestingEngine(strategy)
    
    results = engine.run_backtest(
        symbol="XAUUSD",
        timeframe="H1",
        start_date=datetime.now() - timedelta(days=7),
        end_date=datetime.now()
    )
    
    print("Backtest Results:")
    print(f"Total Trades: {len(results['trades'])}")
    print(f"Initial Balance: ${results['initial_balance']:,.2f}")
    print(f"Final Balance: ${results['final_balance']:,.2f}")
    print(f"Total Return: {results['total_return']:.2f}%")
    print(f"\nMetrics:")
    for key, value in results['metrics'].items():
        print(f"  {key}: {value}")
```

### Stap 3: Performance Metrics

**Bestand:** `performance_metrics.py`

```python
#!/usr/bin/env python3
"""
Performance Metrics Calculator
Bereken alle belangrijke trading metrics
"""

from typing import List, Dict
import math

class PerformanceMetrics:
    def __init__(self, trades: List[Dict], equity_curve: List[float]):
        self.trades = trades
        self.equity_curve = equity_curve
    
    def calculate_win_rate(self) -> float:
        """Bereken win rate percentage"""
        if not self.trades:
            return 0.0
        
        winning_trades = sum(1 for t in self.trades if t.get('profit', False))
        return (winning_trades / len(self.trades)) * 100
    
    def calculate_total_pnl(self) -> float:
        """Bereken totale profit/loss"""
        return sum(t.get('pnl', 0) for t in self.trades)
    
    def calculate_profit_factor(self) -> float:
        """Bereken profit factor (gross profit / gross loss)"""
        gross_profit = sum(t.get('pnl', 0) for t in self.trades if t.get('pnl', 0) > 0)
        gross_loss = abs(sum(t.get('pnl', 0) for t in self.trades if t.get('pnl', 0) < 0))
        
        if gross_loss == 0:
            return 0.0 if gross_profit == 0 else float('inf')
        
        return gross_profit / gross_loss
    
    def calculate_max_drawdown(self) -> Dict:
        """Bereken maximum drawdown"""
        if not self.equity_curve:
            return {'max_drawdown': 0.0, 'max_drawdown_pct': 0.0}
        
        peak = self.equity_curve[0]
        max_drawdown = 0.0
        max_drawdown_pct = 0.0
        
        for equity in self.equity_curve:
            if equity > peak:
                peak = equity
            
            drawdown = peak - equity
            drawdown_pct = (drawdown / peak) * 100 if peak > 0 else 0
            
            if drawdown > max_drawdown:
                max_drawdown = drawdown
                max_drawdown_pct = drawdown_pct
        
        return {
            'max_drawdown': round(max_drawdown, 2),
            'max_drawdown_pct': round(max_drawdown_pct, 2)
        }
    
    def calculate_sharpe_ratio(self, risk_free_rate: float = 0.0) -> float:
        """Bereken Sharpe Ratio"""
        if len(self.equity_curve) < 2:
            return 0.0
        
        # Calculate returns
        returns = []
        for i in range(1, len(self.equity_curve)):
            if self.equity_curve[i-1] > 0:
                ret = (self.equity_curve[i] - self.equity_curve[i-1]) / self.equity_curve[i-1]
                returns.append(ret)
        
        if not returns:
            return 0.0
        
        # Calculate mean and std
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        std_dev = math.sqrt(variance)
        
        if std_dev == 0:
            return 0.0
        
        # Annualize (assuming daily returns, adjust for your timeframe)
        sharpe = (mean_return - risk_free_rate) / std_dev
        return round(sharpe * math.sqrt(252), 2)  # Annualized
    
    def calculate_expectancy(self) -> float:
        """Bereken expectancy per trade"""
        if not self.trades:
            return 0.0
        
        total_pnl = sum(t.get('pnl', 0) for t in self.trades)
        return total_pnl / len(self.trades)
    
    def calculate_all_metrics(self) -> Dict:
        """Bereken alle metrics"""
        return {
            'win_rate': round(self.calculate_win_rate(), 2),
            'total_pnl': round(self.calculate_total_pnl(), 2),
            'profit_factor': round(self.calculate_profit_factor(), 2),
            'max_drawdown': self.calculate_max_drawdown(),
            'sharpe_ratio': self.calculate_sharpe_ratio(),
            'expectancy': round(self.calculate_expectancy(), 2),
            'total_trades': len(self.trades),
            'winning_trades': sum(1 for t in self.trades if t.get('profit', False)),
            'losing_trades': sum(1 for t in self.trades if not t.get('profit', False))
        }
```

### Stap 4: Test het!

```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 backtesting_engine.py
```

---

## 🎯 Volgende Stappen

1. ✅ Implementeer `get_historical_data()` functie
2. ✅ Test backtesting engine
3. ✅ Voeg API endpoints toe
4. ✅ Maak dashboard component

**Start met deze basis en bouw verder!** 🚀
