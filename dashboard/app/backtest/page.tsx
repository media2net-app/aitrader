'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart3, Play, Loader2, TrendingUp, TrendingDown, Target, DollarSign, Activity, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface BacktestResult {
  success: boolean;
  trades: any[];
  equity_curve: number[];
  metrics: {
    win_rate: number;
    total_pnl: number;
    profit_factor: number;
    max_drawdown: number;
    max_drawdown_pct: number;
    sharpe_ratio: number;
    sortino_ratio: number;
    expectancy: number;
    recovery_factor: number;
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    avg_win: number;
    avg_loss: number;
  };
  initial_balance: number;
  final_balance: number;
  total_return_pct: number;
  symbol: string;
  timeframe: string;
  period_days: number;
  error?: string;
}

export default function BacktestPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [config, setConfig] = useState({
    symbol: 'XAUUSD',
    timeframe: 'H1',
    days: 30,
    volume: 0.20,
    initial_balance: 100000
  });

  const runBacktest = async () => {
    setRunning(true);
    setResults(null);
    
    try {
      const response = await fetch(`${API_URL}/api/backtest/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (data.error) {
        alert(`Error: ${data.error}\n${data.message || ''}`);
        setResults(null);
      } else {
        setResults(data);
      }
    } catch (error: any) {
      console.error('Backtest error:', error);
      alert(`Error running backtest: ${error.message}`);
      setResults(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative">
      <div className="container mx-auto px-4 py-8 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Backtesting
            </h1>
          </div>
          <p className="text-gray-400">
            Test je strategie op historische data en analyseer performance
          </p>
        </header>

        {/* Configuration Card */}
        <div className="glass glass-hover rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Backtest Configuratie</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Symbol</label>
              <input
                type="text"
                value={config.symbol}
                onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                placeholder="XAUUSD"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Timeframe</label>
              <select
                value={config.timeframe}
                onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="H1">H1 (1 uur)</option>
                <option value="H4">H4 (4 uur)</option>
                <option value="D1">D1 (1 dag)</option>
                <option value="M15">M15 (15 min)</option>
                <option value="M30">M30 (30 min)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Aantal Dagen</label>
              <input
                type="number"
                value={config.days}
                onChange={(e) => setConfig({ ...config, days: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                min="1"
                max="365"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Volume (lots)</label>
              <input
                type="number"
                step="0.01"
                value={config.volume}
                onChange={(e) => setConfig({ ...config, volume: parseFloat(e.target.value) || 0.20 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                min="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Start Balans</label>
              <input
                type="number"
                value={config.initial_balance}
                onChange={(e) => setConfig({ ...config, initial_balance: parseFloat(e.target.value) || 100000 })}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                min="1000"
              />
            </div>
          </div>
          <button
            onClick={runBacktest}
            disabled={running}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg hover:from-indigo-600 hover:to-purple-600 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Running Backtest...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span>Start Backtest</span>
              </>
            )}
          </button>
        </div>

        {/* Results */}
        {results && results.success && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Total Return</span>
                  <DollarSign className="w-5 h-5 text-indigo-400" />
                </div>
                <div className={`text-2xl font-bold ${results.total_return_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {results.total_return_pct >= 0 ? '+' : ''}{results.total_return_pct.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  ${results.initial_balance.toLocaleString()} → ${results.final_balance.toLocaleString()}
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Win Rate</span>
                  <Target className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {results.metrics.win_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {results.metrics.winning_trades}W / {results.metrics.losing_trades}L
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Profit Factor</span>
                  <TrendingUp className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-white">
                  {results.metrics.profit_factor.toFixed(2)}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {results.metrics.profit_factor >= 1.5 ? 'Excellent' : results.metrics.profit_factor >= 1.0 ? 'Good' : 'Poor'}
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Max Drawdown</span>
                  <TrendingDown className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {results.metrics.max_drawdown_pct.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  ${results.metrics.max_drawdown.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Equity Curve Chart */}
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Equity Curve</h2>
              <EquityCurveChart equityCurve={results.equity_curve} initialBalance={results.initial_balance} />
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Performance Metrics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sharpe Ratio</span>
                    <span className="text-white font-semibold">{results.metrics.sharpe_ratio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sortino Ratio</span>
                    <span className="text-white font-semibold">{results.metrics.sortino_ratio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Expectancy</span>
                    <span className="text-white font-semibold">${results.metrics.expectancy.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Recovery Factor</span>
                    <span className="text-white font-semibold">{results.metrics.recovery_factor.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Win</span>
                    <span className="text-green-400 font-semibold">${results.metrics.avg_win.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Avg Loss</span>
                    <span className="text-red-400 font-semibold">${results.metrics.avg_loss.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Trade Statistics</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Trades</span>
                    <span className="text-white font-semibold">{results.metrics.total_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Winning Trades</span>
                    <span className="text-green-400 font-semibold">{results.metrics.winning_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Losing Trades</span>
                    <span className="text-red-400 font-semibold">{results.metrics.losing_trades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total P&L</span>
                    <span className={`font-semibold ${results.metrics.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${results.metrics.total_pnl.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Symbol</span>
                    <span className="text-white font-semibold">{results.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Timeframe</span>
                    <span className="text-white font-semibold">{results.timeframe}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Period</span>
                    <span className="text-white font-semibold">{results.period_days} days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Trade List */}
            {results.trades && results.trades.length > 0 && (
              <div className="glass glass-hover rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Trade List ({results.trades.length} trades)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-400">Type</th>
                        <th className="text-right py-3 px-4 text-gray-400">Entry</th>
                        <th className="text-right py-3 px-4 text-gray-400">Exit</th>
                        <th className="text-right py-3 px-4 text-gray-400">P&L</th>
                        <th className="text-right py-3 px-4 text-gray-400">Reason</th>
                        <th className="text-left py-3 px-4 text-gray-400">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.trades.slice().reverse().map((trade, index) => (
                        <tr key={index} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded text-xs ${
                              trade.type === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="text-right py-3 px-4 text-white">${trade.entry_price?.toFixed(2)}</td>
                          <td className="text-right py-3 px-4 text-white">${trade.exit_price?.toFixed(2)}</td>
                          <td className={`text-right py-3 px-4 font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${trade.pnl?.toFixed(2)}
                          </td>
                          <td className="text-right py-3 px-4 text-gray-400">{trade.reason}</td>
                          <td className="text-left py-3 px-4 text-gray-400 text-sm">{trade.entry_time}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {results && results.error && (
          <div className="glass glass-hover rounded-xl p-6 border border-red-500/20">
            <div className="flex items-center space-x-2 text-red-400 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h2 className="text-xl font-bold">Error</h2>
            </div>
            <p className="text-gray-300">{results.error}</p>
            {results.message && <p className="text-gray-400 mt-2">{results.message}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// Equity Curve Chart Component
function EquityCurveChart({ equityCurve, initialBalance }: { equityCurve: number[], initialBalance: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const width = 800;
  const height = 400;
  const padding = { top: 20, right: 80, bottom: 40, left: 80 };

  useEffect(() => {
    if (!svgRef.current || equityCurve.length === 0) return;

    const svg = svgRef.current;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear previous content
    svg.innerHTML = '';

    const maxEquity = Math.max(...equityCurve);
    const minEquity = Math.min(...equityCurve);
    const range = maxEquity - minEquity || 1;
    const paddingValue = range * 0.1;

    const scaleX = (index: number) => padding.left + (index / (equityCurve.length - 1)) * chartWidth;
    const scaleY = (value: number) => padding.top + chartHeight - ((value - minEquity + paddingValue) / (range + paddingValue * 2)) * chartHeight;

    // Create gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'equityGradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#8b5cf6');
    stop1.setAttribute('stop-opacity', '0.3');
    gradient.appendChild(stop1);
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#8b5cf6');
    stop2.setAttribute('stop-opacity', '0');
    gradient.appendChild(stop2);
    
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Draw grid lines
    const gridLines = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (i / 5) * chartHeight;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left.toString());
      line.setAttribute('x2', (width - padding.right).toString());
      line.setAttribute('y1', y.toString());
      line.setAttribute('y2', y.toString());
      line.setAttribute('stroke', 'rgba(255, 255, 255, 0.1)');
      line.setAttribute('stroke-width', '1');
      gridLines.appendChild(line);

      const value = minEquity + paddingValue + (5 - i) / 5 * (range + paddingValue * 2);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', (padding.left - 10).toString());
      text.setAttribute('y', (y + 5).toString());
      text.setAttribute('fill', 'rgba(255, 255, 255, 0.5)');
      text.setAttribute('font-size', '12');
      text.setAttribute('text-anchor', 'end');
      text.textContent = `$${value.toFixed(0)}`;
      gridLines.appendChild(text);
    }
    svg.appendChild(gridLines);

    // Draw area under curve
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let areaD = `M ${scaleX(0)} ${scaleY(equityCurve[0])}`;
    for (let i = 1; i < equityCurve.length; i++) {
      areaD += ` L ${scaleX(i)} ${scaleY(equityCurve[i])}`;
    }
    areaD += ` L ${scaleX(equityCurve.length - 1)} ${height - padding.bottom}`;
    areaD += ` L ${scaleX(0)} ${height - padding.bottom} Z`;
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#equityGradient)');
    svg.appendChild(areaPath);

    // Draw equity curve
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let pathD = `M ${scaleX(0)} ${scaleY(equityCurve[0])}`;
    for (let i = 1; i < equityCurve.length; i++) {
      const x1 = scaleX(i - 1);
      const y1 = scaleY(equityCurve[i - 1]);
      const x2 = scaleX(i);
      const y2 = scaleY(equityCurve[i]);
      const cx1 = x1 + (x2 - x1) / 2;
      const cy1 = y1;
      const cx2 = x2 - (x2 - x1) / 2;
      const cy2 = y2;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    }
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#8b5cf6');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);

    // Draw initial balance line
    const initialLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    const initialY = scaleY(initialBalance);
    initialLine.setAttribute('x1', padding.left.toString());
    initialLine.setAttribute('x2', (width - padding.right).toString());
    initialLine.setAttribute('y1', initialY.toString());
    initialLine.setAttribute('y2', initialY.toString());
    initialLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.3)');
    initialLine.setAttribute('stroke-width', '1');
    initialLine.setAttribute('stroke-dasharray', '5,5');
    svg.appendChild(initialLine);

  }, [equityCurve, initialBalance]);

  if (equityCurve.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No equity curve data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <svg ref={svgRef} width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`} />
    </div>
  );
}
