'use client';

interface TripStatsProps {
  estimatedFare?: number;
  totalDistance?: number;
  traveledDistance: number;
  estimatedTime?: string;
  estimatedArrival: string;
  paymentMethod?: string;
  pickupTime?: string;
  stage: string;
}

export default function TripStats({
  estimatedFare,
  totalDistance,
  traveledDistance,
  estimatedTime,
  estimatedArrival,
  paymentMethod,
  pickupTime,
  stage
}: TripStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Trip Information</h2>
      <div className="space-y-4">
        {estimatedFare !== undefined && (
          <div>
            <p className="text-gray-600">Estimated Fare</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(estimatedFare)}</p>
          </div>
        )}
        {totalDistance !== undefined && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600">Total Distance</p>
              <p className="text-xl font-semibold">{totalDistance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-gray-600">Traveled</p>
              <p className="text-xl font-semibold">{traveledDistance.toFixed(1)} km</p>
            </div>
          </div>
        )}
        {estimatedTime && (
          <div>
            <p className="text-gray-600">Est. Duration</p>
            <p className="text-xl font-semibold">{estimatedTime}</p>
          </div>
        )}
        <div>
          <p className="text-gray-600">
            {stage === 'en_route' ? 'Est. Pickup Time' : 'Est. Arrival Time'}
          </p>
          <p className="text-xl font-semibold">{estimatedArrival}</p>
        </div>
        {paymentMethod && (
          <div className="pt-4 border-t">
            <p className="text-gray-600">Payment Method</p>
            <p className="text-lg font-semibold">{paymentMethod}</p>
          </div>
        )}
        {pickupTime && (
          <div className="pt-4 border-t">
            <p className="text-gray-600">Pickup Time</p>
            <p className="text-lg font-semibold">{pickupTime}</p>
          </div>
        )}
      </div>
    </div>
  );
}