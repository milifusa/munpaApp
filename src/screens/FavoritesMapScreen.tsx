import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { shareContentHelper } from '../utils/shareContentHelper';

const { width, height } = Dimensions.get('window');

interface Recommendation {
  id: string;
  name: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  imageUrl?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  totalReviews?: number;
  averageRating?: number;
}

const FavoritesMapScreen = ({ navigation }: any) => {
  const [favorites, setFavorites] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMarker, setSelectedMarker] = useState<Recommendation | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  // Resetear mapLoaded cuando cambian los favoritos o el centro
  useEffect(() => {
    if (mapCenter && favorites.length > 0) {
      setMapLoaded(false);
    }
  }, [mapCenter?.latitude, mapCenter?.longitude, favorites.length]);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🗺️ [FAVORITES MAP] Cargando favoritos con ubicación...');
      
      const response = await api.getFavorites();
      console.log('🗺️ [FAVORITES MAP] Favoritos obtenidos:', response.data?.length || 0);
      
      // Filtrar solo favoritos con ubicación
      const favoritesWithLocation = (response.data || []).filter(
        (fav: Recommendation) => fav.latitude && fav.longitude
      );
      
      console.log('🗺️ [FAVORITES MAP] Favoritos con ubicación:', favoritesWithLocation.length);
      setFavorites(favoritesWithLocation);
      
      // Calcular el centro del mapa si hay favoritos
      if (favoritesWithLocation.length > 0) {
        const centerLat = favoritesWithLocation.reduce((sum, f) => sum + (f.latitude || 0), 0) / favoritesWithLocation.length;
        const centerLng = favoritesWithLocation.reduce((sum, f) => sum + (f.longitude || 0), 0) / favoritesWithLocation.length;
        setMapCenter({ latitude: centerLat, longitude: centerLng });
        console.log('🗺️ [FAVORITES MAP] Centro del mapa calculado:', { latitude: centerLat, longitude: centerLng });
      }
    } catch (error: any) {
      console.error('❌ [FAVORITES MAP] Error cargando favoritos:', error);
      setError(error.message || 'Error al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  // Ocultar loading cuando el mapa se carga
  // En Android, onMapLoaded debería ejecutarse, pero agregamos un timeout de respaldo
  useEffect(() => {
    if (mapCenter && favorites.length > 0) {
      console.log('⏱️ [MAP] Iniciando timeout de respaldo para ocultar loading');
      const timeoutId = setTimeout(() => {
        if (!mapLoaded) {
          console.log('⚠️ [MAP] onMapLoaded no se ejecutó, ocultando loading después de 3 segundos (timeout de respaldo)');
          setMapLoaded(true);
        }
      }, 3000); // 3 segundos de respaldo

      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [mapCenter, favorites, mapLoaded]);

  const handleMarkerClick = (recommendation: Recommendation) => {
    setSelectedMarker(recommendation);
    navigation.navigate('RecommendationDetail', {
      recommendationId: recommendation.id,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mapa de Favoritos</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mapa de Favoritos</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Mapa de Favoritos</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={80} color="#CCCCCC" />
          <Text style={styles.emptyTitle}>No hay favoritos con ubicación</Text>
          <Text style={styles.emptySubtitle}>
            Agrega favoritos con dirección para verlos en el mapa
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('RecommendationsMain')}
          >
            <Text style={styles.emptyButtonText}>Explorar Recomendaciones</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#59C6C0', '#4DB8B3']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mapa de Favoritos</Text>
          <Text style={styles.headerSubtitle}>
            {favorites.length} {favorites.length === 1 ? 'lugar' : 'lugares'}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={() => shareContentHelper.shareRecommendationsFavorites()}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={loadFavorites}
          >
            <Ionicons name="refresh" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {mapCenter ? (
        <View style={styles.mapContainer}>
          {(() => {
            console.log('🔍 [MAP] ========== RENDERIZANDO MAPA ==========');
            console.log('🔍 [MAP] mapCenter:', mapCenter);
            console.log('🔍 [MAP] favorites.length:', favorites.length);
            console.log('🔍 [MAP] Platform.OS:', Platform.OS);
            console.log('🔍 [MAP] GoogleMaps disponible:', typeof GoogleMaps !== 'undefined');
            console.log('🔍 [MAP] AppleMaps disponible:', typeof AppleMaps !== 'undefined');

            const hasAppleMaps = Platform.OS === 'ios' && AppleMaps && AppleMaps.View;
            const hasGoogleMaps = Platform.OS === 'android' && GoogleMaps && GoogleMaps.View;

            if (hasAppleMaps || hasGoogleMaps) {
              console.log('✅ [MAP] Renderizando', Platform.OS === 'ios' ? 'AppleMaps.View' : 'GoogleMaps.View');

              // Crear marcadores según la plataforma
              const markers = favorites.map((fav, index) => {
                if (Platform.OS === 'ios') {
                  return {
                    id: `marker-${fav.id}`,
                    coordinates: {
                      latitude: fav.latitude!,
                      longitude: fav.longitude!,
                    },
                    title: fav.name,
                    subtitle: fav.category?.name || 'Sin categoría',
                  };
                } else {
                  return {
                    id: `marker-${fav.id}`,
                    coordinates: {
                      latitude: fav.latitude!,
                      longitude: fav.longitude!,
                    },
                    title: fav.name,
                  };
                }
              });

              console.log('📍 [MAP] Marcadores creados:', markers.length);

              console.log('🔍 [MAP] Estado mapLoaded:', mapLoaded);
              console.log('🔍 [MAP] Renderizando mapa con', markers.length, 'marcadores');
              
              return (
                <>
                  {!mapLoaded ? (
                    <View style={styles.mapLoadingOverlay}>
                      <ActivityIndicator size="large" color="#59C6C0" />
                      <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
                    </View>
                  ) : null}
                  {Platform.OS === 'ios' ? (
                    <AppleMaps.View
                      style={styles.map}
                      cameraPosition={{
                        latitude: mapCenter.latitude,
                        longitude: mapCenter.longitude,
                        zoom: favorites.length > 1 ? 12 : 15,
                      } as any}
                      annotations={markers}
                      onCameraMove={(event: any) => {
                        if (!mapLoaded) {
                          console.log('✅ [MAP] Mapa está cargado (detectado por onCameraMove)');
                          setMapLoaded(true);
                        }
                      }}
                      onMarkerClick={(event: any) => {
                        console.log('📍 [MAP] onMarkerClick ejecutado (iOS):', event);
                        const coordinate = event.coordinates || event.coordinate;
                        if (coordinate) {
                          const clickedMarker = markers.find(m => 
                            Math.abs(m.coordinates.latitude - coordinate.latitude) < 0.001 &&
                            Math.abs(m.coordinates.longitude - coordinate.longitude) < 0.001
                          );
                          if (clickedMarker) {
                            const recommendation = favorites.find(f => f.id === clickedMarker.id.replace('marker-', ''));
                            if (recommendation) {
                              handleMarkerClick(recommendation);
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <GoogleMaps.View
                      style={[styles.map, { width: '100%', height: '100%' }]}
                      cameraPosition={{
                        latitude: mapCenter.latitude,
                        longitude: mapCenter.longitude,
                        zoom: favorites.length > 1 ? 12 : 15,
                      } as any}
                      markers={markers}
                      onMapLoaded={() => {
                        console.log('✅ [MAP] ========== onMapLoaded EJECUTADO (Android) ==========');
                        console.log('✅ [MAP] Mapa cargado correctamente (Android)');
                        console.log('✅ [MAP] onMapLoaded ejecutado, ocultando loading');
                        setMapLoaded(true);
                      }}
                      onMapReady={() => {
                        console.log('✅ [MAP] onMapReady ejecutado (Android)');
                        setMapLoaded(true);
                      }}
                      onMarkerClick={(event: any) => {
                        console.log('📍 [MAP] onMarkerClick ejecutado (Android):', event);
                        const coordinate = event.coordinate || event.coordinates;
                        if (coordinate) {
                          const clickedMarker = markers.find(m => 
                            Math.abs(m.coordinates.latitude - coordinate.latitude) < 0.001 &&
                            Math.abs(m.coordinates.longitude - coordinate.longitude) < 0.001
                          );
                          if (clickedMarker) {
                            const recommendation = favorites.find(f => f.id === clickedMarker.id.replace('marker-', ''));
                            if (recommendation) {
                              handleMarkerClick(recommendation);
                            }
                          }
                        }
                      }}
                    />
                  )}
                </>
              );
            } else {
              console.warn('⚠️ [MAP] MapComponent no disponible');
              return (
                <View style={styles.mapErrorContainer}>
                  <Ionicons name="map-outline" size={48} color="#999" style={{ marginBottom: 16 }} />
                  <Text style={styles.mapErrorText}>
                    El mapa no está disponible.{'\n\n'}
                    Por favor, ejecuta:{'\n'}
                    <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {Platform.OS === 'ios' ? 'npx expo run:ios' : 'npx expo run:android'}
                    </Text>
                  </Text>
                </View>
              );
            }
          })()}
        </View>
      ) : (
        <View style={styles.mapErrorContainer}>
          <Ionicons name="map-outline" size={48} color="#999" style={{ marginBottom: 16 }} />
          <Text style={styles.mapErrorText}>No hay ubicaciones para mostrar</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    position: 'relative',
    minHeight: 400,
  },
  map: {
    width: '100%',
    height: '100%',
    flex: 1,
    backgroundColor: '#e0e0e0',
    minHeight: 400,
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#59C6C0',
    fontWeight: '600',
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F5F7FA',
  },
  mapErrorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FavoritesMapScreen;
