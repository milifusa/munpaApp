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
import marketplaceService, { CONDITIONS, CreateProductData, MarketplaceCategory, DEFAULT_CATEGORIES } from '../services/marketplaceService';
import { imageUploadService } from '../services/imageUploadService';
import analyticsService from '../services/analyticsService';
import { locationsService } from '../services/api';

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
  
  // Datos del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [type, setType] = useState<'venta' | 'donacion' | 'trueque'>('venta');
  const [price, setPrice] = useState('');
  const [tradeFor, setTradeFor] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [cityName, setCityName] = useState('');
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  
  // Ubicación con coordenadas
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);

  const normalizeLocationName = (value: string) =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

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
    setLocation({
      latitude,
      longitude,
      city: cityName || undefined,
      country: countryName || undefined,
    });
  };


  useEffect(() => {
    loadCategories();
    loadCountries();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (!countryId) {
      setCities([]);
      setCityId('');
      setCountryName('');
      setCityName('');
      return;
    }
    const selected = countries.find((item) => item.id === countryId);
    setCountryName(selected?.name || '');
    loadCities(countryId);
  }, [countryId, countries]);

  useEffect(() => {
    const selected = cities.find((item) => item.id === cityId);
    setCityName(selected?.name || '');
  }, [cityId, cities]);

  useEffect(() => {
    if (!countryId && countryName && countries.length > 0) {
      const normalized = normalizeLocationName(countryName);
      const match = countries.find(
        (item) => normalizeLocationName(item.name) === normalized
      );
      if (match?.id) {
        setCountryId(match.id);
      }
    }
  }, [countryId, countryName, countries]);

  useEffect(() => {
    if (!cityId && cityName && cities.length > 0) {
      const normalized = normalizeLocationName(cityName);
      const match = cities.find(
        (item) => normalizeLocationName(item.name) === normalized
      );
      if (match?.id) {
        setCityId(match.id);
      }
    }
  }, [cityId, cityName, cities]);

  useEffect(() => {
    if (!location) return;
    setLocation((prev) =>
      prev
        ? {
            ...prev,
            city: cityName || undefined,
            country: countryName || undefined,
          }
        : prev
    );
  }, [cityName, countryName]);

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
        setCountryName(product.location.country || '');
        setCityName(product.location.city || '');
      } else {
        // Si el producto antiguo no tiene coordenadas, obtener ubicación actual
        getCurrentLocation();
      }
    }
  }, [isEditing, product]);

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

  const loadCountries = async () => {
    try {
      setIsLoadingCountries(true);
      const response = await locationsService.getCountries();
      const items =
        response?.data ||
        response?.countries ||
        response?.data?.data ||
        [];
      setCountries(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('❌ [CREATE PRODUCT] Error cargando países:', error);
      Alert.alert('Error', 'No se pudieron cargar los países');
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const loadCities = async (selectedCountryId: string) => {
    try {
      setIsLoadingCities(true);
      const response = await locationsService.getCities(selectedCountryId);
      const items =
        response?.data ||
        response?.cities ||
        response?.data?.data ||
        [];
      setCities(Array.isArray(items) ? items : []);
      setCityId('');
      setCityName('');
    } catch (error) {
      console.error('❌ [CREATE PRODUCT] Error cargando ciudades:', error);
      Alert.alert('Error', 'No se pudieron cargar las ciudades');
    } finally {
      setIsLoadingCities(false);
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
    if (!countryId) {
      Alert.alert('Error', 'Selecciona un país');
      return false;
    }
    if (!cityId) {
      Alert.alert('Error', 'Selecciona una ciudad');
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
          address: address.trim() || undefined,
          city: cityName || location.city,
          state: location.state,
          country: countryName || location.country || 'Ecuador',
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
        analyticsService.logEvent('market_product_update', {
          product_id: productId,
          title: productData.title,
          type: productData.type,
          price: productData.price ?? null,
          category: productData.category,
          condition: productData.condition,
          city: productData.location?.city || null,
          country: productData.location?.country || null,
        });
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      } else {
        const result = await marketplaceService.createProduct(productData);
        analyticsService.logEvent('market_product_publish', {
          product_id: result?.id || null,
          title: productData.title,
          type: productData.type,
          price: productData.price ?? null,
          category: productData.category,
          condition: productData.condition,
          city: productData.location?.city || null,
          country: productData.location?.country || null,
        });
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
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowCategoryModal(true)}
          >
            <Text style={category ? styles.selectText : styles.selectPlaceholder}>
              {category
                ? categories.find((cat) => cat.slug === category || cat.id === category)?.name || 'Selecciona una categoría'
                : 'Selecciona una categoría'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Estado/Condición */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado *</Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowConditionModal(true)}
          >
            <Text style={condition ? styles.selectText : styles.selectPlaceholder}>
              {condition
                ? CONDITIONS.find((cond) => cond.id === condition)?.name || 'Selecciona un estado'
                : 'Selecciona un estado'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#6B7280" />
          </TouchableOpacity>
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
                  <Text style={styles.locationDetails}>
                    {cityName && countryName
                      ? `${cityName}, ${countryName}`
                      : 'Selecciona país y ciudad'}
                  </Text>
                </View>
              </View>

              <Text style={styles.locationLabel}>País</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCountryModal(true)}
                disabled={isLoadingCountries}
              >
                <Text style={countryId ? styles.selectText : styles.selectPlaceholder}>
                  {countryId
                    ? countries.find((c) => c.id === countryId)?.name || 'Selecciona un país'
                    : 'Selecciona un país'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>

              <Text style={styles.locationLabel}>Ciudad</Text>
              {!countryId ? (
                <Text style={styles.locationHelperText}>Selecciona un país para ver las ciudades.</Text>
              ) : (
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowCityModal(true)}
                  disabled={isLoadingCities || cities.length === 0}
                >
                  <Text style={cityId ? styles.selectText : styles.selectPlaceholder}>
                    {cityId
                      ? cities.find((c) => c.id === cityId)?.name || 'Selecciona una ciudad'
                      : 'Selecciona una ciudad'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#6B7280" />
                </TouchableOpacity>
              )}
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

      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona una categoría</Text>
            <ScrollView>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.selectOption,
                    (category === cat.slug || category === cat.id) && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.slug || cat.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <View style={styles.selectOptionRow}>
                    {cat.imageUrl ? (
                      <Image source={{ uri: cat.imageUrl }} style={styles.selectOptionImage} />
                    ) : (
                      <Text style={styles.selectOptionEmoji}>{cat.icon || '📦'}</Text>
                    )}
                    <Text
                      style={[
                        styles.selectOptionText,
                        (category === cat.slug || category === cat.id) && styles.selectOptionTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.selectModalClose}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConditionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConditionModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona un estado</Text>
            <ScrollView>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond.id}
                  style={[
                    styles.selectOption,
                    condition === cond.id && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    setCondition(cond.id);
                    setShowConditionModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      condition === cond.id && styles.selectOptionTextActive,
                    ]}
                  >
                    {cond.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.selectModalClose}
              onPress={() => setShowConditionModal(false)}
            >
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCountryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona un país</Text>
            <ScrollView>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  style={[
                    styles.selectOption,
                    countryId === country.id && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    setCountryId(country.id);
                    setShowCountryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      countryId === country.id && styles.selectOptionTextActive,
                    ]}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.selectModalClose}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona una ciudad</Text>
            <ScrollView>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.selectOption,
                    cityId === city.id && styles.selectOptionActive,
                  ]}
                  onPress={() => {
                    setCityId(city.id);
                    setShowCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.selectOptionText,
                      cityId === city.id && styles.selectOptionTextActive,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.selectModalClose}
              onPress={() => setShowCityModal(false)}
            >
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
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
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  selectPlaceholder: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectModalCard: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
  },
  selectModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  selectOption: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectOptionActive: {
    backgroundColor: '#E0F7F6',
  },
  selectOptionText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  selectOptionTextActive: {
    color: '#1B8077',
    fontWeight: '700',
  },
  selectOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectOptionImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  selectOptionEmoji: {
    fontSize: 18,
  },
  selectModalClose: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectModalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#59C6C0',
    fontFamily: 'Montserrat',
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
  locationLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    fontFamily: 'Montserrat',
  },
  locationChips: {
    marginTop: 8,
  },
  locationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  locationChipSelected: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  locationChipText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  locationChipTextSelected: {
    color: '#FFFFFF',
  },
  locationHelperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Montserrat',
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

