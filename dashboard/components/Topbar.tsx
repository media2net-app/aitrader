'use client';

import { useState, useEffect } from 'react';
import { Clock, Globe, TrendingUp, CheckCircle, XCircle } from 'lucide-react';

interface MarketStatus {
  name: string;
  is_open: boolean;
  current_time: string;
  next_event: string;
  session_name: string;
}

export default function Topbar() {
  const [marketStatus, setMarketStatus] = useState<MarketStatus[]>([]);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const updateCurrentTime = () => {
    try {
      // Bucharest timezone (Europe/Bucharest)
      const now = new Date();
      const bucharestTime = now.toLocaleString('en-US', {
        timeZone: 'Europe/Bucharest',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      setCurrentTime(bucharestTime);
    } catch (error) {
      // Fallback to local time if timezone fails
      const localTime = new Date().toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      setCurrentTime(localTime);
    }
  };

  const calculateMarketStatus = () => {
    try {
      const now = new Date();
      const utcHour = now.getUTCHours();
      const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
      
      // Market hours in UTC
      const markets: MarketStatus[] = [
        {
          name: 'Sydney',
          is_open: dayOfWeek >= 1 && dayOfWeek <= 5 && (utcHour >= 22 || utcHour < 7),
          current_time: '',
          next_event: dayOfWeek >= 1 && dayOfWeek <= 5 && (utcHour >= 22 || utcHour < 7) ? 'Closes at 07:00 GMT' : 'Opens at 22:00 GMT',
          session_name: 'Asia-Pacific'
        },
        {
          name: 'Tokyo',
          is_open: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 0 && utcHour < 9,
          current_time: '',
          next_event: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 0 && utcHour < 9 ? 'Closes at 09:00 GMT' : 'Opens at 00:00 GMT',
          session_name: 'Asian'
        },
        {
          name: 'London',
          is_open: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 8 && utcHour < 16,
          current_time: '',
          next_event: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 8 && utcHour < 16 ? 'Closes at 16:00 GMT' : 'Opens at 08:00 GMT',
          session_name: 'European'
        },
        {
          name: 'New York',
          is_open: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 13 && utcHour < 22,
          current_time: '',
          next_event: dayOfWeek >= 1 && dayOfWeek <= 5 && utcHour >= 13 && utcHour < 22 ? 'Closes at 22:00 GMT' : 'Opens at 13:00 GMT',
          session_name: 'US'
        }
      ];
      
      setMarketStatus(markets);
    } catch (error) {
      console.error('Error calculating market status:', error);
      setMarketStatus([]);
    }
  };

  useEffect(() => {
    // Initialize immediately - no API dependency
    updateCurrentTime();
    calculateMarketStatus();
    setLoading(false);
    
    // Update market status every 30 seconds
    const interval = setInterval(() => {
      calculateMarketStatus();
      updateCurrentTime();
    }, 30000);
    
    // Update time every second
    const timeInterval = setInterval(updateCurrentTime, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getMarketStatusColor = (isOpen: boolean) => {
    return isOpen ? 'text-green-400' : 'text-gray-500';
  };

  const getMarketStatusIcon = (isOpen: boolean) => {
    return isOpen ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />;
  };

  return (
    <div className="w-full glass border-b border-white/10 px-6 py-3 z-10">
      <div className="flex items-center justify-between">
        {/* Current Time - Left */}
        <div className="flex items-center space-x-3">
          <Clock className="w-4 h-4 text-indigo-400" />
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Bucharest:</span>
            <span className="text-sm font-semibold text-white">
              {currentTime || new Date().toLocaleString('en-US', {
                timeZone: 'Europe/Bucharest',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* Market Hours - Right (Horizontal) */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span className="text-xs text-gray-400 uppercase tracking-wider">Markets:</span>
          </div>
          {marketStatus.length === 0 ? (
            <div className="text-xs text-gray-500">Loading...</div>
          ) : (
            <div className="flex items-center space-x-3">
              {marketStatus.map((market) => (
                <div
                  key={market.name}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <span className={getMarketStatusColor(market.is_open)}>
                    {getMarketStatusIcon(market.is_open)}
                  </span>
                  <span className={`text-xs font-medium ${getMarketStatusColor(market.is_open)}`}>
                    {market.name}
                  </span>
                  <span className={`text-xs font-semibold ${getMarketStatusColor(market.is_open)}`}>
                    {market.is_open ? 'OPEN' : 'CLOSED'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
