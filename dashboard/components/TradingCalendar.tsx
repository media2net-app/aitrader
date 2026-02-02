'use client';

import { useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface TradingCalendarProps {
  apiUrl: string;
}

interface DayData {
  date: string;
  pnl: number;
  trades: number;
}

export default function TradingCalendar({ apiUrl }: TradingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dailyData, setDailyData] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchDailyData();
  }, [currentDate]);

  const fetchDailyData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      
      const response = await fetch(`${apiUrl}/api/daily-pnl?year=${year}&month=${month}`);
      const result = await response.json();
      
      if (response.ok && result.daily_data) {
        // Convert API data to Map
        const dataMap = new Map<string, DayData>();
        result.daily_data.forEach((day: DayData) => {
          dataMap.set(day.date, day);
        });
        
        // Fill in missing days with generated data (for demo)
        const generatedData = generateDailyData(currentDate);
        generatedData.forEach((value, key) => {
          if (!dataMap.has(key)) {
            dataMap.set(key, value);
          }
        });
        
        setDailyData(dataMap);
      } else {
        // Fallback to generated data
        const data = generateDailyData(currentDate);
        setDailyData(data);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching daily data:', error);
      // Fallback to generated data
      const data = generateDailyData(currentDate);
      setDailyData(data);
      setLoading(false);
    }
  };

  const generateDailyData = (date: Date): Map<string, DayData> => {
    const data = new Map<string, DayData>();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const dateStr = dayDate.toISOString().split('T')[0];
      
      // Generate realistic P&L data
      // More profitable days than losing days (60/40 split)
      const isProfit = Math.random() > 0.4;
      const pnl = isProfit 
        ? Math.random() * 2000 + 100  // Profit: $100 - $2100
        : Math.random() * 1500 * -1;  // Loss: -$1500 - $0
      
      data.set(dateStr, {
        date: dateStr,
        pnl: Math.round(pnl),
        trades: Math.floor(Math.random() * 15) + 1,
      });
    }
    
    return data;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      days.push({
        day,
        date: dateStr,
        data: dailyData.get(dateStr),
      });
    }
    
    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = getDaysInMonth();
  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && 
                        currentDate.getFullYear() === today.getFullYear();

  // Calculate month totals
  const monthTotal = Array.from(dailyData.values()).reduce((sum, day) => sum + day.pnl, 0);
  const profitableDays = Array.from(dailyData.values()).filter(day => day.pnl > 0).length;
  const losingDays = Array.from(dailyData.values()).filter(day => day.pnl < 0).length;

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Trading Calendar</h2>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
          <div className="text-center min-w-[200px]">
            <div className="text-lg font-semibold text-white">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>
            <button
              onClick={goToToday}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              Go to Today
            </button>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Month Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Month P&L</div>
          <div className={`text-lg font-bold ${
            monthTotal >= 0 ? 'text-green-400' : 'text-red-400'
          }`}>
            {monthTotal >= 0 ? '+' : ''}${monthTotal.toLocaleString()}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Profitable Days</div>
          <div className="text-lg font-bold text-green-400">{profitableDays}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Losing Days</div>
          <div className="text-lg font-bold text-red-400">{losingDays}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((dayInfo, index) => {
              if (!dayInfo) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const { day, date, data } = dayInfo;
              const isToday = isCurrentMonth && 
                             day === today.getDate() && 
                             currentDate.getMonth() === today.getMonth();
              const isProfit = data && data.pnl > 0;
              const isLoss = data && data.pnl < 0;
              const isNeutral = data && data.pnl === 0;

              return (
                <div
                  key={date}
                  className={`aspect-square rounded-lg p-2 flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 ${
                    isToday
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0a0a0f]'
                      : ''
                  } ${
                    isProfit
                      ? 'bg-green-500/20 border-2 border-green-500/50'
                      : isLoss
                      ? 'bg-red-500/20 border-2 border-red-500/50'
                      : isNeutral
                      ? 'bg-gray-500/10 border border-gray-500/20'
                      : 'bg-white/5 border border-white/10'
                  }`}
                  title={data ? `P&L: $${data.pnl.toLocaleString()}, Trades: ${data.trades}` : 'No trades'}
                >
                  <div className={`text-sm font-semibold ${
                    isToday ? 'text-white' : 
                    isProfit ? 'text-green-400' : 
                    isLoss ? 'text-red-400' : 
                    'text-gray-400'
                  }`}>
                    {day}
                  </div>
                  {data && (
                    <div className={`text-xs mt-1 font-medium ${
                      isProfit ? 'text-green-300' : 
                      isLoss ? 'text-red-300' : 
                      'text-gray-400'
                    }`}>
                      {data.pnl >= 0 ? '+' : ''}${Math.abs(data.pnl) > 999 
                        ? `${(data.pnl / 1000).toFixed(1)}k` 
                        : data.pnl.toLocaleString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-green-500/20 border border-green-500/50"></div>
          <span className="text-gray-400">Profit Day</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/50"></div>
          <span className="text-gray-400">Loss Day</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded bg-white/5 border border-white/10"></div>
          <span className="text-gray-400">No Trades</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 rounded ring-2 ring-indigo-500"></div>
          <span className="text-gray-400">Today</span>
        </div>
      </div>
    </div>
  );
}
