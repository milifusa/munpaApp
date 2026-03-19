import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

interface Product {
  id: string;
  title: string;
  price?: number;
  currency?: string;
  imageUrls?: string[];
  categoryName?: string;
  discountPercentage?: number;
  promoPrice?: number;
}

interface Section {
  title: string;
  data: Product[];
}

const normalize = (p: any, overrideCategory?: string): Product => ({
  ...p,
  imageUrls: p.imageUrls || p.photos || (p.imageUrl ? [p.imageUrl] : []),
  categoryName:
    overrideCategory ||
    p.categoryName ||
    p.category?.name ||
    p.vendorCategoryName ||
    p.vendor_category_name ||
    'Sin categoría',
});

const RecommendationProductsScreen = ({ route, navigation }: any) => {
  const {
    recommendationId,
    recommendationName,
    preloadedProducts,
    filterCategoryName,
  } = route.params;
  const insets = useSafeAreaInsets();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (Array.isArray(preloadedProducts) && preloadedProducts.length > 0) {
      setAllProducts(preloadedProducts.map(p => normalize(p, filterCategoryName)));
      setLoading(false);
    } else {
      loadProducts();
    }
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.getRecommendationProducts(recommendationId, { limit: 200 });
      let data: any[] = [];

      if (Array.isArray(response)) data = response;
      else if (response?.products) data = response.products;
      else if (response?.data?.products) data = response.data.products;
      else if (Array.isArray(response?.data)) data = response.data;

      setAllProducts(data.map(p => normalize(p, filterCategoryName)));
    } catch (error) {
      console.error('❌ [REC PRODUCTS] Error:', error);
      setAllProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const sections: Section[] = useCallback(() => {
    const q = search.trim().toLowerCase();
    const data = q
      ? allProducts.filter(p => p.title?.toLowerCase().includes(q))
      : allProducts;

    const map = new Map<string, Product[]>();
    for (const p of data) {
      const cat = p.categoryName || 'Sin categoría';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'Sin categoría') return 1;
        if (b === 'Sin categoría') return -1;
        return a.localeCompare(b);
      })
      .map(([title, data]) => ({ title, data }));
  }, [allProducts, search])();

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
      activeOpacity={0.85}
    >
      <View style={styles.productImageWrap}>
        {item.imageUrls?.[0] ? (
          <Image source={{ uri: item.imageUrls[0] }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="cube-outline" size={28} color="#9CA3AF" />
          </View>
        )}
        {(item.discountPercentage ?? 0) > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountBadgeText}>-{item.discountPercentage}%</Text>
          </View>
        )}
      </View>

      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        {item.price != null && (
          <View style={styles.priceRow}>
            {(item.promoPrice ?? 0) > 0 ? (
              <>
                <Text style={styles.productPricePromo}>
                  {item.currency || '$'}{Number(item.promoPrice).toLocaleString()}
                </Text>
                <Text style={styles.productPriceOriginal}>
                  {item.currency || '$'}{Number(item.price).toLocaleString()}
                </Text>
              </>
            ) : (
              <Text style={styles.productPrice}>
                {item.currency || '$'}{Number(item.price).toLocaleString()}
              </Text>
            )}
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
      <View style={styles.sectionCount}>
        <Text style={styles.sectionCountText}>{section.data.length}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {filterCategoryName || recommendationName || 'Productos'}
            </Text>
            {!loading && (
              <Text style={styles.headerSub}>{allProducts.length} productos</Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar productos..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Sin productos</Text>
          <Text style={styles.emptyText}>
            {search ? 'No se encontraron resultados' : 'Este comercio aún no tiene productos'}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  header: {
    backgroundColor: '#59C6C0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    gap: 12, paddingHorizontal: 40,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F7FA',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionCountText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginVertical: 5,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  productImageWrap: { position: 'relative' },
  productImage: { width: 64, height: 64, borderRadius: 10, resizeMode: 'cover' },
  productImagePlaceholder: {
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  discountBadge: {
    position: 'absolute', top: 4, left: 4,
    backgroundColor: '#EF4444', borderRadius: 6,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },
  productInfo: { flex: 1 },
  productTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937', lineHeight: 20 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#59C6C0' },
  productPricePromo: { fontSize: 14, fontWeight: '700', color: '#EF4444' },
  productPriceOriginal: {
    fontSize: 12, fontWeight: '500', color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
});

export default RecommendationProductsScreen;
