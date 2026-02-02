#!/bin/bash
echo "🚀 Starting AI Trader Servers..."
echo ""

# Kill existing processes on ports 5001 and 5002
echo "🧹 Cleaning up existing processes..."
lsof -ti:5001 | xargs kill -9 2>/dev/null || true
lsof -ti:5002 | xargs kill -9 2>/dev/null || true
sleep 1

# Start MT5 Bridge (port 5002)
echo "🌉 Starting MT5 Bridge on port 5002..."
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 mt5_bridge.py > mt5_bridge.log 2>&1 &
BRIDGE_PID=$!
echo "   Bridge PID: $BRIDGE_PID"
sleep 2

# Start API Server (port 5001)
echo "📡 Starting API Server on port 5001..."
python3 api_server.py > api_server.log 2>&1 &
API_PID=$!
echo "   API Server PID: $API_PID"
sleep 2

echo ""
echo "✅ Servers started!"
echo "   - MT5 Bridge: http://localhost:5002 (PID: $BRIDGE_PID)"
echo "   - API Server: http://localhost:5001 (PID: $API_PID)"
echo ""
echo "📋 Logs:"
echo "   - Bridge: mt5_bridge.log"
echo "   - API: api_server.log"
echo ""
echo "🛑 To stop: kill $BRIDGE_PID $API_PID"
