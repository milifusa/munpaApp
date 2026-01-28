import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import marketplaceService, { MarketplaceProduct, MarketplaceCategory, CATEGORIES } from '../services/marketplaceService';
import BannerCarousel from '../components/BannerCarousel';
import analyticsService from '../services/analyticsService';

const MunpaMarketScreen = () => {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'venta' | 'donacion' | 'trueque'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined);
  const [orderBy, setOrderBy] = useState<'reciente' | 'precio_asc' | 'precio_desc' | 'vistas' | 'distancia'>('reciente');
  const [categories, setCategories] = useState<MarketplaceCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const locationRequestedRef = useRef(false);
  const loadInFlightRef = useRef(false);
  const lastLoadKeyRef = useRef<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [selectedType, selectedCategory, orderBy, minPrice, maxPrice, selectedCondition]);

  // Cargar categorías solo una vez al montar el componente
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const fetchedCategories = await marketplaceService.getCategories(true);
      setCategories(fetchedCategories);
      console.log('✅ [MARKET] Categorías cargadas:', fetchedCategories.length);
    } catch (error) {
      console.error('❌ [MARKET] Error cargando categorías:', error);
      // Usar categorías por defecto si falla
      setCategories(CATEGORIES);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Recargar productos cuando cambia la búsqueda (con debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        loadProducts();
      }
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadProducts = async (force: boolean = false) => {
    try {
      const coordsKey = userCoords ? `${userCoords.latitude.toFixed(4)}|${userCoords.longitude.toFixed(4)}` : 'na';
      const loadKey = `${selectedType}|${selectedCategory || ''}|${searchQuery}|${minPrice}|${maxPrice}|${selectedCondition || ''}|${orderBy}|${coordsKey}`;
      if (loadInFlightRef.current) return;
      if (!force && lastLoadKeyRef.current === loadKey) return;
      loadInFlightRef.current = true;
      lastLoadKeyRef.current = loadKey;
      setLoading(true);

      const filters: any = {
        type: selectedType,
        category: selectedCategory,
        search: searchQuery,
        status: 'disponible',
        orderBy: orderBy,
        limit: 50,
      };

      // Agregar filtros de precio solo si están definidos y el tipo es venta
      if (selectedType === 'venta' || selectedType === 'all') {
        if (minPrice && !isNaN(Number(minPrice))) {
          filters.minPrice = Number(minPrice);
        }
        if (maxPrice && !isNaN(Number(maxPrice))) {
          filters.maxPrice = Number(maxPrice);
        }
      }

      // Agregar filtro de condición si está seleccionada
      if (selectedCondition) {
        filters.condition = selectedCondition as 'nuevo' | 'como_nuevo' | 'buen_estado' | 'usado';
      }

      let coords = userCoords;
      if (!coords && !locationRequestedRef.current) {
        locationRequestedRef.current = true;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const currentLocation = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            coords = {
              latitude: currentLocation.coords.latitude,
              longitude: currentLocation.coords.longitude,
            };
            setUserCoords(coords);
          }
        } catch (error) {
          console.warn('⚠️ [MARKET] No se pudo obtener ubicación para ordenar por distancia');
        }
      }

      if (coords) {
        filters.latitude = coords.latitude;
        filters.longitude = coords.longitude;
        filters.orderBy = 'distancia';
      } else {
        // Mapear ordenamiento
        const orderByMap: Record<string, string> = {
          'reciente': 'reciente',
          'precio_asc': 'precio_asc',
          'precio_desc': 'precio_desc',
          'vistas': 'vistas',
          'distancia': 'distancia',
        };
        filters.orderBy = orderByMap[orderBy] as any || 'reciente';
      }

      const response = await marketplaceService.getProducts(filters);
      
      const fetchedProducts = response.products || [];
      
      
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    } catch (error) {
      console.error('❌ [MARKET] Error cargando productos:', error);
      setProducts([]);
    } finally {
      loadInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts(true);
    setRefreshing(false);
  };

  const handleProductPress = (product: MarketplaceProduct) => {
    analyticsService.logEvent('market_product_view', {
      product_id: product.id,
      title: product.title,
      type: product.type,
      price: product.price ?? null,
      category: product.category,
      city: product.location?.city || null,
      country: product.location?.country || null,
      views: product.views ?? 0,
    });
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const handleCreateProduct = () => {
    navigation.navigate('CreateProduct');
  };

  const handleMyProducts = () => {
    navigation.navigate('MyProducts');
  };

  const renderProductCard = ({ item }: { item: MarketplaceProduct }) => {
    const getCategoryIcon = (category: string) => {
      const cat = CATEGORIES.find(c => c.id === category);
      return cat?.icon || 'ellipsis-horizontal';
    };

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
        activeOpacity={0.7}
      >
        {/* Imagen del producto */}
        <View style={styles.productImageContainer}>
          {item.photos && item.photos.length > 0 ? (
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name={getCategoryIcon(item.category) as any} size={40} color="#ccc" />
            </View>
          )}
          
          {/* Badge de tipo */}
          <View style={[
            styles.typeBadge,
            item.type === 'venta' && styles.ventaBadge,
            item.type === 'donacion' && styles.donacionBadge,
            item.type === 'trueque' && styles.truequeBadge,
          ]}>
            <Text style={styles.typeBadgeText}>
              {item.type === 'venta' ? 'VENTA' : item.type === 'donacion' ? 'DONACIÓN' : 'TRUEQUE'}
            </Text>
          </View>
        </View>

        {/* Información del producto */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.type === 'venta' && item.price && (
            <Text style={styles.productPrice}>
              ${item.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
          
          {item.type === 'trueque' && item.tradeFor && (
            <Text style={styles.tradeFor} numberOfLines={1}>
              Por: {item.tradeFor}
            </Text>
          )}
          
          <View style={styles.productMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color="#666" />
              <Text style={styles.metaText}>
                {item.location.city || 'Ciudad no disponible'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={12} color="#666" />
              <Text style={styles.metaText}>{item.views ?? 0}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      
      {/* Barra de búsqueda y acciones */}
      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadProducts}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('MarketplaceFavorites')}
        >
          <Ionicons name="heart" size={24} color="#59C6C0" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleMyProducts}
        >
          <Ionicons name="list" size={24} color="#59C6C0" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <View style={styles.filterButtonContainer}>
            <Ionicons name="options" size={24} color={showFilters ? "#FF6B6B" : "#59C6C0"} />
            {(selectedCategory || minPrice || maxPrice || selectedCondition || orderBy !== 'reciente') && (
              <View style={styles.filterBadge} />
            )}
          </View>
        </TouchableOpacity>
      </View>



      {/* Filtros de categoría (si hay categoría seleccionada) */}
      {selectedCategory && (
        <View style={styles.selectedCategoryContainer}>
          <Text style={styles.selectedCategoryText}>
            Categoría: {(categories.length > 0 ? categories : CATEGORIES).find(c => c.id === selectedCategory)?.name || selectedCategory}
          </Text>
          <TouchableOpacity onPress={() => setSelectedCategory(undefined)}>
            <Ionicons name="close-circle" size={20} color="#59C6C0" />
          </TouchableOpacity>
        </View>
      )}

      {/* Filtros de tipo */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.typeFilters}
        contentContainerStyle={styles.typeFiltersContent}
      >
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'all' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text style={[styles.typeFilterText, selectedType === 'all' && styles.typeFilterTextActive]}>
            Todo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'venta' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('venta')}
        >
          <Text style={[styles.typeFilterText, selectedType === 'venta' && styles.typeFilterTextActive]}>
            Venta
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'donacion' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('donacion')}
        >
          <Text style={[styles.typeFilterText, selectedType === 'donacion' && styles.typeFilterTextActive]}>
            Donación
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeFilterButton, selectedType === 'trueque' && styles.typeFilterButtonActive]}
          onPress={() => setSelectedType('trueque')}
        >
          <Text style={[styles.typeFilterText, selectedType === 'trueque' && styles.typeFilterTextActive]}>
            Trueque
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Lista de productos */}
            {/* Carrusel de Banners del Marketplace con banner de economía circular */}
            <BannerCarousel 
        section="marketplace" 
        fallbackToHome={false}
        customBanner={
          <View style={styles.economyBanner}>
            <View style={styles.economyBannerContent}>
              <View style={styles.economyBannerIcon}>
                <Ionicons name="leaf" size={18} color="#4CAF50" />
              </View>
              <View style={styles.economyBannerText}>
                <Text style={styles.economyBannerTitle}>🌱 Economía Circular</Text>
                <Text style={styles.economyBannerDescription}>
                  Un espacio amigable para que mamás y papás podamos{' '}
                  <Text style={styles.economyBannerHighlight}>vender</Text>,{' '}
                  <Text style={styles.economyBannerHighlight}>donar</Text> o hacer{' '}
                  <Text style={styles.economyBannerHighlight}>trueque</Text> de las cosas de bebé que ya no necesitamos. ¡Juntos creamos una comunidad de apoyo! 💚
                </Text>
              </View>
            </View>
          </View>
        }
      />
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : !products || products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No hay productos disponibles</Text>
          <Text style={styles.emptySubtext}>¡Sé el primero en publicar!</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.productsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Modal de filtros avanzados */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtros de Búsqueda</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Filtro de Categoría */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categoría</Text>
                {loadingCategories ? (
                  <View style={styles.categoriesLoading}>
                    <ActivityIndicator size="small" color="#59C6C0" />
                    <Text style={styles.categoriesLoadingText}>Cargando categorías...</Text>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <TouchableOpacity
                      style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
                      onPress={() => setSelectedCategory(undefined)}
                    >
                      <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
                        Todas
                      </Text>
                    </TouchableOpacity>
                    {(categories.length > 0 ? categories : CATEGORIES).map((category) => {
                    // Verificar si el icono es un emoji o un nombre de Ionicons
                    const isEmoji = /[\u{1F300}-\u{1F9FF}]/u.test(category.icon);
                    
                    return (
                      <TouchableOpacity
                        key={category.id}
                        style={[styles.categoryChip, selectedCategory === category.id && styles.categoryChipActive]}
                        onPress={() => setSelectedCategory(category.id)}
                      >
                        {isEmoji ? (
                          <Text style={styles.categoryEmoji}>{category.icon}</Text>
                        ) : (
                          <Ionicons 
                            name={category.icon as any} 
                            size={16} 
                            color={selectedCategory === category.id ? 'white' : '#59C6C0'} 
                            style={styles.categoryIcon}
                          />
                        )}
                        <Text style={[styles.categoryChipText, selectedCategory === category.id && styles.categoryChipTextActive]}>
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  </ScrollView>
                )}
              </View>

              {/* Filtro de Precio (solo para venta) */}
              {(selectedType === 'venta' || selectedType === 'all') && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Rango de Precio</Text>
                  <View style={styles.priceInputs}>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.priceLabel}>Mínimo</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="$0"
                        value={minPrice}
                        onChangeText={setMinPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <View style={styles.priceInputContainer}>
                      <Text style={styles.priceLabel}>Máximo</Text>
                      <TextInput
                        style={styles.priceInput}
                        placeholder="Sin límite"
                        value={maxPrice}
                        onChangeText={setMaxPrice}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* Filtro de Condición */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Condición</Text>
                <View style={styles.conditionOptions}>
                  <TouchableOpacity
                    style={[styles.conditionChip, !selectedCondition && styles.conditionChipActive]}
                    onPress={() => setSelectedCondition(undefined)}
                  >
                    <Text style={[styles.conditionChipText, !selectedCondition && styles.conditionChipTextActive]}>
                      Todas
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.conditionChip, selectedCondition === 'nuevo' && styles.conditionChipActive]}
                    onPress={() => setSelectedCondition('nuevo')}
                  >
                    <Text style={[styles.conditionChipText, selectedCondition === 'nuevo' && styles.conditionChipTextActive]}>
                      Nuevo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.conditionChip, selectedCondition === 'como_nuevo' && styles.conditionChipActive]}
                    onPress={() => setSelectedCondition('como_nuevo')}
                  >
                    <Text style={[styles.conditionChipText, selectedCondition === 'como_nuevo' && styles.conditionChipTextActive]}>
                      Como Nuevo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.conditionChip, selectedCondition === 'buen_estado' && styles.conditionChipActive]}
                    onPress={() => setSelectedCondition('buen_estado')}
                  >
                    <Text style={[styles.conditionChipText, selectedCondition === 'buen_estado' && styles.conditionChipTextActive]}>
                      Buen Estado
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.conditionChip, selectedCondition === 'usado' && styles.conditionChipActive]}
                    onPress={() => setSelectedCondition('usado')}
                  >
                    <Text style={[styles.conditionChipText, selectedCondition === 'usado' && styles.conditionChipTextActive]}>
                      Usado
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Ordenamiento */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Ordenar por</Text>
                <View style={styles.orderOptions}>
                  <TouchableOpacity
                    style={[styles.orderOption, orderBy === 'reciente' && styles.orderOptionActive]}
                    onPress={() => setOrderBy('reciente')}
                  >
                    <Ionicons name="time" size={20} color={orderBy === 'reciente' ? 'white' : '#666'} />
                    <Text style={[styles.orderOptionText, orderBy === 'reciente' && styles.orderOptionTextActive]}>
                      Más Reciente
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderOption, orderBy === 'precio_asc' && styles.orderOptionActive]}
                    onPress={() => setOrderBy('precio_asc')}
                  >
                    <Ionicons name="arrow-up" size={20} color={orderBy === 'precio_asc' ? 'white' : '#666'} />
                    <Text style={[styles.orderOptionText, orderBy === 'precio_asc' && styles.orderOptionTextActive]}>
                      Precio: Menor a Mayor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderOption, orderBy === 'precio_desc' && styles.orderOptionActive]}
                    onPress={() => setOrderBy('precio_desc')}
                  >
                    <Ionicons name="arrow-down" size={20} color={orderBy === 'precio_desc' ? 'white' : '#666'} />
                    <Text style={[styles.orderOptionText, orderBy === 'precio_desc' && styles.orderOptionTextActive]}>
                      Precio: Mayor a Menor
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.orderOption, orderBy === 'vistas' && styles.orderOptionActive]}
                    onPress={() => setOrderBy('vistas')}
                  >
                    <Ionicons name="eye" size={20} color={orderBy === 'vistas' ? 'white' : '#666'} />
                    <Text style={[styles.orderOptionText, orderBy === 'vistas' && styles.orderOptionTextActive]}>
                      Más Vistos
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSelectedCategory(undefined);
                  setMinPrice('');
                  setMaxPrice('');
                  setSelectedCondition(undefined);
                  setOrderBy('reciente');
                }}
              >
                <Text style={styles.clearFiltersText}>Limpiar Filtros</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => {
                  setShowFilters(false);
                  loadProducts();
                }}
              >
                <Text style={styles.applyFiltersText}>Aplicar Filtros</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Botón flotante para crear producto */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={handleCreateProduct}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: 'white',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  actionButton: {
    padding: 8,
  },
  typeFilters: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    maxHeight: 60,
  },
  typeFiltersContent: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  typeFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    height: 36,
  },
  typeFilterButtonActive: {
    backgroundColor: '#96d2d3',
  },
  typeFilterText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  typeFilterTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 8,
    textAlign: 'center',
  },
  productsList: {
    padding: 10,
  },
  productCard: {
    flex: 1,
    margin: 5,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  productImageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  ventaBadge: {
    backgroundColor: '#4CAF50',
  },
  donacionBadge: {
    backgroundColor: '#FF9800',
  },
  truequeBadge: {
    backgroundColor: '#2196F3',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  productInfo: {
    padding: 10,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 4,
    minHeight: 36,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  tradeFor: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  economyBanner: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    width: '100%',
    marginHorizontal: 4,
  },
  economyBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  economyBannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  economyBannerText: {
    flex: 1,
  },
  economyBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  economyBannerDescription: {
    fontSize: 11,
    color: '#388E3C',
    fontFamily: 'Montserrat',
    lineHeight: 14,
  },
  economyBannerHighlight: {
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  selectedCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#BBDEFB',
  },
  selectedCategoryText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  filterButtonActive: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  filterButtonContainer: {
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  modalBody: {
    maxHeight: 500,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  categoryScroll: {
    marginHorizontal: -4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryChipActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  categoryIcon: {
    marginRight: 6,
  },
  categoryEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: 'white',
  },
  categoriesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  categoriesLoadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  priceInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
    backgroundColor: '#F9F9F9',
  },
  conditionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  conditionChipActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  conditionChipText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  conditionChipTextActive: {
    color: 'white',
  },
  orderOptions: {
    gap: 12,
  },
  orderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  orderOptionActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  orderOptionText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  orderOptionTextActive: {
    color: 'white',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearFiltersText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default MunpaMarketScreen;

