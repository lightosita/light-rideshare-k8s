
import axios, { AxiosInstance } from 'axios';
import { RiderTrip, RiderTripHistoryResponse } from '../types/trips';


export class RiderTripServiceClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || process.env.NEXT_PUBLIC_TRIP_SERVICE_URL || 'http://localhost:3005/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get rider trip history (past + ongoing)
   */
  async getTripHistory(
    riderId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: 'completed' | 'cancelled';
      includeCancelled?: boolean;
    } = {}
  ): Promise<RiderTripHistoryResponse> {
    try {
      const params: Record<string, any> = {
        limit: options.limit || 20,
        offset: options.offset || 0,
      };

      if (options.status) params.status = options.status;
      if (options.includeCancelled) params.include_cancelled = true;

      const response = await this.client.get(`/riders/${riderId}/trips`, { params });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch trip history');
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`Error fetching trip history for rider ${riderId}:`, error.message);
      throw error;
    }
  }

  /**
   * Get single trip details by trip_id
   */
  async getTripById(tripId: string): Promise<RiderTrip> {
    try {
      const response = await this.client.get(`/trips/${tripId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Trip not found');
      }

      return response.data.data.trip;
    } catch (error: any) {
      console.error(`Error fetching trip ${tripId}:`, error.message);
      throw error;
    }
  }

  async getTripByRideRequestId(rideRequestId: string): Promise<any | null> {
  try {
    const response = await this.client.get(`/trips/by-ride-request/${rideRequestId}`);
    if (response.data.success) {
      return response.data.data.trip;
    }
    return null;
  } catch (error) {
    console.log('No trip found for ride_request_id:', rideRequestId);
    return null;
  }
}

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const riderTripService = new RiderTripServiceClient();