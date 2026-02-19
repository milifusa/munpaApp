import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import vendorService from '../services/vendorService';
import analyticsService from '../services/analyticsService';

const VendorPromotionsScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [promotions, setPromotions] = useState<any[]>([]);

  useEffect(() => {
    analyticsService.logScreenView('vendor_promotions');
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const response = await vendorService.getPromotions();
      const promoData = response?.data || response || [];
      setPromotions(Array.isArray(promoData) ? promoData : []);
    } catch (error) {
      console.error('❌ [PROMOTIONS] Error cargando promociones:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPromotions();
  };

  const handleEditProduct = (productId: string, product: any) => {
    navigation.navigate('VendorCreateProduct', {
      productId,
      product,
    });
  };

  const calculateFinalPrice = (product: any) => {
    if (product.promoPrice) {
      return product.promoPrice;
    }
    if (product.discountPercentage) {
      return product.price - (product.price * product.discountPercentage / 100);
    }
    return product.price;
  };

  const calculateSavings = (product: any) => {
    return product.price - calculateFinalPrice(product);
  };

  const getDiscountBadge = (product: any) => {
    if (product.discountPercentage) {
      return `-${product.discountPercentage}%`;
    }
    if (product.promoPrice) {
      const savings = ((product.price - product.promoPrice) / product.price * 100).toFixed(0);
      return `-${savings}%`;
    }
    return 'OFERTA';
  };

  const isExpired = (validUntil: any) => {
    if (!validUntil) return false;
    const expiryDate = new Date(validUntil);
    return expiryDate < new Date();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#96d2d3" />
        <Text style={styles.loadingText}>Cargando promociones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#96d2d3"
            colors={['#96d2d3']}
          />
        }
      >
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#F59E0B" />
          <Text style={styles.infoText}>
            Aquí encontrarás todos tus productos con promociones activas. Edita los productos para modificar o eliminar promociones.
          </Text>
        </View>

        {/* Botón para crear descuentos */}
        <TouchableOpacity
          style={styles.createDiscountButton}
          onPress={() => navigation.navigate('VendorDiscounts')}
        >
          <Ionicons name="pricetag" size={20} color="#96d2d3" />
          <Text style={styles.createDiscountText}>Gestionar Códigos de Descuento</Text>
          <Ionicons name="chevron-forward" size={20} color="#96d2d3" />
        </TouchableOpacity>

        {/* Lista de promociones */}
        {promotions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No tienes promociones activas</Text>
            <Text style={styles.emptyStateText}>
              Los productos con descuento aparecerán aquí. Edita tus productos para agregar promociones.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('VendorCreateProduct')}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Crear Producto con Promoción</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((product) => {
            const expired = isExpired(product.promoValidUntil);
            const finalPrice = calculateFinalPrice(product);
            const savings = calculateSavings(product);

            return (
              <TouchableOpacity
                key={product.id}
                style={styles.promoCard}
                onPress={() => handleEditProduct(product.id, product)}
              >
                <View style={styles.promoHeader}>
                  {/* Badge de descuento */}
                  <View style={styles.discountBadge}>
                    <Ionicons name="flash" size={16} color="#FFFFFF" />
                    <Text style={styles.discountText}>{getDiscountBadge(product)}</Text>
                  </View>

                  {/* Estado de vigencia */}
                  {expired ? (
                    <View style={[styles.validityBadge, styles.expiredBadge]}>
                      <Text style={styles.expiredText}>Expirado</Text>
                    </View>
                  ) : (
                    <View style={[styles.validityBadge, styles.activeBadge]}>
                      <Text style={styles.activeText}>Activo</Text>
                    </View>
                  )}
                </View>

                <View style={styles.promoBody}>
                  {/* Imagen */}
                  {product.photos && product.photos.length > 0 ? (
                    <Image source={{ uri: product.photos[0] }} style={styles.promoImage} />
                  ) : (
                    <View style={styles.promoImagePlaceholder}>
                      <Ionicons name="image-outline" size={32} color="#D1D5DB" />
                    </View>
                  )}

                  {/* Info */}
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoTitle} numberOfLines={2}>
                      {product.title}
                    </Text>

                    {/* Etiqueta de promoción */}
                    {product.promoLabel && (
                      <View style={styles.promoLabelContainer}>
                        <Ionicons name="pricetag" size={14} color="#F59E0B" />
                        <Text style={styles.promoLabelText}>{product.promoLabel}</Text>
                      </View>
                    )}

                    {/* Precios */}
                    <View style={styles.priceRow}>
                      <Text style={styles.originalPrice}>${product.price.toFixed(2)}</Text>
                      <Ionicons name="arrow-forward" size={16} color="#6B7280" />
                      <Text style={styles.finalPrice}>${finalPrice.toFixed(2)}</Text>
                    </View>

                    <Text style={styles.savingsText}>Ahorras ${savings.toFixed(2)}</Text>

                    {/* Vigencia */}
                    <View style={styles.validityRow}>
                      <Ionicons name="calendar" size={14} color="#6B7280" />
                      <Text style={styles.validityText}>
                        {expired ? 'Expiró el ' : 'Válido hasta '}
                        {new Date(product.promoValidUntil).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Botón editar */}
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditProduct(product.id, product)}
                >
                  <Ionicons name="create" size={18} color="#FFFFFF" />
                  <Text style={styles.editButtonText}>Editar Producto</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  createDiscountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#96d2d3',
    gap: 12,
  },
  createDiscountText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#96d2d3',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  promoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  promoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  validityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  expiredBadge: {
    backgroundColor: '#FEE2E2',
  },
  activeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  promoBody: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  promoImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  promoImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoInfo: {
    flex: 1,
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  promoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  promoLabelText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  originalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  finalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  savingsText: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
    marginBottom: 8,
  },
  validityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  validityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default VendorPromotionsScreen;
