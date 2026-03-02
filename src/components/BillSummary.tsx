import { TrendingUp, Zap, Calendar, IndianRupee } from 'lucide-react';
import { formatCurrency } from '../utils/billCalculator';

interface BillSummaryProps {
  totalUnits: number;
  estimatedBill: number;
  billingPeriod: number;
  isToday: boolean;
  todayUsage: number;
  dateRange?: string;
}

export default function BillSummary({
  totalUnits,
  estimatedBill,
  billingPeriod,
  dateRange,
  isToday,
  todayUsage,
}: BillSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <IndianRupee className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Bill Amount
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{formatCurrency(estimatedBill)}</div>
        <div className="text-sm text-blue-100">Current Billing Period</div>
      </div>

      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Zap className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Total Units
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{totalUnits.toFixed(3)} kWh</div>
        <div className="text-sm text-orange-100">
          {dateRange ? dateRange : `${billingPeriod} Month Period`}
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            {isToday ? 'Today' : 'Selected Day'}
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{todayUsage.toFixed(3)} kWh</div>
        <div className="text-sm text-purple-100">Daily Consumption</div>
      </div>

      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-teal-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
            Billing Cycle
          </span>
        </div>
        <div className="text-3xl font-bold mb-1">{billingPeriod}</div>
        <div className="text-sm text-teal-100">Month{billingPeriod > 1 ? 's' : ''}</div>
      </div>
    </div>
  );
}
