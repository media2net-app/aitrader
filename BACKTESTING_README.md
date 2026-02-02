# 🧪 Backtesting Engine - Gebruikershandleiding

## ✅ Wat is er geïmplementeerd?

De **Backtesting Engine** is nu volledig geïmplementeerd! Je kunt nu:
- ✅ Test je strategie op historische data
- ✅ Bereken alle belangrijke performance metrics
- ✅ Zie win rate, profit factor, Sharpe ratio, etc.
- ✅ Visualiseer equity curve en drawdown

## 📁 Nieuwe Bestanden

1. **`backtesting_engine.py`** - Hoofd engine voor backtesting
2. **`performance_metrics.py`** - Calculator voor alle metrics
3. **`test_backtest.py`** - Test script

## 🚀 Gebruik

### Methode 1: Via Python Script

```bash
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 test_backtest.py
```

### Methode 2: Via API

```bash
# Start API server eerst
python3 api_server.py

# Run backtest via API
curl -X POST http://localhost:5001/api/backtest/run \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "XAUUSD",
    "timeframe": "H1",
    "days": 30,
    "volume": 0.20,
    "initial_balance": 100000
  }'
```

### Methode 3: In Python Code

```python
from backtesting_engine import BacktestingEngine
from trading_strategy import TradingStrategy

# Create strategy and engine
strategy = TradingStrategy()
engine = BacktestingEngine(strategy, initial_balance=100000.0)

# Run backtest
results = engine.run_backtest(
    symbol="XAUUSD",
    timeframe="H1",
    days=30,  # 30 dagen historische data
    volume=0.20
)

# Bekijk results
print(f"Win Rate: {results['metrics']['win_rate']}%")
print(f"Total Return: {results['total_return_pct']}%")
print(f"Profit Factor: {results['metrics']['profit_factor']:.2f}")
```

## 📊 Performance Metrics

De engine berekent automatisch:

### Trading Statistics
- **Win Rate** - Percentage winnende trades
- **Total Trades** - Totaal aantal trades
- **Winning/Losing Trades** - Aantal winnaars/verliezers
- **Total P&L** - Totale profit/loss

### Performance Metrics
- **Profit Factor** - Gross profit / Gross loss
- **Expectancy** - Gemiddelde P&L per trade
- **Avg Win/Loss** - Gemiddelde win en loss

### Risk Metrics
- **Max Drawdown** - Maximum verlies vanaf peak
- **Sharpe Ratio** - Risk-adjusted return
- **Sortino Ratio** - Downside risk-adjusted return
- **Recovery Factor** - Net profit / Max drawdown

## ⚙️ Parameters

### `run_backtest()` Parameters:

- **`symbol`** (str): Trading symbol, default "XAUUSD"
- **`timeframe`** (str): Timeframe (H1, H4, D1), default "H1"
- **`days`** (int): Aantal dagen historische data, default 30
- **`volume`** (float): Trade volume in lots, default 0.20

### `BacktestingEngine()` Parameters:

- **`strategy`** (TradingStrategy): Strategy instance
- **`initial_balance`** (float): Start balans, default 100000.0
- **`bridge_url`** (str): MT5 bridge URL, default "http://localhost:5002"

## 📈 Resultaten Structuur

```python
{
    'success': True,
    'trades': [...],  # List van alle trades
    'equity_curve': [...],  # Equity over tijd
    'metrics': {
        'win_rate': 45.5,
        'total_pnl': 1250.50,
        'profit_factor': 1.25,
        'sharpe_ratio': 0.85,
        'max_drawdown': 500.00,
        # ... etc
    },
    'initial_balance': 100000.0,
    'final_balance': 101250.50,
    'total_return_pct': 1.25
}
```

## 🔧 Vereisten

1. **MT5 Bridge moet draaien:**
   ```bash
   python3 mt5_bridge.py
   ```

2. **MT5 EA moet actief zijn** op een chart

3. **Historische data beschikbaar** - Minimaal 50 candles nodig

## ⚠️ Belangrijke Notities

1. **P&L Berekening:**
   - Vereenvoudigde berekening: `price_diff * volume * 100`
   - Voor XAUUSD: 1 lot = 100 oz
   - Volume 0.20 = 20 oz

2. **TP/SL:**
   - Gebruikt dynamische TP/SL van strategie
   - Posities sluiten automatisch bij TP/SL hit

3. **Signalen:**
   - Minimum 60% confidence vereist
   - Gebruikt zelfde strategie als live trading

4. **Data:**
   - Haalt historische data op via MT5 bridge
   - Maximaal 1000 candles (voor performance)

## 🐛 Troubleshooting

### Error: "Insufficient historical data"
- **Oplossing:** Zorg dat MT5 bridge draait en EA actief is
- Check of er genoeg historische data beschikbaar is

### Error: "MT5 EA not responding"
- **Oplossing:** Start MT5 EA op een chart
- Check bridge verbinding: `curl http://localhost:5002/health`

### Geen trades gegenereerd
- **Oplossing:** 
  - Check of confidence threshold wordt gehaald (≥60%)
  - Verlaag confidence threshold tijdelijk voor test
  - Check of strategie signalen genereert

## 🚀 Volgende Stappen

Nu dat backtesting werkt, kun je:
1. ✅ Test verschillende parameter combinaties
2. ✅ Vergelijk strategie varianten
3. ✅ Optimaliseer parameters (volgende feature!)
4. ✅ Visualiseer results in dashboard (volgende feature!)

## 📝 API Endpoints

### POST `/api/backtest/run`
Run een backtest

**Request:**
```json
{
  "symbol": "XAUUSD",
  "timeframe": "H1",
  "days": 30,
  "volume": 0.20,
  "initial_balance": 100000
}
```

**Response:**
```json
{
  "success": true,
  "trades": [...],
  "equity_curve": [...],
  "metrics": {...},
  "total_return_pct": 1.25
}
```

### POST `/api/backtest/metrics`
Bereken metrics van bestaande trades

**Request:**
```json
{
  "trades": [...],
  "equity_curve": [...]
}
```

---

**🎉 Backtesting Engine is klaar voor gebruik!**

Test het nu met: `python3 test_backtest.py`
