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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import marketplaceService, { MarketplaceProduct, CATEGORIES, CONDITIONS } from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';
import { shareContentHelper } from '../utils/shareContentHelper';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
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

    const statusText = product.type === 'venta' ? 'vendido' : 
                      product.type === 'donacion' ? 'donado' : 'intercambiado';
    const statusTitle = product.type === 'venta' ? 'Marcar como vendido' : 
                        product.type === 'donacion' ? 'Marcar como donado' : 'Marcar como intercambiado';
    const statusQuestion = product.type === 'venta' ? '¿Estás seguro de que quieres marcar este producto como vendido?' : 
                          product.type === 'donacion' ? '¿Estás seguro de que quieres marcar este producto como donado?' : 
                          '¿Estás seguro de que quieres marcar este producto como intercambiado?';

    Alert.alert(
      statusTitle,
      statusQuestion,
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
              Alert.alert('Éxito', `Producto marcado como ${statusText}`);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.3)" translucent />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 6) }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={() => shareContentHelper.shareProduct(productId)}
          >
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
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

          {/* Precio o información de trueque/donación */}
          {product.type === 'venta' && product.price && (
            <Text style={styles.price}>${product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          )}
          {product.type === 'donacion' && (
            <View style={styles.donationInfo}>
              <View style={styles.donationHeader}>
                <Ionicons name="heart" size={24} color="#FF6B6B" />
                <Text style={styles.donationTitle}>Donación Gratuita</Text>
              </View>
              <Text style={styles.donationSubtitle}>
                Este producto se está donando de forma gratuita
              </Text>
            </View>
          )}
          {product.type === 'trueque' && product.tradeFor && (
            <View style={styles.tradeInfo}>
              <View style={styles.tradeHeader}>
                <Ionicons name="swap-horizontal" size={24} color="#2196F3" />
                <Text style={styles.tradeTitle}>Intercambio</Text>
              </View>
              <View style={styles.tradeContent}>
                <Text style={styles.tradeLabel}>Busco a cambio:</Text>
                <Text style={styles.tradeText}>{product.tradeFor}</Text>
              </View>
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

          {/* Información especial para donaciones */}
          {product.type === 'donacion' && (
            <View style={styles.coordinationSection}>
              <View style={styles.coordinationHeader}>
                <Ionicons name="calendar" size={20} color="#59C6C0" />
                <Text style={styles.coordinationTitle}>¿Cómo coordinar la donación?</Text>
              </View>
              <View style={styles.coordinationSteps}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Contacta al donante para coordinar</Text>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Acuerda lugar y horario de entrega</Text>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Recoge el producto en el lugar acordado</Text>
                </View>
              </View>
              <View style={styles.coordinationNote}>
                <Ionicons name="information-circle" size={16} color="#FFA500" />
                <Text style={styles.coordinationNoteText}>
                  Recuerda ser puntual y respetuoso con el donante
                </Text>
              </View>
            </View>
          )}

          {/* Información especial para trueque */}
          {product.type === 'trueque' && (
            <View style={styles.coordinationSection}>
              <View style={styles.coordinationHeader}>
                <Ionicons name="handshake" size={20} color="#2196F3" />
                <Text style={styles.coordinationTitle}>¿Cómo coordinar el intercambio?</Text>
              </View>
              <View style={styles.coordinationSteps}>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>1</Text>
                  </View>
                  <Text style={styles.stepText}>Contacta al vendedor para negociar</Text>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>2</Text>
                  </View>
                  <Text style={styles.stepText}>Acuerda el intercambio y condiciones</Text>
                </View>
                <View style={styles.step}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>3</Text>
                  </View>
                  <Text style={styles.stepText}>Coordina lugar y horario de encuentro</Text>
                </View>
              </View>
              <View style={styles.coordinationNote}>
                <Ionicons name="information-circle" size={16} color="#FFA500" />
                <Text style={styles.coordinationNoteText}>
                  Asegúrate de que ambos productos estén en buen estado antes del intercambio
                </Text>
              </View>
            </View>
          )}

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
              <Text style={styles.sellerName}>
                {product.userName && product.userName !== 'Usuario' 
                  ? product.userName 
                  : 'Nombre no disponible'}
              </Text>
            </View>
          </View>

          {/* Publicado */}
          {product.publishedAt && (
            <Text style={styles.publishedDate}>
              Publicado el {(() => {
                try {
                  const date = new Date(product.publishedAt);
                  if (isNaN(date.getTime())) {
                    return 'fecha no disponible';
                  }
                  return date.toLocaleDateString('es-MX');
                } catch (error) {
                  return 'fecha no disponible';
                }
              })()}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Botones de acción */}
      <View style={styles.actions}>
        {isOwner ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity 
              style={styles.messagesButton} 
              onPress={() => navigation.navigate('ProductConversations', { productId: product.id, productTitle: product.title })}
            >
              <Ionicons name="chatbubble" size={20} color="white" />
              <Text style={styles.buttonText}>
                Mensajes {product.messages > 0 && `(${product.messages})`}
              </Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <Ionicons name="pencil" size={20} color="white" />
                <Text style={styles.buttonText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.soldButton} onPress={handleMarkAsSold}>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.buttonText}>
                  {product.type === 'donacion' ? 'Donado' : 
                   product.type === 'trueque' ? 'Intercambiado' : 
                   'Vendido'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                <Ionicons name="trash" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity 
            style={[
              styles.contactButton,
              product.type === 'donacion' && styles.donationButton,
              product.type === 'trueque' && styles.tradeButton,
            ]} 
            onPress={handleContactSeller}
          >
            <Ionicons 
              name={
                product.type === 'donacion' ? 'heart' : 
                product.type === 'trueque' ? 'swap-horizontal' : 
                'chatbubble'
              } 
              size={20} 
              color="white" 
            />
            <Text style={styles.contactButtonText}>
              {product.type === 'donacion' ? 'Contactar donante' : 
               product.type === 'trueque' ? 'Contactar para intercambio' : 
               'Contactar vendedor'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
  donationInfo: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  donationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  donationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontFamily: 'Montserrat',
  },
  donationSubtitle: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  tradeInfo: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  tradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  tradeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
    fontFamily: 'Montserrat',
  },
  tradeContent: {
    gap: 4,
  },
  tradeLabel: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  tradeText: {
    fontSize: 16,
    color: '#2196F3',
    fontFamily: 'Montserrat',
    fontWeight: '600',
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
  coordinationSection: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  coordinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  coordinationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  coordinationSteps: {
    gap: 12,
    marginBottom: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    flex: 1,
    paddingTop: 4,
  },
  coordinationNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFF9E6',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA500',
  },
  coordinationNoteText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    lineHeight: 18,
    flex: 1,
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
    flexDirection: 'column',
    gap: 10,
    width: '100%',
  },
  messagesButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
    minWidth: 0,
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
    minWidth: 0,
  },
  deleteButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#96d2d3',
  },
  donationButton: {
    backgroundColor: '#FF6B6B',
  },
  tradeButton: {
    backgroundColor: '#2196F3',
  },
  contactButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
});

export default ProductDetailScreen;

