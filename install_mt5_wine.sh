#!/bin/bash
# Script to install MetaTrader5 Python library via Wine

echo "🔧 Installing MetaTrader5 via Wine..."

WINE_PATH="/Applications/MetaTrader 5.app/Contents/SharedSupport/wine/bin/wine64"
WINE_PREFIX="${HOME}/.wine"

# Check if Wine is available
if [ ! -f "$WINE_PATH" ]; then
    echo "❌ Wine not found at $WINE_PATH"
    exit 1
fi

# Set Wine prefix
export WINEPREFIX="$WINE_PREFIX"

# Download MetaTrader5 wheel for Windows
echo "📥 Downloading MetaTrader5 Windows wheel..."
WHEEL_URL=$(curl -s https://pypi.org/pypi/MetaTrader5/json | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    urls = [f['url'] for f in data['urls'] if 'win_amd64' in f['url'] or 'win32' in f['url']]
    if urls:
        print(urls[0])
    else:
        print('')
except:
    print('')
" 2>/dev/null)

if [ -z "$WHEEL_URL" ]; then
    echo "⚠️  Could not find Windows wheel URL. Trying alternative method..."
    # Try to install via pip in Wine
    echo "Attempting to install via Wine's pip..."
    $WINE_PATH pip install MetaTrader5 2>&1
else
    echo "Downloading from: $WHEEL_URL"
    curl -L -o /tmp/MetaTrader5.whl "$WHEEL_URL"
    
    # Try to install via Wine's pip
    echo "Installing wheel via Wine..."
    $WINE_PATH pip install /tmp/MetaTrader5.whl 2>&1
fi

echo "✅ Installation attempt completed."
echo ""
echo "Note: The MetaTrader5 library requires Windows DLLs. If installation fails,"
echo "you may need to use the demo mode or run on a Windows machine."
