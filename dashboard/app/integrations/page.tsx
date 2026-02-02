'use client';

import Link from 'next/link';
import { Link2, CheckCircle, ArrowRight } from 'lucide-react';

export default function IntegrationsPage() {
  const integrations = [
    {
      name: 'MetaTrader 5',
      description: 'Automatically sync and log every trade from MT5',
      status: 'active',
      methods: ['File Upload', 'Auto Sync', 'Manual'],
      support: ['Stocks', 'Options', 'Forex', 'Futures', 'Crypto'],
      path: '/integrations/metatrader-5',
      icon: '📈',
    },
    {
      name: 'MetaTrader 4',
      description: 'Sync your MT4 trading account automatically',
      status: 'active',
      methods: ['File Upload', 'Auto Sync', 'Manual'],
      support: ['Forex', 'CFDs'],
      path: '/integrations/metatrader-4',
      icon: '📊',
    },
    {
      name: 'Bybit',
      description: 'Connect your Bybit exchange account',
      status: 'coming-soon',
      methods: ['Auto Sync'],
      support: ['Crypto'],
      path: '#',
      icon: '₿',
    },
    {
      name: 'Interactive Brokers',
      description: 'Sync trades from Interactive Brokers',
      status: 'coming-soon',
      methods: ['File Upload', 'Auto Sync'],
      support: ['Stocks', 'Options', 'Forex', 'Futures'],
      path: '#',
      icon: '💼',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Link2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Integrations
            </h1>
          </div>
          <p className="text-gray-400">
            Connect your trading platforms and automatically sync your trades
          </p>
        </header>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration, index) => (
            <Link
              key={index}
              href={integration.path}
              className={`glass glass-hover rounded-xl p-6 block ${
                integration.status === 'coming-soon' ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{integration.icon}</div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{integration.name}</h3>
                    <p className="text-sm text-gray-400">{integration.description}</p>
                  </div>
                </div>
                {integration.status === 'active' ? (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                    Active
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-gray-500/20 text-gray-400 rounded text-xs font-semibold">
                    Coming Soon
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Methods</div>
                  <div className="flex flex-wrap gap-2">
                    {integration.methods.map((method, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-white/5 rounded text-xs text-gray-300"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Support</div>
                  <div className="flex flex-wrap gap-2">
                    {integration.support.map((item, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {integration.status === 'active' && (
                <div className="mt-4 flex items-center text-indigo-400 text-sm font-medium">
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              )}
            </Link>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-8 glass rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">About Integrations</h3>
          <p className="text-gray-400 mb-4">
            Connect your trading platforms to automatically sync and journal your trades. 
            This eliminates manual data entry and ensures accurate trade tracking.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white mb-1">Automatic Sync</h4>
                <p className="text-sm text-gray-400">
                  Trades are automatically imported and logged
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white mb-1">Real-time Updates</h4>
                <p className="text-sm text-gray-400">
                  Your dashboard updates as you trade
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-white mb-1">Secure Connection</h4>
                <p className="text-sm text-gray-400">
                  Your credentials are encrypted and secure
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
