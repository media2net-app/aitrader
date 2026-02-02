'use client';

import { useState, useEffect } from 'react';
import { 
  Play, Pause, Settings, TrendingUp, TrendingDown, 
  DollarSign, Target, AlertCircle, CheckCircle, Activity,
  BarChart3, Zap, Clock, RefreshCw
} from 'lucide-react';

interface TradeConfig {
  enabled: boolean;
  symbol: string;
  lotSize: number;
  takeProfit1: number; // in pips
  takeProfit2: number; // in pips
  takeProfit3: number; // in pips
  stopLoss: number; // in pips
  riskPerTrade: number; // percentage
  maxOpenTrades: number;
  timeframe: string;
  useRSI: boolean;
  rsiOverbought: number;
  rsiOversold: number;
  useMACD: boolean;
  useSMA: boolean;
}

interface Trade {
  ticket: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  takeProfit1: number;
  takeProfit2: number;
  takeProfit3: number;
  stopLoss: number;
  status: 'open' | 'tp1' | 'tp2' | 'tp3' | 'sl' | 'closed';
  openTime: string;
}

interface TradingStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  avgProfit: number;
  maxDrawdown: number;
}

export default function AutoTradePage() {
  const [config, setConfig] = useState<TradeConfig>({
    enabled: false,
    symbol: 'XAUUSD',
    lotSize: 0.2,
    takeProfit1: 20, // 20 pips
    takeProfit2: 40, // 40 pips
    takeProfit3: 60, // 60 pips
    stopLoss: 15, // 15 pips
    riskPerTrade: 2, // 2%
    maxOpenTrades: 3,
    timeframe: 'H1',
    useRSI: true,
    rsiOverbought: 70,
    rsiOversold: 30,
    useMACD: true,
    useSMA: true,
  });

  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradingStats>({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalProfit: 0,
    avgProfit: 0,
    maxDrawdown: 0,
  });
  const [isRunning, setIsRunning] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [testMode, setTestMode] = useState(false);
  const [testDate, setTestDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Analyze market and generate signal
  const analyzeMarket = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(
        `${API_URL}/api/trading/signal?symbol=${config.symbol}&count=100`,
        { method: 'GET' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to analyze market');
      }
      
      const data = await response.json();
      setLastAnalysis(data);
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
      console.error('Analysis error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Place trade with TP1, TP2, TP3 and SL
  const placeTrade = async (signal: 'BUY' | 'SELL') => {
    try {
      setError('');
      
      // Get current price
      const priceResponse = await fetch(`${API_URL}/api/mt5/candles?symbol=${config.symbol}&timeframe=${config.timeframe}&count=1`);
      if (!priceResponse.ok) throw new Error('Failed to get current price');
      
      const priceData = await priceResponse.json();
      const candles = priceData.candles || [];
      if (candles.length === 0) throw new Error('No price data available');
      
      const currentPrice = candles[candles.length - 1].close;
      
      // Calculate TP and SL prices
      const pipValue = 0.01; // For XAUUSD, 1 pip = 0.01
      const tp1Price = signal === 'BUY' 
        ? currentPrice + (config.takeProfit1 * pipValue)
        : currentPrice - (config.takeProfit1 * pipValue);
      const tp2Price = signal === 'BUY'
        ? currentPrice + (config.takeProfit2 * pipValue)
        : currentPrice - (config.takeProfit2 * pipValue);
      const tp3Price = signal === 'BUY'
        ? currentPrice + (config.takeProfit3 * pipValue)
        : currentPrice - (config.takeProfit3 * pipValue);
      const slPrice = signal === 'BUY'
        ? currentPrice - (config.stopLoss * pipValue)
        : currentPrice + (config.stopLoss * pipValue);
      
      // Place order via API
      // EA expects: symbol, type (BUY/SELL), volume
      // Optional: sl, tp (but EA doesn't parse them yet, so we'll set them via MT5 after order)
      const orderResponse = await fetch(`${API_URL}/api/mt5/place-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: config.symbol,
          type: signal, // EA expects 'type' not 'order_type'
          volume: config.lotSize,
          // Note: EA doesn't parse sl/tp from JSON yet, but we include them for future use
          sl: slPrice,
          tp: tp3Price, // Set TP3 as main TP (we'll manage TP1/TP2 manually)
        }),
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({ error: 'Failed to place order' }));
        throw new Error(errorData.error || 'Failed to place order');
      }
      
      const orderData = await orderResponse.json();
      
      if (orderData.success && orderData.ticket) {
        // Add trade to local state
        const newTrade: Trade = {
          ticket: orderData.ticket,
          symbol: config.symbol,
          type: signal,
          volume: config.lotSize,
          openPrice: currentPrice,
          currentPrice: currentPrice,
          profit: 0,
          takeProfit1: tp1Price,
          takeProfit2: tp2Price,
          takeProfit3: tp3Price,
          stopLoss: slPrice,
          status: 'open',
          openTime: new Date().toISOString(),
        };
        
        setTrades(prev => [...prev, newTrade]);
        return newTrade;
      } else {
        throw new Error(orderData.error || 'Order placement failed');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Trade placement failed';
      setError(errorMessage);
      console.error('Place trade error:', err);
      return null;
    }
  };

  // Check and update trades (TP1, TP2, TP3, SL)
  const checkTrades = async () => {
    try {
      // Get current positions
      const positionsResponse = await fetch(`${API_URL}/api/mt5/positions`);
      if (!positionsResponse.ok) return;
      
      const positionsData = await positionsResponse.json();
      const positions = positionsData.positions || [];
      
      // Get current price
      const priceResponse = await fetch(`${API_URL}/api/mt5/candles?symbol=${config.symbol}&timeframe=${config.timeframe}&count=1`);
      if (!priceResponse.ok) return;
      
      const priceData = await priceResponse.json();
      const candles = priceData.candles || [];
      if (candles.length === 0) return;
      
      const currentPrice = candles[candles.length - 1].close;
      
      // Update trades
      setTrades(prevTrades => {
        return prevTrades.map(trade => {
          // Find matching position
          const position = positions.find((p: any) => p.ticket === trade.ticket);
          
          if (!position) {
            // Position closed
            return { ...trade, status: 'closed' };
          }
          
          // Check TP and SL levels
          let newStatus = trade.status;
          const profit = parseFloat(position.profit || 0);
          
          if (trade.type === 'BUY') {
            if (currentPrice >= trade.takeProfit3 && trade.status !== 'tp3') {
              newStatus = 'tp3';
            } else if (currentPrice >= trade.takeProfit2 && trade.status !== 'tp2' && trade.status !== 'tp3') {
              newStatus = 'tp2';
            } else if (currentPrice >= trade.takeProfit1 && trade.status === 'open') {
              newStatus = 'tp1';
            } else if (currentPrice <= trade.stopLoss) {
              newStatus = 'sl';
            }
          } else { // SELL
            if (currentPrice <= trade.takeProfit3 && trade.status !== 'tp3') {
              newStatus = 'tp3';
            } else if (currentPrice <= trade.takeProfit2 && trade.status !== 'tp2' && trade.status !== 'tp3') {
              newStatus = 'tp2';
            } else if (currentPrice <= trade.takeProfit1 && trade.status === 'open') {
              newStatus = 'tp1';
            } else if (currentPrice >= trade.stopLoss) {
              newStatus = 'sl';
            }
          }
          
          // Close partial positions at TP1 and TP2
          if (newStatus === 'tp1' && trade.status === 'open') {
            // Close 33% at TP1
            closePartialPosition(trade.ticket, trade.volume * 0.33);
          } else if (newStatus === 'tp2' && trade.status === 'tp1') {
            // Close 33% at TP2
            closePartialPosition(trade.ticket, trade.volume * 0.33);
          } else if (newStatus === 'tp3' && trade.status === 'tp2') {
            // Close remaining 34% at TP3
            closePartialPosition(trade.ticket, trade.volume * 0.34);
          }
          
          return {
            ...trade,
            currentPrice,
            profit,
            status: newStatus,
          };
        });
      });
    } catch (err) {
      console.error('Check trades error:', err);
    }
  };

  // Close partial position
  const closePartialPosition = async (ticket: number, volume: number) => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/close-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket,
          volume, // Partial close
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to close partial position');
      }
    } catch (err) {
      console.error('Close partial position error:', err);
    }
  };

  // Main trading loop
  useEffect(() => {
    if (!isRunning || !config.enabled) return;
    
    const interval = setInterval(async () => {
      // Check existing trades
      await checkTrades();
      
      // Check if we can open new trades
      const openTrades = trades.filter(t => t.status === 'open' || t.status === 'tp1' || t.status === 'tp2');
      if (openTrades.length >= config.maxOpenTrades) return;
      
      // Analyze market
      const analysis = await analyzeMarket();
      if (!analysis || analysis.signal === 'NEUTRAL') return;
      
      // Place trade if signal is strong
      if (analysis.signal === 'BUY' || analysis.signal === 'SELL') {
        await placeTrade(analysis.signal);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [isRunning, config.enabled, trades, config]);

  // Calculate stats
  useEffect(() => {
    const closedTrades = trades.filter(t => t.status === 'closed' || t.status === 'sl' || t.status === 'tp3');
    const winningTrades = closedTrades.filter(t => t.profit > 0);
    const losingTrades = closedTrades.filter(t => t.profit < 0);
    const totalProfit = closedTrades.reduce((sum, t) => sum + t.profit, 0);
    
    setStats({
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0,
      totalProfit,
      avgProfit: closedTrades.length > 0 ? totalProfit / closedTrades.length : 0,
      maxDrawdown: 0, // TODO: Calculate drawdown
    });
  }, [trades]);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              Auto Trade Script
            </h1>
          </div>
          <p className="text-gray-400">
            Automated trading with Take Profit 1, 2, 3 and Stop Loss
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass glass-hover rounded-xl p-4 mb-6 border border-red-500/50">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel - Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Control Panel */}
            <div className="glass glass-hover rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Control Panel</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => {
                      setIsRunning(!isRunning);
                      setConfig(prev => ({ ...prev, enabled: !isRunning }));
                    }}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                      isRunning
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 inline mr-2" />
                        Stop Trading
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 inline mr-2" />
                        Start Trading
                      </>
                    )}
                  </button>
                  <button
                    onClick={analyzeMarket}
                    disabled={loading}
                    className="px-4 py-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white font-semibold disabled:opacity-50"
                  >
                    <RefreshCw className={`w-5 h-5 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Analyze
                  </button>
                </div>
              </div>

              {/* Test Mode */}
              <div className="mb-6 p-4 bg-white/5 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-white font-medium">Test Mode (Historical Data)</span>
                  </label>
                </div>
                {testMode && (
                  <div className="mt-3">
                    <label className="block text-sm text-gray-400 mb-2">Test Date</label>
                    <input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    />
                  </div>
                )}
              </div>

              {/* Trading Parameters */}
              <h3 className="text-xl font-bold text-white mb-4">Trading Parameters</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={config.symbol}
                    onChange={(e) => setConfig(prev => ({ ...prev, symbol: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Lot Size</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.lotSize}
                    onChange={(e) => setConfig(prev => ({ ...prev, lotSize: parseFloat(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Take Profit 1 (pips)</label>
                  <input
                    type="number"
                    value={config.takeProfit1}
                    onChange={(e) => setConfig(prev => ({ ...prev, takeProfit1: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Take Profit 2 (pips)</label>
                  <input
                    type="number"
                    value={config.takeProfit2}
                    onChange={(e) => setConfig(prev => ({ ...prev, takeProfit2: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Take Profit 3 (pips)</label>
                  <input
                    type="number"
                    value={config.takeProfit3}
                    onChange={(e) => setConfig(prev => ({ ...prev, takeProfit3: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Stop Loss (pips)</label>
                  <input
                    type="number"
                    value={config.stopLoss}
                    onChange={(e) => setConfig(prev => ({ ...prev, stopLoss: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Max Open Trades</label>
                  <input
                    type="number"
                    value={config.maxOpenTrades}
                    onChange={(e) => setConfig(prev => ({ ...prev, maxOpenTrades: parseInt(e.target.value) }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Timeframe</label>
                  <select
                    value={config.timeframe}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeframe: e.target.value }))}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="M15">M15</option>
                    <option value="M30">M30</option>
                    <option value="H1">H1</option>
                    <option value="H4">H4</option>
                    <option value="D1">D1</option>
                  </select>
                </div>
              </div>

              {/* Technical Indicators */}
              <h3 className="text-xl font-bold text-white mt-6 mb-4">Technical Indicators</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.useRSI}
                    onChange={(e) => setConfig(prev => ({ ...prev, useRSI: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Use RSI</span>
                </div>
                {config.useRSI && (
                  <>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">RSI Overbought</label>
                      <input
                        type="number"
                        value={config.rsiOverbought}
                        onChange={(e) => setConfig(prev => ({ ...prev, rsiOverbought: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">RSI Oversold</label>
                      <input
                        type="number"
                        value={config.rsiOversold}
                        onChange={(e) => setConfig(prev => ({ ...prev, rsiOversold: parseInt(e.target.value) }))}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      />
                    </div>
                  </>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.useMACD}
                    onChange={(e) => setConfig(prev => ({ ...prev, useMACD: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Use MACD</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={config.useSMA}
                    onChange={(e) => setConfig(prev => ({ ...prev, useSMA: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Use SMA</span>
                </div>
              </div>
            </div>

            {/* Last Analysis */}
            {lastAnalysis && (
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Last Analysis</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Signal</div>
                    <div className={`text-2xl font-bold ${
                      lastAnalysis.signal === 'BUY' ? 'text-green-400' :
                      lastAnalysis.signal === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {lastAnalysis.signal}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Confidence</div>
                    <div className="text-2xl font-bold text-white">
                      {lastAnalysis.confidence ? `${lastAnalysis.confidence}%` : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">RSI</div>
                    <div className="text-2xl font-bold text-white">
                      {lastAnalysis.rsi ? lastAnalysis.rsi.toFixed(2) : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Open Trades */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Open Trades</h2>
              {trades.filter(t => t.status !== 'closed').length === 0 ? (
                <div className="text-center py-8 text-gray-400">No open trades</div>
              ) : (
                <div className="space-y-3">
                  {trades.filter(t => t.status !== 'closed').map((trade) => (
                    <div key={trade.ticket} className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-2">
                            <span className={`font-semibold ${
                              trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.type} {trade.symbol}
                            </span>
                            <span className="text-xs text-gray-400">#{trade.ticket}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                              trade.status === 'tp1' ? 'bg-yellow-500/20 text-yellow-400' :
                              trade.status === 'tp2' ? 'bg-orange-500/20 text-orange-400' :
                              trade.status === 'tp3' ? 'bg-green-500/20 text-green-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.status.toUpperCase()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            Open: ${trade.openPrice.toFixed(2)} | Current: ${trade.currentPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${
                            trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            ${trade.profit.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-400">Volume: {trade.volume}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel - Right */}
          <div className="space-y-6">
            {/* Trading Stats */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Trading Statistics</h2>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Trades</div>
                  <div className="text-3xl font-bold text-white">{stats.totalTrades}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Win Rate</div>
                  <div className="text-3xl font-bold text-green-400">{stats.winRate.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Total Profit</div>
                  <div className={`text-3xl font-bold ${
                    stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${stats.totalProfit.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Avg Profit</div>
                  <div className={`text-2xl font-bold ${
                    stats.avgProfit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${stats.avgProfit.toFixed(2)}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Wins</div>
                    <div className="text-xl font-bold text-green-400">{stats.winningTrades}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400 mb-1">Losses</div>
                    <div className="text-xl font-bold text-red-400">{stats.losingTrades}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Status</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Trading</span>
                  <span className={`px-3 py-1 rounded ${
                    isRunning ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {isRunning ? 'Active' : 'Stopped'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Open Trades</span>
                  <span className="text-white font-semibold">
                    {trades.filter(t => t.status !== 'closed').length} / {config.maxOpenTrades}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Update</span>
                  <span className="text-white text-sm">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
