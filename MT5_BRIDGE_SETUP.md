# MetaTrader 5 REST API Bridge Setup

Deze bridge maakt het mogelijk om MetaTrader 5 te gebruiken via een REST API, zelfs op macOS met Wine.

## Architectuur

```
Frontend (Next.js) 
    ↓
API Server (api_server.py:5001)
    ↓
MT5 Bridge (mt5_bridge.py:5002)
    ↓
MQL5 Expert Advisor (MT5_REST_API_EA.mq5:8080)
    ↓
MetaTrader 5 (via Wine)
```

## Installatie Stappen

### 1. Installeer de MQL5 Expert Advisor in MT5

1. Open MetaTrader 5
2. Ga naar `File` → `Open Data Folder`
3. Navigeer naar `MQL5/Experts/`
4. Kopieer `MT5_REST_API_EA.mq5` naar deze folder
5. Ga terug naar MT5 en open de `Navigator` (Ctrl+N)
6. Vind `MT5_REST_API_EA` onder `Expert Advisors`
7. Sleep het naar een chart (bijvoorbeeld EURUSD)
8. Zorg dat `Allow WebRequest for listed URL` is ingeschakeld in MT5 settings
9. Klik `OK` om de EA te starten

### 2. Start de MT5 Bridge Service

```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 mt5_bridge.py
```

De bridge draait nu op poort 5002 en communiceert met de MQL5 EA op poort 8080.

### 3. Start de API Server

De API server probeert automatisch eerst de bridge te gebruiken, en valt terug op demo mode als de bridge niet beschikbaar is.

```bash
python3 api_server.py
```

## Configuratie

### MQL5 EA Instellingen

In de EA parameters kun je aanpassen:
- `ServerPort`: Standaard 8080 (HTTP server poort)
- `ServerIP`: Standaard 127.0.0.1 (localhost)

### Bridge Instellingen

In `mt5_bridge.py` kun je aanpassen:
- `MT5_EA_PORT`: Poort waar de MQL5 EA draait (standaard 8080)
- `BRIDGE_PORT`: Poort voor de bridge service (standaard 5002)

## Testen

### Test de MQL5 EA

```bash
curl http://localhost:8080/health
```

Verwacht antwoord:
```json
{"status":"ok","service":"MT5 REST API"}
```

### Test de Bridge

```bash
curl http://localhost:5002/health
```

### Test via API Server

```bash
curl http://localhost:5001/api/mt5/account
```

## Beschikbare Endpoints

### Via Bridge (poort 5002)

- `GET /health` - Health check
- `POST /api/mt5/connect` - Verbind met MT5
- `GET /api/mt5/account` - Account informatie
- `GET /api/mt5/positions` - Open positions
- `GET /api/mt5/symbols` - Beschikbare symbols
- `GET /api/mt5/symbol/<symbol>` - Symbol info
- `POST /api/mt5/place-order` - Plaats trade
- `POST /api/mt5/close-position/<ticket>` - Sluit positie
- `GET /api/mt5/history` - Trade history
- `POST /api/mt5/sync` - Sync trades naar database

### Via API Server (poort 5001)

Alle endpoints zijn hetzelfde, maar de API server routeert automatisch via de bridge als die beschikbaar is.

## Troubleshooting

### EA start niet
- Controleer of MT5 draait
- Controleer of de EA correct is gecompileerd (geen errors in Experts tab)
- Zorg dat `Allow WebRequest` is ingeschakeld

### Bridge kan niet verbinden
- Controleer of de EA draait: `curl http://localhost:8080/health`
- Controleer of poort 8080 niet door iets anders wordt gebruikt
- Check MT5 logs voor errors

### API Server gebruikt demo mode
- Controleer of de bridge draait: `curl http://localhost:5002/health`
- Controleer of de EA draait: `curl http://localhost:8080/health`
- Start beide services opnieuw

## Veiligheid

⚠️ **Belangrijk**: Deze setup is voor lokaal gebruik. Voor productie:
- Voeg authenticatie toe aan de bridge
- Gebruik HTTPS
- Beperk toegang tot localhost
- Voeg rate limiting toe

## Voordelen van deze Aanpak

1. ✅ Werkt op macOS met Wine
2. ✅ Echte MT5 integratie (geen demo mode)
3. ✅ Alle MT5 functionaliteit beschikbaar
4. ✅ REST API interface
5. ✅ Automatische fallback naar demo mode

## Volgende Stappen

1. Installeer de EA in MT5
2. Start de bridge service
3. Test de verbinding
4. Gebruik de trading interface in de applicatie
