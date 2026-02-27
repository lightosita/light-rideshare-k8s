import React, { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    mapboxgl: any;
  }
}

type RouteCoordinate = { lat: number; lng: number };

interface LiveDriverMapProps {
  driverLocation: RouteCoordinate;
  pickupLocation: { lat: number; lng: number; address: string };
  dropoffLocation: { lat: number; lng: number; address: string };
  routeCoordinates: RouteCoordinate[];

  onMapClick?: (coordinates: RouteCoordinate) => void;
}

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || 'YOUR_MAPBOX_ACCESS_TOKEN';

const createMovementTrail = () => {
  const size = 128;
  
  return {
    width: size,
    height: size,
    data: new Uint8Array(size * size * 4),
    
    onAdd: function (this: any) {
      const canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      this.context = canvas.getContext('2d')!;
    },
    
    render: function (this: any) {
      const duration = 1000;
      const t = (performance.now() % duration) / duration;
      const context = this.context;
      
      context.clearRect(0, 0, this.width, this.height);
    
      const gradient = context.createRadialGradient(
        this.width / 2,
        this.height / 2,
        0,
        this.width / 2,
        this.height / 2,
        this.width / 2
      );
      
      gradient.addColorStop(0, `rgba(59, 130, 246, ${0.8 * (1 - t)})`);
      gradient.addColorStop(0.5, `rgba(59, 130, 246, ${0.4 * (1 - t)})`);
      gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
      
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(this.width / 2, this.height / 2, this.width / 2, 0, Math.PI * 2);
      context.fill();
      
      this.data = context.getImageData(0, 0, this.width, this.height).data;
      return true;
    }
  };
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

const calculateBearing = (from: RouteCoordinate, to: RouteCoordinate) => {
  if (Math.abs(from.lat - to.lat) < 0.00001 && Math.abs(from.lng - to.lng) < 0.00001) return 0;
  
  const δL = toRad(to.lng - from.lng);
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);

  const y = Math.sin(δL) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(δL);
  let brng = Math.atan2(y, x) * 180 / Math.PI;
  return (brng + 360) % 360;
};

// Create a small vibration effect for movement
const createVibrationAnimation = () => {
  const vibrationIntensity = 2; // pixels
  const vibrationSpeed = 0.1;
  
  return {
    apply: (element: HTMLElement, isMoving: boolean, speed: number) => {
      if (!isMoving || speed < 0.1) {
        element.style.transform = element.style.transform.replace(/translate\([^)]+\)\s*/, '');
        return;
      }
      
      const time = performance.now() * vibrationSpeed;
      const x = Math.sin(time) * vibrationIntensity * Math.min(speed, 1);
      const y = Math.cos(time * 0.7) * vibrationIntensity * Math.min(speed, 1);
      
      const currentTransform = element.style.transform;
      const cleanTransform = currentTransform.replace(/translate\([^)]+\)\s*/, '');
      element.style.transform = `${cleanTransform} translate(${x}px, ${y}px)`;
    }
  };
};


const LiveDriverMap: React.FC<LiveDriverMapProps> = ({
  driverLocation,
  pickupLocation,
  dropoffLocation,
  routeCoordinates,
  onMapClick,
}) => {

  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const driverMarker = useRef<any>(null);
  const pickupMarker = useRef<any>(null);
  const dropoffMarker = useRef<any>(null);
  const movementTrailMarker = useRef<any>(null);

  const [prevLocation, setPrevLocation] = useState(driverLocation);
  const [movementSpeed, setMovementSpeed] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const animationRef = useRef<number | null>(null);
  const lastUpdateTimestamp = useRef<number>(performance.now());
  const ANIMATION_DURATION = 2000;
  const vibrationAnimator = useRef(createVibrationAnimation());

  const [isMapboxLoaded, setIsMapboxLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

 
  const calculateDistance = useCallback((from: RouteCoordinate, to: RouteCoordinate) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = toRad(from.lat);
    const φ2 = toRad(to.lat);
    const Δφ = toRad(to.lat - from.lat);
    const Δλ = toRad(to.lng - from.lng);

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
  }, []);

  
  useEffect(() => {
    
    if (MAPBOX_ACCESS_TOKEN === 'YOUR_MAPBOX_ACCESS_TOKEN') {
      setMapError('Mapbox access token not configured. Please add your token to NEXT_PUBLIC_MAPBOX_TOKEN environment variable.');
      return;
    }

    // Load Mapbox CSS
    if (!document.querySelector('link[href*="mapbox-gl.css"]')) {
      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      link.onerror = () => setMapError('Failed to load Mapbox CSS');
      document.head.appendChild(link);
    }

    // Load Mapbox JS
    if (!document.querySelector('script[src*="mapbox-gl.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.js';
      script.onload = () => {
        if (window.mapboxgl) {
          window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
          setIsMapboxLoaded(true);
        }
      };
      script.onerror = () => {
        setMapError('Failed to load Mapbox GL JS. Check your internet connection.');
      };
      document.head.appendChild(script);
    } else {
      // Script already exists, check if loaded
      const checkMapbox = setInterval(() => {
        if (window.mapboxgl) {
          window.mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
          setIsMapboxLoaded(true);
          clearInterval(checkMapbox);
        }
      }, 100);
    }
  }, []);

  // --- 2. Marker Animation Logic ---
  const animateMarker = useCallback((timestamp: number) => {
    if (!driverMarker.current || !map.current || !window.mapboxgl) return;

    const start = prevLocation;
    const end = driverLocation;

    if (start.lat === end.lat && start.lng === end.lng) {
      setIsMoving(false);
      setMovementSpeed(0);
      animationRef.current = null;
      return;
    }

    const elapsed = timestamp - lastUpdateTimestamp.current;
    const t = Math.min(1, elapsed / ANIMATION_DURATION);

    // Calculate speed
    const distance = calculateDistance(start, end);
    const speed = distance / (ANIMATION_DURATION / 1000); // meters per second
    setMovementSpeed(speed);
    setIsMoving(speed > 0.5);

    // Easing function for smoother animation
    const easeOutQuad = (x: number): number => 1 - Math.pow(1 - x, 3);

    const easedT = easeOutQuad(t);
    const currentLng = start.lng + (end.lng - start.lng) * easedT;
    const currentLat = start.lat + (end.lat - start.lat) * easedT;

    // Update driver marker
    driverMarker.current.setLngLat([currentLng, currentLat]);

    // Update movement trail if it exists
    if (movementTrailMarker.current) {
      movementTrailMarker.current.setLngLat([currentLng, currentLat]);
    }

    // Apply vibration effect if moving
    if (driverMarker.current.getElement() && isMoving) {
      vibrationAnimator.current.apply(
        driverMarker.current.getElement(), 
        isMoving, 
        Math.min(speed / 20, 1) // Normalize speed for vibration
      );
    }

    // Smooth camera follow with padding
    map.current.easeTo({
      center: [currentLng, currentLat],
      padding: { top: 0, bottom: 200, left: 0, right: 0 },
      duration: 0,
    });

    if (t < 1) {
      animationRef.current = requestAnimationFrame(animateMarker);
    } else {
      driverMarker.current.setLngLat([end.lng, end.lat]);
      animationRef.current = null;
    }
  }, [prevLocation, driverLocation, calculateDistance]);

  // --- 3. Map Initialization ---
  useEffect(() => {
    if (!mapContainer.current || map.current || !isMapboxLoaded || mapError) return;
    
    const mapboxgl = window.mapboxgl;
    if (!mapboxgl) return;

    try {
      // Initialize Map
      const mapInstance = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [driverLocation.lng, driverLocation.lat],
        zoom: 14,
        pitch: 45,
        bearing: 0,
        accessToken: MAPBOX_ACCESS_TOKEN,
      });

      map.current = mapInstance;

      // Add navigation controls
      mapInstance.addControl(new mapboxgl.NavigationControl(), 'top-right');

      mapInstance.on('load', () => {
        // Add route source and layer
        mapInstance.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        mapInstance.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3B82F6',
            'line-width': 6,
            'line-opacity': 0.8,
          },
        });

        // Fit bounds to show all important points
        const bounds = new mapboxgl.LngLatBounds();
        bounds.extend([driverLocation.lng, driverLocation.lat]);
        bounds.extend([pickupLocation.lng, pickupLocation.lat]);
        bounds.extend([dropoffLocation.lng, dropoffLocation.lat]);
        
        mapInstance.fitBounds(bounds, {
          padding: { top: 50, bottom: 200, left: 50, right: 50 },
          duration: 2000,
        });
      });

      // Create driver marker WITHOUT circle
      const carEl = document.createElement('div');
      carEl.className = 'w-12 h-12 transition-all duration-500 ease-out';
      carEl.style.transformOrigin = 'center';
      carEl.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))';
      
      driverMarker.current = new mapboxgl.Marker({
        element: carEl,
        anchor: 'center',
        offset: [0, 0]
      })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(mapInstance);

      // Create movement trail marker
      const movementTrailEl = document.createElement('div');
      movementTrailEl.className = 'w-16 h-16';
      
      movementTrailMarker.current = new mapboxgl.Marker({
        element: movementTrailEl,
        anchor: 'center',
      })
        .setLngLat([driverLocation.lng, driverLocation.lat])
        .addTo(mapInstance);

      // Add movement trail image
      mapInstance.on('load', () => {
        mapInstance.addImage('movement-trail', createMovementTrail(), { pixelRatio: 2 });
      });

      // Create pickup marker with popup
      const pickupEl = document.createElement('div');
      pickupEl.className = 'w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg';
      
      pickupMarker.current = new mapboxgl.Marker({
        element: pickupEl,
        anchor: 'center',
      })
        .setLngLat([pickupLocation.lng, pickupLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Pickup: ${pickupLocation.address}`))
        .addTo(mapInstance);

      // Create dropoff marker with popup
      const dropoffEl = document.createElement('div');
      dropoffEl.className = 'w-8 h-8 bg-red-500 rounded-full border-4 border-white shadow-lg';
      
      dropoffMarker.current = new mapboxgl.Marker({
        element: dropoffEl,
        anchor: 'center',
      })
        .setLngLat([dropoffLocation.lng, dropoffLocation.lat])
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(`Dropoff: ${dropoffLocation.address}`))
        .addTo(mapInstance);

      // Add click handler to map
      if (onMapClick) {
        mapInstance.on('click', (e: any) => {
          onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
      }

      // Add map error handler
      mapInstance.on('error', (e: any) => {
        console.error('Map error:', e.error);
        setMapError('Map rendering error occurred');
      });

    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isMapboxLoaded, mapError, driverLocation, pickupLocation, dropoffLocation, onMapClick]);

  // --- 4. Update Route and Driver Position ---
  useEffect(() => {
    if (!map.current || !driverMarker.current) return;

    // Stop previous animation
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    // Calculate bearing
    const calculatedBearing = calculateBearing(prevLocation, driverLocation);

   

    // Start animation
    lastUpdateTimestamp.current = performance.now();
    animationRef.current = requestAnimationFrame(animateMarker);

    // Update route line
    if (map.current.getSource('route')) {
      const coordinatesForMapbox = routeCoordinates.length > 0
        ? routeCoordinates.map(coord => [coord.lng, coord.lat])
        : [
            [driverLocation.lng, driverLocation.lat],
            [pickupLocation.lng, pickupLocation.lat],
          ];

      const routeGeoJSON: GeoJSON.Feature<GeoJSON.LineString> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: coordinatesForMapbox as [number, number][],
        },
      };

      (map.current.getSource('route') as any).setData(routeGeoJSON);
    }

    // Update previous location
    setPrevLocation(driverLocation);
  }, [driverLocation, routeCoordinates, animateMarker, prevLocation, pickupLocation, movementSpeed]);



  // --- 6. Render ---
  if (mapError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] w-full bg-gray-100 rounded-2xl shadow-xl p-8">
        <div className="text-red-500 text-6xl mb-4">🗺️</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Map Error</h3>
        <p className="text-gray-600 text-center mb-4">{mapError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Reload Map
        </button>
      </div>
    );
  }

  if (!isMapboxLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] w-full bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
        <p className="text-gray-700 font-medium">Loading Map...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a few seconds</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-2xl bg-linear-to-br from-gray-900 to-gray-800">
      <div ref={mapContainer} className="h-full w-full min-h-[500px]" />

    

      {/* Route Info Card */}
      <div className="absolute bottom-6 left-6 right-6 bg-white/95 backdrop-blur-xl rounded-2xl p-5 shadow-2xl border border-gray-200 z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Pickup</span>
            </div>
            <p className="text-sm text-gray-600 truncate">{pickupLocation.address}</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">Dropoff</span>
            </div>
            <p className="text-sm text-gray-600 truncate">{dropoffLocation.address}</p>
          </div>
          
         
        </div>
        
      </div>

      {/* Map Controls Overlay */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
        <button
          onClick={() => {
            if (map.current && driverMarker.current) {
              const driverLngLat = driverMarker.current.getLngLat();
              map.current.flyTo({
                center: [driverLngLat.lng, driverLngLat.lat],
                zoom: 16,
                duration: 1000,
              });
            }
          }}
          className="bg-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          title="Center on driver"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-xl">📍</span>
          </div>
        </button>
        
        <button
          onClick={() => {
            if (map.current) {
              const bounds = new window.mapboxgl.LngLatBounds();
              bounds.extend([driverLocation.lng, driverLocation.lat]);
              bounds.extend([pickupLocation.lng, pickupLocation.lat]);
              bounds.extend([dropoffLocation.lng, dropoffLocation.lat]);
              
              map.current.fitBounds(bounds, {
                padding: { top: 50, bottom: 200, left: 50, right: 50 },
                duration: 1000,
              });
            }
          }}
          className="bg-white p-3 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
          title="Show all points"
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <span className="text-xl">🗺️</span>
          </div>
        </button>
      </div>

      {/* Movement Visualization Overlay */}
      {isMoving && (
        <div className="absolute top-20 left-6 bg-black/80 backdrop-blur-md rounded-xl px-4 py-2 shadow-xl border border-gray-700 z-10 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">⚡</span>
            </div>
            <div>
              <p className="text-sm text-white font-medium">Live Movement</p>
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      className="w-1 h-6 bg-linear-to-t from-blue-400 to-purple-400 rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: '0.8s',
                        opacity: 0.3 + (i * 0.15)
                      }}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-300">Real-time tracking active</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDriverMap;