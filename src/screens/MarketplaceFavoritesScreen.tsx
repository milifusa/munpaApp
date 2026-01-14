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
import { shareContentHelper } from '../utils/shareContentHelper';

const MarketplaceFavoritesScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [favorites, setFavorites] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      console.log('❤️ [FAVORITES] Cargando favoritos...');
      const fetchedFavorites = await marketplaceService.getFavorites();
      console.log('✅ [FAVORITES] Favoritos cargados:', fetchedFavorites?.length || 0);
      console.log('📦 [FAVORITES] Primer favorito:', fetchedFavorites?.[0]);
      setFavorites(Array.isArray(fetchedFavorites) ? fetchedFavorites : []);
    } catch (error) {
      console.error('❌ [FAVORITES] Error cargando favoritos:', error);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleProductPress = (product: MarketplaceProduct) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  const renderProductCard = ({ item }: { item: MarketplaceProduct }) => {
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(item)}
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
          
          {/* Badge de tipo */}
          <View style={[
            styles.typeBadge,
            item.type === 'venta' && styles.ventaBadge,
            item.type === 'donacion' && styles.donacionBadge,
            item.type === 'trueque' && styles.truequeBadge,
          ]}>
            <Text style={styles.typeBadgeText}>
              {item.type === 'venta' ? 'VENTA' : 
               item.type === 'donacion' ? 'DONACIÓN' : 'TRUEQUE'}
            </Text>
          </View>
        </View>

        {/* Info */}
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

          <View style={styles.metaRow}>
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
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Favoritos</Text>
        <TouchableOpacity onPress={() => shareContentHelper.shareMarketplaceFavorites()}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando favoritos...</Text>
        </View>
      ) : favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No tienes favoritos</Text>
          <Text style={styles.emptySubtext}>
            Agrega productos a favoritos para verlos aquí
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate('MunpaMarket')}
          >
            <Text style={styles.browseButtonText}>Explorar productos</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          renderItem={renderProductCard}
          keyExtractor={(item) => item.id}
          numColumns={2}
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
    backgroundColor: '#96d2d3',
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
    marginBottom: 30,
  },
  browseButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  listContent: {
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
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 150,
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
  metaRow: {
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
});

export default MarketplaceFavoritesScreen;

