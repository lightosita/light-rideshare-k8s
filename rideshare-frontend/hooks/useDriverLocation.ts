'use client';

import { useState, useCallback } from 'react';

export type RouteCoordinate = { lat: number; lng: number };

interface RouteOptions {
  alternatives?: boolean;
  steps?: boolean;
  geometries?: 'geojson' | 'polyline' | 'polyline6';
  overview?: 'full' | 'simplified' | 'false';
}

export function useRouteCalculation(
  accessToken: string,
  options: RouteOptions = {}
) {
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateRoute = useCallback(
    async (origin: RouteCoordinate | null, destination: RouteCoordinate | null) => {
      if (!origin || !destination) {
        setRouteCoordinates([]);
        setError(null);
        setLoading(false);
        return;
      }

      if (
        typeof origin.lat !== 'number' ||
        isNaN(origin.lat) ||
        typeof origin.lng !== 'number' ||
        isNaN(origin.lng) ||
        typeof destination.lat !== 'number' ||
        isNaN(destination.lat) ||
        typeof destination.lng !== 'number' ||
        isNaN(destination.lng)
      ) {
        console.warn('Invalid coordinates', { origin, destination });
        setError('Invalid origin or destination coordinates');
        setRouteCoordinates([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const baseUrl = 'https://api.mapbox.com/directions/v5/mapbox/driving';
        const start = `${origin.lng},${origin.lat}`;
        const end = `${destination.lng},${destination.lat}`;

        console.log(`[Mapbox Directions] ${start} → ${end}`);

        const params = new URLSearchParams({
          access_token: accessToken,
          geometries: options.geometries || 'geojson',
          overview: options.overview || 'full',
          alternatives: String(options.alternatives ?? false),
          steps: String(options.steps ?? false),
        });

        const url = `${baseUrl}/${encodeURIComponent(start)};${encodeURIComponent(end)}?${params}`;

        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`Mapbox error ${res.status}: ${text || res.statusText}`);
        }

        const data = await res.json();

        if (!data.routes?.[0]?.geometry?.coordinates) {
          throw new Error('No valid route geometry found');
        }

        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => ({
          lat,
          lng,
        }));

        setRouteCoordinates(coords);
      } catch (err: any) {
        console.error('Route fetch failed:', err);
        setError(err.message || 'Could not calculate route');
        // Minimal fallback
        setRouteCoordinates([origin, destination]);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, options.geometries, options.overview, options.alternatives, options.steps]
  );

  const clearRoute = useCallback(() => {
    setRouteCoordinates([]);
    setError(null);
  }, []);

  return {
    routeCoordinates,
    loading,
    error,
    calculateRoute,  
    clearRoute,
  };
}


export function useMockRouteCalculation() {
  const [routeCoordinates, setRouteCoordinates] = useState<RouteCoordinate[]>([]);

  const calculateRoute = useCallback((origin: RouteCoordinate | null, destination: RouteCoordinate | null) => {
    if (!origin || !destination) {
      setRouteCoordinates([]);
      return;
    }
    const points: RouteCoordinate[] = [origin];

    const steps = 8;
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const lat = origin.lat + (destination.lat - origin.lat) * t + Math.sin(t * Math.PI) * 0.002;
      const lng = origin.lng + (destination.lng - origin.lng) * t + (Math.random() - 0.5) * 0.0015;
      points.push({ lat, lng });
    }

    points.push(destination);
    setRouteCoordinates(points);
  }, []);

  return {
    routeCoordinates,
    loading: false,
    error: null,
    calculateRoute,
    clearRoute: () => setRouteCoordinates([]),
  };
}