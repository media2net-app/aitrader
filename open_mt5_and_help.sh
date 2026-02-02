#!/bin/bash
# Script om MT5 te openen en te helpen met EA setup

echo "🚀 MT5 EA Setup Helper"
echo ""

MT5_APP="/Applications/MetaTrader 5.app"
MT5_PATH="/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5"
EA_MQ5="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.mq5"
EA_EX4="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.ex4"

# Check MT5 app
if [ ! -d "$MT5_APP" ]; then
    echo "❌ MetaTrader 5 niet gevonden op: $MT5_APP"
    exit 1
fi

echo "✅ MetaTrader 5 gevonden"
echo ""

# Check EA file
if [ -f "$EA_MQ5" ]; then
    echo "✅ EA source file gevonden: $EA_MQ5"
else
    echo "❌ EA source file niet gevonden!"
    echo "   Locatie: $EA_MQ5"
    exit 1
fi

# Check if compiled
if [ -f "$EA_EX4" ]; then
    echo "✅ EA is gecompileerd (.ex4 bestand bestaat)"
    echo "   Je kunt de EA direct gebruiken!"
else
    echo "⚠️  EA is nog niet gecompileerd"
    echo "   Je moet eerst compileren in MetaEditor (F4 → F7)"
fi

echo ""
echo "📱 Opening MetaTrader 5..."
open "$MT5_APP"

echo ""
echo "⏳ Wacht 5 seconden tot MT5 is opgestart..."
sleep 5

echo ""
echo "📋 VOLGENDE STAPPEN:"
echo ""
echo "1. In MT5, druk op F4 om MetaEditor te openen"
if [ ! -f "$EA_EX4" ]; then
    echo "2. In Navigator, vind: Expert Advisors → MT5_REST_API_EA"
    echo "3. Dubbelklik op MT5_REST_API_EA.mq5"
    echo "4. Druk op F7 om te compileren"
    echo "5. Check op errors (zou 0 moeten zijn)"
    echo "6. Sluit MetaEditor"
    echo ""
fi
echo "$([ -f "$EA_EX4" ] && echo "2" || echo "7"). Open een chart (File → New Chart → EURUSD → M1 → OK)"
echo "$([ -f "$EA_EX4" ] && echo "3" || echo "8"). In Navigator, sleep MT5_REST_API_EA naar de chart"
echo "$([ -f "$EA_EX4" ] && echo "4" || echo "9"). In EA Settings:"
echo "   - ✅ Zet 'Allow live trading' AAN"
echo "   - ServerPort: 8080"
echo "   - ServerIP: 127.0.0.1"
echo "$([ -f "$EA_EX4" ] && echo "5" || echo "10"). Klik OK"
echo "$([ -f "$EA_EX4" ] && echo "6" || echo "11"). Check Experts tab - zou moeten zeggen:"
echo "   'MT5 REST API Server listening on 127.0.0.1:8080'"
echo ""
echo "🔍 Test daarna met:"
echo "   curl http://localhost:8080/health"
echo ""
