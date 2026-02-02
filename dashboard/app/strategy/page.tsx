'use client';

import { useState } from 'react';
import { Target, TrendingUp, Activity, BarChart3, Zap, Shield, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'indicators' | 'tp-sl'>('overview');

  const strategyInfo = {
    name: 'XAUUSD Auto Trade Strategie',
    description: 'Geavanceerde technische analyse strategie met patroonherkenning en dynamische TP/SL',
    status: 'actief',
    winRate: '40-55% (verwacht)',
    riskReward: '1:2',
    confidenceThreshold: '60%',
  };

  const candlestickPatterns = [
    {
      name: 'Hammer',
      type: 'bullish',
      description: 'Kleine body bovenaan, lange onderste wick. Signaleert mogelijke omkeer naar boven.',
      example: {
        open: 2500,
        high: 2502,
        low: 2495,
        close: 2501,
      },
      signal: 'BUY',
      strength: '15 punten',
    },
    {
      name: 'Shooting Star',
      type: 'bearish',
      description: 'Kleine body onderaan, lange bovenste wick. Signaleert mogelijke omkeer naar beneden.',
      example: {
        open: 2500,
        high: 2505,
        low: 2499,
        close: 2501,
      },
      signal: 'SELL',
      strength: '15 punten',
    },
    {
      name: 'Doji',
      type: 'neutral',
      description: 'Zeer kleine body (open ≈ close). Signaleert onzekerheid en mogelijke omkeer.',
      example: {
        open: 2500,
        high: 2502,
        low: 2498,
        close: 2500,
      },
      signal: 'NEUTRAL',
      strength: '5 punten',
    },
    {
      name: 'Bullish Engulfing',
      type: 'bullish',
      description: 'Grote groene candle die de vorige rode candle volledig "opeet". Zeer sterk bullish signaal.',
      example: {
        prev: { open: 2500, close: 2495 }, // Rode candle
        curr: { open: 2494, close: 2503 }, // Groene candle die alles opeet
      },
      signal: 'BUY',
      strength: '20 punten',
    },
    {
      name: 'Bearish Engulfing',
      type: 'bearish',
      description: 'Grote rode candle die de vorige groene candle volledig "opeet". Zeer sterk bearish signaal.',
      example: {
        prev: { open: 2500, close: 2505 }, // Groene candle
        curr: { open: 2506, close: 2494 }, // Rode candle die alles opeet
      },
      signal: 'SELL',
      strength: '20 punten',
    },
  ];

  const technicalIndicators = [
    {
      name: 'SMA (Simple Moving Average)',
      periods: '20 & 50',
      description: 'Gemiddelde prijs over laatste 20 en 50 candles. Crossover signaleert trendwisseling.',
      buySignal: 'SMA20 > SMA50 EN prijs > SMA20',
      sellSignal: 'SMA20 < SMA50 EN prijs < SMA20',
      weight: '25 punten',
    },
    {
      name: 'RSI (Relative Strength Index)',
      periods: '14',
      description: 'Meet momentum. Waarden 0-100. Onder 30 = oversold (koopkans), boven 70 = overbought (verkoopkans).',
      buySignal: 'RSI < 30 (oversold)',
      sellSignal: 'RSI > 70 (overbought)',
      weight: '20 punten',
    },
    {
      name: 'MACD (Moving Average Convergence Divergence)',
      periods: '12, 26, 9',
      description: 'Trendvolgend momentum indicator. Histogram > 0 = bullish, < 0 = bearish.',
      buySignal: 'MACD histogram > 0 EN MACD > Signal line',
      sellSignal: 'MACD histogram < 0 EN MACD < Signal line',
      weight: '20 punten',
    },
    {
      name: 'EMA (Exponential Moving Average)',
      periods: '12 & 26',
      description: 'Gewogen gemiddelde dat meer gewicht geeft aan recente prijzen. Sneller dan SMA.',
      buySignal: 'EMA12 > EMA26 EN prijs > EMA12',
      sellSignal: 'EMA12 < EMA26 EN prijs < EMA12',
      weight: '15 punten',
    },
  ];

  const renderCandlestick = (pattern: any, isExample: boolean = false) => {
    if (pattern.prev && pattern.curr) {
      // Engulfing pattern - show 2 candles
      const prevIsBullish = pattern.prev.close > pattern.prev.open;
      const currIsBullish = pattern.curr.close > pattern.curr.open;
      const prevBody = Math.abs(pattern.prev.close - pattern.prev.open);
      const currBody = Math.abs(pattern.curr.close - pattern.curr.open);
      
      return (
        <div className="flex items-end space-x-3 h-32">
          {/* Previous candle */}
          <div className="flex flex-col items-center">
            <div className="relative w-10 h-24 flex items-center justify-center">
              <div className={`w-6 rounded-sm ${
                prevIsBullish ? 'bg-green-500' : 'bg-red-500'
              }`} style={{ height: `${Math.max(prevBody * 2, 8)}px` }}></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">Vorige</div>
          </div>
          {/* Current candle */}
          <div className="flex flex-col items-center">
            <div className="relative w-10 h-24 flex items-center justify-center">
              <div className={`w-6 rounded-sm ${
                currIsBullish ? 'bg-green-500' : 'bg-red-500'
              }`} style={{ height: `${Math.max(currBody * 2, 12)}px` }}></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">Huidige</div>
          </div>
        </div>
      );
    }

    const { open, high, low, close } = pattern.example || pattern;
    const isBullish = close > open;
    const bodyHeight = Math.abs(close - open);
    const totalHeight = high - low || 1; // Avoid division by zero
    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;
    const maxHeight = 80;

    return (
      <div className="flex flex-col items-center space-y-2">
        <div className="relative w-12" style={{ height: `${maxHeight}px` }}>
          {/* Upper wick */}
          {upperWick > 0 && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-500" 
                 style={{ height: `${Math.min((upperWick / totalHeight) * maxHeight, maxHeight * 0.4)}px` }}></div>
          )}
          
          {/* Body */}
          <div className={`absolute w-8 rounded-sm ${
            isBullish ? 'bg-green-500' : 'bg-red-500'
          }`} 
          style={{ 
            height: `${Math.max((bodyHeight / totalHeight) * maxHeight, 4)}px`,
            top: `${Math.min((upperWick / totalHeight) * maxHeight, maxHeight * 0.4)}px`
          }}></div>
          
          {/* Lower wick */}
          {lowerWick > 0 && (
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0.5 bg-gray-500" 
                 style={{ height: `${Math.min((lowerWick / totalHeight) * maxHeight, maxHeight * 0.4)}px` }}></div>
          )}
        </div>
        {isExample && (
          <div className="text-xs text-gray-400 text-center">
            <div>O: ${open}</div>
            <div>H: ${high}</div>
            <div>L: ${low}</div>
            <div>C: ${close}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Target className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Strategie
            </h1>
          </div>
          <p className="text-gray-400">
            Complete uitleg van de XAUUSD Auto Trade Strategie met patroonherkenning
          </p>
        </header>

        {/* Strategy Overview Card */}
        <div className="glass glass-hover rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{strategyInfo.name}</h2>
              <p className="text-gray-400">{strategyInfo.description}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
              strategyInfo.status === 'actief' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {strategyInfo.status.toUpperCase()}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Win Rate</div>
              <div className="text-xl font-bold text-white">{strategyInfo.winRate}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Risk/Reward</div>
              <div className="text-xl font-bold text-white">{strategyInfo.riskReward}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Confidence</div>
              <div className="text-xl font-bold text-white">≥ {strategyInfo.confidenceThreshold}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Symbol</div>
              <div className="text-xl font-bold text-white">XAUUSD</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Overzicht
          </button>
          <button
            onClick={() => setActiveTab('patterns')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'patterns'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Candlestick Patronen
          </button>
          <button
            onClick={() => setActiveTab('indicators')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'indicators'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Technische Indicatoren
          </button>
          <button
            onClick={() => setActiveTab('tp-sl')}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === 'tp-sl'
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            TP/SL Berekenen
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="glass glass-hover rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Info className="w-5 h-5 mr-2 text-indigo-400" />
                Hoe werkt de strategie?
              </h3>
              <div className="space-y-4 text-gray-300">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">1</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Candlestick Data Ophalen</div>
                    <p>Het script haalt de laatste 100 candlesticks (H1 timeframe) op van MT5. Dit zijn echte OHLC data (Open, High, Low, Close).</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">2</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Patroonherkenning</div>
                    <p>Het script analyseert de data voor:
                      <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                        <li>Support & Resistance levels (belangrijke prijsniveaus)</li>
                        <li>Candlestick patronen (Hammer, Doji, Engulfing, etc.)</li>
                        <li>Technische indicatoren (SMA, EMA, RSI, MACD)</li>
                      </ul>
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">3</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Signaal Genereren</div>
                    <p>Alle signalen worden geteld en gewogen. Als de confidence ≥ 60% is, wordt een BUY of SELL signaal gegenereerd.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">4</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Dynamische TP/SL Berekening</div>
                    <p>Op basis van de gevonden support/resistance levels worden Take Profit en Stop Loss dynamisch berekend met een 1:2 risk/reward ratio.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">5</div>
                  <div>
                    <div className="font-semibold text-white mb-1">Trade Plaatsen</div>
                    <p>De trade wordt geplaatst met de berekende TP/SL levels. Het script monitort continu en sluit posities als het signaal verandert.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass glass-hover rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-green-400" />
                  Voordelen
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Gebruikt echte marktdata (geen simulatie)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Herkenning van support/resistance levels</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Candlestick patroonherkenning</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Dynamische TP/SL op basis van marktstructuur</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    <span>Meerdere technische indicatoren combineren</span>
                  </li>
                </ul>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-400" />
                  Belangrijk
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚠</span>
                    <span>Minimum 60% confidence vereist voor trade</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚠</span>
                    <span>Minimaal 20 candles nodig voor analyse</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚠</span>
                    <span>Risk/Reward ratio: 1:2 (standaard)</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚠</span>
                    <span>Verwachte win rate: 40-55%</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-yellow-400 mr-2">⚠</span>
                    <span>Break-even bij 33.3% win rate (met 1:2 ratio)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="space-y-6">
            <div className="glass glass-hover rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Candlestick Patronen</h3>
              <p className="text-gray-400 mb-6">
                Het script herkent automatisch candlestick patronen die belangrijke signalen kunnen geven over mogelijke prijsbewegingen.
              </p>
              
              <div className="grid gap-6">
                {candlestickPatterns.map((pattern, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-bold text-white">{pattern.name}</h4>
                          <span className={`px-2 py-1 rounded text-xs ${
                            pattern.type === 'bullish' ? 'bg-green-500/20 text-green-400' :
                            pattern.type === 'bearish' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {pattern.type.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-indigo-500/20 text-indigo-400">
                            {pattern.signal}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{pattern.description}</p>
                        <div className="text-sm text-gray-400">
                          <span className="font-semibold">Signaal Strength:</span> {pattern.strength}
                        </div>
                      </div>
                      <div className="ml-6">
                        {renderCandlestick(pattern, true)}
                      </div>
                    </div>
                    
                    {pattern.example && !pattern.prev && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg">
                        <div className="text-sm font-semibold text-gray-400 mb-2">Voorbeeld:</div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Open:</span>
                            <span className="text-white ml-2">${pattern.example.open}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">High:</span>
                            <span className="text-green-400 ml-2">${pattern.example.high}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Low:</span>
                            <span className="text-red-400 ml-2">${pattern.example.low}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Close:</span>
                            <span className="text-white ml-2">${pattern.example.close}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="glass glass-hover rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Support & Resistance Detectie</h3>
              <p className="text-gray-300 mb-4">
                Het script detecteert automatisch support (prijsniveaus waar de prijs stopt met dalen) en resistance (prijsniveaus waar de prijs stopt met stijgen) levels.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-green-400 font-semibold mb-2">Support Level</div>
                  <p className="text-sm text-gray-300">
                    Lokale minima die meerdere keren zijn getest. Hoe vaker getest, hoe sterker het level. 
                    Bij BUY trades wordt de Stop Loss vaak net onder support gezet.
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-red-400 font-semibold mb-2">Resistance Level</div>
                  <p className="text-sm text-gray-300">
                    Lokale maxima die meerdere keren zijn getest. Bij BUY trades wordt de Take Profit vaak richting resistance gezet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'indicators' && (
          <div className="space-y-6">
            <div className="glass glass-hover rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Technische Indicatoren</h3>
              <p className="text-gray-400 mb-6">
                De strategie gebruikt 7 verschillende factoren om een signaal te genereren. Elke factor heeft een gewicht (punten).
              </p>
              
              <div className="space-y-4">
                {technicalIndicators.map((indicator, index) => (
                  <div key={index} className="bg-white/5 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-bold text-white">{indicator.name}</h4>
                          <span className="px-2 py-1 rounded text-xs bg-indigo-500/20 text-indigo-400">
                            {indicator.periods}
                          </span>
                          <span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">
                            {indicator.weight}
                          </span>
                        </div>
                        <p className="text-gray-300 mb-3">{indicator.description}</p>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <div className="text-green-400 font-semibold text-sm mb-1">BUY Signaal:</div>
                            <div className="text-sm text-gray-300">{indicator.buySignal}</div>
                          </div>
                          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                            <div className="text-red-400 font-semibold text-sm mb-1">SELL Signaal:</div>
                            <div className="text-sm text-gray-300">{indicator.sellSignal}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 glass glass-hover rounded-xl p-6">
                <h4 className="text-lg font-bold text-white mb-4">Extra Factoren</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="font-semibold text-white mb-2">Support/Resistance Analysis</div>
                    <p className="text-sm text-gray-300 mb-2">Analyseert afstand tot support/resistance levels</p>
                    <div className="text-xs text-gray-400">Gewicht: 15 punten</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="font-semibold text-white mb-2">Candlestick Patterns</div>
                    <p className="text-sm text-gray-300 mb-2">Detecteert patronen zoals Hammer, Doji, Engulfing</p>
                    <div className="text-xs text-gray-400">Gewicht: 10-20 punten (afhankelijk van patroon)</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="font-semibold text-white mb-2">Price Momentum</div>
                    <p className="text-sm text-gray-300 mb-2">Analyseert recente prijsbeweging (laatste 5 candles)</p>
                    <div className="text-xs text-gray-400">Gewicht: 10 punten</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tp-sl' && (
          <div className="space-y-6">
            <div className="glass glass-hover rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">Dynamische TP/SL Berekening</h3>
              <p className="text-gray-300 mb-6">
                In plaats van vaste TP/SL waarden, berekent het script deze dynamisch op basis van support/resistance levels en een 1:2 risk/reward ratio.
              </p>

              <div className="space-y-6">
                <div className="bg-white/5 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Voorbeeld: BUY Trade</h4>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Entry Price</div>
                        <div className="text-xl font-bold text-white">$2,500.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Detected Support</div>
                        <div className="text-xl font-bold text-green-400">$2,495.20</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Detected Resistance</div>
                        <div className="text-xl font-bold text-red-400">$2,510.50</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Risk/Reward Ratio</div>
                        <div className="text-xl font-bold text-indigo-400">1:2</div>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-4 mt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                          <div className="text-sm text-gray-400 mb-1">Take Profit (TP)</div>
                          <div className="text-2xl font-bold text-green-400">$2,510.50</div>
                          <div className="text-xs text-gray-400 mt-1">105 pips | Gebaseerd op resistance level</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                          <div className="text-sm text-gray-400 mb-1">Stop Loss (SL)</div>
                          <div className="text-2xl font-bold text-red-400">$2,495.20</div>
                          <div className="text-xs text-gray-400 mt-1">48 pips | Net onder support level</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Voorbeeld: SELL Trade</h4>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Entry Price</div>
                        <div className="text-xl font-bold text-white">$2,500.00</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Detected Support</div>
                        <div className="text-xl font-bold text-green-400">$2,495.20</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400 mb-1">Detected Resistance</div>
                        <div className="text-xl font-bold text-red-400">$2,510.50</div>
                      </div>
                    </div>
                    
                    <div className="border-t border-white/10 pt-4 mt-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
                          <div className="text-sm text-gray-400 mb-1">Take Profit (TP)</div>
                          <div className="text-2xl font-bold text-green-400">$2,495.20</div>
                          <div className="text-xs text-gray-400 mt-1">105 pips | Gebaseerd op support level</div>
                        </div>
                        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
                          <div className="text-sm text-gray-400 mb-1">Stop Loss (SL)</div>
                          <div className="text-2xl font-bold text-red-400">$2,510.50</div>
                          <div className="text-xs text-gray-400 mt-1">48 pips | Net boven resistance level</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass glass-hover rounded-xl p-6">
                  <h4 className="text-lg font-bold text-white mb-4">Hoe wordt TP/SL berekend?</h4>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex items-start space-x-3">
                      <span className="text-indigo-400 font-bold">1.</span>
                      <span>Script detecteert support en resistance levels uit historische data</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-indigo-400 font-bold">2.</span>
                      <span>Voor BUY: TP richting resistance, SL onder support</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-indigo-400 font-bold">3.</span>
                      <span>Voor SELL: TP richting support, SL boven resistance</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-indigo-400 font-bold">4.</span>
                      <span>Risk/Reward ratio wordt toegepast (1:2 = voor elke $1 risico, $2 winst)</span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <span className="text-indigo-400 font-bold">5.</span>
                      <span>Als geen support/resistance gevonden, gebruikt script vaste ratio (0.2% winst/verlies)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
