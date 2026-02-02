# 🚀 Quick Start Guide - MT5 REST API Bridge

## ✅ Wat is al gedaan

1. **Bridge Service**: ✅ Draait op poort 5002
2. **API Server**: ✅ Draait op poort 5001  
3. **EA Code**: ✅ Gefixed en geïnstalleerd in MT5 folder
4. **Compile Errors**: ✅ Opgelost

## 📋 Laatste Stap: Compileer en Start de EA

### Stap 1: Open MetaTrader 5
```bash
open "/Applications/MetaTrader 5.app"
```

### Stap 2: Compileer de EA
1. Druk op **F4** om MetaEditor te openen
2. In de Navigator (links), ga naar `Expert Advisors`
3. Dubbelklik op `MT5_REST_API_EA.mq5`
4. Druk op **F7** om te compileren
5. Check de "Errors" tab - zou nu 0 errors moeten zijn

### Stap 3: Start de EA
1. Ga terug naar MetaTrader 5
2. Open een chart (bijv. EURUSD - M1 of M5)
3. In Navigator, sleep `MT5_REST_API_EA` naar de chart
4. In EA Settings:
   - ✅ Enable "Allow live trading"
   - ServerPort: `8080` (standaard)
   - ServerIP: `127.0.0.1` (standaard)
5. Klik **OK**

### Stap 4: Verifieer
Check de Experts tab (onderaan MT5) - je zou moeten zien:
```
MT5 REST API Server listening on 127.0.0.1:8080
```

## 🧪 Test de Verbinding

```bash
# Test EA direct
curl http://localhost:8080/health

# Test bridge
curl http://localhost:5002/health

# Test via API server (nu met echte MT5 data!)
curl http://localhost:5001/api/mt5/account
```

## 📁 Bestand Locaties

- **EA Source**: `/Users/gebruiker/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Experts/MT5_REST_API_EA.mq5`
- **Bridge Service**: `/Users/gebruiker/Desktop/AItraderbychiel/mt5_bridge.py`
- **API Server**: `/Users/gebruiker/Desktop/AItraderbychiel/api_server.py`

## 🔧 Handige Scripts

```bash
# Compile EA (probeert automatisch)
./compile_and_start_ea.sh

# Start MT5 en toon instructies
./start_mt5_ea.sh
```

## ⚠️ Troubleshooting

### EA compileert niet
- Check MetaEditor voor errors
- Zorg dat alle includes beschikbaar zijn
- Herstart MetaEditor

### EA start niet
- Check of "Allow live trading" is ingeschakeld
- Check Experts tab voor error messages
- Zorg dat poort 8080 niet in gebruik is

### Bridge kan niet verbinden
- Check of EA draait: `curl http://localhost:8080/health`
- Check of bridge draait: `curl http://localhost:5002/health`
- Herstart beide services

## 🎯 Zodra alles werkt

De volledige flow is actief:
```
Frontend → API Server (5001) → Bridge (5002) → MQL5 EA (8080) → MT5
```

Je krijgt nu **echte MT5 data** in plaats van demo data! 🎉
