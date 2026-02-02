#!/usr/bin/env python3
"""
Automatic Trading Service for AI Trader by Chiel
Monitors trading signals and automatically places/closes trades
"""

import time
import requests
import json
from datetime import datetime
from trading_strategy import TradingStrategy
from ml_strategy import MLTradingStrategy
from market_hours import MarketHours

class AutoTrader:
    def __init__(self, api_url="http://localhost:5002", check_interval=60):
        """
        Initialize Auto Trader
        
        Args:
            api_url: Bridge API URL
            check_interval: How often to check for signals (in seconds)
        """
        self.api_url = api_url
        self.check_interval = check_interval
        self.strategy = TradingStrategy(api_url=api_url)
        self.market_hours = MarketHours()
        self.active_positions = {}  # Track active positions: {symbol: {ticket, type, signal}}
        self.last_signals = {}  # Track last signal for each symbol
        
    def get_open_positions(self, symbol=None):
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
    
    def place_trade(self, symbol, signal_type, volume=0.20, sl=None, tp=None):
        """Place a trade via the bridge"""
        try:
            response = requests.post(
                f"{self.api_url}/place-order",
                json={
                    'symbol': symbol,
                    'type': signal_type,
                    'volume': volume,
                    'sl': sl,
                    'tp': tp,
                    'comment': 'AI Auto Trader'
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return data.get('order')
            print(f"⚠️ Failed to place trade: {response.text}")
        except Exception as e:
            print(f"❌ Error placing trade: {e}")
        return None
    
    def close_position(self, ticket):
        """Close a position via the bridge"""
        try:
            response = requests.post(f"{self.api_url}/close-position/{ticket}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    return True
            print(f"⚠️ Failed to close position {ticket}: {response.text}")
        except Exception as e:
            print(f"❌ Error closing position: {e}")
        return False
    
    def should_close_position(self, position, current_signal):
        """
        Determine if a position should be closed
        
        Args:
            position: Position dict from MT5
            current_signal: Current signal from strategy ('BUY', 'SELL', 'NEUTRAL')
        
        Returns:
            bool: True if position should be closed
        """
        pos_type = position.get('type')
        profit = float(position.get('profit', 0))
        
        # Close if signal changed to opposite or neutral
        if current_signal == 'NEUTRAL':
            return True
        
        if pos_type == 'BUY' and current_signal == 'SELL':
            return True
        
        if pos_type == 'SELL' and current_signal == 'BUY':
            return True
        
        # Close if profit target reached (e.g., +$100)
        if profit >= 100:
            return True
        
        # Close if stop loss reached (e.g., -$50)
        if profit <= -50:
            return True
        
        return False
    
    def manage_positions(self, symbol):
        """Manage existing positions for a symbol"""
        positions = self.get_open_positions(symbol)
        
        # Get current signal
        signal_data = self.strategy.generate_signal_from_chart(symbol, timeframe="H1", count=100)
        current_signal = signal_data.get('signal')
        confidence = signal_data.get('confidence', 0)
        
        for position in positions:
            ticket = position.get('ticket')
            pos_type = position.get('type')
            
            # Check if we should close this position
            if self.should_close_position(position, current_signal):
                print(f"🔄 Closing position {ticket} ({pos_type}) - Signal changed to {current_signal}")
                if self.close_position(ticket):
                    print(f"✅ Position {ticket} closed successfully")
                    # Remove from tracking
                    if symbol in self.active_positions:
                        # Get position info before removing
                        pos_info = self.active_positions[symbol]
                        self.active_positions[symbol] = None
                        
                        # Send webhook/alert for trade closed
                        try:
                            from webhook_service import WebhookService
                            webhook_service = WebhookService()
                            # Get position profit from MT5
                            positions = self.get_open_positions(symbol)
                            profit = 0
                            for p in positions:
                                if p.get('ticket') == ticket:
                                    profit = float(p.get('profit', 0))
                                    break
                            
                            webhook_service.send_alert('trade_closed', {
                                'symbol': symbol,
                                'ticket': ticket,
                                'type': pos_info.get('type'),
                                'pnl': profit,
                                'reason': f'Signal changed to {current_signal}'
                            })
                        except Exception as e:
                            pass  # Webhook is optional
                continue
            
            # Track active position
            if symbol not in self.active_positions or self.active_positions[symbol] is None:
                self.active_positions[symbol] = {
                    'ticket': ticket,
                    'type': pos_type,
                    'signal': current_signal
                }
    
    def is_market_open(self):
        """Check if any major market is open"""
        status = self.market_hours.get_market_status()
        return any(info['is_open'] for info in status.values())
    
    def execute_trading_cycle(self, symbol="XAUUSD", volume=0.20):
        """Execute one trading cycle: check signals and manage positions"""
        print(f"\n{'='*60}")
        print(f"🤖 Auto Trading Cycle - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*60}")
        
        # Check if market is open
        if not self.is_market_open():
            print("⚠️  Market is CLOSED (weekend or outside trading hours)")
            print("   Skipping trading cycle...")
            return
        
        # Manage existing positions
        print(f"\n📊 Managing positions for {symbol}...")
        self.manage_positions(symbol)
        
        # Get current signal met patroonherkenning
        print(f"\n🔍 Analyzing {symbol}...")
        print(f"   📊 Reading candlestick data from MT5...")
        signal_data = self.strategy.generate_signal_from_chart(symbol, timeframe="H1", count=100)
        
        signal = signal_data.get('signal')
        confidence = signal_data.get('confidence', 0)
        reason = signal_data.get('reason', '')
        tp_sl = signal_data.get('tp_sl')
        analysis = signal_data.get('analysis', {})
        
        print(f"📈 Signal: {signal} (Confidence: {confidence}%)")
        print(f"💡 Reason: {reason}")
        
        # Toon support/resistance info
        if analysis.get('support', 0) > 0 or analysis.get('resistance', 0) > 0:
            print(f"📊 Support: ${analysis.get('support', 0):.2f} | Resistance: ${analysis.get('resistance', 0):.2f}")
        
        # Toon candlestick patronen
        if analysis.get('candlestick_patterns'):
            print(f"🕯️  Candlestick Patterns: {', '.join(analysis.get('candlestick_patterns', []))}")
        
        # Check if we already have a position for this symbol
        positions = self.get_open_positions(symbol)
        has_position = len(positions) > 0
        
        if has_position:
            print(f"✅ Already have {len(positions)} position(s) for {symbol}")
            return
        
        # Only place new trade if signal is strong and we don't have a position
        if signal in ['BUY', 'SELL'] and confidence >= 60:
            # Gebruik dynamische TP/SL als beschikbaar
            sl = None
            tp = None
            if tp_sl:
                sl = tp_sl.get('sl')
                tp = tp_sl.get('tp')
                print(f"🎯 Dynamic TP/SL calculated:")
                print(f"   Take Profit: ${tp:.2f} ({tp_sl.get('tp_pips', 0)} pips)")
                print(f"   Stop Loss: ${sl:.2f} ({tp_sl.get('sl_pips', 0)} pips)")
                print(f"   Method: {tp_sl.get('method', 'unknown')}")
            
            print(f"\n🚀 Placing {signal} order for {symbol}...")
            ticket = self.place_trade(symbol, signal, volume=volume, sl=sl, tp=tp)
            
            if ticket:
                print(f"✅ Trade placed successfully! Ticket: {ticket}")
                self.active_positions[symbol] = {
                    'ticket': ticket,
                    'type': signal,
                    'signal': signal
                }
                self.last_signals[symbol] = signal
            else:
                print(f"❌ Failed to place trade")
        elif signal == 'NEUTRAL':
            print(f"⏸️  Signal is NEUTRAL - no action taken")
        elif confidence < 60:
            print(f"⚠️  Signal confidence too low ({confidence}%) - minimum 60% required")
    
    def run(self, symbol="XAUUSD", volume=0.20):
        """Run the auto trader continuously"""
        print(f"🤖 Auto Trader Starting...")
        print(f"📊 Symbol: {symbol}")
        print(f"💰 Volume: {volume}")
        print(f"⏱️  Check Interval: {self.check_interval} seconds")
        print(f"\n🔄 Starting trading cycle...")
        
        try:
            while True:
                try:
                    self.execute_trading_cycle(symbol=symbol, volume=volume)
                except Exception as e:
                    print(f"❌ Error in trading cycle: {e}")
                    import traceback
                    traceback.print_exc()
                
                print(f"\n⏳ Waiting {self.check_interval} seconds until next check...")
                time.sleep(self.check_interval)
                
        except KeyboardInterrupt:
            print(f"\n\n🛑 Auto Trader stopped by user")
        except Exception as e:
            print(f"\n❌ Fatal error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    import sys
    
    # Default settings
    symbol = "XAUUSD"
    volume = 0.20
    check_interval = 60  # Check every 60 seconds
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        symbol = sys.argv[1]
    if len(sys.argv) > 2:
        volume = float(sys.argv[2])
    if len(sys.argv) > 3:
        check_interval = int(sys.argv[3])
    
    trader = AutoTrader(check_interval=check_interval)
    trader.run(symbol=symbol, volume=volume)
