'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Phone,
  Loader2,
  AlertCircle,
  Navigation,
} from 'lucide-react';
import toast from 'react-hot-toast';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { completeTripAPI, updateTripStageAPI } from '@/utils/tripAPI';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
if (!MAPBOX_TOKEN) {
  console.error("❌ MAPBOX_TOKEN is missing!");
}
mapboxgl.accessToken = MAPBOX_TOKEN ?? '';

type TripStatus = 'accepted' | 'arrived' | 'started' | 'completed' | 'cancelled' | 'in_progress';

interface ActiveRideProps {
  rideRequestId: string;
  status: TripStatus;
  riderInfo: { name: string; phone: string; rating: number; id: string; };
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  fareEstimate: number;
  userId: string;
  liveDriverLocation?: { lat: number; lng: number } | null;
}

const ActiveRide: React.FC<ActiveRideProps> = ({
  rideRequestId,
  status: initialStatus,
  riderInfo,
  pickupLocation,
  dropoffLocation,
  fareEstimate,
  liveDriverLocation,
}) => {
  const router = useRouter();
  const [tripStatus, setTripStatus] = useState<TripStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  // --- MAP INITIALIZATION ---
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/navigation-night-v1',
      center: [pickupLocation.lng, pickupLocation.lat],
      zoom: 14,
    });

    map.current.on('load', () => {
      map.current?.resize();
      // Initial Marker at Pickup
      marker.current = new mapboxgl.Marker({ color: '#6366f1' })
        .setLngLat([pickupLocation.lng, pickupLocation.lat])
        .addTo(map.current!);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

 
  useEffect(() => {
    if (!map.current || !marker.current) return;

    if (tripStatus === 'started' || tripStatus === 'in_progress') {

      marker.current.setLngLat([dropoffLocation.lng, dropoffLocation.lat]);
      marker.current.getElement().style.color = '#ef4444'; 
      map.current.flyTo({
        center: [dropoffLocation.lng, dropoffLocation.lat],
        zoom: 15,
        essential: true
      });
      
      toast("Route updated to destination", { icon: '📍' });
    }
    
    setTimeout(() => map.current?.resize(), 300);
  }, [tripStatus, dropoffLocation]);

 const handleStatusUpdate = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const loc = liveDriverLocation || { lat: pickupLocation.lat, lng: pickupLocation.lng };
      
      if (tripStatus === 'accepted') {
        await updateTripStageAPI(rideRequestId, 'arrived', loc);
        setTripStatus('arrived');
        setShowSafetyModal(true);
      } 
      else if (tripStatus === 'arrived') {
        await updateTripStageAPI(rideRequestId, 'picked_up', loc); 
        setTripStatus('started');
        toast.success("Trip started!");
      } 
      else if (tripStatus === 'started' || tripStatus === 'in_progress') {
        await completeTripAPI(rideRequestId, 5, 15);
        setTripStatus('completed');
        toast.success("Trip finished! Redirecting...");
        
        setTimeout(() => {
          router.push('/driver/dashboard');
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status. Check backend connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const btnConfig = {
    accepted: { text: "Mark Arrived", color: "bg-indigo-600" },
    arrived: { text: "Start Trip", color: "bg-green-600" },
    started: { text: "Complete Trip", color: "bg-red-600" },
    in_progress: { text: "Complete Trip", color: "bg-red-600" },
    completed: { text: "Finished", color: "bg-gray-400" },
    cancelled: { text: "Cancelled", color: "bg-gray-400" },
  };

  const currentBtn = btnConfig[tripStatus] || btnConfig.accepted;

  return (
    <div className="flex flex-col lg:flex-row w-full h-screen bg-white overflow-hidden">
    
      <div className="w-full lg:w-[400px] h-full flex flex-col border-r border-gray-200 z-20 bg-white">
        <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
          <h1 className="font-black text-xl">Active Ride</h1>
          <Shield className="text-red-500" size={20} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl shadow-sm">
            <img 
              src={`https://ui-avatars.com/api/?name=${riderInfo.name}&background=6366f1&color=fff`} 
              className="w-12 h-12 rounded-xl" 
              alt="rider" 
            />
            <div className="flex-1">
              <p className="font-bold text-gray-900">{riderInfo.name}</p>
              <p className="text-xs text-gray-500">⭐ {riderInfo.rating} Rating</p>
            </div>
            <a href={`tel:${riderInfo.phone}`} className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors">
              <Phone size={18} />
            </a>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-1 bg-indigo-600 rounded-full" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Pickup</p>
                <p className="text-sm font-medium text-gray-700">{pickupLocation.address}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-1 bg-red-500 rounded-full" />
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Dropoff</p>
                <p className="text-sm font-medium text-gray-700">{dropoffLocation.address}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <button
            onClick={handleStatusUpdate}
            disabled={isLoading || tripStatus === 'completed'}
            className={`w-full py-4 rounded-xl text-white font-bold shadow-lg transition-all active:scale-95 flex justify-center items-center gap-2 ${currentBtn.color} disabled:opacity-50`}
          >
            {isLoading ? <Loader2 className="animate-spin" /> : currentBtn.text}
          </button>
        </div>
      </div>

      <div className="flex-1 relative bg-gray-100">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 w-full h-full" 
        />
        
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-xl border border-white/10">
            <Navigation size={14} className="text-indigo-400 animate-pulse" />
            {(tripStatus === 'started' || tripStatus === 'in_progress') ? "Heading to Dropoff" : "Heading to Pickup"}
          </div>
        </div>
      </div>

      {showSafetyModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl w-full max-w-sm text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle size={32} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-bold">Passenger Identity</h3>
            <p className="text-sm text-gray-500">
              Please confirm the rider is <span className="font-bold text-gray-900">{riderInfo.name}</span> before starting the trip.
            </p>
            <button 
              onClick={() => setShowSafetyModal(false)} 
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
            >
              Identity Verified
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRide;