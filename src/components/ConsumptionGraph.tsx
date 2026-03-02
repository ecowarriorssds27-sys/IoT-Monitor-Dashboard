import React, { useMemo } from 'react';
import { PowerReading } from '../lib/firebase';
import { Activity } from 'lucide-react';

interface ConsumptionGraphProps {
  data: PowerReading[];
  date: string;
}

export default function ConsumptionGraph({ data, date }: ConsumptionGraphProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Sort data by time
    const sorted = [...data].sort((a, b) => 
      new Date(`1970/01/01 ${a.time}`).getTime() - new Date(`1970/01/01 ${b.time}`).getTime()
    );

    // Downsample if too many points (take every nth point) to keep SVG performant
    const maxPoints = 100;
    const step = Math.ceil(sorted.length / maxPoints);
    return sorted.filter((_, i) => i % step === 0).map(d => ({
      time: d.time,
      power: d.power,
      // Parse time for x-axis positioning (simple linear mapping)
      timestamp: new Date(`1970/01/01 ${d.time}`).getTime()
    }));
  }, [data]);

  if (chartData.length < 2) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 flex flex-col items-center justify-center h-64 text-gray-500">
        <Activity className="w-12 h-12 mb-2 opacity-20" />
        <p>Not enough data to display graph</p>
      </div>
    );
  }

  // Calculate dimensions
  const width = 800;
  const height = 300;
  const padding = 40;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const minTime = chartData[0].timestamp;
  const maxTime = chartData[chartData.length - 1].timestamp;
  const maxPower = Math.max(...chartData.map(d => d.power)) * 1.1; // Add 10% headroom

  // Coordinate mapping functions
  const getX = (timestamp: number) => padding + ((timestamp - minTime) / (maxTime - minTime)) * graphWidth;
  const getY = (power: number) => height - padding - (power / maxPower) * graphHeight;

  // Generate path
  const pathD = chartData.reduce((path, point, i) => {
    const x = getX(point.timestamp);
    const y = getY(point.power);
    return i === 0 ? `M ${x},${y}` : `${path} L ${x},${y}`;
  }, '');

  // Generate area path (for fill)
  const areaD = `${pathD} L ${getX(chartData[chartData.length - 1].timestamp)},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Activity className="w-6 h-6 text-blue-600" />
        Daily Power Trend ({date})
      </h2>
      <div className="w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(t => {
            const y = height - padding - t * graphHeight;
            return (
              <g key={t}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e5e7eb" strokeDasharray="4" />
                <text x={padding - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
                  {Math.round(t * maxPower)}W
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="rgba(37, 99, 235, 0.1)" />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {/* Time Labels (Start and End) */}
          <text x={padding} y={height - padding + 20} textAnchor="middle" fontSize="10" fill="#6b7280">
            {chartData[0].time}
          </text>
          <text x={width - padding} y={height - padding + 20} textAnchor="middle" fontSize="10" fill="#6b7280">
            {chartData[chartData.length - 1].time}
          </text>
        </svg>
      </div>
    </div>
  );
}
