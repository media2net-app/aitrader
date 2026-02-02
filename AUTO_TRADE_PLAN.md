# Auto Trade Script - Implementatie Plan

## Overzicht
Automatisch trading systeem dat de markt analyseert en trades plaatst met Take Profit 1, 2, 3 en Stop Loss.

## Functionaliteiten

### 1. Markt Analyse
- **Technische Indicatoren:**
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - SMA (Simple Moving Average) - 20 en 50 perioden
  - EMA (Exponential Moving Average) - 12 en 26 perioden
  - Trend detectie (Bullish/Bearish/Neutral)

- **Signaal Generatie:**
  - BUY signaal: RSI < 30 (oversold) + MACD bullish + Price > SMA20
  - SELL signaal: RSI > 70 (overbought) + MACD bearish + Price < SMA20
  - NEUTRAL: Geen duidelijk signaal

### 2. Trade Management

#### Take Profit Strategie (TP1, TP2, TP3)
- **TP1 (33% van positie):**
  - Bereikt bij eerste profit target (bijv. 20 pips)
  - Sluit automatisch 33% van de positie
  - Verplaatst stop loss naar break-even

- **TP2 (33% van positie):**
  - Bereikt bij tweede profit target (bijv. 40 pips)
  - Sluit automatisch nog 33% van de positie
  - Verplaatst stop loss naar TP1 niveau

- **TP3 (34% van positie):**
  - Bereikt bij derde profit target (bijv. 60 pips)
  - Sluit automatisch de resterende 34% van de positie
  - Trade volledig gesloten

#### Stop Loss
- **Initieel Stop Loss:**
  - Geplaatst bij trade opening (bijv. 15 pips)
  - Beschermt tegen grote verliezen

- **Trailing Stop Loss:**
  - Na TP1: Stop loss naar break-even
  - Na TP2: Stop loss naar TP1 niveau
  - Na TP3: Trade gesloten

### 3. Risk Management
- **Risk Per Trade:** 2% van account balance
- **Max Open Trades:** 3 gelijktijdige trades
- **Lot Size:** Configureerbaar (standaard 0.2)
- **Position Sizing:** Gebaseerd op risk percentage

### 4. Test Mode (Historical Data)
- **Functionaliteit:**
  - Test op historische data (bijv. gisteren)
  - Simuleert trades zonder echte orders
  - Toont resultaten en statistieken
  - Ideaal voor backtesting strategieën

- **Implementatie:**
  - Gebruik historische candlestick data
  - Simuleer trade execution op historische prijzen
  - Bereken TP/SL op basis van historische data
  - Toon winst/verlies statistieken

## Technische Implementatie

### Frontend (React/Next.js)
- **Pagina:** `/xauusd-analyse/auto-trade`
- **Componenten:**
  - Control Panel (Start/Stop trading)
  - Configuration Panel (TP/SL settings)
  - Trading Statistics
  - Open Trades List
  - Last Analysis Display

### Backend (Flask API)
- **Endpoints:**
  - `POST /api/mt5/place-order` - Plaats trade
  - `POST /api/mt5/close-position` - Sluit (gedeeltelijke) positie
  - `GET /api/trading/signal` - Analyseer markt
  - `GET /api/mt5/candles` - Haal historische data op

### MT5 Bridge
- **Functionaliteit:**
  - Communiceert met MT5 EA
  - Plaatst orders via EA
  - Haalt positie data op
  - Sluit posities (volledig of gedeeltelijk)

## Workflow

### 1. Start Trading
1. Gebruiker configureert TP1, TP2, TP3 en SL
2. Gebruiker klikt "Start Trading"
3. Script start monitoring loop (elke 5 seconden)

### 2. Market Analysis Loop
1. Analyseer markt met technische indicatoren
2. Genereer BUY/SELL/NEUTRAL signaal
3. Check of signaal sterk genoeg is
4. Check of max open trades niet bereikt is

### 3. Trade Placement
1. Plaats order met TP3 en SL
2. Bereken TP1, TP2, TP3 prijzen
3. Sla trade op in lokale state
4. Start monitoring loop voor deze trade

### 4. Trade Monitoring
1. Check huidige prijs elke 5 seconden
2. Vergelijk met TP1, TP2, TP3 en SL niveaus
3. Bij TP1: Sluit 33% + verplaats SL naar break-even
4. Bij TP2: Sluit 33% + verplaats SL naar TP1
5. Bij TP3: Sluit resterende 34%
6. Bij SL: Sluit volledige positie

### 5. Test Mode
1. Selecteer historische datum
2. Laad historische candlestick data
3. Simuleer trades op basis van historische prijzen
4. Bereken resultaten en statistieken
5. Toon backtest resultaten

## Configuratie Opties

### Trading Parameters
- Symbol: XAUUSD (standaard)
- Lot Size: 0.2 (configureerbaar)
- Take Profit 1: 20 pips (configureerbaar)
- Take Profit 2: 40 pips (configureerbaar)
- Take Profit 3: 60 pips (configureerbaar)
- Stop Loss: 15 pips (configureerbaar)
- Risk Per Trade: 2% (configureerbaar)
- Max Open Trades: 3 (configureerbaar)
- Timeframe: H1 (configureerbaar)

### Technical Indicators
- Use RSI: true/false
- RSI Overbought: 70 (configureerbaar)
- RSI Oversold: 30 (configureerbaar)
- Use MACD: true/false
- Use SMA: true/false

## Statistieken

### Real-time Stats
- Total Trades: Aantal gesloten trades
- Win Rate: Percentage winnende trades
- Total Profit: Totale winst/verlies
- Avg Profit: Gemiddelde winst per trade
- Winning Trades: Aantal winnende trades
- Losing Trades: Aantal verliezende trades

### Per Trade Info
- Ticket: MT5 order ticket
- Type: BUY of SELL
- Open Price: Prijs bij opening
- Current Price: Huidige marktprijs
- Profit: Huidige winst/verlies
- Status: open/tp1/tp2/tp3/sl/closed
- Volume: Lot size

## Veiligheid

### Risk Controls
- Max open trades limiet
- Stop loss op elke trade
- Risk percentage per trade
- Break-even stop loss na TP1

### Error Handling
- API connection errors
- MT5 bridge errors
- Invalid signals
- Position not found errors

## Test Scenario (Gisteren's Data)

### Stap 1: Laad Historische Data
- Selecteer gisteren's datum
- Haal candlestick data op voor die dag
- Analyseer met technische indicatoren

### Stap 2: Simuleer Trades
- Genereer signaal op basis van historische data
- Simuleer trade placement op historische prijzen
- Bereken TP1, TP2, TP3 en SL niveaus

### Stap 3: Monitor Trades
- Loop door historische candlesticks
- Check of TP/SL niveaus bereikt worden
- Sluit posities op juiste momenten

### Stap 4: Bereken Resultaten
- Totale winst/verlies
- Win rate
- Gemiddelde winst per trade
- Max drawdown

## Volgende Stappen

1. ✅ Frontend pagina aangemaakt
2. ⏳ API endpoints toevoegen (place-order, close-position)
3. ⏳ Partial close functionaliteit implementeren
4. ⏳ Test mode met historische data
5. ⏳ Backtesting functionaliteit
6. ⏳ Real-time monitoring en updates

## Notities

- **Pip Value voor XAUUSD:** 1 pip = 0.01 (voor prijzen zoals 2650.50)
- **Partial Close:** MT5 ondersteunt gedeeltelijk sluiten van posities
- **Break-even:** Na TP1, verplaats SL naar open price
- **Trailing Stop:** Optioneel, kan later toegevoegd worden
