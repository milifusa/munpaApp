import { useState, useEffect } from 'react';
import * as Location from 'expo-location';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
}

export const useLocation = () => {
  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    loading: true,
    error: null,
    permissionGranted: false,
  });

  const requestLocationPermission = async () => {
    try {
      console.log('📍 [LOCATION] Solicitando permisos de ubicación...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ [LOCATION] Permisos de ubicación denegados');
        setLocationState(prev => ({
          ...prev,
          loading: false,
          error: 'Permisos de ubicación denegados',
          permissionGranted: false,
        }));
        return false;
      }

      console.log('✅ [LOCATION] Permisos de ubicación otorgados');
      setLocationState(prev => ({
        ...prev,
        permissionGranted: true,
      }));
      
      return true;
    } catch (error: any) {
      console.error('❌ [LOCATION] Error solicitando permisos:', error);
      setLocationState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        permissionGranted: false,
      }));
      return false;
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📍 [LOCATION] Obteniendo ubicación actual...');
      
      setLocationState(prev => ({ ...prev, loading: true, error: null }));

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      console.log('✅ [LOCATION] Ubicación obtenida:', location.coords);

      setLocationState({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        loading: false,
        error: null,
        permissionGranted: true,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error: any) {
      console.error('❌ [LOCATION] Error obteniendo ubicación:', error);
      setLocationState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return null;
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    // Fórmula de Haversine para calcular distancia entre dos puntos
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 10) / 10; // Redondear a 1 decimal
  };

  const getEstimatedTime = (distanceKm: number): string => {
    // Estimar tiempo asumiendo velocidad promedio de 30 km/h en ciudad
    const timeInMinutes = Math.round((distanceKm / 30) * 60);
    
    if (timeInMinutes < 5) return 'menos de 5 min';
    if (timeInMinutes < 60) return `${timeInMinutes} min`;
    
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    
    if (minutes === 0) return `${hours} h`;
    return `${hours} h ${minutes} min`;
  };

  useEffect(() => {
    // Solicitar permisos y obtener ubicación al montar el componente
    const initLocation = async () => {
      const hasPermission = await requestLocationPermission();
      if (hasPermission) {
        await getCurrentLocation();
      }
    };
    
    initLocation();
  }, []);

  return {
    ...locationState,
    requestLocationPermission,
    getCurrentLocation,
    calculateDistance,
    getEstimatedTime,
  };
};

