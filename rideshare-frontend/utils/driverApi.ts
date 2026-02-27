import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore'; 
import { DashboardData, EarningsData, Trip, TripsResponse } from '@/types/driver';

const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_DRIVER_SERVICE_URL || 'http://localhost:3003',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = useAuthStore.getState();
    
    if (
      state.token &&
      state.isAuthenticated &&
      state.user?.userType === 'driver' &&
      !config.headers['Authorization']
    ) {
      config.headers['Authorization'] = `Bearer ${state.token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);


api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        console.warn('Session expired. Please login again.');
        
      }
    }
    
    // Handle 403 Forbidden (not a driver trying to access driver endpoints)
    if (error.response?.status === 403) {
      console.warn('Access forbidden - user may not be a driver');
      // Could redirect to appropriate dashboard
      if (typeof window !== 'undefined' && window.location.pathname.includes('/driver')) {
        // window.location.href = '/dashboard'; // Redirect to rider dashboard
      }
    }
    
    return Promise.reject(error);
  }
);

if (typeof window !== 'undefined') {
  const state = useAuthStore.getState();
  if (
    state.token &&
    state.isAuthenticated &&
    state.user?.userType === 'driver'
  ) {
    api.defaults.headers.common['Authorization'] = `Bearer ${state.token}`;
  }
}


export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};


const canAccessDriverApi = (): boolean => {
  const state = useAuthStore.getState();
  return !!(state.token && state.isAuthenticated && state.user?.userType === 'driver');
};

export const driverApi = {
  async getDashboard(timeRange: string = 'all'): Promise<DashboardData> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.get(`/api/v1/drivers/dashboard`, {
      params: { time_range: timeRange },
    });
    return response.data.data;
  },

  async getTrips(options?: {
    status?: string;
    limit?: number;
    offset?: number;
    includeCancelled?: boolean;
  }): Promise<TripsResponse> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.get(`/api/v1/drivers/trips`, {
      params: {
        status: options?.status,
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        include_cancelled: options?.includeCancelled || false,
      },
    });
    return response.data.data;
  },

  async getEarnings(options?: {
    timeRange?: string;
    limit?: number;
    offset?: number;
  }): Promise<EarningsData> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.get(`/api/v1/drivers/earnings`, {
      params: {
        time_range: options?.timeRange || 'all',
        limit: options?.limit || 10,
        offset: options?.offset || 0,
      },
    });
    return response.data.data;
  },

  async getActiveTrip(): Promise<{ has_active_trip: boolean; trip: Trip | null }> {
  if (!canAccessDriverApi()) {
    throw new Error('Authentication required.');
  }
  
  try {
    const response = await api.get(`/api/v1/drivers/active-trip`);
    // Ensure we always return an object with a 'trip' property
    return response.data?.data || { has_active_trip: false, trip: null };
  } catch (error) {
    console.error("Error fetching active trip:", error);
    return { has_active_trip: false, trip: null };
  }
},

  // Get completed trips
  async getCompletedTrips(options?: { limit?: number; offset?: number }): Promise<TripsResponse> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.get(`/api/v1/drivers/completed-trips`, {
      params: {
        limit: options?.limit || 50,
        offset: options?.offset || 0,
      },
    });
    return response.data.data;
  },

 
  async acceptRide(requestId: string): Promise<{ success: boolean; data: { trip: Trip } }> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
     
   const response = await api.post(
  `/api/v1/drivers/ride-requests/${requestId}/accept`,
  {}  
);
    
    return response.data;
  },

  async getTripDetails(tripId: string): Promise<{ trip: Trip }> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.get(`/api/v1/drivers/trips/${tripId}`);
    return response.data.data;
  },

  // Update availability
  async updateAvailability(isAvailable: boolean): Promise<any> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.patch(`/api/v1/drivers/availability`, { isAvailable });
    return response.data.data;
  },


  async updateLocation(location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speedKmh?: number;
  }): Promise<any> {
    if (!canAccessDriverApi()) {
      throw new Error('Authentication required. Please login as a driver.');
    }
    
    const response = await api.post(`/api/v1/drivers/location`, location);
    return response.data.data;
  },
};

export { api };