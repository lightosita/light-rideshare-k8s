'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import ActiveRide from '@/src/components/Driver-Dashboard/activeTrip';
import { TripData } from '@/types/trip';



export default function ActiveTripPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || "http://localhost:3005/api";

  const fetchActiveTrip = useCallback(async () => {
    if (!token || !user?.id) {
      router.replace('/driver/dashboard');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/trips/driver/${user.id}/active`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const body = await res.json();
      
      if (res.ok && body?.success && body?.data?.trip) {
        setTrip(body.data.trip);
      } else {
        setError('No active trip found.');
        router.push('/driver/dashboard');
      }
    } catch (err: any) {
      setError('Could not load active trip.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, router, API_BASE]);

  useEffect(() => {
    fetchActiveTrip();
  }, [fetchActiveTrip]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-indigo-600 mx-auto"></div>
          <p className="mt-6 text-lg text-gray-400">Loading trip details...</p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
        <p>{error || 'Trip not found'}</p>
      </div>
    );
  }

  return (
    <ActiveRide
      rideRequestId={trip.ride_request_id}
      status={trip.status as any}
      riderInfo={{
        name: trip.rider_info?.name || 'Rider',
        phone: trip.rider_info?.phone || 'No phone provided',
        rating: trip.rider_info?.rating || 5.0,
        id: trip.rider_info?.id || '',
      }}
      pickupLocation={{
        lat: trip.pickup_lat,
        lng: trip.pickup_lng,
        address: trip.pickup_address,
      }}
      dropoffLocation={{
        lat: trip.dropoff_lat,
        lng: trip.dropoff_lng,
        address: trip.dropoff_address,
      }}
      fareEstimate={trip.estimated_fare}
      userId={user?.id || ''}
      liveDriverLocation={null} 
    />
  );
}