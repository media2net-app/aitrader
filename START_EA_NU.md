# 🎉 EA Compileert! Volgende Stappen

## ✅ Wat is er gebeurd:
- EA compileert nu zonder errors (0 errors, 0 warnings)
- File-based communicatie geïmplementeerd
- Bridge aangepast voor file-based communicatie

## 🚀 Start de EA in MetaTrader 5:

### Stap 1: Open MetaTrader 5
- Open MetaTrader 5 (als het nog niet open is)

### Stap 2: Start de EA op een Chart
1. Open een chart (bijvoorbeeld EURUSD M1)
2. In de Navigator (Ctrl+N), ga naar **Expert Advisors**
3. Sleep **MT5_REST_API_EA** naar de chart
4. In het EA Settings venster:
   - ✅ Zet **"Allow live trading"** AAN (als je live trades wilt)
   - ✅ Zet **"Allow DLL imports"** AAN (als nodig)
   - `CheckInterval`: 100 (standaard - check elke 100ms)
5. Klik **OK**

### Stap 3: Check of EA draait
- Ga naar de **Experts** tab in MT5
- Je zou moeten zien: `"MT5 REST API EA Starting (File-based communication)"`
- En: `"Request file: mt5_request.txt"`
- En: `"Response file: mt5_response.txt"`

## 🔧 Start de Bridge:

```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 mt5_bridge.py
```

Je zou moeten zien:
```
🌉 MT5 REST API Bridge starting (File-based communication)...
📡 Bridge Port: 5002
📁 Common Folder: [pad naar MT5 Common folder]
✅ Common folder ready
```

## 🧪 Test de Verbinding:

### Test 1: Health Check
```bash
curl http://localhost:5002/health
```

Verwacht:
```json
{
  "status": "healthy",
  "mt5_bridge_connected": true,
  ...
}
```

### Test 2: Account Info
```bash
curl http://localhost:5002/account
```

### Test 3: Via API Server
```bash
curl http://localhost:5001/api/mt5/account
```

## 📁 File Locaties:

De communicatie bestanden staan in:
```
~/Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5/Files/Common/
```

- `mt5_request.txt` - Requests van bridge naar EA
- `mt5_response.txt` - Responses van EA naar bridge

## ⚠️ Troubleshooting:

### EA start niet
- Check Experts tab voor errors
- Zorg dat EA op een chart staat
- Check of "Allow live trading" aan staat

### Bridge kan niet verbinden
- Check of EA draait (zie Experts tab)
- Check of bestanden worden gemaakt in Common folder
- Check bridge logs voor errors

### Bestanden worden niet gemaakt
- Check of Common folder bestaat
- Check MT5 permissions
- Check bridge logs

## 🎯 Als alles werkt:

Je kunt nu:
- ✅ Account info ophalen
- ✅ Positions bekijken
- ✅ Trades plaatsen
- ✅ History ophalen
- ✅ Alles via de web interface gebruiken!
