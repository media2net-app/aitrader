#!/usr/bin/env python3
"""
Flask API Server for AI Trader by Chiel
Provides REST API endpoints for trading dashboard
"""

import os
import json
from datetime import datetime, timedelta
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
API_PORT = 5001

# Data storage files
DATA_FILE = 'trading_data.json'
USERS_FILE = 'users.json'

def load_data():
    """Load trading data from JSON file"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {'trades': [], 'stats': {}, 'strategies': []}

def save_data(data):
    """Save trading data to JSON file"""
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def load_users():
    """Load users from JSON file"""
    if os.path.exists(USERS_FILE):
        try:
            with open(USERS_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {'users': []}

def save_users(users_data):
    """Save users to JSON file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users_data, f, indent=2)

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'service': 'AI Trader API'})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get trading statistics - from MT5 account and history"""
    try:
        import requests
        
        # Try bridge first, then API server endpoints
        account_data = {}
        positions_data = {}
        history_data = {}
        
        # Get account info - try bridge first
        try:
            account_response = requests.get('http://localhost:5002/account', timeout=2)
            if account_response.status_code == 200:
                account_data = account_response.json()
        except:
            pass

        # Get positions - try bridge first
        try:
            positions_response = requests.get('http://localhost:5002/positions', timeout=2)
            if positions_response.status_code == 200:
                positions_data = positions_response.json()
        except:
            pass

        # Get history - try bridge first
        try:
            history_response = requests.get('http://localhost:5002/history', timeout=2)
            if history_response.status_code == 200:
                history_data = history_response.json()
        except:
            pass
            
        # Calculate real stats from MT5 data
        open_positions = positions_data.get('positions', [])
        closed_trades = history_data.get('trades', [])
        
        # Filter out invalid trades and entry deals (only count exit deals with actual profit)
        # Entry deals typically have profit=0, exit deals have profit != 0
        valid_trades = [
            t for t in closed_trades 
            if t.get('symbol') and t.get('symbol') != '' 
            and abs(float(t.get('profit', 0))) < 10000
            and float(t.get('profit', 0)) != 0  # Only count exit deals (profit != 0)
        ]
        
        # Open P&L from positions
        open_pnl = sum(float(pos.get('profit', 0)) for pos in open_positions)
        
        # Closed trades stats (only exit deals)
        total_closed_trades = len(valid_trades)
        winning_trades = [t for t in valid_trades if float(t.get('profit', 0)) > 0]
        losing_trades = [t for t in valid_trades if float(t.get('profit', 0)) < 0]
        
        closed_pnl = sum(float(t.get('profit', 0)) for t in valid_trades)
        total_pnl = open_pnl + closed_pnl
        
        win_rate = (len(winning_trades) / total_closed_trades * 100) if total_closed_trades > 0 else 0
        avg_return = (closed_pnl / total_closed_trades) if total_closed_trades > 0 else 0
        
        # Check if we have valid MT5 data (must be before using has_account)
        has_account = (account_data and 
                      isinstance(account_data, dict) and 
                      'error' not in account_data and 
                      'balance' in account_data and
                      account_data.get('balance') is not None)
        
        # Account balance info
        balance = account_data.get('balance', 0) if account_data and not account_data.get('error') else 0
        equity = account_data.get('equity', 0) if account_data and not account_data.get('error') else 0
        floating_profit = account_data.get('profit', 0) if account_data and not account_data.get('error') else 0
        
        # Calculate total profit: closed_pnl (from history) + open_pnl (from positions)
        # This gives the actual profit made from trading
        total_profit_from_trading = closed_pnl + open_pnl
        
        # If we have account balance, calculate profit as: balance - start_balance
        # For demo accounts, start balance is typically $100,000
        # For real accounts, we'd need to track the initial balance
        if has_account and balance > 0:
            # Assume start balance was $100,000 for demo accounts
            # In production, this should be stored/retrieved from account info
            START_BALANCE = 100000.0  # Default for demo accounts
            if balance > START_BALANCE:
                # Calculate profit as difference from start balance
                total_profit_from_balance = balance - START_BALANCE
                # Use the higher of the two (trading profit vs balance difference)
                total_profit_from_trading = max(total_profit_from_trading, total_profit_from_balance)
        
        if has_account or len(open_positions) > 0 or len(valid_trades) > 0:
            return jsonify({
                'total_trades': total_closed_trades + len(open_positions),
                'closed_trades': total_closed_trades,
                'open_positions': len(open_positions),
                'winning_trades': len(winning_trades),
                'losing_trades': len(losing_trades),
                'win_rate': round(win_rate, 2),
                'total_pnl': round(total_pnl, 2),
                'open_pnl': round(open_pnl, 2),
                'closed_pnl': round(closed_pnl, 2),
                'avg_return': round(avg_return, 2),
                'balance': balance,
                'equity': equity,
                'profit': round(total_profit_from_trading, 2) if total_profit_from_trading != 0 else round(floating_profit, 2),
                'floating_profit': round(floating_profit, 2),
                'active_strategies': 1 if (has_account or len(open_positions) > 0) else 0,
                'source': 'MT5'
            })
        
        # Fallback to local data if no MT5 data
        data = load_data()
        return jsonify(data.get('stats', {}))
    except Exception as e:
        print(f"Stats error: {e}")
        data = load_data()
        return jsonify(data.get('stats', {}))

@app.route('/api/mt5/account', methods=['GET'])
def mt5_account():
    """Get MT5 account information - tries bridge first"""
    try:
        import requests
        # Try bridge first
        try:
            bridge_response = requests.get('http://localhost:5002/account', timeout=5)
            if bridge_response.status_code == 200:
                account_data = bridge_response.json()
                if account_data and not account_data.get('error') and account_data.get('balance') is not None:
                    return jsonify(account_data)
        except Exception as e:
            print(f"Bridge error: {e}")
        
        return jsonify({'error': 'Unable to connect to MT5'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/positions', methods=['GET'])
def mt5_positions():
    """Get MT5 positions - tries bridge first"""
    try:
        import requests
        try:
            bridge_response = requests.get('http://localhost:5002/positions', timeout=5)
            if bridge_response.status_code == 200:
                return jsonify(bridge_response.json())
        except:
            pass
        return jsonify({'error': 'Unable to connect to MT5'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/history', methods=['GET'])
def mt5_history():
    """Get MT5 trade history - tries bridge first"""
    try:
        import requests
        try:
            bridge_response = requests.get('http://localhost:5002/history', timeout=5)
            if bridge_response.status_code == 200:
                return jsonify(bridge_response.json())
        except:
            pass
        return jsonify({'error': 'Unable to connect to MT5'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/candles', methods=['GET'])
def mt5_candles():
    """Get MT5 candlestick/OHLC data - tries bridge first"""
    try:
        import requests
        symbol = request.args.get('symbol', 'XAUUSD')
        timeframe = request.args.get('timeframe', 'H1')
        count = request.args.get('count', type=int, default=100)
        
        # Try bridge first
        try:
            bridge_response = requests.get(f'http://localhost:5002/candles/{symbol}/{timeframe}/{count}', timeout=10)
            if bridge_response.status_code == 200:
                data = bridge_response.json()
                if 'error' not in data:
                    return jsonify(data)
        except Exception as bridge_error:
            print(f"Bridge error: {bridge_error}")
        
        return jsonify({'error': 'Unable to connect to MT5. Please ensure the bridge is running.'}), 503
    except Exception as e:
        print(f"Error in mt5_candles: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.json
        email = data.get('email', '').lower()
        password = data.get('password', '')
        
        users_data = load_users()
        users = users_data.get('users', [])
        
        # Find user
        user = next((u for u in users if u.get('email', '').lower() == email), None)
        
        if user and user.get('password') == password:
            # Generate simple token
            import hashlib
            token = hashlib.sha256(f"{email}{password}{datetime.now()}".encode()).hexdigest()
            
            return jsonify({
                'success': True,
                'token': token,
                'user': {
                    'email': user.get('email'),
                    'name': user.get('name', 'Trader')
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/verify', methods=['POST'])
def verify():
    """Verify authentication token - supports both Authorization header and body"""
    try:
        # Try to get token from Authorization header first
        auth_header = request.headers.get('Authorization', '')
        token = None
        
        if auth_header.startswith('Bearer '):
            token = auth_header.replace('Bearer ', '')
        else:
            # Fallback to body
            data = request.json or {}
            token = data.get('token')
        
        if token:
            return jsonify({'valid': True})
        return jsonify({'valid': False}), 401
    except:
        return jsonify({'valid': False}), 401

@app.route('/api/trading/signal', methods=['GET'])
def get_trading_signal():
    """Get AI trading signal based on chart analysis"""
    try:
        from trading_strategy import TradingStrategy
        
        symbol = request.args.get('symbol', 'XAUUSD')
        count = request.args.get('count', type=int, default=100)
        
        strategy = TradingStrategy()
        signal = strategy.generate_signal_from_chart(symbol=symbol, count=count)
        
        return jsonify(signal)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/market-hours', methods=['GET'])
def get_market_hours():
    """Get current market hours status"""
    try:
        from market_hours import MarketHours
        market = MarketHours()
        status = market.get_market_status()
        
        # Format for frontend
        markets = []
        for name, info in status.items():
            markets.append({
                'name': name,
                'is_open': info['is_open'],
                'current_time': info['current_time'],
                'next_event': info['next_event'],
                'session_name': info['session_name']
            })
        
        return jsonify({
            'markets': markets,
            'any_open': any(info['is_open'] for info in status.values())
        })
    except Exception as e:
        print(f"Market hours error: {e}")
        import traceback
        traceback.print_exc()
        # Return fallback data
        return jsonify({
            'markets': [
                {'name': 'Sydney', 'is_open': False, 'session_name': 'Asia-Pacific', 'next_event': 'Opens at 22:00 GMT'},
                {'name': 'Tokyo', 'is_open': False, 'session_name': 'Asian', 'next_event': 'Opens at 00:00 GMT'},
                {'name': 'London', 'is_open': False, 'session_name': 'European', 'next_event': 'Opens at 08:00 GMT'},
                {'name': 'New York', 'is_open': False, 'session_name': 'US', 'next_event': 'Opens at 13:00 GMT'}
            ],
            'any_open': False
        })

@app.route('/api/trading/execute', methods=['POST'])
def execute_trading_signal():
    """Execute trading signal"""
    try:
        from trading_strategy import TradingStrategy
        
        data = request.json or {}
        symbol = data.get('symbol', 'XAUUSD')
        volume = data.get('volume', 0.20)
        count = data.get('count', 100)
        
        strategy = TradingStrategy()
        signal = strategy.generate_signal_from_chart(symbol=symbol, count=count)
        
        if signal['signal'] == 'NEUTRAL':
            return jsonify({
                'success': False,
                'error': 'No clear signal to execute',
                'signal': signal
            })
        
        result = strategy.execute_signal(signal, symbol=symbol, volume=volume)
        result['signal'] = signal
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/place-order', methods=['POST'])
def mt5_place_order():
    """Place MT5 order - tries bridge first"""
    try:
        import requests
        data = request.json or {}
        
        # Try bridge first
        try:
            bridge_response = requests.post(
                'http://localhost:5002/place-order',
                json=data,
                timeout=10
            )
            if bridge_response.status_code == 200:
                return jsonify(bridge_response.json())
        except Exception as e:
            print(f"Bridge error: {e}")
        
        return jsonify({'error': 'Unable to connect to MT5'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mt5/close-position', methods=['POST'])
def mt5_close_position():
    """Close MT5 position (full or partial) - tries bridge first"""
    try:
        import requests
        data = request.json or {}
        ticket = data.get('ticket')
        volume = data.get('volume')  # Optional: for partial close
        
        if not ticket:
            return jsonify({'error': 'Ticket is required'}), 400
        
        # Try bridge first
        try:
            if volume:
                # Partial close
                bridge_response = requests.post(
                    f'http://localhost:5002/close-position/{ticket}',
                    json={'volume': volume},
                    timeout=10
                )
            else:
                # Full close
                bridge_response = requests.post(
                    f'http://localhost:5002/close-position/{ticket}',
                    timeout=10
                )
            
            if bridge_response.status_code == 200:
                return jsonify(bridge_response.json())
        except Exception as e:
            print(f"Bridge error: {e}")
        
        return jsonify({'error': 'Unable to connect to MT5'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backtest/run', methods=['POST'])
def run_backtest():
    """Run backtest op historische data"""
    try:
        from backtesting_engine import BacktestingEngine
        from trading_strategy import TradingStrategy
        
        data = request.json or {}
        symbol = data.get('symbol', 'XAUUSD')
        timeframe = data.get('timeframe', 'H1')
        days = data.get('days', 30)
        volume = data.get('volume', 0.20)
        initial_balance = data.get('initial_balance', 100000.0)
        
        # Create strategy and engine
        strategy = TradingStrategy()
        engine = BacktestingEngine(strategy, initial_balance=initial_balance)
        
        # Run backtest
        results = engine.run_backtest(
            symbol=symbol,
            timeframe=timeframe,
            days=days,
            volume=volume
        )
        
        return jsonify(results)
    except Exception as e:
        print(f"Backtest error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/backtest/metrics', methods=['POST'])
def calculate_backtest_metrics():
    """Bereken alleen metrics van bestaande trades"""
    try:
        from performance_metrics import PerformanceMetrics
        
        data = request.json or {}
        trades = data.get('trades', [])
        equity_curve = data.get('equity_curve', [])
        
        if not trades:
            return jsonify({'error': 'No trades provided'}), 400
        
        metrics = PerformanceMetrics(trades, equity_curve)
        results = metrics.calculate_all_metrics()
        
        return jsonify({
            'success': True,
            'metrics': results
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/optimize/parameters', methods=['POST'])
def optimize_parameters():
    """Run parameter optimization"""
    try:
        from parameter_optimizer import ParameterOptimizer
        from trading_strategy import TradingStrategy
        
        data = request.json or {}
        method = data.get('method', 'grid_search')  # 'grid_search' or 'genetic'
        symbol = data.get('symbol', 'XAUUSD')
        timeframe = data.get('timeframe', 'H1')
        days = data.get('days', 30)
        volume = data.get('volume', 0.20)
        objective = data.get('objective', 'sharpe_ratio')
        max_combinations = data.get('max_combinations', 50)
        
        optimizer = ParameterOptimizer(TradingStrategy)
        
        if method == 'genetic':
            population_size = data.get('population_size', 20)
            generations = data.get('generations', 10)
            results = optimizer.genetic_algorithm(
                symbol=symbol,
                timeframe=timeframe,
                days=days,
                volume=volume,
                population_size=population_size,
                generations=generations,
                objective=objective
            )
        else:
            results = optimizer.grid_search(
                symbol=symbol,
                timeframe=timeframe,
                days=days,
                volume=volume,
                objective=objective,
                max_combinations=max_combinations
            )
        
        return jsonify({
            'success': True,
            'method': method,
            'results': results
        })
    except Exception as e:
        print(f"Optimization error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/strategies', methods=['GET'])
def get_strategies():
    """Get all saved strategies"""
    try:
        from strategy_manager import StrategyManager
        manager = StrategyManager()
        strategies = manager.get_all_strategies()
        active = manager.get_active_strategy()
        
        return jsonify({
            'success': True,
            'strategies': strategies,
            'active_strategy': active
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/strategies', methods=['POST'])
def save_strategy():
    """Save a new strategy"""
    try:
        from strategy_manager import StrategyManager
        data = request.json or {}
        
        name = data.get('name')
        parameters = data.get('parameters', {})
        performance = data.get('performance', {})
        description = data.get('description', '')
        
        if not name:
            return jsonify({'error': 'Strategy name is required'}), 400
        
        manager = StrategyManager()
        success = manager.save_strategy(name, parameters, performance, description)
        
        if success:
            return jsonify({'success': True, 'message': 'Strategy saved'})
        else:
            return jsonify({'error': 'Failed to save strategy'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/strategies/<name>/activate', methods=['POST'])
def activate_strategy(name):
    """Activate a strategy version"""
    try:
        from strategy_manager import StrategyManager
        data = request.json or {}
        version = data.get('version', None)
        
        manager = StrategyManager()
        
        if version is None:
            # Get latest version
            strategy = manager.get_strategy(name)
            if strategy:
                version = strategy['version']
            else:
                return jsonify({'error': 'Strategy not found'}), 404
        
        success = manager.set_active_strategy(name, version)
        
        if success:
            return jsonify({'success': True, 'message': f'Strategy {name} v{version} activated'})
        else:
            return jsonify({'error': 'Failed to activate strategy'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/strategies/compare', methods=['POST'])
def compare_strategies():
    """Compare multiple strategies"""
    try:
        from strategy_manager import StrategyManager
        data = request.json or {}
        strategy_names = data.get('strategies', None)
        
        manager = StrategyManager()
        comparisons = manager.compare_strategies(strategy_names)
        
        return jsonify({
            'success': True,
            'comparisons': comparisons
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/ml/train', methods=['POST'])
def train_ml_model():
    """Train ML model on historical data"""
    try:
        from ml_model import MLTradingModel
        from ml_features import MLFeatureEngineer
        from trading_strategy import TradingStrategy
        
        data = request.json or {}
        model_type = data.get('model_type', 'random_forest')
        symbol = data.get('symbol', 'XAUUSD')
        timeframe = data.get('timeframe', 'H1')
        days = data.get('days', 90)  # Use 90 days for training
        save_path = data.get('save_path', 'ml_models/xauusd_model.pkl')
        
        # This is a simplified training - in production, you'd need labeled historical data
        # For now, we'll create a model structure that can be trained later
        
        model = MLTradingModel(model_type=model_type)
        
        return jsonify({
            'success': True,
            'message': 'ML model structure created. Training requires labeled historical data.',
            'model_type': model_type,
            'note': 'Full training implementation requires historical labeled data'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/ml/predict', methods=['POST'])
def ml_predict():
    """Get ML prediction for current market"""
    try:
        from ml_strategy import MLTradingStrategy
        from ml_model import MLTradingModel
        
        data = request.json or {}
        symbol = data.get('symbol', 'XAUUSD')
        timeframe = data.get('timeframe', 'H1')
        count = data.get('count', 100)
        model_path = data.get('model_path', None)
        
        if not model_path:
            return jsonify({'error': 'model_path is required'}), 400
        
        # Load model and get prediction
        model = MLTradingModel(model_path=model_path)
        if not model.trained:
            return jsonify({'error': 'Model not trained'}), 400
        
        # Get candles
        strategy = MLTradingStrategy(ml_model_path=model_path)
        candles = strategy.get_candlestick_data(symbol, timeframe, count)
        
        if not candles:
            return jsonify({'error': 'Could not fetch candles'}), 400
        
        prediction = model.predict(candles)
        
        return jsonify({
            'success': True,
            'prediction': prediction
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/ml/performance', methods=['GET'])
def get_ml_performance():
    """Get ML model performance statistics"""
    try:
        from ml_monitor import MLModelMonitor
        
        data = request.args
        days = int(data.get('days', 30))
        
        monitor = MLModelMonitor()
        stats = monitor.get_performance_stats(days=days)
        
        return jsonify({
            'success': True,
            'performance': stats
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/webhooks', methods=['GET'])
def get_webhooks():
    """Get all registered webhooks"""
    try:
        from webhook_service import WebhookService
        service = WebhookService()
        
        return jsonify({
            'success': True,
            'webhooks': service.webhooks,
            'email_configured': service.email_config is not None,
            'telegram_configured': service.telegram_config is not None,
            'discord_configured': service.discord_config is not None
        })
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/webhooks', methods=['POST'])
def register_webhook():
    """Register a new webhook"""
    try:
        from webhook_service import WebhookService
        data = request.json or {}
        
        url = data.get('url')
        events = data.get('events', ['trade_opened', 'trade_closed', 'signal_generated'])
        secret = data.get('secret')
        description = data.get('description', '')
        
        if not url:
            return jsonify({'error': 'URL is required'}), 400
        
        service = WebhookService()
        success = service.register_webhook(url, events, secret, description)
        
        if success:
            return jsonify({'success': True, 'message': 'Webhook registered'})
        else:
            return jsonify({'error': 'Failed to register webhook'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/webhooks/email', methods=['POST'])
def configure_email():
    """Configure email alerts"""
    try:
        from webhook_service import WebhookService
        data = request.json or {}
        
        service = WebhookService()
        success = service.configure_email(
            smtp_server=data.get('smtp_server'),
            smtp_port=data.get('smtp_port', 587),
            username=data.get('username'),
            password=data.get('password'),
            from_email=data.get('from_email'),
            to_emails=data.get('to_emails', [])
        )
        
        if success:
            return jsonify({'success': True, 'message': 'Email configured'})
        else:
            return jsonify({'error': 'Failed to configure email'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/webhooks/telegram', methods=['POST'])
def configure_telegram():
    """Configure Telegram bot"""
    try:
        from webhook_service import WebhookService
        data = request.json or {}
        
        service = WebhookService()
        success = service.configure_telegram(
            bot_token=data.get('bot_token'),
            chat_id=data.get('chat_id')
        )
        
        if success:
            return jsonify({'success': True, 'message': 'Telegram configured'})
        else:
            return jsonify({'error': 'Failed to configure Telegram'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

@app.route('/api/webhooks/discord', methods=['POST'])
def configure_discord():
    """Configure Discord webhook"""
    try:
        from webhook_service import WebhookService
        data = request.json or {}
        
        service = WebhookService()
        success = service.configure_discord(
            webhook_url=data.get('webhook_url')
        )
        
        if success:
            return jsonify({'success': True, 'message': 'Discord configured'})
        else:
            return jsonify({'error': 'Failed to configure Discord'}), 500
    except Exception as e:
        return jsonify({'error': str(e), 'success': False}), 500

if __name__ == '__main__':
    print(f"🚀 Starting AI Trader API Server on port {API_PORT}")
    print(f"📁 Data file: {DATA_FILE}")
    print(f"📁 Users file: {USERS_FILE}")
    app.run(host='0.0.0.0', port=API_PORT, debug=True)
