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
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import marketplaceService, { MarketplaceProduct, MarketplaceCategory, CATEGORIES } from '../services/marketplaceService';
import BannerCarousel from '../components/BannerCarousel';
import analyticsService from '../services/analyticsService';

type MarketTypeFilter = 'all' | 'venta' | 'donacion' | 'trueque';

type ProductListRow =
  | { type: 'products'; id: string; products: MarketplaceProduct[] }
  | { type: 'banner'; id: string };

const MARKET_LIST_PADDING = 16;
const MARKET_CARD_GAP = 10;

const MunpaMarketScreen = () => {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<MarketTypeFilter>('all');
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

  const loadProducts = async (force: boolean = false, retryCount: number = 0) => {
    try {
      const coordsKey = userCoords ? `${userCoords.latitude.toFixed(4)}|${userCoords.longitude.toFixed(4)}` : 'na';
      const loadKey = `${selectedType}|${selectedCategory || ''}|${searchQuery}|${minPrice}|${maxPrice}|${selectedCondition || ''}|${orderBy}|${coordsKey}`;
      
      
      if (loadInFlightRef.current) {
        return;
      }
      if (!force && lastLoadKeyRef.current === loadKey) {
        return;
      }
      
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
          } else {
          }
        } catch (error) {
          console.warn('⚠️ [MARKET] Error obteniendo ubicación:', error);
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
      
      if (!Array.isArray(fetchedProducts)) {
        console.error('❌ [MARKET] Respuesta inválida, products no es un array:', fetchedProducts);
        setProducts([]);
      } else {
        setProducts(fetchedProducts);
      }
    } catch (error: any) {
      console.error('❌ [MARKET] Error cargando productos:', error);
      console.error('❌ [MARKET] Error detallado:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      
      // Retry automático hasta 2 veces si falla
      if (retryCount < 2) {
        loadInFlightRef.current = false;
        lastLoadKeyRef.current = null; // Reset para permitir retry
        setTimeout(() => loadProducts(force, retryCount + 1), 1000 * (retryCount + 1)); // Esperar 1s, 2s
        return;
      }
      
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

  const availableCategories = categories.length > 0 ? categories : CATEGORIES;
  const hasActiveFilters = Boolean(
    selectedType !== 'all' ||
    selectedCategory ||
    minPrice ||
    maxPrice ||
    selectedCondition ||
    orderBy !== 'reciente'
  );

  const getConditionLabel = (condition?: string) => {
    switch (condition) {
      case 'nuevo':
        return 'Nuevo';
      case 'como_nuevo':
        return 'Como nuevo';
      case 'buen_estado':
        return 'Buen estado';
      case 'usado':
        return 'Usado';
      default:
        return 'Sin condición';
    }
  };

  const getCategoryName = (categoryId?: string) =>
    availableCategories.find((category) => category.id === categoryId)?.name || categoryId;

  const getTypeFilterLabel = (type: MarketTypeFilter) => {
    switch (type) {
      case 'venta':
        return 'Comprar';
      case 'donacion':
        return 'Donar';
      case 'trueque':
        return 'Trueque';
      default:
        return 'Todo';
    }
  };

  const clearFilters = () => {
    setSelectedType('all');
    setSelectedCategory(undefined);
    setMinPrice('');
    setMaxPrice('');
    setSelectedCondition(undefined);
    setOrderBy('reciente');
  };

  const handleTypeFilterSelect = (type: MarketTypeFilter) => {
    setSelectedType(type);
    if (type === 'donacion' || type === 'trueque') {
      setMinPrice('');
      setMaxPrice('');
    }
  };

  const activeFilterSummary = [
    selectedType !== 'all' ? getTypeFilterLabel(selectedType) : null,
    selectedCategory ? getCategoryName(selectedCategory) : null,
    selectedCondition ? getConditionLabel(selectedCondition) : null,
    minPrice || maxPrice ? `$${minPrice || '0'} - ${maxPrice ? `$${maxPrice}` : 'sin límite'}` : null,
    orderBy !== 'reciente'
      ? orderBy === 'distancia'
        ? 'Cerca'
        : orderBy === 'precio_asc'
          ? 'Menor precio'
          : orderBy === 'precio_desc'
            ? 'Mayor precio'
            : 'Más vistos'
      : null,
  ].filter(Boolean).join(' · ');

  const getProductBadgeText = (product: MarketplaceProduct) => {
    if (product.type === 'donacion') return 'Gratis';
    if (product.type === 'trueque') return 'Trueque';
    if (product.price != null) {
      return `$${product.price.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
    return 'Venta';
  };

  const productCardWidth = Math.floor(
    (screenWidth - MARKET_LIST_PADDING * 2 - MARKET_CARD_GAP) / 2
  );
  const productImageHeight = Math.round(productCardWidth * 0.74);

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
        <View style={[styles.productImageContainer, { height: productImageHeight }]}>
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
              {getProductBadgeText(item)}
            </Text>
          </View>

          <View style={styles.favoriteIndicator}>
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={16}
              color={item.isFavorite ? '#FF6B6B' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Información del producto */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {item.type === 'trueque' && item.tradeFor && (
            <Text style={styles.tradeFor} numberOfLines={1}>
              Por: {item.tradeFor}
            </Text>
          )}

          <View style={styles.conditionPill}>
            <Text style={styles.conditionPillText}>{getConditionLabel(item.condition)}</Text>
          </View>
          
          <View style={styles.productMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#666" />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.location.city || 'Ciudad no disponible'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const productRows = products.reduce<ProductListRow[]>((rows, _product, index) => {
    if (index % 2 !== 0) return rows;

    rows.push({
      type: 'products',
      id: `products-${index}`,
      products: products.slice(index, index + 2),
    });

    if (index === 2 && products.length > 4) {
      rows.push({ type: 'banner', id: 'marketplace-banner-after-products' });
    }

    return rows;
  }, []);

  const renderProductRow = ({ item }: { item: ProductListRow }) => {
    if (item.type === 'banner') {
      return (
        <View style={styles.inlineBannerSlot}>
          <BannerCarousel section="marketplace" fallbackToHome={false} />
        </View>
      );
    }

    return (
      <View style={styles.productRow}>
        {item.products.map((product) => (
          <View key={product.id} style={[styles.productColumn, { width: productCardWidth }]}>
            {renderProductCard({ item: product })}
          </View>
        ))}
        {item.products.length === 1 && (
          <View style={[styles.productColumn, { width: productCardWidth }]} />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />

      <View style={styles.marketHeader}>
        <View style={styles.marketHeaderCopy}>
          <Text style={styles.marketTitle}>Market</Text>
          <Text style={styles.marketSubtitle} numberOfLines={1}>
            Compra, dona o intercambia cosas de bebé cerca de ti.
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('MarketplaceFavorites')}
          >
            <Ionicons name="heart-outline" size={19} color="#59C6C0" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={handleMyProducts}
          >
            <Ionicons name="list-outline" size={19} color="#59C6C0" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.publishHeaderButton} onPress={handleCreateProduct}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar carriola, ropa, juguetes..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => loadProducts()}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.actionButton, showFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <View style={styles.filterButtonContainer}>
            <Ionicons name="options" size={24} color={showFilters ? "#FF6B6B" : "#59C6C0"} />
            {hasActiveFilters && (
              <View style={styles.filterBadge} />
            )}
          </View>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : !products || products.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No encontramos productos con estos filtros</Text>
          <Text style={styles.emptySubtext}>Puedes limpiar la búsqueda o publicar algo para otras familias.</Text>
          <View style={styles.emptyActions}>
            <TouchableOpacity style={styles.emptySecondaryButton} onPress={clearFilters}>
              <Text style={styles.emptySecondaryButtonText}>Limpiar filtros</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.emptyPrimaryButton} onPress={handleCreateProduct}>
              <Text style={styles.emptyPrimaryButtonText}>Publicar producto</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <FlatList
          data={productRows}
          renderItem={renderProductRow}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsList}
          ListHeaderComponent={
            <View>
              {hasActiveFilters && (
                <View style={styles.activeFiltersBar}>
                  <Text style={styles.activeFiltersText} numberOfLines={1}>
                    {activeFilterSummary}
                  </Text>
                  <TouchableOpacity onPress={clearFilters}>
                    <Text style={styles.clearInlineText}>Limpiar</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.productsHeader}>
                <View>
                  <Text style={styles.productsHeaderTitle}>
                    {userCoords ? 'Cerca de ti' : 'Productos disponibles'}
                  </Text>
                  <Text style={styles.productsHeaderSubtitle}>
                    {userCoords
                      ? `${products.length} productos ordenados por cercanía.`
                      : 'Activa ubicación para ver productos cercanos primero.'}
                  </Text>
                </View>
                {!userCoords && (
                  <TouchableOpacity style={styles.locationPromptButton} onPress={() => loadProducts(true)}>
                    <Ionicons name="navigate-outline" size={15} color="#178A84" />
                    <Text style={styles.locationPromptText}>Ubicación</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          }
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
              {/* Filtro de Tipo */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Tipo de publicación</Text>
                <View style={styles.conditionOptions}>
                  {([
                    { id: 'all', label: 'Todo' },
                    { id: 'venta', label: 'Comprar' },
                    { id: 'donacion', label: 'Donar' },
                    { id: 'trueque', label: 'Trueque' },
                  ] as { id: MarketTypeFilter; label: string }[]).map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.conditionChip,
                        selectedType === option.id && styles.conditionChipActive,
                      ]}
                      onPress={() => handleTypeFilterSelect(option.id)}
                    >
                      <Text
                        style={[
                          styles.conditionChipText,
                          selectedType === option.id && styles.conditionChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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
                onPress={clearFilters}
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
    backgroundColor: '#F5F7FA',
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  marketHeaderCopy: {
    flex: 1,
    paddingRight: 12,
  },
  marketTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  marketSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 3,
    fontFamily: 'Montserrat',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  publishHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#59C6C0',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: 'white',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FA',
  },
  activeFiltersBar: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#526170',
    fontFamily: 'Montserrat',
  },
  clearInlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#178A84',
    fontFamily: 'Montserrat',
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
    paddingHorizontal: 30,
    paddingTop: 48,
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
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  emptySecondaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  emptySecondaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#178A84',
    fontFamily: 'Montserrat',
  },
  emptyPrimaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: '#59C6C0',
  },
  emptyPrimaryButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  productsList: {
    paddingHorizontal: MARKET_LIST_PADDING,
    paddingTop: 2,
    paddingBottom: 92,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productColumn: {
    flexShrink: 0,
  },
  inlineBannerSlot: {
    marginTop: 6,
    marginBottom: 14,
  },
  productsHeader: {
    width: '100%',
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  productsHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  productsHeaderSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
    fontFamily: 'Montserrat',
  },
  locationPromptButton: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 17,
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  locationPromptText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#178A84',
    fontFamily: 'Montserrat',
  },
  productCard: {
    width: '100%',
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 13,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E9EEF2',
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
    top: 7,
    left: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ventaBadge: {
    backgroundColor: '#2D3748',
  },
  donacionBadge: {
    backgroundColor: '#E84D8A',
  },
  truequeBadge: {
    backgroundColor: '#887CBC',
  },
  typeBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(45, 55, 72, 0.55)',
  },
  productInfo: {
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 10,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#333',
    fontFamily: 'Montserrat',
    lineHeight: 17,
    marginBottom: 7,
    minHeight: 34,
  },
  tradeFor: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 6,
  },
  conditionPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F5F7FA',
    marginBottom: 8,
  },
  conditionPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#526170',
    fontFamily: 'Montserrat',
  },
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 18,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#666',
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
