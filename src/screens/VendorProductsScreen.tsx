import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';

type ProductStatus = 'available' | 'reserved' | 'sold' | 'donated' | 'traded' | 'deleted';
type FilterTab = 'all' | 'available' | 'sold';

const VendorProductsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('available');

  useEffect(() => {
    analyticsService.logScreenView('vendor_products');
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProducts();
    }, [])
  );

  const loadProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 [VENDOR PRODUCTS] Cargando mis productos...');

      // Cargar TODOS los productos para mostrar conteos correctos en los tabs
      const response = await axiosInstance.get('/api/vendor/products', {
        params: {
          page: 1,
          limit: 100,
        },
      });

      console.log('✅ [VENDOR PRODUCTS] Productos obtenidos:', response.data);
      
      const productsData = response.data?.data || response.data?.products || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      
      setProducts(productsList);
      console.log(`📊 [VENDOR PRODUCTS] ${productsList.length} productos cargados`);
    } catch (error) {
      console.error('❌ [VENDOR PRODUCTS] Error cargando productos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case 'available':
        return products.filter(p => 
          p.status === 'disponible' || p.status === 'available'
        );
      case 'sold':
        return products.filter(p => 
          p.status === 'vendido' || p.status === 'sold' || 
          p.status === 'donated' || p.status === 'traded'
        );
      case 'all':
      default:
        return products;
    }
  };

  const getCountForTab = (tabKey: FilterTab) => {
    switch (tabKey) {
      case 'all':
        return products.length;
      case 'available':
        return products.filter(p => 
          p.status === 'disponible' || p.status === 'available'
        ).length;
      case 'sold':
        return products.filter(p => 
          p.status === 'vendido' || p.status === 'sold' ||
          p.status === 'donated' || p.status === 'traded'
        ).length;
      default:
        return products.length;
    }
  };

  const getStatusColor = (status: any) => {
    const s = status?.toLowerCase?.() || status;
    switch (s) {
      case 'available':
      case 'disponible': return '#10B981';
      case 'reserved': return '#F59E0B';
      case 'sold':
      case 'vendido': return '#6B7280';
      case 'donated': return '#3B82F6';
      case 'traded': return '#887CBC';
      case 'deleted': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: any) => {
    const s = status?.toLowerCase?.() || status;
    switch (s) {
      case 'available':
      case 'disponible': return 'Disponible';
      case 'reserved': return 'Reservado';
      case 'sold':
      case 'vendido': return 'Vendido';
      case 'donated': return 'Donado';
      case 'traded': return 'Intercambiado';
      case 'deleted': return 'Eliminado';
      default: return status || 'Sin estado';
    }
  };

  const handleChangeStatus = (product: any) => {
    const options = [
      { text: 'Marcar como Vendido', value: 'sold' },
      { text: 'Marcar como Reservado', value: 'reserved' },
      { text: 'Volver a Disponible', value: 'available' },
      { text: 'Cancelar', style: 'cancel' },
    ];

    Alert.alert(
      'Cambiar Estado',
      `¿Qué deseas hacer con "${product.title}"?`,
      options.map(opt => ({
        text: opt.text,
        style: opt.style as any,
        onPress: opt.value ? () => updateStatus(product.id, opt.value) : undefined,
      }))
    );
  };

  const updateStatus = async (productId: string, status: string) => {
    try {
      console.log('🔄 [VENDOR PRODUCTS] Actualizando estado:', productId, status);
      
      await axiosInstance.patch(`/api/vendor/products/${productId}/status`, {
        status,
      });

      analyticsService.logEvent('vendor_product_status_updated', {
        product_id: productId,
        new_status: status,
      });

      Alert.alert('Éxito', 'Estado actualizado correctamente');
      await loadProducts();
    } catch (error) {
      console.error('❌ [VENDOR PRODUCTS] Error actualizando estado:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const handleDeleteProduct = (product: any) => {
    Alert.alert(
      'Eliminar Producto',
      `¿Estás seguro que deseas eliminar "${product.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await axiosInstance.delete(`/api/vendor/products/${product.id}`);
              
              analyticsService.logEvent('vendor_product_deleted', {
                product_id: product.id,
              });

              Alert.alert('Éxito', 'Producto eliminado');
              await loadProducts();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: any }) => {
    const hasPhotos = item.photos && item.photos.length > 0;
    const mainPhoto = hasPhotos ? item.photos[0] : null;
    const hasPromotion = item.promoPrice || item.discountPercentage;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      >
        {/* Imagen */}
        <View style={styles.imageContainer}>
          {mainPhoto ? (
            <Image source={{ uri: mainPhoto }} style={styles.productImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#D1D5DB" />
            </View>
          )}
          
          {/* Badge de estado */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
          </View>

          {/* Badge de promoción */}
          {hasPromotion && item.status === 'disponible' && (
            <View style={styles.promoBadge}>
              <Ionicons name="flash" size={12} color="#FFFFFF" />
              <Text style={styles.promoBadgeText}>
                {item.discountPercentage 
                  ? `-${item.discountPercentage}%` 
                  : item.promoLabel || 'OFERTA'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>
          
          {/* Precio con promoción */}
          <View style={styles.priceContainer}>
            {hasPromotion ? (
              <>
                <Text style={styles.productPriceOriginal}>${item.price}</Text>
                <Text style={styles.productPrice}>
                  $
                  {item.promoPrice || 
                   (item.price - (item.price * item.discountPercentage / 100)).toFixed(2)}
                </Text>
              </>
            ) : (
              <Text style={styles.productPrice}>${item.price}</Text>
            )}
          </View>

          <View style={styles.productStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color="#6B7280" />
              <Text style={styles.statText}>{item.views || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#6B7280" />
              <Text style={styles.statText}>{item.favorites || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={14} color="#6B7280" />
              <Text style={styles.statText}>{item.messages || 0}</Text>
            </View>
          </View>
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('VendorCreateProduct', { 
                productId: item.id,
                product: item 
              });
            }}
          >
            <Ionicons name="create" size={18} color="#3B82F6" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleChangeStatus(item);
            }}
          >
            <Ionicons name="swap-horizontal" size={18} color="#F59E0B" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteProduct(item);
            }}
          >
            <Ionicons name="trash" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      {/* Tabs de filtro */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'all', label: 'Todos', icon: 'grid' },
          { key: 'available', label: 'Disponibles', icon: 'checkmark-circle' },
          { key: 'sold', label: 'Vendidos', icon: 'cash' },
        ].map((tab) => {
          const count = getCountForTab(tab.key as FilterTab);
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(tab.key as FilterTab)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={activeTab === tab.key ? '#96d2d3' : '#6B7280'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.key && styles.tabTextActive,
              ]}>
                {tab.label}
              </Text>
              {activeTab === tab.key && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#96d2d3" />
          <Text style={styles.loadingText}>Cargando productos...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>
            {activeTab === 'available' && 'No tienes productos disponibles'}
            {activeTab === 'sold' && 'No has vendido productos aún'}
            {activeTab === 'all' && 'No tienes productos publicados'}
          </Text>
          <Text style={styles.emptyStateText}>
            Publica tu primer producto en el marketplace
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('VendorCreateProduct')}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.createButtonText}>Publicar Producto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#96d2d3"
              colors={['#96d2d3']}
            />
          }
        />
      )}

      {/* Botón flotante para crear */}
      {!loading && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('VendorCreateProduct')}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#D1F2F2',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#96d2d3',
  },
  tabBadge: {
    backgroundColor: '#96d2d3',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  list: {
    padding: 12,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productInfo: {
    padding: 12,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
    minHeight: 36,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  productPriceOriginal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  promoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  promoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  productStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});

export default VendorProductsScreen;
