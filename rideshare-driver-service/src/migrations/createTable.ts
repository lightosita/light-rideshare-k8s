import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const createDriverTables = async (): Promise<void> => {
  const client = await db.connect();
  
  try {
    console.log('🔄 Initializing driver_service schema and tables...');
    await client.query('BEGIN');

    await client.query('CREATE SCHEMA IF NOT EXISTS driver_service');

    await client.query('SET search_path TO driver_service');

    await client.query('DROP TABLE IF EXISTS earnings CASCADE');
    await client.query('DROP TABLE IF EXISTS driver_locations CASCADE');
    await client.query('DROP TABLE IF EXISTS drivers CASCADE');

    await client.query(`
      CREATE TABLE drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        license_number VARCHAR(50) UNIQUE NOT NULL,
        vehicle_type VARCHAR(50) NOT NULL,
        vehicle_make VARCHAR(100) NOT NULL,
        vehicle_model VARCHAR(100) NOT NULL,
        vehicle_year INTEGER NOT NULL,
        license_plate VARCHAR(20) NOT NULL,
        rating DECIMAL(3, 2) DEFAULT 5.00,
        total_trips INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT false,
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    await client.query(`
      CREATE TABLE driver_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID UNIQUE REFERENCES drivers(id) ON DELETE CASCADE,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        heading DECIMAL(5, 2),
        speed_kmh DECIMAL(5, 2),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

  
    await client.query(`
      CREATE TABLE earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
        trip_id UUID UNIQUE NOT NULL,
        gross_amount DECIMAL(10, 2) NOT NULL,
        commission DECIMAL(10, 2) NOT NULL,
        net_amount DECIMAL(10, 2) NOT NULL,
        earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);


    await client.query('CREATE INDEX idx_drivers_email ON drivers(email)');
    await client.query('CREATE INDEX idx_drivers_phone ON drivers(phone)');
    await client.query('CREATE INDEX idx_driver_locations_driver_id ON driver_locations(driver_id)');
    await client.query('CREATE INDEX idx_driver_earnings_driver_id ON earnings(driver_id)');

    await client.query('COMMIT');
    console.log('✅ Driver service tables created successfully with required constraints!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await db.end();
  }
};

if (require.main === module) {
  createDriverTables()
    .then(() => {
      console.log('🚀 Migration completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('🚀 Migration crashed:', err);
      process.exit(1);
    });
}

export default createDriverTables;