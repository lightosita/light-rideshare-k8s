# src/utils/health.py
from fastapi import APIRouter
from prometheus_client import generate_latest, REGISTRY, Counter, Histogram
import time

router = APIRouter()

# Prometheus metrics
REQUEST_COUNT = Counter('trip_service_requests_total', 'Total requests', ['method', 'endpoint', 'status'])
REQUEST_LATENCY = Histogram('trip_service_request_latency_seconds', 'Request latency', ['method', 'endpoint'])

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "trip-service"}

@router.get("/metrics")
async def metrics():
    return generate_latest(REGISTRY)