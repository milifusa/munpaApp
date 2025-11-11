import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import marketplaceService, { MarketplaceProduct } from '../services/marketplaceService';

const MyProductsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'disponible' | 'vendido'>('all');

  useEffect(() => {
    loadMyProducts();
  }, []);

  const loadMyProducts = async () => {
    try {
      setLoading(true);
      console.log('📦 [MY PRODUCTS] Cargando mis productos...');
      const fetchedProducts = await marketplaceService.getMyProducts();
      console.log('✅ [MY PRODUCTS] Productos cargados:', fetchedProducts?.length || 0);
      setProducts(Array.isArray(fetchedProducts) ? fetchedProducts : []);
    } catch (error) {
      console.error('❌ [MY PRODUCTS] Error cargando mis productos:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMyProducts();
    setRefreshing(false);
  };

  const getFilteredProducts = () => {
    if (filter === 'all') return products;
    if (filter === 'disponible') {
      return products.filter(p => p.status === 'disponible');
    }
    return products.filter(p => ['vendido', 'donado', 'intercambiado'].includes(p.status));
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponible': return 'Disponible';
      case 'vendido': return 'Vendido';
      case 'donado': return 'Donado';
      case 'intercambiado': return 'Intercambiado';
      case 'reservado': return 'Reservado';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible': return '#4CAF50';
      case 'vendido':
      case 'donado':
      case 'intercambiado': return '#666';
      case 'reservado': return '#FF9800';
      default: return '#666';
    }
  };

  const renderProductCard = ({ item }: { item: MarketplaceProduct }) => {
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        activeOpacity={0.7}
      >
        {/* Imagen */}
        <View style={styles.imageContainer}>
          {item.photos && item.photos.length > 0 ? (
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={40} color="#ccc" />
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {item.type === 'venta' && item.price && (
            <Text style={styles.productPrice}>
              ${item.price.toLocaleString('es-MX')}
            </Text>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color="#666" />
              <Text style={styles.statText}>{item.views}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="#666" />
              <Text style={styles.statText}>{item.favorites}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={14} color="#666" />
              <Text style={styles.statText}>{item.messages}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 15) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Publicaciones</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filtros */}
      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'disponible' && styles.filterButtonActive]}
          onPress={() => setFilter('disponible')}
        >
          <Text style={[styles.filterText, filter === 'disponible' && styles.filterTextActive]}>
            Activas ({products.filter(p => p.status === 'disponible').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, filter === 'vendido' && styles.filterButtonActive]}
          onPress={() => setFilter('vendido')}
        >
          <Text style={[styles.filterText, filter === 'vendido' && styles.filterTextActive]}>
            Vendidas ({products.filter(p => ['vendido', 'donado', 'intercambiado'].includes(p.status)).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'all' 
              ? 'No tienes productos publicados'
              : filter === 'disponible'
              ? 'No tienes productos activos'
              : 'No has vendido productos aún'}
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('CreateProduct')}
          >
            <Text style={styles.createButtonText}>Publicar producto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#59C6C0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 15,
    backgroundColor: 'white',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#59C6C0',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  filterTextActive: {
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
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  createButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#59C6C0',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  listContent: {
    padding: 15,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 15,
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
  imageContainer: {
    width: 120,
    height: 120,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
});

export default MyProductsScreen;

