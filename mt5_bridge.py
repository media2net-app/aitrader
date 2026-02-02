#!/usr/bin/env python3
"""
MetaTrader 5 REST API Bridge
Communicates with MT5 via MQL5 Expert Advisor using file-based communication
"""

import os
import json
import time
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
BRIDGE_PORT = 5002  # Port for this bridge service

# MT5 Common Files folder (where FILE_COMMON files are stored)
# On Wine/macOS, FILE_COMMON points to Terminal/Common/Files, NOT MQL5/Files/Common!
MT5_COMMON_FOLDER = os.path.expanduser(
    "~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/user/AppData/Roaming/MetaQuotes/Terminal/Common/Files"
)

# Alternative paths to try (fallback options)
ALTERNATIVE_PATHS = [
    os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common"),
    os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/user/AppData/Roaming/MetaQuotes/Terminal/Common"),
    os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Users/Public/Documents/MQL5/Files/Common"),
    os.path.expanduser("~/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common"),
]

# File names for communication
REQUEST_FILE = "mt5_request.txt"
RESPONSE_FILE = "mt5_response.txt"

def find_common_folder():
    """Find the MT5 Common Files folder"""
    # Try primary path
    if os.path.exists(MT5_COMMON_FOLDER):
        return MT5_COMMON_FOLDER
    
    # Try alternative paths
    for path in ALTERNATIVE_PATHS:
        if os.path.exists(path):
            return path
    
    # Create if doesn't exist
    try:
        os.makedirs(MT5_COMMON_FOLDER, exist_ok=True)
        return MT5_COMMON_FOLDER
    except:
        # Try first alternative
        try:
            os.makedirs(ALTERNATIVE_PATHS[0], exist_ok=True)
            return ALTERNATIVE_PATHS[0]
        except:
            pass
    
    return MT5_COMMON_FOLDER  # Default

COMMON_FOLDER = find_common_folder()
REQUEST_PATH = os.path.join(COMMON_FOLDER, REQUEST_FILE)
RESPONSE_PATH = os.path.join(COMMON_FOLDER, RESPONSE_FILE)

def check_mt5_bridge_connection():
    """Check if MT5 bridge EA is running by checking if response file exists"""
    # Try to send a health check
    try:
        response = send_request("GET /health")
        if response and '"status":"ok"' in response:
            return True
    except Exception as e:
        print(f"Bridge connection check error: {e}")
    return False

def send_request(request_line, body=""):
    """Send a request to the EA via file - try multiple Common folder locations"""
    try:
        # Try writing to all possible Common folder locations
        # FILE_COMMON on Wine/Mac points to Terminal/Common/Files/ not MQL5/Files/Common!
        # Priority: Terminal/Common/Files (where EA actually reads from)
        common_paths = [
            os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/user/AppData/Roaming/MetaQuotes/Terminal/Common/Files"),
            COMMON_FOLDER,
            os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/user/AppData/Roaming/MetaQuotes/Terminal/Common"),
            os.path.expanduser("~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common"),
        ]
        
        # Write to all locations - MQL5 reads UTF-16, so we must write UTF-16
        # CRITICAL: First location MUST be Terminal/Common/Files (where EA reads from)
        written_count = 0
        for common_path in common_paths:
            try:
                os.makedirs(common_path, exist_ok=True)
                request_path = os.path.join(common_path, REQUEST_FILE)
                # Write in UTF-16-LE (MQL5 default encoding)
                request_content = request_line
                if body:
                    request_content = request_line + "\n" + body
                with open(request_path, 'wb') as f:
                    # Write UTF-16 BOM (FF FE)
                    f.write(b'\xff\xfe')
                    # Write content as UTF-16-LE
                    f.write(request_content.encode('utf-16-le'))
                written_count += 1
                print(f"✅ Written request to: {request_path} (UTF-16, {os.path.getsize(request_path)} bytes)")
            except Exception as e:
                print(f"⚠️  Could not write to {common_path}: {e}")
                import traceback
                traceback.print_exc()
        
        if written_count == 0:
            print(f"❌ CRITICAL: Failed to write request to ANY location!")
            raise Exception("Could not write request file to any Common folder location")
        
        # Wait for response (max 5 seconds) - check all locations
        max_wait = 50  # 50 * 0.1 = 5 seconds
        for _ in range(max_wait):
            time.sleep(0.1)
            for common_path in common_paths:
                response_path = os.path.join(common_path, RESPONSE_FILE)
                if os.path.exists(response_path):
                    # Read response - MQL5 writes in UTF-16, so we need to handle that
                    try:
                        # Read as binary first to handle BOM
                        with open(response_path, 'rb') as f:
                            data = f.read()
                            # Check for UTF-16 BOM (FF FE)
                            if data.startswith(b'\xff\xfe'):
                                response = data[2:].decode('utf-16-le', errors='ignore').strip()
                            # Check for UTF-8 BOM (EF BB BF)
                            elif data.startswith(b'\xef\xbb\xbf'):
                                response = data[3:].decode('utf-8', errors='ignore').strip()
                            else:
                                # Try UTF-16 first (MQL5 default)
                                try:
                                    response = data.decode('utf-16-le', errors='ignore').strip()
                                except:
                                    response = data.decode('utf-8', errors='ignore').strip()
                    except Exception as e:
                        print(f"Error reading response: {e}")
                        return None
                    # Delete response file
                    try:
                        os.remove(response_path)
                    except:
                        pass
                    print(f"✅ Read response from: {response_path}")
                    return response
        return None
    except Exception as e:
        print(f"Error sending request: {e}")
        return None

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    mt5_connected = check_mt5_bridge_connection()
    return jsonify({
        'status': 'healthy',
        'mt5_bridge_connected': mt5_connected,
        'common_folder': COMMON_FOLDER,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/connect', methods=['POST'])
def connect_ea():
    """Connect to MT5 via bridge"""
    try:
        data = request.json or {}
        use_investor = data.get('use_investor_password', False)
        
        request_line = f"POST /connect"
        body = json.dumps({'use_investor_password': use_investor}) if use_investor else ""
        
        response = send_request(request_line, body)
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'success': True, 'message': 'Connected', 'response': response})
        else:
            return jsonify({
                'success': False,
                'error': 'MT5 EA not responding. Ensure MT5 is running with REST API EA loaded.'
            }), 503
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/account', methods=['GET'])
def get_account_ea():
    """Get account info via bridge"""
    try:
        response = send_request("GET /account")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/positions', methods=['GET'])
def get_positions_ea():
    """Get positions via bridge"""
    try:
        response = send_request("GET /positions")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/symbols', methods=['GET'])
def get_symbols_ea():
    """Get symbols via bridge"""
    try:
        response = send_request("GET /symbols")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/symbol/<symbol_name>', methods=['GET'])
def get_symbol_info_ea(symbol_name):
    """Get symbol info via bridge"""
    try:
        response = send_request(f"GET /symbol/{symbol_name}")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/place-order', methods=['POST'])
def place_order_ea():
    """Place order via bridge"""
    try:
        data = request.json or {}
        request_line = "POST /place-order"
        body = json.dumps(data)
        
        response = send_request(request_line, body)
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/close-position/<int:ticket>', methods=['POST'])
def close_position_ea(ticket):
    """Close position via bridge"""
    try:
        print(f"🔒 Closing position {ticket}...")
        request_line = f"POST /close-position/{ticket}"
        response = send_request(request_line)
        print(f"📥 Response received: {response[:200] if response else 'None'}...")
        
        if response:
            try:
                result = json.loads(response)
                print(f"✅ Parsed JSON response: {result}")
                
                # Check if response is actually a close response or something else
                if 'success' in result or 'error' in result:
                    return jsonify(result)
                else:
                    # If response doesn't look like a close response, it might be wrong
                    print(f"⚠️  Unexpected response format: {result}")
                    return jsonify({'error': 'Unexpected response from EA', 'raw': result}), 500
            except json.JSONDecodeError as e:
                print(f"❌ JSON decode error: {e}")
                print(f"   Raw response: {response}")
                return jsonify({'error': 'Invalid JSON response from EA', 'raw': response[:500]}), 500
        else:
            print("❌ No response from EA")
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        print(f"❌ Exception in close_position_ea: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/history', methods=['GET'])
def get_history_ea():
    """Get history via bridge"""
    try:
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        request_line = "GET /history"
        if start_date or end_date:
            params = []
            if start_date:
                params.append(f"start_date={start_date}")
            if end_date:
                params.append(f"end_date={end_date}")
            request_line += "?" + "&".join(params)
        
        response = send_request(request_line)
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/orders', methods=['GET'])
def get_pending_orders_ea():
    """Get pending orders via bridge"""
    try:
        response = send_request("GET /orders")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/candles/<symbol>/<timeframe>/<int:count>', methods=['GET'])
def get_candles_ea(symbol, timeframe, count):
    """Get candlestick/OHLC data via bridge"""
    try:
        response = send_request(f"GET /candles/{symbol}/{timeframe}/{count}")
        if response:
            try:
                return jsonify(json.loads(response))
            except:
                return jsonify({'error': 'Invalid JSON response', 'raw': response}), 500
        else:
            return jsonify({'error': 'MT5 EA not responding'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🌉 MT5 REST API Bridge starting (File-based communication)...")
    print(f"📡 Bridge Port: {BRIDGE_PORT}")
    print(f"📁 Common Folder: {COMMON_FOLDER}")
    print(f"📝 Request File: {REQUEST_PATH}")
    print(f"📝 Response File: {RESPONSE_PATH}")
    print("⚠️  Make sure MT5 is running with the REST API Expert Advisor loaded!")
    print("")
    
    # Create common folder if it doesn't exist
    try:
        os.makedirs(COMMON_FOLDER, exist_ok=True)
        print(f"✅ Common folder ready: {COMMON_FOLDER}")
    except Exception as e:
        print(f"⚠️  Could not create common folder: {e}")
    
    app.run(host='0.0.0.0', port=BRIDGE_PORT, debug=True)
