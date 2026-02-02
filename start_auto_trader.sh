#!/bin/bash
# Start Auto Trader Service

echo "🤖 Starting AI Auto Trader..."
echo ""

# Default settings
SYMBOL="XAUUSD"
VOLUME=0.20
INTERVAL=60

# Parse arguments
if [ "$1" != "" ]; then
    SYMBOL="$1"
fi

if [ "$2" != "" ]; then
    VOLUME="$2"
fi

if [ "$3" != "" ]; then
    INTERVAL="$3"
fi

echo "📊 Symbol: $SYMBOL"
echo "💰 Volume: $VOLUME"
echo "⏱️  Check Interval: $INTERVAL seconds"
echo ""
echo "⚠️  Make sure:"
echo "   1. MT5 Bridge is running (python3 mt5_bridge.py)"
echo "   2. MT5 EA is running in MetaTrader 5"
echo "   3. API Server is running (python3 api_server.py)"
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd "$(dirname "$0")"
python3 auto_trader.py "$SYMBOL" "$VOLUME" "$INTERVAL"
