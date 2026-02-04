'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Settings, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle2, XCircle, Wifi, WifiOff, Clock, Activity } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TradingConfig {
  timeframe: string;
  symbol: string;
  max_trades_per_day: number;
  risk_per_trade_percent: number;
  target_profit_percent: number;
  max_daily_loss_percent: number;
  confidence_threshold: number;
  config_type: string;
}

interface TradingStats {
  trades_today: number;
  total_pnl: number;
  daily_pnl_percent: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  current_balance: number;
  starting_balance: number;
  max_drawdown?: number;
  current_drawdown?: number;
  drawdown_percent?: number;
  margin_used?: number;
  free_margin?: number;
  margin_level?: number;
  total_exposure?: number;
  equity?: number;
}

interface Position {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  price_open: number;
  price_current: number;
  profit: number;
  swap: number;
  time: string;
}

interface TradeHistory {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  price_open: number;
  price_close: number;
  profit: number;
  time_open: string;
  time_close: string;
}

interface CurrentSignal {
  signal: string;
  confidence: number;
  reason: string;
  tp_sl?: {
    tp_pips: number;
    sl_pips: number;
  };
  analysis?: any;
  entry_price?: number;
  lot_size?: number;
  risk_reward_ratio?: number;
}

interface ConnectionStatus {
  market_open: boolean;
  mt5_bridge_connected: boolean;
  mt5_ea_running: boolean;
}

interface PriceData {
  bid: number;
  ask: number;
  last: number;
  time: string;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<TradingConfig>({
    timeframe: 'M5',
    symbol: 'XAUUSD',
    max_trades_per_day: 2,
    risk_per_trade_percent: 5.0,
    target_profit_percent: 10.0,
    max_daily_loss_percent: 50.0,
    confidence_threshold: 70,
    config_type: 'moderate'
  });
  const [stats, setStats] = useState<TradingStats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [platformLogs, setPlatformLogs] = useState<Array<{message: string}>>([]);
  const [mt5Logs, setMt5Logs] = useState<Array<{timestamp: string, message: string}>>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openPositions, setOpenPositions] = useState<Position[]>([]);
  const [currentPrice, setCurrentPrice] = useState<PriceData | null>(null);
  const [currentSignal, setCurrentSignal] = useState<CurrentSignal | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [equityData, setEquityData] = useState<Array<{time: string, equity: number, pnl: number}>>([]);
  const [notification, setNotification] = useState<{signal: string, confidence: number, reason?: string} | null>(null);
  const [previousSignal, setPreviousSignal] = useState<string | null>(null);

  const API_URL = typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001')
    : 'http://localhost:5001';

  const fetchMt5Logs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/logs`);
      if (response.ok) {
        const data = await response.json();
        // Filter out empty messages
        const filteredLogs = (data.logs || []).filter((log: any) => log.message && log.message.trim());
        setMt5Logs(filteredLogs);
      }
    } catch (err: any) {
      console.error('Error fetching MT5 logs:', err);
    }
  };

  const fetchPlatformLogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/platform-logs`);
      if (response.ok) {
        const data = await response.json();
        // Filter out empty messages
        const filteredLogs = (data.logs || []).filter((log: any) => log.message && log.message.trim());
        setPlatformLogs(filteredLogs);
      }
    } catch (err: any) {
      console.error('Error fetching platform logs:', err);
    }
  };

  useEffect(() => {
    // Fetch stats on mount
    setIsLoading(true);
    fetchStats().finally(() => setIsLoading(false));
    fetchMt5Logs();
    fetchPlatformLogs();
    fetchOpenPositions();
    fetchCurrentPrice();
    fetchCurrentSignal();
    fetchConnectionStatus();
    fetchTradeHistory();
    fetchCandles();
    
    if (isRunning) {
      const interval = setInterval(() => {
        fetchStats();
        fetchMt5Logs();
        fetchPlatformLogs();
        fetchOpenPositions();
        fetchCurrentPrice();
        fetchCurrentSignal();
        fetchConnectionStatus();
        fetchCandles();
      }, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    } else {
      // Still fetch logs and data even when not running, but less frequently
      const interval = setInterval(() => {
        fetchMt5Logs();
        fetchPlatformLogs();
        fetchOpenPositions();
        fetchCurrentPrice();
        fetchConnectionStatus();
        // Only fetch signal every 30 seconds when not running (to avoid too many initializations)
      }, 10000); // Update every 10 seconds when not running
      
      // Fetch signal separately, less frequently
      const signalInterval = setInterval(() => {
        fetchCurrentSignal();
      }, 30000); // Every 30 seconds when not running
      
      return () => {
        clearInterval(interval);
        clearInterval(signalInterval);
      };
    }
  }, [isRunning, config.symbol, config.timeframe]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        console.warn('Failed to fetch stats:', response.status);
        // Set default stats if API fails
        setStats({
          trades_today: 0,
          total_pnl: 0.0,
          daily_pnl_percent: 0.0,
          winning_trades: 0,
          losing_trades: 0,
          win_rate: 0.0,
          current_balance: 0.0,
          starting_balance: 0.0
        });
      }
    } catch (err: any) {
      console.error('Error fetching stats:', err);
      // Set default stats on error
      setStats({
        trades_today: 0,
        total_pnl: 0.0,
        daily_pnl_percent: 0.0,
        winning_trades: 0,
        losing_trades: 0,
        win_rate: 0.0,
        current_balance: 0.0,
        starting_balance: 0.0
      });
    }
  };

  const startTrading = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/api/live-trader/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setIsRunning(true);
        addLog('✅ Live Trader started successfully');
        fetchStats();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to start live trader');
        addLog(`❌ Error: ${data.error || 'Failed to start'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start live trader');
      addLog(`❌ Error: ${err.message || 'Connection failed'}`);
    }
  };

  const stopTrading = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/stop`, {
        method: 'POST',
      });

      if (response.ok) {
        setIsRunning(false);
        addLog('🛑 Live Trader stopped');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to stop live trader');
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const fetchOpenPositions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/positions`);
      if (response.ok) {
        const data = await response.json();
        setOpenPositions(data.positions || []);
      }
    } catch (err: any) {
      console.error('Error fetching positions:', err);
    }
  };

  const fetchCurrentPrice = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/tick?symbol=${config.symbol}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentPrice(data);
      }
    } catch (err: any) {
      console.error('Error fetching price:', err);
    }
  };

  const fetchCurrentSignal = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/current-signal?config_type=${config.config_type}&timeframe=${config.timeframe}&symbol=${config.symbol}`);
      if (response.ok) {
        const data = await response.json();
        const newSignal = data.signal || 'NEUTRAL';
        const newConfidence = data.confidence || 0;
        
        // Show notification if:
        // 1. Signal changed from previous signal
        // 2. New signal is not NEUTRAL
        // 3. Confidence meets threshold
        if (newSignal !== 'NEUTRAL' && 
            newSignal !== previousSignal && 
            newConfidence >= config.confidence_threshold) {
          setNotification({
            signal: newSignal,
            confidence: newConfidence,
            reason: data.reason
          });
          setPreviousSignal(newSignal);
          
          // Auto-hide notification after 8 seconds
          setTimeout(() => {
            setNotification(null);
          }, 8000);
        } else if (newSignal === 'NEUTRAL' && previousSignal && previousSignal !== 'NEUTRAL') {
          // Signal changed to NEUTRAL, clear notification
          setNotification(null);
          setPreviousSignal(null);
        }
        
        setCurrentSignal(data);
      }
    } catch (err: any) {
      console.error('Error fetching signal:', err);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/live-trader/market-status`);
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data);
      }
    } catch (err: any) {
      console.error('Error fetching connection status:', err);
    }
  };

  const fetchTradeHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/history`);
      if (response.ok) {
        const data = await response.json();
        // Filter and format trades
        const trades = (data.trades || []).filter((t: any) => t.profit !== 0 && Math.abs(t.profit) < 10000);
        // Sort by time_close descending
        trades.sort((a: any, b: any) => {
          const timeA = new Date(a.time_close || a.time).getTime();
          const timeB = new Date(b.time_close || b.time).getTime();
          return timeB - timeA;
        });
        setTradeHistory(trades.slice(0, 20)); // Last 20 trades
      }
    } catch (err: any) {
      console.error('Error fetching trade history:', err);
    }
  };

  const fetchCandles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/candles?symbol=${config.symbol}&timeframe=${config.timeframe}&count=50`);
      if (response.ok) {
        const data = await response.json();
        const formattedCandles = (data.candles || []).map((c: any) => ({
          time: c.time,
          open: parseFloat(c.open),
          high: parseFloat(c.high),
          low: parseFloat(c.low),
          close: parseFloat(c.close)
        }));
        setCandles(formattedCandles);
      }
    } catch (err: any) {
      console.error('Error fetching candles:', err);
    }
  };

  const closePosition = async (ticket: number) => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/close-position`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket })
      });
      if (response.ok) {
        addLog(`✅ Position ${ticket} closed`);
        fetchOpenPositions();
        fetchStats();
      } else {
        addLog(`❌ Failed to close position ${ticket}`);
      }
    } catch (err: any) {
      addLog(`❌ Error closing position: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-white/70">Loading Live Trader...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 md:p-6">
      <div className="w-full max-w-full mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-1 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Live Trader
            </h1>
            <p className="text-white/70 text-xs md:text-sm">Automated trading with MetaTrader 5</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="glass rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {isRunning ? 'Live Trading Active' : 'Stopped'}
                </h2>
                <p className="text-white/60 text-sm">
                  {isRunning ? 'Monitoring markets and placing trades' : 'Ready to start'}
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isRunning ? (
                <button
                  onClick={startTrading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center space-x-2"
                >
                  <Play className="w-5 h-5" />
                  <span>Start Trading</span>
                </button>
              ) : (
                <button
                  onClick={stopTrading}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-lg font-semibold hover:from-red-600 hover:to-rose-600 transition-all flex items-center space-x-2"
                >
                  <Square className="w-5 h-5" />
                  <span>Stop Trading</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/50 bg-red-500/10">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Connection Status & Price Display Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {/* Connection Status */}
          <div className="glass rounded-xl p-4 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Connection Status</span>
            </h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">MT5 Bridge</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus?.mt5_bridge_connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${connectionStatus?.mt5_bridge_connected ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionStatus?.mt5_bridge_connected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">MT5 EA</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus?.mt5_ea_running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${connectionStatus?.mt5_ea_running ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionStatus?.mt5_ea_running ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Market</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${connectionStatus?.market_open ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm ${connectionStatus?.market_open ? 'text-green-400' : 'text-red-400'}`}>
                    {connectionStatus?.market_open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Price Display */}
          <div className="glass rounded-xl p-4 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <DollarSign className="w-5 h-5" />
              <span>{config.symbol} Price</span>
            </h2>
            {currentPrice ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Bid</span>
                  <span className="text-xl font-bold text-red-400">{currentPrice.bid?.toFixed(5) || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Ask</span>
                  <span className="text-xl font-bold text-green-400">{currentPrice.ask?.toFixed(5) || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Spread</span>
                  <span className="text-sm text-white/80">
                    {currentPrice.ask && currentPrice.bid ? ((currentPrice.ask - currentPrice.bid) * 10000).toFixed(1) : 'N/A'} pips
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-white/60 text-center py-4">Loading price...</div>
            )}
          </div>
        </div>

        {/* Open Positions */}
        {openPositions.length > 0 && (
          <div className="glass rounded-xl p-4 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Open Positions ({openPositions.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-white/70">Ticket</th>
                    <th className="text-left py-2 text-white/70">Symbol</th>
                    <th className="text-left py-2 text-white/70">Type</th>
                    <th className="text-left py-2 text-white/70">Volume</th>
                    <th className="text-left py-2 text-white/70">Entry</th>
                    <th className="text-left py-2 text-white/70">Current</th>
                    <th className="text-left py-2 text-white/70">P&L</th>
                    <th className="text-left py-2 text-white/70">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((pos) => (
                    <tr key={pos.ticket} className="border-b border-white/5">
                      <td className="py-2 text-white/80">{pos.ticket}</td>
                      <td className="py-2 text-white/80">{pos.symbol}</td>
                      <td className={`py-2 font-semibold ${pos.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                        {pos.type}
                      </td>
                      <td className="py-2 text-white/80">{pos.volume}</td>
                      <td className="py-2 text-white/80">{pos.price_open.toFixed(5)}</td>
                      <td className="py-2 text-white/80">{pos.price_current.toFixed(5)}</td>
                      <td className={`py-2 font-semibold ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${pos.profit.toFixed(2)}
                      </td>
                      <td className="py-2">
                        <button
                          onClick={() => closePosition(pos.ticket)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Signal Preview */}
        {currentSignal && (
          <div className="glass rounded-xl p-4 border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Current Signal Preview</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-white/70 text-sm mb-1">Signal</div>
                <div className={`text-2xl font-bold ${currentSignal.signal === 'BUY' ? 'text-green-400' : currentSignal.signal === 'SELL' ? 'text-red-400' : 'text-white/60'}`}>
                  {currentSignal.signal || 'NEUTRAL'}
                </div>
                <div className="text-xs text-white/60 mt-1">Confidence: {currentSignal.confidence}%</div>
              </div>
              {currentSignal.tp_sl && (
                <div>
                  <div className="text-white/70 text-sm mb-1">Risk/Reward</div>
                  <div className="text-2xl font-bold text-white">
                    {currentSignal.risk_reward_ratio?.toFixed(2) || 'N/A'}
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    TP: {currentSignal.tp_sl.tp_pips} pips | SL: {currentSignal.tp_sl.sl_pips} pips
                  </div>
                </div>
              )}
              {currentSignal.entry_price && (
                <div>
                  <div className="text-white/70 text-sm mb-1">Entry Price</div>
                  <div className="text-2xl font-bold text-white">
                    ${currentSignal.entry_price.toFixed(5)}
                  </div>
                  {currentSignal.lot_size && (
                    <div className="text-xs text-white/60 mt-1">Lot Size: {currentSignal.lot_size.toFixed(2)}</div>
                  )}
                </div>
              )}
            </div>
            {currentSignal.reason && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-white/70 text-sm mb-1">Reason</div>
                <div className="text-white/80 text-sm">{currentSignal.reason}</div>
              </div>
            )}
            {currentSignal.analysis && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-white/70 text-sm mb-2">Technical Indicators</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {currentSignal.analysis.rsi && (
                    <div>
                      <span className="text-white/60">RSI: </span>
                      <span className="text-white">{currentSignal.analysis.rsi.toFixed(2)}</span>
                    </div>
                  )}
                  {currentSignal.analysis.sma_trend && (
                    <div>
                      <span className="text-white/60">SMA: </span>
                      <span className="text-white">{currentSignal.analysis.sma_trend}</span>
                    </div>
                  )}
                  {currentSignal.analysis.macd_signal && (
                    <div>
                      <span className="text-white/60">MACD: </span>
                      <span className="text-white">{currentSignal.analysis.macd_signal}</span>
                    </div>
                  )}
                  {currentSignal.analysis.support && (
                    <div>
                      <span className="text-white/60">Support: </span>
                      <span className="text-white">${currentSignal.analysis.support.toFixed(2)}</span>
                    </div>
                  )}
                  {currentSignal.analysis.resistance && (
                    <div>
                      <span className="text-white/60">Resistance: </span>
                      <span className="text-white">${currentSignal.analysis.resistance.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Configuration */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="flex items-center space-x-2 mb-6">
                <Settings className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-semibold text-white">Configuration</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Config Type</label>
                  <select
                    value={config.config_type}
                    onChange={(e) => setConfig({ ...config, config_type: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    disabled={isRunning}
                  >
                    <option value="conservative">Conservative (2% risk)</option>
                    <option value="moderate">Moderate (5% risk)</option>
                    <option value="aggressive">Aggressive (50% risk)</option>
                    <option value="default">Default (5% risk)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Timeframe</label>
                  <select
                    value={config.timeframe}
                    onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    disabled={isRunning}
                  >
                    <option value="M1">M1 (1 Minute)</option>
                    <option value="M5">M5 (5 Minutes) - Recommended</option>
                    <option value="M15">M15 (15 Minutes)</option>
                    <option value="H1">H1 (1 Hour)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={config.symbol}
                    onChange={(e) => setConfig({ ...config, symbol: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Risk per Trade: {config.risk_per_trade_percent}%
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={config.risk_per_trade_percent}
                    onChange={(e) => setConfig({ ...config, risk_per_trade_percent: parseFloat(e.target.value) })}
                    className="w-full"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Confidence Threshold: {config.confidence_threshold}%
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    step="5"
                    value={config.confidence_threshold}
                    onChange={(e) => setConfig({ ...config, confidence_threshold: parseInt(e.target.value) })}
                    className="w-full"
                    disabled={isRunning}
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Max Trades per Day: {config.max_trades_per_day}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={config.max_trades_per_day}
                    onChange={(e) => setConfig({ ...config, max_trades_per_day: parseInt(e.target.value) })}
                    className="w-full"
                    disabled={isRunning}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-xl p-4 border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-4">Trading Statistics</h2>
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Trades Today</div>
                    <div className="text-2xl font-bold text-white">{stats.trades_today}/{config.max_trades_per_day}</div>
                  </div>
                  <div className={`bg-white/5 rounded-lg p-4 ${stats.total_pnl >= 0 ? 'border border-green-500/50' : 'border border-red-500/50'}`}>
                    <div className="text-white/60 text-sm mb-1">Daily P&L</div>
                    <div className={`text-2xl font-bold ${stats.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${stats.total_pnl.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/60">{stats.daily_pnl_percent.toFixed(2)}%</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Win Rate</div>
                    <div className="text-2xl font-bold text-white">{stats.win_rate.toFixed(1)}%</div>
                    <div className="text-xs text-white/60">{stats.winning_trades}W / {stats.losing_trades}L</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-white/60 text-sm mb-1">Balance</div>
                    <div className="text-2xl font-bold text-white">${stats.current_balance.toFixed(2)}</div>
                    <div className="text-xs text-white/60">Start: ${stats.starting_balance.toFixed(2)}</div>
                  </div>
                </div>
              ) : (
                <div className="text-white/60 text-center py-8">No statistics available</div>
              )}
            </div>

            {/* Risk Metrics */}
            {stats && (stats.max_drawdown !== undefined || stats.margin_used !== undefined) && (
              <div className="glass rounded-xl p-4 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Risk Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {stats.max_drawdown !== undefined && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Max Drawdown</div>
                      <div className="text-xl font-bold text-red-400">${stats.max_drawdown.toFixed(2)}</div>
                      <div className="text-xs text-white/60">{stats.drawdown_percent?.toFixed(2) || 0}%</div>
                    </div>
                  )}
                  {stats.current_drawdown !== undefined && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Current Drawdown</div>
                      <div className={`text-xl font-bold ${stats.current_drawdown > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        ${stats.current_drawdown.toFixed(2)}
                      </div>
                      <div className="text-xs text-white/60">{stats.drawdown_percent?.toFixed(2) || 0}%</div>
                    </div>
                  )}
                  {stats.margin_used !== undefined && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Margin Used</div>
                      <div className="text-xl font-bold text-white">${stats.margin_used.toFixed(2)}</div>
                      <div className="text-xs text-white/60">Level: {stats.margin_level?.toFixed(1) || 0}%</div>
                    </div>
                  )}
                  {stats.free_margin !== undefined && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Free Margin</div>
                      <div className="text-xl font-bold text-green-400">${stats.free_margin.toFixed(2)}</div>
                    </div>
                  )}
                  {stats.total_exposure !== undefined && (
                    <div className="bg-white/5 rounded-lg p-4">
                      <div className="text-white/60 text-sm mb-1">Total Exposure</div>
                      <div className="text-xl font-bold text-white">${stats.total_exposure.toFixed(2)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Performance Chart */}
            {stats && (
              <div className="glass rounded-xl p-4 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Performance</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { time: 'Start', equity: stats.starting_balance, pnl: 0 },
                      { time: 'Now', equity: stats.equity || stats.current_balance, pnl: stats.total_pnl }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="time" stroke="#ffffff60" />
                      <YAxis stroke="#ffffff60" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                        labelStyle={{ color: '#ffffff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        dot={{ fill: '#8b5cf6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Price Chart */}
            {candles.length > 0 && (
              <div className="glass rounded-xl p-4 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">{config.symbol} Chart ({config.timeframe})</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={candles.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#ffffff60"
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                        }}
                      />
                      <YAxis stroke="#ffffff60" domain={['dataMin', 'dataMax']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #ffffff20', borderRadius: '8px' }}
                        labelStyle={{ color: '#ffffff' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Trade History */}
            {tradeHistory.length > 0 && (
              <div className="glass rounded-xl p-4 border border-white/10">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Trade History</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-white/70">Time</th>
                        <th className="text-left py-2 text-white/70">Symbol</th>
                        <th className="text-left py-2 text-white/70">Type</th>
                        <th className="text-left py-2 text-white/70">Volume</th>
                        <th className="text-left py-2 text-white/70">Entry</th>
                        <th className="text-left py-2 text-white/70">Exit</th>
                        <th className="text-left py-2 text-white/70">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tradeHistory.map((trade, index) => (
                        <tr key={index} className="border-b border-white/5">
                          <td className="py-2 text-white/80 text-xs">
                            {new Date(trade.time_close || trade.time_open).toLocaleTimeString()}
                          </td>
                          <td className="py-2 text-white/80">{trade.symbol}</td>
                          <td className={`py-2 font-semibold ${trade.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                            {trade.type}
                          </td>
                          <td className="py-2 text-white/80">{trade.volume}</td>
                          <td className="py-2 text-white/80">{trade.price_open?.toFixed(5) || 'N/A'}</td>
                          <td className="py-2 text-white/80">{trade.price_close?.toFixed(5) || 'N/A'}</td>
                          <td className={`py-2 font-semibold ${trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${trade.profit?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MT5 Live Logs */}
            <div className="glass rounded-xl p-4 border border-white/10 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">MT5 Live Logs</h2>
                <span className="text-xs text-white/60">{mt5Logs.length} entries</span>
              </div>
              <div className="bg-black/30 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs">
                {mt5Logs.length > 0 ? (
                  <div className="space-y-1">
                    {mt5Logs
                      .slice()
                      .reverse()
                      .filter((log) => {
                        // Filter out empty messages, null characters, and whitespace-only messages
                        if (!log.message) return false;
                        const cleaned = log.message.replace(/\u0000/g, '').replace(/\x00/g, '').trim();
                        return cleaned.length > 0;
                      })
                      .map((log, index) => {
                        // Clean message from null characters
                        const message = log.message.replace(/\u0000/g, '').replace(/\x00/g, '').trim();
                        
                        // Detect log levels and types for color coding
                        const isError = message.includes('FAILED') || message.includes('Error') || message.includes('error') || 
                                       message.includes('❌') || message.includes('Cannot') || message.includes('Invalid');
                        const isSuccess = message.includes('SUCCESS') || message.includes('Success') || 
                                         message.includes('✅') || message.includes('succeeded') || 
                                         message.includes('placed') || message.includes('closed') ||
                                         message.includes('BUY:') || message.includes('SELL:');
                        const isWarning = message.includes('WARNING') || message.includes('Warning') || 
                                         message.includes('⚠️') || message.includes('Failed');
                        const isInfo = message.includes('Processing') || message.includes('Received') || 
                                      message.includes('Sending') || message.includes('Response');
                        
                        // Format like platform logs: [timestamp] message
                        const formattedMessage = log.timestamp && log.timestamp.trim()
                          ? `[${log.timestamp.trim()}] ${message}`
                          : message;
                        
                        // Determine color based on log type
                        let textColor = 'text-white/80';
                        if (isError) textColor = 'text-red-400';
                        else if (isSuccess) textColor = 'text-green-400';
                        else if (isWarning) textColor = 'text-yellow-400';
                        else if (isInfo) textColor = 'text-blue-400';
                        
                        return (
                          <div 
                            key={index} 
                            className={`break-words border-b border-white/5 pb-1 ${textColor}`}
                          >
                            {formattedMessage}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="text-white/60 text-center py-8">No MT5 logs yet</div>
                )}
              </div>
            </div>

            {/* Platform Logs */}
            <div className="glass rounded-xl p-4 border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-white">Platform Logs</h2>
                <span className="text-xs text-white/60">{platformLogs.length} entries</span>
              </div>
              <div className="bg-black/30 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs">
                {platformLogs.length > 0 ? (
                  <div className="space-y-1">
                    {platformLogs.slice().reverse().map((log, index) => {
                      const message = log.message;
                      const isError = message.includes('ERROR') || message.includes('❌') || message.includes('FAILED');
                      const isSuccess = message.includes('SUCCESS') || message.includes('✅') || message.includes('PLACED') || message.includes('APPROVED');
                      const isWarning = message.includes('WARNING') || message.includes('⚠️') || message.includes('REJECTED');
                      
                      return (
                        <div 
                          key={index} 
                          className={`break-words border-b border-white/5 pb-1 ${
                            isError ? 'text-red-400' : 
                            isSuccess ? 'text-green-400' : 
                            isWarning ? 'text-yellow-400' : 
                            'text-white/80'
                          }`}
                        >
                          {message}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-white/60 text-center py-8">No platform logs yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right">
          <div className={`glass rounded-xl p-4 border-2 shadow-2xl min-w-[320px] max-w-[400px] ${
            notification.signal === 'BUY' 
              ? 'border-green-500/50 bg-green-500/10' 
              : notification.signal === 'SELL'
              ? 'border-red-500/50 bg-red-500/10'
              : 'border-white/20'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  notification.signal === 'BUY' 
                    ? 'bg-green-500 animate-pulse' 
                    : notification.signal === 'SELL'
                    ? 'bg-red-500 animate-pulse'
                    : 'bg-white/60'
                }`}></div>
                <h3 className={`text-lg font-bold ${
                  notification.signal === 'BUY' 
                    ? 'text-green-400' 
                    : notification.signal === 'SELL'
                    ? 'text-red-400'
                    : 'text-white'
                }`}>
                  {notification.signal} Signal
                </h3>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Confidence</span>
                <span className={`text-lg font-semibold ${
                  notification.confidence >= 70 
                    ? 'text-green-400' 
                    : notification.confidence >= 50
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {notification.confidence}%
                </span>
              </div>
              {notification.reason && (
                <div className="pt-2 border-t border-white/10">
                  <p className="text-white/80 text-sm">{notification.reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
