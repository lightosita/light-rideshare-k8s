import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import riderRoutes from './routes/rider'; 
import { connectDB } from './config/database';
import swaggerDocument from './swagger.json'; 


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; 

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);



app.use('/api/v1/riders/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use('/api/v1/riders', riderRoutes);


app.get('/api/v1/riders/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'rider-service',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/v1/riders/ready', (req, res) => {
  res.json({ 
    status: 'READY', 
    service: 'rider-service',
    timestamp: new Date().toISOString()
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

const startServer = async () => {
  try {
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET']; 
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚶 Rider service running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health: http://localhost:${PORT}/api/v1/riders/health`);
      console.log(`🚶 Rider service doc: http://localhost:${PORT}/api/v1/riders/docs`);
      console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Set' : 'Missing!'}`);
    });
  } catch (error) {
    console.error('Failed to start rider service:', error);
    process.exit(1);
  }
};

startServer();