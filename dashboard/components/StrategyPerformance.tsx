'use client';

import { useState, useEffect } from 'react';
import { Target, TrendingUp, Activity } from 'lucide-react';

interface StrategyPerformanceProps {
  apiUrl: string;
}

export default function StrategyPerformance({ apiUrl }: StrategyPerformanceProps) {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/strategies`);
      const data = await response.json();
      setStrategies(data.strategies || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching strategies:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sampleStrategies = strategies.length > 0 ? strategies : [
    { id: 1, name: 'Momentum Breakout', winRate: 65, totalTrades: 120, pnl: 12500, status: 'active' },
    { id: 2, name: 'Mean Reversion', winRate: 58, totalTrades: 85, pnl: 8500, status: 'active' },
  ];

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <Target className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Strategy Performance</h2>
      </div>

      <div className="space-y-4">
        {sampleStrategies.map((strategy) => (
          <div key={strategy.id} className="p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-white">{strategy.name}</div>
              <div className={`px-2 py-1 rounded text-xs ${
                strategy.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {strategy.status}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-1">Win Rate</div>
                <div className="text-lg font-semibold text-white">{strategy.winRate}%</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Trades</div>
                <div className="text-lg font-semibold text-white">{strategy.totalTrades}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">P&L</div>
                <div className={`text-lg font-semibold ${
                  strategy.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  ${strategy.pnl.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
