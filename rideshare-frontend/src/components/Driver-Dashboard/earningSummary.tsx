
'use client';

import { useState } from 'react';

interface EarningsData {
  today: number;
  week: number;
  month: number;
}

export default function EarningsSummary() {
  const [earnings, setEarnings] = useState<EarningsData>({
    today: 12500,
    week: 85600,
    month: 324500,
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Earnings</h2>
        <select 
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value as any)}
          className="text-sm border border-gray-300 rounded-md px-2 py-1"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-700">Today</span>
          <span className="text-lg font-bold text-blue-900">{formatCurrency(earnings.today)}</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">This Week</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(earnings.week)}</span>
        </div>

        <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
          <span className="text-sm font-medium text-green-700">This Month</span>
          <span className="text-lg font-bold text-green-900">{formatCurrency(earnings.month)}</span>
        </div>
      </div>

      <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
        View Detailed Earnings
      </button>
    </div>
  );
}