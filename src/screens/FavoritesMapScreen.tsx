import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

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
    } catch (error: any) {
      console.error('❌ [FAVORITES MAP] Error cargando favoritos:', error);
      setError(error.message || 'Error al cargar favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMapHTML = () => {
    if (favorites.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: #f5f5f5; }
            .message { text-align: center; padding: 20px; color: #666; }
          </style>
        </head>
        <body>
          <div class="message">
            <h2>No hay favoritos con ubicación</h2>
            <p>Agrega favoritos con dirección para verlos en el mapa</p>
          </div>
        </body>
        </html>
      `;
    }

    // Calcular el centro del mapa (promedio de todas las coordenadas)
    const centerLat = favorites.reduce((sum, f) => sum + (f.latitude || 0), 0) / favorites.length;
    const centerLng = favorites.reduce((sum, f) => sum + (f.longitude || 0), 0) / favorites.length;

    // Generar marcadores
    const markersData = favorites.map((fav, index) => ({
      lat: fav.latitude,
      lng: fav.longitude,
      title: fav.name.replace(/"/g, '\\"').replace(/'/g, "\\'"),
      info: (fav.category?.name || 'Sin categoría').replace(/"/g, '\\"').replace(/'/g, "\\'"),
      id: fav.id,
      number: index + 1
    }));

    const markersJSON = JSON.stringify(markersData);

    // Google Maps API Key
    const GOOGLE_MAPS_API_KEY = "AIzaSyCKFJ0Im2SQG6V4U_PZc2vd1DBIm6E6-kc";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body, #map { height: 100%; width: 100%; }
          .info-window {
            padding: 10px;
            max-width: 200px;
          }
          .info-window h3 {
            margin: 0 0 5px 0;
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .info-window p {
            margin: 0;
            font-size: 12px;
            color: #666;
          }
          .info-window button {
            margin-top: 8px;
            padding: 6px 12px;
            background: #887CBC;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
        <script>
          const markers = ${markersJSON};
          
          function initMap() {
            const map = new google.maps.Map(document.getElementById('map'), {
              center: { lat: ${centerLat}, lng: ${centerLng} },
              zoom: 12,
              styles: [
                {
                  featureType: 'poi',
                  elementType: 'labels',
                  stylers: [{ visibility: 'off' }]
                }
              ]
            });

            const bounds = new google.maps.LatLngBounds();

            markers.forEach((markerData) => {
              const marker = new google.maps.Marker({
                position: { lat: markerData.lat, lng: markerData.lng },
                map: map,
                title: markerData.title,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: '#FF6B6B',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 3,
                },
                label: {
                  text: String(markerData.number),
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }
              });

              bounds.extend({ lat: markerData.lat, lng: markerData.lng });

              const infoWindow = new google.maps.InfoWindow({
                content: 
                  '<div class="info-window">' +
                    '<h3>' + markerData.title + '</h3>' +
                    '<p>' + markerData.info + '</p>' +
                    '<button onclick="handleMarkerClick(\'' + markerData.id + '\')">' +
                      'Ver Detalles' +
                    '</button>' +
                  '</div>'
              });

              marker.addListener('click', function() {
                infoWindow.open(map, marker);
              });
            });

            // Ajustar el mapa para mostrar todos los marcadores
            if (markers.length > 1) {
              map.fitBounds(bounds);
            }
          }

          function handleMarkerClick(id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'markerClick',
              id: id
            }));
          }

          initMap();
        </script>
      </body>
      </html>
    `;
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'markerClick') {
        const recommendation = favorites.find(f => f.id === data.id);
        if (recommendation) {
          navigation.navigate('RecommendationDetail', {
            recommendationId: recommendation.id,
          });
        }
      }
    } catch (error) {
      console.error('Error parsing webview message:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#887CBC', '#59C6C0']}
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
          <ActivityIndicator size="large" color="#887CBC" />
          <Text style={styles.loadingText}>Cargando mapa...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#887CBC', '#59C6C0']}
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
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#887CBC', '#59C6C0']}
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
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#887CBC', '#59C6C0']}
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
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadFavorites}
        >
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <WebView
        source={{ html: generateMapHTML() }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.mapLoading}>
            <ActivityIndicator size="large" color="#887CBC" />
          </View>
        )}
      />
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
    backgroundColor: '#887CBC',
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
    backgroundColor: '#887CBC',
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
  map: {
    flex: 1,
    width: width,
    height: height,
  },
  mapLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
});

export default FavoritesMapScreen;
