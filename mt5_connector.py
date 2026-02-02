#!/usr/bin/env python3
"""
MetaTrader 5 Connector
Connects to MT5 and retrieves trading data
"""

import os
import json
from datetime import datetime, timedelta

# Try to import MetaTrader5 library
# Note: MetaTrader5 library only works on Windows
# On macOS/Linux with Wine, we'll use demo mode
WINE_AVAILABLE = False
try:
    import subprocess
    wine_paths = [
        "/Applications/MetaTrader 5.app/Contents/SharedSupport/wine/bin/wine64",
        "/usr/local/bin/wine64",
        "/usr/bin/wine64",
        os.path.expanduser("~/.wine/bin/wine64")
    ]
    for wine_path in wine_paths:
        if os.path.exists(wine_path):
            WINE_AVAILABLE = True
            break
except:
    pass

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    if WINE_AVAILABLE:
        print("⚠️  MetaTrader5 library not available. Wine detected but library requires Windows Python.")
        print("   Running in enhanced demo mode with Wine support.")
    else:
        print("⚠️  MetaTrader5 library not available (Windows only). Running in demo mode.")
        print("   For full MT5 integration, use Windows or a Windows VM.")

class MT5Connector:
    def __init__(self):
        self.connected = False
        self.login = None
        self.password = None
        self.server = None
        
        # Load credentials from environment or .env.local
        self.load_credentials()
    
    def load_credentials(self):
        """Load MT5 credentials from environment variables"""
        # Try to read from .env.local file
        env_file = os.path.join(os.path.dirname(__file__), 'dashboard', '.env.local')
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    if line.strip() and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            if key == 'MT5_LOGIN':
                                self.login = int(value) if value.isdigit() else None
                            elif key == 'MT5_PASSWORD':
                                self.password = value
                            elif key == 'MT5_INVESTOR_PASSWORD':
                                self.investor_password = value
                            elif key == 'MT5_SERVER':
                                self.server = value
        
        # Override with environment variables if set
        self.login = int(os.getenv('MT5_LOGIN', self.login or 0))
        self.password = os.getenv('MT5_PASSWORD', self.password or '')
        self.investor_password = os.getenv('MT5_INVESTOR_PASSWORD', '')
        self.server = os.getenv('MT5_SERVER', self.server or 'MetaQuotes-Demo')
    
    def connect(self, use_investor_password=False):
        """Connect to MetaTrader 5"""
        if not MT5_AVAILABLE:
            # Demo mode - return simulated connection
            return {
                'success': True,
                'message': 'Connected to MT5 (Demo Mode)',
                'account': {
                    'login': self.login or 102199055,
                    'balance': 10000.0,
                    'equity': 10000.0,
                    'margin': 0.0,
                    'free_margin': 10000.0,
                    'server': self.server or 'MetaQuotes-Demo',
                    'currency': 'USD',
                },
                'demo_mode': True
            }
        
        if not self.login or not self.password:
            return {
                'success': False,
                'error': 'MT5 credentials not found. Please set MT5_LOGIN and MT5_PASSWORD in .env.local'
            }
        
        # Initialize MT5
        if not mt5.initialize():
            return {
                'success': False,
                'error': f'MT5 initialization failed: {mt5.last_error()}'
            }
        
        # Use investor password if requested
        password = self.investor_password if use_investor_password and self.investor_password else self.password
        
        # Login to account
        authorized = mt5.login(
            login=self.login,
            password=password,
            server=self.server
        )
        
        if authorized:
            account_info = mt5.account_info()
            self.connected = True
            return {
                'success': True,
                'message': 'Connected to MT5',
                'account': {
                    'login': account_info.login,
                    'balance': account_info.balance,
                    'equity': account_info.equity,
                    'margin': account_info.margin,
                    'free_margin': account_info.margin_free,
                    'server': account_info.server,
                    'currency': account_info.currency,
                }
            }
        else:
            error = mt5.last_error()
            mt5.shutdown()
            return {
                'success': False,
                'error': f'MT5 login failed: {error}'
            }
    
    def disconnect(self):
        """Disconnect from MT5"""
        if MT5_AVAILABLE and self.connected:
            mt5.shutdown()
            self.connected = False
    
    def get_account_info(self):
        """Get account information"""
        if not self.connected and not MT5_AVAILABLE:
            # Demo mode
            return {
                'login': self.login or 102199055,
                'balance': 10000.0,
                'equity': 10000.0,
                'margin': 0.0,
                'free_margin': 10000.0,
                'profit': 0.0,
                'server': self.server or 'MetaQuotes-Demo',
                'currency': 'USD',
                'leverage': 100,
                'company': 'MetaQuotes Software Corp.',
                'demo_mode': True
            }
        
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        account_info = mt5.account_info()
        if account_info is None:
            return {'error': 'Failed to get account info'}
        
        return {
            'login': account_info.login,
            'balance': account_info.balance,
            'equity': account_info.equity,
            'margin': account_info.margin,
            'free_margin': account_info.margin_free,
            'profit': account_info.profit,
            'server': account_info.server,
            'currency': account_info.currency,
            'leverage': account_info.leverage,
            'company': account_info.company,
        }
    
    def get_positions(self):
        """Get open positions"""
        if not self.connected and not MT5_AVAILABLE:
            # Demo mode - return empty positions
            return {'positions': [], 'demo_mode': True}
        
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        positions = mt5.positions_get()
        if positions is None:
            return {'positions': []}
        
        return {
            'positions': [
                {
                    'ticket': pos.ticket,
                    'symbol': pos.symbol,
                    'type': 'BUY' if pos.type == 0 else 'SELL',
                    'volume': pos.volume,
                    'price_open': pos.price_open,
                    'price_current': pos.price_current,
                    'profit': pos.profit,
                    'swap': pos.swap,
                    'time': datetime.fromtimestamp(pos.time).isoformat(),
                }
                for pos in positions
            ]
        }
    
    def get_history(self, start_date=None, end_date=None):
        """Get trade history"""
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        if start_date is None:
            start_date = datetime.now() - timedelta(days=30)
        if end_date is None:
            end_date = datetime.now()
        
        # Convert to timestamps
        from_date = int(start_date.timestamp())
        to_date = int(end_date.timestamp())
        
        # Get deals history
        deals = mt5.history_deals_get(from_date, to_date, group="*")
        
        if deals is None:
            return {'trades': []}
        
        trades = []
        for deal in deals:
            if deal.entry == 1:  # Entry deal
                trades.append({
                    'ticket': deal.ticket,
                    'order': deal.order,
                    'symbol': deal.symbol,
                    'type': 'BUY' if deal.type == 0 else 'SELL',
                    'volume': deal.volume,
                    'price': deal.price,
                    'profit': deal.profit,
                    'commission': deal.commission,
                    'swap': deal.swap,
                    'time': datetime.fromtimestamp(deal.time).isoformat(),
                })
        
        return {'trades': trades}
    
    def get_daily_pnl(self, year, month):
        """Get daily P&L for a specific month"""
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        start_date = datetime(year, month, 1)
        if month == 12:
            end_date = datetime(year + 1, 1, 1)
        else:
            end_date = datetime(year, month + 1, 1)
        
        deals = mt5.history_deals_get(
            int(start_date.timestamp()),
            int(end_date.timestamp()),
            group="*"
        )
        
        if deals is None:
            return {'daily_data': []}
        
        # Group by date
        daily_data = {}
        for deal in deals:
            deal_date = datetime.fromtimestamp(deal.time).date()
            date_str = deal_date.isoformat()
            
            if date_str not in daily_data:
                daily_data[date_str] = {
                    'date': date_str,
                    'pnl': 0,
                    'trades': 0
                }
            
            daily_data[date_str]['pnl'] += deal.profit
            daily_data[date_str]['trades'] += 1
        
        return {'daily_data': list(daily_data.values())}
    
    def get_symbols(self):
        """Get available trading symbols"""
        if not self.connected and not MT5_AVAILABLE:
            # Demo mode - return common forex symbols
            demo_symbols = [
                {'name': 'EURUSD', 'description': 'Euro vs US Dollar', 'currency_base': 'EUR', 'currency_profit': 'USD', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
                {'name': 'GBPUSD', 'description': 'British Pound vs US Dollar', 'currency_base': 'GBP', 'currency_profit': 'USD', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
                {'name': 'USDJPY', 'description': 'US Dollar vs Japanese Yen', 'currency_base': 'USD', 'currency_profit': 'JPY', 'digits': 3, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.001},
                {'name': 'AUDUSD', 'description': 'Australian Dollar vs US Dollar', 'currency_base': 'AUD', 'currency_profit': 'USD', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
                {'name': 'USDCAD', 'description': 'US Dollar vs Canadian Dollar', 'currency_base': 'USD', 'currency_profit': 'CAD', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
                {'name': 'NZDUSD', 'description': 'New Zealand Dollar vs US Dollar', 'currency_base': 'NZD', 'currency_profit': 'USD', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
                {'name': 'USDCHF', 'description': 'US Dollar vs Swiss Franc', 'currency_base': 'USD', 'currency_profit': 'CHF', 'digits': 5, 'trade_mode': 4, 'trade_stops_level': 0, 'point': 0.00001},
            ]
            return {'symbols': demo_symbols, 'demo_mode': True}
        
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        symbols = mt5.symbols_get()
        if symbols is None:
            return {'symbols': []}
        
        return {
            'symbols': [
                {
                    'name': sym.name,
                    'description': sym.description,
                    'currency_base': sym.currency_base,
                    'currency_profit': sym.currency_profit,
                    'digits': sym.digits,
                    'trade_mode': sym.trade_mode,
                    'trade_stops_level': sym.trade_stops_level,
                    'point': sym.point,
                }
                for sym in symbols
            ]
        }
    
    def get_symbol_info(self, symbol):
        """Get symbol information and current rates"""
        if not self.connected and not MT5_AVAILABLE:
            # Demo mode - return simulated rates
            import random
            base_rates = {
                'EURUSD': (1.08500, 1.08520),
                'GBPUSD': (1.26500, 1.26520),
                'USDJPY': (149.500, 149.520),
                'AUDUSD': (0.65500, 0.65520),
                'USDCAD': (1.34500, 1.34520),
                'NZDUSD': (0.60500, 0.60520),
                'USDCHF': (0.87500, 0.87520),
            }
            
            if symbol in base_rates:
                base_bid, base_ask = base_rates[symbol]
                # Add small random variation
                variation = random.uniform(-0.0005, 0.0005)
                bid = base_bid + variation
                ask = base_ask + variation
            else:
                bid = 1.00000
                ask = 1.00020
            
            return {
                'symbol': symbol,
                'description': f'{symbol} Demo',
                'currency_base': symbol[:3],
                'currency_profit': symbol[3:6] if len(symbol) > 3 else 'USD',
                'digits': 5,
                'point': 0.00001,
                'trade_mode': 4,
                'trade_stops_level': 0,
                'volume_min': 0.01,
                'volume_max': 100.0,
                'volume_step': 0.01,
                'bid': bid,
                'ask': ask,
                'last': (bid + ask) / 2,
                'time': datetime.now().isoformat(),
                'demo_mode': True
            }
        
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            return {'error': f'Symbol {symbol} not found'}
        
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return {'error': f'Could not get tick data for {symbol}'}
        
        return {
            'symbol': symbol_info.name,
            'description': symbol_info.description,
            'currency_base': symbol_info.currency_base,
            'currency_profit': symbol_info.currency_profit,
            'digits': symbol_info.digits,
            'point': symbol_info.point,
            'trade_mode': symbol_info.trade_mode,
            'trade_stops_level': symbol_info.trade_stops_level,
            'volume_min': symbol_info.volume_min,
            'volume_max': symbol_info.volume_max,
            'volume_step': symbol_info.volume_step,
            'bid': tick.bid,
            'ask': tick.ask,
            'last': tick.last,
            'time': datetime.fromtimestamp(tick.time).isoformat(),
        }
    
    def place_order(self, symbol, order_type, volume, price=None, sl=None, tp=None, deviation=20, comment=""):
        """
        Place a trade order
        
        Args:
            symbol: Trading symbol (e.g., 'EURUSD')
            order_type: 'BUY' or 'SELL'
            volume: Trade volume in lots
            price: Optional price (None for market order)
            sl: Stop loss price
            tp: Take profit price
            deviation: Maximum price deviation in points
            comment: Order comment
        """
        if not self.connected and not MT5_AVAILABLE:
            # Demo mode - simulate order placement
            import random
            symbol_info = self.get_symbol_info(symbol)
            if 'error' in symbol_info:
                return {'error': symbol_info['error']}
            
            order_price = price or (symbol_info['ask'] if order_type.upper() == 'BUY' else symbol_info['bid'])
            order_id = random.randint(100000, 999999)
            
            return {
                'success': True,
                'order': order_id,
                'deal': order_id,
                'volume': float(volume),
                'price': order_price,
                'bid': symbol_info['bid'],
                'ask': symbol_info['ask'],
                'comment': comment or 'AI Trader by Chiel (Demo)',
                'request_id': order_id,
                'retcode': 10009,  # TRADE_RETCODE_DONE
                'demo_mode': True
            }
        
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        # Get symbol info
        symbol_info = mt5.symbol_info(symbol)
        if symbol_info is None:
            return {'error': f'Symbol {symbol} not found'}
        
        if not symbol_info.visible:
            if not mt5.symbol_select(symbol, True):
                return {'error': f'Failed to select symbol {symbol}'}
        
        # Get current price
        tick = mt5.symbol_info_tick(symbol)
        if tick is None:
            return {'error': f'Could not get tick data for {symbol}'}
        
        # Determine order type
        if order_type.upper() == 'BUY':
            order_type_mt5 = mt5.ORDER_TYPE_BUY
            price = price or tick.ask
        elif order_type.upper() == 'SELL':
            order_type_mt5 = mt5.ORDER_TYPE_SELL
            price = price or tick.bid
        else:
            return {'error': f'Invalid order type: {order_type}. Use BUY or SELL'}
        
        # Prepare request
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": float(volume),
            "type": order_type_mt5,
            "price": price,
            "deviation": deviation,
            "magic": 234000,
            "comment": comment or f"AI Trader by Chiel",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        # Add stop loss and take profit
        if sl:
            request["sl"] = float(sl)
        if tp:
            request["tp"] = float(tp)
        
        # Send order
        result = mt5.order_send(request)
        
        if result is None:
            return {'error': f'Order send failed: {mt5.last_error()}'}
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {
                'error': f'Order failed: {result.retcode} - {result.comment}',
                'retcode': result.retcode,
                'comment': result.comment
            }
        
        return {
            'success': True,
            'order': result.order,
            'deal': result.deal,
            'volume': result.volume,
            'price': result.price,
            'bid': result.bid,
            'ask': result.ask,
            'comment': result.comment,
            'request_id': result.request_id,
            'retcode': result.retcode,
        }
    
    def close_position(self, ticket):
        """Close a position by ticket"""
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        # Get position
        position = mt5.positions_get(ticket=ticket)
        if position is None or len(position) == 0:
            return {'error': f'Position {ticket} not found'}
        
        position = position[0]
        
        # Determine opposite order type
        if position.type == mt5.ORDER_TYPE_BUY:
            order_type = mt5.ORDER_TYPE_SELL
            price = mt5.symbol_info_tick(position.symbol).bid
        else:
            order_type = mt5.ORDER_TYPE_BUY
            price = mt5.symbol_info_tick(position.symbol).ask
        
        # Close request
        request = {
            "action": mt5.TRADE_ACTION_DEAL,
            "symbol": position.symbol,
            "volume": position.volume,
            "type": order_type,
            "position": ticket,
            "price": price,
            "deviation": 20,
            "magic": 234000,
            "comment": "Close position",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": mt5.ORDER_FILLING_IOC,
        }
        
        result = mt5.order_send(request)
        
        if result is None:
            return {'error': f'Close order failed: {mt5.last_error()}'}
        
        if result.retcode != mt5.TRADE_RETCODE_DONE:
            return {
                'error': f'Close order failed: {result.retcode} - {result.comment}',
                'retcode': result.retcode,
                'comment': result.comment
            }
        
        return {
            'success': True,
            'order': result.order,
            'deal': result.deal,
            'volume': result.volume,
            'price': result.price,
            'comment': result.comment,
        }
    
    def get_orders(self):
        """Get pending orders"""
        if not self.connected:
            return {'error': 'Not connected to MT5'}
        
        orders = mt5.orders_get()
        if orders is None:
            return {'orders': []}
        
        return {
            'orders': [
                {
                    'ticket': order.ticket,
                    'symbol': order.symbol,
                    'type': 'BUY' if order.type == 0 else 'SELL',
                    'volume': order.volume_initial,
                    'volume_current': order.volume_current,
                    'price_open': order.price_open,
                    'price_current': order.price_current,
                    'sl': order.sl,
                    'tp': order.tp,
                    'time_setup': datetime.fromtimestamp(order.time_setup).isoformat(),
                    'time_expiration': datetime.fromtimestamp(order.time_expiration).isoformat() if order.time_expiration > 0 else None,
                    'comment': order.comment,
                }
                for order in orders
            ]
        }

if __name__ == '__main__':
    # Test connection
    connector = MT5Connector()
    print("Connecting to MT5...")
    result = connector.connect()
    print(json.dumps(result, indent=2))
    
    if result.get('success'):
        print("\nAccount Info:")
        account = connector.get_account_info()
        print(json.dumps(account, indent=2))
        
        print("\nPositions:")
        positions = connector.get_positions()
        print(json.dumps(positions, indent=2))
        
        connector.disconnect()
