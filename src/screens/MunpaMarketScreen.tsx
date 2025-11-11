import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import marketplaceService, { MarketplaceProduct, CATEGORIES } from '../services/marketplaceService';

const MunpaMarketScreen = () => {
  const navigation = useNavigation<any>();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<'all' | 'venta' | 'donacion' | 'trueque'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadProducts();
  }, [selectedType, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('🛍️ [MARKET] Cargando productos con filtros:', {
        type: selectedType,
        category: selectedCategory,
        search: searchQuery,
      });
      
      const response = await marketplaceService.getProducts({
        type: selectedType,
        category: selectedCategory,
        search: searchQuery,
        status: 'disponible',
        orderBy: 'reciente',
        limit: 50,
      });
      
      console.log('🛍️ [MARKET] Respuesta completa:', JSON.stringify(response).substring(0, 200));
      console.log('🛍️ [MARKET] Productos recibidos:', response.products?.length || 0);
      console.log('🛍️ [MARKET] Primer producto:', response.products?.[0]);
      
      const fetchedProducts = response.products || response.data?.products || response.data || [];
      console.log('🛍️ [MARKET] Productos a mostrar:', fetchedProducts.length);
      
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    } catch (error) {
      console.error('❌ [MARKET] Error cargando productos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleProductPress = (product: MarketplaceProduct) => {
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
              <Ionicons name={getCategoryIcon(item.category)} size={40} color="#ccc" />
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
              ${item.price.toLocaleString('es-MX')}
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
              <Text style={styles.metaText}>{item.location.city}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={12} color="#666" />
              <Text style={styles.metaText}>{item.views}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      
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
      </View>

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
    paddingVertical: 10,
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
    maxHeight: 70,
  },
  typeFiltersContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
    alignItems: 'center',
  },
  typeFilterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  typeFilterButtonActive: {
    backgroundColor: '#59C6C0',
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
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#59C6C0',
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

