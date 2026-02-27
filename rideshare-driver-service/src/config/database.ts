import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, 
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const connectDB = async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('✅ Auth Service PostgreSQL connected successfully');
  } catch (error) {
    console.error('❌ Auth Service PostgreSQL connection error:', error);
    process.exit(1);
  }
};
