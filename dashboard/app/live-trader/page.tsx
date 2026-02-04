'use client';

import { useState, useEffect } from 'react';
import { Play, Square, Settings, TrendingUp, TrendingDown, DollarSign, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

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
}

export default function LiveTraderPage() {
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
    
    if (isRunning) {
      const interval = setInterval(() => {
        fetchStats();
        fetchMt5Logs();
        fetchPlatformLogs();
      }, 3000); // Update every 3 seconds
      return () => clearInterval(interval);
    } else {
      // Still fetch logs even when not running
      const interval = setInterval(() => {
        fetchMt5Logs();
        fetchPlatformLogs();
      }, 5000); // Update every 5 seconds when not running
      return () => clearInterval(interval);
    }
  }, [isRunning]);

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
    </div>
  );
}
