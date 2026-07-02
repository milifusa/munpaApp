import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import BannerCarousel from '../components/BannerCarousel';

// Interfaz para las categorías
interface Category {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  order: number;
  icon?: string;
}

// Interfaz para las recomendaciones recientes
interface RecentRecommendation {
  id: string;
  name: string;
  description: string;
  address: string;
  imageUrl?: string;
  cityName?: string;
  countryName?: string;
  city?: string;
  country?: string;
  totalReviews: number;
  averageRating: number;
  commentsCount: number;
  category: {
    id: string;
    name: string;
    icon?: string;
    imageUrl?: string;
  } | null;
  createdAt: Date;
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

const RecommendationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<RecentRecommendation[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<RecentRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequestIdRef = useRef(0);

  // Cargar categorías y recomendaciones recientes al montar el componente
  useEffect(() => {
    loadCategories();
    loadRecentRecommendations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      searchRequestIdRef.current += 1;
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const requestId = searchRequestIdRef.current + 1;
      searchRequestIdRef.current = requestId;

      try {
        setIsSearching(true);
        setSearchError(null);
        const response = await api.searchRecommendations(searchQuery.trim());
        if (searchRequestIdRef.current !== requestId) return;

        const items =
          response?.data ||
          response?.recommendations ||
          response?.data?.data ||
          [];
        setSearchResults(Array.isArray(items) ? items : []);
      } catch (error: any) {
        if (searchRequestIdRef.current !== requestId) return;
        console.error('❌ [RECOMMENDATIONS] Error búsqueda:', error);
        setSearchResults([]);
        setSearchError('No se pudieron cargar los resultados');
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCategories = async () => {
    setIsLoadingCategories(true);
    setCategoriesError(null);
    
    try {
      const response = await api.getCategories();
      
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setCategoriesError('No se pudieron cargar las categorías');
      }
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error cargando categorías:', error);
      setCategoriesError('Error al cargar las categorías');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadRecentRecommendations = async () => {
    setIsLoadingRecent(true);
    setRecentError(null);
    
    try {
      const response = await api.getRecentRecommendations(10);
      
      if (response.success && response.data) {
        setRecentRecommendations(response.data);
      } else {
        setRecentError('No se pudieron cargar las recomendaciones');
      }
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error cargando recomendaciones recientes:', error);
      setRecentError('Error al cargar las recomendaciones');
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCategories(), loadRecentRecommendations()]);
    setRefreshing(false);
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CategoryRecommendations', {
      categoryId: category.id,
      categoryName: category.name,
    });
  };

  const visibleRecommendations = [...recentRecommendations].sort((a, b) =>
    (b.averageRating || 0) - (a.averageRating || 0) ||
    (b.totalReviews || 0) - (a.totalReviews || 0)
  );

  const getCategoryRecommendations = (categoryId: string) =>
    recentRecommendations.filter((recommendation) => recommendation.category?.id === categoryId);

  const getCategoryValueLabel = (category: Category) => {
    const recommendationsCount = getCategoryRecommendations(category.id).length;

    if (recommendationsCount > 0) {
      return 'Con opciones recientes';
    }

    if (category.description) {
      return category.description.length > 34
        ? `${category.description.slice(0, 34).trim()}...`
        : category.description;
    }

    return 'Ver recomendaciones';
  };

  const getLocationLabel = (recommendation: RecentRecommendation) => {
    const city = recommendation.cityName || recommendation.city;
    const country = recommendation.countryName || recommendation.country;

    if (city && country) return `${city} · ${country}`;
    if (city) return city;
    if (country) return country;
    return 'Ubicación por confirmar';
  };

  const getRecommendationCountLabel = (recommendation: RecentRecommendation): string | null => {
    const recommendations = calculateRecommendations(
      recommendation.totalReviews || 0,
      recommendation.averageRating || 0
    );

    if (recommendations > 0) {
      return `${recommendations} ${recommendations === 1 ? 'mamá lo recomienda' : 'mamás lo recomiendan'}`;
    }

    return recommendation.totalReviews > 0 ? `${recommendation.totalReviews} reseñas` : null;
  };

  const renderRecommendationCard = (
    recommendation: RecentRecommendation,
    variant: 'featured' | 'compact' = 'compact'
  ) => {
    const recommendationCountLabel = getRecommendationCountLabel(recommendation);

    return (
    <TouchableOpacity
      key={recommendation.id}
      style={[
        styles.recommendationCard,
        variant === 'featured' && styles.recommendationCardFeatured,
      ]}
      onPress={() => handleRecommendationPress(recommendation)}
      activeOpacity={0.84}
    >
      {recommendation.imageUrl ? (
        <Image
          source={{ uri: recommendation.imageUrl }}
          style={[
            styles.recommendationImage,
            variant === 'featured' && styles.recommendationImageFeatured,
          ]}
        />
      ) : (
        <View
          style={[
            styles.recommendationImagePlaceholder,
            variant === 'featured' && styles.recommendationImageFeatured,
          ]}
        >
          <Ionicons name="sparkles-outline" size={22} color="#59C6C0" />
        </View>
      )}

      <View style={styles.recommendationInfo}>
        <View style={styles.recommendationTopLine}>
          <Text style={styles.recommendationCategory} numberOfLines={1}>
            {recommendation.category?.name || 'Recomendación'}
          </Text>
          {recommendation.averageRating > 0 && (
            <View style={styles.ratingPill}>
              <Ionicons name="star" size={11} color="#FFB74D" />
              <Text style={styles.ratingPillText}>{recommendation.averageRating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <Text style={styles.recommendationTitle} numberOfLines={2}>
          {recommendation.name}
        </Text>
        {recommendationCountLabel && (
          <View style={styles.recommendationMetaRow}>
            <Ionicons name="people-outline" size={13} color="#59C6C0" />
            <Text style={styles.recommendationMetaText} numberOfLines={1}>
              {recommendationCountLabel}
            </Text>
          </View>
        )}
        <View style={styles.recommendationMetaRow}>
          <Ionicons name="location-outline" size={13} color="#6B7280" />
          <Text style={styles.recommendationLocation} numberOfLines={1}>
            {getLocationLabel(recommendation)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color="#B8C2CC" />
    </TouchableOpacity>
    );
  };

  const renderQuickActions = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.quickActions}
    >
      {[
        { label: 'Listas', icon: 'list-outline', route: 'ListsMain' },
        { label: 'Favoritos', icon: 'heart-outline', route: 'Favorites' },
        { label: 'Deseos', icon: 'bookmark-outline', route: 'Wishlist' },
        { label: 'Mapa', icon: 'map-outline', route: 'FavoritesMap' },
      ].map((action) => (
        <TouchableOpacity
          key={action.route}
          style={styles.quickAction}
          onPress={() => navigation.navigate(action.route)}
          activeOpacity={0.84}
        >
          <Ionicons name={action.icon as any} size={17} color="#59C6C0" />
          <Text style={styles.quickActionText}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const handleRecommendationPress = (recommendation: RecentRecommendation) => {
    navigation.navigate('RecommendationDetail', {
      recommendationId: recommendation.id,
    });
  };

  const renderSearchResults = () => (
    <View style={styles.sectionBlock}>
      <Text style={styles.sectionTitle}>Resultados de búsqueda</Text>
      {isSearching && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
        </View>
      )}
      {!isSearching && searchResults.length === 0 && (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={42} color="#B8C2CC" />
          <Text style={styles.emptyText}>{searchError || 'No se encontraron resultados'}</Text>
          <Text style={styles.emptySubtext}>Prueba con una categoría, ciudad o tipo de servicio.</Text>
        </View>
      )}
      {!isSearching && searchResults.length > 0 && (
        <View style={styles.recommendationList}>
          {searchResults.map((recommendation) => renderRecommendationCard(recommendation))}
        </View>
      )}
    </View>
  );

  const renderCategoriesSection = () => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeaderRow}>
        <View>
          <Text style={styles.sectionTitle}>¿Qué necesitas hoy?</Text>
          <Text style={styles.sectionSubtitle}>
            Elige una categoría para ver todas sus recomendaciones.
          </Text>
        </View>
      </View>

      {isLoadingCategories && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando categorías...</Text>
        </View>
      )}

      {!isLoadingCategories && categoriesError && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={42} color="#FF6B6B" />
          <Text style={styles.errorText}>{categoriesError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
            <Ionicons name="refresh" size={18} color="white" />
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoadingCategories && !categoriesError && categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesGrid}
        >
          {categories.map((category) => {
            const isEmoji = category.icon ? /[\u{1F300}-\u{1F9FF}]/u.test(category.icon) : false;
            const hasIonicon = Boolean(
              category.icon &&
              !isEmoji &&
              Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, category.icon)
            );

            return (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => handleCategoryPress(category)}
                activeOpacity={0.84}
              >
                {category.imageUrl ? (
                  <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} />
                ) : (
                  <View style={styles.categoryIcon}>
                    {isEmoji ? (
                      <Text style={styles.categoryEmoji}>{category.icon}</Text>
                    ) : hasIonicon ? (
                      <Ionicons
                        name={category.icon as any}
                        size={20}
                        color="#59C6C0"
                      />
                    ) : (
                      <Image
                        source={require('../../assets/icon.png')}
                        style={styles.categoryLogo}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                )}
                <View style={styles.categoryTextBlock}>
                  <Text style={styles.categoryTitle} numberOfLines={1}>
                    {category.name}
                  </Text>
                  <Text style={styles.categoryValue} numberOfLines={1}>
                    {getCategoryValueLabel(category)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color="#B8C2CC" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderRecommendedSection = () => {
    if (isLoadingRecent) {
      return (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recomendadas para ti</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando recomendaciones...</Text>
          </View>
        </View>
      );
    }

    if (recentError) {
      return (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recomendadas para ti</Text>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={42} color="#FF6B6B" />
            <Text style={styles.errorText}>{recentError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadRecentRecommendations}>
              <Ionicons name="refresh" size={18} color="white" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (recentRecommendations.length === 0) {
      return (
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Recomendadas para ti</Text>
          <View style={styles.emptyContainer}>
            <Ionicons name="sparkles-outline" size={42} color="#B8C2CC" />
            <Text style={styles.emptyText}>No hay recomendaciones recientes</Text>
            <Text style={styles.emptySubtext}>Sé el primero en compartir un lugar útil.</Text>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Recomendadas para ti</Text>
            <Text style={styles.sectionSubtitle}>Una vista rápida; usa categorías para listas completas.</Text>
          </View>
        </View>
        <View style={styles.recommendationList}>
          {visibleRecommendations.slice(0, 4).map((recommendation, index) =>
            renderRecommendationCard(recommendation, index === 0 ? 'featured' : 'compact')
          )}
        </View>
      </View>
    );
  };

  const renderLatestSection = () => {
    if (isLoadingRecent || recentError || recentRecommendations.length <= 4) return null;

    return (
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Últimas agregadas</Text>
            <Text style={styles.sectionSubtitle}>Nuevas ideas para guardar o visitar después.</Text>
          </View>
          <TouchableOpacity
            style={styles.sectionAction}
            onPress={() => navigation.navigate('AddRecommendation')}
          >
            <Ionicons name="add" size={16} color="#178A84" />
            <Text style={styles.sectionActionText}>Agregar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recommendationList}>
          {recentRecommendations.slice(4, 8).map((recommendation) =>
            renderRecommendationCard(recommendation)
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Recomendaciones</Text>
              <Text style={styles.headerSubtitle}>
                Lugares, especialistas y servicios recomendados por otras mamás.
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigation.navigate('Favorites')}
                activeOpacity={0.84}
              >
                <Ionicons name="heart-outline" size={19} color="#59C6C0" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigation.navigate('FavoritesMap')}
                activeOpacity={0.84}
              >
                <Ionicons name="map-outline" size={19} color="#59C6C0" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar pediatra, guardería, terapia..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim().length > 0 ? (
            renderSearchResults()
          ) : (
            <>
              {renderQuickActions()}
              {renderCategoriesSection()}
              {renderRecommendedSection()}
              <View style={styles.bannerSlot}>
                <BannerCarousel section="recomendaciones" fallbackToHome={false} />
              </View>
              {renderLatestSection()}
            </>
          )}
        </View>
      </ScrollView>

      {searchQuery.trim().length === 0 && (
        <TouchableOpacity
          style={[styles.fabButton, { bottom: insets.bottom + 82 }]}
          onPress={() => navigation.navigate('AddRecommendation')}
          activeOpacity={0.84}
        >
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  
  // Contenedor de contenido
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 16,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
    marginTop: 5,
    fontFamily: 'Montserrat',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 2,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  
  // Búsqueda
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  
  // Secciones
  sectionBlock: {
    marginTop: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
    marginTop: 3,
    fontFamily: 'Montserrat',
  },
  sectionAction: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    borderRadius: 16,
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  sectionActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#178A84',
    fontFamily: 'Montserrat',
  },
  
  // Categorías
  categoriesGrid: {
    flexDirection: 'row',
    gap: 9,
    paddingRight: 8,
  },
  categoryCard: {
    width: 174,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 9,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0FDFC',
  },
  categoryEmoji: {
    fontSize: 20,
  },
  categoryLogo: {
    width: 22,
    height: 22,
    opacity: 0.78,
  },
  categoryImage: {
    width: 38,
    height: 38,
    borderRadius: 15,
  },
  categoryTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  categoryTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  categoryValue: {
    fontSize: 10,
    lineHeight: 13,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  quickAction: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  quickActionText: {
    fontSize: 12,
    color: '#178A84',
    textAlign: 'center',
    fontWeight: '800',
    fontFamily: 'Montserrat',
  },
  recommendationList: {
    gap: 10,
  },
  recommendationCard: {
    minHeight: 96,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  recommendationCardFeatured: {
    minHeight: 118,
    borderColor: '#CDEFEB',
    backgroundColor: '#FBFFFE',
  },
  recommendationImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#F0FDFC',
  },
  recommendationImageFeatured: {
    width: 74,
    height: 74,
    borderRadius: 18,
  },
  recommendationImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFC',
  },
  recommendationInfo: {
    flex: 1,
  },
  recommendationTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  recommendationCategory: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#59C6C0',
    fontFamily: 'Montserrat',
  },
  ratingPill: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: '#FFF7E6',
  },
  ratingPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A5A00',
    fontFamily: 'Montserrat',
  },
  recommendationTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
    marginBottom: 6,
  },
  recommendationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 18,
  },
  recommendationMetaText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#526170',
    fontFamily: 'Montserrat',
  },
  recommendationLocation: {
    flex: 1,
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  bannerSlot: {
    marginTop: 18,
    marginBottom: 2,
  },
  fabButton: {
    position: 'absolute',
    right: 22,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#59C6C0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  // Estados de carga, error y vacío
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
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
    paddingVertical: 40,
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
    paddingVertical: 40,
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
    paddingHorizontal: 40,
  },
});

export default RecommendationsScreen;
