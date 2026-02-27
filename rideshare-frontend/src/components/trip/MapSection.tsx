'use client';
import { useState } from 'react';
import LiveDriverMap from '../maps/LiveDriverMap';

interface MapSectionProps {
  driverLocation: {lat: number; lng: number} | null;
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  routeCoordinates: Array<{lat: number; lng: number}>;
  driverName: string;
  vehicleType: string;
  driverStatus: 'en_route' | 'arrived' | 'waiting';
  showMapError: boolean;
  locationError: string | null;
  onRefreshLocation: () => Promise<void>;
}

export default function MapSection({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  routeCoordinates,
  driverName,
  vehicleType,
  driverStatus,
  showMapError,
  locationError,
  onRefreshLocation
}: MapSectionProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshLocation();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">Live Trip Map</h2>
          <p className="text-gray-600 text-sm">Real-time tracking of your route</p>
        </div>
        <div className="h-96">
          {driverLocation ? (
            <LiveDriverMap 
              driverLocation={driverLocation}
              pickupLocation={pickupLocation}
              dropoffLocation={dropoffLocation}
              routeCoordinates={routeCoordinates}
              
             
            />
          ) : showMapError ? (
            <div className="h-full flex flex-col items-center justify-center p-8">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Map Loading Issue</h3>
              <p className="text-gray-600 text-center mb-4">
                {locationError || 'Unable to load map. This could be due to missing Mapbox token or location permissions.'}
              </p>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:opacity-70"
              >
                {isRefreshing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Refreshing...
                  </>
                ) : (
                  'Try Again'
                )}
              </button>
              <p className="text-sm text-gray-500 mt-4">
                If the issue persists, check your Mapbox token configuration.
              </p>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-700 font-medium">Loading Map...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}