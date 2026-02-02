#!/bin/bash
# Script to compile and help start the MT5 REST API EA

echo "🔧 MT5 REST API EA - Compile and Start Script"
echo ""

WINE_PATH="/Applications/MetaTrader 5.app/Contents/SharedSupport/wine/bin/wine64"
MT5_PATH="/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5"
EA_FILE="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.mq5"
EA_EX4="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.ex4"

# Check if EA file exists
if [ ! -f "$EA_FILE" ]; then
    echo "❌ EA file not found at: $EA_FILE"
    exit 1
fi

echo "✅ EA file found: $EA_FILE"
echo ""

# Try to compile via MetaEditor
echo "📝 Attempting to compile EA..."
export WINEPREFIX="$HOME/.wine"

# Method 1: Try direct compilation
if [ -f "$MT5_PATH/metaeditor64.exe" ]; then
    echo "Using MetaEditor at: $MT5_PATH/metaeditor64.exe"
    cd "$MT5_PATH"
    $WINE_PATH metaeditor64.exe /compile:"MQL5/Experts/MT5_REST_API_EA.mq5" /log 2>&1 &
    COMPILE_PID=$!
    echo "Compilation started (PID: $COMPILE_PID)"
    echo "Waiting 10 seconds for compilation..."
    sleep 10
    
    # Check if compiled
    if [ -f "$EA_EX4" ]; then
        echo "✅ EA compiled successfully!"
        echo "   Compiled file: $EA_EX4"
    else
        echo "⚠️  Compilation may have failed or is still in progress"
        echo "   Check MetaEditor logs or compile manually in MT5"
    fi
else
    echo "⚠️  MetaEditor not found, cannot auto-compile"
    echo "   Please compile manually in MT5:"
    echo "   1. Open MetaTrader 5"
    echo "   2. Press F4 to open MetaEditor"
    echo "   3. Find MT5_REST_API_EA.mq5"
    echo "   4. Press F7 to compile"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Open MetaTrader 5"
echo "2. Open a chart (e.g., EURUSD)"
echo "3. Drag MT5_REST_API_EA from Navigator to chart"
echo "4. Enable 'Allow live trading'"
echo "5. Click OK to start"
echo ""
echo "🔍 To verify EA is running:"
echo "   curl http://localhost:8080/health"
echo ""
