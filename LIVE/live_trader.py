#!/usr/bin/env python3
"""
Live Trader
Integreert live trading config, position sizer en risk manager met auto_trader
"""

import sys
import os
import time
import requests
from datetime import datetime
from typing import Dict, Optional

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from trading_strategy import TradingStrategy
from market_hours import MarketHours
# Import LIVE modules
try:
    from LIVE.live_trading_config import get_config, validate_config, get_timeframe_config, merge_configs
    from LIVE.position_sizer import PositionSizer
    from LIVE.risk_manager import RiskManager
except ImportError:
    # Fallback if running from different directory
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from LIVE.live_trading_config import get_config, validate_config, get_timeframe_config, merge_configs
    from LIVE.position_sizer import PositionSizer
    from LIVE.risk_manager import RiskManager

class LiveTrader:
    def __init__(self, config_type: str = 'default', custom_config: Optional[Dict] = None):
        """
        Initialize Live Trader
        
        Args:
            config_type: 'default', 'conservative', 'moderate', or 'aggressive'
            custom_config: Optional custom configuration to override defaults
        """
        # Load configuration
        self.config = get_config(config_type)
        
        # Merge with custom config if provided
        if custom_config:
            self.config = merge_configs(self.config, custom_config)
        
        # Merge with timeframe-specific config
        timeframe_config = get_timeframe_config(self.config['timeframe'])
        self.config = merge_configs(self.config, timeframe_config)
        
        # Validate configuration
        is_valid, error_msg = validate_config(self.config)
        if not is_valid:
            raise ValueError(f"Invalid configuration: {error_msg}")
        
        # Initialize components
        self.api_url = self.config['mt5_bridge_url']
        self.strategy = TradingStrategy(bridge_url=self.api_url)
        self.position_sizer = PositionSizer()
        self.risk_manager = RiskManager()
        self.market_hours = MarketHours()
        
        # Trading state
        self.active_positions = {}
        self.starting_balance = None
        self.current_balance = None
        
        # Logging
        self.log_file = os.path.join(os.path.dirname(__file__), '..', 'LIVE', 'platform_logs.txt')
        os.makedirs(os.path.dirname(self.log_file), exist_ok=True)
        
        # Don't log initialization every time - only log when actually needed
        # This prevents spam when get_current_signal() is called frequently
        # Initialization will be logged when execute_trading_cycle() is first called
    
    def log(self, message: str, level: str = "INFO"):
        """Log message to file and console"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        print(log_entry)
        
        # Write to log file
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(log_entry + '\n')
            # Keep log file size manageable (last 500 lines)
            with open(self.log_file, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            if len(lines) > 500:
                with open(self.log_file, 'w', encoding='utf-8') as f:
                    f.writelines(lines[-500:])
        except Exception as e:
            print(f"⚠️  Error writing to log file: {e}")
    
    def get_current_signal(self) -> Dict:
        """
        Get current signal without placing a trade
        Returns signal data for preview
        """
        symbol = self.config['symbol']
        timeframe = self.config['timeframe']
        
        try:
            # Generate signal
            signal_data = self.strategy.generate_signal_from_chart(
                symbol=symbol,
                timeframe=timeframe,
                count=100
            )
            
            signal = signal_data.get('signal')
            confidence = signal_data.get('confidence', 0)
            reason = signal_data.get('reason', '')
            tp_sl = signal_data.get('tp_sl')
            analysis = signal_data.get('analysis', {})
            
            # Get current price
            current_price = analysis.get('current_price', 0)
            
            # Calculate entry price
            if signal == 'BUY':
                entry_price = analysis.get('ask', current_price)
            elif signal == 'SELL':
                entry_price = analysis.get('bid', current_price)
            else:
                entry_price = current_price
            
            # Calculate lot size if we have TP/SL
            lot_size = 0.0
            if tp_sl and signal in ['BUY', 'SELL']:
                sl_pips = tp_sl.get('sl_pips', 0)
                if sl_pips > 0:
                    account_balance = self.get_account_balance()
                    if account_balance and account_balance > 0:
                        lot_size = self.position_sizer.calculate_lot_size(
                            account_balance,
                            self.config['risk_per_trade_percent'],
                            sl_pips,
                            symbol
                        )
            
            return {
                'signal': signal,
                'confidence': confidence,
                'reason': reason,
                'tp_sl': tp_sl,
                'analysis': analysis,
                'entry_price': entry_price,
                'lot_size': lot_size,
                'symbol': symbol,
                'timeframe': timeframe,
                'confidence_threshold': self.config['confidence_threshold'],
                'risk_reward_ratio': tp_sl.get('tp_pips', 0) / tp_sl.get('sl_pips', 1) if tp_sl and tp_sl.get('sl_pips', 0) > 0 else 0
            }
        except Exception as e:
            return {
                'error': str(e),
                'signal': 'NEUTRAL',
                'confidence': 0
            }
    
    def get_account_balance(self) -> float:
        """Get current account balance from MT5"""
        try:
            response = requests.get(f"{self.api_url}/account", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if not data.get('error'):
                    balance = float(data.get('balance', 0))
                    if balance > 0:  # Only use if we got a valid balance
                        if self.starting_balance is None:
                            self.starting_balance = balance
                            self.risk_manager.reset_daily_stats()
                            # Set starting balance in risk manager
                            stats = self.risk_manager.get_daily_stats()
                            if stats['starting_balance'] == 0:
                                stats['starting_balance'] = balance
                                self.risk_manager.save_daily_stats()
                        self.current_balance = balance
                        return balance
                    else:
                        # Balance is 0 - could be real or connection issue
                        # If we have a previous balance, it's likely a connection issue
                        if self.current_balance and self.current_balance > 0:
                            print(f"⚠️  Warning: Account balance returned 0, using last known balance: ${self.current_balance:.2f}")
                            return self.current_balance
                        print(f"⚠️  Warning: Account balance is 0 or invalid: {balance}")
        except Exception as e:
            print(f"⚠️  Error getting account balance: {e}")
        
        # Fallback: use last known balance if available
        if self.current_balance and self.current_balance > 0:
            print(f"⚠️  Using last known balance (MT5 connection issue): ${self.current_balance:.2f}")
            return self.current_balance
        
        # No balance available - return -1 to indicate connection issue, not zero balance
        # This way the system knows it's a connection problem, not an actual zero balance
        # Using -1 instead of None to avoid type issues
        return -1.0
    
    def get_open_positions(self, symbol: Optional[str] = None):
        """Get open positions from MT5"""
        try:
            response = requests.get(f"{self.api_url}/positions", timeout=5)
            if response.status_code == 200:
                data = response.json()
                positions = data.get('positions', [])
                if symbol:
                    return [p for p in positions if p.get('symbol') == symbol]
                return positions
        except Exception as e:
            print(f"❌ Error getting positions: {e}")
        return []
    
    def place_trade(self, symbol: str, signal_type: str, entry_price: float, 
                   sl_pips: int, tp_pips: int) -> Optional[Dict]:
        """
        Place a trade with proper position sizing
        
        Args:
            symbol: Trading symbol
            signal_type: 'BUY' or 'SELL'
            entry_price: Entry price
            sl_pips: Stop Loss in pips
            tp_pips: Take Profit in pips
        
        Returns:
            Order info or None if failed
        """
        account_balance = self.get_account_balance()
        
        # Calculate lot size based on risk
        lot_size = self.position_sizer.calculate_lot_size(
            account_balance,
            self.config['risk_per_trade_percent'],
            sl_pips,
            symbol
        )
        
        # Get current market price (more accurate than using entry_price)
        # This ensures we use the LATEST price at order placement time
        try:
            tick_response = requests.get(f"{self.api_url}/tick/{symbol}", timeout=2)
            if tick_response.status_code == 200:
                tick_data = tick_response.json()
                if signal_type == 'BUY':
                    current_price = float(tick_data.get('ask', entry_price))
                else:  # SELL
                    current_price = float(tick_data.get('bid', entry_price))
            else:
                current_price = entry_price  # Fallback
        except:
            current_price = entry_price  # Fallback
        
        # Calculate TP/SL prices based on current market price
        # For XAUUSD: 1 pip = 0.01 (2 decimal places)
        pip_value = 0.01
        if signal_type == 'BUY':
            sl_price = round(current_price - (sl_pips * pip_value), 2)
            tp_price = round(current_price + (tp_pips * pip_value), 2)
        else:  # SELL
            sl_price = round(current_price + (sl_pips * pip_value), 2)
            tp_price = round(current_price - (tp_pips * pip_value), 2)
        
        # Place order with SL/TP (automatic protection)
        try:
            response = requests.post(
                f"{self.api_url}/place-order",
                json={
                    'symbol': symbol,
                    'type': signal_type,
                    'volume': lot_size,
                    'sl': sl_price,  # Stop Loss price (automatic)
                    'tp': tp_price,  # Take Profit price (automatic)
                    'comment': 'Live Trader'
                },
                timeout=3  # Reduced timeout for faster failure detection
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    order = data.get('order')
                    print(f"✅ Trade placed: {signal_type} {lot_size:.2f} lots @ ${entry_price:.2f}")
                    print(f"   SL: ${sl_price:.2f} ({sl_pips} pips) | TP: ${tp_price:.2f} ({tp_pips} pips)")
                    return order
            print(f"⚠️  Failed to place trade: {response.text}")
        except Exception as e:
            print(f"❌ Error placing trade: {e}")
        return None
    
    def close_position(self, ticket: int) -> bool:
        """Close a position"""
        try:
            response = requests.post(f"{self.api_url}/close-position/{ticket}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return True
            print(f"⚠️  Failed to close position {ticket}: {response.text}")
        except Exception as e:
            print(f"❌ Error closing position: {e}")
        return False
    
    def manage_positions(self, symbol: str):
        """Manage existing positions"""
        positions = self.get_open_positions(symbol)
        
        for position in positions:
            ticket = position.get('ticket')
            profit = float(position.get('profit', 0))
            
            # Check if position should be closed (TP/SL hit automatically by MT5)
            # But we can also check for signal reversal
            signal_data = self.strategy.generate_signal_from_chart(
                symbol, 
                timeframe=self.config['timeframe'],
                count=100
            )
            current_signal = signal_data.get('signal')
            pos_type = position.get('type')
            
            # Close if signal reversed
            if (pos_type == 'BUY' and current_signal == 'SELL') or \
               (pos_type == 'SELL' and current_signal == 'BUY'):
                print(f"🔄 Closing position {ticket} - Signal reversed to {current_signal}")
                if self.close_position(ticket):
                    # Record trade in risk manager
                    account_balance = self.get_account_balance()
                    self.risk_manager.record_trade(profit, account_balance)
    
    def execute_trading_cycle(self):
        """Execute one trading cycle"""
        symbol = self.config['symbol']
        timeframe = self.config['timeframe']
        
        print(f"\n{'='*60}")
        print(f"🤖 Live Trading Cycle - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        # Get account balance
        account_balance = self.get_account_balance()
        
        # If balance is -1, it's a connection issue
        # But if we have a last known balance, use that as fallback
        if account_balance == -1.0:
            if self.current_balance and self.current_balance > 0:
                print(f"⚠️  Cannot get fresh balance from MT5, using last known: ${self.current_balance:.2f}")
                self.log(f"⚠️  Using last known balance: ${self.current_balance:.2f} (MT5 connection issue)", "WARNING")
                account_balance = self.current_balance
            else:
                print(f"⚠️  Cannot get account balance from MT5. Skipping trading cycle.")
                self.log(f"⚠️  Skipping cycle: Cannot get account balance from MT5 (connection issue)", "WARNING")
                return
        
        print(f"💰 Account Balance: ${account_balance:.2f}")
        
        # Check risk manager
        should_stop, reason = self.risk_manager.should_stop_trading(
            account_balance,
            max_trades_per_day=self.config['max_trades_per_day'],
            max_daily_loss_percent=self.config['max_daily_loss_percent'],
            max_drawdown_percent=self.config['max_drawdown_percent'],
            starting_balance=self.starting_balance
        )
        
        if should_stop:
            print(f"🛑 Trading stopped: {reason}")
            self.log(f"🛑 Trading stopped: {reason}", "WARNING")
            return
        
        # Get daily stats
        stats = self.risk_manager.get_risk_summary(account_balance, self.starting_balance)
        print(f"📊 Today: {stats['trades_today']}/{self.config['max_trades_per_day']} trades | "
              f"P&L: ${stats['total_pnl']:.2f} ({stats['daily_pnl_percent']:.2f}%)")
        self.log(f"📊 Daily Stats: {stats['trades_today']}/{self.config['max_trades_per_day']} trades | P&L: ${stats['total_pnl']:.2f} ({stats['daily_pnl_percent']:.2f}%)")
        
        # Manage existing positions
        self.manage_positions(symbol)
        
        # Check if we already have a position
        positions = self.get_open_positions(symbol)
        if len(positions) > 0:
            print(f"✅ Already have {len(positions)} position(s) for {symbol}")
            self.log(f"⏸️  Skipping new trade: Already have {len(positions)} open position(s) for {symbol}")
            return
        
        # Check if can place new trade
        can_place, reason = self.risk_manager.can_place_trade(
            account_balance,
            max_trades_per_day=self.config['max_trades_per_day'],
            max_daily_loss_percent=self.config['max_daily_loss_percent'],
            starting_balance=self.starting_balance
        )
        
        if not can_place:
            print(f"⏸️  Cannot place trade: {reason}")
            self.log(f"❌ Cannot place trade: {reason}", "WARNING")
            return
        
        # Generate signal
        print(f"\n🔍 Analyzing {symbol} on {timeframe} timeframe...")
        self.log(f"🔍 Starting analysis for {symbol} on {timeframe} timeframe")
        
        signal_data = self.strategy.generate_signal_from_chart(
            symbol=symbol,
            timeframe=timeframe,
            count=100
        )
        
        signal = signal_data.get('signal')
        confidence = signal_data.get('confidence', 0)
        reason = signal_data.get('reason', '')
        tp_sl = signal_data.get('tp_sl')
        analysis = signal_data.get('analysis', {})
        
        # Log detailed analysis
        print(f"📈 Signal: {signal} (Confidence: {confidence}%)")
        print(f"💡 Reason: {reason}")
        self.log(f"📈 Signal Analysis Result: {signal} | Confidence: {confidence}% | Required: {self.config['confidence_threshold']}%")
        self.log(f"💡 Signal Reason: {reason}")
        
        # Log technical indicators if available
        if analysis:
            indicators = []
            if analysis.get('sma_trend'):
                indicators.append(f"SMA: {analysis.get('sma_trend')}")
            if analysis.get('rsi'):
                indicators.append(f"RSI: {analysis.get('rsi'):.2f}")
            if analysis.get('macd_signal'):
                indicators.append(f"MACD: {analysis.get('macd_signal')}")
            if analysis.get('support'):
                indicators.append(f"Support: ${analysis.get('support'):.2f}")
            if analysis.get('resistance'):
                indicators.append(f"Resistance: ${analysis.get('resistance'):.2f}")
            if indicators:
                self.log(f"📊 Technical Indicators: {', '.join(indicators)}")
        
        # Check confidence threshold
        if confidence < self.config['confidence_threshold']:
            print(f"⚠️  Confidence too low ({confidence}% < {self.config['confidence_threshold']}%)")
            self.log(f"❌ Trade REJECTED: Confidence too low ({confidence}% < {self.config['confidence_threshold']}%)", "WARNING")
            return
        
        # Check if signal is valid
        if signal not in ['BUY', 'SELL']:
            print(f"⏸️  No valid signal (got {signal})")
            self.log(f"❌ Trade REJECTED: No valid signal (got {signal})", "WARNING")
            return
        
        # Check risk/reward ratio
        if tp_sl:
            tp_pips = tp_sl.get('tp_pips', 0)
            sl_pips = tp_sl.get('sl_pips', 0)
            
            self.log(f"🎯 TP/SL Calculation: TP={tp_pips} pips, SL={sl_pips} pips")
            
            if sl_pips > 0:
                rr_ratio = tp_pips / sl_pips
                self.log(f"📊 Risk/Reward Ratio: {rr_ratio:.2f} (Required: {self.config['min_risk_reward_ratio']})")
                
                if rr_ratio < self.config['min_risk_reward_ratio']:
                    print(f"⚠️  Risk/Reward ratio too low ({rr_ratio:.2f} < {self.config['min_risk_reward_ratio']})")
                    self.log(f"❌ Trade REJECTED: Risk/Reward ratio too low ({rr_ratio:.2f} < {self.config['min_risk_reward_ratio']})", "WARNING")
                    return
                
                # Place trade
                entry_price = signal_data.get('analysis', {}).get('current_price', 0)
                if entry_price > 0:
                    self.log(f"✅ Trade APPROVED: {signal} {symbol} @ ${entry_price:.2f} | SL: {sl_pips} pips | TP: {tp_pips} pips", "SUCCESS")
                    order = self.place_trade(symbol, signal, entry_price, sl_pips, tp_pips)
                    if order:
                        # Record in risk manager (will be updated when trade closes)
                        ticket = order.get('ticket') if isinstance(order, dict) else order
                        self.active_positions[symbol] = {
                            'ticket': ticket,
                            'type': signal,
                            'entry_price': entry_price
                        }
                        self.log(f"🎉 Trade PLACED successfully! Ticket: {ticket} | {signal} {symbol} @ ${entry_price:.2f}", "SUCCESS")
                    else:
                        self.log(f"❌ Trade FAILED to place: {signal} {symbol}", "ERROR")
                else:
                    self.log(f"❌ Trade REJECTED: Cannot determine entry price", "ERROR")
    
    def run(self, check_interval: int = 60):
        """
        Run live trader continuously
        
        Args:
            check_interval: How often to check for signals (in seconds)
        """
        print(f"\n🚀 Starting Live Trader...")
        print(f"   Check interval: {check_interval} seconds")
        print(f"   Press Ctrl+C to stop\n")
        
        try:
            while True:
                try:
                    self.execute_trading_cycle()
                except Exception as e:
                    print(f"❌ Error in trading cycle: {e}")
                    import traceback
                    traceback.print_exc()
                
                print(f"\n⏳ Waiting {check_interval} seconds until next check...")
                time.sleep(check_interval)
                
        except KeyboardInterrupt:
            print(f"\n\n🛑 Live Trader stopped by user")
            # Show final stats
            account_balance = self.get_account_balance()
            stats = self.risk_manager.get_risk_summary(account_balance, self.starting_balance)
            print("\n📊 Final Daily Stats:")
            for key, value in stats.items():
                print(f"   {key}: {value}")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Live Trader for MetaTrader 5')
    parser.add_argument('--config', type=str, default='default',
                       choices=['default', 'conservative', 'moderate', 'aggressive'],
                       help='Configuration type')
    parser.add_argument('--interval', type=int, default=60,
                       help='Check interval in seconds')
    
    args = parser.parse_args()
    
    trader = LiveTrader(config_type=args.config)
    trader.run(check_interval=args.interval)
