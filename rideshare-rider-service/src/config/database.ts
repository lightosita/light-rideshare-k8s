
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
});

export const connectDB = async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('✅ Rider Service PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Rider Service PostgreSQL connection error:', error);
    process.exit(1);
  }
};