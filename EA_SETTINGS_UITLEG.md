# 🔧 EA Settings in MetaTrader 5

## Waar staat "Allow Live Trading"?

In MetaTrader 5 zijn er **twee plekken** waar je "Allow Live Trading" kunt vinden:

### Optie 1: EA Settings Venster (bij het slepen)
Wanneer je de EA naar de chart sleept, opent er een venster. In dat venster:
- **Tab "Common"** → Checkbox **"Allow live trading"** ✅
- **Tab "Inputs"** → Hier staan de EA parameters (CheckInterval, etc.)

### Optie 2: Via Rechtermuisklik op de EA
1. **Rechtermuisklik** op de EA naam in de **top right corner** van de chart
2. Kies **"Properties"** of **"Eigenschappen"**
3. Ga naar tab **"Common"**
4. Zet **"Allow live trading"** aan ✅

### Optie 3: Algo Trading Button (Algemeen)
- Klik op de **"Algo Trading"** button in de toolbar (moet **groen/aan** zijn)
- Dit is de **globale** setting voor alle EA's

## ⚠️ Belangrijk:

Als je **Algo Trading** al aan hebt staan (groene button), dan is dat meestal genoeg!

De EA zou nu moeten werken. Check de **Experts tab** (onderaan in MT5) om te zien of de EA berichten print.

## 🧪 Test of EA werkt:

1. Start de bridge: `python3 mt5_bridge.py`
2. Test: `curl http://localhost:5002/health`
3. Check Experts tab voor EA berichten
