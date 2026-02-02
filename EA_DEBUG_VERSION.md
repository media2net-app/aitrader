# 🐛 EA Debug Versie 3.01

## Wat is er veranderd:
- ✅ `FileIsExist()` check toegevoegd voor betere file detection
- ✅ Error logging toegevoegd (print errors naar Experts tab)
- ✅ Request/Response logging toegevoegd
- ✅ Versie bijgewerkt naar 3.01

## ⚠️ BELANGRIJK - Hercompileer:

1. **Open MetaEditor** (F4 in MT5)
2. **Open** `MT5_REST_API_EA.mq5`
3. **Druk F7** (Compile)
4. Check: **0 errors**
5. **Sluit MetaEditor**

## 📋 Check Experts Tab:

Na hercompilatie en herstart van de EA, zou je in de Experts tab moeten zien:

### Bij opstarten:
```
MT5 REST API EA Starting (File-based communication)
Request file: mt5_request.txt
Response file: mt5_response.txt
```

### Bij ontvangen request:
```
Received request: GET /account
Sending response: {...}
Response written successfully
```

### Bij errors:
```
Failed to open request file. Error: [error code]
Failed to write response file. Error: [error code]
```

## 🧪 Test opnieuw:

1. Zorg dat EA op chart staat
2. Start bridge: `python3 mt5_bridge.py`
3. Test: `curl http://localhost:5002/health`
4. **Check Experts tab** voor debug berichten!

De debug berichten helpen ons te zien wat er mis gaat! 🔍
