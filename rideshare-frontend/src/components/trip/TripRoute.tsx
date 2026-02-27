'use client';

interface TripRouteProps {
  stage: string;
  progress: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  progressLabel: string;
}

export default function TripRoute({
  stage,
  progress,
  pickupAddress,
  dropoffAddress,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  progressLabel
}: TripRouteProps) {
  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Trip Route</h2>
      
      <div className="mt-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-medium">
            {stage === 'en_route' ? '🚗 Driving to pickup' : '📍 Pickup'}
          </span>
          <span className="font-medium">{progress.toFixed(0)}%</span>
          <span className="font-medium">📍 Dropoff</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden relative">
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-400"></div>
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs bg-white px-2 py-1 rounded border">
            50%
          </div>
          
          <div 
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-500 mt-2 text-center">{progressLabel}</p>
      </div>

      <div className="space-y-4 mt-6">
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            stage === 'en_route' ? 'bg-green-500' : 'bg-green-100'
          }`}>
            <span className={`${stage === 'en_route' ? 'text-white' : 'text-green-800'} text-sm`}>
              {stage !== 'en_route' ? '✓' : '→'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium">Pickup Location</p>
            <p className="text-gray-600">{pickupAddress}</p>
            <p className="text-gray-500 text-sm mt-1">
              📍 Coordinates: {pickupLat.toFixed(6)}, {pickupLng.toFixed(6)}
            </p>
          </div>
        </div>
        
        <div className="flex items-start space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            stage === 'picked_up' || stage === 'completed' ? 'bg-red-500' : 'bg-gray-200'
          }`}>
            <span className={`${
              stage === 'picked_up' || stage === 'completed' ? 'text-white' : 'text-gray-500'
            } text-sm`}>
              {stage === 'completed' ? '✓' : 'B'}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-medium">Dropoff Location</p>
            <p className="text-gray-600">{dropoffAddress}</p>
            <p className="text-gray-500 text-sm mt-1">
              📍 Coordinates: {dropoffLat.toFixed(6)}, {dropoffLng.toFixed(6)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}