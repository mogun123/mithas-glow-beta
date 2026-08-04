import { useState, useEffect, useCallback } from 'react';

interface Location {
  lat: number;
  lng: number;
  city: string;
  country?: string;
}

interface UseUserLocationReturn {
  location: Location | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CACHE_KEY = 'user_location';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const OPENCAGE_API_KEY = 'your_opencage_api_key'; // Replace with actual key

const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const response = await fetch(
      `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&limit=1`
    );
    
    if (!response.ok) {
      throw new Error('Geocoding failed');
    }
    
    const data = await response.json();
    return data.results?.[0]?.components?.city || 'Unknown City';
  } catch (error) {
    console.warn('Geocoding failed:', error);
    return 'Unknown City';
  }
};

const getCachedLocation = (): Location | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { location, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    if (now - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    
    return location;
  } catch {
    return null;
  }
};

const setCachedLocation = (location: Location): void => {
  try {
    const cacheData = {
      location,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Failed to cache location:', error);
  }
};

export const useUserLocation = (): UseUserLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    // Check cache first
    const cached = getCachedLocation();
    if (cached) {
      setLocation(cached);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Location request timeout'));
        }, 10000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(new Error(err.message));
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5 * 60 * 1000, // 5 minutes
          }
        );
      });

      const { latitude, longitude } = position.coords;
      const city = await reverseGeocode(latitude, longitude);
      
      const newLocation: Location = {
        lat: latitude,
        lng: longitude,
        city,
      };

      setLocation(newLocation);
      setCachedLocation(newLocation);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location';
      setError(errorMessage);
      
      // Set fallback location
      const fallbackLocation: Location = {
        lat: 19.0760, // Mumbai
        lng: 72.8777,
        city: 'Mumbai',
      };
      setLocation(fallbackLocation);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  return {
    location,
    loading,
    error,
    refetch: fetchLocation,
  };
};
