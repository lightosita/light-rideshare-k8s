Email Service - Docker Setup
A microservice for managing email notifications, built with Python and Flask. Containerized with Docker.

🚀 Quick Start with Docker
1. Clone and Navigate
bash
git clone <repository-url>
cd email-service

2. Build the Docker Image
docker compose up --build

3. Create Environment File
cat > .env << 'EOF'
PORT=3002
AZURE_EMAIL_CONNECTION_STRING=your-azure-email-connection-string-here
EOF

4. Run with Docker
docker run -d \
  --name email-service \
  -p 3002:3002 \
  --env-file .env \
  email-service:latest

  OR (without .env file):

  docker run -d \
  --name email-service \
  -p 3002:3002 \
  -e PORT=3002 \
  -e AZURE_EMAIL_CONNECTION_STRING="your-actual-connection-string-here" \
  email-service:latest

 