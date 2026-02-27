Trip Service - Docker Setup
A microservice for managing trips and payment data, built with Python and Flask. Containerized with Docker.

🚀 Quick Start with Docker
1. Clone and Navigate
bash
git clone <repository-url>
cd trip-service

2. Create the environment file

Create a .env file in the root of trip-service:

# PostgreSQL
DATABASE_URL=postgresql://<username>:<password>@<host>:5432/<database>?sslmode=require

# Redis
REDIS_URL=redis://:<password>@swiftride-redis:6379

# Flask app
PORT=3005
DEBUG=True


3. Run the service
docker compose up --build 

This will:

Start the Flask REST API on port 3005

Start the WebSocket/background service on port 3006

Connect to Redis and PostgreSQL automatically using your .env variables


4. Visit http://localhost:3005/api-docs/ to view documentation

 