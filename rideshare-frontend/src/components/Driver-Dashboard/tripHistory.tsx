
'use client';

import { useState } from 'react';

interface Trip {
  id: string;
  date: Date;
  riderName: string;
  pickup: string;
  dropoff: string;
  fare: number;
  rating: number;
  duration: number;
}

export default function TripHistory() {
  const [trips] = useState<Trip[]>([
    {
      id: '1',
      date: new Date('2024-01-15'),
      riderName: 'Sarah Johnson',
      pickup: '123 Main St',
      dropoff: '456 Business District',
      fare: 2800,
      rating: 5,
      duration: 18,
    },
    {
      id: '2',
      date: new Date('2024-01-14'),
      riderName: 'Mike Chen',
      pickup: '789 Market St',
      dropoff: '321 Residential Area',
      fare: 3200,
      rating: 4,
      duration: 22,
    },
 
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recent Trips</h2>
        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
          View All
        </button>
      </div>

      <div className="space-y-4">
        {trips.map((trip) => (
          <div key={trip.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-medium">{trip.riderName}</h3>
                <p className="text-sm text-gray-600">{formatDate(trip.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600">{formatCurrency(trip.fare)}</p>
                <div className="flex items-center justify-end">
                  <span className="text-yellow-400 mr-1">★</span>
                  <span className="text-sm">{trip.rating}</span>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 space-y-1">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>{trip.pickup}</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>{trip.dropoff}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
              <span>{trip.duration} minutes</span>
              <button className="text-blue-600 hover:text-blue-700">
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}