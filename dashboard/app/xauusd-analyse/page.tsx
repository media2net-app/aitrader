'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Activity, DollarSign, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import Link from 'next/link';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface AnalysisData {
  current_price: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  sma_20: number;
  sma_50: number;
  ema_12: number;
  ema_26: number;
  rsi: number;
  macd: number;
  macd_signal: number;
  macd_histogram: number;
  support_level: number;
  resistance_level: number;
  trend: string;
  candles: CandleData[];
}

export default function XAUUSDAnalysisPage() {
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeframe, setTimeframe] = useState('H1'); // H1, H4, D1
  const [days, setDays] = useState(7);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const count = Math.min(days * 24, 1000); // Limit to 1000 candles max
      const response = await fetch(`${API_URL}/api/mt5/candles?symbol=XAUUSD&timeframe=${timeframe}&count=${count}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch XAUUSD data' }));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch XAUUSD data`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // Process candles data
      const candles: CandleData[] = data.candles || [];
      
      if (candles.length === 0) {
        throw new Error('No candle data available');
      }
      
      // Calculate technical indicators
      const closes = candles.map(c => c.close);
      const highs = candles.map(c => c.high);
      const lows = candles.map(c => c.low);
      
      // Current price
      const currentPrice = closes[closes.length - 1];
      const price24hAgo = closes.length >= 24 ? closes[closes.length - 24] : closes[0];
      const priceChange24h = currentPrice - price24hAgo;
      const priceChangePercent24h = price24hAgo > 0 ? (priceChange24h / price24hAgo) * 100 : 0;
      
      // SMA 20
      const sma20 = closes.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, closes.length);
      
      // SMA 50
      const sma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / Math.min(50, closes.length);
      
      // EMA 12
      let ema12 = closes[0];
      const ema12Multiplier = 2 / (12 + 1);
      for (let i = 1; i < closes.length; i++) {
        ema12 = (closes[i] * ema12Multiplier) + (ema12 * (1 - ema12Multiplier));
      }
      
      // EMA 26
      let ema26 = closes[0];
      const ema26Multiplier = 2 / (26 + 1);
      for (let i = 1; i < closes.length; i++) {
        ema26 = (closes[i] * ema26Multiplier) + (ema26 * (1 - ema26Multiplier));
      }
      
      // RSI (14 period)
      const rsiPeriod = 14;
      let gains = 0;
      let losses = 0;
      for (let i = closes.length - rsiPeriod; i < closes.length - 1; i++) {
        const change = closes[i + 1] - closes[i];
        if (change > 0) gains += change;
        else losses += Math.abs(change);
      }
      const avgGain = gains / rsiPeriod;
      const avgLoss = losses / rsiPeriod;
      const rs = avgLoss > 0 ? avgGain / avgLoss : 100;
      const rsi = 100 - (100 / (1 + rs));
      
      // MACD
      const macd = ema12 - ema26;
      
      // MACD Signal (EMA 9 of MACD)
      let macdSignal = macd;
      const macdSignalMultiplier = 2 / (9 + 1);
      // Simplified: use current MACD as signal
      macdSignal = macd * 0.8; // Approximation
      
      const macdHistogram = macd - macdSignal;
      
      // Support and Resistance
      const supportLevel = Math.min(...lows.slice(-20));
      const resistanceLevel = Math.max(...highs.slice(-20));
      
      // Trend
      let trend = 'Neutral';
      if (currentPrice > sma20 && sma20 > sma50) {
        trend = 'Bullish';
      } else if (currentPrice < sma20 && sma20 < sma50) {
        trend = 'Bearish';
      }
      
      setAnalysis({
        current_price: currentPrice,
        price_change_24h: priceChange24h,
        price_change_percent_24h: priceChangePercent24h,
        sma_20: sma20,
        sma_50: sma50,
        ema_12: ema12,
        ema_26: ema26,
        rsi: rsi,
        macd: macd,
        macd_signal: macdSignal,
        macd_histogram: macdHistogram,
        support_level: supportLevel,
        resistance_level: resistanceLevel,
        trend,
        candles: candles.slice(-days * 24) // Last N days
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analysis');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch on client side to avoid hydration mismatch
    if (typeof window !== 'undefined') {
      fetchAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe, days]);

  const getRSIColor = (rsi: number) => {
    if (rsi > 70) return 'text-red-400';
    if (rsi < 30) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getRSILabel = (rsi: number) => {
    if (rsi > 70) return 'Overbought';
    if (rsi < 30) return 'Oversold';
    return 'Neutral';
  };

  const getTrendColor = (trend: string) => {
    if (trend === 'Bullish') return 'text-green-400';
    if (trend === 'Bearish') return 'text-red-400';
    return 'text-yellow-400';
  };

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
                  XAU/USD Analyse
                </h1>
                <p className="text-gray-400 mt-1">Technical Analysis & Market Insights</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Timeframe Selector */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Timeframe:</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="M15">M15</option>
                    <option value="M30">M30</option>
                    <option value="H1">H1</option>
                    <option value="H4">H4</option>
                    <option value="D1">D1</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-400">Days:</label>
                  <select
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>
              
              {/* Auto Trade Link */}
              <Link
                href="/xauusd-analyse/auto-trade"
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-lg text-white font-semibold transition-all"
              >
                <Zap className="w-5 h-5" />
                <span>Auto Trade Script</span>
              </Link>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
          </div>
        )}

        {error && (
          <div className="glass glass-hover rounded-xl p-6 mb-6 border border-red-500/50">
            <div className="flex items-center space-x-2 text-red-400">
              <Activity className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {analysis && !loading && (
          <>
            {/* Price Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="glass glass-hover rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Current Price</div>
                <div className="text-3xl font-bold text-white">${analysis.current_price.toFixed(2)}</div>
                <div className={`text-sm mt-2 flex items-center space-x-1 ${analysis.price_change_24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analysis.price_change_24h >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                  <span>{analysis.price_change_24h >= 0 ? '+' : ''}{analysis.price_change_24h.toFixed(2)} ({analysis.price_change_percent_24h >= 0 ? '+' : ''}{analysis.price_change_percent_24h.toFixed(2)}%)</span>
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">Trend</div>
                <div className={`text-3xl font-bold ${getTrendColor(analysis.trend)}`}>{analysis.trend}</div>
                <div className="text-sm text-gray-500 mt-2">Based on SMA</div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">RSI (14)</div>
                <div className={`text-3xl font-bold ${getRSIColor(analysis.rsi)}`}>{analysis.rsi.toFixed(2)}</div>
                <div className={`text-sm mt-2 ${getRSIColor(analysis.rsi)}`}>{getRSILabel(analysis.rsi)}</div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="text-sm text-gray-400 mb-2">MACD</div>
                <div className={`text-3xl font-bold ${analysis.macd >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {analysis.macd >= 0 ? '+' : ''}{analysis.macd.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 mt-2">Histogram: {analysis.macd_histogram.toFixed(2)}</div>
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Moving Averages */}
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Moving Averages</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">SMA 20</span>
                    <span className="text-white font-semibold">${analysis.sma_20.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">SMA 50</span>
                    <span className="text-white font-semibold">${analysis.sma_50.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">EMA 12</span>
                    <span className="text-white font-semibold">${analysis.ema_12.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">EMA 26</span>
                    <span className="text-white font-semibold">${analysis.ema_26.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Support & Resistance */}
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Support & Resistance</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Support Level</span>
                    <span className="text-green-400 font-semibold">${analysis.support_level.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-white/5">
                    <span className="text-gray-400">Current Price</span>
                    <span className="text-white font-semibold">${analysis.current_price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-400">Resistance Level</span>
                    <span className="text-red-400 font-semibold">${analysis.resistance_level.toFixed(2)}</span>
                  </div>
                  <div className="mt-4 p-3 bg-white/5 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Distance to Support</div>
                    <div className="text-lg font-semibold text-green-400">
                      {((analysis.current_price - analysis.support_level) / analysis.support_level * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Distance to Resistance</div>
                    <div className="text-lg font-semibold text-red-400">
                      {((analysis.resistance_level - analysis.current_price) / analysis.current_price * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Chart */}
            <div className="glass glass-hover rounded-xl p-6 mb-6">
              <h2 className="text-2xl font-bold text-white mb-4">Price Chart ({timeframe})</h2>
              <div className="h-96 bg-white/5 rounded-lg p-4 overflow-x-auto">
                <svg width="100%" height="100%" viewBox="0 0 800 300" className="min-w-full">
                  {analysis.candles.length > 0 && (() => {
                    const width = 800;
                    const height = 300;
                    const padding = 40;
                    const chartWidth = width - (padding * 2);
                    const chartHeight = height - (padding * 2);
                    
                    const prices = analysis.candles.map(c => [c.high, c.low, c.open, c.close]).flat();
                    const maxPrice = Math.max(...prices);
                    const minPrice = Math.min(...prices);
                    const priceRange = maxPrice - minPrice || 1;
                    
                    const candleWidth = chartWidth / analysis.candles.length;
                    const candleSpacing = candleWidth * 0.1;
                    const actualCandleWidth = candleWidth - candleSpacing;
                    
                    return (
                      <>
                        {/* Grid lines */}
                        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                          const y = padding + (chartHeight * (1 - ratio));
                          const price = minPrice + (priceRange * ratio);
                          return (
                            <g key={ratio}>
                              <line
                                x1={padding}
                                y1={y}
                                x2={width - padding}
                                y2={y}
                                stroke="rgba(255,255,255,0.1)"
                                strokeWidth="1"
                              />
                              <text
                                x={padding - 10}
                                y={y + 5}
                                fill="rgba(255,255,255,0.5)"
                                fontSize="12"
                                textAnchor="end"
                              >
                                ${price.toFixed(2)}
                              </text>
                            </g>
                          );
                        })}
                        
                        {/* Candlesticks */}
                        {analysis.candles.map((candle, index) => {
                          const x = padding + (index * candleWidth) + (candleSpacing / 2);
                          const highY = padding + chartHeight - ((candle.high - minPrice) / priceRange * chartHeight);
                          const lowY = padding + chartHeight - ((candle.low - minPrice) / priceRange * chartHeight);
                          const openY = padding + chartHeight - ((candle.open - minPrice) / priceRange * chartHeight);
                          const closeY = padding + chartHeight - ((candle.close - minPrice) / priceRange * chartHeight);
                          const isBullish = candle.close > candle.open;
                          const bodyTop = Math.min(openY, closeY);
                          const bodyBottom = Math.max(openY, closeY);
                          const bodyHeight = bodyBottom - bodyTop || 1;
                          
                          return (
                            <g key={index}>
                              {/* Wick */}
                              <line
                                x1={x + actualCandleWidth / 2}
                                y1={highY}
                                x2={x + actualCandleWidth / 2}
                                y2={lowY}
                                stroke={isBullish ? '#10b981' : '#ef4444'}
                                strokeWidth="1"
                              />
                              {/* Body */}
                              <rect
                                x={x}
                                y={bodyTop}
                                width={actualCandleWidth}
                                height={bodyHeight}
                                fill={isBullish ? '#10b981' : '#ef4444'}
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Recent Candles Table */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Recent Price Data</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-gray-400">Time</th>
                      <th className="text-right py-3 px-4 text-gray-400">Open</th>
                      <th className="text-right py-3 px-4 text-gray-400">High</th>
                      <th className="text-right py-3 px-4 text-gray-400">Low</th>
                      <th className="text-right py-3 px-4 text-gray-400">Close</th>
                      <th className="text-right py-3 px-4 text-gray-400">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.candles.slice(-20).reverse().map((candle, index) => {
                      const change = candle.close - candle.open;
                      const changePercent = candle.open > 0 ? (change / candle.open) * 100 : 0;
                      return (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4 text-gray-300">{new Date(candle.time).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right text-white">${candle.open.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-green-400">${candle.high.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-red-400">${candle.low.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right text-white font-semibold">${candle.close.toFixed(2)}</td>
                          <td className={`py-3 px-4 text-right font-semibold ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
