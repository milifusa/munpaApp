import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';
import { useLocation } from '../hooks/useLocation';
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
  stats?: {
    totalReviews: number;
    averageRating: number;
  };
  isFavorite?: boolean;
  distance?: number; // en km
  estimatedTime?: string; // ej: "10 min"
  isInWishlist?: boolean;
  verified?: boolean; // Verificado por Munpa
  badges?: string[]; // Array de badges
  features?: {
    hasChangingTable?: boolean;
    hasNursingRoom?: boolean;
    hasParking?: boolean;
    isStrollerAccessible?: boolean;
    acceptsEmergencies?: boolean;
    is24Hours?: boolean;
  };
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const CategoryRecommendationsScreen = ({ route, navigation }: any) => {
  const { categoryId, categoryName } = route.params;
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [hasRecalculatedWithLocation, setHasRecalculatedWithLocation] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(20); // Número de recomendaciones por página
  
  // Hook de ubicación
  const {
    latitude: userLat,
    longitude: userLon,
    loading: locationLoading,
    error: locationError,
    permissionGranted,
    getCurrentLocation,
    calculateDistance,
    getEstimatedTime,
  } = useLocation();

  useEffect(() => {
    setHasRecalculatedWithLocation(false); // Reset al cambiar de categoría
    setCurrentPage(1); // Reset página al cambiar de categoría
    setHasMore(true); // Reset hasMore
    setRecommendations([]); // Limpiar recomendaciones anteriores
    loadRecommendations(1, true); // Cargar primera página
  }, [categoryId]);

  // Recargar cuando la ubicación esté disponible por primera vez
  useEffect(() => {
    if (userLat !== null && userLon !== null && !isLoading && recommendations.length > 0 && !hasRecalculatedWithLocation) {
      console.log('📍 [CATEGORY RECOMMENDATIONS] ✨ Ubicación obtenida, recalculando distancias...');
      console.log(`📍 [CATEGORY RECOMMENDATIONS] Ubicación: {${userLat}, ${userLon}}`);
      setHasRecalculatedWithLocation(true); // Marcar como recalculado
      setCurrentPage(1);
      setHasMore(true);
      setRecommendations([]);
      loadRecommendations(1, true);
    }
  }, [userLat, userLon, recommendations.length, isLoading]);

  useEffect(() => {
    // Reordenar cuando cambie el criterio de ordenamiento
    if (recommendations.length > 0) {
      const sorted = [...recommendations].sort((a, b) => {
        if (sortBy === 'distance') {
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        } else if (sortBy === 'rating') {
          return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
        } else {
          return a.name.localeCompare(b.name);
        }
      });
      setRecommendations(sorted);
    }
  }, [sortBy]);

  const loadRecommendations = async (page: number = 1, reset: boolean = false) => {
    console.log('🔄 [CATEGORY RECOMMENDATIONS] Cargando recomendaciones para categoría:', categoryId, `Página: ${page}`);
    console.log('📍 [CATEGORY RECOMMENDATIONS] Ubicación del usuario:', { userLat, userLon });
    
    if (reset) {
      setIsLoading(true);
      setError(null);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const response = await api.getRecommendationsByCategory(categoryId, page, limit);
      
      if (response.success && response.data) {
        const newRecommendations = response.data;
        console.log('✅ [CATEGORY RECOMMENDATIONS] Recomendaciones cargadas:', newRecommendations.length);
        
        // Verificar si hay más páginas
        if (newRecommendations.length < limit) {
          setHasMore(false);
        }
        
        // Cargar estadísticas y estado de favorito para cada recomendación
        console.log('🔄 [CATEGORY RECOMMENDATIONS] Cargando estadísticas y favoritos...');
        const recommendationsWithData = await Promise.all(
          newRecommendations.map(async (rec: Recommendation) => {
            try {
              const [reviewsResponse, favoriteResponse] = await Promise.all([
                api.getRecommendationReviews(rec.id, 1, 1),
                api.isFavorite(rec.id)
              ]);
              
              // Calcular distancia si tenemos ubicación del usuario y del lugar
              let distance: number | undefined;
              let estimatedTime: string | undefined;
              
              if (userLat && userLon && rec.latitude && rec.longitude) {
                distance = calculateDistance(userLat, userLon, rec.latitude, rec.longitude);
                estimatedTime = getEstimatedTime(distance);
              }
              
              return {
                ...rec,
                stats: reviewsResponse.stats || { totalReviews: 0, averageRating: 0 },
                isFavorite: favoriteResponse.isFavorite || false,
                distance,
                estimatedTime,
              };
            } catch (error) {
              console.error('❌ Error cargando data para:', rec.id);
              return {
                ...rec,
                stats: { totalReviews: 0, averageRating: 0 },
                isFavorite: false
              };
            }
          })
        );
        
        // Ordenar por distancia si está disponible (solo para la primera página o cuando se recarga)
        let sortedRecommendations = recommendationsWithData;
        if (reset || page === 1) {
          sortedRecommendations = [...recommendationsWithData].sort((a, b) => {
            if (sortBy === 'distance') {
              if (a.distance === undefined) return 1;
              if (b.distance === undefined) return -1;
              return a.distance - b.distance;
            } else if (sortBy === 'rating') {
              return (b.stats?.averageRating || 0) - (a.stats?.averageRating || 0);
            } else {
              return a.name.localeCompare(b.name);
            }
          });
        }
        
        console.log('✅ [CATEGORY RECOMMENDATIONS] Datos cargados y ordenados');
        
        if (reset) {
          setRecommendations(sortedRecommendations);
        } else {
          setRecommendations(prev => [...prev, ...sortedRecommendations]);
        }
        
        setCurrentPage(page);
      } else {
        console.log('⚠️ [CATEGORY RECOMMENDATIONS] Respuesta sin datos');
        setHasMore(false);
        if (reset) {
          setError('No se pudieron cargar las recomendaciones');
        }
      }
    } catch (error: any) {
      console.error('❌ [CATEGORY RECOMMENDATIONS] Error cargando recomendaciones:', error);
      setHasMore(false);
      if (reset) {
        setError('Error al cargar las recomendaciones');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreRecommendations = () => {
    if (!isLoadingMore && hasMore && !isLoading) {
      const nextPage = currentPage + 1;
      loadRecommendations(nextPage, false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    setRecommendations([]);
    await loadRecommendations(1, true);
    setRefreshing(false);
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    console.log('📍 [CATEGORY RECOMMENDATIONS] Recomendación seleccionada:', recommendation.id);
    // Navegar a pantalla de detalle
    navigation.navigate('RecommendationDetail', { 
      recommendationId: recommendation.id,
      recommendationName: recommendation.name 
    });
  };

  const handleOpenLink = async (url: string, recommendationId: string) => {
    if (url) {
      // Trackear click en website
      try {
        await recommendationAnalyticsService.trackWebsite(recommendationId, url, {
          source: 'category_screen',
        });
        console.log('✅ [CATEGORY] Evento de website registrado');
      } catch (error) {
        console.error('❌ [CATEGORY] Error registrando website:', error);
      }
      
      Linking.openURL(url).catch(err => {
        console.error('❌ Error abriendo URL:', err);
      });
    }
  };

  const handleCall = async (phone: string, recommendationId: string) => {
    if (phone) {
      console.log('📞 [CATEGORY] Iniciando llamada:', phone);
      
      // Trackear llamada
      try {
        await recommendationAnalyticsService.trackCall(recommendationId, phone, {
          source: 'category_screen',
        });
        console.log('✅ [CATEGORY] Evento de llamada registrado');
      } catch (error) {
        console.error('❌ [CATEGORY] Error registrando llamada:', error);
      }
      
      Linking.openURL(`tel:${phone}`).catch(err => {
        console.error('❌ Error llamando:', err);
      });
    }
  };

  const handleWhatsApp = async (phone: string, recommendationId: string) => {
    if (phone) {
      console.log('💬 [CATEGORY] Iniciando WhatsApp:', phone);
      
      // Trackear contacto por WhatsApp
      try {
        await recommendationAnalyticsService.trackWhatsApp(recommendationId, phone, {
          source: 'category_screen',
        });
        console.log('✅ [CATEGORY] Evento de WhatsApp registrado');
      } catch (error) {
        console.error('❌ [CATEGORY] Error registrando WhatsApp:', error);
      }
      
      // Limpiar el número de teléfono (solo números)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      // Usar wa.me que funciona universalmente en Android e iOS
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      Linking.openURL(whatsappUrl).catch(err => {
        console.error('❌ Error abriendo WhatsApp:', err);
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
      source: 'category_screen',
    });
    
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(err => {
      console.error('❌ Error abriendo mapa:', err);
    });
  };

  const handleToggleFavorite = async (recommendationId: string) => {
    try {
      console.log('❤️ [CATEGORY RECOMMENDATIONS] Toggle favorito:', recommendationId);
      const response = await api.toggleFavorite(recommendationId);
      
      console.log('📊 [CATEGORY] Respuesta toggleFavorite:', {
        recommendationId,
        isFavorite: response.isFavorite,
        response: response
      });
      
      // Trackear solo cuando se AGREGA a favoritos (no cuando se quita)
      if (response.isFavorite) {
        console.log('📊 [CATEGORY] Agregando a favoritos, registrando evento de analytics...');
        try {
          await recommendationAnalyticsService.trackFavorite(recommendationId, {
            source: 'category_screen',
            timestamp: new Date(),
          });
          console.log('✅ [CATEGORY] Evento de favorito registrado exitosamente');
        } catch (error) {
          console.error('❌ [CATEGORY] Error registrando favorito:', error);
          console.error('❌ [CATEGORY] Error details:', error instanceof Error ? error.message : error);
        }
      } else {
        console.log('📊 [CATEGORY] Quitando de favoritos, no se registra evento');
      }
      
      // Actualizar el estado local
      setRecommendations(prevRecs => 
        prevRecs.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, isFavorite: response.isFavorite }
            : rec
        )
      );
    } catch (error) {
      console.error('❌ Error toggling favorito:', error);
    }
  };

  const handleAddToWishlist = async (recommendationId: string, recommendationName: string) => {
    try {
      console.log('💝 [CATEGORY RECOMMENDATIONS] Agregar a wishlist:', recommendationId);
      
      // Abrir modal simple para agregar notas (futuro: modal más completo)
      Alert.alert(
        '¿Agregar a Lista de Deseos?',
        `"${recommendationName}"`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Agregar',
            onPress: async () => {
              try {
                await api.addToWishlist(recommendationId);
                
                // Trackear agregar a wishlist
                try {
                  await recommendationAnalyticsService.trackWishlist(recommendationId, {
                    source: 'category_screen',
                  });
                  console.log('✅ [CATEGORY] Evento de wishlist registrado');
                } catch (error) {
                  console.error('❌ [CATEGORY] Error registrando wishlist:', error);
                }
                
                // Actualizar el estado local
                setRecommendations(prevRecs =>
                  prevRecs.map(rec =>
                    rec.id === recommendationId
                      ? { ...rec, isInWishlist: true }
                      : rec
                  )
                );
                
                Alert.alert('✓', 'Agregado a tu lista de deseos');
              } catch (error) {
                console.error('❌ Error agregando a wishlist:', error);
                Alert.alert('Error', 'No se pudo agregar a tu lista');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('❌ Error en handleAddToWishlist:', error);
    }
  };

  // Función para obtener badge info
  const getBadgeInfo = (badgeKey: string): { icon: string; label: string; color: string } | null => {
    const badgeMap: Record<string, { icon: string; label: string; color: string }> = {
      'baby_friendly': { icon: 'happy-outline', label: 'Baby Friendly', color: '#FFB74D' },
      'changing_table': { icon: 'git-compare-outline', label: 'Cambiador', color: '#64B5F6' },
      'nursing_room': { icon: 'water-outline', label: 'Lactancia', color: '#81C784' },
      'emergency_24_7': { icon: 'medical', label: '24/7', color: '#E57373' },
      'parking': { icon: 'car-outline', label: 'Parking', color: '#9575CD' },
      'stroller_accessible': { icon: 'accessibility-outline', label: 'Accesible', color: '#4DB6AC' },
    };
    return badgeMap[badgeKey] || null;
  };

  // Renderizar badges de calidad
  const renderBadges = (recommendation: Recommendation) => {
    const badges: React.ReactElement[] = [];
    const renderedBadgeKeys = new Set<string>(); // Track para evitar duplicados

    // Badge de verificado
    if (recommendation.verified) {
      badges.push(
        <View key="verified" style={styles.verifiedBadge}>
          <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
          <Text style={styles.verifiedBadgeText}>Verificado por Munpa</Text>
        </View>
      );
    }

    // Badge de recomendado por la comunidad (rating > 4.5)
    if ((recommendation.stats?.averageRating || 0) >= 4.5 && (recommendation.stats?.totalReviews || 0) >= 5) {
      badges.push(
        <View key="recommended" style={[styles.badge, { backgroundColor: '#FFF3E0' }]}>
          <Ionicons name="trophy" size={12} color="#FF9800" />
          <Text style={[styles.badgeText, { color: '#FF9800' }]}>Recomendado</Text>
        </View>
      );
    }

    // Badges personalizados del array (máximo 3 badges para no sobrecargar)
    if (recommendation.badges && recommendation.badges.length > 0) {
      recommendation.badges.slice(0, 3).forEach((badgeKey) => {
        if (badges.length >= 4) return; // Limitar total de badges
        
        const badgeInfo = getBadgeInfo(badgeKey);
        if (badgeInfo) {
          renderedBadgeKeys.add(badgeKey); // Marcar como renderizado
          badges.push(
            <View key={badgeKey} style={[styles.badge, { backgroundColor: `${badgeInfo.color}20` }]}>
              <Ionicons name={badgeInfo.icon as any} size={12} color={badgeInfo.color} />
              <Text style={[styles.badgeText, { color: badgeInfo.color }]}>{badgeInfo.label}</Text>
            </View>
          );
        }
      });
    }

    // Badges de features (SOLO SI NO ESTÁN EN EL ARRAY DE BADGES)
    // Esto evita duplicados si el backend envía ambos
    if (recommendation.features && badges.length < 4) {
      if (recommendation.features.hasChangingTable && !renderedBadgeKeys.has('changing_table')) {
        badges.push(
          <View key="changing" style={[styles.badge, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="git-compare-outline" size={12} color="#2196F3" />
            <Text style={[styles.badgeText, { color: '#2196F3' }]}>Cambiador</Text>
          </View>
        );
      }
      if (recommendation.features.hasNursingRoom && !renderedBadgeKeys.has('nursing_room') && badges.length < 4) {
        badges.push(
          <View key="nursing" style={[styles.badge, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="water-outline" size={12} color="#4CAF50" />
            <Text style={[styles.badgeText, { color: '#4CAF50' }]}>Lactancia</Text>
          </View>
        );
      }
      if (recommendation.features.is24Hours && !renderedBadgeKeys.has('emergency_24_7') && badges.length < 4) {
        badges.push(
          <View key="24h" style={[styles.badge, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="time-outline" size={12} color="#F44336" />
            <Text style={[styles.badgeText, { color: '#F44336' }]}>24/7</Text>
          </View>
        );
      }
    }

    return badges.length > 0 ? (
      <View style={styles.badgesContainer}>
        {badges}
      </View>
    ) : null;
  };

  const renderRecommendationCard = ({ item: recommendation }: { item: Recommendation }) => (
    <TouchableOpacity 
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

      {/* Botón de favorito */}
      <TouchableOpacity 
        style={styles.favoriteButton}
        onPress={(e) => {
          e.stopPropagation();
          handleToggleFavorite(recommendation.id);
        }}
      >
        <Ionicons 
          name={recommendation.isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color={recommendation.isFavorite ? "#FF6B6B" : "#666"} 
        />
      </TouchableOpacity>

      {/* Botón de wishlist */}
      <TouchableOpacity 
        style={styles.wishlistButton}
        onPress={(e) => {
          e.stopPropagation();
          handleAddToWishlist(recommendation.id, recommendation.name);
        }}
      >
        <Ionicons 
          name={recommendation.isInWishlist ? "bookmark" : "bookmark-outline"} 
          size={24} 
          color={recommendation.isInWishlist ? "#FFB74D" : "#666"} 
        />
      </TouchableOpacity>

      {/* Contenido */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {recommendation.name}
        </Text>

        {/* Badges de calidad */}
        {renderBadges(recommendation)}
        
        {/* Rating y Reviews */}
        <View style={styles.ratingContainer}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= Math.round(recommendation.stats?.averageRating || 0) ? 'star' : 'star-outline'}
                size={16}
                color="#FFD700"
              />
            ))}
          </View>
          <Text style={styles.ratingText}>
            {(recommendation.stats?.averageRating || 0).toFixed(1)} ({recommendation.stats?.totalReviews || 0})
          </Text>
        </View>

        {/* Distancia y tiempo estimado */}
        {recommendation.distance !== undefined && (
          <View style={styles.distanceContainer}>
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={14} color="#59C6C0" />
              <Text style={styles.distanceText}>
                {recommendation.distance < 1 
                  ? `${Math.round(recommendation.distance * 1000)}m` 
                  : `${recommendation.distance}km`}
              </Text>
            </View>
            {recommendation.estimatedTime && (
              <View style={styles.timeBadge}>
                <Ionicons name="time" size={14} color="#666" />
                <Text style={styles.timeText}>{recommendation.estimatedTime}</Text>
              </View>
            )}
          </View>
        )}
        
        {recommendation.description && (
          <Text style={styles.cardDescription} numberOfLines={3}>
            {recommendation.description}
          </Text>
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
              onPress={() => handleCall(recommendation.phone!, recommendation.id)}
            >
              <Ionicons name="call" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.whatsapp && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#25D366' }]}
              onPress={() => handleWhatsApp(recommendation.whatsapp!, recommendation.id)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.latitude && recommendation.longitude && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#4285F4' }]}
              onPress={() => handleOpenMap(recommendation.latitude!, recommendation.longitude!, recommendation.name, recommendation.id)}
            >
              <Ionicons name="navigate" size={18} color="white" />
            </TouchableOpacity>
          )}

          {recommendation.website && (
            <TouchableOpacity 
              style={[styles.quickActionButton, { backgroundColor: '#96d2d3' }]}
              onPress={() => handleOpenLink(recommendation.website!, recommendation.id)}
            >
              <Ionicons name="globe" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <View style={styles.content}>
        {/* Header */}
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
        >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{categoryName}</Text>
          <Text style={styles.headerSubtitle}>
            {!isLoading && `${recommendations.length} recomendaciones`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerAddButton}
          onPress={() => {
            navigation.navigate('AddRecommendation', { categoryId });
          }}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Filtros de ordenamiento */}
      {!isLoading && recommendations.length > 0 && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterLabel}>Ordenar por:</Text>
          <View style={styles.filterButtons}>
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'distance' && styles.filterButtonActive]}
              onPress={() => setSortBy('distance')}
            >
              <Ionicons 
                name="location" 
                size={16} 
                color={sortBy === 'distance' ? '#FFF' : '#59C6C0'} 
              />
              <Text style={[styles.filterButtonText, sortBy === 'distance' && styles.filterButtonTextActive]}>
                Cerca de ti
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'rating' && styles.filterButtonActive]}
              onPress={() => setSortBy('rating')}
            >
              <Ionicons 
                name="star" 
                size={16} 
                color={sortBy === 'rating' ? '#FFF' : '#59C6C0'} 
              />
              <Text style={[styles.filterButtonText, sortBy === 'rating' && styles.filterButtonTextActive]}>
                Mejor valorados
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, sortBy === 'name' && styles.filterButtonActive]}
              onPress={() => setSortBy('name')}
            >
              <Ionicons 
                name="text" 
                size={16} 
                color={sortBy === 'name' ? '#FFF' : '#59C6C0'} 
              />
              <Text style={[styles.filterButtonText, sortBy === 'name' && styles.filterButtonTextActive]}>
                Nombre A-Z
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {isLoading && recommendations.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando recomendaciones...</Text>
        </View>
      ) : error && recommendations.length === 0 ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadRecommendations(1, true)}>
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendationCard}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={loadMoreRecommendations}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                No hay recomendaciones disponibles
              </Text>
              <Text style={styles.emptySubtext}>
                Aún no hay lugares registrados en esta categoría
              </Text>
            </View>
          }
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreContainer}>
                <ActivityIndicator size="small" color="#59C6C0" />
                <Text style={styles.loadingMoreText}>Cargando más recomendaciones...</Text>
              </View>
            ) : null
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  content: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerAddButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },

  // Cards
  cardsContainer: {
    padding: 20,
    paddingBottom: 30,
  },
  card: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    marginBottom: 20, // Espacio entre tarjetas
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
  wishlistButton: {
    position: 'absolute',
    top: 10,
    right: 60, // Espacio para el botón de favorito
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
    backgroundColor: '#96d2d3',
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
    backgroundColor: '#96d2d3',
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
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 18,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  finalSpacing: {
    height: 30,
  },
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingMoreText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },

  // Filtros
  filtersContainer: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#59C6C0',
    gap: 5,
  },
  filterButtonActive: {
    backgroundColor: '#96d2d3',
  },
  filterButtonText: {
    fontSize: 13,
    color: '#59C6C0',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },

  // Distancia y tiempo
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    gap: 10,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F8F7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#59C6C0',
    fontWeight: '600',
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

  // Badges de calidad
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default CategoryRecommendationsScreen;

