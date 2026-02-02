'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, Server, Database, Zap, TrendingUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function SystemStatusPage() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemInfo();
    const interval = setInterval(() => {
      fetchSystemInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      const data = await response.json();
      setSystemInfo(data);
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setLoading(false);
    }
  };

  const capabilities = [
    {
      name: 'AI Trading Engine',
      status: 'available',
      description: 'Automated trading with AI-powered signals',
      features: [
        'Real-time market analysis',
        'Pattern recognition',
        'Risk management',
        'Automated order execution',
        'Multi-strategy support',
      ]
    },
    {
      name: 'Backtesting',
      status: 'available',
      description: 'Test strategies on historical data',
      features: [
        'Historical data replay',
        'Performance metrics',
        'Strategy optimization',
        'Walk-forward analysis',
      ]
    },
    {
      name: 'Portfolio Management',
      status: 'available',
      description: 'Manage positions and risk',
      features: [
        'Position tracking',
        'Risk calculations',
        'Portfolio rebalancing',
        'Performance monitoring',
      ]
    },
    {
      name: 'Data Management',
      status: 'available',
      description: 'Store and manage trading data',
      features: [
        'Automatic trade logging',
        'Transaction history',
        'Statistics tracking',
        'JSON database storage',
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-6xl relative z-10">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              System Status
            </h1>
          </div>
          <p className="text-gray-400">
            Complete overview of trading system capabilities and current status
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* API Server Status */}
          <div className="glass glass-hover rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Server className="w-6 h-6 text-blue-400" />
              <h2 className="text-xl font-bold text-white">API Server</h2>
            </div>
            {loading ? (
              <div className="animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
              </div>
            ) : systemInfo ? (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-sm text-gray-300">Status: {systemInfo.status}</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {systemInfo.timestamp && new Date(systemInfo.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm text-red-400">Unable to connect</span>
              </div>
            )}
          </div>

          {/* Trading Engine Status */}
          <div className="glass glass-hover rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-green-400" />
              <h2 className="text-xl font-bold text-white">Trading Engine</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">Status: Active</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Monitoring markets in real-time
              </div>
            </div>
          </div>

          {/* Database Status */}
          <div className="glass glass-hover rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Database className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-bold text-white">Database</h2>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">Storage: JSON File</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-300">Auto-save: Enabled</span>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Location: trading_data.json
              </div>
            </div>
          </div>
        </div>

        {/* System Capabilities */}
        <div className="glass glass-hover rounded-xl p-6 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <Zap className="w-6 h-6 text-yellow-400" />
            <h2 className="text-2xl font-bold text-white">System Capabilities</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {capabilities.map((capability, index) => (
              <div
                key={index}
                className="glass rounded-lg p-5 hover:bg-white/8 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {capability.status === 'available' ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <h3 className="text-lg font-semibold text-white">
                      {capability.name}
                    </h3>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mb-3">
                  {capability.description}
                </p>
                <ul className="space-y-1.5">
                  {capability.features.map((feature, idx) => (
                    <li key={idx} className="text-xs text-gray-400 flex items-start">
                      <span className="text-purple-400 mr-2">•</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
