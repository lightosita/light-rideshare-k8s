import axios, { AxiosInstance } from "axios";
import { DriverEarningsSummary, DriverTripsResponse, Trip, TripServiceOptions } from "./types/trip";


export class TripServiceClient {
  private client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      baseURL: baseURL || process.env.TRIP_SERVICE_URL || 'http://localhost:3005/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all trips for a driver
   */
  async getDriverTrips(driverId: string, options: TripServiceOptions = {}): Promise<DriverTripsResponse> {
    try {
      const params = {
        status: options.status,
        limit: options.limit || 100,
        offset: options.offset || 0,
        include_cancelled: options.includeCancelled || false,
      };

      const response = await this.client.get(`/drivers/${driverId}/trips`, { params });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch trips');
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`Error fetching trips for driver ${driverId}:`, error.message);
      throw new Error(`Trip service error: ${error.message}`);
    }
  }

  /**
   * Get driver earnings summary
   */
  async getDriverEarningsSummary(
    driverId: string,
    timeRange: string = 'all'
  ): Promise<DriverEarningsSummary> {
    try {
      const response = await this.client.get(`/drivers/${driverId}/earnings/summary`, {
        params: { time_range: timeRange },
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch earnings');
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`Error fetching earnings for driver ${driverId}:`, error.message);
      throw new Error(`Trip service error: ${error.message}`);
    }
  }

  /**
   * Get driver transaction history
   */
  async getDriverTransactions(
    driverId: string,
    options: Pick<TripServiceOptions, 'limit' | 'offset'> = {}
  ) {
    try {
      const params = {
        limit: options.limit || 50,
        offset: options.offset || 0,
      };

      const response = await this.client.get(`/drivers/${driverId}/earnings/transactions`, {
        params,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to fetch transactions');
      }

      return response.data.data;
    } catch (error: any) {
      console.error(`Error fetching transactions for driver ${driverId}:`, error.message);
      throw new Error(`Trip service error: ${error.message}`);
    }
  }

  /**
   * Get active trip for driver
   */
  async getActiveTrip(driverId: string): Promise<Trip | null> {
    try {
      const tripsData = await this.getDriverTrips(driverId, {
        status: 'accepted',
        limit: 1,
      });

      // Filter for active trips (not completed or cancelled)
      const activeTrips = tripsData.trips.filter((trip) =>
        ['accepted', 'arrived', 'started'].includes(trip.status)
      );

      return activeTrips.length > 0 ? activeTrips[0] : null;
    } catch (error: any) {
      console.error(`Error fetching active trip for driver ${driverId}:`, error.message);
      return null;
    }
  }

  /**
   * Get completed trips for driver
   */
  async getCompletedTrips(
    driverId: string,
    options: Pick<TripServiceOptions, 'limit' | 'offset'> = {}
  ): Promise<DriverTripsResponse> {
    return this.getDriverTrips(driverId, {
      ...options,
      status: 'completed',
    });
  }

  /**
   * Get trip by ID
   */
  async getTripById(tripId: string): Promise<Trip> {
    try {
      const response = await this.client.get(`/trips/${tripId}`);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Trip not found');
      }

      return response.data.data.trip;
    } catch (error: any) {
      console.error(`Error fetching trip ${tripId}:`, error.message);
      throw new Error(`Trip service error: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch (error: any) {
      console.error('Trip service health check failed:', error.message);
      return false;
    }
  }

  /**
 * Accept a ride request and create a trip
 */
async acceptRideRequest(requestId: string, driverId: string): Promise<Trip> {
  try {
    // We send the driverId so the Trip Service knows who is taking the ride
    const response = await this.client.post(`/ride-requests/${requestId}/accept`, {
      driverId
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to accept ride request');
    }

    // Return the newly created Trip object
    return response.data.data.trip;
  } catch (error: any) {
    console.error(`Error accepting ride request ${requestId}:`, error.message);
    // Rethrow to let the Controller handle the HTTP status code
    throw new Error(error.response?.data?.error || error.message);
  }
}
}

export const tripServiceClient = new TripServiceClient();