'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/store/authStore';
import ActiveRide from '@/src/components/Dashboard/ActiveRide';
import {RouteCoordinate } from '@/types/ride';
import { useTripWebSocket } from '@/hooks/useTripWebSocket';
import { useRouter } from 'next/navigation';

export default function ActiveRidePage() {
  const { token, user } = useAuth();
  const [rideData, setRideData] = useState<any>(null);
  const [liveDriverLocation, setLiveDriverLocation] = useState<RouteCoordinate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const router = useRouter()

  const API_BASE = process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || "http://localhost:3005/api";

  const fetchActiveRide = useCallback(async (isSilent = false) => {
    if (!token || !user?.id) {
      router.replace('/dashboard');
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/trips/active/rider`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rider_id: user.id }),
        cache: 'no-store',
      });
      if (res.status === 404) {
        setError("You don't have an active ride right now.");
        setRideData(null);
        return;
      }
      const json = await res.json();
      setRideData(json);
      setError(null);
    
      if (json.status === 'completed' && !showCompletionModal) {
        setShowCompletionModal(true);
      }
    } catch (err: any) {
      if (!rideData) setError('Could not load ride details.');
    } finally {
      setLoading(false);
    }
  }, [token, user?.id, API_BASE, rideData, showCompletionModal]);

  const handleWebSocketMessage = useCallback((data: any) => {
    switch(data.event) {
      case 'trip.status_updated':
        if (data.new_status) {
          setRideData((prev: any) => {
            if (!prev) return prev;
            if (data.new_status === 'completed') {
              setShowCompletionModal(true);
            }
            if (data.new_status === 'arrived' || data.new_status === 'started') {
              setTimeout(() => fetchActiveRide(true), 500);
            }
            
            return { 
              ...prev, 
              status: data.new_status 
            };
          });
        }
        break;
        
      case 'driver.location_update':
        if (data.latitude && data.longitude) {
          setLiveDriverLocation({ 
            lat: Number(data.latitude), 
            lng: Number(data.longitude) 
          });
        }
        break;
        
      default:
    }
  }, [fetchActiveRide]);

  useTripWebSocket(user?.id || '', handleWebSocketMessage);

  useEffect(() => {
    if (showCompletionModal) {
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [showCompletionModal, router]);

  useEffect(() => {
    fetchActiveRide(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (rideData && rideData.status !== 'completed') {
        fetchActiveRide(true);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [rideData, fetchActiveRide]);


  const CompletionModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Ride Completed!</h1>
        <p className="text-gray-600 mb-6">
          Your trip has been successfully completed. Thank you for riding with us!
        </p>
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <p className="text-sm text-gray-500 mb-1">Total Fare</p>
          <p className="text-2xl font-bold text-gray-900">
            ₦{rideData?.estimatedFare?.toLocaleString() || '0'}
          </p>
        </div>
        <p className="text-sm text-gray-400 text-center">
          Redirecting to dashboard in 3 seconds...
        </p>
      </div>
    </div>
  );

  if (loading && !rideData) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-12 w-12 border-t-4 border-blue-600 rounded-full" /></div>;
  if (error && !rideData) return <div className="min-h-screen flex items-center justify-center p-4"><p className="text-red-600">{error}</p></div>;
  if (!rideData) return null;

  return (
    <>
      {showCompletionModal && <CompletionModal />}
      <ActiveRide
        rideRequestId={rideData.rideRequestId || rideData.ride_request_id || ''}
        status={rideData.status} 
        driverInfo={rideData.driverInfo}
        pickupLocation={{ lat: Number(rideData.pickupLat), lng: Number(rideData.pickupLng), address: rideData.pickupAddress }}
        dropoffLocation={{ lat: Number(rideData.dropoffLat), lng: Number(rideData.dropoffLng), address: rideData.dropoffAddress }}
        fareEstimate={rideData.estimatedFare ?? 0}
        userId={user?.id || ''}
        liveDriverLocation={liveDriverLocation}
      />
    </>
  );
}