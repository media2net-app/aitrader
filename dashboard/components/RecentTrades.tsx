'use client';

import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface RecentTradesProps {
  apiUrl: string;
}

export default function RecentTrades({ apiUrl }: RecentTradesProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/trades`);
      const data = await response.json();
      setTrades(data.trades || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const sampleTrades = trades.length > 0 ? trades : [
    { id: 1, symbol: 'BTC/USD', type: 'BUY', amount: 0.5, price: 50000, pnl: 250, timestamp: new Date() },
    { id: 2, symbol: 'ETH/USD', type: 'SELL', amount: 2, price: 3000, pnl: -50, timestamp: new Date() },
    { id: 3, symbol: 'AAPL', type: 'BUY', amount: 10, price: 180, pnl: 180, timestamp: new Date() },
  ];

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Recent Trades</h2>
      </div>

      <div className="space-y-3">
        {sampleTrades.map((trade) => (
          <div key={trade.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
            <div className="flex items-center space-x-4 flex-1">
              {trade.type === 'BUY' ? (
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-400" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-white">{trade.symbol}</div>
                <div className="text-sm text-gray-400">
                  {trade.type} • {trade.amount} @ ${trade.price.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold ${
                trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toLocaleString()}
              </div>
              <div className="text-xs text-gray-400">
                {new Date(trade.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
