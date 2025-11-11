import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import marketplaceService, { MarketplaceProduct, CATEGORIES, CONDITIONS } from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { productId } = route.params;

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      console.log('🔍 [PRODUCT DETAIL] Cargando producto:', productId);
      
      const fetchedProduct = await marketplaceService.getProductById(productId);
      
      if (!fetchedProduct) {
        throw new Error('Producto no encontrado');
      }
      
      console.log('✅ [PRODUCT DETAIL] Producto cargado:', fetchedProduct.id);
      console.log('✅ [PRODUCT DETAIL] isFavorite:', fetchedProduct.isFavorite);
      
      setProduct(fetchedProduct);
      setIsFavorite(fetchedProduct?.isFavorite || false);
    } catch (error) {
      console.error('❌ [PRODUCT DETAIL] Error cargando producto:', error);
      Alert.alert('Error', 'No se pudo cargar el producto');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      if (isFavorite) {
        console.log('💔 [PRODUCT DETAIL] Quitando de favoritos');
        await marketplaceService.removeFromFavorites(productId);
        setIsFavorite(false);
        Alert.alert('Éxito', 'Eliminado de favoritos');
      } else {
        console.log('❤️ [PRODUCT DETAIL] Agregando a favoritos');
        await marketplaceService.addToFavorites(productId);
        setIsFavorite(true);
        Alert.alert('Éxito', 'Agregado a favoritos');
      }
    } catch (error) {
      console.error('❌ [PRODUCT DETAIL] Error con favorito:', error);
      const errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar favoritos';
      Alert.alert('Error', errorMessage);
    }
  };

  const handleContactSeller = async () => {
    if (!product) return;
    navigation.navigate('MarketplaceMessages', { productId: product.id, sellerId: product.userId });
  };

  const handleMarkAsSold = async () => {
    if (!product) return;

    Alert.alert(
      'Marcar como vendido',
      '¿Estás seguro de que quieres marcar este producto como vendido?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí, marcar',
          onPress: async () => {
            try {
              const status = product.type === 'venta' ? 'vendido' : 
                           product.type === 'donacion' ? 'donado' : 'intercambiado';
              await marketplaceService.updateProductStatus(productId, status);
              Alert.alert('Éxito', 'Producto actualizado');
              navigation.goBack();
            } catch (error) {
              console.error('Error actualizando estado:', error);
              Alert.alert('Error', 'No se pudo actualizar el producto');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    navigation.navigate('CreateProduct', { productId, product });
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que quieres eliminar este producto?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await marketplaceService.deleteProduct(productId);
              Alert.alert('Éxito', 'Producto eliminado');
              navigation.goBack();
            } catch (error) {
              console.error('Error eliminando producto:', error);
              Alert.alert('Error', 'No se pudo eliminar el producto');
            }
          },
        },
      ]
    );
  };

  const handleReport = () => {
    Alert.alert(
      'Reportar producto',
      'Selecciona el motivo',
      [
        {
          text: 'Contenido inapropiado',
          onPress: () => reportProduct('contenido_inapropiado', 'Contenido inapropiado'),
        },
        {
          text: 'Spam o fraude',
          onPress: () => reportProduct('spam', 'Spam o fraude'),
        },
        {
          text: 'Información falsa',
          onPress: () => reportProduct('informacion_falsa', 'Información falsa'),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const reportProduct = async (reason: string, description: string) => {
    try {
      await marketplaceService.reportProduct(productId, reason, description);
      Alert.alert('Gracias', 'Tu reporte ha sido enviado');
    } catch (error) {
      console.error('Error reportando:', error);
      Alert.alert('Error', 'No se pudo enviar el reporte');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = CATEGORIES.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getConditionName = (conditionId: string) => {
    const condition = CONDITIONS.find(c => c.id === conditionId);
    return condition?.name || conditionId;
  };

  if (loading || !product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59C6C0" />
      </View>
    );
  }

  const isOwner = user?.id === product.userId;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite ? '#FF6B6B' : 'white'}
            />
          </TouchableOpacity>
          {!isOwner && (
            <TouchableOpacity style={styles.headerButton} onPress={handleReport}>
              <Ionicons name="flag-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Galería de imágenes */}
        <View style={styles.imageGallery}>
          {product.photos && product.photos.length > 0 ? (
            <>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / width);
                  setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
              >
                {product.photos.map((photo, index) => (
                  <Image
                    key={index}
                    source={{ uri: photo }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              <View style={styles.imageIndicator}>
                <Text style={styles.imageIndicatorText}>
                  {currentImageIndex + 1} / {product.photos.length}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.noImageContainer}>
              <Ionicons name="image-outline" size={80} color="#ccc" />
            </View>
          )}
        </View>

        {/* Información del producto */}
        <View style={styles.infoSection}>
          {/* Badge de tipo */}
          <View style={[
            styles.typeBadge,
            product.type === 'venta' && styles.ventaBadge,
            product.type === 'donacion' && styles.donacionBadge,
            product.type === 'trueque' && styles.truequeBadge,
          ]}>
            <Text style={styles.typeBadgeText}>
              {product.type === 'venta' ? 'EN VENTA' : 
               product.type === 'donacion' ? 'DONACIÓN' : 'TRUEQUE'}
            </Text>
          </View>

          {/* Precio o información de trueque */}
          {product.type === 'venta' && product.price && (
            <Text style={styles.price}>${product.price.toLocaleString('es-MX')}</Text>
          )}
          {product.type === 'trueque' && product.tradeFor && (
            <View style={styles.tradeInfo}>
              <Ionicons name="swap-horizontal" size={20} color="#2196F3" />
              <Text style={styles.tradeText}>Busco a cambio: {product.tradeFor}</Text>
            </View>
          )}

          {/* Título */}
          <Text style={styles.title}>{product.title}</Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag" size={16} color="#666" />
              <Text style={styles.metaText}>{getCategoryName(product.category)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="checkmark-circle" size={16} color="#666" />
              <Text style={styles.metaText}>{getConditionName(product.condition)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye" size={16} color="#666" />
              <Text style={styles.metaText}>{product.views} vistas</Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Ubicación */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={20} color="#59C6C0" />
              <Text style={styles.locationText}>
                {product.location.city}, {product.location.state}
              </Text>
            </View>
          </View>

          {/* Información del vendedor */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendedor</Text>
            <View style={styles.sellerInfo}>
              {product.userPhoto ? (
                <Image source={{ uri: product.userPhoto }} style={styles.sellerPhoto} />
              ) : (
                <View style={styles.sellerPhotoPlaceholder}>
                  <Ionicons name="person" size={24} color="#666" />
                </View>
              )}
              <Text style={styles.sellerName}>{product.userName}</Text>
            </View>
          </View>

          {/* Publicado */}
          <Text style={styles.publishedDate}>
            Publicado el {new Date(product.publishedAt).toLocaleDateString('es-MX')}
          </Text>
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.actions}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Ionicons name="pencil" size={20} color="white" />
              <Text style={styles.buttonText}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.soldButton} onPress={handleMarkAsSold}>
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.buttonText}>Vendido</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.contactButton} onPress={handleContactSeller}>
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.contactButtonText}>Contactar vendedor</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  content: {
    flex: 1,
  },
  imageGallery: {
    width: width,
    height: width,
    backgroundColor: '#000',
  },
  productImage: {
    width: width,
    height: width,
  },
  noImageContainer: {
    width: width,
    height: width,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  imageIndicator: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  imageIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontFamily: 'Montserrat',
  },
  infoSection: {
    padding: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 12,
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
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  tradeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tradeText: {
    fontSize: 16,
    color: '#2196F3',
    fontFamily: 'Montserrat',
    fontWeight: '600',
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 22,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sellerPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  publishedDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 10,
  },
  actions: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  ownerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#59C6C0',
  },
  soldButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  deleteButton: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#59C6C0',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
});

export default ProductDetailScreen;

