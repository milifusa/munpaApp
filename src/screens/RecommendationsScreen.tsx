import React, { useState, useEffect } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<RecentRecommendation[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<RecentRecommendation[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Cargar categorías y recomendaciones recientes al montar el componente
  useEffect(() => {
    loadCategories();
    loadRecentRecommendations();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchError(null);
        const response = await api.searchRecommendations(searchQuery.trim());
        const items =
          response?.data ||
          response?.recommendations ||
          response?.data?.data ||
          [];
        setSearchResults(Array.isArray(items) ? items : []);
      } catch (error: any) {
        console.error('❌ [RECOMMENDATIONS] Error búsqueda:', error);
        setSearchResults([]);
        setSearchError('No se pudieron cargar los resultados');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadCategories = async () => {
    console.log('🔄 [RECOMMENDATIONS] Cargando categorías...');
    setIsLoadingCategories(true);
    setCategoriesError(null);
    
    try {
      const response = await api.getCategories();
      
      if (response.success && response.data) {
        console.log('✅ [RECOMMENDATIONS] Categorías cargadas:', response.data.length);
        setCategories(response.data);
      } else {
        console.log('⚠️ [RECOMMENDATIONS] Respuesta sin datos de categorías');
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
    console.log('🔄 [RECOMMENDATIONS] Cargando recomendaciones recientes...');
    setIsLoadingRecent(true);
    setRecentError(null);
    
    try {
      const response = await api.getRecentRecommendations(10);
      
      if (response.success && response.data) {
        console.log('✅ [RECOMMENDATIONS] Recomendaciones recientes cargadas:', response.data.length);
        setRecentRecommendations(response.data);
      } else {
        console.log('⚠️ [RECOMMENDATIONS] Respuesta sin datos de recomendaciones recientes');
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
    setSelectedCategory(category.id);
    console.log(`📍 [RECOMMENDATIONS] Categoría seleccionada: ${category.id}`);
    
    // Navegar a la pantalla de recomendaciones de la categoría
    navigation.navigate('CategoryRecommendations', {
      categoryId: category.id,
      categoryName: category.name,
    });
  };

  const renderQuickActions = () => (
    <View >
      <View style={styles.quickActions}>
      <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('ListsMain')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#96d2d3', }]}>
            <Ionicons name="list" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Listas</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Favorites')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B6B' }]}>
            <Ionicons name="heart" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Mis Favoritos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('Wishlist')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#FFB74D' }]}>
            <Ionicons name="bookmark" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Lista de Deseos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.quickAction}
          onPress={() => navigation.navigate('FavoritesMap')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: '#4285F4' }]}>
            <Ionicons name="map" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Ver Mapa</Text>
        </TouchableOpacity>
        
      </View>
    </View>
  );

  const handleRecommendationPress = (recommendation: RecentRecommendation) => {
    console.log('📍 [RECOMMENDATIONS] Recomendación seleccionada:', recommendation.id);
    navigation.navigate('RecommendationDetail', {
      recommendationId: recommendation.id,
    });
  };

  const renderRecentRecommendations = () => {
    // Si está cargando, mostrar indicador
    if (isLoadingRecent) {
      return (
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Últimas Recomendaciones</Text>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando recomendaciones...</Text>
          </View>
        </View>
      );
    }

    // Si hay error, mostrar mensaje de error
    if (recentError) {
      return (
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Últimas Recomendaciones</Text>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
            <Text style={styles.errorText}>{recentError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadRecentRecommendations}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    // Si no hay recomendaciones, mostrar mensaje vacío
    if (recentRecommendations.length === 0) {
      return (
        <View style={styles.recentContainer}>
          <Text style={styles.sectionTitle}>Últimas Recomendaciones</Text>
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No hay recomendaciones recientes</Text>
            <Text style={styles.emptySubtext}>
              Sé el primero en agregar una recomendación
            </Text>
          </View>
        </View>
      );
    }

    // Renderizar recomendaciones
    return (
      <View style={styles.recentContainer}>
        <Text style={styles.sectionTitle}>Últimas Recomendaciones</Text>
        <View style={styles.recentItems}>
          {recentRecommendations.slice(0, 10).map((recommendation) => (
            <TouchableOpacity 
              key={recommendation.id} 
              style={styles.recentItem}
              onPress={() => handleRecommendationPress(recommendation)}
            >
              {/* Imagen o icono */}
              {recommendation.imageUrl ? (
                <Image 
                  source={{ uri: recommendation.imageUrl }} 
                  style={styles.recentItemImage}
                />
              ) : (
                <View style={styles.recentItemIcon}>
                  <Image 
                    source={require('../../assets/icon.png')} 
                    style={styles.defaultIcon}
                    resizeMode="contain"
                  />
                </View>
              )}
              
              {/* Información */}
              <View style={styles.recentItemInfo}>
                <Text style={styles.recentItemTitle} numberOfLines={1}>
                  {recommendation.name}
                </Text>
                <Text style={styles.recentItemCategory} numberOfLines={1}>
                  {recommendation.category?.name || 'Sin categoría'}
                </Text>
                {(recommendation.cityName || recommendation.city || recommendation.countryName || recommendation.country) && (
                  <Text style={styles.recentItemLocation} numberOfLines={1}>
                    {(recommendation.cityName || recommendation.city || 'Ciudad')} · {recommendation.countryName || recommendation.country || 'País'}
                  </Text>
                )}
                <View style={styles.recentItemRating}>
                  {/* Mostrar número de mamás que lo recomiendan */}
                  <Ionicons name="people" size={14} color="#59C6C0" />
                  <Text style={styles.ratingText}>
                    {(() => {
                      const recommendations = calculateRecommendations(recommendation.totalReviews, recommendation.averageRating);
                      return recommendations > 0
                        ? `${recommendations} ${recommendations === 1 ? 'mamá lo recomienda' : 'mamás lo recomiendan'}`
                        : 'Sin recomendaciones';
                    })()}
                  </Text>
                </View>
              </View>
              
              {/* Flecha */}
              <Ionicons name="chevron-forward" size={16} color="#CCC" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Carrusel de Banners de Recomendaciones */}
        <BannerCarousel section="recomendaciones" fallbackToHome={false} />

        {/* Contenido principal */}
        <View style={styles.contentContainer}>
          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar lugares, médicos, niñeras..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
          
          {searchQuery.trim().length > 0 ? (
            <View style={styles.recentContainer}>
              <Text style={styles.sectionTitle}>Resultados de búsqueda</Text>
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#59C6C0" />
                </View>
              )}
              {!isSearching && searchResults.length === 0 && (
                <Text style={styles.searchEmptyText}>
                  {searchError || 'No se encontraron resultados'}
                </Text>
              )}
              {!isSearching && searchResults.length > 0 && (
                <View style={styles.recentItems}>
                  {searchResults.map((recommendation) => (
                    <TouchableOpacity 
                      key={recommendation.id} 
                      style={styles.recentItem}
                      onPress={() => handleRecommendationPress(recommendation)}
                    >
                      {recommendation.imageUrl ? (
                        <Image 
                          source={{ uri: recommendation.imageUrl }} 
                          style={styles.recentItemImage}
                        />
                      ) : (
                        <View style={styles.recentItemIcon}>
                          <Image 
                            source={require('../../assets/icon.png')} 
                            style={styles.defaultIcon}
                            resizeMode="contain"
                          />
                        </View>
                      )}
                      <View style={styles.recentItemInfo}>
                        <Text style={styles.recentItemTitle} numberOfLines={1}>
                          {recommendation.name}
                        </Text>
                        <Text style={styles.recentItemCategory} numberOfLines={1}>
                          {recommendation.category?.name || 'Sin categoría'}
                        </Text>
                        {(recommendation.cityName || recommendation.city || recommendation.countryName || recommendation.country) && (
                          <Text style={styles.recentItemLocation} numberOfLines={1}>
                            {(recommendation.cityName || recommendation.city || 'Ciudad')} · {recommendation.countryName || recommendation.country || 'País'}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#CCC" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <>
              {/* Acciones rápidas */}
              {renderQuickActions()}
              
              {/* Botón grande para agregar recomendación */}
              <TouchableOpacity
                style={styles.addRecommendationButton}
                onPress={() => navigation.navigate('AddRecommendation')}
              >
                <View style={styles.addRecommendationContent}>
                  <View style={styles.addRecommendationIcon}>
                    <Ionicons name="add-circle" size={28} color="white" />
                  </View>
                  <View style={styles.addRecommendationText}>
                    <Text style={styles.addRecommendationTitle}>Agregar Recomendación</Text>
                    <Text style={styles.addRecommendationSubtitle}>
                      Comparte un lugar que te guste con la comunidad
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#59C6C0" />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Categorías principales */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>¿Qué estás buscando?</Text>
          
          {/* Estado de carga */}
          {isLoadingCategories && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando categorías...</Text>
            </View>
          )}

          {/* Estado de error */}
          {!isLoadingCategories && categoriesError && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>{categoriesError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadCategories}>
                <Ionicons name="refresh" size={20} color="white" />
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Categorías de la API */}
          {!isLoadingCategories && !categoriesError && categories.length > 0 && (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryCard,
                    selectedCategory === category.id && styles.selectedCategory
                  ]}
                  onPress={() => handleCategoryPress(category)}
                >
                  {/* Imagen o icono de la categoría */}
                  {category.imageUrl ? (
                    <Image 
                      source={{ uri: category.imageUrl }} 
                      style={styles.categoryImage}
                    />
                  ) : (
                    <View style={styles.categoryIcon}>
                      <Image 
                        source={require('../../assets/icon.png')} 
                        style={styles.defaultCategoryIcon}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  
                  {/* Información de la categoría */}
                  <View style={styles.categoryInfo}>
                    <Text style={styles.categoryTitle} numberOfLines={2}>
                      {category.name}
                    </Text>
                    <Text style={styles.categorySubtitle} numberOfLines={2}>
                      {category.description}
                    </Text>
                  </View>
                  
                  {/* Flecha */}
                  <View style={styles.categoryArrow}>
                    <Ionicons name="arrow-forward" size={16} color="#666" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        

        {/* Recomendaciones recientes */}
        {searchQuery.trim().length === 0 && renderRecentRecommendations()}

        {/* Espacio final */}
        <View style={styles.finalSpacing} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },
  
  // Contenedor de contenido
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
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
    backgroundColor: '#F7FAFC',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Secciones
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // Categorías
  categoriesContainer: {
    padding: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategory: {
    borderColor: '#59C6C0',
    backgroundColor: '#F0FDFC',
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F0FDFC',
  },
  defaultCategoryIcon: {
    width: 60,
    height: 60,
    opacity: 0.6,
  },
  categoryImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 15,
  },
  categoryInfo: {
    flex: 1,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  categoryArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  

  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    paddingVertical: 20,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Botón grande para agregar recomendación
  addRecommendationButton: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  addRecommendationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addRecommendationIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addRecommendationText: {
    flex: 1,
  },
  addRecommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  addRecommendationSubtitle: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
  },
  
  // Recomendaciones recientes
  recentContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  recentItems: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  defaultIcon: {
    width: 40,
    height: 40,
    opacity: 0.6,
  },
  recentItemImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 15,
    backgroundColor: '#F0FDFC',
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentItemCategory: {
    fontSize: 12,
    color: '#59C6C0',
    marginBottom: 4,
    fontWeight: '500',
  },
  recentItemLocation: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  searchEmptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  recentItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  
  // Espaciado
  finalSpacing: {
    height: 30,
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
