#!/usr/bin/env python3
"""
Performance Metrics Calculator
Bereken alle belangrijke trading metrics voor backtesting
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
        """Bereken Sharpe Ratio (annualized)"""
        if len(self.equity_curve) < 2:
            return 0.0
        
        # Calculate returns
        returns = []
        for i in range(1, len(self.equity_curve)):
            if self.equity_curve[i-1] > 0:
                ret = (self.equity_curve[i] - self.equity_curve[i-1]) / self.equity_curve[i-1]
                returns.append(ret)
        
        if not returns or len(returns) < 2:
            return 0.0
        
        # Calculate mean and std
        mean_return = sum(returns) / len(returns)
        variance = sum((r - mean_return) ** 2 for r in returns) / len(returns)
        std_dev = math.sqrt(variance)
        
        if std_dev == 0:
            return 0.0
        
        # Annualize (assuming hourly returns for H1 timeframe)
        # 252 trading days * 24 hours = 6048 hours per year
        sharpe = (mean_return - risk_free_rate) / std_dev
        return round(sharpe * math.sqrt(6048), 2)  # Annualized for hourly data
    
    def calculate_sortino_ratio(self, risk_free_rate: float = 0.0) -> float:
        """Bereken Sortino Ratio (only penalizes downside volatility)"""
        if len(self.equity_curve) < 2:
            return 0.0
        
        # Calculate returns
        returns = []
        for i in range(1, len(self.equity_curve)):
            if self.equity_curve[i-1] > 0:
                ret = (self.equity_curve[i] - self.equity_curve[i-1]) / self.equity_curve[i-1]
                returns.append(ret)
        
        if not returns or len(returns) < 2:
            return 0.0
        
        mean_return = sum(returns) / len(returns)
        
        # Only negative returns for downside deviation
        downside_returns = [r for r in returns if r < 0]
        if not downside_returns:
            return float('inf') if mean_return > risk_free_rate else 0.0
        
        downside_variance = sum(r ** 2 for r in downside_returns) / len(downside_returns)
        downside_std = math.sqrt(downside_variance)
        
        if downside_std == 0:
            return 0.0
        
        sortino = (mean_return - risk_free_rate) / downside_std
        return round(sortino * math.sqrt(6048), 2)  # Annualized
    
    def calculate_expectancy(self) -> float:
        """Bereken expectancy per trade"""
        if not self.trades:
            return 0.0
        
        total_pnl = sum(t.get('pnl', 0) for t in self.trades)
        return total_pnl / len(self.trades)
    
    def calculate_avg_win_loss(self) -> Dict:
        """Bereken gemiddelde win en loss"""
        winning_trades = [t for t in self.trades if t.get('pnl', 0) > 0]
        losing_trades = [t for t in self.trades if t.get('pnl', 0) < 0]
        
        avg_win = sum(t.get('pnl', 0) for t in winning_trades) / len(winning_trades) if winning_trades else 0
        avg_loss = sum(t.get('pnl', 0) for t in losing_trades) / len(losing_trades) if losing_trades else 0
        
        return {
            'avg_win': round(avg_win, 2),
            'avg_loss': round(avg_loss, 2),
            'win_count': len(winning_trades),
            'loss_count': len(losing_trades)
        }
    
    def calculate_recovery_factor(self) -> float:
        """Bereken recovery factor (net profit / max drawdown)"""
        max_dd = self.calculate_max_drawdown()
        total_pnl = self.calculate_total_pnl()
        
        if max_dd['max_drawdown'] == 0:
            return 0.0 if total_pnl == 0 else float('inf')
        
        return round(total_pnl / max_dd['max_drawdown'], 2)
    
    def calculate_all_metrics(self) -> Dict:
        """Bereken alle metrics"""
        win_loss = self.calculate_avg_win_loss()
        max_dd = self.calculate_max_drawdown()
        
        return {
            'win_rate': round(self.calculate_win_rate(), 2),
            'total_pnl': round(self.calculate_total_pnl(), 2),
            'profit_factor': round(self.calculate_profit_factor(), 2),
            'max_drawdown': max_dd['max_drawdown'],
            'max_drawdown_pct': max_dd['max_drawdown_pct'],
            'sharpe_ratio': self.calculate_sharpe_ratio(),
            'sortino_ratio': self.calculate_sortino_ratio(),
            'expectancy': round(self.calculate_expectancy(), 2),
            'recovery_factor': self.calculate_recovery_factor(),
            'total_trades': len(self.trades),
            'winning_trades': win_loss['win_count'],
            'losing_trades': win_loss['loss_count'],
            'avg_win': win_loss['avg_win'],
            'avg_loss': win_loss['avg_loss']
        }
