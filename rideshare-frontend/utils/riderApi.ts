
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore'; 
import { DashboardData, RideRequestData, RideRequestResponse, RiderTrip, RiderTripHistoryResponse, TripStatistics } from '@/types/rider';

const api: AxiosInstance = axios.create({
   baseURL: process.env.NEXT_PUBLIC_RIDER_SERVICE_URL + '/api' || 'http://localhost:3001/api',
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
      state.user?.userType === 'rider' &&
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
  
    if (error.response?.status === 403) {
      console.warn('Access forbidden - user may not be a rider');
      if (typeof window !== 'undefined' && window.location.pathname.includes('/rider')) {
    
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
    state.user?.userType === 'rider'
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





const canAccessRiderApi = (): boolean => {
  const state = useAuthStore.getState();
  return !!(state.token && state.isAuthenticated && state.user?.userType === 'rider');
};

export const riderApi = {
 
  async getTrips(options?: {
    status?: 'completed' | 'cancelled';
    limit?: number;
    offset?: number;
    includeCancelled?: boolean;
  }): Promise<RiderTripHistoryResponse> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me/trips`, {
      params: {
        status: options?.status,
        limit: options?.limit || 100,
        offset: options?.offset || 0,
        include_cancelled: options?.includeCancelled || false,
      },
    });
    return response.data.data;
  },

  // Get trip statistics
  async getTripStatistics(): Promise<{
    rider_id: string;
    statistics: TripStatistics;
    summary: {
      last_trip_date: string | null;
      first_trip_date: string | null;
    };
  }> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me/trips/statistics`);
    return response.data.data;
  },

  // Get recent trips (last 10)
  async getRecentTrips(): Promise<{
    trips: RiderTrip[];
    has_more: boolean;
  }> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me/trips/recent`);
    return response.data.data;
  },

  // Get specific trip details
  async getTripDetails(tripId: string): Promise<{ trip: RiderTrip }> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me/trips/${tripId}`);
    return response.data.data;
  },

  // Get rider dashboard
  async getDashboard(): Promise<DashboardData> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me/dashboard`);
    return response.data.data;
  },

  // Create ride request
  async createRideRequest(data: RideRequestData): Promise<RideRequestResponse> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.post(`/riders/ride-request`, data);
    return response.data;
  },

  // Get rider profile
  async getProfile(): Promise<{
    rider: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      isVerified: boolean;
      rating: number;
      totalTrips: number;
      createdAt: string;
    };
  }> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.get(`/riders/me`);
    return response.data.data;
  },

  // Update rider profile (if you have this endpoint)
  async updateProfile(data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }): Promise<any> {
    if (!canAccessRiderApi()) {
      throw new Error('Authentication required. Please login as a rider.');
    }
    
    const response = await api.patch(`/riders/me`, data);
    return response.data.data;
  },
};

export { api as riderAxiosInstance };