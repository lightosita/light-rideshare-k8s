import { db } from '../config/database';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  rating: number;
  totalTrips: number;
  isAvailable: boolean;
  isVerified: boolean;
  isActive: boolean;
  verificationToken: string | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDriverInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  licenseNumber: string;
  vehicleType: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  licensePlate: string;
  verificationToken: string;
}

export interface DriverLocation {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speedKmh?: number;
  updatedAt: Date;
}

// THIS IS THE MAGIC FUNCTION — maps PostgreSQL snake_case → TypeScript camelCase
const mapRowToDriver = (row: any): Driver => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  email: row.email,
  phone: row.phone,
  passwordHash: row.password_hash,
  licenseNumber: row.license_number,
  vehicleType: row.vehicle_type,
  vehicleMake: row.vehicle_make,
  vehicleModel: row.vehicle_model,
  vehicleYear: row.vehicle_year,
  licensePlate: row.license_plate,
  rating: Number(row.rating ?? 5),
  totalTrips: row.total_trips ?? 0,
  isAvailable: Boolean(row.is_available),
  isVerified: Boolean(row.is_verified),
  isActive: Boolean(row.is_active),
  verificationToken: row.verification_token,
  resetToken: row.reset_token,
  resetTokenExpiry: row.reset_token_expiry,
  lastLogin: row.last_login,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const DriverRepository = {
  async findByEmail(email: string): Promise<Driver | null> {
    const result = await db.query('SELECT * FROM driver_service.drivers WHERE email = $1', [email]);
    return result.rows[0] ? mapRowToDriver(result.rows[0]) : null;
  },

  async findById(id: string): Promise<Driver | null> {
    const result = await db.query('SELECT * FROM driver_service.drivers WHERE id = $1', [id]);
    return result.rows[0] ? mapRowToDriver(result.rows[0]) : null;
  },

  async findByVerificationToken(token: string): Promise<Driver | null> {
    const result = await db.query('SELECT * FROM driver_service.drivers WHERE verification_token = $1', [token]);
    return result.rows[0] ? mapRowToDriver(result.rows[0]) : null;
  },

  async findByResetToken(token: string): Promise<Driver | null> {
    const result = await db.query(
      'SELECT * FROM driver_service.drivers WHERE reset_token = $1 AND reset_token_expiry > NOW()',
      [token]
    );
    return result.rows[0] ? mapRowToDriver(result.rows[0]) : null;
  },

  async create(driverData: CreateDriverInput): Promise<Driver> {
    const { firstName, lastName, email, phone, passwordHash, licenseNumber, vehicleType, vehicleMake, vehicleModel, vehicleYear, licensePlate, verificationToken } = driverData;
    const result = await db.query(
      `INSERT INTO driver_service.drivers (
        first_name, last_name, email, phone, password_hash, license_number,
        vehicle_type, vehicle_make, vehicle_model, vehicle_year, license_plate,
        verification_token, is_verified, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false)
      RETURNING *`,
      [firstName, lastName, email, phone, passwordHash, licenseNumber, vehicleType, vehicleMake, vehicleModel, vehicleYear, licensePlate, verificationToken]
    );
    return mapRowToDriver(result.rows[0]);
  },

  async updateVerification(id: string, isVerified: boolean = true): Promise<Driver> {
    const result = await db.query(
      `UPDATE driver_service.drivers SET is_verified = $1, is_active = true, verification_token = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [isVerified, id]
    );
    if (!result.rows[0]) throw new Error('Driver not found');
    return mapRowToDriver(result.rows[0]);
  },

  // --- THESE WERE MISSING OR CAUSING ERRORS ---

  async updateLastLogin(id: string): Promise<Driver> {
    const result = await db.query(
      'UPDATE driver_service.drivers SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return mapRowToDriver(result.rows[0]);
  },

  async updateResetToken(id: string, resetToken: string, resetTokenExpiry: Date): Promise<Driver> {
    const result = await db.query(
      `UPDATE driver_service.drivers SET reset_token = $1, reset_token_expiry = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [resetToken, resetTokenExpiry, id]
    );
    return mapRowToDriver(result.rows[0]);
  },

  async updatePassword(id: string, passwordHash: string): Promise<Driver> {
    const result = await db.query(
      `UPDATE driver_service.drivers SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [passwordHash, id]
    );
    return mapRowToDriver(result.rows[0]);
  },

  async updateAvailability(id: string, isAvailable: boolean): Promise<Driver> {
    const result = await db.query(
      'UPDATE driver_service.drivers SET is_available = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [isAvailable, id]
    );
    return mapRowToDriver(result.rows[0]);
  },

  async getCurrentLocation(driverId: string): Promise<DriverLocation | null> {
    const result = await db.query(
      'SELECT * FROM driver_service.driver_locations WHERE driver_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [driverId]
    );
    return result.rows[0] || null;
  },

  async updateLocation(locationData: any): Promise<DriverLocation> {
    const { driverId, latitude, longitude, heading, speedKmh } = locationData;
    const result = await db.query(
      `INSERT INTO driver_service.driver_locations (driver_id, latitude, longitude, heading, speed_kmh)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (driver_id) DO UPDATE 
       SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, heading = EXCLUDED.heading, speed_kmh = EXCLUDED.speed_kmh, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [driverId, latitude, longitude, heading ?? null, speedKmh ?? null]
    );
    return result.rows[0];
  }
};