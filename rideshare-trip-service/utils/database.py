
import pg8000
import urllib.parse
import ssl
from config import Config
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def get_db_connection():
    """Get database connection"""
    DATABASE_URL = Config.DATABASE_URL
    
    if DATABASE_URL.startswith('postgresql://'):
        parsed = urllib.parse.urlparse(DATABASE_URL)
        
        username = parsed.username
        password = parsed.password
        hostname = parsed.hostname
        port = parsed.port or 5432
        database = parsed.path[1:]
        
        query_params = urllib.parse.parse_qs(parsed.query)
        ssl_mode = query_params.get('sslmode', ['require'])[0]
        
        # Configure SSL context
        ssl_context = ssl.create_default_context()
        if ssl_mode == 'require':
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
        
        return pg8000.connect(
            user=username,
            password=password,
            host=hostname,
            port=port,
            database=database,
            ssl_context=ssl_context,
            timeout=30
        )
    else:
        raise ValueError("Invalid DATABASE_URL format. Must start with 'postgresql://'")


def migrate_trips_table(cursor):
    """Add missing columns to trips table if they do not exist."""
    
    columns_to_add = {
        "rider_name": "TEXT",
        "rider_phone": "TEXT",
        "rider_rating": "NUMERIC(3,2) DEFAULT 4.8",
        "driver_info": "JSONB",
    }

    for column, definition in columns_to_add.items():
        cursor.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'trip_service' 
                      AND table_name = 'trips' 
                      AND column_name = '{column}'
                ) THEN
                    ALTER TABLE trip_service.trips ADD COLUMN {column} {definition};
                END IF;
            END
            $$;
        """)
    
    logging.info("Trips table migration applied (rider_name, rider_phone, rider_rating, driver_info).")


def migrate_payment_columns(cursor):
    """Add payment-related columns to trips table"""
    columns_to_add = {
        "payment_processed_at": "TIMESTAMP",
        "driver_payment_amount": "DECIMAL(10,2)",
        "platform_commission": "DECIMAL(10,2)",
        "payment_status": "VARCHAR(50) DEFAULT 'pending'"
    }
    
    for column, definition in columns_to_add.items():
        cursor.execute(f"""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_schema = 'trip_service' 
                      AND table_name = 'trips' 
                      AND column_name = '{column}'
                ) THEN
                    ALTER TABLE trip_service.trips ADD COLUMN {column} {definition};
                END IF;
            END
            $$;
        """)
    
    logging.info("Payment columns added to trips table")


def create_payment_tables(cursor):
    """Create payment-related tables"""
    
    # Create driver_accounts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_service.driver_accounts (
            driver_id UUID PRIMARY KEY,
            current_balance DECIMAL(10, 2) DEFAULT 0.00,
            total_earnings DECIMAL(10, 2) DEFAULT 0.00,
            last_payment_date TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    logging.info("Table trip_service.driver_accounts checked/created.")
    
    # Create driver_transactions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_service.driver_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            driver_id UUID NOT NULL,
            trip_id UUID NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            transaction_type VARCHAR(50) DEFAULT 'trip_payment',
            status VARCHAR(50) DEFAULT 'completed',
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trip_id) REFERENCES trip_service.trips(id)
        )
    """)
    logging.info("Table trip_service.driver_transactions checked/created.")
    
    # Create index for faster queries
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_driver_transactions_driver_id 
        ON trip_service.driver_transactions(driver_id)
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_driver_transactions_trip_id 
        ON trip_service.driver_transactions(trip_id)
    """)
    
    logging.info("Indexes created for driver_transactions table.")


def init_database():
    """Initialize database schema with migrations for trips table."""
    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            # --- 1. Create Schema ---
            cursor.execute("CREATE SCHEMA IF NOT EXISTS trip_service")
            logging.info("Schema trip_service checked/created.")

            # --- 2. Create trips table ---
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trip_service.trips (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    ride_request_id UUID UNIQUE NOT NULL,
                    driver_id UUID NOT NULL,
                    rider_id UUID NOT NULL,
                    
                    pickup_lat DOUBLE PRECISION NOT NULL,
                    pickup_lng DOUBLE PRECISION NOT NULL,
                    dropoff_lat DOUBLE PRECISION NOT NULL,
                    dropoff_lng DOUBLE PRECISION NOT NULL,
                    
                    pickup_address TEXT,
                    dropoff_address TEXT,
                    
                    status VARCHAR(50) DEFAULT 'accepted',
                    vehicle_type VARCHAR(50),
                    estimated_fare DECIMAL(10, 2),
                    actual_fare DECIMAL(10, 2),
                    
                    distance_km DOUBLE PRECISION,
                    duration_minutes DOUBLE PRECISION,
                    
                    driver_info JSONB,
                    
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """)
            logging.info("Table trip_service.trips checked/created.")

            # --- 3. Migrate trips table for missing rider/driver columns ---
            migrate_trips_table(cursor)

            # --- 4. Add payment columns to trips table ---
            migrate_payment_columns(cursor)

            # --- 5. Create fare_config table ---
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS trip_service.fare_config (
                    id SERIAL PRIMARY KEY,
                    vehicle_type VARCHAR(50) DEFAULT 'standard',
                    base_fare DECIMAL(10, 2) DEFAULT 500.00,
                    per_km_rate DECIMAL(10, 2) DEFAULT 150.00,
                    per_minute_rate DECIMAL(10, 2) DEFAULT 20.00,
                    minimum_fare DECIMAL(10, 2) DEFAULT 800.00,
                    surge_multiplier DECIMAL(3, 2) DEFAULT 1.00,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(vehicle_type)
                )
            """)
            logging.info("Table trip_service.fare_config checked/created.")

            # --- 6. Insert default fare configurations ---
            cursor.execute("""
                INSERT INTO trip_service.fare_config 
                (vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare, surge_multiplier)
                VALUES 
                ('standard', 500.00, 150.00, 20.00, 800.00, 1.00),
                ('premium', 800.00, 200.00, 30.00, 1200.00, 1.00),
                ('xl', 700.00, 180.00, 25.00, 1000.00, 1.00)
                ON CONFLICT (vehicle_type) DO NOTHING
            """)
            logging.info("Default fare configurations inserted.")

            # --- 7. Create payment tables ---
            create_payment_tables(cursor)

            # --- 8. Commit Changes ---
            conn.commit()
            logging.info("✓ Database initialized successfully with payment tables!")

    except Exception as e:
        if conn:
            conn.rollback()
        logging.error(f"Database initialization failed: {e}", exc_info=True)
        raise
    finally:
        if conn:
            conn.close()