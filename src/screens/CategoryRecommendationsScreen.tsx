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
  TextInput,
  Linking,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import { useLocation } from '../hooks/useLocation';
import recommendationAnalyticsService from '../services/recommendationAnalyticsService';

interface Recommendation {
  id: string;
  name: string;
  description: string;
  address?: string;
  cityName?: string;
  countryName?: string;
  city?: string;
  country?: string;
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

// Helper function para calcular recomendaciones (reviews de 4-5 estrellas)
const calculateRecommendations = (totalReviews: number, averageRating: number): number => {
  if (totalReviews === 0) return 0;
  
  if (averageRating >= 4.5) {
    return Math.round(totalReviews * 0.95);
  } else if (averageRating >= 4.0) {
    return Math.round(totalReviews * 0.8);
  } else if (averageRating >= 3.5) {
    return Math.round(totalReviews * 0.6);
  } else if (averageRating >= 3.0) {
    return Math.round(totalReviews * 0.4);
  } else {
    return Math.round(totalReviews * 0.2);
  }
};

const CategoryRecommendationsScreen = ({ route, navigation }: any) => {
  const { categoryId, categoryName } = route.params;
  const insets = useSafeAreaInsets();
  
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'name'>('distance');
  const [searchQuery, setSearchQuery] = useState('');
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
        
        // Verificar si hay más páginas
        if (newRecommendations.length < limit) {
          setHasMore(false);
        }
        
        // Cargar estadísticas y estado de favorito para cada recomendación
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
        
        
        if (reset) {
          setRecommendations(sortedRecommendations);
        } else {
          setRecommendations(prev => [...prev, ...sortedRecommendations]);
        }
        
        setCurrentPage(page);
      } else {
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

  const shouldShowDistance = (distance?: number) =>
    typeof distance === 'number' && distance >= 0 && distance <= 200;

  const getLocationLabel = (recommendation: Recommendation) => {
    const city = recommendation.cityName || recommendation.city;
    const country = recommendation.countryName || recommendation.country;

    if (city && country) return `${city} · ${country}`;
    if (city) return city;
    if (country) return country;
    return 'Ubicación por confirmar';
  };

  const getRecommendationLabel = (recommendation: Recommendation): string | null => {
    const total = recommendation.stats?.totalReviews || 0;
    const avg = recommendation.stats?.averageRating || 0;
    const recommendationsCount = calculateRecommendations(total, avg);

    if (recommendationsCount > 0) {
      return `${recommendationsCount} ${recommendationsCount === 1 ? 'mamá lo recomienda' : 'mamás lo recomiendan'}`;
    }

    return total > 0 ? `${total} reseñas` : null;
  };

  const filteredRecommendations = recommendations.filter((recommendation) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const searchable = [
      recommendation.name,
      recommendation.description,
      recommendation.address,
      recommendation.cityName,
      recommendation.city,
      recommendation.countryName,
      recommendation.country,
    ].filter(Boolean).join(' ').toLowerCase();

    return searchable.includes(query);
  });

  const topRecommendations = filteredRecommendations
    .filter((recommendation) => (recommendation.stats?.totalReviews || 0) > 0)
    .slice(0, 2);

  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setHasMore(true);
    setRecommendations([]);
    await loadRecommendations(1, true);
    setRefreshing(false);
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
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
      
      // Trackear llamada
      try {
        await recommendationAnalyticsService.trackCall(recommendationId, phone, {
          source: 'category_screen',
        });
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
      
      // Trackear contacto por WhatsApp
      try {
        await recommendationAnalyticsService.trackWhatsApp(recommendationId, phone, {
          source: 'category_screen',
        });
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
      const response = await api.toggleFavorite(recommendationId);
      
      
      // Trackear solo cuando se AGREGA a favoritos (no cuando se quita)
      if (response.isFavorite) {
        try {
          await recommendationAnalyticsService.trackFavorite(recommendationId, {
            source: 'category_screen',
            timestamp: new Date(),
          });
        } catch (error) {
          console.error('❌ [CATEGORY] Error registrando favorito:', error);
          console.error('❌ [CATEGORY] Error details:', error instanceof Error ? error.message : error);
        }
      } else {
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

  const renderRecommendationCard = ({ item: recommendation }: { item: Recommendation }) => {
    const recommendationLabel = getRecommendationLabel(recommendation);

    return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleRecommendationPress(recommendation)}
      activeOpacity={0.84}
    >
      <View style={styles.cardTopRow}>
        {recommendation.imageUrl ? (
          <Image
            source={{ uri: recommendation.imageUrl }}
            style={styles.providerAvatar}
          />
        ) : (
          <View style={styles.providerAvatarPlaceholder}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.defaultIcon}
              resizeMode="contain"
            />
          </View>
        )}

        <View style={styles.providerMainInfo}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {recommendation.name}
            </Text>
            <View style={styles.cardIconActions}>
              <TouchableOpacity
                style={styles.cardIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleAddToWishlist(recommendation.id, recommendation.name);
                }}
              >
                <Ionicons
                  name={recommendation.isInWishlist ? "bookmark" : "bookmark-outline"}
                  size={19}
                  color={recommendation.isInWishlist ? "#FFB74D" : "#6B7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cardIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleToggleFavorite(recommendation.id);
                }}
              >
                <Ionicons
                  name={recommendation.isFavorite ? "heart" : "heart-outline"}
                  size={19}
                  color={recommendation.isFavorite ? "#FF6B6B" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {recommendation.description && (
            <Text style={styles.providerSpecialty} numberOfLines={1}>
              {recommendation.description}
            </Text>
          )}

          <View style={styles.trustRow}>
            {recommendation.verified && (
              <View style={styles.verifiedCompactBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#4CAF50" />
                <Text style={styles.verifiedCompactText}>Verificado</Text>
              </View>
            )}
            {recommendation.stats?.averageRating ? (
              <View style={styles.ratingPill}>
                <Ionicons name="star" size={12} color="#FFB74D" />
                <Text style={styles.ratingPillText}>
                  {recommendation.stats.averageRating.toFixed(1)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.cardContent}>
        {recommendationLabel && (
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={15} color="#59C6C0" />
            <Text style={styles.metaText} numberOfLines={1}>
              {recommendationLabel}
            </Text>
          </View>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={15} color="#59C6C0" />
          <Text style={styles.metaText} numberOfLines={1}>
            {getLocationLabel(recommendation)}
          </Text>
        </View>

        {recommendation.address && (
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={15} color="#59C6C0" />
            <Text style={styles.metaText} numberOfLines={2}>
              {recommendation.address}
            </Text>
          </View>
        )}

        {shouldShowDistance(recommendation.distance) && (
          <View style={styles.distanceContainer}>
            <View style={styles.distanceBadge}>
              <Ionicons name="location" size={13} color="#59C6C0" />
              <Text style={styles.distanceText}>
                {recommendation.distance! < 1
                  ? `${Math.round(recommendation.distance! * 1000)}m`
                  : `${recommendation.distance!.toFixed(1)}km`}
              </Text>
            </View>
            {recommendation.estimatedTime && (
              <View style={styles.timeBadge}>
                <Ionicons name="time" size={13} color="#6B7280" />
                <Text style={styles.timeText}>{recommendation.estimatedTime}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          {recommendation.phone && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleCall(recommendation.phone!, recommendation.id);
              }}
            >
              <Ionicons name="call" size={16} color="#178A84" />
              <Text style={styles.actionButtonText}>Llamar</Text>
            </TouchableOpacity>
          )}

          {recommendation.whatsapp && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleWhatsApp(recommendation.whatsapp!, recommendation.id);
              }}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#178A84" />
              <Text style={styles.actionButtonText}>WhatsApp</Text>
            </TouchableOpacity>
          )}

          {recommendation.latitude && recommendation.longitude && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenMap(recommendation.latitude!, recommendation.longitude!, recommendation.name, recommendation.id);
              }}
            >
              <Ionicons name="navigate" size={16} color="#178A84" />
              <Text style={styles.actionButtonText}>Mapa</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  const renderListHeader = () => (
    <View style={styles.listHeader}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={19} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Buscar en ${categoryName}`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={19} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sortChips}
      >
        {[
          { id: 'distance', label: 'Cerca', icon: 'location-outline' },
          { id: 'rating', label: 'Mejor valorados', icon: 'star-outline' },
          { id: 'name', label: 'A-Z', icon: 'text-outline' },
        ].map((option) => {
          const isActive = sortBy === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[styles.sortChip, isActive && styles.sortChipActive]}
              onPress={() => setSortBy(option.id as typeof sortBy)}
              activeOpacity={0.84}
            >
              <Ionicons
                name={option.icon as any}
                size={14}
                color={isActive ? '#FFFFFF' : '#526170'}
              />
              <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!searchQuery.trim() && topRecommendations.length > 0 && (
        <View style={styles.topSection}>
          <Text style={styles.topSectionTitle}>Más recomendados</Text>
          <View style={styles.topCards}>
            {topRecommendations.map((recommendation) => (
              <TouchableOpacity
                key={recommendation.id}
                style={styles.topCard}
                onPress={() => handleRecommendationPress(recommendation)}
                activeOpacity={0.84}
              >
                <View style={styles.topCardIcon}>
                  <Ionicons name="star" size={14} color="#FFB74D" />
                </View>
                <View style={styles.topCardText}>
                  <Text style={styles.topCardTitle} numberOfLines={1}>
                    {recommendation.name}
                  </Text>
                  <Text style={styles.topCardSubtitle} numberOfLines={1}>
                    {getRecommendationLabel(recommendation)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{categoryName}</Text>
            <Text style={styles.headerSubtitle}>
              {!isLoading && `${filteredRecommendations.length} recomendaciones`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerAddButton}
            onPress={() => {
              navigation.navigate('AddRecommendation', { categoryId });
            }}
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>

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
          data={filteredRecommendations}
          renderItem={renderRecommendationCard}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.cardsContainer}
          ListHeaderComponent={recommendations.length > 0 ? renderListHeader() : null}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="none"
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReached={loadMoreRecommendations}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>
                {searchQuery.trim() ? 'No encontramos resultados' : 'No hay recomendaciones disponibles'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery.trim()
                  ? 'Prueba con otro nombre, especialidad o ciudad'
                  : 'Aún no hay lugares registrados en esta categoría'}
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
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  listHeader: {
    marginBottom: 12,
  },
  searchContainer: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EEF2',
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  sortChips: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 12,
  },
  sortChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  sortChipActive: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#526170',
    fontFamily: 'Montserrat',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
  },
  topSection: {
    marginTop: 2,
  },
  topSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D3748',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  topCards: {
    gap: 8,
  },
  topCard: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#FFFCF5',
    borderWidth: 1,
    borderColor: '#FFE7B8',
  },
  topCardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7E6',
  },
  topCardText: {
    flex: 1,
    minWidth: 0,
  },
  topCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  topCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#59C6C0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },

  // Cards
  cardsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 130,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  providerAvatar: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#F0FDFC',
  },
  providerAvatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#F0FDFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultIcon: {
    width: 42,
    height: 42,
    opacity: 0.6,
  },
  providerMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardIconActions: {
    flexDirection: 'row',
    gap: 6,
  },
  cardIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  cardContent: {
    marginTop: 10,
    gap: 5,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  providerSpecialty: {
    fontSize: 13,
    lineHeight: 17,
    color: '#526170',
    marginTop: 3,
    fontFamily: 'Montserrat',
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
  },
  verifiedCompactBadge: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F0FBF1',
    borderWidth: 1,
    borderColor: '#BFE8C3',
  },
  verifiedCompactText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#4CAF50',
    fontFamily: 'Montserrat',
  },
  ratingPill: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#FFF7E6',
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5A00',
    fontFamily: 'Montserrat',
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    minHeight: 20,
  },
  metaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#526170',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9EEF2',
  },
  actionButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#178A84',
    fontFamily: 'Montserrat',
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
    marginTop: 5,
    gap: 8,
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
