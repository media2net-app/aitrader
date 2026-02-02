#!/bin/bash
# Script to help install the MQL5 Expert Advisor

echo "🔧 MT5 REST API EA Installation Helper"
echo ""

# Try to find MT5 data folder
MT5_DATA_FOLDERS=(
    "$HOME/.wine/drive_c/Users/$USER/AppData/Roaming/MetaQuotes/Terminal"
    "$HOME/.wine/drive_c/Program Files/MetaTrader 5/MQL5/Experts"
    "$HOME/.wine/drive_c/Program Files (x86)/MetaTrader 5/MQL5/Experts"
    "$HOME/Library/Application Support/MetaQuotes/Terminal"
)

EA_FILE="MT5_REST_API_EA.mq5"
FOUND_FOLDER=""

echo "Searching for MT5 installation..."
for folder in "${MT5_DATA_FOLDERS[@]}"; do
    if [ -d "$folder" ]; then
        echo "✅ Found: $folder"
        FOUND_FOLDER="$folder"
        
        # Check if it's a terminal folder (need to find the MQL5 subfolder)
        if [ -d "$folder/MQL5/Experts" ]; then
            TARGET="$folder/MQL5/Experts"
        elif [ -d "$folder/Experts" ]; then
            TARGET="$folder/Experts"
        else
            echo "   Looking for MQL5/Experts subfolder..."
            MQL5_FOLDER=$(find "$folder" -type d -name "MQL5" 2>/dev/null | head -1)
            if [ -n "$MQL5_FOLDER" ] && [ -d "$MQL5_FOLDER/Experts" ]; then
                TARGET="$MQL5_FOLDER/Experts"
            else
                continue
            fi
        fi
        
        if [ -f "$EA_FILE" ]; then
            echo "📋 Copying $EA_FILE to $TARGET..."
            cp "$EA_FILE" "$TARGET/" && echo "✅ EA installed successfully!" || echo "❌ Failed to copy"
            echo ""
            echo "Next steps:"
            echo "1. Open MetaTrader 5"
            echo "2. Open MetaEditor (F4)"
            echo "3. Find MT5_REST_API_EA.mq5 in Experts folder"
            echo "4. Compile it (F7)"
            echo "5. Drag it to a chart to start"
            exit 0
        fi
    fi
done

if [ -z "$FOUND_FOLDER" ]; then
    echo "⚠️  Could not automatically find MT5 installation"
    echo ""
    echo "Manual installation:"
    echo "1. Open MetaTrader 5"
    echo "2. Go to File → Open Data Folder"
    echo "3. Navigate to MQL5/Experts/"
    echo "4. Copy MT5_REST_API_EA.mq5 to this folder"
    echo "5. Open MetaEditor (F4) and compile the EA (F7)"
    echo "6. Drag the EA to a chart to start"
    echo ""
    echo "The EA file is located at: $(pwd)/$EA_FILE"
fi
