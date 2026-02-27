import { RouteInfo, VehicleType } from '@/types/ride';

interface FareEstimateProps {
  isCalculating: boolean;
  fareEstimate: number | null;
  routeInfo: RouteInfo | null;
  vehicleType: VehicleType;
  pickup: any;
  dropoff: any;
}

export default function FareEstimate({
  isCalculating,
  fareEstimate,
  routeInfo,
  vehicleType,
  pickup,
  dropoff
}: FareEstimateProps) {
  if (isCalculating) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">Calculating fare...</div>
        <div className="animate-pulse h-6 bg-gray-200 rounded mt-2"></div>
      </div>
    );
  }

  if (fareEstimate && routeInfo) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-600 mb-2">Estimated Fare</div>
        <div className="text-2xl font-bold text-blue-700 mb-2">
          ₦{fareEstimate.toFixed(2)}
        </div>

        <div className="text-xs text-blue-500 space-y-1">
          <div className="flex justify-between">
            <span>Distance:</span>
            <span>{routeInfo.distance} km</span>
          </div>
          <div className="flex justify-between">
            <span>Duration:</span>
            <span>{routeInfo.duration} min</span>
          </div>
          <div className="flex justify-between">
            <span>Vehicle:</span>
            <span>{vehicleType}</span>
          </div>
        </div>

        <div className="text-xs text-blue-400 mt-2">
          Price may vary based on traffic and route
        </div>
      </div>
    );
  }

  if (pickup && dropoff) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="text-sm text-yellow-600">Calculating fare...</div>
      </div>
    );
  }

  return null;
}