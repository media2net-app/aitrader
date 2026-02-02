'use client';

import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, X, 
  AlertCircle, CheckCircle, RefreshCw, Search 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface SymbolInfo {
  symbol: string;
  description: string;
  bid: number;
  ask: number;
  last: number;
  currency_base: string;
  currency_profit: string;
  digits: number;
  point: number;
}

interface Position {
  ticket: number;
  symbol: string;
  type: string;
  volume: number;
  price_open: number;
  price_current: number;
  profit: number;
  swap: number;
  time: string;
}

export default function TradingPage() {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState('');
  const [symbolInfo, setSymbolInfo] = useState<SymbolInfo | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [volume, setVolume] = useState('0.01');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [comment, setComment] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSymbols();
    loadAccountInfo();
    loadPositions();
    loadOrders();
    
    // Load data once on mount - no auto-refresh
  }, []);

  useEffect(() => {
    if (selectedSymbol) {
      // Load data once when symbol changes - no auto-refresh
      loadSymbolInfo(selectedSymbol);
    }
  }, [selectedSymbol]);

  const loadSymbols = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/symbols`);
      const data = await response.json();
      if (data.symbols) {
        const symbolNames = data.symbols
          .map((s: any) => s.name)
          .filter((name: string) => name.includes('USD') || name.includes('EUR') || name.includes('GBP'))
          .sort();
        setSymbols(symbolNames);
        if (symbolNames.length > 0 && !selectedSymbol) {
          setSelectedSymbol(symbolNames[0]);
        }
      }
    } catch (err) {
      console.error('Error loading symbols:', err);
    }
  };

  const loadSymbolInfo = async (symbol: string) => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/symbol/${symbol}`);
      const data = await response.json();
      if (!data.error) {
        setSymbolInfo(data);
      }
    } catch (err) {
      console.error('Error loading symbol info:', err);
    }
  };

  const loadAccountInfo = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/account`);
      const data = await response.json();
      if (!data.error) {
        setAccountInfo(data);
      }
    } catch (err) {
      console.error('Error loading account info:', err);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/positions`);
      const data = await response.json();
      if (data.positions) {
        setPositions(data.positions);
        // Auto-select symbol if position exists and no symbol selected
        if (data.positions.length > 0 && !selectedSymbol) {
          setSelectedSymbol(data.positions[0].symbol);
        }
      }
    } catch (err) {
      console.error('Error loading positions:', err);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/mt5/orders`);
      const data = await response.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/mt5/place-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedSymbol,
          type: orderType,
          volume: parseFloat(volume),
          sl: sl ? parseFloat(sl) : null,
          tp: tp ? parseFloat(tp) : null,
          comment: comment || 'AI Trader by Chiel',
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else if (data.success) {
        setSuccess(`Order placed successfully! Order ID: ${data.order}`);
        setVolume('0.01');
        setSl('');
        setTp('');
        setComment('');
        setTimeout(() => {
          loadPositions();
          loadAccountInfo();
        }, 1000);
      } else {
        setError(data.comment || 'Failed to place order');
      }
    } catch (err: any) {
      setError('Unable to connect to server. Please try again.');
      console.error('Place order error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePosition = async (ticket: number) => {
    if (!confirm(`Are you sure you want to close position #${ticket}?`)) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/mt5/close-position/${ticket}`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        setError(`Failed to close position: ${data.error}`);
        console.error('Close position error:', data);
      } else if (data.success) {
        setSuccess(`Position #${ticket} closed successfully!`);
        // Immediately refresh positions and account
        setTimeout(() => {
          loadPositions();
          loadAccountInfo();
        }, 500);
        // Also refresh after 2 seconds to ensure it's closed
        setTimeout(() => {
          loadPositions();
          loadAccountInfo();
        }, 2000);
      } else {
        setError('Unexpected response from server');
      }
    } catch (err: any) {
      setError('Unable to connect to server. Please try again.');
      console.error('Close position error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSymbols = symbols.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen  text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Live Trading
          </h1>
          {accountInfo && (
            <div className="flex items-center space-x-4 glass rounded-lg px-4 py-2">
              <div className="text-right">
                <p className="text-xs text-gray-400">Balance</p>
                <p className="text-lg font-bold text-green-400">
                  ${accountInfo.balance?.toLocaleString()} {accountInfo.currency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Equity</p>
                <p className="text-lg font-bold text-white">
                  ${accountInfo.equity?.toLocaleString()} {accountInfo.currency}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Free Margin</p>
                <p className="text-lg font-bold text-blue-400">
                  ${accountInfo.free_margin?.toLocaleString()} {accountInfo.currency}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-green-400">{success}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trading Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Symbol Selection */}
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Select Symbol</h2>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search symbols..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                {filteredSymbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSymbol === symbol
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>

            {/* Symbol Info */}
            {symbolInfo && (
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">{symbolInfo.symbol}</h2>
                  <button
                    onClick={() => loadSymbolInfo(selectedSymbol)}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Bid</p>
                    <p className="text-2xl font-bold text-red-400">{symbolInfo.bid?.toFixed(symbolInfo.digits)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Ask</p>
                    <p className="text-2xl font-bold text-green-400">{symbolInfo.ask?.toFixed(symbolInfo.digits)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Spread</p>
                    <p className="text-2xl font-bold text-white">
                      {((symbolInfo.ask - symbolInfo.bid) / symbolInfo.point).toFixed(0)} pts
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Open Positions */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Open Positions ({positions.length})</h2>
                <button
                  onClick={() => {
                    loadPositions();
                    loadAccountInfo();
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              {positions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No open positions</p>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => {
                    const pnlPercent = pos.price_open !== 0 
                      ? ((pos.price_current - pos.price_open) / pos.price_open) * 100 
                      : 0;
                    const isProfit = pos.profit >= 0;
                    
                    return (
                      <div
                        key={pos.ticket}
                        className={`p-4 rounded-lg border transition-all ${
                          isProfit 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-lg">{pos.symbol}</span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              pos.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {pos.type}
                            </span>
                            <span className="text-sm text-gray-400">#{pos.ticket}</span>
                          </div>
                          <button
                            onClick={() => handleClosePosition(pos.ticket)}
                            disabled={loading}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {loading ? 'Closing...' : 'Close Position'}
                          </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Volume</p>
                            <p className="font-semibold text-white">{pos.volume} lots</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Open Price</p>
                            <p className="font-semibold text-white">{pos.price_open.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Current Price</p>
                            <p className={`font-semibold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                              {pos.price_current.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">P&L</p>
                            <div>
                              <p className={`font-bold text-lg ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                ${pos.profit.toFixed(2)}
                              </p>
                              <p className={`text-xs ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                                {pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>Opened: {new Date(pos.time).toLocaleString()}</span>
                            <span className={`px-2 py-1 rounded ${
                              isProfit ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {isProfit ? '📈 Profit' : '📉 Loss'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Order Panel */}
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Place Order</h2>
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Order Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setOrderType('BUY')}
                      className={`p-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                        orderType === 'BUY'
                          ? 'bg-green-500 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <TrendingUp className="w-5 h-5" />
                      <span>BUY</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType('SELL')}
                      className={`p-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                        orderType === 'SELL'
                          ? 'bg-red-500 text-white'
                          : 'bg-white/5 hover:bg-white/10 text-gray-300'
                      }`}
                    >
                      <TrendingDown className="w-5 h-5" />
                      <span>SELL</span>
                    </button>
                  </div>
                </div>

                {/* Symbol */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={selectedSymbol}
                    readOnly
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>

                {/* Volume */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Volume (Lots)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Stop Loss */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (Optional)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={sl}
                    onChange={(e) => setSl(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00000"
                  />
                </div>

                {/* Take Profit */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (Optional)</label>
                  <input
                    type="number"
                    step="0.00001"
                    value={tp}
                    onChange={(e) => setTp(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="0.00000"
                  />
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Comment (Optional)</label>
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="AI Trader by Chiel"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !selectedSymbol}
                  className={`w-full py-3 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    orderType === 'BUY'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-red-500 hover:bg-red-600 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Placing Order...</span>
                    </>
                  ) : (
                    <>
                      {orderType === 'BUY' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      <span>Place {orderType} Order</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
