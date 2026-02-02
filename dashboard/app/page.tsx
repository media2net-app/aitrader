'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, DollarSign, Activity,
  Target, PieChart, BookOpen, FileText,
  ArrowUpRight, ArrowDownRight, Calendar, Filter,
  Play, RefreshCw, Download, Settings
} from 'lucide-react';
import Statistics from '@/components/Statistics';
import Portfolio from '@/components/Portfolio';
import RecentTrades from '@/components/RecentTrades';
import StrategyPerformance from '@/components/StrategyPerformance';
import TradeJournal from '@/components/TradeJournal';
import PerformanceChart from '@/components/PerformanceChart';
import TradingCalendar from '@/components/TradingCalendar';
import MT5AccountInfo from '@/components/MT5AccountInfo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function Home() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastDataHash, setLastDataHash] = useState<string>('');

  // Helper to create a hash of the data for comparison
  const createDataHash = (data: any): string => {
    if (!data) return '';
    // Create a simple hash from key data points
    const keyData = {
      balance: data.balance,
      equity: data.equity,
      total_trades: data.total_trades,
      total_pnl: data.total_pnl,
      win_rate: data.win_rate,
      open_positions: data.open_positions,
    };
    return JSON.stringify(keyData);
  };

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`);
      const data = await response.json();
      
      // Only update state if data has actually changed
      const newHash = createDataHash(data);
      if (newHash !== lastDataHash) {
        setStats(data);
        setLastDataHash(newHash);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen  text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Dashboard Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Trading Dashboard
              </h1>
              <p className="text-gray-400">Welcome back! Here's your trading overview</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors flex items-center space-x-2">
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </button>
                  <button 
                    onClick={fetchStats}
                    disabled={loading}
                    className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors flex items-center space-x-2 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
              <button className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors flex items-center space-x-2">
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* MT5 Account Info */}
            <div className="mb-6">
              <MT5AccountInfo apiUrl={API_URL} />
            </div>

            {/* Key Statistics */}
            <Statistics stats={stats} />

            {/* Performance Chart */}
            <div className="mt-6">
              <PerformanceChart apiUrl={API_URL} />
            </div>

            {/* Trading Calendar */}
            <div className="mt-6">
              <TradingCalendar apiUrl={API_URL} />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              {/* Left Column - Portfolio & Strategies */}
              <div className="lg:col-span-2 space-y-6">
                <Portfolio apiUrl={API_URL} />
                <StrategyPerformance apiUrl={API_URL} />
              </div>

              {/* Right Column - Recent Activity */}
              <div className="space-y-6">
                <RecentTrades apiUrl={API_URL} />
                
                {/* Quick Actions */}
                <div className="glass glass-hover rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors flex items-center justify-center space-x-2">
                      <Play className="w-4 h-4" />
                      <span>Start New Trade</span>
                    </button>
                    <button className="w-full px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center space-x-2">
                      <BookOpen className="w-4 h-4" />
                      <span>View Journal</span>
                    </button>
                    <button className="w-full px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Run Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade Journal Section */}
            <div className="mt-6">
              <TradeJournal apiUrl={API_URL} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
