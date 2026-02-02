'use client';

import { useState, useEffect } from 'react';
import { PieChart, TrendingUp, DollarSign } from 'lucide-react';

interface PortfolioProps {
  apiUrl: string;
}

export default function Portfolio({ apiUrl }: PortfolioProps) {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/portfolio`);
      const data = await response.json();
      setPortfolio(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-white/10 rounded w-1/3 mb-4"></div>
          <div className="h-32 bg-white/10 rounded"></div>
        </div>
      </div>
    );
  }

  const positions = portfolio?.positions || [
    { symbol: 'BTC/USD', amount: 0.5, value: 25000, change: 2.5 },
    { symbol: 'ETH/USD', amount: 5, value: 15000, change: -1.2 },
    { symbol: 'AAPL', amount: 100, value: 18000, change: 0.8 },
  ];

  const totalValue = positions.reduce((sum: number, pos: any) => sum + pos.value, 0);

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <PieChart className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Portfolio</h2>
      </div>

      <div className="mb-6">
        <div className="text-3xl font-bold text-white mb-1">
          ${totalValue.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">Total Portfolio Value</div>
      </div>

      <div className="space-y-3">
        {positions.map((position: any, index: number) => (
          <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <div className="flex-1">
              <div className="font-semibold text-white">{position.symbol}</div>
              <div className="text-sm text-gray-400">
                {position.amount} {position.symbol.split('/')[0]}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-white">
                ${position.value.toLocaleString()}
              </div>
              <div className={`text-sm ${
                position.change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {position.change >= 0 ? '+' : ''}{position.change}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
