# Live Trading Setup

Deze map bevat alle bestanden voor live trading met MetaTrader 5.

## 📁 Bestanden

- **`live_trading_config.py`** - Configuratie voor live trading (risk, timeframe, etc.)
- **`position_sizer.py`** - Bereken lot size op basis van risico
- **`risk_manager.py`** - Risk management (daily limits, max trades, drawdown)
- **`live_trader.py`** - Main live trading script
- **`start_live_trading.sh`** - Start script voor live trading

## 🚀 Quick Start

### 1. Start MT5 Bridge

Zorg dat de MT5 bridge draait:
```bash
python3 mt5_bridge.py
```

### 2. Start Live Trading

```bash
cd LIVE
./start_live_trading.sh
```

Of direct met Python:
```bash
python3 LIVE/live_trader.py --config conservative --interval 60
```

## ⚙️ Configuraties

### Conservative (Aanbevolen voor start)
- Risk per trade: 2%
- Target profit: 4%
- Max daily loss: 20%
- Confidence threshold: 75%

```bash
python3 LIVE/live_trader.py --config conservative
```

### Moderate
- Risk per trade: 5%
- Target profit: 10%
- Max daily loss: 30%
- Confidence threshold: 70%

```bash
python3 LIVE/live_trader.py --config moderate
```

### Aggressive (Zeer risicovol!)
- Risk per trade: 50%
- Target profit: 100%
- Max daily loss: 50%
- **Waarschuwing:** 2 verliezende trades = account weg!

```bash
python3 LIVE/live_trader.py --config aggressive
```

## 📊 Timeframe Aanbeveling

**M5 (5 minuten) is de beste keuze** voor 1-2 trades per dag:
- Goede balans tussen opportunities en kwaliteit
- 288 candles per dag (genoeg data)
- Minder noise dan 1M
- Support/resistance werkt goed
- Technische indicatoren betrouwbaarder

De strategie past automatisch de indicator parameters aan voor M5:
- SMA: 10/20 (i.p.v. 20/50)
- RSI: 9 perioden (i.p.v. 14)
- EMA: 8/21 (i.p.v. 12/26)
- Support/Resistance: 25 candles lookback

## 💰 Position Sizing

De position sizer berekent automatisch de lot size op basis van:
- Account balance
- Risk percentage (2%, 5%, etc.)
- Stop Loss afstand in pips

**Voorbeeld:**
- Account: $100
- Risk: 5% = $5 risico
- SL: 50 pips
- Lot size: $5 / (50 × $1.00) = 0.10 lots

## 🛡️ Risk Management

De risk manager controleert:
- ✅ Max trades per dag (standaard: 2)
- ✅ Max daily loss (standaard: 50%)
- ✅ Max drawdown (standaard: 20%)
- ✅ Daily P&L tracking

## 📈 Wiskundige Analyse

### Met 70% Win Rate, 1:2 Risk/Reward:

**Conservatief (2% risk):**
- Per trade: +$2 winst of -$1 verlies
- Expected value: $1.10 per trade
- Na 30 trades: $100 → ~$133 (33% groei)

**Matig (5% risk):**
- Per trade: +$5 winst of -$2.50 verlies
- Expected value: $2.75 per trade
- Na 30 trades: $100 → ~$183 (83% groei)

**Agressief (50% risk):**
- Per trade: +$50 winst of -$25 verlies
- Expected value: $27.50 per trade
- Na 30 trades: $100 → ~$925 (825% groei)
- **MAAR:** 2 verliezende trades = account weg!

## ⚠️ Belangrijke Waarschuwingen

1. **Start Conservatief:** Begin met 2-5% risico per trade, niet 50%
2. **Test Eerst:** Backtest op M5 timeframe voor minimaal 1 week
3. **Paper Trading:** Test live config eerst op demo account
4. **Risk Management:** 50% max loss per dag is zeer agressief - overweeg 20-30%
5. **Position Sizing:** Gebruik altijd position sizer, niet vaste lot sizes

## 🔧 Aanpassen Configuratie

Je kunt de configuratie aanpassen in `live_trading_config.py`:

```python
LIVE_CONFIG = {
    'timeframe': 'M5',
    'risk_per_trade_percent': 5.0,
    'max_trades_per_day': 2,
    'confidence_threshold': 70,
    # ... etc
}
```

Of gebruik een custom config:

```python
from LIVE.live_trading_config import get_config, merge_configs

base_config = get_config('conservative')
custom_config = {
    'risk_per_trade_percent': 3.0,
    'confidence_threshold': 75
}
config = merge_configs(base_config, custom_config)
```

## 📊 Monitoring

De risk manager slaat dagelijkse statistieken op in `LIVE/daily_stats.json`:
- Trades vandaag
- Total P&L
- Win rate
- Max drawdown
- etc.

## 🐛 Troubleshooting

**MT5 Bridge niet bereikbaar:**
```bash
# Start MT5 bridge
python3 mt5_bridge.py
```

**Import errors:**
```bash
# Zorg dat je in de project root bent
cd /Users/gebruiker/Desktop/AItraderbychiel
python3 LIVE/live_trader.py
```

**Geen signalen:**
- Check of MT5 verbonden is
- Check of er genoeg candlestick data is
- Verlaag confidence threshold tijdelijk voor testing

## 📝 Logs

Logs worden opgeslagen in `LIVE/logs/live_trading_YYYYMMDD_HHMMSS.log`

## 🎯 Volgende Stappen

1. ✅ Test op demo account eerst
2. ✅ Backtest op M5 timeframe
3. ✅ Start met conservative config
4. ✅ Monitor dagelijks de resultaten
5. ✅ Pas configuratie aan op basis van resultaten
