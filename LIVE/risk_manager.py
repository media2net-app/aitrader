#!/usr/bin/env python3
"""
Risk Manager
Manages daily loss limits, max trades per day, drawdown protection, etc.
"""

from datetime import datetime, date
from typing import Dict, List, Optional
import json
import os

class RiskManager:
    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize Risk Manager
        
        Args:
            config_path: Path to save daily stats (optional)
        """
        self.config_path = config_path or "LIVE/daily_stats.json"
        self.daily_stats = self.load_daily_stats()
        
    def load_daily_stats(self) -> Dict:
        """
        Load daily statistics from file
        
        Returns:
            Dict with daily stats
        """
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    return json.load(f)
            except:
                pass
        
        return {}
    
    def save_daily_stats(self):
        """Save daily statistics to file"""
        os.makedirs(os.path.dirname(self.config_path) if os.path.dirname(self.config_path) else '.', exist_ok=True)
        with open(self.config_path, 'w') as f:
            json.dump(self.daily_stats, f, indent=2)
    
    def get_today_key(self) -> str:
        """Get today's date as string key"""
        return date.today().isoformat()
    
    def reset_daily_stats(self):
        """Reset daily statistics for a new day"""
        today = self.get_today_key()
        if today not in self.daily_stats:
            self.daily_stats[today] = {
                'trades_count': 0,
                'total_pnl': 0.0,
                'winning_trades': 0,
                'losing_trades': 0,
                'max_drawdown': 0.0,
                'starting_balance': 0.0,
                'current_balance': 0.0
            }
            self.save_daily_stats()
    
    def can_place_trade(self, account_balance: float, max_trades_per_day: int = 2,
                       max_daily_loss_percent: float = 50.0,
                       starting_balance: Optional[float] = None) -> tuple[bool, str]:
        """
        Check if we can place a new trade
        
        Args:
            account_balance: Current account balance
            max_trades_per_day: Maximum trades allowed per day
            max_daily_loss_percent: Maximum daily loss percentage
            starting_balance: Starting balance for the day (if None, uses first balance seen)
        
        Returns:
            Tuple of (can_place: bool, reason: str)
        """
        self.reset_daily_stats()
        today = self.get_today_key()
        stats = self.daily_stats[today]
        
        # Set starting balance if not set
        if starting_balance and stats['starting_balance'] == 0:
            stats['starting_balance'] = starting_balance
            stats['current_balance'] = starting_balance
            self.save_daily_stats()
        
        starting_balance = stats['starting_balance'] if stats['starting_balance'] > 0 else account_balance
        
        # Check max trades per day
        if stats['trades_count'] >= max_trades_per_day:
            return False, f"Max trades per day reached ({stats['trades_count']}/{max_trades_per_day})"
        
        # Check daily loss limit
        daily_pnl = stats['total_pnl']
        if daily_pnl < 0:
            daily_loss_pct = abs(daily_pnl) / starting_balance * 100 if starting_balance > 0 else 0
            if daily_loss_pct >= max_daily_loss_percent:
                return False, f"Daily loss limit reached ({daily_loss_pct:.2f}% >= {max_daily_loss_percent}%)"
        
        # Check if account balance is too low
        # -1 means connection issue, not zero balance
        if account_balance == -1.0:
            return False, "Cannot get account balance from MT5 (connection issue)"
        if account_balance <= 0:
            return False, "Account balance is zero or negative"
        
        return True, "OK"
    
    def record_trade(self, pnl: float, account_balance: float):
        """
        Record a completed trade
        
        Args:
            pnl: Profit/Loss of the trade
            account_balance: Current account balance after the trade
        """
        self.reset_daily_stats()
        today = self.get_today_key()
        stats = self.daily_stats[today]
        
        stats['trades_count'] += 1
        stats['total_pnl'] += pnl
        stats['current_balance'] = account_balance
        
        if pnl > 0:
            stats['winning_trades'] += 1
        elif pnl < 0:
            stats['losing_trades'] += 1
        
        # Update max drawdown
        if stats['starting_balance'] > 0:
            current_drawdown = (stats['starting_balance'] - account_balance) / stats['starting_balance'] * 100
            if current_drawdown > stats['max_drawdown']:
                stats['max_drawdown'] = current_drawdown
        
        self.save_daily_stats()
    
    def get_daily_stats(self) -> Dict:
        """
        Get today's statistics
        
        Returns:
            Dict with daily stats
        """
        self.reset_daily_stats()
        today = self.get_today_key()
        return self.daily_stats.get(today, {
            'trades_count': 0,
            'total_pnl': 0.0,
            'winning_trades': 0,
            'losing_trades': 0,
            'max_drawdown': 0.0,
            'starting_balance': 0.0,
            'current_balance': 0.0
        })
    
    def get_daily_pnl_percent(self, starting_balance: Optional[float] = None) -> float:
        """
        Get daily P&L as percentage
        
        Args:
            starting_balance: Starting balance (if None, uses saved starting balance)
        
        Returns:
            Daily P&L percentage
        """
        stats = self.get_daily_stats()
        starting = starting_balance if starting_balance else stats.get('starting_balance', 0)
        
        if starting <= 0:
            return 0.0
        
        return (stats['total_pnl'] / starting) * 100
    
    def check_max_drawdown(self, account_balance: float, max_drawdown_percent: float = 20.0,
                          starting_balance: Optional[float] = None) -> tuple[bool, str]:
        """
        Check if max drawdown limit is reached
        
        Args:
            account_balance: Current account balance
            max_drawdown_percent: Maximum allowed drawdown percentage
            starting_balance: Starting balance (if None, uses saved starting balance)
        
        Returns:
            Tuple of (is_safe: bool, message: str)
        """
        stats = self.get_daily_stats()
        starting = starting_balance if starting_balance else stats.get('starting_balance', 0)
        
        if starting <= 0:
            return True, "No starting balance set"
        
        drawdown = (starting - account_balance) / starting * 100
        
        if drawdown >= max_drawdown_percent:
            return False, f"Max drawdown limit reached ({drawdown:.2f}% >= {max_drawdown_percent}%)"
        
        return True, f"Drawdown OK ({drawdown:.2f}%)"
    
    def should_stop_trading(self, account_balance: float, max_trades_per_day: int = 2,
                           max_daily_loss_percent: float = 50.0,
                           max_drawdown_percent: float = 20.0,
                           starting_balance: Optional[float] = None) -> tuple[bool, str]:
        """
        Check if trading should be stopped for the day
        
        Args:
            account_balance: Current account balance
            max_trades_per_day: Maximum trades per day
            max_daily_loss_percent: Maximum daily loss percentage
            max_drawdown_percent: Maximum drawdown percentage
            starting_balance: Starting balance
        
        Returns:
            Tuple of (should_stop: bool, reason: str)
        """
        # Check if can place trade (includes max trades and daily loss checks)
        can_place, reason = self.can_place_trade(
            account_balance, max_trades_per_day, max_daily_loss_percent, starting_balance
        )
        
        if not can_place:
            return True, reason
        
        # Check max drawdown
        is_safe, drawdown_msg = self.check_max_drawdown(
            account_balance, max_drawdown_percent, starting_balance
        )
        
        if not is_safe:
            return True, drawdown_msg
        
        return False, "Trading allowed"
    
    def get_risk_summary(self, account_balance: float, starting_balance: Optional[float] = None) -> Dict:
        """
        Get risk summary for current day
        
        Args:
            account_balance: Current account balance
            starting_balance: Starting balance
        
        Returns:
            Dict with risk summary
        """
        stats = self.get_daily_stats()
        starting = starting_balance if starting_balance else stats.get('starting_balance', 0)
        
        daily_pnl_pct = self.get_daily_pnl_percent(starting)
        drawdown = ((starting - account_balance) / starting * 100) if starting > 0 else 0
        
        return {
            'trades_today': stats['trades_count'],
            'total_pnl': round(stats['total_pnl'], 2),
            'daily_pnl_percent': round(daily_pnl_pct, 2),
            'winning_trades': stats['winning_trades'],
            'losing_trades': stats['losing_trades'],
            'win_rate': round((stats['winning_trades'] / stats['trades_count'] * 100) if stats['trades_count'] > 0 else 0, 2),
            'max_drawdown': round(stats['max_drawdown'], 2),
            'current_drawdown': round(drawdown, 2),
            'starting_balance': round(starting, 2),
            'current_balance': round(account_balance, 2)
        }


# CLI interface for testing
if __name__ == "__main__":
    manager = RiskManager()
    
    print("🛡️  Risk Manager Test")
    print("=" * 50)
    print()
    
    # Test scenario
    account_balance = 100.0
    starting_balance = 100.0
    
    print(f"Starting Balance: ${starting_balance:.2f}")
    print(f"Current Balance: ${account_balance:.2f}")
    print()
    
    # Check if can place trade
    can_place, reason = manager.can_place_trade(
        account_balance, 
        max_trades_per_day=2,
        max_daily_loss_percent=50.0,
        starting_balance=starting_balance
    )
    print(f"Can place trade: {can_place}")
    print(f"Reason: {reason}")
    print()
    
    # Record a losing trade
    print("Recording a losing trade (-$10)...")
    manager.record_trade(-10.0, account_balance - 10.0)
    account_balance -= 10.0
    
    # Get stats
    stats = manager.get_risk_summary(account_balance, starting_balance)
    print("\n📊 Daily Stats:")
    for key, value in stats.items():
        print(f"  {key}: {value}")
    print()
    
    # Check if should stop
    should_stop, reason = manager.should_stop_trading(
        account_balance,
        max_trades_per_day=2,
        max_daily_loss_percent=50.0,
        max_drawdown_percent=20.0,
        starting_balance=starting_balance
    )
    print(f"Should stop trading: {should_stop}")
    print(f"Reason: {reason}")
