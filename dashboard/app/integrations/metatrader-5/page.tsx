'use client';

import { useState, useEffect } from 'react';
import { Link2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export default function MetaTrader5Page() {
  const [formData, setFormData] = useState({
    login: '102199055',
    password: 'E_HcZ3Zn',
    server: 'MetaQuotes-Demo',
    broker: 'MetaQuotes',
  });

  // Form data is pre-filled with default values
  // User can edit these values before connecting
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    error?: string;
    account?: {
      login?: number;
      balance?: number;
      currency?: string;
      server?: string;
    };
  } | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      
      // Connect to MT5
      const connectResponse = await fetch(`${API_URL}/api/mt5/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login: formData.login,
          password: formData.password,
          server: formData.server,
          use_investor_password: true,
        }),
      });
      
      const connectData = await connectResponse.json();
      
      if (connectResponse.ok && connectData.success) {
        setConnectionStatus(connectData);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError(connectData.error || 'Failed to connect to MT5');
        setConnectionStatus(null);
      }
    } catch (err: unknown) {
      setError('Unable to connect to server. Please make sure the API server is running.');
      console.error('Connection error:', err);
      setConnectionStatus(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen  text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-4xl relative z-10">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Link2 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              MetaTrader 5 Integration
            </h1>
          </div>
          <p className="text-gray-400">
            Connect your MetaTrader 5 account
          </p>
        </header>

        {/* Connection Form */}
        <div className="glass glass-hover rounded-xl p-8">
          <form onSubmit={handleConnect} className="space-y-6">
            {/* Broker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Broker
              </label>
              <input
                type="text"
                value={formData.broker}
                onChange={(e) => setFormData({ ...formData, broker: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Broker name"
                required
              />
            </div>

            {/* Server */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Server
              </label>
              <input
                type="text"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Server name"
                required
              />
            </div>

            {/* Login */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Login
              </label>
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Account login number"
                required
              />
            </div>

            {/* Password (Investor) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Investor Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your investor password"
                required
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400">Successfully connected to MetaTrader 5!</span>
              </div>
            )}

            {/* Connection Status */}
            {connectionStatus && connectionStatus.account && (
              <div className="p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                <h3 className="text-lg font-semibold text-white mb-3">Connection Status</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>Account: {connectionStatus.account.login}</div>
                  <div>Balance: ${connectionStatus.account.balance?.toLocaleString()} {connectionStatus.account.currency}</div>
                  <div>Server: {connectionStatus.account.server}</div>
                </div>
              </div>
            )}

            {/* Connect Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center space-x-2 py-3 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-5 h-5" />
                  <span>Connect to MT5</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
