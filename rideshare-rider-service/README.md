Rider Service - Docker Setup
A microservice for managing rider information, rider authentication built with Node.js, Express, TypeScript, and PostgreSQL. Containerized with Docker.

🚀 Quick Start with docker compose
1. Clone and Navigate
git clone <repository-url>
cd rider-service

2. Create the environment file
Create a .env file in the root of rider-service:
NODE_ENV=development
PORT=3001

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=2d

# PostgreSQL
DATABASE_URL=postgresql://<username>:<password>@<host>:5432/<database>?sslmode=require

# Redis
REDIS_HOST=swiftride-redis
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Frontend & other services
FRONTEND_URL=http://localhost:3000
EMAIL_SERVICE_URL=http://email-service:3002
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
RIDER_SERVICE_URL=http://rider-service:3001
TRIP_SERVICE_URL=http://trip-service:3005


3. Run the service
With Docker Compose, the service will start automatically using the .env file:
docker compose up --build 
This will:
Start the Rider Service on port 3001
Connect automatically to Redis and PostgreSQL using the values in .env
Enable communication with other services like Trip Service or Email Service

4. Visit http://localhost:3001/api-docs/ to view documentation
