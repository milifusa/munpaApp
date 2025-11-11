import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import recommendationAnalyticsService from '../services/recommendationAnalyticsService';

interface Recommendation {
  id: string;
  name: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
  imageUrl?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  totalReviews?: number;
  averageRating?: number;
  isFavorite?: boolean;
}

const FavoritesScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    console.log('🔄 [FAVORITES] Cargando favoritos');
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getFavorites();
      
      if (response.success) {
        console.log('✅ [FAVORITES] Favoritos cargados:', response.data.length);
        setFavorites(response.data);
      } else {
        setError('No se pudieron cargar los favoritos');
      }
    } catch (error: any) {
      console.error('❌ [FAVORITES] Error cargando favoritos:', error);
      setError('Error al cargar los favoritos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    console.log('📍 [FAVORITES] Recomendación seleccionada:', recommendation.id);
    navigation.navigate('RecommendationDetail', { 
      recommendationId: recommendation.id,
      recommendationName: recommendation.name 
    });
  };

  const handleRemoveFavorite = async (recommendationId: string) => {
    try {
      const response = await api.toggleFavorite(recommendationId);
      
      // Trackear solo cuando se agrega (no cuando se quita)
      // Nota: toggleFavorite devuelve el nuevo estado, así que si isFavorite es false, significa que se quitó
      // No trackeamos cuando se quita, solo cuando se agrega
      
      // Recargar la lista
      await loadFavorites();
    } catch (error) {
      console.error('❌ Error eliminando favorito:', error);
    }
  };

  const handleOpenLink = async (url: string, recommendationId: string) => {
    if (url) {
      // Trackear click en website
      try {
        await recommendationAnalyticsService.trackWebsite(recommendationId, url, {
          source: 'favorites_screen',
        });
      } catch (error) {
        console.error('❌ [FAVORITES] Error registrando website:', error);
      }
      
      Linking.openURL(url).catch(err => console.error('Error abriendo URL:', err));
    }
  };

  const handleCall = async (phone: string, recommendationId: string) => {
    if (phone) {
      console.log('📞 [FAVORITES] Iniciando llamada:', phone);
      
      // Trackear llamada
      try {
        await recommendationAnalyticsService.trackCall(recommendationId, phone, {
          source: 'favorites_screen',
        });
        console.log('✅ [FAVORITES] Evento de llamada registrado');
      } catch (error) {
        console.error('❌ [FAVORITES] Error registrando llamada:', error);
      }
      
      Linking.openURL(`tel:${phone}`).catch(err => console.error('Error llamando:', err));
    }
  };

  const handleWhatsApp = async (phone: string, recommendationId: string) => {
    if (phone) {
      console.log('💬 [FAVORITES] Iniciando WhatsApp:', phone);
      
      // Trackear contacto por WhatsApp
      try {
        await recommendationAnalyticsService.trackWhatsApp(recommendationId, phone, {
          source: 'favorites_screen',
        });
        console.log('✅ [FAVORITES] Evento de WhatsApp registrado');
      } catch (error) {
        console.error('❌ [FAVORITES] Error registrando WhatsApp:', error);
      }
      
      // Limpiar el número de teléfono (solo números)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      // Usar wa.me que funciona universalmente en Android e iOS
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      Linking.openURL(whatsappUrl).catch(err => {
        console.error('Error abriendo WhatsApp:', err);
        Alert.alert(
          'Error',
          'No se pudo abrir WhatsApp. Por favor, verifica que WhatsApp esté instalado o usa el número: ' + phone
        );
      });
    }
  };

  const handleOpenMap = (lat: number, lng: number, name: string, recommendationId: string) => {
    // Trackear click en mapa
    recommendationAnalyticsService.trackMap(recommendationId, { latitude: lat, longitude: lng }, {
      source: 'favorites_screen',
    });
    
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(err => console.error('Error abriendo mapa:', err));
  };

  const renderFavoriteCard = (recommendation: Recommendation) => (
    <TouchableOpacity 
      key={recommendation.id} 
      style={styles.card}
      onPress={() => handleRecommendationPress(recommendation)}
    >
      {/* Imagen */}
      {recommendation.imageUrl ? (
        <Image 
          source={{ uri: recommendation.imageUrl }} 
          style={styles.cardImage}
        />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.defaultIcon}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Botón de favorito (para quitar) */}
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleRemoveFavorite(recommendation.id);
        }}
      >
        <Ionicons name="heart" size={24} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Contenido */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {recommendation.name}
        </Text>
        
        {/* Rating y Reviews */}
        {(recommendation.totalReviews !== undefined && recommendation.averageRating !== undefined) && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(recommendation.averageRating || 0) ? 'star' : 'star-outline'}
                  size={16}
                  color="#FFD700"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {(recommendation.averageRating || 0).toFixed(1)} ({recommendation.totalReviews || 0})
            </Text>
          </View>
        )}
        
        {recommendation.description && (
          <Text style={styles.cardDescription} numberOfLines={3}>
            {recommendation.description}
          </Text>
        )}

        {/* Categoría */}
        {recommendation.category && (
          <View style={styles.categoryBadge}>
            {recommendation.category.icon && (
              <Ionicons name={recommendation.category.icon as any} size={14} color="#59C6C0" />
            )}
            <Text style={styles.categoryText}>{recommendation.category.name}</Text>
          </View>
        )}

        {/* Dirección */}
        {recommendation.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location" size={16} color="#59C6C0" />
            <Text style={styles.infoText} numberOfLines={2}>
              {recommendation.address}
            </Text>
          </View>
        )}

        {/* Teléfono */}
        {recommendation.phone && (
          <View style={styles.infoRow}>
            <Ionicons name="call" size={16} color="#59C6C0" />
            <Text style={styles.infoText}>{recommendation.phone}</Text>
          </View>
        )}

        {/* Botones de acción rápida */}
        <View style={styles.quickActions}>
          {recommendation.phone && (
            <TouchableOpacity 
              style={styles.quickActionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCall(recommendation.phone!, recommendation.id);
              }}
            >
              <Ionicons name="call" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.whatsapp && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#25D366' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleWhatsApp(recommendation.whatsapp!, recommendation.id);
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.latitude && recommendation.longitude && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#4285F4' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenMap(recommendation.latitude!, recommendation.longitude!, recommendation.name, recommendation.id);
              }}
            >
              <Ionicons name="navigate" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.website && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#887CBC' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenLink(recommendation.website!, recommendation.id);
              }}
            >
              <Ionicons name="globe" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      <View style={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 15 : 10) }]}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="heart" size={24} color="white" />
            <Text style={styles.headerTitle}>Mis Favoritos</Text>
          </View>
          {!isLoading && (
            <Text style={styles.headerSubtitle}>
              Lugares que ya visité y me gustaron • {favorites.length}
            </Text>
          )}
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
      >
        {/* Estado de carga */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando favoritos...</Text>
          </View>
        )}

        {/* Estado de error */}
        {!isLoading && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de favoritos */}
        {!isLoading && !error && favorites.length > 0 && (
          <View style={styles.cardsContainer}>
            {favorites.map(recommendation => renderFavoriteCard(recommendation))}
          </View>
        )}

        {/* Estado vacío */}
        {!isLoading && !error && favorites.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>
              No tienes favoritos aún
            </Text>
            <Text style={styles.emptySubtext}>
              Guarda aquí los lugares que ya visitaste y te gustaron. Toca el ❤️ en cualquier recomendación para agregarla.
            </Text>
            <TouchableOpacity 
              style={styles.exploreButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.exploreButtonText}>Explorar Recomendaciones</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.finalSpacing} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#59C6C0',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  backButton: {
    marginBottom: 10,
    padding: 5,
    alignSelf: 'flex-start',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  // Cards
  cardsContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultIcon: {
    width: 80,
    height: 80,
    opacity: 0.6,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1,
  },
  cardContent: {
    padding: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
    gap: 5,
    marginBottom: 10,
  },
  categoryText: {
    fontSize: 12,
    color: '#59C6C0',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Estados
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#59C6C0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 20,
    fontSize: 20,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 10,
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  exploreButton: {
    marginTop: 25,
    backgroundColor: '#59C6C0',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  finalSpacing: {
    height: 30,
  },
});

export default FavoritesScreen;

