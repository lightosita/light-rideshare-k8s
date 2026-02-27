'use client';

import { useCallback, useState, useEffect } from 'react';
import { useAuth } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const MapboxMap = dynamic(
  () => import('../maps/MapContainer'), 
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
        <div className="text-gray-600 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
          <p>Loading map...</p>
        </div>
      </div>
    ),
  }
);

import {
  VehicleType,
  RideStatus,
  Location,
  RouteInfo,
  DriverInfo
} from '@/types/ride';
import ConnectionStatus from './ride/ConnectionStatus';
import LocationInput from './ride/LocationInput';
import VehicleTypeSelector from './ride/VehicleTypeSelector';
import FareEstimate from './ride/FareEstimate';
import RideStatusDisplay from './ride/RideStatusDisplay';
import Modal from '../Modal';
import { vehicleTypes } from '@/types/vehicleType';
import { useWS } from '@/hooks/WebsocketProvider';

interface MapLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onConfirm?: () => void;
  confirmText?: string;
  showCloseButton?: boolean;
}

export default function RequestRide() {
  const router = useRouter();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [pickupInput, setPickupInput] = useState('');
  const [dropoffInput, setDropoffInput] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('SEDAN');
  const [fareEstimate, setFareEstimate] = useState<number | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isRequestingRide, setIsRequestingRide] = useState(false);
  const [rideStatus, setRideStatus] = useState<RideStatus>(null);
  const [activeRide, setActiveRide] = useState<DriverInfo | null>(null);
  const [currentRideRequestId, setCurrentRideRequestId] = useState<string | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [showSearchingModal, setShowSearchingModal] = useState(false);

  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    message: '',
    type: 'info',
    showCloseButton: true
  });

  const isRideActive = rideStatus === 'accepted' || rideStatus === 'matched';


  const { token, isRider } = useAuth();
  const { connectionStatus, on, setCurrentRideId } = useWS();


  useEffect(() => {
    if (!isRider) return;

    const handler = (data: any) => {
      setRideStatus(currentStatus => {
        if (currentStatus === 'accepted' || currentStatus === 'matched') return currentStatus;

        const event = data.event || data.type || data.status;

        switch (event) {
          case 'ride.requested':
          case 'ride_requested':
            setCurrentRideRequestId(data.ride_request_id || data.rideRequestId);
            return 'searching';

          case 'ride.proposed':
          case 'driver_assigned':
            handleDriverAssigned(data);
            return 'driver_assigned';

          case 'ride.accepted':
          case 'ride_accepted':
            handleDriverAccepted(data);
            return 'accepted';

          case 'ride.matched':
          case 'ride_matched':
            handleRideMatched(data);
            return 'matched';

          case 'ride.declined':
          case 'ride_declined':
            handleDriverRejected(data);
            return 'searching';

          case 'ride.timeout':
          case 'driver_timeout':
            handleDriverTimeout(data);
            return 'searching';

          case 'no_drivers':
            showModal(data.message || 'No drivers available nearby.', { type: 'warning', title: 'No Drivers Found' });
            return 'no_drivers';

          default:
            return currentStatus;
        }
      });
    };

    const unsubscribe = on(handler);
    return () => unsubscribe();
  }, [isRider, on]); 

  useEffect(() => {
    if (currentRideRequestId && isRider) {
      setCurrentRideId(currentRideRequestId);
    }
    return () => setCurrentRideId(null);
  }, [currentRideRequestId, isRider, setCurrentRideId]);

  useEffect(() => {
    setShowSearchingModal(rideStatus === 'searching');
  }, [rideStatus]);

  const showModal = useCallback((message: string, options?: Partial<ModalState>) => {
    setModalState({
      isOpen: true,
      message,
      title: options?.title,
      type: options?.type || 'info',
      onConfirm: options?.onConfirm,
      confirmText: options?.confirmText,
      showCloseButton: options?.showCloseButton ?? true
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    modalState.onConfirm?.();
  }, [modalState.onConfirm]);

  const extractDriverInfo = (data: any): DriverInfo => {
    const d = data.driver || data.data || data;
    return {
      driver_id: d.id || d.driver_id || `driver_${Date.now()}`,
      driver_name: d.firstName || d.driver_name || d.name || 'Driver',
      firstName: d.firstName || d.driver_name || 'Driver',
      vehicle_type: (d.vehicleType || d.vehicle_type || 'SEDAN').toUpperCase() as VehicleType,
      license_plate: d.licensePlate || d.license_plate || '---',
      driver_rating: Number(d.rating || d.driver_rating || 5.0),
      estimated_pickup_minutes: d.estimated_pickup_minutes || 5,
      driver_location: d.driver_location || d.location || { lat: 0, lng: 0 }
    };
  };

  const handleDriverAssigned = useCallback((data: any) => {
    const driver = extractDriverInfo(data);
    setActiveRide(driver);
    showModal(`${driver.firstName} is considering your ride...`, { type: 'info' });
  }, [showModal]);

  const handleDriverAccepted = useCallback((data: any) => {
    const driverInfo = extractDriverInfo(data);
    setActiveRide(driverInfo);

    const rideId = data.ride_request_id || data.rideRequestId || currentRideRequestId;
    if (!rideId) return;

    showModal(`Ride Accepted! ${driverInfo.firstName} is on the way!`, {
      type: 'success',
      title: 'Success!',
      confirmText: 'Track Driver',
      showCloseButton: false,
      onConfirm: () => {
        router.push(`/active-ride/${rideId}`);
      }
    });
  }, [currentRideRequestId, router, showModal]);

  const handleDriverRejected = useCallback((data: any) => {
    showModal('Driver declined. Searching for another...', { type: 'warning' });
    setActiveRide(null);
  }, [showModal]);

  const handleDriverTimeout = useCallback((data: any) => {
    showModal('Driver didn\'t respond. Searching again...', { type: 'warning' });
    setActiveRide(null);
  }, [showModal]);

  const handleRideMatched = useCallback((data: any) => {
    const rideId = data.ride_request_id || data.rideRequestId || currentRideRequestId;
    if (rideId) {
      router.push(`/active-ride/${rideId}`);
    }
  }, [currentRideRequestId, router]);

  const handlePickupSelect = useCallback((place: any) => {
    const [lng, lat] = place.center || place.geometry?.coordinates || [0, 0];
    const address = place.place_name || place.text || 'Selected location';
    setPickup({ latitude: lat, longitude: lng, address });
    setPickupInput(address);
  }, []);

  const handleDropoffSelect = useCallback((place: any) => {
    const [lng, lat] = place.center || place.geometry?.coordinates || [0, 0];
    const address = place.place_name || place.text || 'Selected destination';
    setDropoff({ latitude: lat, longitude: lng, address });
    setDropoffInput(address);
  }, []);

  const handleMapClick = useCallback((location: MapLocation) => {
    if (!pickup) {
      setPickup({ ...location });
      setPickupInput(location.address);
    } else if (!dropoff) {
      setDropoff({ ...location });
      setDropoffInput(location.address);
    }
  }, [pickup, dropoff]);

  const getRouteCoordinates = async () => {
    if (!pickup || !dropoff) return;
    try {
      const res = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.longitude},${pickup.latitude};${dropoff.longitude},${dropoff.latitude}?geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );
      const json = await res.json();
      if (json.routes?.[0]) setRouteCoordinates(json.routes[0].geometry.coordinates);
    } catch (err) {
      setRouteCoordinates([[pickup.longitude, pickup.latitude], [dropoff.longitude, dropoff.latitude]]);
    }
  };

  const calculateRouteAndFare = async () => {
    if (!pickup || !dropoff) return;
    setIsCalculating(true);
    try {
      const vehicle = vehicleTypes.find(v => v.id === vehicleType);
      const res = await fetch(`${process.env.NEXT_PUBLIC_TRIP_SERVICE_URL}/fares/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup_location: { lat: pickup.latitude, lng: pickup.longitude },
          dropoff_location: { lat: dropoff.latitude, lng: dropoff.longitude },
          vehicle_type: vehicle?.backendType || 'sedan'
        })
      });
      const data = await res.json();
      setFareEstimate(data.estimated_fare);
      setRouteInfo({
        distance: Math.round(data.distance_km * 10) / 10,
        duration: data.estimated_duration_minutes,
        fare: data.estimated_fare,
        fareBreakdown: data
      });
    } catch (err) {
      showModal('Failed to calculate fare', { type: 'error' });
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    if (isRideActive) return;
    if (pickup && dropoff) {
      calculateRouteAndFare();
      getRouteCoordinates();
    }
  }, [pickup, dropoff, vehicleType, isRideActive]);

  const handleRequestRide = async () => {
    if (!pickup || !dropoff || !fareEstimate) return showModal('Please complete locations', { type: 'warning' });
    setIsRequestingRide(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_RIDER_SERVICE_URL}/api/v1/riders/ride-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          pickup_lat: pickup.latitude, pickup_lng: pickup.longitude, pickup_address: pickup.address,
          dropoff_lat: dropoff.latitude, dropoff_lng: dropoff.longitude, dropoff_address: dropoff.address,
          vehicle_type: vehicleType.toLowerCase(), fare: fareEstimate
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Request failed');
      
      const rideId = result.data?.rideRequestId || result.rideRequestId || result.data?.id;
      setCurrentRideRequestId(rideId);
      setRideStatus('searching');
    } catch (err: any) {
      showModal(err.message, { type: 'error' });
    } finally {
      setIsRequestingRide(false);
    }
  };

  const convertToMapLocation = (loc: Location | null): MapLocation | undefined =>
    loc ? { latitude: loc.latitude, longitude: loc.longitude, address: loc.address || '' } : undefined;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Request a Ride</h2>
        <ConnectionStatus connectionStatus={connectionStatus} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-gray-200 shadow-inner">
          <MapboxMap
            pickupLocation={convertToMapLocation(pickup)}
            dropoffLocation={convertToMapLocation(dropoff)}
            onMapClick={handleMapClick}
            showRoute={!!pickup && !!dropoff}
            isRideActive={isRideActive}
            routeCoordinates={routeCoordinates}
          />
        </div>

        <div className="space-y-6">
          <div className="space-y-4">
            <LocationInput label="Pickup" value={pickupInput} onChange={setPickupInput} onPlaceSelect={handlePickupSelect} placeholder="Search pickup..." />
            <LocationInput label="Dropoff" value={dropoffInput} onChange={setDropoffInput} onPlaceSelect={handleDropoffSelect} placeholder="Search destination..." />
          </div>

          <VehicleTypeSelector vehicleTypes={vehicleTypes} selectedType={vehicleType} onSelectType={setVehicleType} />
          <FareEstimate isCalculating={isCalculating} fareEstimate={fareEstimate} routeInfo={routeInfo} vehicleType={vehicleType} pickup={pickup} dropoff={dropoff} />

          <button
            onClick={handleRequestRide}
            disabled={!pickup || !dropoff || !fareEstimate || isCalculating || isRequestingRide || rideStatus === 'searching'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-bold transition-all shadow-lg shadow-blue-100"
          >
            {isRequestingRide ? 'Contacting Drivers...' : isCalculating ? 'Calculating...' : 'Confirm Ride Request'}
          </button>

          <RideStatusDisplay rideStatus={rideStatus} activeRide={activeRide} />
        </div>
      </div>

      <Modal isOpen={showSearchingModal} onClose={() => { setRideStatus(null); setShowSearchingModal(false); }} title="Finding your Driver" type="info" showCloseButton={false}>
        <div className="space-y-6 text-center py-10">
          <div className="relative inline-block">
             <div className="animate-spin rounded-full h-20 w-20 border-4 border-blue-100 border-t-blue-600"></div>
          </div>
          <p className="text-gray-600 font-medium">Looking for a nearby {vehicleType.toLowerCase()} driver...</p>
          <button onClick={() => { setRideStatus(null); setShowSearchingModal(false); }} className="text-sm font-bold text-red-500 hover:text-red-600">Cancel Request</button>
        </div>
      </Modal>

      <Modal isOpen={modalState.isOpen} onClose={closeModal} title={modalState.title} type={modalState.type} showCloseButton={modalState.showCloseButton}>
        <div className="space-y-4">
          <p className="text-gray-700 leading-relaxed">{modalState.message}</p>
          {modalState.onConfirm && (
            <div className="flex justify-end pt-4">
              <button onClick={closeModal} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md">
                {modalState.confirmText || 'OK'}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}