'use client';

import { useState, useEffect } from 'react';
import { Calculator, TrendingUp, DollarSign, Percent, BarChart3 } from 'lucide-react';

export default function CalculatorPage() {
  const [startBalance, setStartBalance] = useState(1000);
  const [winRate, setWinRate] = useState(90);
  const [lotSize, setLotSize] = useState(0.2);
  const [leverage, setLeverage] = useState(100);
  const [tradesPerDay, setTradesPerDay] = useState(1);
  const [riskPerTrade, setRiskPerTrade] = useState(2); // Percentage of balance
  const [avgWinPips, setAvgWinPips] = useState(20);
  const [avgLossPips, setAvgLossPips] = useState(10);
  const [result, setResult] = useState<any>(null);

  const calculateProjection = () => {
    try {
      // Trading days per year (approximately 252)
      const tradingDaysPerYear = 252;
      const totalTrades = tradesPerDay * tradingDaysPerYear;
      
      // For forex, 1 lot = 100,000 units
      // Pip value for 1 lot = $10 per pip (for major pairs like EURUSD, XAUUSD)
      const pipValuePerLot = 10; // $10 per pip for 1 lot
      
      // Calculate profit/loss per trade based on lot size
      const winAmount = lotSize * avgWinPips * pipValuePerLot;
      const lossAmount = lotSize * avgLossPips * pipValuePerLot;
      
      // Calculate expected value per trade
      const winProbability = winRate / 100;
      const lossProbability = 1 - winProbability;
      const expectedValuePerTrade = (winAmount * winProbability) - (lossAmount * lossProbability);
      
      // Simulate year with compound interest (balance grows/shrinks with each trade)
      let balance = startBalance;
      const monthlyResults: { month: number; balance: number; trades: number; wins: number; losses: number }[] = [];
      
      // Use deterministic calculation based on expected value for consistent results
      const tradesPerMonth = totalTrades / 12;
      
      for (let month = 1; month <= 12; month++) {
        const monthStartBalance = balance;
        let monthBalance = balance;
        let wins = 0;
        let losses = 0;
        
        // Calculate expected trades for the month
        const expectedWins = Math.round(tradesPerMonth * winProbability);
        const expectedLosses = Math.round(tradesPerMonth * lossProbability);
        
        // Apply wins first, then losses (deterministic)
        for (let i = 0; i < expectedWins; i++) {
          monthBalance += winAmount;
          wins++;
        }
        
        for (let i = 0; i < expectedLosses; i++) {
          monthBalance -= lossAmount;
          losses++;
        }
        
        // Handle remaining fractional trade based on expected value
        const remainingTrades = tradesPerMonth - (expectedWins + expectedLosses);
        if (remainingTrades > 0) {
          monthBalance += expectedValuePerTrade * remainingTrades;
        }
        
        balance = Math.max(0, monthBalance); // Prevent negative balance
        monthlyResults.push({
          month,
          balance: Math.round(balance * 100) / 100,
          trades: Math.round(tradesPerMonth),
          wins,
          losses
        });
      }
      
      const finalBalance = balance;
      const totalProfit = finalBalance - startBalance;
      const roi = startBalance > 0 ? ((finalBalance - startBalance) / startBalance) * 100 : 0;
      const totalWins = monthlyResults.reduce((sum, m) => sum + m.wins, 0);
      const totalLosses = monthlyResults.reduce((sum, m) => sum + m.losses, 0);
      const actualWinRate = (totalWins + totalLosses) > 0 ? (totalWins / (totalWins + totalLosses)) * 100 : 0;
      
      setResult({
        startBalance,
        finalBalance: Math.round(finalBalance * 100) / 100,
        totalProfit: Math.round(totalProfit * 100) / 100,
        roi: Math.round(roi * 100) / 100,
        totalTrades: Math.round(totalTrades),
        totalWins,
        totalLosses,
        actualWinRate: Math.round(actualWinRate * 100) / 100,
        monthlyResults,
        expectedValuePerTrade: Math.round(expectedValuePerTrade * 100) / 100,
        winAmount: Math.round(winAmount * 100) / 100,
        lossAmount: Math.round(lossAmount * 100) / 100
      });
    } catch (error) {
      console.error('Calculation error:', error);
    }
  };

  useEffect(() => {
    calculateProjection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startBalance, winRate, lotSize, leverage, tradesPerDay, riskPerTrade, avgWinPips, avgLossPips]);

  return (
    <div className="min-h-screen text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-lg">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Trading Calculator
            </h1>
          </div>
          <p className="text-gray-400">
            Calculate your trading projection for 1 year
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form - Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass glass-hover rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Trading Parameters</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Balance */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <DollarSign className="w-4 h-4" />
                    <span>Start Balance ($)</span>
                  </label>
                  <input
                    type="number"
                    value={startBalance}
                    onChange={(e) => setStartBalance(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    step="1"
                  />
                </div>

                {/* Win Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <Percent className="w-4 h-4" />
                    <span>Win Rate (%)</span>
                  </label>
                  <input
                    type="number"
                    value={winRate}
                    onChange={(e) => setWinRate(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0"
                    max="100"
                    step="1"
                  />
                </div>

                {/* Lot Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4" />
                    <span>Lot Size</span>
                  </label>
                  <input
                    type="number"
                    value={lotSize}
                    onChange={(e) => setLotSize(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0.01"
                    step="0.01"
                  />
                </div>

                {/* Leverage */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>Leverage (1:X)</span>
                  </label>
                  <input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    step="1"
                  />
                </div>

                {/* Trades Per Day */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Trades Per Day
                  </label>
                  <input
                    type="number"
                    value={tradesPerDay}
                    onChange={(e) => setTradesPerDay(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0.1"
                    step="0.1"
                  />
                </div>

                {/* Risk Per Trade */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Risk Per Trade (%)
                  </label>
                  <input
                    type="number"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="0.1"
                    max="10"
                    step="0.1"
                  />
                </div>

                {/* Average Win Pips */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Average Win (Pips)
                  </label>
                  <input
                    type="number"
                    value={avgWinPips}
                    onChange={(e) => setAvgWinPips(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    step="1"
                  />
                </div>

                {/* Average Loss Pips */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Average Loss (Pips)
                  </label>
                  <input
                    type="number"
                    value={avgLossPips}
                    onChange={(e) => setAvgLossPips(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    min="1"
                    step="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Results - Right Column */}
          <div className="space-y-6">
            {result && (
              <>
                {/* Final Balance */}
                <div className="glass glass-hover rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">1 Year Projection</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Start Balance</div>
                      <div className="text-2xl font-bold text-white">${result.startBalance.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Final Balance</div>
                      <div className={`text-3xl font-bold ${result.finalBalance >= result.startBalance ? 'text-green-400' : 'text-red-400'}`}>
                        ${result.finalBalance.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Total Profit/Loss</div>
                      <div className={`text-2xl font-bold ${result.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {result.totalProfit >= 0 ? '+' : ''}${result.totalProfit.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">ROI</div>
                      <div className={`text-2xl font-bold ${result.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {result.roi >= 0 ? '+' : ''}{result.roi.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trading Stats */}
                <div className="glass glass-hover rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Trading Statistics</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Trades</span>
                      <span className="text-white font-semibold">{result.totalTrades}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Winning Trades</span>
                      <span className="text-green-400 font-semibold">{result.totalWins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Losing Trades</span>
                      <span className="text-red-400 font-semibold">{result.totalLosses}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Actual Win Rate</span>
                      <span className="text-white font-semibold">{result.actualWinRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Win/Trade</span>
                      <span className="text-green-400 font-semibold">${result.winAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Avg Loss/Trade</span>
                      <span className="text-red-400 font-semibold">${result.lossAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected Value</span>
                      <span className={`font-semibold ${result.expectedValuePerTrade >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${result.expectedValuePerTrade.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Breakdown */}
                <div className="glass glass-hover rounded-xl p-6">
                  <h2 className="text-xl font-bold text-white mb-4">Monthly Breakdown</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.monthlyResults.map((month: any) => (
                      <div key={month.month} className="flex justify-between items-center py-2 border-b border-white/5">
                        <div>
                          <div className="text-sm font-medium text-white">Month {month.month}</div>
                          <div className="text-xs text-gray-400">{month.trades} trades ({month.wins}W/{month.losses}L)</div>
                        </div>
                        <div className={`text-lg font-bold ${month.balance >= result.startBalance ? 'text-green-400' : 'text-red-400'}`}>
                          ${month.balance.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
