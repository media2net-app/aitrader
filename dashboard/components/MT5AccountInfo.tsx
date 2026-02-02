'use client';

import { useState, useEffect } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, Server, 
  User, Building2, RefreshCw, AlertCircle, CheckCircle 
} from 'lucide-react';

interface MT5AccountInfoProps {
  apiUrl?: string;
}

interface AccountInfo {
  login?: number;
  balance?: number;
  equity?: number;
  margin?: number;
  free_margin?: number;
  profit?: number;
  server?: string;
  currency?: string;
  leverage?: number;
  company?: string;
}

export default function MT5AccountInfo({ apiUrl = 'http://localhost:5001' }: MT5AccountInfoProps) {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [bridgeConnected, setBridgeConnected] = useState<boolean | null>(null);
  const [lastDataHash, setLastDataHash] = useState<string>('');

  // Helper to create a hash of the account data for comparison
  const createDataHash = (data: AccountInfo | null): string => {
    if (!data) return '';
    const keyData = {
      balance: data.balance,
      equity: data.equity,
      profit: data.profit,
      free_margin: data.free_margin,
    };
    return JSON.stringify(keyData);
  };

  const fetchAccountInfo = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check bridge connection status
      try {
        const bridgeResponse = await fetch('http://localhost:5002/health');
        const bridgeData = await bridgeResponse.json();
        setBridgeConnected(bridgeData.status === 'healthy');
      } catch (bridgeErr) {
        setBridgeConnected(false);
      }
      
      // Try bridge directly first, then API server
      let accountData = null;
      try {
        const bridgeResponse = await fetch('http://localhost:5002/account');
        if (bridgeResponse.ok) {
          accountData = await bridgeResponse.json();
          if (accountData && !accountData.error && accountData.balance !== undefined) {
            // Only update if data has actually changed
            const newHash = createDataHash(accountData);
            if (newHash !== lastDataHash) {
              setAccountInfo(accountData);
              setLastDataHash(newHash);
              setLastUpdate(new Date());
            }
            setBridgeConnected(true);
            return;
          }
        }
      } catch (bridgeErr) {
        console.log('Bridge direct failed, trying API server');
      }
      
      // Fallback to API server
      try {
        const response = await fetch(`${apiUrl}/api/mt5/account`);
        const data = await response.json();
        
        if (data.error) {
          // Only show error if it's not a connection error
          if (!data.error.includes('Unable to connect') && !data.error.includes('Kan geen verbinding')) {
            setError(data.error);
          }
          setAccountInfo(null);
        } else {
          // Only update if data has actually changed
          const newHash = createDataHash(data);
          if (newHash !== lastDataHash) {
            setAccountInfo(data);
            setLastDataHash(newHash);
            setLastUpdate(new Date());
          }
          setBridgeConnected(true);
        }
      } catch (apiErr) {
        // Don't show error if it's just a connection issue - silently fail
        console.log('MT5 account fetch failed (expected if bridge not running):', apiErr);
        setBridgeConnected(false);
        // Don't set error state - just show as disconnected
      }
    } catch (err: any) {
      // Don't show error - just mark as disconnected (expected if bridge not running)
      console.log('MT5 account fetch failed (expected if bridge not running):', err);
      setBridgeConnected(false);
      // Don't set error state - just show as disconnected
    } finally {
      setLoading(false);
    }
  };

      useEffect(() => {
        // Load data once on mount - no auto-refresh
        fetchAccountInfo();
      }, [apiUrl]);

  if (loading && !accountInfo) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-white/10 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">MetaTrader 5 Account</h2>
            {false && (
              <span className="text-xs text-yellow-400 bg-yellow-400/20 px-2 py-1 rounded">Demo Mode</span>
            )}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Bridge Connection Status */}
          {bridgeConnected === null ? (
            <span className="px-3 py-1 text-xs font-medium bg-gray-500/20 text-gray-400 rounded-full flex items-center space-x-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span>Checking Bridge...</span>
            </span>
          ) : bridgeConnected ? (
            <span className="px-3 py-1 text-xs font-medium bg-green-500/20 text-green-400 rounded-full flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>API Bridge Connected</span>
            </span>
          ) : (
            <span className="px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400 rounded-full flex items-center space-x-1">
              <AlertCircle className="w-3 h-3" />
              <span>API Bridge Disconnected</span>
            </span>
          )}
          
          {lastUpdate && (
            <span className="text-xs text-gray-400">
              {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchAccountInfo}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && !error.includes('Kan geen verbinding maken') && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {accountInfo && (
        <>
          {/* Account Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Account Login</p>
                <User className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-white">{accountInfo.login || 'N/A'}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Server</p>
                <Server className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-white truncate">{accountInfo.server || 'N/A'}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Company</p>
                <Building2 className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-lg font-semibold text-white truncate">{accountInfo.company || 'N/A'}</p>
            </div>

            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-400">Leverage</p>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-white">1:{accountInfo.leverage || 'N/A'}</p>
            </div>
          </div>

          {/* Financial Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-lg p-4 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Balance</p>
                <Wallet className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-green-400">
                {accountInfo.balance?.toLocaleString('nl-NL', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }) || '0.00'} {accountInfo.currency || 'USD'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg p-4 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Equity</p>
                <TrendingUp className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {accountInfo.equity?.toLocaleString('nl-NL', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }) || '0.00'} {accountInfo.currency || 'USD'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 rounded-lg p-4 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Free Margin</p>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-400">
                {accountInfo.free_margin?.toLocaleString('nl-NL', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }) || '0.00'} {accountInfo.currency || 'USD'}
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 rounded-lg p-4 border border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Used Margin</p>
                <TrendingDown className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-2xl font-bold text-orange-400">
                {accountInfo.margin?.toLocaleString('nl-NL', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }) || '0.00'} {accountInfo.currency || 'USD'}
              </p>
            </div>

            <div className={`bg-gradient-to-br rounded-lg p-4 border ${
              (accountInfo.profit || 0) >= 0 
                ? 'from-green-500/20 to-green-600/20 border-green-500/30' 
                : 'from-red-500/20 to-red-600/20 border-red-500/30'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-300">Profit/Loss</p>
                {(accountInfo.profit || 0) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-400" />
                )}
              </div>
              <p className={`text-2xl font-bold ${
                (accountInfo.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {(accountInfo.profit || 0) >= 0 ? '+' : ''}
                {accountInfo.profit?.toLocaleString('nl-NL', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                }) || '0.00'} {accountInfo.currency || 'USD'}
              </p>
            </div>
          </div>

          {/* Connection Status */}
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center space-x-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-green-400">Verbonden met MetaTrader 5</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
