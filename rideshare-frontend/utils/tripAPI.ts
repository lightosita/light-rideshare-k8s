
import { useAuthStore } from '@/store/authStore';
import { ActiveTripData } from '@/types/driver';


type TripStage = 'en_route' | 'arrived' | 'picked_up' | 'completed';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;


const getAuthToken = (): string | null => {
  return useAuthStore.getState().token;
};

const getHeaders = (): HeadersInit => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

/* ==============================================================
  1. Update Trip Stage (En Route → Arrived → Picked Up → Completed)
============================================================== */
export const updateTripStageAPI = async (
  rideRequestId: string,
  stage: TripStage,
  driverLocation: { lat: number; lng: number } | null = null
): Promise<boolean> => {
  const TRIP_SERVICE_URL = process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || 'http://localhost:3005/api';

 const stageToStatus: Record<TripStage, string> = {
    en_route: 'accepted',   
    arrived: 'arrived',
    picked_up: 'started',   
    completed: 'completed',
  };

  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      const response = await fetch(
        `${TRIP_SERVICE_URL}/trips/request/${rideRequestId}/status`,
        {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({
            status: stageToStatus[stage],
            driver_location: driverLocation,
          }),
        }
      );

      if (response.ok) {
        console.log(`Trip stage updated → ${stage}`);
        return true;
      }

      // Handle temporary 404s (race condition when trip is being created)
      if (response.status === 404 && attempt < MAX_RETRIES - 1) {
        console.warn(`Attempt ${attempt + 1}: Trip not ready yet, retrying...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        attempt++;
        continue;
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to update trip stage: ${response.status}`);
    } catch (error) {
      if (attempt < MAX_RETRIES - 1) {
        attempt++;
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        continue;
      }
      console.error('Final failure updating trip stage:', error);
      throw error;
    }
  }

  return false;
};

/* ==============================================================
  2. Complete Trip with Distance & Duration
============================================================== */
export const completeTripAPI = async (
  rideRequestId: string,
  distanceKm: number,
  durationMinutes: number
): Promise<boolean> => {
  const TRIP_SERVICE_URL = process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || 'http://localhost:3005/api';

  try {
    const response = await fetch(
      `${TRIP_SERVICE_URL}/trips/request/${rideRequestId}/complete`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({
          distance_km: distanceKm,
          duration_minutes: durationMinutes,
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete trip');
    }

    console.log('Trip completed successfully!');
    return true;
  } catch (error) {
    console.error('Error completing trip:', error);
    return false;
  }
};

/* ==============================================================
  3. Get Active Trip — Fully Working with Auth
============================================================== */
export const getActiveTrip = async (): Promise<ActiveTripData> => {
  const DRIVER_SERVICE_URL =
    process.env.NEXT_PUBLIC_DRIVER_SERVICE_URL || 'http://localhost:3001';

  const response = await fetch(`${DRIVER_SERVICE_URL}/api/drivers/me/trips/active`, {
    method: 'GET',
    credentials: 'include', 
    headers: getHeaders(),
  });

  // No active trip → expected, not an error
  if (response.status === 404) {
    throw new Error('No active trip found');
  }

  // Token expired or invalid → log out automatically
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired. Redirecting to login...');
  }

  // Other errors
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Server error: ${response.status}`);
  }

  const json = await response.json();

  // Adjust this based on your actual API response shape
  const trip = (json.data?.trip || json.trip) as ActiveTripData;

  if (!trip) {
    throw new Error('No trip data received from server');
  }

  return trip;
};

/* ==============================================================
  4. Get Active Rider Trip — Centralized Fetch
============================================================== */
export const getActiveRiderTrip = async (userId: string): Promise<any> => {
  const TRIP_SERVICE_URL = process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || 'http://localhost:3005';

  const response = await fetch(`${TRIP_SERVICE_URL}/api/trips/active/rider`, {
    method: 'POST',
    headers: getHeaders(), // Uses the centralized headers helper
    body: JSON.stringify({ rider_id: userId }),
    cache: 'no-store',
  });

  if (response.status === 404) {
    throw new Error("No active ride found.");
  }

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not load ride details.');
  }

  return await response.json();
};