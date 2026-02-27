import { db } from '../config/database';

const createTables = async () => {
  let client;

  try {
    console.log('🔄 Creating rider service tables in rider_service schema...');

    client = await db.connect();

    // ────────────────────────────────────────────────
    // Start transaction
    await client.query('BEGIN');

    // 1. Create schema if it doesn't exist (this is the most important fix)
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS rider_service
    `);

    // 2. Set search_path **after** schema is guaranteed to exist
    await client.query('SET search_path TO rider_service, public');

    // 3. (Optional) Drop existing tables — comment out after first successful run
    //    or make it conditional / prompted in development only
    console.log('🗑️  Dropping existing tables (if any)...');
    await client.query('DROP TABLE IF EXISTS ride_requests CASCADE');
    await client.query('DROP TABLE IF EXISTS riders CASCADE');

    // 4. Create riders table
    console.log('📋 Creating riders table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS riders (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name          VARCHAR(255) NOT NULL,
        last_name           VARCHAR(255) NOT NULL,
        email               VARCHAR(255) UNIQUE NOT NULL,
        phone               VARCHAR(20)  UNIQUE NOT NULL,

        -- Authentication
        password_hash       VARCHAR(255) NOT NULL,
        is_verified         BOOLEAN DEFAULT FALSE,
        is_active           BOOLEAN DEFAULT TRUE,
        verification_token  VARCHAR(255),
        reset_token         VARCHAR(255),
        reset_token_expiry  TIMESTAMP,
        last_login          TIMESTAMP,

        -- Business fields
        rating              DECIMAL(3,2) DEFAULT 5.00,
        total_trips         INTEGER DEFAULT 0,

        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Create ride_requests table
    console.log('📋 Creating ride_requests table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ride_requests (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rider_id            UUID REFERENCES riders(id) ON DELETE CASCADE,

        pickup_lat          DECIMAL(10,8) NOT NULL,
        pickup_lng          DECIMAL(11,8) NOT NULL,
        pickup_address      TEXT,
        dropoff_lat         DECIMAL(10,8) NOT NULL,
        dropoff_lng         DECIMAL(11,8) NOT NULL,
        dropoff_address     TEXT,

        vehicle_type        VARCHAR(50) DEFAULT 'standard',
        status              VARCHAR(50) DEFAULT 'pending',

        estimated_fare      DECIMAL(10,2),
        requested_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        matched_at          TIMESTAMP,
        cancelled_at        TIMESTAMP,
        cancellation_reason TEXT
      )
    `);

    // 6. Create useful indexes
    console.log('📈 Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_riders_email              ON riders(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_riders_verification_token ON riders(verification_token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_riders_reset_token        ON riders(reset_token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ride_requests_rider_id    ON ride_requests(rider_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ride_requests_status      ON ride_requests(status)');

    // Commit transaction
    await client.query('COMMIT');

    console.log('✅ Rider service tables & schema created successfully');

  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (client) client.release();
    await db.end().catch(() => {});
  }
};

if (require.main === module) {
  createTables()
    .then(() => {
      console.log('🎉 Rider service migration completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('💥 Migration failed:', err);
      process.exit(1);
    });
}

export { createTables };