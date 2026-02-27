
'use client';
import { DashboardData, EarningsData, Trip, TripsResponse } from '@/types/driver';
import { HiRefresh, HiLocationMarker, HiWifi, HiCheckCircle, HiExclamationCircle, HiCash, HiClock, HiChartBar } from 'react-icons/hi';


interface DashboardContentProps {
  isOnline: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  currentLocation: { lat: number; lng: number; accuracy?: number } | null;
  locationError: string | null;
  isLocationLoading: boolean; 
  onRefreshLocation: () => Promise<void>;
  dashboardData: DashboardData | null;
  earningsData: EarningsData | null;
  tripsData: TripsResponse | null;
  activeTrip: Trip | null;
  onRefreshData: () => Promise<void>;
  onNavigate?: (navId: string) => void;
}

export default function DashboardContent({
  isOnline,
  connectionStatus,
  currentLocation,
  locationError,
  isLocationLoading,
  onRefreshLocation,
  dashboardData,
  earningsData,
  tripsData,
  activeTrip,
  onRefreshData,
  onNavigate,
}: DashboardContentProps) {
  const formatCoordinate = (coord: number) => {
    return coord.toFixed(6);
  };

  const getLocationStatus = () => {
    if (isLocationLoading) return 'loading';
    if (locationError) return 'error';
    if (currentLocation) return 'active';
    return 'inactive';
  };

  const locationStatus = getLocationStatus();

  const handleRefreshLocation = async () => {
    await onRefreshLocation();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format time
  const formatOnlineTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };


  const handleNavigate = (navId: string) => {
    if (onNavigate) {
      onNavigate(navId);
    }
  };



  const getTripsToday = () => {
    if (!dashboardData?.summary?.total_trips) return 0;
    return dashboardData.summary.total_trips;
  };

  const getRating = () => {
    if (!dashboardData?.summary?.average_rating) return 4.8;
    return dashboardData.summary.average_rating;
  };


  const getCurrentBalance = () => {
    if (!dashboardData?.summary?.current_balance) return 0;
    return dashboardData.summary.current_balance;
  };

 
  const getOnlineTime = () => {
    return 0; 
  };


  const getCurrentStreak = () => {
    return 0; 
  };

  const getAcceptanceRate = () => {
    return 'N/A'; 
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Driver Dashboard</h2>
        <button
          onClick={onRefreshData}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-colors"
        >
          <HiRefresh className="w-4 h-4" />
          Refresh All Data
        </button>
      </div>
      
      {/* Quick Stats with real data */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <HiCash className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-gray-600">Today's Earnings</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(getCurrentBalance())}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Current balance: {formatCurrency(getCurrentBalance())}
          </p>
        </div>
        
        <div className="p-4 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <HiClock className="w-4 h-4 text-green-600" />
            <p className="text-sm text-gray-600">Trips Today</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {getTripsToday()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Acceptance rate: {getAcceptanceRate()}
          </p>
        </div>
        
        <div className="p-4 bg-yellow-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <HiChartBar className="w-4 h-4 text-yellow-600" />
            <p className="text-sm text-gray-600">Rating</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {getRating().toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Based on {dashboardData?.summary?.total_trips || 0} trips
          </p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <HiClock className="w-4 h-4 text-purple-600" />
            <p className="text-sm text-gray-600">Online Time</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatOnlineTime(getOnlineTime())}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {getCurrentStreak() > 0 ? `${getCurrentStreak()} day streak` : 'Start your streak'}
          </p>
        </div>
      </div>
      
      {/* Connection & Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`p-4 rounded-lg ${isOnline ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            <div>
              <p className="font-medium text-gray-700">Status</p>
              <p className={`text-lg font-bold ${isOnline ? 'text-green-600' : 'text-gray-600'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          connectionStatus === 'connected' ? 'bg-blue-50 border border-blue-200' : 
          connectionStatus === 'connecting' ? 'bg-yellow-50 border border-yellow-200' : 
          'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-center gap-3">
            <HiWifi className={`w-5 h-5 ${
              connectionStatus === 'connected' ? 'text-blue-500' : 
              connectionStatus === 'connecting' ? 'text-yellow-500' : 
              'text-red-500'
            }`} />
            <div>
              <p className="font-medium text-gray-700">WebSocket</p>
              <p className={`text-lg font-bold ${
                connectionStatus === 'connected' ? 'text-blue-600' : 
                connectionStatus === 'connecting' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? 'Connected' : 
                 connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </p>
              {connectionStatus === 'connected' && (
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <HiCheckCircle className="w-3 h-3 mr-1" />
                  Sending live updates
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className={`p-4 rounded-lg ${
          locationStatus === 'active' ? 'bg-green-50 border border-green-200' :
          locationStatus === 'loading' ? 'bg-blue-50 border border-blue-200' :
          locationStatus === 'error' ? 'bg-red-50 border border-red-200' :
          'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center gap-3">
            <HiLocationMarker className={`w-5 h-5 ${
              locationStatus === 'active' ? 'text-green-500' :
              locationStatus === 'loading' ? 'text-blue-500 animate-pulse' :
              locationStatus === 'error' ? 'text-red-500' :
              'text-gray-500'
            }`} />
            <div>
              <p className="font-medium text-gray-700">Location</p>
              <p className={`text-lg font-bold ${
                locationStatus === 'active' ? 'text-green-600' :
                locationStatus === 'loading' ? 'text-blue-600' :
                locationStatus === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {locationStatus === 'active' ? 'Live Tracking' :
                 locationStatus === 'loading' ? 'Getting...' :
                 locationStatus === 'error' ? 'Error' : 'Not Available'}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Active Trip Status */}
      {activeTrip && (
        <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              Active Trip
            </h3>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-full">
              #{activeTrip.trip_id ? activeTrip.trip_id.slice(-6) : 'N/A'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Status</p>
              <p className="text-sm font-medium text-green-600 capitalize">
                {activeTrip.status || 'Active'}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Fare</p>
              <p className="text-sm font-medium">
                {formatCurrency(activeTrip.estimated_fare || activeTrip.actual_fare || 0)}
              </p>
            </div>
            <div className="bg-white p-3 rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Passenger</p>
              <p className="text-sm font-medium">
                {activeTrip.rider?.name || 'Passenger'}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.location.href = `/driver/dashboard/trip/${activeTrip.trip_id || 'active'}`}
            className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Go to Trip Details
          </button>
        </div>
      )}
      
      {/* Location Details */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <HiLocationMarker className="w-5 h-5 text-blue-500" />
            Current Location
          </h3>
          <button
            onClick={handleRefreshLocation}
            disabled={isLocationLoading}
            className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-colors ${
              isLocationLoading 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <HiRefresh className={`w-4 h-4 ${isLocationLoading ? 'animate-spin' : ''}`} />
            {isLocationLoading ? 'Refreshing...' : 'Refresh Location'}
          </button>
        </div>
        
        {isLocationLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-600">Getting your current location...</p>
            <p className="text-xs text-gray-500 mt-2">Please wait a moment</p>
          </div>
        ) : currentLocation ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs text-gray-500 mb-1 flex items-center">
                  <HiLocationMarker className="w-3 h-3 mr-1" />
                  Latitude
                </p>
                <p className="font-mono text-lg font-bold text-gray-900">
                  {formatCoordinate(currentLocation.lat)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs text-gray-500 mb-1 flex items-center">
                  <HiLocationMarker className="w-3 h-3 mr-1" />
                  Longitude
                </p>
                <p className="font-mono text-lg font-bold text-gray-900">
                  {formatCoordinate(currentLocation.lng)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {currentLocation.accuracy && (
                <div className="bg-white p-3 rounded-lg border">
                  <p className="text-xs text-gray-500 mb-1">Accuracy</p>
                  <p className="text-sm font-medium">
                    ±{currentLocation.accuracy.toFixed(1)} meters
                  </p>
                  {currentLocation.accuracy < 50 && (
                    <p className="text-xs text-green-600 mt-1">High accuracy</p>
                  )}
                </div>
              )}
              
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                  }`} />
                  <p className="text-sm font-medium">
                    {isOnline ? 'Sharing live' : 'Not sharing'}
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">WebSocket</p>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    connectionStatus === 'connected' ? 'bg-green-500' :
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                    'bg-red-500'
                  }`} />
                  <p className="text-sm font-medium capitalize">{connectionStatus}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start">
                <div className="w-5 h-5 text-blue-500 mt-0.5 mr-2">📍</div>
                <div>
                  <p className="text-sm text-blue-800">
                    {isOnline && connectionStatus === 'connected' 
                      ? "Your location is being shared in real-time with the ride dispatch system. You'll receive ride requests based on your current position."
                      : "Go online to start receiving ride requests based on your location."
                    }
                  </p>
                  {isOnline && connectionStatus === 'connected' && currentLocation && (
                    <p className="text-xs text-blue-600 mt-2">
                      Last update: Just now
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : locationError ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HiExclamationCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <h4 className="font-medium text-red-800 mb-2">Location Unavailable</h4>
                <p className="text-sm text-red-600 mb-3">{locationError}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleRefreshLocation}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.permissions) {
                        navigator.permissions.query({ name: 'geolocation' })
                          .then((permissionStatus) => {
                            if (permissionStatus.state === 'denied') {
                              alert('Please enable location permissions in your browser settings.');
                            } else if (permissionStatus.state === 'prompt') {
                              alert('Please allow location access when prompted.');
                            }
                          });
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    Check Permissions
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <HiLocationMarker className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No location data available</p>
            <p className="text-sm text-gray-500 mb-4">
              Click "Refresh Location" to get your current position
            </p>
            <button
              onClick={handleRefreshLocation}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Get My Location
            </button>
          </div>
        )}
      </div>
      
      {/* Recent Trips */}
      {tripsData?.trips && tripsData.trips.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <span>Recent Trips</span>
            <span className="text-sm text-gray-500 font-normal">
              {tripsData.pagination?.total || tripsData.trips.length} total trips
            </span>
          </h3>
          <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
            {tripsData.trips.slice(0, 3).map((trip: Trip, index: number) => (
              <div 
                key={trip.trip_id || index} 
                className={`p-4 ${index < tripsData.trips.length - 1 ? 'border-b border-gray-200' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">Trip #{trip.trip_id ? trip.trip_id.slice(-6) : `#${index + 1}`}</p>
                    <p className="text-sm text-gray-600">
                      {trip.created_at ? new Date(trip.created_at).toLocaleDateString() : 'Recent'} • {formatCurrency(trip.estimated_fare || trip.actual_fare || 0)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      trip.status === 'completed' ? 'bg-green-100 text-green-800' :
                      trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {trip.status || 'Active'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {trip.rider?.name || 'Passenger'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3 bg-white border-t">
              <button
                onClick={() => handleNavigate('trips')}
                className="w-full py-2 text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View All Trips →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* System Status */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">System Status</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm">Driver Status</span>
            </div>
            <span className={`text-sm font-medium ${
              isOnline ? 'text-green-600' : 'text-gray-600'
            }`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`} />
              <span className="text-sm">WebSocket Connection</span>
            </div>
            <span className={`text-sm font-medium ${
              connectionStatus === 'connected' ? 'text-green-600' :
              connectionStatus === 'connecting' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                locationStatus === 'active' ? 'bg-green-500' :
                locationStatus === 'loading' ? 'bg-blue-500 animate-pulse' :
                locationStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className="text-sm">Location Service</span>
            </div>
            <span className={`text-sm font-medium ${
              locationStatus === 'active' ? 'text-green-600' :
              locationStatus === 'loading' ? 'text-blue-600' :
              locationStatus === 'error' ? 'text-red-600' :
              'text-gray-600'
            }`}>
              {locationStatus === 'active' ? 'Active' :
               locationStatus === 'loading' ? 'Loading...' :
               locationStatus === 'error' ? 'Error' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="border-t pt-6">
        <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => handleNavigate('earnings')}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <p className="font-medium text-gray-900">View Earnings</p>
            <p className="text-sm text-gray-600">Check your daily and weekly earnings</p>
          </button>
          <button 
            onClick={() => handleNavigate('trips')}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <p className="font-medium text-gray-900">Trip History</p>
            <p className="text-sm text-gray-600">View your completed trips</p>
          </button>
          <button 
            onClick={() => handleNavigate('help')}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <p className="font-medium text-gray-900">Support</p>
            <p className="text-sm text-gray-600">Contact support or view FAQ</p>
          </button>
          <button 
            onClick={() => handleNavigate('settings')}
            className="p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 text-left transition-colors"
          >
            <p className="font-medium text-gray-900">Vehicle Details</p>
            <p className="text-sm text-gray-600">Update vehicle information</p>
          </button>
        </div>
      </div>
      
      {/* Tips Section */}
      <div className="mt-8 p-4 bg-linear-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mr-3 shrink-0">
            💡
          </div>
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Tip of the Day</h4>
            <p className="text-sm text-blue-800">
              {isOnline && connectionStatus === 'connected' && currentLocation
                ? "Great! Your location is being shared in real-time. Keep your app open and stay in high-demand areas to get more ride requests."
                : isOnline
                ? "Make sure location services are enabled for accurate ride matching. Drivers with precise locations get 40% more ride requests."
                : "Go online during peak hours (7-9 AM & 5-7 PM) to maximize your earnings potential. Consider areas with high rider demand."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}