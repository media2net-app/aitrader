'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Calendar, Filter, Search, Download } from 'lucide-react';

interface TradeJournalProps {
  apiUrl: string;
}

export default function TradeJournal({ apiUrl }: TradeJournalProps) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/trades?limit=50`);
      const data = await response.json();
      setTrades(data.trades || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setLoading(false);
    }
  };

  const sampleTrades = [
    {
      id: 1,
      symbol: 'BTC/USD',
      type: 'LONG',
      entry: 50000,
      exit: 51200,
      quantity: 0.5,
      pnl: 600,
      pnlPercent: 2.4,
      date: new Date(),
      strategy: 'Momentum Breakout',
      notes: 'Strong breakout above resistance',
    },
    {
      id: 2,
      symbol: 'ETH/USD',
      type: 'SHORT',
      entry: 3100,
      exit: 3050,
      quantity: 2,
      pnl: 100,
      pnlPercent: 1.6,
      date: new Date(Date.now() - 86400000),
      strategy: 'Mean Reversion',
      notes: 'Reversal at key support level',
    },
    {
      id: 3,
      symbol: 'AAPL',
      type: 'LONG',
      entry: 180,
      exit: 185,
      quantity: 10,
      pnl: 50,
      pnlPercent: 2.8,
      date: new Date(Date.now() - 172800000),
      strategy: 'AI Pattern Recognition',
      notes: 'AI detected bullish pattern',
    },
  ];

  const displayTrades = trades.length > 0 ? trades : sampleTrades;

  const filteredTrades = filter === 'all' 
    ? displayTrades 
    : displayTrades.filter(t => t.type === filter.toUpperCase());

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Trade Journal</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'all' ? 'bg-indigo-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('long')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'long' ? 'bg-green-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setFilter('short')}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                filter === 'short' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Short
            </button>
          </div>
          <button className="p-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Symbol</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Entry</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Exit</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Quantity</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">P&L</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Strategy</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4 text-sm text-gray-300">
                    {new Date(trade.date || trade.timestamp).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-semibold text-white">{trade.symbol}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      trade.type === 'LONG' || trade.type === 'BUY'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-300">${trade.entry?.toLocaleString() || trade.price?.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm text-gray-300">${trade.exit?.toLocaleString() || 'N/A'}</td>
                  <td className="py-3 px-4 text-sm text-gray-300">{trade.quantity || trade.amount}</td>
                  <td className={`py-3 px-4 font-semibold ${
                    (trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(trade.pnl || 0) >= 0 ? '+' : ''}${(trade.pnl || 0).toLocaleString()}
                    {trade.pnlPercent && (
                      <span className="text-xs ml-1">({trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent}%)</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-400">{trade.strategy || 'Manual'}</td>
                  <td className="py-3 px-4 text-sm text-gray-400 max-w-xs truncate">{trade.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
