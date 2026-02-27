import { db } from '../config/database';

export interface Rider {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  isVerified: boolean;
  isActive: boolean;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  lastLogin?: Date;
  // Rider specific fields
  rating: number;
  totalTrips: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RideRequest {
  id: string;
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  vehicleType: string;
  status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled';
  estimatedFare?: number;
  requestedAt: Date;
  matchedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
}

export interface CreateRiderInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  verificationToken: string;
}

export interface CreateRideRequestInput {
  riderId: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  vehicleType?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface FareEstimateResponse {
  estimated_fare: number;
  distance_km: number;
  estimated_duration_minutes: number;
  base_fare: number;
  distance_fare: number;
  time_fare: number;
  surge_multiplier: number;
  vehicle_type: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export class RiderRepository {
  // Auth Methods
  static async createRider(riderData: CreateRiderInput): Promise<Rider> {
    const query = `
      INSERT INTO rider_service.riders (
        first_name, last_name, email, phone, 
        password_hash, verification_token
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      riderData.firstName,
      riderData.lastName,
      riderData.email,
      riderData.phone,
      riderData.passwordHash,
      riderData.verificationToken
    ]);
    
    return this.mapRowToRider(result.rows[0]);
  }

  static async findRiderByEmail(email: string): Promise<Rider | null> {
    const result = await db.query('SELECT * FROM rider_service.riders WHERE email = $1', [email]);
    return result.rows[0] ? this.mapRowToRider(result.rows[0]) : null;
  }

  static async findRiderById(id: string): Promise<Rider | null> {
    const result = await db.query('SELECT * FROM rider_service.riders WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToRider(result.rows[0]) : null;
  }

  static async updateRiderVerification(riderId: string, isVerified: boolean): Promise<Rider> {
    const query = `
      UPDATE rider_service.riders 
      SET is_verified = $1, verification_token = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await db.query(query, [isVerified, riderId]);
    return this.mapRowToRider(result.rows[0]);
  }

  static async updateRiderPassword(riderId: string, passwordHash: string): Promise<Rider> {
    const query = `
      UPDATE rider_service.riders 
      SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING *
    `;
    
    const result = await db.query(query, [passwordHash, riderId]);
    return this.mapRowToRider(result.rows[0]);
  }

  static async updateRiderResetToken(riderId: string, resetToken: string, expiry: Date): Promise<Rider> {
    const query = `
      UPDATE rider_service.riders 
      SET reset_token = $1, reset_token_expiry = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $3 
      RETURNING *
    `;
    
    const result = await db.query(query, [resetToken, expiry, riderId]);
    return this.mapRowToRider(result.rows[0]);
  }

  static async findRiderByResetToken(resetToken: string): Promise<Rider | null> {
    const query = `
      SELECT * FROM rider_service.riders 
      WHERE reset_token = $1 AND reset_token_expiry > CURRENT_TIMESTAMP
    `;
    
    const result = await db.query(query, [resetToken]);
    return result.rows[0] ? this.mapRowToRider(result.rows[0]) : null;
  }

  static async findRiderByVerificationToken(verificationToken: string): Promise<Rider | null> {
    const result = await db.query('SELECT * FROM rider_service.riders WHERE verification_token = $1', [verificationToken]);
    return result.rows[0] ? this.mapRowToRider(result.rows[0]) : null;
  }

  static async updateLastLogin(riderId: string): Promise<void> {
    await db.query('UPDATE rider_service.riders SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [riderId]);
  }

  static async createRideRequest(requestData: CreateRideRequestInput): Promise<RideRequest> {
    console.log('📥 Repository received:', {
      ...requestData,
      riderId: requestData.riderId?.substring(0, 8) + '...' 
    });

    if (!requestData.riderId) {
      throw new Error('Missing riderId');
    }

    if (requestData.pickupLat === undefined || requestData.pickupLat === null) {
      throw new Error('pickupLat is undefined or null');
    }

    if (requestData.pickupLng === undefined || requestData.pickupLng === null) {
      throw new Error('pickupLng is undefined or null');
    }

    if (requestData.dropoffLat === undefined || requestData.dropoffLat === null) {
      throw new Error('dropoffLat is undefined or null');
    }

    if (requestData.dropoffLng === undefined || requestData.dropoffLng === null) {
      throw new Error('dropoffLng is undefined or null');
    }

    let estimatedFare: number | null = null;
    
    try {
      const fareEstimateRequest = {
        pickup_location: {
          lat: requestData.pickupLat,
          lng: requestData.pickupLng
        },
        dropoff_location: {
          lat: requestData.dropoffLat,
          lng: requestData.dropoffLng
        },
        vehicle_type: requestData.vehicleType || 'standard'
      };

      console.log('💰 Calling Trip Service for fare estimate:', fareEstimateRequest);

      const fareResponse = await fetch(`${process.env.TRIP_SERVICE_URL}/api/fares/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fareEstimateRequest)
      });

      if (fareResponse.ok) {
        const fareData = await fareResponse.json() as FareEstimateResponse;
        estimatedFare = fareData.estimated_fare;
        console.log('✅ Fare estimate received from Trip Service:', estimatedFare);
      } else {
        console.warn('❌ Failed to get fare estimate from Trip Service, using fallback');
        estimatedFare = await this.calculateFallbackFare(requestData);
      }
    } catch (error) {
      console.error('❌ Error calling Trip Service for fare:', error);
      estimatedFare = await this.calculateFallbackFare(requestData);
    }

    const query = `
      INSERT INTO rider_service.ride_requests (
        rider_id, pickup_lat, pickup_lng, pickup_address, 
        dropoff_lat, dropoff_lng, dropoff_address, vehicle_type, estimated_fare
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      requestData.riderId,
      requestData.pickupLat,
      requestData.pickupLng,
      requestData.pickupAddress,
      requestData.dropoffLat,
      requestData.dropoffLng,
      requestData.dropoffAddress,
      requestData.vehicleType || 'standard',
      estimatedFare
    ];

    console.log('🗄️ Executing database query with values:', values);

    try {
      const result = await db.query(query, values);
      console.log('✅ Database insert successful');
      return this.mapRowToRideRequest(result.rows[0]);
    } catch (dbError: any) {
      console.error('❌ Database error:', dbError);
      console.error('❌ Database error details:', {
        message: dbError.message,
        code: dbError.code,
        detail: dbError.detail
      });
      throw dbError;
    }
  }

  private static async calculateFallbackFare(requestData: CreateRideRequestInput): Promise<number> {
    const R = 6371; 
    
    const lat1 = requestData.pickupLat * Math.PI / 180;
    const lat2 = requestData.dropoffLat * Math.PI / 180;
    const deltaLat = (requestData.dropoffLat - requestData.pickupLat) * Math.PI / 180;
    const deltaLng = (requestData.dropoffLng - requestData.pickupLng) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Base fares based on vehicle type
    const baseFares: { [key: string]: number } = {
      'sedan': 500,
      'suv': 650,
      'van': 750,
      'luxury': 1000,
      'electric': 600,
      'standard': 500
    };

    const baseFare = baseFares[requestData.vehicleType || 'standard'] || 500;
    const distanceFare = distance * 150; // 150 per km
    const timeFare = (distance / 30) * 60 * 20; // 20 per minute, 30km/h average speed

    const totalFare = baseFare + distanceFare + timeFare;
    const minimumFare = baseFare * 1.6; // Minimum fare is 1.6x base fare

    return Math.max(totalFare, minimumFare);
  }

  static async getRideRequestById(id: string): Promise<RideRequest | null> {
    const result = await db.query('SELECT * FROM rider_service.ride_requests WHERE id = $1', [id]);
    return result.rows[0] ? this.mapRowToRideRequest(result.rows[0]) : null;
  }

  static async getRiderRideRequests(riderId: string, limit: number = 10, offset: number = 0): Promise<RideRequest[]> {
    const result = await db.query(
      'SELECT * FROM rider_service.ride_requests WHERE rider_id = $1 ORDER BY requested_at DESC LIMIT $2 OFFSET $3',
      [riderId, limit, offset]
    );
    return result.rows.map(row => this.mapRowToRideRequest(row));
  }

  static async updateRideRequestStatus(requestId: string, status: RideRequest['status']): Promise<RideRequest> {
    let query = 'UPDATE rider_service.ride_requests SET status = $1';
    const values: any[] = [status];

    if (status === 'matched') {
      query += ', matched_at = CURRENT_TIMESTAMP';
    } else if (status === 'cancelled') {
      query += ', cancelled_at = CURRENT_TIMESTAMP';
    }

    query += ' WHERE id = $2 RETURNING *';
    values.push(requestId);

    const result = await db.query(query, values);
    return this.mapRowToRideRequest(result.rows[0]);
  }

  static async updateRiderRating(riderId: string, newRating: number): Promise<Rider> {
    const result = await db.query(
      `UPDATE rider_service.riders 
       SET rating = $1, total_trips = total_trips + 1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 
       RETURNING *`,
      [newRating, riderId]
    );
    return this.mapRowToRider(result.rows[0]);
  }

  // Mapping methods
  private static mapRowToRider(row: any): Rider {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      // Authentication fields
      passwordHash: row.password_hash,
      isVerified: row.is_verified,
      isActive: row.is_active,
      verificationToken: row.verification_token,
      resetToken: row.reset_token,
      resetTokenExpiry: row.reset_token_expiry,
      lastLogin: row.last_login,
      // Rider specific fields
      rating: parseFloat(row.rating),
      totalTrips: row.total_trips,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static mapRowToRideRequest(row: any): RideRequest {
    return {
      id: row.id,
      riderId: row.rider_id,
      pickupLat: parseFloat(row.pickup_lat),
      pickupLng: parseFloat(row.pickup_lng),
      pickupAddress: row.pickup_address,
      dropoffLat: parseFloat(row.dropoff_lat),
      dropoffLng: parseFloat(row.dropoff_lng),
      dropoffAddress: row.dropoff_address,
      vehicleType: row.vehicle_type,
      status: row.status,
      estimatedFare: row.estimated_fare ? parseFloat(row.estimated_fare) : undefined,
      requestedAt: row.requested_at,
      matchedAt: row.matched_at,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason
    };
  }
}