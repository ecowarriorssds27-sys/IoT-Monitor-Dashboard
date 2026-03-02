import { formatCurrency } from '../utils/billCalculator';

export interface DailyUsageSummary {
  date: string;
  total_energy: number;
  cost: number;
}

interface UsageChartProps {
  dailyData: DailyUsageSummary[];
}

export default function UsageChart({ dailyData }: UsageChartProps) {
  const last7Days = dailyData.slice(0, 7).reverse();
  const maxEnergy = Math.max(...last7Days.map(d => d.total_energy), 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
      <h2 className="text-xl font-bold mb-6 text-gray-900">Last 7 Days Usage</h2>

      <div className="space-y-4">
        {last7Days.map((day, index) => {
          const date = new Date(day.date);
          const percentage = (day.total_energy / maxEnergy) * 100;

          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900 w-24">
                    {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-gray-900">
                    {day.total_energy.toFixed(2)} kWh
                  </span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(day.cost)}
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {last7Days.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          No usage data available yet
        </div>
      )}
    </div>
  );
}
