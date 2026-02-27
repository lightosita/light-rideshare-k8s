'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Check, Loader2 } from 'lucide-react';

import RideRequestModal from './rideRequestModal';
import {
  HiHome,
  HiCash,
  HiClock,
} from 'react-icons/hi';
import { DashboardData, EarningsData, NavItem, RideRequest, Trip, TripsResponse } from '@/types/driver';

import DashboardContent from './driver/DashboardContent';
import ConnectionStatus from './driver/ConnectionStatus';
import Sidebar from './driver/Sidebar';
import { useWS } from '@/hooks/WebsocketProvider';
import { driverApi } from '@/utils/driverApi';

interface Location {
  lat: number;
  lng: number;
  accuracy?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HiHome },
  { id: 'earnings', label: 'Earnings', icon: HiCash },
  { id: 'trips', label: 'Trip History', icon: HiClock },
];

export default function DriverDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, updateUser, logout, token } = useAuth();
  const { connectionStatus, send, on, role } = useWS();


  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [tripsData, setTripsData] = useState<TripsResponse | null>(null);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [activeRideRequest, setActiveRideRequest] = useState<RideRequest | null>(null);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const locationWatchId = useRef<number | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!token || !user?.id) return;

    setIsLoading(true);
    setLoadingError(null);

    try {
      const [dashboard, earnings, trips, activeTripData] = await Promise.all([
        driverApi.getDashboard('all'),
        driverApi.getEarnings({ timeRange: 'all' }),
        driverApi.getTrips({ limit: 5 }),
        driverApi.getActiveTrip(),
      ]);

      setDashboardData(dashboard);
      setEarningsData(earnings);
      setTripsData(trips);
      setActiveTrip(activeTripData.trip);
      console.log('Dashboard data fetched:', { activeTrip: activeTripData.trip });
      toast.success('Dashboard data loaded');
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      setLoadingError(error.message || 'Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [token, user?.id]);


  const refreshEarnings = useCallback(async () => {
    if (!token) return;
    try {
      const data = await driverApi.getEarnings({ timeRange: 'all' });
      setEarningsData(data);
    } catch (error) {
      console.error('Failed to refresh earnings:', error);
    }
  }, [token]);

  const refreshTrips = useCallback(async () => {
    if (!token) return;
    try {
      const data = await driverApi.getTrips({ limit: 5 });
      setTripsData(data);
    } catch (error) {
      console.error('Failed to refresh trips:', error);
    }
  }, [token]);

  const refreshActiveTrip = useCallback(async () => {
    if (!token) return;
    try {
      const data = await driverApi.getActiveTrip();
      setActiveTrip(data.trip);
    } catch (error) {
      console.error('Failed to refresh active trip:', error);
    }
  }, [token]);


  useEffect(() => {
    if (token && user?.id) {
      fetchDashboardData();
    }
  }, [token, user?.id, fetchDashboardData]);


  const getCurrentLocation = useCallback((): Promise<Location> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = new Error('Geolocation not supported');
        setLocationError(error.message);
        return reject(error);
      }

      setIsLocationLoading(true);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setIsLocationLoading(false);
          const loc = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          setCurrentLocation(loc);
          setLocationError(null);
          resolve(loc);
        },
        (err) => {
          setIsLocationLoading(false);
          let message = 'Unable to get location';
          if (err.code === err.PERMISSION_DENIED) message = 'Location permission denied';
          if (err.code === err.POSITION_UNAVAILABLE) message = 'Location unavailable';
          if (err.code === err.TIMEOUT) message = 'Location timeout';

          setLocationError(message);
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      await getCurrentLocation();
    } catch {}
  }, [getCurrentLocation]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  useEffect(() => {
    if (!isOnline) return;

    refreshLocation();

    if (navigator.geolocation) {
      locationWatchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCurrentLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setLocationError(null);
        },
        console.warn,
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }

    return () => {
      if (locationWatchId.current !== null) {
        navigator.geolocation.clearWatch(locationWatchId.current);
        locationWatchId.current = null;
      }
    };
  }, [isOnline, refreshLocation]);

 
  useEffect(() => {
    if (role !== 'driver') return;

    const handler = (msg: any) => {
      if (msg.event === 'ping') {
        send({ type: 'pong' });
        return;
      }

      if (msg.event === 'ride.proposed' && msg.data) {
        const d = msg.data;
        setActiveRideRequest({
          id: d.ride_request_id ?? 'unknown',
          riderName: d.rider_name ?? 'Passenger',
          riderRating: d.rider_rating ?? 4.5,
          riderPhone: d.rider_phone ?? '+2340000000000',
          pickupAddress: d.pickup_address || `Nearby • ${d.distance_km?.toFixed(1)} km`,
          dropoffAddress: d.dropoff_address || 'Short trip',
          estimatedFare: d.estimated_fare ?? 1000,
          distance: Number(d.distance_km || 0),
          duration: Math.round(d.duration_min || 0),
          expiresAt: new Date(Date.now() + 30000),
          riderId: d.rider_id,
          pickupLocation: d.pickup_location,
          dropoffLocation: d.dropoff_location,
        });
      }

      if (msg.event === 'ride.cancelled' || msg.event === 'ride.expired') {
        setActiveRideRequest(null);
      }

      if (
        msg.event === 'trip.status_updated' ||
        msg.event === 'trip.completed' ||
        msg.event === 'trip.payment_processed'
      ) {
        refreshEarnings();
        refreshTrips();
        refreshActiveTrip();
      }
    };

    const unsub = on(handler);
    return () => unsub();
  }, [role, on, send, refreshEarnings, refreshTrips, refreshActiveTrip]);

  
  useEffect(() => {
    if (!isOnline || connectionStatus !== 'connected' || !currentLocation || !token || !user?.id)
      return;

    const sendLocation = async () => {
      try {
        await driverApi.updateLocation({
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          heading: 0,
          speedKmh: 0,
        });

        send({
          type: 'driver.location_update',
          driver_id: user.id,
          location: { lat: currentLocation.lat, lng: currentLocation.lng },
          timestamp: new Date().toISOString(),
        });
      } catch {}
    };

    sendLocation();
    const interval = setInterval(sendLocation, 10000);
    return () => clearInterval(interval);
  }, [isOnline, connectionStatus, currentLocation, token, user?.id, send]);


  const handleAcceptRide = useCallback(() => {
    if (!activeRideRequest || !user?.id) return;

    send({
      type: 'ride.accept',
      ride_request_id: activeRideRequest.id,
      driver_id: user.id,
      timestamp: new Date().toISOString(),
    });

    const tripUrl = `/driver/dashboard/trip/${activeRideRequest.id}`;

    toast.success('Ride accepted — taking you to the trip...', {
      duration: 4000,
      icon: '🚗',
    });
    setActiveRideRequest(null);
    router.replace(tripUrl);

  }, [activeRideRequest, user?.id, send, router]);

  const handleDeclineRide = () => {
    if (!activeRideRequest || !user?.id) return;

    send({
      type: 'ride.decline',
      ride_request_id: activeRideRequest.id,
      driver_id: user.id,
    });

    setActiveRideRequest(null);
    toast('Ride declined', { icon: '👋' });
  };


  const handleToggleOnline = useCallback(
    async (online: boolean) => {
      if (!token || !user) return alert('Please log in');

      if (online) {
        let location = currentLocation;
        if (!location) {
          try {
            location = await getCurrentLocation();
          } catch {
            location = { lat: 6.5244, lng: 3.3792 }; 
          }
        }

        if (connectionStatus === 'connected') {
          send({
            type: 'driver.ready',
            driver_id: user.id,
            location: { lat: location.lat, lng: location.lng },
            timestamp: new Date().toISOString(),
          });
        }
      }

      try {
        await driverApi.updateAvailability(online);
        setIsOnline(online);
        updateUser({ isAvailable: online });

        if (online) {
          fetchDashboardData();
        }
      } catch (err: any) {
        alert(err.message || 'Failed to update availability');
        setIsOnline(!online); 
      }
    },
    [
      token,
      user,
      currentLocation,
      getCurrentLocation,
      connectionStatus,
      send,
      updateUser,
      fetchDashboardData,
    ]
  );


  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      );
    }

    if (loadingError) {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{loadingError}</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (activeNav !== 'dashboard') {
      return (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">
            {navItems.find((i) => i.id === activeNav)?.label}
          </h2>
          <p className="text-gray-600">Section under development...</p>
        </div>
      );
    }

    return (
      <DashboardContent
        isOnline={isOnline}
        connectionStatus={connectionStatus}
        currentLocation={currentLocation}
        locationError={locationError}
        isLocationLoading={isLocationLoading}
        onRefreshLocation={refreshLocation}
        dashboardData={dashboardData}
        earningsData={earningsData}
        tripsData={tripsData}
        activeTrip={activeTrip}
        onRefreshData={fetchDashboardData}
        onNavigate={setActiveNav}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatus isOnline={isOnline} connectionStatus={connectionStatus} />

      <Sidebar
        activeNav={activeNav}
        navItems={navItems}
        user={user}
        isOnline={isOnline}
        onNavChange={setActiveNav}
        onToggleOnline={handleToggleOnline}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Driver Dashboard</h1>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Refresh
          </button>
        </div>

        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>

      {activeRideRequest && (
        <RideRequestModal
          request={activeRideRequest}
          onAccept={handleAcceptRide}
          onDecline={handleDeclineRide}
        />
      )}

    </div>
  );
}