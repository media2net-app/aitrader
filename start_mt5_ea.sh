#!/bin/bash
# Script to help start MT5 and the EA automatically

echo "🚀 Starting MT5 REST API EA Helper"
echo ""

MT5_APP="/Applications/MetaTrader 5.app"
MT5_PATH="/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5"
EA_EX4="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.ex4"

# Check if MT5 app exists
if [ ! -d "$MT5_APP" ]; then
    echo "❌ MetaTrader 5 app not found at: $MT5_APP"
    exit 1
fi

# Check if EA is compiled
if [ ! -f "$EA_EX4" ]; then
    echo "⚠️  EA not compiled yet!"
    echo ""
    echo "Please compile first:"
    echo "1. Open MetaTrader 5"
    echo "2. Press F4 (MetaEditor)"
    echo "3. Find MT5_REST_API_EA.mq5"
    echo "4. Press F7 to compile"
    echo ""
    echo "Or run: ./compile_and_start_ea.sh"
    exit 1
fi

echo "✅ EA is compiled: $EA_EX4"
echo ""

# Try to open MT5
echo "📱 Opening MetaTrader 5..."
open "$MT5_APP" 2>/dev/null || echo "⚠️  Could not auto-open MT5. Please open manually."

echo ""
echo "⏳ Waiting 5 seconds for MT5 to start..."
sleep 5

echo ""
echo "📋 Manual Steps to Start EA:"
echo ""
echo "1. In MT5, open a chart (e.g., EURUSD)"
echo "2. In Navigator (Ctrl+N), find 'Expert Advisors' → 'MT5_REST_API_EA'"
echo "3. Drag the EA to the chart"
echo "4. In EA Settings:"
echo "   - Enable 'Allow live trading'"
echo "   - ServerPort: 8080 (default)"
echo "   - ServerIP: 127.0.0.1 (default)"
echo "5. Click OK"
echo ""
echo "6. Check the Experts tab - you should see:"
echo "   'MT5 REST API Server listening on 127.0.0.1:8080'"
echo ""
echo "🔍 Test the connection:"
echo "   curl http://localhost:8080/health"
echo ""
