Swiftride Frontend (Next.js)

This folder contains the Next.js frontend for the Swiftride platform.
It is built to run in Docker and can connect to backend services running on the shared swiftride-net network.

🧱 Architecture

The frontend is stateless.
It uses environment variables to configure API endpoints.
Connects to backend services via the shared Docker network (swiftride-net).
Designed for production deployment using a multi-stage Dockerfile.

📦 Docker Setup

The frontend uses the included Dockerfile for a multi-stage build:
Base: Node.js Alpine image
Deps: Installs dependencies
Builder: Builds the Next.js application
Runner: Production-ready container with minimal runtime files

🔗 Environment Variables
Create a .env file in this folder (or update the one that exists) with the following variables:
NEXT_PUBLIC_DRIVER_API=http://localhost:3003
NEXT_PUBLIC_RIDER_API=http://localhost:3002
NEXT_PUBLIC_TRIP_API=http://localhost:3004
NEXT_PUBLIC_MATCHING_API=http://localhost:3005
NEXT_PUBLIC_WS_URL=ws://localhost:3004
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=

Ensure the backend services and Redis are running and on the swiftride-net network before starting the frontend.

1️⃣ Build and run using Docker Compose
docker compose -f docker-compose.yml up --build

The frontend will be available at http://localhost:3000
