'use client';

import { useState, useEffect } from 'react';
import { PieChart, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`${API_URL}/api/portfolio`);
      const data = await response.json();
      setPortfolio(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setLoading(false);
    }
  };

  const samplePositions = [
    { symbol: 'BTC/USD', amount: 0.5, value: 25000, change: 2.5, entryPrice: 48000 },
    { symbol: 'ETH/USD', amount: 5, value: 15000, change: -1.2, entryPrice: 3100 },
    { symbol: 'AAPL', amount: 100, value: 18000, change: 0.8, entryPrice: 175 },
    { symbol: 'TSLA', amount: 50, value: 12000, change: 3.2, entryPrice: 220 },
    { symbol: 'GOOGL', amount: 30, value: 4500, change: -0.5, entryPrice: 150 },
  ];

  const positions = portfolio?.positions || samplePositions;
  const totalValue = positions.reduce((sum: number, pos: any) => sum + pos.value, 0);
  const totalChange = positions.reduce((sum: number, pos: any) => sum + (pos.value * pos.change / 100), 0);
  const totalChangePercent = totalValue > 0 ? (totalChange / (totalValue - totalChange)) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <PieChart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Portfolio
            </h1>
          </div>
          <p className="text-gray-400">
            Manage and monitor your trading positions
          </p>
        </header>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        ) : (
          <>
            {/* Portfolio Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <DollarSign className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Total Value</h2>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  ${totalValue.toLocaleString()}
                </div>
                <div className={`text-sm flex items-center ${
                  totalChangePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {totalChangePercent >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                  )}
                  {totalChangePercent >= 0 ? '+' : ''}{totalChangePercent.toFixed(2)}%
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Total P&L</h2>
                </div>
                <div className={`text-3xl font-bold mb-2 ${
                  totalChange >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {totalChange >= 0 ? '+' : ''}${totalChange.toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">
                  Unrealized gains/losses
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <PieChart className="w-6 h-6 text-purple-400" />
                  <h2 className="text-lg font-semibold text-gray-400">Positions</h2>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {positions.length}
                </div>
                <div className="text-sm text-gray-400">
                  Active positions
                </div>
              </div>
            </div>

            {/* Positions List */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Open Positions</h2>
              <div className="space-y-3">
                {positions.map((position: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`p-2 rounded-lg ${
                        position.change >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {position.change >= 0 ? (
                          <ArrowUpRight className="w-5 h-5 text-green-400" />
                        ) : (
                          <ArrowDownRight className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-lg">{position.symbol}</div>
                        <div className="text-sm text-gray-400">
                          {position.amount} {position.symbol.split('/')[0]} @ ${position.entryPrice?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-white text-lg">
                        ${position.value.toLocaleString()}
                      </div>
                      <div className={`text-sm flex items-center justify-end ${
                        position.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {position.change >= 0 ? (
                          <ArrowUpRight className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 mr-1" />
                        )}
                        {position.change >= 0 ? '+' : ''}{position.change}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
