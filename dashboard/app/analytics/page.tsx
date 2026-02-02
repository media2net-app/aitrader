'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, TrendingUp, Target, Activity, DollarSign } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface TradeStats {
  total_trades?: number;
  win_rate?: number;
  total_pnl?: number;
  avg_return?: number;
}

interface Trade {
  symbol?: string;
  type?: string;
  profit?: number;
  pnl?: number;
  volume?: number;
  price?: number;
  time?: string;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tradesRes] = await Promise.all([
        fetch(`${API_URL}/api/stats`),
        fetch(`${API_URL}/api/trades?limit=100`)
      ]);
      const statsData = await statsRes.json();
      const tradesData = await tradesRes.json();
      setStats(statsData);
      setTrades(tradesData.trades || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const calculateMetrics = () => {
    if (trades.length === 0) return null;

    const winningTrades = trades.filter(t => (t.pnl || t.profit || 0) > 0);
    const losingTrades = trades.filter(t => (t.pnl || t.profit || 0) < 0);
    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || t.profit || 0), 0);
    const avgWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => sum + (t.pnl || t.profit || 0), 0) / winningTrades.length 
      : 0;
    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + Math.abs(t.pnl || t.profit || 0), 0) / losingTrades.length
      : 0;
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
    const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 0;

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalPnl,
      avgWin,
      avgLoss,
      winRate,
      profitFactor,
    };
  };

  const metrics = calculateMetrics();

  return (
    <div className="min-h-screen  text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Analytics
            </h1>
          </div>
          <p className="text-gray-400">
            Deep insights into your trading performance
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : metrics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Target className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Win Rate</h2>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {metrics.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400">
                  {metrics.winningTrades} wins / {metrics.losingTrades} losses
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <DollarSign className="w-6 h-6 text-green-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Total P&L</h2>
                </div>
                <div className={`text-3xl font-bold mb-2 ${
                  metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metrics.totalPnl >= 0 ? '+' : ''}${metrics.totalPnl.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  {metrics.totalTrades} total trades
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Avg Win</h2>
                </div>
                <div className="text-3xl font-bold text-green-400 mb-2">
                  ${metrics.avgWin.toFixed(0)}
                </div>
                <div className="text-sm text-gray-400">
                  Average winning trade
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <Activity className="w-6 h-6 text-red-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Profit Factor</h2>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {metrics.profitFactor.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400">
                  Win/Loss ratio
                </div>
              </div>
            </div>

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Trade Statistics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Trades</span>
                    <span className="text-white font-semibold">{metrics.totalTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Winning Trades</span>
                    <span className="text-green-400 font-semibold">{metrics.winningTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Losing Trades</span>
                    <span className="text-red-400 font-semibold">{metrics.losingTrades}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Average Win</span>
                    <span className="text-green-400 font-semibold">${metrics.avgWin.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Average Loss</span>
                    <span className="text-red-400 font-semibold">${metrics.avgLoss.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Performance Metrics</h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Win Rate</span>
                    <span className="text-white font-semibold">{metrics.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Profit Factor</span>
                    <span className="text-white font-semibold">{metrics.profitFactor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total P&L</span>
                    <span className={`font-semibold ${
                      metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${metrics.totalPnl.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Risk/Reward</span>
                    <span className="text-white font-semibold">
                      {metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(2) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass rounded-xl p-12 text-center">
            <p className="text-gray-400">No trading data available yet. Start trading to see analytics!</p>
          </div>
        )}
      </div>
    </div>
  );
}
