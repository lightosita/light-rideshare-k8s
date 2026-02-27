'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import { VehicleType } from '@/types/ride';
import LiveDriverMap from '../maps/LiveDriverMap';
import { useRouteCalculation } from '@/hooks/useDriverLocation';
import { 
  Phone, MessageCircle, Star, Navigation, Car, CreditCard, MapPin, CheckCircle 
} from 'lucide-react';

export interface ActiveRideProps {
  rideRequestId: string;
  status: string; 
  driverInfo?: any; 
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  fareEstimate: number;
  vehicleType?: VehicleType;
  userId: string;
  liveDriverLocation: { lat: number; lng: number } | null;
}

function ActiveRide({
  status,
  driverInfo,
  pickupLocation,
  dropoffLocation,
  liveDriverLocation,
  fareEstimate
}: ActiveRideProps) {
  
  const [driverLocation, setDriverLocation] = useState(liveDriverLocation || {
    lat: pickupLocation.lat - 0.002,
    lng: pickupLocation.lng - 0.002,
  });

  const { routeCoordinates, calculateRoute } = useRouteCalculation(
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '',
    { geometries: 'geojson', overview: 'full' }
  );

  useEffect(() => {
    if (liveDriverLocation) {
      setDriverLocation(liveDriverLocation);
    }
  }, [liveDriverLocation]);


  useEffect(() => {
    if (status === 'arrived' || status === 'started') {
      calculateRoute(
        { lat: driverLocation.lat, lng: driverLocation.lng },
        { lat: dropoffLocation.lat, lng: dropoffLocation.lng }
      );
    } else {
      calculateRoute(
        { lat: driverLocation.lat, lng: driverLocation.lng },
        { lat: pickupLocation.lat, lng: pickupLocation.lng }
      );
    }
  }, [status, driverLocation, pickupLocation, dropoffLocation, calculateRoute]);

  const getStatusDisplay = useMemo(() => {
    switch(status) {
      case 'accepted': 
        return { 
          text: 'Driver is en-route',
          color: 'bg-blue-600',
          icon: <Navigation className="w-4 h-4" />
        };
      case 'arrived': 
        return { 
          text: 'Driver has arrived!',
          color: 'bg-green-600',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'started': 
        return { 
          text: 'Trip in progress',
          color: 'bg-purple-600',
          icon: <Car className="w-4 h-4" />
        };
      case 'completed': 
        return { 
          text: 'Trip finished',
          color: 'bg-gray-600',
          icon: <CheckCircle className="w-4 h-4" />
        };
      default: 
        return { 
          text: 'Updating status...',
          color: 'bg-yellow-600',
          icon: <MapPin className="w-4 h-4" />
        };
    }
  }, [status]);

  const driver = useMemo(() => ({
    name:
      driverInfo?.driver_name ||
      driverInfo?.firstName ||
      driverInfo?.name ||
      "Driver",

    vehicle:
      driverInfo?.vehicle ||
      driverInfo?.car_model ||
      "Vehicle",

    plate:
      driverInfo?.licensePlate ||
      driverInfo?.plate_number ||
      "---",

    phone:
      driverInfo?.phone ||
      driverInfo?.phone_number ||
      "",

    rating:
      driverInfo?.driver_rating ||
      driverInfo?.rating ||
      5,
  }), [driverInfo]);

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden font-sans">
 
      <div className="relative w-[60%] h-full border-r border-slate-100">
        <LiveDriverMap
          driverLocation={driverLocation}
          pickupLocation={pickupLocation}
          dropoffLocation={dropoffLocation}
          routeCoordinates={routeCoordinates}
          
        />
        
        <div className="absolute top-6 left-6 z-10">
          <div className="bg-white px-4 py-2 rounded-full shadow-xl border border-slate-100 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full animate-pulse ${getStatusDisplay.color}`} />
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
              {getStatusDisplay.icon}
              {getStatusDisplay.text}
            </span>
          </div>
        </div>
        
        {(status === 'arrived' || status === 'started') && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-10">
            <div className={`px-6 py-3 rounded-full shadow-lg ${status === 'arrived' ? 'bg-green-500' : 'bg-purple-500'} text-white font-bold animate-pulse`}>
              {status === 'arrived' ? '🚗 Driver has arrived!' : '🚀 Trip has started!'}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT SIDE: DETAILS */}
      <div className="w-[40%] h-full flex flex-col bg-slate-50/50 overflow-y-auto">
        <div className="p-8 bg-white border-b border-slate-100">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Ride Details</h1>
          <p className="text-slate-500 text-sm font-medium uppercase tracking-tighter">
            Status: <span className={`font-bold ${getStatusDisplay.color.replace('bg-', 'text-')}`}>
              {status.toUpperCase()}
            </span>
          </p>
        </div>

        <div className="p-8">
          {/* Driver Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {driver.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{driver.name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Star className="w-4 h-4 text-orange-400 fill-current" />
                  <span className="text-sm font-bold text-slate-700">{driver.rating}.0</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Vehicle</p>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-slate-600" />
                  <p className="text-sm font-bold text-slate-800">{driver.vehicle}</p>
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Plate</p>
                <p className="text-sm font-mono font-black text-slate-800 tracking-widest">{driver.plate}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <a href={`tel:${driver.phone}`} className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-bold">
                <Phone className="w-5 h-5" /> Call Driver
              </a>
            </div>
          </div>

          {/* Timeline with dynamic status */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
              {/* Pickup Step */}
              <div className="relative flex gap-4 items-start">
                <div className={`mt-1.5 w-6 h-6 rounded-full border-4 z-10 ${
                  ['accepted', 'arrived', 'started', 'completed'].includes(status) 
                    ? 'bg-green-600 border-green-100' 
                    : 'bg-slate-300 border-slate-100'
                }`} />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Pickup</p>
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{pickupLocation.address}</p>
                  {status === 'arrived' && (
                    <p className="text-xs text-green-600 font-bold mt-1">✓ Driver arrived at pickup</p>
                  )}
                </div>
              </div>
              
              {/* Dropoff Step */}
              <div className="relative flex gap-4 items-start">
                <div className={`mt-1.5 w-6 h-6 rounded-full border-4 z-10 ${
                  ['started', 'completed'].includes(status) 
                    ? 'bg-green-600 border-green-100' 
                    : 'bg-slate-50 border-slate-300'
                }`} />
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Dropoff</p>
                  <p className="text-sm font-semibold text-slate-700 leading-tight">{dropoffLocation.address}</p>
                  {status === 'started' && (
                    <p className="text-xs text-purple-600 font-bold mt-1">→ En route to dropoff</p>
                  )}
                  {status === 'completed' && (
                    <p className="text-xs text-green-600 font-bold mt-1">✓ Trip completed</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fare Card */}
          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl">
            <p className="text-blue-100 text-xs font-bold uppercase mb-1">Fare Estimate</p>
            <p className="text-3xl font-black">₦{fareEstimate?.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ActiveRide);