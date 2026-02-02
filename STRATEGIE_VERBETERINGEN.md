# 🚀 Strategie Verbeteringen - Patroonherkenning & Dynamische TP/SL

## ✅ Wat is er verbeterd?

Je auto trade script gebruikt nu **ECHTE grafiekdata** en **patroonherkenning** om te bepalen wanneer BUY/SELL te doen en waar TP/SL te zetten!

## 📊 Hoe werkt het nu?

### 1. **Echte Candlestick Data**
- ✅ Leest **echte OHLC data** (Open, High, Low, Close) van MT5
- ✅ Gebruikt historische candlesticks (standaard laatste 100 candles op H1 timeframe)
- ✅ Geen simulatie meer - echte marktdata!

### 2. **Support & Resistance Detectie**
Het script detecteert nu automatisch:
- **Support levels**: Prijsniveaus waar de prijs meerdere keren is gestopt met dalen
- **Resistance levels**: Prijsniveaus waar de prijs meerdere keren is gestopt met stijgen

**Hoe werkt het?**
- Analyseert lokale minima/maxima in de laatste 20-50 candles
- Telt hoe vaak een level is "getest" (meer tests = sterker level)
- Gebruikt deze levels voor betere entry/exit beslissingen

### 3. **Candlestick Patroonherkenning**
Het script herkent nu candlestick patronen:
- **Hammer**: Bullish signaal (prijs kan gaan stijgen)
- **Shooting Star**: Bearish signaal (prijs kan gaan dalen)
- **Doji**: Onzekerheid/omkeer mogelijk
- **Bullish Engulfing**: Sterk bullish signaal
- **Bearish Engulfing**: Sterk bearish signaal

### 4. **Dynamische Take Profit & Stop Loss**
**VOOR:** Hardcoded TP = +$100, SL = -$50

**NU:** Dynamisch berekend op basis van:
- **Support/Resistance levels**
- **Risk/Reward ratio** (standaard 1:2)
- **Marktomstandigheden**

**Voorbeeld:**
- **BUY signaal** bij $2500
- **Resistance** gevonden op $2510
- **Support** gevonden op $2495
- **TP wordt gezet op:** $2510 (resistance level)
- **SL wordt gezet op:** $2495 (onder support)

### 5. **Verbeterde Signaal Generatie**
Het script gebruikt nu **7 factoren** in plaats van 5:

1. ✅ Moving Average Crossover (SMA 20/50)
2. ✅ RSI Analysis (Oversold/Overbought)
3. ✅ MACD Analysis
4. ✅ EMA Crossover (12/26)
5. ✅ **Support/Resistance Analysis** (NIEUW!)
6. ✅ **Candlestick Patterns** (NIEUW!)
7. ✅ Price Momentum

## 📈 Hoe wordt een signaal gegenereerd?

```
1. Script haalt 100 candlesticks op van MT5 (H1 timeframe)
   ↓
2. Analyseert:
   - Technische indicatoren (SMA, EMA, RSI, MACD)
   - Support/Resistance levels
   - Candlestick patronen
   - Prijs momentum
   ↓
3. Telt BUY vs SELL signalen
   ↓
4. Berekent confidence score (0-100%)
   ↓
5. Als confidence ≥ 60%:
   - Berekent dynamische TP/SL op basis van support/resistance
   - Plaatst trade met deze TP/SL
```

## 🎯 Voorbeeld Output

```
🔍 Analyzing XAUUSD...
   📊 Reading candlestick data from MT5...
📈 Signal: BUY (Confidence: 75%)
💡 Reason: SMA20 (2502.50) > SMA50 (2498.20); RSI oversold (28.5); MACD bullish; Support/Resistance: Near support
📊 Support: $2495.20 | Resistance: $2510.50
🕯️  Candlestick Patterns: HAMMER, BULLISH_ENGULFING
🎯 Dynamic TP/SL calculated:
   Take Profit: $2510.50 (105 pips)
   Stop Loss: $2495.20 (48 pips)
   Method: support_resistance

🚀 Placing BUY order for XAUUSD...
✅ Trade placed successfully! Ticket: 12345678
```

## 🔧 Technische Details

### Support/Resistance Detectie
- **Lookback periode**: 20-50 candles (afhankelijk van beschikbare data)
- **Pivot points**: Lokale minima/maxima die minimaal 2 candles aan beide kanten lager/hoger zijn
- **Strength**: Aantal keren dat een level is getest

### Dynamische TP/SL Berekening
- **Risk/Reward ratio**: Standaard 1:2 (voor elke $1 risico, $2 winst)
- **Voor BUY**: TP richting resistance, SL onder support
- **Voor SELL**: TP richting support, SL boven resistance
- **Fallback**: Als geen support/resistance gevonden, gebruikt vaste ratio (0.2% winst/verlies)

### Candlestick Patronen
- Analyseert laatste 3 candles
- Detecteert: Doji, Hammer, Shooting Star, Engulfing patterns
- Signaal strength: -20 tot +20 punten

## 📝 Belangrijke Notities

1. **Meer data = betere analyse**
   - Script gebruikt minimaal 20 candles voor basis analyse
   - 50+ candles geeft betere support/resistance detectie

2. **Timeframe**
   - Standaard: H1 (1 uur candles)
   - Kan aangepast worden in `generate_signal_from_chart(timeframe="H1")`

3. **Confidence Threshold**
   - Minimum 60% confidence vereist voor trade
   - Hogere confidence = betere kans op winst

4. **TP/SL Methoden**
   - `support_resistance`: Gebaseerd op echte levels (beste)
   - `fixed`: Vaste ratio als fallback

## 🚀 Volgende Stappen

Het script is nu veel slimmer! Het:
- ✅ Leest echte grafiekdata
- ✅ Herkent patronen
- ✅ Berekent TP/SL op basis van marktstructuur
- ✅ Gebruikt meerdere technische factoren

**Test het script** en monitor de resultaten om te zien of de win rate verbetert!

## 📊 Monitoring

Gebruik `analyze_win_rate.py` om de win rate te monitoren:
```bash
python3 analyze_win_rate.py
```

Of check het dashboard op `http://localhost:3000/analytics` voor real-time statistieken.
