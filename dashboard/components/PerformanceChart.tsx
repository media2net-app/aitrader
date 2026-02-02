'use client';

import { useState, useEffect, useRef } from 'react';
import { TrendingUp } from 'lucide-react';

interface PerformanceChartProps {
  apiUrl: string;
}

export default function PerformanceChart({ apiUrl }: PerformanceChartProps) {
  const [data, setData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('7d');
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Load data once on mount - no auto-refresh
    fetchChartData();
  }, [timeframe]);

  const fetchChartData = async () => {
    try {
      // Get real data from MT5 history via bridge
      const response = await fetch('http://localhost:5002/history');
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }
      
      const historyData = await response.json();
      const trades = historyData.trades || [];
      
      // Filter out invalid trades (deposits, etc.)
      const validTrades = trades.filter((trade: any) => 
        trade.symbol && 
        trade.symbol !== '' && 
        trade.profit !== undefined &&
        Math.abs(parseFloat(trade.profit)) < 10000 // Filter out deposits
      );
      
      // Group trades by date and calculate daily P&L
      const dailyData: { [key: string]: number } = {};
      
      validTrades.forEach((trade: any) => {
        if (trade.time && trade.profit !== undefined) {
          try {
            // Parse time string (format: "2026.01.30 22:53:38")
            const timeStr = trade.time.replace(/\./g, '-').replace(' ', 'T');
            const tradeDate = new Date(timeStr);
            const dateKey = tradeDate.toISOString().split('T')[0];
            
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = 0;
            }
            dailyData[dateKey] += parseFloat(trade.profit) || 0;
          } catch (e) {
            // Skip invalid dates
          }
        }
      });
      
      // Create chart data with cumulative P&L
      const chartData: any[] = [];
      const sortedDates = Object.keys(dailyData).sort();
      let cumulativePnl = 0;
      
      sortedDates.forEach((date) => {
        cumulativePnl += dailyData[date];
        chartData.push({
          date,
          pnl: Math.round(cumulativePnl * 100) / 100,
          trades: 1,
        });
      });
      
      // If no data, show empty chart
      if (chartData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }
      
      setData(chartData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      setData([]);
      setLoading(false);
    }
  };

  if (loading || data.length === 0) {
    return (
      <div className="glass glass-hover rounded-xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 80, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxPnl = Math.max(...data.map(d => d.pnl), 0);
  const minPnl = Math.min(...data.map(d => d.pnl), 0);
  const range = maxPnl - minPnl || 1;
  const paddingValue = range * 0.1;

  const scaleX = (index: number) => padding.left + (index / (data.length - 1)) * chartWidth;
  const scaleY = (value: number) => padding.top + chartHeight - ((value - minPnl + paddingValue) / (range + paddingValue * 2)) * chartHeight;

  // Create smooth path using quadratic curves
  const createSmoothPath = () => {
    if (data.length < 2) return '';
    
    let path = `M ${scaleX(0)} ${scaleY(data[0].pnl)}`;
    
    for (let i = 1; i < data.length; i++) {
      const x = scaleX(i);
      const y = scaleY(data[i].pnl);
      const prevX = scaleX(i - 1);
      const prevY = scaleY(data[i - 1].pnl);
      
      const cp1x = prevX + (x - prevX) / 2;
      const cp1y = prevY;
      const cp2x = cp1x;
      const cp2y = y;
      
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x} ${y}`;
    }
    
    return path;
  };

  // Create area path (for gradient fill)
  const createAreaPath = () => {
    const linePath = createSmoothPath();
    const lastX = scaleX(data.length - 1);
    const lastY = scaleY(data[data.length - 1].pnl);
    const zeroY = scaleY(0);
    const firstX = scaleX(0);
    const firstY = scaleY(data[0].pnl);
    
    return `${linePath} L ${lastX} ${zeroY} L ${firstX} ${zeroY} Z`;
  };

  const currentPnl = data[data.length - 1]?.pnl || 0;
  const hoveredData = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="glass glass-hover rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Performance Chart</h2>
        </div>
        <div className="flex items-center space-x-2 border border-white/10 rounded-lg p-1">
          {['7d', '30d', '90d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                timeframe === tf 
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Current P&L Display */}
        <div className="absolute top-0 right-0 z-10">
          <div className="glass rounded-lg p-4 border border-white/10">
            <div className="text-xs text-gray-400 mb-1">Total P&L</div>
            <div className={`text-2xl font-bold ${
              currentPnl >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {currentPnl >= 0 ? '+' : ''}${currentPnl.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Chart SVG */}
        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            {/* Gradient for line */}
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="50%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            
            {/* Gradient for area fill */}
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(129, 140, 248, 0.3)" />
              <stop offset="50%" stopColor="rgba(167, 139, 250, 0.2)" />
              <stop offset="100%" stopColor="rgba(129, 140, 248, 0.05)" />
            </linearGradient>
            
            {/* Glow effect */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = padding.top + (percent / 100) * chartHeight;
            const value = minPnl - paddingValue + (1 - percent / 100) * (range + paddingValue * 2);
            return (
              <g key={percent}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-500"
                >
                  ${Math.round(value).toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Zero line */}
          {minPnl < 0 && maxPnl > 0 && (
            <line
              x1={padding.left}
              y1={scaleY(0)}
              x2={width - padding.right}
              y2={scaleY(0)}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Area fill */}
          <path
            d={createAreaPath()}
            fill="url(#areaGradient)"
            opacity="0.6"
          />

          {/* Main line */}
          <path
            d={createSmoothPath()}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = scaleX(index);
            const y = scaleY(point.pnl);
            const isHovered = hoveredIndex === index;
            const isLast = index === data.length - 1;
            
            return (
              <g key={index}>
                {/* Hover indicator line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={height - padding.bottom}
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                )}
                
                {/* Data point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered || isLast ? 6 : 4}
                  fill={isHovered || isLast ? "#818cf8" : "rgba(129, 140, 248, 0.6)"}
                  stroke="white"
                  strokeWidth={isHovered || isLast ? 2 : 1}
                  className="cursor-pointer transition-all"
                  onMouseEnter={() => setHoveredIndex(index)}
                  style={{ filter: isHovered ? 'drop-shadow(0 0 6px rgba(129, 140, 248, 0.8))' : 'none' }}
                />
              </g>
            );
          })}

          {/* Hover tooltip */}
          {hoveredData && hoveredIndex !== null && (
            <g>
              <rect
                x={scaleX(hoveredIndex) - 60}
                y={scaleY(hoveredData.pnl) - 70}
                width="120"
                height="60"
                rx="8"
                fill="rgba(10, 10, 15, 0.95)"
                stroke="rgba(129, 140, 248, 0.5)"
                strokeWidth="1"
                className="backdrop-blur-sm"
              />
              <text
                x={scaleX(hoveredIndex)}
                y={scaleY(hoveredData.pnl) - 45}
                textAnchor="middle"
                className="text-xs fill-gray-400"
              >
                {new Date(hoveredData.date).toLocaleDateString()}
              </text>
              <text
                x={scaleX(hoveredIndex)}
                y={scaleY(hoveredData.pnl) - 25}
                textAnchor="middle"
                className={`text-sm font-bold ${
                  hoveredData.pnl >= 0 ? 'fill-green-400' : 'fill-red-400'
                }`}
              >
                {hoveredData.pnl >= 0 ? '+' : ''}${hoveredData.pnl.toLocaleString()}
              </text>
            </g>
          )}

          {/* X-axis labels */}
          {data.length > 0 && (
            <>
              <text
                x={padding.left}
                y={height - padding.bottom + 20}
                textAnchor="start"
                className="text-xs fill-gray-500"
              >
                {new Date(data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
              <text
                x={width - padding.right}
                y={height - padding.bottom + 20}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                {new Date(data[data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </text>
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
