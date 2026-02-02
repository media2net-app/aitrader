#!/bin/bash
# Quick start script voor MT5 EA

clear
echo "╔══════════════════════════════════════════════════════════╗"
echo "║     MT5 REST API EA - Quick Start Helper                ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

MT5_APP="/Applications/MetaTrader 5.app"
MT5_PATH="/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5"
EA_EX4="$MT5_PATH/MQL5/Experts/MT5_REST_API_EA.ex4"

# Open MT5
echo "📱 Opening MetaTrader 5..."
open "$MT5_APP" 2>/dev/null
sleep 3

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 STAP-VOOR-STAP INSTRUCTIES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -f "$EA_EX4" ]; then
    echo "⚠️  STAP 1: COMPILEER DE EA (EERSTE KEER)"
    echo "   ┌─────────────────────────────────────────────────┐"
    echo "   │ 1. Druk op F4 in MT5 (opent MetaEditor)         │"
    echo "   │ 2. In Navigator links: Expert Advisors          │"
    echo "   │ 3. Dubbelklik: MT5_REST_API_EA.mq5              │"
    echo "   │ 4. Druk op F7 (compile)                          │"
    echo "   │ 5. Check Errors tab (zou 0 errors moeten zijn)   │"
    echo "   │ 6. Sluit MetaEditor                              │"
    echo "   └─────────────────────────────────────────────────┘"
    echo ""
    echo "   Druk ENTER als je klaar bent met compileren..."
    read
    echo ""
fi

echo "✅ STAP 2: OPEN EEN CHART"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ 1. In MT5: File → New Chart                      │"
echo "   │ 2. Kies: EURUSD (of een ander symbol)           │"
echo "   │ 3. Kies: M1 of M5 timeframe                      │"
echo "   │ 4. Klik: OK                                      │"
echo "   └─────────────────────────────────────────────────┘"
echo ""
echo "   Druk ENTER als je een chart hebt geopend..."
read
echo ""

echo "✅ STAP 3: START DE EA"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ 1. Druk Ctrl+N (opent Navigator)                 │"
echo "   │ 2. In Navigator: Expert Advisors                  │"
echo "   │ 3. SLEEP 'MT5_REST_API_EA' naar de chart         │"
echo "   │ 4. In het popup venster:                         │"
echo "   │    ✅ Zet 'Allow live trading' AAN               │"
echo "   │    ServerPort: 8080 (laat staan)                 │"
echo "   │    ServerIP: 127.0.0.1 (laat staan)              │"
echo "   │ 5. Klik: OK                                      │"
echo "   └─────────────────────────────────────────────────┘"
echo ""
echo "   Druk ENTER als je de EA hebt gestart..."
read
echo ""

echo "🔍 STAP 4: VERIFIEER"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ Check de Experts tab (onderaan MT5):             │"
echo "   │ Je zou moeten zien:                              │"
echo "   │ 'MT5 REST API Server listening on 127.0.0.1:8080'│"
echo "   │                                                   │"
echo "   │ Op de chart zie je een 😊 smiley face            │"
echo "   └─────────────────────────────────────────────────┘"
echo ""

# Test connection
echo "🧪 Testing connection..."
sleep 2
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo ""
    echo "✅ ✅ ✅ SUCCES! EA IS DRAAIEN! ✅ ✅ ✅"
    echo ""
    curl -s http://localhost:8080/health | python3 -m json.tool
    echo ""
    echo "🎉 Je dashboard zal nu echte MT5 data tonen!"
else
    echo ""
    echo "⚠️  EA lijkt nog niet te draaien"
    echo ""
    echo "Check:"
    echo "  - Is 'Allow live trading' aangezet?"
    echo "  - Zie je de smiley face op de chart?"
    echo "  - Wat staat er in de Experts tab?"
    echo ""
    echo "Probeer opnieuw of check START_EA_STAP_VOOR_STAP.md voor hulp"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
