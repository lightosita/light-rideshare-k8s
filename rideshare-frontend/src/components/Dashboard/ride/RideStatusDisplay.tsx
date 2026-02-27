import { RideStatus, DriverInfo } from '@/types/ride';

interface RideStatusDisplayProps {
  rideStatus: RideStatus;
  activeRide: DriverInfo | null;
}

export default function RideStatusDisplay({ rideStatus, activeRide }: RideStatusDisplayProps) {
  if (!rideStatus) return null;

  const statusConfig = {
    searching: {
      title: 'Searching for Drivers',
      message: 'Looking for available drivers in your area...',
      color: 'bg-yellow-100 text-yellow-800',
      icon: '🔍'
    },
    driver_assigned: {
      title: 'Driver Considering',
      message: 'A driver is considering your request...',
      color: 'bg-blue-100 text-blue-800',
      icon: '👤'
    },
    matched: {
      title: 'Ride Matched!',
      message: 'Your ride has been matched!',
      color: 'bg-green-100 text-green-800',
      icon: '✅'
    },
    accepted: {
      title: 'Ride Accepted!',
      message: 'Driver is on the way!',
      color: 'bg-green-100 text-green-800',
      icon: '🎉'
    },
    declined: {
      title: 'Ride Declined',
      message: 'Driver declined the ride, searching for another...',
      color: 'bg-red-100 text-red-800',
      icon: '❌'
    },
    driver_timeout: {
      title: 'Driver Unavailable',
      message: 'Driver did not respond, searching for another...',
      color: 'bg-orange-100 text-orange-800',
      icon: '⏰'
    },
    no_drivers: {
      title: 'No Drivers Available',
      message: 'Try again in a few minutes or change your pickup location.',
      color: 'bg-red-100 text-red-800',
      icon: '🚫'
    }
  };

  const config = statusConfig[rideStatus] || {
    title: 'Unknown Status',
    message: 'Something went wrong',
    color: 'bg-gray-100 text-gray-800',
    icon: '❓'
  };

  return (
    <div className={`rounded-lg p-4 ${config.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{config.icon}</span>
        <div>
          <h3 className="font-semibold">{config.title}</h3>
          <p className="text-sm mt-1">{config.message}</p>
          {activeRide && rideStatus === 'accepted' && (
            <div className="mt-2 text-sm">
              <p><strong>Driver:</strong> {activeRide.driver_name || activeRide.firstName}</p>
              <p><strong>Vehicle:</strong> {activeRide.vehicle_type}</p>
              <p><strong>ETA:</strong> {activeRide.estimated_pickup_minutes} minutes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}