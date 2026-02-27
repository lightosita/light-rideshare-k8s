'use client';

import RequestRideMap from "../maps/MapContainer";

interface LocationMapProps {
  currentLocation: { lat: number; lng: number } | null;
  isOnline: boolean;
  fullSize?: boolean;
}

export default function LocationMap({ currentLocation, isOnline, fullSize = false }: LocationMapProps) {
  if (!isOnline) {
    return (
      <div className={`w-full ${fullSize ? 'h-96' : 'h-64'} bg-gray-200 rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <p className="text-gray-500 mb-2">Go online to see your location</p>
          <div className="w-8 h-8 bg-gray-400 rounded-full mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!currentLocation) {
    return (
      <div className={`w-full ${fullSize ? 'h-96' : 'h-64'} bg-gray-200 rounded-lg flex items-center justify-center`}>
        <p className="text-gray-500">Getting your location...</p>
      </div>
    );
  }

  const driverLocation = {
    latitude: currentLocation.lat,
    longitude: currentLocation.lng,
    address: "Your current location"
  };

  return (
    <div className={`w-full ${fullSize ? 'h-96' : 'h-64'} rounded-lg overflow-hidden relative`}>
      <RequestRideMap 
        driverLocation={driverLocation}
        showRoute={false}
      />
      {!fullSize && (
        <div className="absolute bottom-4 left-4 bg-white px-3 py-2 rounded-lg shadow-md">
          <p className="text-sm text-gray-700 font-medium">Your Location</p>
          <p className="text-xs text-gray-600">
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </p>
        </div>
      )}
    </div>
  );
}