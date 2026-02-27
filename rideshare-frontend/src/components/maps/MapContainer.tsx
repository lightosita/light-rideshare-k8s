import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface RequestRideMapProps {
  pickupLocation?: MapLocation;
  dropoffLocation?: MapLocation;
  driverLocation?: MapLocation;
  showRoute?: boolean;
  onMapClick?: (location: MapLocation) => void;
  isRideActive?: boolean;
  routeCoordinates?: [number, number][];
}

// Check for WebGL support
const checkWebGLSupport = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && 
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
};

// Track RTL plugin initialization globally to prevent multiple calls
let rtlPluginInitialized = false;

export default function RequestRideMap({
  pickupLocation,
  dropoffLocation,
  onMapClick,
  showRoute = false,
  isRideActive = false,
  routeCoordinates = [],
}: RequestRideMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{
    pickup?: mapboxgl.Marker;
    dropoff?: mapboxgl.Marker;
  }>({});

  const [isMapReady, setIsMapReady] = useState(false);
  const [webGLError, setWebGLError] = useState<string | null>(null);
  const routeSource = useRef<string | null>(null);
  const routeCalculationTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastRouteId = useRef<string>('');

  // Initialize Mapbox GL
  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;
    
    const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (!token) {
      console.error('Mapbox token is missing');
      setWebGLError('Mapbox configuration error. Please contact support.');
      return;
    }

    // Check WebGL support
    if (!checkWebGLSupport()) {
      setWebGLError('Your browser or device does not support WebGL. Please try a different browser or enable hardware acceleration.');
      return;
    }

    mapboxgl.accessToken = token;
    
    // Initialize RTL plugin only once globally
    if (!rtlPluginInitialized) {
      try {
        mapboxgl.setRTLTextPlugin(
          'https://api.mapbox.com/mapbox-gl-js/plugins/mapbox-gl-rtl-text/v0.2.3/mapbox-gl-rtl-text.js',
          null,
          true // Lazy load
        );
        rtlPluginInitialized = true;
      } catch (error) {
        // Plugin might already be initialized, just continue
        console.log('RTL plugin already initialized or failed:', error);
      }
    }

    const container = mapContainer.current;

    const initMap = async () => {
      if (map.current) return;

      // Wait for container to be properly sized
      if (!container.offsetWidth || !container.offsetHeight) {
        setTimeout(initMap, 100);
        return;
      }

      try {
        console.log('Initializing Mapbox GL...');

        // Create map instance
        map.current = new mapboxgl.Map({
          container: container,
          style: 'mapbox://styles/mapbox/streets-v11',
          center: [3.4064, 6.4654], // Lagos coordinates
          zoom: 12,
          attributionControl: false,
          failIfMajorPerformanceCaveat: false, // Allow on low-performance devices
          preserveDrawingBuffer: true, // Helps with some WebGL contexts
          antialias: true,
          maxZoom: 18,
          minZoom: 8,
        });

        // Add error handling
        map.current.on('error', (e) => {
          console.error('Mapbox error:', e.error);
          setWebGLError(`Map error: ${e.error?.message || 'Unknown error'}`);
        });

        // Add load event
        map.current.on('load', () => {
          console.log('Map loaded successfully');
          setIsMapReady(true);
          setWebGLError(null);
          
          // Add navigation controls
          map.current?.addControl(new mapboxgl.NavigationControl({
            showCompass: true,
            showZoom: true,
            visualizePitch: true,
          }), 'top-right');

          // Add attribution
          map.current?.addControl(new mapboxgl.AttributionControl({
            compact: true,
          }), 'bottom-right');
        });

        // Add click handler
        if (onMapClick) {
          map.current.on('click', (e) => {
            if (isRideActive) return;
            onMapClick({
              latitude: e.lngLat.lat,
              longitude: e.lngLat.lng,
              address: 'Selected location',
            });
          });
        }

        // Handle WebGL context loss
        map.current.on('webglcontextlost', () => {
          console.warn('WebGL context lost');
          setWebGLError('WebGL context lost. Try refreshing the page.');
        });

        map.current.on('webglcontextrestored', () => {
          console.log('WebGL context restored');
          setWebGLError(null);
        });

      } catch (error: any) {
        console.error('Failed to initialize map:', error);
        
        let errorMessage = 'Failed to load map. ';
        if (error.message.includes('access token')) {
          errorMessage += 'Invalid Mapbox token.';
        } else if (error.message.includes('WebGL')) {
          errorMessage += 'WebGL not supported or blocked.';
        } else {
          errorMessage += error.message || 'Unknown error.';
        }
        
        setWebGLError(errorMessage);
        
        // Try fallback initialization after delay
        setTimeout(() => {
          if (!map.current) {
            console.log('Retrying map initialization...');
            initMap();
          }
        }, 1000);
      }
    };

    // Start initialization
    initMap();

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapClick, isRideActive]);

  // Update markers and route
  useEffect(() => {
    if (!map.current || !isMapReady || webGLError) return;

    if (routeCalculationTimeout.current) {
      clearTimeout(routeCalculationTimeout.current);
      routeCalculationTimeout.current = null;
    }

    updateMarkers();

    if (routeCoordinates.length > 0 && showRoute && !isRideActive) {
      drawRouteFromCoordinates(routeCoordinates);
    } else if (showRoute && pickupLocation && dropoffLocation && !isRideActive) {
      const routeId = `${pickupLocation.latitude},${pickupLocation.longitude}-${dropoffLocation.latitude},${dropoffLocation.longitude}`;
      if (lastRouteId.current === routeId) return;
      lastRouteId.current = routeId;

      routeCalculationTimeout.current = setTimeout(() => {
        calculateRoute(pickupLocation, dropoffLocation);
      }, 300);
    } else {
      removeRoute();
      lastRouteId.current = '';
    }

    return () => {
      if (routeCalculationTimeout.current) clearTimeout(routeCalculationTimeout.current);
    };
  }, [pickupLocation, dropoffLocation, showRoute, isRideActive, isMapReady, routeCoordinates, webGLError]);

  const updateMarkers = useCallback(() => {
    if (!map.current) return;

    // Remove existing markers
    markers.current.pickup?.remove();
    markers.current.dropoff?.remove();

    // Add pickup marker
    if (pickupLocation) {
      const el = document.createElement('div');
      el.className = 'pickup-marker';
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #3B82F6;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">P</div>
        </div>
      `;

      markers.current.pickup = new mapboxgl.Marker(el)
        .setLngLat([pickupLocation.longitude, pickupLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; max-width: 200px;">
              <div style="color: #3B82F6; font-weight: bold; margin-bottom: 4px;">Pickup</div>
              <div style="color: #666; font-size: 14px;">${pickupLocation.address}</div>
            </div>
          `)
        )
        .addTo(map.current);
    }

    // Add dropoff marker
    if (dropoffLocation) {
      const el = document.createElement('div');
      el.className = 'dropoff-marker';
      el.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #10B981;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.5);
          position: relative;
        ">
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 12px;
            font-weight: bold;
          ">D</div>
        </div>
      `;

      markers.current.dropoff = new mapboxgl.Marker(el)
        .setLngLat([dropoffLocation.longitude, dropoffLocation.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: 25 }).setHTML(`
            <div style="padding: 8px; max-width: 200px;">
              <div style="color: #10B981; font-weight: bold; margin-bottom: 4px;">Dropoff</div>
              <div style="color: #666; font-size: 14px;">${dropoffLocation.address}</div>
            </div>
          `)
        )
        .addTo(map.current);
    }

    fitMapToMarkers();
  }, [pickupLocation, dropoffLocation]);

  const fitMapToMarkers = useCallback(() => {
    if (!map.current || (!pickupLocation && !dropoffLocation)) return;

    const bounds = new mapboxgl.LngLatBounds();
    
    if (pickupLocation) {
      bounds.extend([pickupLocation.longitude, pickupLocation.latitude]);
    }
    
    if (dropoffLocation) {
      bounds.extend([dropoffLocation.longitude, dropoffLocation.latitude]);
    }

    // Only fit bounds if we have both locations
    if (pickupLocation && dropoffLocation) {
      const distance = calculateDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        dropoffLocation.latitude,
        dropoffLocation.longitude
      );
      
      const maxZoom = distance < 2 ? 16 : distance < 5 ? 14 : 12;
      const minZoom = 10;

      map.current.fitBounds(bounds, {
        padding: { top: 80, bottom: 50, left: 50, right: 50 },
        duration: 1000,
        maxZoom,
        minZoom,
      });
    } else if (pickupLocation) {
      map.current.flyTo({
        center: [pickupLocation.longitude, pickupLocation.latitude],
        zoom: 15,
        duration: 1000
      });
    } else if (dropoffLocation) {
      map.current.flyTo({
        center: [dropoffLocation.longitude, dropoffLocation.latitude],
        zoom: 15,
        duration: 1000
      });
    }
  }, [pickupLocation, dropoffLocation]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const drawRouteFromCoordinates = (coordinates: [number, number][]) => {
    if (!map.current || isRideActive || !isMapReady) return;
    
    removeRoute();

    const geojson = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: coordinates
      },
      properties: {}
    };

    if (!map.current.getSource('route')) {
      map.current.addSource('route', {
        type: 'geojson',
        data: geojson
      });
    } else {
      (map.current.getSource('route') as mapboxgl.GeoJSONSource).setData(geojson);
    }

    if (!map.current.getLayer('route')) {
      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3B82F6',
          'line-width': 5,
          'line-opacity': 0.8
        }
      });
    }

    routeSource.current = 'route';
  };

  const calculateRoute = async (start: MapLocation, end: MapLocation) => {
    if (!map.current || isRideActive || !isMapReady) return;

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?geometries=geojson&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.routes?.[0]?.geometry) {
        const coordinates = data.routes[0].geometry.coordinates;
        drawRouteFromCoordinates(coordinates as [number, number][]);
      }
    } catch (error) {
      console.error('Route calculation failed:', error);
      // Draw straight line as fallback
      drawRouteFromCoordinates([
        [start.longitude, start.latitude],
        [end.longitude, end.latitude]
      ]);
    }
  };

  const removeRoute = () => {
    if (!map.current || !isMapReady) return;
    
    if (map.current.getLayer('route')) {
      map.current.removeLayer('route');
    }
    
    if (map.current.getSource('route')) {
      map.current.removeSource('route');
    }
    
    routeSource.current = null;
  };

  const handleZoomIn = () => map.current?.zoomIn();
  const handleZoomOut = () => map.current?.zoomOut();

  const handleRetry = () => {
    setWebGLError(null);
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    setIsMapReady(false);
    // Trigger re-initialization
    setTimeout(() => {
      if (mapContainer.current && !map.current) {
        const initEvent = new Event('retryInit');
        mapContainer.current.dispatchEvent(initEvent);
      }
    }, 100);
  };

  return (
    <div className="relative rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
      <div 
        ref={mapContainer} 
        className="w-full h-96"
        style={{ minHeight: '384px' }}
      />

      {/* WebGL Error Display */}
      {webGLError && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center p-6">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Map Loading Failed</h3>
            <p className="text-gray-600 mb-4">{webGLError}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Retry Loading Map
              </button>
              <div className="text-sm text-gray-500">
                <p>If the problem persists:</p>
                <ul className="list-disc list-inside mt-1 text-left">
                  <li>Try a different browser (Chrome, Firefox)</li>
                  <li>Enable hardware acceleration in browser settings</li>
                  <li>Update your graphics drivers</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {!isMapReady && !webGLError && (
        <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-3" />
            <p className="text-gray-700 font-medium">Loading map...</p>
            <p className="text-gray-500 text-sm mt-1">Initializing Mapbox GL</p>
          </div>
        </div>
      )}

      {/* Legend */}
      {isMapReady && !webGLError && (
        <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg border border-gray-200 text-sm">
          <div className="font-semibold mb-2 text-gray-900">Legend</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
              <span className="text-gray-700">Pickup</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-green-500 border-2 border-white shadow-sm" />
              <span className="text-gray-700">Dropoff</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-2 bg-blue-500 rounded-full" />
              <span className="text-gray-700">Route</span>
            </div>
          </div>
          {isRideActive && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-amber-600 font-medium">🚕 Ride in Progress</div>
            </div>
          )}
        </div>
      )}

      {/* Zoom Controls */}
      {isMapReady && !webGLError && (
        <div className="absolute top-4 right-4 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="bg-white p-2 rounded-lg shadow hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900"
            aria-label="Zoom in"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="bg-white p-2 rounded-lg shadow hover:bg-gray-50 border border-gray-200 text-gray-700 hover:text-gray-900"
            aria-label="Zoom out"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13H5v-2h14v2z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Map Instructions */}
      {isMapReady && !webGLError && onMapClick && !isRideActive && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          Click on the map to set pickup/dropoff locations
        </div>
      )}
    </div>
  );
}