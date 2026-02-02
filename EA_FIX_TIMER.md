# 🔧 EA Timer Fix

## Probleem:
De EA checkte alleen op ticks, maar als er geen market movement is, zijn er geen ticks. Daardoor werden requests niet gelezen.

## Oplossing:
Timer toegevoegd die **elke seconde** checkt voor nieuwe requests.

## ⚠️ BELANGRIJK - Hercompileer de EA:

1. **Open MetaEditor** (F4 in MT5)
2. **Open** `MT5_REST_API_EA.mq5`
3. **Druk F7** (Compile)
4. Check: **0 errors**
5. **Sluit MetaEditor**

## ✅ Na hercompilatie:

De EA zal nu:
- Elke seconde checken voor nieuwe requests
- Werken zelfs als er geen market ticks zijn
- Sneller reageren op requests

## 🧪 Test opnieuw:

1. Zorg dat EA op chart staat
2. Start bridge: `python3 mt5_bridge.py`
3. Test: `curl http://localhost:5002/health`

Nu zou het moeten werken! 🎉
