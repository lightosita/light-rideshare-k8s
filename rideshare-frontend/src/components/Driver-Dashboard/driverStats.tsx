
'use client';

interface DriverStatsProps {
  isOnline: boolean;
  acceptanceRate: number;
  rating: number;
  totalTrips: number;
}

export default function DriverStats({ isOnline, acceptanceRate, rating, totalTrips }: DriverStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-sm font-medium text-gray-600">Status</span>
        </div>
        <p className="text-lg font-semibold mt-1">{isOnline ? 'Online' : 'Offline'}</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-sm font-medium text-gray-600">Acceptance Rate</p>
        <p className="text-lg font-semibold mt-1">{acceptanceRate}%</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-sm font-medium text-gray-600">Rating</p>
        <div className="flex items-center mt-1">
          <span className="text-lg font-semibold mr-2">{rating}</span>
          <div className="flex text-yellow-400">
            {'★'.repeat(Math.floor(rating))}
            {'☆'.repeat(5 - Math.floor(rating))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <p className="text-sm font-medium text-gray-600">Total Trips</p>
        <p className="text-lg font-semibold mt-1">{totalTrips}</p>
      </div>
    </div>
  );
}