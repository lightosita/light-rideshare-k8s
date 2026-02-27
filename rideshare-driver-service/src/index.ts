import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import driverRoutes from './routes/driver';
import { connectDB } from './config/database';

const app = express();
const PORT = process.env.PORT || 3005; 


app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  message: 'Too many requests from this IP',
});
app.use('/api/', limiter);


app.use('/api/v1/drivers', driverRoutes);  
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));


app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'driver-service',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required env vars: ${missingVars.join(', ')}`);
    }

    await connectDB();

   app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Driver service running on http://localhost:${PORT}/api/v1`);
  console.log(`Driver service doc running on http://localhost:${PORT}/api/v1/docs`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
  } catch (error: any) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();