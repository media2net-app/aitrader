#!/usr/bin/env python3
"""
Test script voor Backtesting Engine
"""

from backtesting_engine import BacktestingEngine
from trading_strategy import TradingStrategy

def test_backtest():
    print("🧪 Testing Backtesting Engine...")
    print()
    
    # Create strategy and engine
    strategy = TradingStrategy()
    engine = BacktestingEngine(strategy, initial_balance=100000.0)
    
    # Run backtest met 7 dagen data
    print("Running backtest with 7 days of data...")
    results = engine.run_backtest(
        symbol="XAUUSD",
        timeframe="H1",
        days=7,
        volume=0.20
    )
    
    if results.get('error'):
        print(f"❌ Error: {results.get('error')}")
        print(f"   {results.get('message', '')}")
        return
    
    # Display results
    print("\n" + "="*70)
    print("📊 BACKTEST RESULTS")
    print("="*70)
    print(f"Symbol: {results.get('symbol', 'N/A')}")
    print(f"Timeframe: {results.get('timeframe', 'N/A')}")
    print(f"Period: {results.get('period_days', 'N/A')} days")
    print(f"Total Candles: {results.get('total_candles', 0)}")
    print(f"Processed Candles: {results.get('processed_candles', 0)}")
    print()
    print("💰 Balance:")
    print(f"  Initial: ${results['initial_balance']:,.2f}")
    print(f"  Final: ${results['final_balance']:,.2f}")
    print(f"  Return: {results['total_return_pct']:.2f}%")
    print()
    print("📈 Trading Statistics:")
    metrics = results['metrics']
    print(f"  Total Trades: {metrics['total_trades']}")
    print(f"  Winning Trades: {metrics['winning_trades']}")
    print(f"  Losing Trades: {metrics['losing_trades']}")
    print(f"  Win Rate: {metrics['win_rate']}%")
    print()
    print("💵 Performance Metrics:")
    print(f"  Total P&L: ${metrics['total_pnl']:,.2f}")
    print(f"  Profit Factor: {metrics['profit_factor']:.2f}")
    print(f"  Expectancy: ${metrics['expectancy']:.2f}")
    print(f"  Avg Win: ${metrics['avg_win']:.2f}")
    print(f"  Avg Loss: ${metrics['avg_loss']:.2f}")
    print()
    print("📊 Risk Metrics:")
    print(f"  Max Drawdown: ${metrics['max_drawdown']:,.2f} ({metrics['max_drawdown_pct']:.2f}%)")
    print(f"  Sharpe Ratio: {metrics['sharpe_ratio']:.2f}")
    print(f"  Sortino Ratio: {metrics['sortino_ratio']:.2f}")
    print(f"  Recovery Factor: {metrics['recovery_factor']:.2f}")
    print()
    
    # Show recent trades
    if results['trades']:
        print("📋 Recent Trades (last 5):")
        for trade in results['trades'][-5:]:
            status = "✅" if trade['profit'] else "❌"
            print(f"  {status} {trade['type']} @ ${trade['entry_price']:.2f} → ${trade['exit_price']:.2f} | P&L: ${trade['pnl']:.2f} ({trade['reason']})")
    
    print("\n" + "="*70)
    print("✅ Backtest completed successfully!")
    print("="*70)

if __name__ == "__main__":
    test_backtest()
