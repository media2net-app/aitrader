# 🚀 MT5 EA Starten - Stap voor Stap Handleiding

## Stap 1: Open MetaTrader 5

1. Open **MetaTrader 5** op je Mac
2. Wacht tot MT5 volledig is geladen

## Stap 2: Compileer de EA (EERSTE KEER)

### Optie A: Via MetaEditor (Aanbevolen)

1. Druk op **F4** op je toetsenbord (of ga naar **Tools → MetaQuotes Language Editor**)
2. In de **Navigator** (linker paneel), zoek naar:
   - `Expert Advisors` → `MT5_REST_API_EA`
3. **Dubbelklik** op `MT5_REST_API_EA.mq5` om te openen
4. Druk op **F7** (of klik op de **Compile** knop in de toolbar)
5. Check de **Errors** tab onderaan:
   - ✅ **0 errors** = Succes!
   - ❌ **Errors** = Laat me weten welke errors je ziet

### Optie B: Automatisch (Probeer dit eerst)

Run dit commando in de terminal:
```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
./compile_and_start_ea.sh
```

## Stap 3: Start de EA op een Chart

### Stap 3.1: Open een Chart

1. In MetaTrader 5, klik op **File → New Chart** (of druk **Ctrl+N**)
2. Kies een symbol (bijvoorbeeld **EURUSD**)
3. Kies een timeframe (bijvoorbeeld **M1** of **M5**)
4. Klik **OK**

### Stap 3.2: Sleep de EA naar de Chart

1. Open de **Navigator** (druk **Ctrl+N** of klik op het Navigator icoon)
2. In de Navigator, ga naar:
   - `Expert Advisors` → `MT5_REST_API_EA`
3. **Sleep** `MT5_REST_API_EA` naar de chart die je net hebt geopend
4. Er opent nu een settings venster

### Stap 3.3: Configureer de EA

In het settings venster:

1. **Common Tab:**
   - ✅ **Allow live trading** (BELANGRIJK! Zet dit aan!)
   - ✅ **Allow DLL imports** (optioneel)
   - ✅ **Allow external experts imports** (optioneel)

2. **Inputs Tab:**
   - `ServerPort`: **8080** (standaard, laat dit staan)
   - `ServerIP`: **127.0.0.1** (standaard, laat dit staan)

3. Klik **OK**

### Stap 3.4: Verifieer dat de EA draait

1. Kijk naar de **Experts** tab onderaan MT5
2. Je zou moeten zien:
   ```
   MT5 REST API EA Starting on port 8080
   MT5 REST API Server listening on 127.0.0.1:8080
   ```
3. In de rechterbovenhoek van de chart zie je een **smiley face** 😊 (dit betekent de EA draait)

## Stap 4: Test de Verbinding

Open een terminal en run:

```bash
curl http://localhost:8080/health
```

Je zou moeten zien:
```json
{"status":"ok","service":"MT5 REST API"}
```

## ❌ Problemen Oplossen

### EA start niet / Geen smiley face

**Probleem**: EA geeft error in Experts tab
- **Oplossing**: Check de Experts tab voor error messages
- **Mogelijke oorzaken**:
  - "Allow live trading" niet aangezet → Zet dit aan in EA settings
  - Poort 8080 al in gebruik → Wijzig ServerPort naar 8081
  - EA niet gecompileerd → Compileer eerst (Stap 2)

### EA compileert niet

**Probleem**: Errors bij compilatie
- **Oplossing**: 
  1. Check of alle includes beschikbaar zijn
  2. Herstart MetaEditor
  3. Probeer opnieuw te compileren

### Kan EA niet vinden in Navigator

**Probleem**: EA verschijnt niet in Navigator
- **Oplossing**:
  1. Herstart MT5
  2. Check of bestand bestaat: `MQL5/Experts/MT5_REST_API_EA.mq5`
  3. Refresh Navigator (rechtsklik → Refresh)

### Poort 8080 in gebruik

**Probleem**: "Failed to bind socket" error
- **Oplossing**:
  1. Wijzig `ServerPort` in EA settings naar **8081**
  2. Update `MT5_EA_PORT` in `mt5_bridge.py` naar **8081**
  3. Herstart de bridge service

## ✅ Checklist

- [ ] MT5 is geopend
- [ ] EA is gecompileerd (geen errors)
- [ ] Chart is geopend (bijv. EURUSD M1)
- [ ] EA is naar chart gesleept
- [ ] "Allow live trading" is aangezet
- [ ] EA settings zijn OK geklikt
- [ ] Smiley face 😊 verschijnt op chart
- [ ] Experts tab toont "Server listening on 127.0.0.1:8080"
- [ ] `curl http://localhost:8080/health` werkt

## 🎯 Zodra alles werkt

Je dashboard zal nu **echte MT5 data** tonen in plaats van demo data!

Test het:
```bash
curl http://localhost:5001/api/mt5/account
```

Je zou nu echte accountgegevens moeten zien!
