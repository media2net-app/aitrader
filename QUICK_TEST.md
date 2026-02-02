# ⚡ Quick Test - Is EA Aan Het Werken?

## ✅ Wat je al gedaan hebt:
- ✅ EA naar XAUUSD chart gesleept
- ✅ Algo Trading aangezet (groene button)

## 🔍 Check of EA draait:

### Stap 1: Kijk in Experts Tab
1. In MT5, kijk naar de **Experts** tab (onderaan, naast "Handelen", "Geschiedenis", etc.)
2. Je zou moeten zien:
   ```
   MT5 REST API EA Starting (File-based communication)
   Request file: mt5_request.txt
   Response file: mt5_response.txt
   ```

### Stap 2: Over "Allow Live Trading"
Als **Algo Trading** al aan staat (groene button), dan is dat meestal genoeg!

Als je het toch wilt checken:
1. **Rechtermuisklik** op "MT5_REST_API_EA" in de **rechterbovenhoek** van de chart
2. Kies **"Properties"** of **"Eigenschappen"**
3. Tab **"Common"** → Checkbox **"Allow live trading"** ✅

## 🚀 Test Nu:

### Start de Bridge:
```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 mt5_bridge.py
```

### Test de Verbinding:
Open een **nieuwe terminal** en run:
```bash
curl http://localhost:5002/health
```

Je zou moeten zien:
```json
{
  "status": "healthy",
  "mt5_bridge_connected": true,
  ...
}
```

## ✅ Als het werkt:
Je kunt nu:
- Account info ophalen
- Trades plaatsen
- Alles via de web interface gebruiken!

## ❌ Als het niet werkt:
- Check Experts tab voor errors
- Check of bridge draait
- Laat me weten wat je ziet!
