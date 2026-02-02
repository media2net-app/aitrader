'use client';

import { TrendingUp, DollarSign, Target, Activity, BarChart3 } from 'lucide-react';

interface StatisticsProps {
  stats: any;
}

export default function Statistics({ stats }: StatisticsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass rounded-xl p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-white/10 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-white/10 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Trades',
      value: stats.total_trades || stats.closed_trades || 0,
      icon: Activity,
      gradient: 'from-indigo-500 to-purple-500',
      subtitle: stats.open_positions ? `${stats.open_positions} open` : undefined,
    },
    {
      title: 'Win Rate',
      value: stats.win_rate || 0,
      icon: Target,
      gradient: 'from-purple-500 to-pink-500',
      suffix: '%',
      subtitle: stats.winning_trades ? `${stats.winning_trades}W / ${stats.losing_trades || 0}L` : undefined,
    },
    {
      title: 'Total P&L',
      value: stats.total_pnl || stats.profit || 0,
      icon: DollarSign,
      gradient: 'from-pink-500 to-rose-500',
      prefix: '$',
      isPositive: (stats.total_pnl || stats.profit || 0) >= 0,
      subtitle: stats.open_pnl !== undefined ? `Open: $${stats.open_pnl?.toFixed(2) || 0}` : undefined,
    },
    {
      title: 'Equity',
      value: stats.equity || stats.balance || 0,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-indigo-500',
      prefix: '$',
      subtitle: stats.balance ? `Balance: $${stats.balance.toLocaleString()}` : undefined,
    },
    {
      title: 'Profit Today',
      value: stats.profit || stats.closed_pnl || 0,
      icon: BarChart3,
      gradient: 'from-indigo-500 via-purple-500 to-pink-500',
      prefix: '$',
      isPositive: (stats.profit || stats.closed_pnl || 0) >= 0,
      subtitle: stats.source === 'MT5' ? 'Live MT5' : 'Local',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        const displayValue = stat.prefix 
          ? `${stat.prefix}${stat.value.toLocaleString()}${stat.suffix || ''}`
          : `${stat.value.toLocaleString()}${stat.suffix || ''}`;
        
        return (
          <div
            key={index}
            className="glass glass-hover rounded-xl p-6 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg bg-gradient-to-br ${stat.gradient} shadow-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-400 mb-2 group-hover:text-white transition-colors">
              {stat.title}
            </h3>
            <p className={`text-3xl font-bold ${
              stat.isPositive !== undefined 
                ? stat.isPositive ? 'text-green-400' : 'text-red-400'
                : 'text-white'
            }`}>
              {displayValue}
            </p>
            {stat.subtitle && (
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
