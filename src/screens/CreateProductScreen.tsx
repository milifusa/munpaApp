import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
// Importar expo-maps según la documentación oficial
import { AppleMaps, GoogleMaps } from 'expo-maps';
import marketplaceService, { CONDITIONS, CreateProductData, MarketplaceCategory, DEFAULT_CATEGORIES } from '../services/marketplaceService';
import { imageUploadService } from '../services/imageUploadService';

const CreateProductScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { product, productId } = route.params || {};
  const isEditing = !!productId;

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [categories, setCategories] = useState<MarketplaceCategory[]>(DEFAULT_CATEGORIES);
  const [locationLoading, setLocationLoading] = useState(true);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapLocation, setMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapZoom, setMapZoom] = useState(15);
  const [mapKey, setMapKey] = useState(0); // Key para forzar re-render del mapa
  
  // Datos del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [type, setType] = useState<'venta' | 'donacion' | 'trueque'>('venta');
  const [price, setPrice] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Ubicación con coordenadas
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📍 [CREATE PRODUCT] Obteniendo ubicación del usuario...');
      
      // Solicitar permisos
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso de ubicación requerido',
          'Necesitamos tu ubicación para publicar el producto. Por favor, permite el acceso a la ubicación en la configuración de la app.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configuración', onPress: () => Location.requestForegroundPermissionsAsync() },
          ]
        );
        setLocationLoading(false);
        return;
      }

      // Verificar si los servicios de ubicación están habilitados
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        Alert.alert(
          'GPS desactivado',
          'Por favor, activa el GPS en la configuración de tu dispositivo.',
          [{ text: 'OK' }]
        );
        setLocationLoading(false);
        return;
      }

      // Obtener ubicación actual con alta precisión
      console.log('📍 [CREATE PRODUCT] Solicitando ubicación con alta precisión...');
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude, accuracy } = currentLocation.coords;
      console.log('✅ [CREATE PRODUCT] Ubicación obtenida:', { 
        latitude, 
        longitude, 
        accuracy: accuracy ? `${accuracy}m` : 'desconocida',
      });

      // Procesar la ubicación directamente sin validación
      await processLocation(latitude, longitude);
    } catch (error: any) {
      console.error('❌ [CREATE PRODUCT] Error obteniendo ubicación:', error);
      
      let errorMessage = 'No se pudo obtener tu ubicación.';
      if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
        errorMessage = 'El GPS está desactivado. Por favor, actívalo en la configuración.';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'La ubicación no está disponible. Verifica que el GPS esté activado y tengas señal.';
      } else if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Tiempo de espera agotado. Intenta nuevamente.';
      }

      Alert.alert(
        'Error de ubicación',
        errorMessage,
        [
          { text: 'Reintentar', onPress: () => getCurrentLocation() },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } finally {
      setLocationLoading(false);
    }
  };

  const processLocation = async (latitude: number, longitude: number) => {
    try {
      // Intentar obtener dirección (geocodificación inversa)
      console.log('🔄 [CREATE PRODUCT] Obteniendo dirección...');
      const [addressResult] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addressResult) {
        const address = [
          addressResult.street,
          addressResult.streetNumber,
          addressResult.district,
          addressResult.name,
        ]
          .filter(Boolean)
          .join(', ');

        const country = addressResult.country || 'México';
        console.log('✅ [CREATE PRODUCT] Dirección obtenida:', {
          address,
          city: addressResult.city || addressResult.district,
          state: addressResult.region,
          country,
        });

        setLocation({
          latitude,
          longitude,
          address: address || undefined,
          city: addressResult.city || addressResult.district || undefined,
          state: addressResult.region || undefined,
          country: country,
        });
      } else {
        console.warn('⚠️ [CREATE PRODUCT] No se pudo obtener dirección, usando solo coordenadas');
        setLocation({
          latitude,
          longitude,
          country: 'México',
        });
      }
    } catch (geocodeError) {
      console.warn('⚠️ [CREATE PRODUCT] Error en geocodificación inversa:', geocodeError);
      setLocation({
        latitude,
        longitude,
        country: 'México',
      });
    }
  };


  useEffect(() => {
    loadCategories();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (isEditing && product) {
      // Cargar datos del producto para editar
      setTitle(product.title || '');
      setDescription(product.description || '');
      setCategory(product.category || '');
      setCondition(product.condition || '');
      setType(product.type || 'venta');
      setPrice(product.price?.toString() || '');
      setTradeFor(product.tradeFor || '');
      setPhotos(product.photos || []);
      
      // Cargar ubicación del producto (si tiene coordenadas, usarlas; si no, obtener ubicación actual)
      if (product.location?.latitude && product.location?.longitude) {
        setLocation({
          latitude: product.location.latitude,
          longitude: product.location.longitude,
          address: product.location.address,
          city: product.location.city,
          state: product.location.state,
          country: product.location.country || 'México',
        });
      } else {
        // Si el producto antiguo no tiene coordenadas, obtener ubicación actual
        getCurrentLocation();
      }
    }
  }, [isEditing, product]);

  // Ocultar loading cuando el modal se abre y el mapa se renderiza
  useEffect(() => {
    if (showMapModal && mapLocation) {
      console.log('⏱️ [MAP] Modal abierto, ocultando loading después de 1 segundo');
      // En iOS no hay onMapLoaded, así que ocultamos el loading después de un breve delay
      const timeoutId = setTimeout(() => {
        console.log('✅ [MAP] Ocultando loading (iOS no tiene onMapLoaded)');
        setMapLoaded(true);
      }, 1000); // 1 segundo es suficiente para que el mapa comience a renderizarse

      return () => {
        console.log('🧹 [MAP] Limpiando timeout');
        clearTimeout(timeoutId);
      };
    }
  }, [showMapModal, mapLocation]);

  const loadCategories = async () => {
    try {
      const fetchedCategories = await marketplaceService.getCategories(true);
      
      // Actualizar solo si son diferentes a las por defecto o si hay más datos
      if (fetchedCategories && fetchedCategories.length > 0) {
        setCategories(fetchedCategories);
        console.log('✅ [CREATE PRODUCT] Categorías actualizadas en estado');
      }
    } catch (error) {
      console.error('❌ [CREATE PRODUCT] Error cargando categorías:', error);
      // Mantener las categorías por defecto en caso de error
    }
  };

  const handlePickImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes subir máximo 5 fotos');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets) {
        setUploadingImages(true);
        
        const uploadPromises = result.assets.map(async (asset) => {
          const uploadedUrl = await imageUploadService.uploadMarketplaceImage(asset.uri);
          return uploadedUrl;
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        setPhotos([...photos, ...uploadedUrls]);
        setUploadingImages(false);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      setUploadingImages(false);
      Alert.alert('Error', 'No se pudieron cargar las imágenes');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return false;
    }
    if (title.length < 10 || title.length > 100) {
      Alert.alert('Error', 'El título debe tener entre 10 y 100 caracteres');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria');
      return false;
    }
    if (description.length < 20 || description.length > 1000) {
      Alert.alert('Error', 'La descripción debe tener entre 20 y 1000 caracteres');
      return false;
    }
    if (!category) {
      Alert.alert('Error', 'Selecciona una categoría');
      return false;
    }
    if (!condition) {
      Alert.alert('Error', 'Selecciona el estado del producto');
      return false;
    }
    if (type === 'venta' && (!price || parseFloat(price) <= 0)) {
      Alert.alert('Error', 'El precio debe ser mayor a 0');
      return false;
    }
    if (type === 'trueque' && !tradeFor.trim()) {
      Alert.alert('Error', 'Especifica qué buscas a cambio');
      return false;
    }
    if (photos.length === 0) {
      Alert.alert('Error', 'Agrega al menos una foto');
      return false;
    }
    if (!location || !location.latitude || !location.longitude) {
      Alert.alert('Error', 'No se pudo obtener tu ubicación. Por favor, verifica que el GPS esté activado.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Alerta informativa para donaciones (solo al crear, no al editar)
    if (type === 'donacion' && !isEditing) {
      return new Promise<void>((resolve) => {
        Alert.alert(
          '💝 ¡Importante sobre las donaciones!',
          'Las donaciones deben ser productos que aún estén en buen estado y que puedan ser útiles para otras familias.\n\n' +
          'Por favor, asegúrate de que el artículo que estás donando:\n' +
          '• Esté en condiciones de uso\n' +
          '• Sea seguro para bebés y niños\n' +
          '• Esté limpio y en buen estado\n\n' +
          '¡Gracias por contribuir a la economía circular! 🌱',
          [
            {
              text: 'Cancelar',
              style: 'cancel',
              onPress: () => resolve(),
            },
            {
              text: 'Entendido, continuar',
              onPress: async () => {
                await proceedWithSubmit();
                resolve();
              },
            },
          ],
          { cancelable: true }
        );
      });
    }

    await proceedWithSubmit();
  };

  const proceedWithSubmit = async () => {
    try {
      setLoading(true);

      if (!location) {
        Alert.alert('Error', 'No se pudo obtener tu ubicación');
        setLoading(false);
        return;
      }

      // Validar que la categoría seleccionada existe
      const selectedCategoryObj = categories.find(cat => cat.slug === category || cat.id === category);
      if (!selectedCategoryObj) {
        Alert.alert('Error', 'La categoría seleccionada no es válida. Por favor, selecciona otra categoría.');
        setLoading(false);
        return;
      }

      // Intentar primero con slug, si no existe usar id
      // El backend puede esperar slug o id dependiendo de la implementación
      let categoryToSend = selectedCategoryObj.slug || selectedCategoryObj.id;
      
      // Si el slug está vacío o es igual al id, usar el id directamente
      if (!selectedCategoryObj.slug || selectedCategoryObj.slug === selectedCategoryObj.id) {
        categoryToSend = selectedCategoryObj.id;
      }

      const productData: CreateProductData = {
        title: title.trim(),
        description: description.trim(),
        category: categoryToSend,
        condition,
        type,
        photos,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country || 'México',
        },
      };

      if (type === 'venta') {
        productData.price = parseFloat(price);
      } else if (type === 'trueque') {
        productData.tradeFor = tradeFor.trim();
      }

      console.log('📤 [CREATE PRODUCT] Enviando datos:', {
        ...productData,
        photos: productData.photos.length + ' fotos',
      });

      if (isEditing) {
        await marketplaceService.updateProduct(productId, productData);
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      } else {
        const result = await marketplaceService.createProduct(productData);
        console.log('✅ [CREATE PRODUCT] Producto creado:', result);
        Alert.alert('Éxito', 'Producto publicado correctamente');
      }

      navigation.goBack();
    } catch (error: any) {
      console.error('❌ [CREATE PRODUCT] Error guardando producto:', error);
      const errorMessage = error.message || 'No se pudo guardar el producto';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Editar producto' : 'Publicar producto'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tipo de publicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tipo de publicación</Text>
          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'venta' && styles.typeButtonActive]}
              onPress={() => setType('venta')}
            >
              <Ionicons
                name="cash"
                size={24}
                color={type === 'venta' ? 'white' : '#666'}
              />
              <Text style={[styles.typeButtonText, type === 'venta' && styles.typeButtonTextActive]}>
                Venta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'donacion' && styles.typeButtonActive]}
              onPress={() => setType('donacion')}
            >
              <Ionicons
                name="gift"
                size={24}
                color={type === 'donacion' ? 'white' : '#666'}
              />
              <Text style={[styles.typeButtonText, type === 'donacion' && styles.typeButtonTextActive]}>
                Donación
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'trueque' && styles.typeButtonActive]}
              onPress={() => setType('trueque')}
            >
              <Ionicons
                name="swap-horizontal"
                size={24}
                color={type === 'trueque' ? 'white' : '#666'}
              />
              <Text style={[styles.typeButtonText, type === 'trueque' && styles.typeButtonTextActive]}>
                Trueque
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Fotos {photos.length > 0 && `(${photos.length}/5)`}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photosContainer}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoWrapper}>
                  <Image source={{ uri: photo }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handlePickImage}
                  disabled={uploadingImages}
                >
                  {uploadingImages ? (
                    <ActivityIndicator color="#59C6C0" />
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color="#59C6C0" />
                      <Text style={styles.addPhotoText}>Agregar foto</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>

        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Título *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Carriola Evenflo en excelente estado"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.helperText}>{title.length}/100 caracteres</Text>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe tu producto con detalle..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            maxLength={1000}
          />
          <Text style={styles.helperText}>{description.length}/1000 caracteres</Text>
        </View>

        {/* Categoría */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoriesContainer}>
              {categories.map((cat) => {
                return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryButton,
                    category === cat.slug && styles.categoryButtonActive,
                  ]}
                  onPress={() => setCategory(cat.slug)}
                >
                  {cat.imageUrl ? (
                    <Image
                      source={{ uri: cat.imageUrl }}
                      style={styles.categoryIcon}
                    />
                  ) : (
                    <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  )}
                  <Text
                    style={[
                      styles.categoryButtonText,
                      category === cat.slug && styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Estado/Condición */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado *</Text>
          <View style={styles.conditionsContainer}>
            {CONDITIONS.map((cond) => (
              <TouchableOpacity
                key={cond.id}
                style={[
                  styles.conditionButton,
                  condition === cond.id && styles.conditionButtonActive,
                ]}
                onPress={() => setCondition(cond.id)}
              >
                <Text
                  style={[
                    styles.conditionButtonText,
                    condition === cond.id && styles.conditionButtonTextActive,
                  ]}
                >
                  {cond.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Precio o Trueque */}
        {type === 'venta' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Precio *</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              <Text style={styles.currencyText}>USD</Text>
            </View>
          </View>
        )}

        {type === 'trueque' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Busco a cambio *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Cuna para bebé o andadera"
              value={tradeFor}
              onChangeText={setTradeFor}
              maxLength={100}
            />
          </View>
        )}

        {/* Ubicación */}
        <View style={styles.section}>
          <View style={styles.locationHeader}>
            <Text style={styles.sectionTitle}>Ubicación *</Text>
            {locationLoading && (
              <ActivityIndicator size="small" color="#59C6C0" style={{ marginLeft: 10 }} />
            )}
          </View>
          
          {locationLoading ? (
            <View style={styles.locationLoadingContainer}>
              <Text style={styles.locationLoadingText}>Obteniendo tu ubicación...</Text>
            </View>
          ) : location ? (
            <View style={styles.locationInfoContainer}>
              <View style={styles.locationInfoRow}>
                <Ionicons name="location" size={20} color="#59C6C0" />
                <View style={styles.locationInfoText}>
                  {location.address && (
                    <Text style={styles.locationAddress}>{location.address}</Text>
                  )}
                  <Text style={styles.locationDetails}>
                    {[location.city, location.state, location.country]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                  <Text style={styles.locationCoordinates}>
                    {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.updateLocationButton}
                onPress={async () => {
                  console.log('🗺️ [MAP] ========== ABRIENDO MODAL DE MAPA ==========');
                  
                  // Obtener ubicación actual si no hay una guardada o si es inválida
                  let initialLocation = location;
                  
                  if (!initialLocation || !initialLocation.latitude || !initialLocation.longitude) {
                    console.log('📍 [MAP] No hay ubicación guardada, obteniendo ubicación actual...');
                    try {
                      const { status } = await Location.requestForegroundPermissionsAsync();
                      if (status === 'granted') {
                        const currentLocation = await Location.getCurrentPositionAsync({
                          accuracy: Location.Accuracy.High,
                        });
                        initialLocation = {
                          latitude: currentLocation.coords.latitude,
                          longitude: currentLocation.coords.longitude,
                        };
                        console.log('✅ [MAP] Ubicación actual obtenida:', initialLocation);
                      } else {
                        // Si no hay permiso, usar ubicación por defecto (Ciudad de México)
                        initialLocation = {
                          latitude: 19.4326,
                          longitude: -99.1332,
                        };
                        console.log('⚠️ [MAP] Sin permiso de ubicación, usando ubicación por defecto');
                      }
                    } catch (error) {
                      console.error('❌ [MAP] Error obteniendo ubicación:', error);
                      // Usar ubicación por defecto si falla
                      initialLocation = {
                        latitude: 19.4326,
                        longitude: -99.1332,
                      };
                    }
                  }
                  
                  console.log('🗺️ [MAP] Ubicación inicial para el mapa:', initialLocation);
                  console.log('🗺️ [MAP] Validando coordenadas:', {
                    latitude: initialLocation.latitude,
                    longitude: initialLocation.longitude,
                    isValidLat: initialLocation.latitude >= -90 && initialLocation.latitude <= 90,
                    isValidLon: initialLocation.longitude >= -180 && initialLocation.longitude <= 180,
                  });
                  
                  // Validar coordenadas antes de establecerlas
                  if (initialLocation.latitude >= -90 && initialLocation.latitude <= 90 &&
                      initialLocation.longitude >= -180 && initialLocation.longitude <= 180) {
                    setMapLocation({
                      latitude: initialLocation.latitude,
                      longitude: initialLocation.longitude,
                    });
                    setMapZoom(15); // Resetear zoom a 15
                    setMapLoaded(false); // Resetear estado de carga
                    // Pequeño delay para asegurar que el estado se actualice antes de abrir el modal
                    setTimeout(() => {
                      setShowMapModal(true);
                      console.log('🗺️ [MAP] Modal abierto con coordenadas:', initialLocation);
                    }, 100);
                  } else {
                    console.error('❌ [MAP] Coordenadas inválidas:', initialLocation);
                    Alert.alert('Error', 'Las coordenadas de ubicación no son válidas. Por favor, intenta de nuevo.');
                  }
                }}
              >
                <Ionicons name="map" size={16} color="#59C6C0" />
                <Text style={styles.updateLocationText}>Modificar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.locationErrorContainer}>
              <Ionicons name="location-outline" size={24} color="#999" />
              <Text style={styles.locationErrorText}>
                No se pudo obtener tu ubicación
              </Text>
              <TouchableOpacity
                style={styles.retryLocationButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.retryLocationText}>Intentar de nuevo</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botón de publicar */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditing ? 'Guardar cambios' : 'Publicar producto'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal del Mapa */}
      <Modal
        visible={showMapModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMapModal(false)}
      >
        <View style={styles.mapModalContainer}>
          <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
          <View style={[styles.mapModalHeader, { paddingTop: insets.top + 10 }]}>
            <Text style={styles.mapModalTitle}>Selecciona tu ubicación</Text>
            <TouchableOpacity
              onPress={() => setShowMapModal(false)}
              style={styles.mapModalCloseButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {mapLocation ? (
            <View style={styles.mapContainer}>
              {(() => {
                console.log('🔍 [MAP] ========== RENDERIZANDO MAPA ==========');
                console.log('🔍 [MAP] mapLocation:', mapLocation);
                console.log('🔍 [MAP] mapLocation.latitude:', mapLocation?.latitude);
                console.log('🔍 [MAP] mapLocation.longitude:', mapLocation?.longitude);
                console.log('🔍 [MAP] mapLoaded:', mapLoaded);
                console.log('🔍 [MAP] Platform.OS:', Platform.OS);
                console.log('🔍 [MAP] GoogleMaps disponible:', typeof GoogleMaps !== 'undefined');
                console.log('🔍 [MAP] AppleMaps disponible:', typeof AppleMaps !== 'undefined');
                
                // Verificar disponibilidad de componentes según la plataforma
                const hasAppleMaps = Platform.OS === 'ios' && AppleMaps && AppleMaps.View;
                const hasGoogleMaps = Platform.OS === 'android' && GoogleMaps && GoogleMaps.View;
                
                if (hasAppleMaps || hasGoogleMaps) {
                  console.log('✅ [MAP] Renderizando', Platform.OS === 'ios' ? 'AppleMaps.View' : 'GoogleMaps.View');
                  console.log('📍 [MAP] Marcador con coordenadas:', {
                    latitude: mapLocation.latitude,
                    longitude: mapLocation.longitude,
                  });
                  
                  return (
                    <>
                      {!mapLoaded && (
                        <View style={styles.mapLoadingOverlay}>
                          <ActivityIndicator size="large" color="#59C6C0" />
                          <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
                        </View>
                      )}
                      {Platform.OS === 'ios' ? (
                        <View style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'transparent' }}>
                          <AppleMaps.View
                            key={`map-${mapLocation.latitude}-${mapLocation.longitude}-${mapKey}`}
                            style={styles.map}
                            cameraPosition={{
                              latitude: mapLocation.latitude,
                              longitude: mapLocation.longitude,
                              zoom: mapZoom,
                            } as any}
                            annotations={[{
                              id: 'location-marker',
                              coordinates: {
                                latitude: mapLocation.latitude,
                                longitude: mapLocation.longitude,
                              },
                              title: 'Ubicación del producto',
                            }]}
                            onCameraMove={(event: any) => {
                              // Cuando la cámara se mueve, el mapa está cargado
                              console.log('📹 [MAP] onCameraMove ejecutado (iOS):', event);
                              if (!mapLoaded) {
                                console.log('✅ [MAP] Mapa está cargado (detectado por onCameraMove)');
                                setMapLoaded(true);
                              }
                            }}
                            onMapClick={(event: any) => {
                              console.log('📍 [MAP] onMapClick ejecutado (iOS):', event);
                              const coordinate = event.coordinates;
                              console.log('📍 [MAP] Coordinate extraído:', coordinate);
                              if (coordinate && coordinate.latitude && coordinate.longitude) {
                                console.log('📍 [MAP] Nueva ubicación seleccionada:', coordinate);
                                // Actualizar marcador cuando se hace click en el mapa
                                setMapLocation({ 
                                  latitude: coordinate.latitude, 
                                  longitude: coordinate.longitude 
                                });
                              } else {
                                console.warn('⚠️ [MAP] Evento onMapClick sin coordenadas válidas:', event);
                              }
                            }}
                            onMarkerClick={(event: any) => {
                              console.log('📍 [MAP] onMarkerClick ejecutado (iOS):', event);
                              const coordinate = event.coordinates || event.coordinate;
                              console.log('📍 [MAP] Coordinate del evento:', coordinate);
                              if (coordinate && coordinate.latitude && coordinate.longitude) {
                                console.log('📍 [MAP] Marcador clickeado en:', coordinate);
                              } else {
                                console.warn('⚠️ [MAP] onMarkerClick sin coordenadas válidas:', event);
                              }
                            }}
                          />
                          {/* Botones de zoom */}
                          <View style={styles.zoomControls}>
                            <TouchableOpacity
                              style={[styles.zoomButton, { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }]}
                              onPress={() => {
                                const newZoom = Math.min(mapZoom + 1, 20);
                                setMapZoom(newZoom);
                                console.log('🔍 [MAP] Zoom aumentado a:', newZoom);
                              }}
                            >
                              <Ionicons name="add" size={24} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.zoomButton}
                              onPress={() => {
                                const newZoom = Math.max(mapZoom - 1, 1);
                                setMapZoom(newZoom);
                                console.log('🔍 [MAP] Zoom disminuido a:', newZoom);
                              }}
                            >
                              <Ionicons name="remove" size={24} color="#333" />
                            </TouchableOpacity>
                          </View>
                          {/* Botón de ubicarme */}
                          <TouchableOpacity
                            style={styles.myLocationButton}
                            onPress={async () => {
                              try {
                                console.log('📍 [MAP] ========== BOTÓN UBICARME PRESIONADO ==========');
                                console.log('📍 [MAP] Ubicación actual del mapa:', mapLocation);
                                
                                const { status } = await Location.requestForegroundPermissionsAsync();
                                console.log('📍 [MAP] Estado de permisos:', status);
                                
                                if (status === 'granted') {
                                  console.log('📍 [MAP] Permisos concedidos, obteniendo ubicación...');
                                  const currentLocation = await Location.getCurrentPositionAsync({
                                    accuracy: Location.Accuracy.High,
                                  });
                                  
                                  const newLocation = {
                                    latitude: currentLocation.coords.latitude,
                                    longitude: currentLocation.coords.longitude,
                                  };
                                  
                                  console.log('✅ [MAP] Ubicación GPS obtenida:', newLocation);
                                  console.log('✅ [MAP] Coordenadas GPS:', {
                                    lat: newLocation.latitude,
                                    lon: newLocation.longitude,
                                    isValidLat: newLocation.latitude >= -90 && newLocation.latitude <= 90,
                                    isValidLon: newLocation.longitude >= -180 && newLocation.longitude <= 180,
                                  });
                                  
                                  // Validar coordenadas antes de establecerlas
                                  if (newLocation.latitude >= -90 && newLocation.latitude <= 90 &&
                                      newLocation.longitude >= -180 && newLocation.longitude <= 180) {
                                    // Forzar actualización del mapa
                                    setMapLoaded(false);
                                    setMapZoom(15);
                                    setMapLocation({
                                      latitude: newLocation.latitude,
                                      longitude: newLocation.longitude,
                                    });
                                    setMapKey(prev => prev + 1); // Forzar re-render del mapa
                                    
                                    // Pequeño delay para asegurar que el estado se actualice
                                    setTimeout(() => {
                                      setMapLoaded(true);
                                      console.log('✅ [MAP] Mapa actualizado con nueva ubicación');
                                    }, 100);
                                  } else {
                                    console.error('❌ [MAP] Coordenadas inválidas:', newLocation);
                                    Alert.alert('Error', 'Las coordenadas obtenidas no son válidas');
                                  }
                                } else {
                                  console.warn('⚠️ [MAP] Permisos denegados');
                                  Alert.alert(
                                    'Permiso de ubicación requerido',
                                    'Necesitamos tu ubicación para centrar el mapa. Por favor, permite el acceso a la ubicación en la configuración de la app.'
                                  );
                                }
                              } catch (error) {
                                console.error('❌ [MAP] Error obteniendo ubicación:', error);
                                console.error('❌ [MAP] Error completo:', JSON.stringify(error, null, 2));
                                Alert.alert('Error', 'No se pudo obtener tu ubicación actual. Por favor, intenta de nuevo.');
                              }
                            }}
                          >
                            <Ionicons name="locate" size={24} color="#59C6C0" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View style={{ flex: 1, width: '100%', height: '100%', position: 'relative' }}>
                        <GoogleMaps.View
                          key={`map-${mapLocation.latitude}-${mapLocation.longitude}-${mapKey}`}
                          style={[styles.map, { width: '100%', height: '100%' }]}
                          cameraPosition={{
                            latitude: mapLocation.latitude,
                            longitude: mapLocation.longitude,
                            zoom: mapZoom,
                          } as any}
                          markers={[{
                            id: 'location-marker',
                            coordinates: {
                              latitude: mapLocation.latitude,
                              longitude: mapLocation.longitude,
                            },
                            draggable: true,
                            title: 'Ubicación del producto',
                          }]}
                          onMapLoaded={() => {
                            console.log('✅ [MAP] ========== onMapLoaded EJECUTADO (Android) ==========');
                            console.log('✅ [MAP] Mapa cargado correctamente');
                            setMapLoaded(true);
                          }}
                          onMapClick={(event: any) => {
                            console.log('📍 [MAP] onMapClick ejecutado (Android):', event);
                            const coordinate = event.coordinates || event.coordinate;
                            console.log('📍 [MAP] Coordinate extraído:', coordinate);
                            if (coordinate && coordinate.latitude && coordinate.longitude) {
                              console.log('📍 [MAP] Nueva ubicación seleccionada:', coordinate);
                              setMapLocation({ 
                                latitude: coordinate.latitude, 
                                longitude: coordinate.longitude 
                              });
                            } else {
                              console.warn('⚠️ [MAP] Evento onMapClick sin coordenadas válidas:', event);
                            }
                          }}
                          onMarkerClick={(event: any) => {
                            console.log('📍 [MAP] onMarkerClick ejecutado (Android):', event);
                            const coordinate = event.coordinate || event.coordinates;
                            if (coordinate && coordinate.latitude && coordinate.longitude) {
                              console.log('📍 [MAP] Marcador clickeado en:', coordinate);
                            }
                          }}
                        />
                        {/* Botones de zoom */}
                        <View style={styles.zoomControls}>
                          <TouchableOpacity
                            style={[styles.zoomButton, { borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }]}
                            onPress={() => {
                              const newZoom = Math.min(mapZoom + 1, 20);
                              setMapZoom(newZoom);
                              console.log('🔍 [MAP] Zoom aumentado a:', newZoom);
                            }}
                          >
                            <Ionicons name="add" size={24} color="#333" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.zoomButton}
                            onPress={() => {
                              const newZoom = Math.max(mapZoom - 1, 1);
                              setMapZoom(newZoom);
                              console.log('🔍 [MAP] Zoom disminuido a:', newZoom);
                            }}
                          >
                            <Ionicons name="remove" size={24} color="#333" />
                          </TouchableOpacity>
                        </View>
                        {/* Botón de ubicarme */}
                        <TouchableOpacity
                          style={styles.myLocationButton}
                          onPress={async () => {
                            try {
                              console.log('📍 [MAP] ========== BOTÓN UBICARME PRESIONADO (Android) ==========');
                              console.log('📍 [MAP] Ubicación actual del mapa:', mapLocation);
                              
                              const { status } = await Location.requestForegroundPermissionsAsync();
                              console.log('📍 [MAP] Estado de permisos:', status);
                              
                              if (status === 'granted') {
                                console.log('📍 [MAP] Permisos concedidos, obteniendo ubicación...');
                                const currentLocation = await Location.getCurrentPositionAsync({
                                  accuracy: Location.Accuracy.High,
                                });
                                
                                const newLocation = {
                                  latitude: currentLocation.coords.latitude,
                                  longitude: currentLocation.coords.longitude,
                                };
                                
                                console.log('✅ [MAP] Ubicación GPS obtenida:', newLocation);
                                console.log('✅ [MAP] Coordenadas GPS:', {
                                  lat: newLocation.latitude,
                                  lon: newLocation.longitude,
                                  isValidLat: newLocation.latitude >= -90 && newLocation.latitude <= 90,
                                  isValidLon: newLocation.longitude >= -180 && newLocation.longitude <= 180,
                                });
                                
                                // Validar coordenadas antes de establecerlas
                                if (newLocation.latitude >= -90 && newLocation.latitude <= 90 &&
                                    newLocation.longitude >= -180 && newLocation.longitude <= 180) {
                                  // Forzar actualización del mapa
                                  setMapLoaded(false);
                                  setMapZoom(15);
                                  setMapLocation({
                                    latitude: newLocation.latitude,
                                    longitude: newLocation.longitude,
                                  });
                                  setMapKey(prev => prev + 1); // Forzar re-render del mapa
                                  
                                  // Pequeño delay para asegurar que el estado se actualice
                                  setTimeout(() => {
                                    setMapLoaded(true);
                                    console.log('✅ [MAP] Mapa actualizado con nueva ubicación');
                                  }, 100);
                                } else {
                                  console.error('❌ [MAP] Coordenadas inválidas:', newLocation);
                                  Alert.alert('Error', 'Las coordenadas obtenidas no son válidas');
                                }
                              } else {
                                console.warn('⚠️ [MAP] Permisos denegados');
                                Alert.alert(
                                  'Permiso de ubicación requerido',
                                  'Necesitamos tu ubicación para centrar el mapa. Por favor, permite el acceso a la ubicación en la configuración de la app.'
                                );
                              }
                            } catch (error) {
                              console.error('❌ [MAP] Error obteniendo ubicación:', error);
                              console.error('❌ [MAP] Error completo:', JSON.stringify(error, null, 2));
                              Alert.alert('Error', 'No se pudo obtener tu ubicación actual. Por favor, intenta de nuevo.');
                            }
                          }}
                        >
                          <Ionicons name="locate" size={24} color="#59C6C0" />
                        </TouchableOpacity>
                        </View>
                      )}
                    </>
                  );
                } else {
                  console.warn('⚠️ [MAP] MapComponent no disponible');
                  console.warn('⚠️ [MAP] Platform.OS:', Platform.OS);
                  console.warn('⚠️ [MAP] GoogleMaps:', GoogleMaps);
                  console.warn('⚠️ [MAP] AppleMaps:', AppleMaps);
                  return (
                    <View style={styles.mapErrorContainer}>
                      <Ionicons name="map-outline" size={48} color="#999" style={{ marginBottom: 16 }} />
                      <Text style={styles.mapErrorText}>
                        El mapa no está disponible.{'\n\n'}
                        Por favor, ejecuta:{'\n'}
                        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>npx expo run:android</Text>
                        {'\n'}o{'\n'}
                        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>npx expo run:ios</Text>
                        {'\n\n'}
                        Coordenadas actuales:{'\n'}
                        <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#999' }}>
                          {mapLocation.latitude.toFixed(6)}, {mapLocation.longitude.toFixed(6)}
                        </Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.mapConfirmButton}
                        onPress={() => {
                          // Confirmar usando la ubicación actual
                          setShowMapModal(false);
                        }}
                      >
                        <Text style={styles.mapConfirmButtonText}>Usar esta ubicación</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }
              })()}
            </View>
          ) : (
            <View style={styles.mapErrorContainer}>
              <Ionicons name="location-outline" size={48} color="#999" />
              <Text style={styles.mapErrorText}>
                No se pudo obtener la ubicación inicial
              </Text>
            </View>
          )}

          <View style={styles.mapModalFooter}>
            <View style={styles.mapLocationInfo}>
              {mapLocation && (
                <>
                  <Text style={styles.mapLocationText}>
                    {mapLocation.latitude.toFixed(6)}, {mapLocation.longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapGetAddressButton}
                    onPress={async () => {
                      if (mapLocation) {
                        try {
                          const [addressResult] = await Location.reverseGeocodeAsync({
                            latitude: mapLocation.latitude,
                            longitude: mapLocation.longitude,
                          });

                          if (addressResult) {
                            const address = [
                              addressResult.street,
                              addressResult.streetNumber,
                              addressResult.district,
                              addressResult.name,
                            ]
                              .filter(Boolean)
                              .join(', ');

                            Alert.alert(
                              'Dirección',
                              address || 'No se pudo obtener la dirección',
                              [{ text: 'OK' }]
                            );
                          }
                        } catch (error) {
                          console.error('Error obteniendo dirección:', error);
                        }
                      }
                    }}
                  >
                    <Ionicons name="location" size={16} color="#59C6C0" />
                    <Text style={styles.mapGetAddressText}>Ver dirección</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={styles.mapModalButtons}>
              <TouchableOpacity
                style={styles.mapCancelButton}
                onPress={() => setShowMapModal(false)}
              >
                <Text style={styles.mapCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.mapConfirmButton}
                onPress={async () => {
                  if (mapLocation) {
                    await processLocation(mapLocation.latitude, mapLocation.longitude);
                    setShowMapModal(false);
                  }
                }}
              >
                <Text style={styles.mapConfirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    paddingTop: 6,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  typeButtonActive: {
    borderColor: '#59C6C0',
    backgroundColor: '#96d2d3',
  },
  typeButtonText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: 'white',
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#59C6C0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: 11,
    color: '#59C6C0',
    fontFamily: 'Montserrat',
    marginTop: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 5,
    textAlign: 'right',
  },
  categoriesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  categoryButtonActive: {
    borderColor: '#59C6C0',
    backgroundColor: '#96d2d3',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  categoryButtonTextActive: {
    color: 'white',
  },
  categoryIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  conditionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  conditionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
  },
  conditionButtonActive: {
    borderColor: '#59C6C0',
    backgroundColor: '#96d2d3',
  },
  conditionButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  conditionButtonTextActive: {
    color: 'white',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  currencySymbol: {
    fontSize: 18,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: 'bold',
    marginRight: 5,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Montserrat',
    color: '#333',
    paddingVertical: 12,
  },
  currencyText: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
    marginLeft: 5,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationLoadingContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  locationLoadingText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  locationInfoContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  locationInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  locationInfoText: {
    flex: 1,
    marginLeft: 10,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  locationCoordinates: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Montserrat',
    fontStyle: 'italic',
  },
  updateLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#59C6C0',
    gap: 5,
  },
  updateLocationText: {
    fontSize: 13,
    color: '#59C6C0',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  locationErrorContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  locationErrorText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 10,
    marginBottom: 15,
    textAlign: 'center',
  },
  retryLocationButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    backgroundColor: '#96d2d3',
  },
  retryLocationText: {
    fontSize: 14,
    color: 'white',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  submitButton: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  // Estilos del Modal del Mapa
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#96d2d3',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  mapModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  mapModalCloseButton: {
    padding: 4,
  },
  mapContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    position: 'relative',
    minHeight: 400,
  },
  zoomControls: {
    position: 'absolute',
    right: 16,
    top: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomButton: {
    width: 44,
    height: 44,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationButton: {
    position: 'absolute',
    right: 16,
    top: 100,
    width: 44,
    height: 44,
    backgroundColor: 'white',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  map: {
    width: '100%',
    height: '100%',
    flex: 1,
    backgroundColor: '#e0e0e0', // Color de fondo temporal para verificar que el componente se renderiza
  },
  mapLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  mapLoadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  mapErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 20,
  },
  mapErrorText: {
    color: '#d32f2f',
    fontSize: 14,
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  mapModalFooter: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  mapLocationInfo: {
    marginBottom: 16,
    alignItems: 'center',
  },
  mapLocationText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  mapGetAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F0F0F0',
  },
  mapGetAddressText: {
    fontSize: 13,
    color: '#59C6C0',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  mapModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  mapCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  mapCancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
  mapConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
    alignItems: 'center',
  },
  mapConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontFamily: 'Montserrat',
    fontWeight: '600',
  },
});

export default CreateProductScreen;

