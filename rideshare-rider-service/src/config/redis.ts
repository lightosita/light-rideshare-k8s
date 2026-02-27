
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,       
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD,
});


redis.on('connect', () => console.log('✅ Rider Service connected to Redis'));
redis.on('error', (err) => console.error('❌ Rider Service Redis Error:', err));

export const connectRedis = async () => {
  try {
    await redis.ping();
    console.log('✅ Rider Service Redis connection verified');
  } catch (error) {
    console.error('❌ Rider Service Redis connection failed:', error);
    throw error;
  }
};