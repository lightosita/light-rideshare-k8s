export class LocationService {
  private static locationUpdateInProgress = false;

  static async getCurrentLocation(): Promise<{lat: number; lng: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      if (LocationService.locationUpdateInProgress) {
        console.log('📍 Location request already in progress');
        reject(new Error('Location request already in progress'));
        return;
      }

      LocationService.locationUpdateInProgress = true;

      const options = {
        enableHighAccuracy: false,
        timeout: 7000,
        maximumAge: 30000
      };

      const successCallback = (position: GeolocationPosition) => {
        LocationService.locationUpdateInProgress = false;
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        console.log('📍 Driver location obtained:', location);
        resolve(location);
      };

      const errorCallback = (error: GeolocationPositionError) => {
        LocationService.locationUpdateInProgress = false;
        let errorMessage: string;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location services.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = `An unknown error occurred: ${error.message}`;
        }
        
        console.error('📍 Location error:', errorMessage);
        reject(new Error(errorMessage));
      };

      navigator.geolocation.getCurrentPosition(
        successCallback,
        errorCallback,
        options
      );
    });
  }

  static async getLocationForUpdate(
    currentLocation: {lat: number; lng: number} | null,
    pickupLocation: {lat: number; lng: number}
  ): Promise<{lat: number; lng: number}> {
    try {
      return await LocationService.getCurrentLocation();
    } catch (error: any) {
      console.warn('📍 Could not get fresh location:', error.message);
      
      if (currentLocation) {
        console.log('📍 Using last known location as fallback');
        return currentLocation;
      }
      
      console.log('📍 Using pickup location as fallback');
      return pickupLocation;
    }
  }
}