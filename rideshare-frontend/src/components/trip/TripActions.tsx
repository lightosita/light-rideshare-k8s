'use client';

interface TripActionsProps {
  stage: string;
  buttonStage?: 'arrived' | 'pickup' | 'complete' | 'waiting'; // Add this prop
  isUpdatingStage: boolean;
  isCompletingTrip: boolean;
  driverLocation: {lat: number; lng: number} | null;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  onArriveAtPickup?: () => Promise<void>;  // Make these optional
  onRiderPickedUp?: () => Promise<void>;   // Make these optional
  onCompleteTrip?: () => Promise<void>;    // Make these optional
  onCancelWait?: () => void;               // Make these optional
  onRefreshLocation: () => Promise<void>;
}

export default function TripActions({
  stage,
  buttonStage = 'arrived', // Default value
  isUpdatingStage,
  isCompletingTrip,
  driverLocation,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  onArriveAtPickup,
  onRiderPickedUp,
  onCompleteTrip,
  onCancelWait,
  onRefreshLocation
}: TripActionsProps) {
  
  // Use buttonStage if provided, otherwise fall back to stage
  const currentStage = buttonStage || 
    (stage === 'en_route' ? 'arrived' : 
     stage === 'arrived' ? 'pickup' : 
     stage === 'picked_up' || stage === 'in_progress' ? 'complete' : 'waiting');

  const renderActionButton = () => {
    switch (currentStage) {  // Use currentStage instead of stage
      case 'arrived':
        return (
          <button
            onClick={onArriveAtPickup}
            disabled={isUpdatingStage || !onArriveAtPickup}
            className={`w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
              isUpdatingStage || !onArriveAtPickup ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'
            }`}
          >
            {isUpdatingStage ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Updating...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                I've Arrived at Pickup
              </>
            )}
          </button>
        );
      case 'pickup':
        return (
          <>
            <button
              onClick={onRiderPickedUp}
              disabled={isUpdatingStage || !onRiderPickedUp}
              className={`w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                isUpdatingStage || !onRiderPickedUp ? 'opacity-70 cursor-not-allowed' : 'hover:bg-green-700'
              }`}
            >
              {isUpdatingStage ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Rider Picked Up
                </>
              )}
            </button>
            <button
              onClick={onCancelWait}
              disabled={!onCancelWait}
              className={`w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
                !onCancelWait ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-700'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel Wait
            </button>
          </>
        );
      case 'complete':
        return (
          <button
            onClick={onCompleteTrip}
            disabled={isCompletingTrip || !onCompleteTrip}
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center ${
              isCompletingTrip || !onCompleteTrip
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isCompletingTrip ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Completing Trip...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Complete Trip
              </>
            )}
          </button>
        );
      default:
        return (
          <div className="text-center py-4 text-gray-500">
            No actions available
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Trip Actions</h2>
        <div className="space-y-3">
          {renderActionButton()}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Navigation</h2>
        <div className="space-y-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&origin=${driverLocation?.lat || pickupLat},${driverLocation?.lng || pickupLng}&destination=${pickupLat},${pickupLng}&travelmode=driving`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            Open in Google Maps
          </a>
          
          {(currentStage === 'complete' || stage === 'picked_up' || stage === 'in_progress') && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${pickupLat},${pickupLng}&destination=${dropoffLat},${dropoffLng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Route to Destination
            </a>
          )}
          
          <button
            onClick={onRefreshLocation}
            className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center justify-center border"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh Location
          </button>
        </div>
      </div>
    </div>
  );
}