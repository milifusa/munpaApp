import React, { useState, useEffect, useCallback } from 'react';
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
  Modal,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { axiosInstance as api } from '../services/api';
import vendorService from '../services/vendorService';
import { imageUploadService } from '../services/imageUploadService';
import { locationsService } from '../services/api';
import analyticsService from '../services/analyticsService';

const CONDITIONS = [
  { id: 'nuevo', name: 'Nuevo', icon: '✨' },
  { id: 'como_nuevo', name: 'Como nuevo', icon: '🌟' },
  { id: 'buen_estado', name: 'Buen estado', icon: '👍' },
  { id: 'usado', name: 'Usado', icon: '♻️' },
];

const VendorCreateProductScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const { product, productId } = route.params || {};
  const isEditing = !!productId;

  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  // Categorías (solo del vendedor)
  const [vendorCategories, setVendorCategories] = useState<any[]>([]);
  const [vendorCategoryId, setVendorCategoryId] = useState('');
  
  // Condición
  const [condition, setCondition] = useState('');
  
  // Precio
  const [price, setPrice] = useState('');
  
  // Promoción (solo para venta)
  const [hasPromotion, setHasPromotion] = useState(false);
  const [promoType, setPromoType] = useState<'fixed' | 'percentage'>('percentage');
  const [promoValue, setPromoValue] = useState('');
  const [promoLabel, setPromoLabel] = useState('');
  const [promoValidUntil, setPromoValidUntil] = useState(new Date());
  const [showPromoDatePicker, setShowPromoDatePicker] = useState(false);
  
  // Ubicación
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  
  // Modales
  const [showVendorCategoryModal, setShowVendorCategoryModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  useEffect(() => {
    analyticsService.logScreenView('vendor_create_product');
    loadInitialData();
  }, []);

  // Recargar categorías cada vez que la pantalla vuelve al foco
  // (ej: el usuario creó una nueva categoría y regresó)
  useFocusEffect(
    useCallback(() => {
      loadVendorCategories();
    }, [])
  );

  useEffect(() => {
    if (isEditing && product) {
      loadProductData();
    }
  }, [isEditing, product]);

  useEffect(() => {
    if (countryId) {
      loadCities(countryId);
    } else {
      setCities([]);
      setCityId('');
    }
  }, [countryId]);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        loadVendorCategories(),
        loadCountries(),
      ]);
    } catch (error) {
      console.error('❌ Error cargando datos iniciales:', error);
    }
  };

  const loadVendorCategories = async () => {
    try {
      const response = await vendorService.getCategories();
      const cats = response?.data || response || [];
      setVendorCategories(Array.isArray(cats) ? cats : []);
    } catch (error) {
      console.error('❌ Error cargando categorías del vendedor:', error);
    }
  };

  const loadCountries = async () => {
    try {
      const response = await locationsService.getCountries();
      const items = response?.data || response?.countries || [];
      setCountries(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('❌ Error cargando países:', error);
    }
  };

  const loadCities = async (selectedCountryId: string) => {
    try {
      const response = await locationsService.getCities(selectedCountryId);
      const items = response?.data || response?.cities || [];
      setCities(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('❌ Error cargando ciudades:', error);
    }
  };

  const loadProductData = () => {
    setTitle(product.title || '');
    setDescription(product.description || '');
    setPhotos(product.photos || []);
    setVendorCategoryId(product.vendorCategoryId || '');
    setCondition(product.condition || '');
    setPrice(product.price?.toString() || '');
    setCountryId(product.countryId || '');
    setCityId(product.cityId || '');
    
    // Cargar datos de promoción si existen
    if (product.promoPrice || product.discountPercentage) {
      setHasPromotion(true);
      if (product.promoPrice) {
        setPromoType('fixed');
        setPromoValue(product.promoPrice.toString());
      } else if (product.discountPercentage) {
        setPromoType('percentage');
        setPromoValue(product.discountPercentage.toString());
      }
      setPromoLabel(product.promoLabel || '');
      if (product.promoValidUntil) {
        setPromoValidUntil(new Date(product.promoValidUntil));
      }
    }
  };

  const handlePickImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para seleccionar fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        if (photos.length + result.assets.length > 5) {
          Alert.alert('Límite de fotos', 'Puedes subir máximo 5 fotos');
          return;
        }

        await uploadImages(result.assets);
      }
    } catch (error) {
      console.error('❌ Error seleccionando imágenes:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las imágenes');
    }
  };

  const uploadImages = async (assets: any[]) => {
    try {
      setUploadingPhotos(true);
      const uploadedUrls: string[] = [];

      for (const asset of assets) {
        console.log('📤 [VENDOR] Subiendo imagen:', asset.uri);
        const photoUrl = await imageUploadService.uploadImage(asset.uri, 'marketplace', asset.mimeType);
        console.log('✅ [VENDOR] Imagen subida, URL recibida:', photoUrl);
        
        if (photoUrl) {
          uploadedUrls.push(photoUrl);
        }
      }

      console.log('✅ [VENDOR] Total de URLs subidas:', uploadedUrls.length, uploadedUrls);
      
      if (uploadedUrls.length > 0) {
        setPhotos([...photos, ...uploadedUrls]);
        Alert.alert('Éxito', `${uploadedUrls.length} foto(s) subida(s)`);
      } else {
        Alert.alert('Error', 'No se pudieron procesar las imágenes');
      }
    } catch (error) {
      console.error('❌ [VENDOR] Error subiendo imágenes:', error);
      Alert.alert('Error', 'No se pudieron subir las imágenes');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const newPhotos = [...photos];
            newPhotos.splice(index, 1);
            setPhotos(newPhotos);
          },
        },
      ]
    );
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es requerido');
      return false;
    }
    if (title.trim().length < 10) {
      Alert.alert('Error', 'El título debe tener al menos 10 caracteres');
      return false;
    }
    if (title.trim().length > 100) {
      Alert.alert('Error', 'El título no puede superar los 100 caracteres');
      return false;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es requerida');
      return false;
    }
    if (description.trim().length < 20) {
      Alert.alert('Error', 'La descripción debe tener al menos 20 caracteres');
      return false;
    }
    if (description.trim().length > 1000) {
      Alert.alert('Error', 'La descripción no puede superar los 1000 caracteres');
      return false;
    }
    if (photos.length === 0) {
      Alert.alert('Error', 'Agrega al menos una foto');
      return false;
    }
    if (!vendorCategoryId) {
      Alert.alert('Error', 'Selecciona una categoría para tu producto');
      return false;
    }
    if (!condition) {
      Alert.alert('Error', 'Selecciona el estado del producto');
      return false;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Error', 'El precio debe ser mayor a 0');
      return false;
    }
    if (!countryId) {
      Alert.alert('Error', 'Selecciona el país');
      return false;
    }
    if (!cityId) {
      Alert.alert('Error', 'Selecciona la ciudad');
      return false;
    }

    // Validar promoción
    if (hasPromotion) {
      const promoVal = parseFloat(promoValue);
      if (isNaN(promoVal) || promoVal <= 0) {
        Alert.alert('Error', 'El valor de la promoción debe ser mayor a 0');
        return false;
      }
      if (promoType === 'percentage' && promoVal > 100) {
        Alert.alert('Error', 'El porcentaje de descuento no puede ser mayor a 100%');
        return false;
      }
      if (promoType === 'fixed' && promoVal >= parseFloat(price)) {
        Alert.alert('Error', 'El precio promocional debe ser menor al precio original');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const productData: any = {
        title: title.trim(),
        description: description.trim(),
        vendorCategoryId: vendorCategoryId, // Requerido para vendedores
        condition,
        photos,
        price: parseFloat(price), // Siempre presente para vendedores
        cityId,
        countryId,
      };

      // Agregar promoción si está activada
      if (hasPromotion) {
        if (promoType === 'fixed') {
          productData.promoPrice = parseFloat(promoValue);
        } else {
          productData.discountPercentage = parseFloat(promoValue);
        }
        productData.promoValidUntil = promoValidUntil.toISOString();
        if (promoLabel.trim()) {
          productData.promoLabel = promoLabel.trim();
        }
      } else if (isEditing && !hasPromotion) {
        // Si está editando y desactivó la promoción, limpiarla
        productData.promoClear = true;
      }

      console.log('📤 [VENDOR] Enviando producto a /api/vendor/products:', productData);
      console.log('📤 [VENDOR] Datos detallados:', JSON.stringify(productData, null, 2));

      if (isEditing) {
        await api.put(`/api/vendor/products/${productId}`, productData);
        Alert.alert('Éxito', 'Producto actualizado correctamente');
      } else {
        await api.post('/api/vendor/products', productData);
        Alert.alert('Éxito', 'Producto publicado correctamente');
      }

      analyticsService.logEvent(isEditing ? 'vendor_product_updated' : 'vendor_product_created', {
        has_promotion: hasPromotion,
        vendor_category_id: vendorCategoryId,
      });

      navigation.goBack();
    } catch (error: any) {
      console.error('❌ Error guardando producto:', error);
      const message = error.response?.data?.message || 'No se pudo guardar el producto';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const getVendorCategoryName = (catId: string) => {
    if (!catId) return 'Selecciona una categoría';
    const cat = vendorCategories.find((c) => c.id === catId);
    return cat?.name || 'Selecciona una categoría';
  };

  const getConditionName = (condId: string) => {
    const cond = CONDITIONS.find((c) => c.id === condId);
    return cond?.name || 'Selecciona un estado';
  };

  const getCountryName = (countId: string) => {
    const country = countries.find((c) => c.id === countId);
    return country?.name || 'Selecciona un país';
  };

  const getCityName = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    return city?.name || 'Selecciona una ciudad';
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Título <Text style={styles.required}>*</Text> (mínimo 10 caracteres)
          </Text>
          <TextInput
            style={[
              styles.input,
              title.length > 0 && title.length < 10 && styles.inputError,
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej: Cuna portátil para bebé en excelente estado"
            placeholderTextColor="#9CA3AF"
            maxLength={100}
          />
          <View style={styles.charCountRow}>
            <Text
              style={[
                styles.charCount,
                title.length > 0 && title.length < 10 && styles.charCountError,
              ]}
            >
              {title.length < 10 && title.length > 0
                ? `Faltan ${10 - title.length} caracteres`
                : ''}
            </Text>
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Descripción <Text style={styles.required}>*</Text> (mínimo 20 caracteres)
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              description.length > 0 && description.length < 20 && styles.inputError,
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe tu producto en detalle: características, estado, incluye accesorios, etc."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <View style={styles.charCountRow}>
            <Text
              style={[
                styles.charCount,
                description.length > 0 && description.length < 20 && styles.charCountError,
              ]}
            >
              {description.length < 20 && description.length > 0
                ? `Faltan ${20 - description.length} caracteres`
                : ''}
            </Text>
            <Text style={styles.charCount}>{description.length}/1000</Text>
          </View>
        </View>

        {/* Fotos */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Fotos <Text style={styles.required}>*</Text> (máximo 5)
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoContainer}>
                <Image source={{ uri: photo }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemovePhoto(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < 5 && (
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={handlePickImages}
                disabled={uploadingPhotos}
              >
                {uploadingPhotos ? (
                  <ActivityIndicator color="#96d2d3" />
                ) : (
                  <>
                    <Ionicons name="camera" size={32} color="#96d2d3" />
                    <Text style={styles.addPhotoText}>Agregar</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Categoría del Vendedor */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Categoría <Text style={styles.required}>*</Text>
          </Text>
          {vendorCategories.length === 0 ? (
            <View style={styles.noCategoriesContainer}>
              <Ionicons name="folder-open" size={32} color="#9CA3AF" />
              <Text style={styles.noCategoriesText}>
                No tienes categorías creadas
              </Text>
              <TouchableOpacity
                style={styles.createCategoryButton}
                onPress={() => navigation.navigate('VendorCategories' as never)}
              >
                <Ionicons name="add-circle" size={18} color="#96d2d3" />
                <Text style={styles.createCategoryText}>Crear mi primera categoría</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowVendorCategoryModal(true)}
              >
                <Text style={vendorCategoryId ? styles.selectText : styles.selectPlaceholder}>
                  {getVendorCategoryName(vendorCategoryId)}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('VendorCategories' as never)}
              >
                <Ionicons name="settings" size={14} color="#96d2d3" />
                <Text style={styles.linkText}>Gestionar categorías</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Condición */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Estado <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity style={styles.selectInput} onPress={() => setShowConditionModal(true)}>
            <Text style={condition ? styles.selectText : styles.selectPlaceholder}>
              {getConditionName(condition)}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Precio */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Precio (USD) <Text style={styles.required}>*</Text>
          </Text>
          <View style={styles.priceInputContainer}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={styles.priceInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Promoción */}
        <View style={styles.section}>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="pricetag" size={20} color="#96d2d3" />
                <Text style={styles.label}>¿Aplicar promoción?</Text>
              </View>
              <Switch
                value={hasPromotion}
                onValueChange={setHasPromotion}
                trackColor={{ false: '#D1D5DB', true: '#96d2d3' }}
                thumbColor="#FFFFFF"
              />
            </View>

            {hasPromotion && (
              <View style={styles.promoContainer}>
                {/* Tipo de promoción */}
                <View style={styles.promoTypeRow}>
                  <TouchableOpacity
                    style={[
                      styles.promoTypeButton,
                      promoType === 'percentage' && styles.promoTypeButtonActive,
                    ]}
                    onPress={() => setPromoType('percentage')}
                  >
                    <Text
                      style={[
                        styles.promoTypeText,
                        promoType === 'percentage' && styles.promoTypeTextActive,
                      ]}
                    >
                      % Descuento
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.promoTypeButton,
                      promoType === 'fixed' && styles.promoTypeButtonActive,
                    ]}
                    onPress={() => setPromoType('fixed')}
                  >
                    <Text
                      style={[
                        styles.promoTypeText,
                        promoType === 'fixed' && styles.promoTypeTextActive,
                      ]}
                    >
                      Precio fijo
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Valor de promoción */}
                <View style={styles.inputGroup}>
                  <Text style={styles.smallLabel}>
                    {promoType === 'percentage' ? 'Porcentaje de descuento' : 'Precio promocional'}
                  </Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>
                      {promoType === 'percentage' ? '%' : '$'}
                    </Text>
                    <TextInput
                      style={styles.priceInput}
                      value={promoValue}
                      onChangeText={setPromoValue}
                      placeholder={promoType === 'percentage' ? '20' : '15.00'}
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Etiqueta promocional */}
                <View style={styles.inputGroup}>
                  <Text style={styles.smallLabel}>Etiqueta (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    value={promoLabel}
                    onChangeText={setPromoLabel}
                    placeholder="Ej: Oferta de temporada"
                    placeholderTextColor="#9CA3AF"
                    maxLength={50}
                  />
                </View>

                {/* Fecha de vencimiento */}
                <View style={styles.inputGroup}>
                  <Text style={styles.smallLabel}>Válido hasta</Text>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => setShowPromoDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#6B7280" />
                    <Text style={styles.dateText}>{promoValidUntil.toLocaleDateString()}</Text>
                  </TouchableOpacity>
                  {showPromoDatePicker && (
                    <DateTimePicker
                      value={promoValidUntil}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
                      onChange={(event, selectedDate) => {
                        setShowPromoDatePicker(false);
                        if (selectedDate) {
                          setPromoValidUntil(selectedDate);
                        }
                      }}
                    />
                  )}
                </View>

                {/* Preview del precio final */}
                {price && promoValue && (
                  <View style={styles.pricePreview}>
                    <Text style={styles.pricePreviewLabel}>Vista previa:</Text>
                    <View style={styles.pricePreviewRow}>
                      <Text style={styles.priceOriginal}>${parseFloat(price).toFixed(2)}</Text>
                      <Text style={styles.pricePromo}>
                        $
                        {promoType === 'fixed'
                          ? parseFloat(promoValue).toFixed(2)
                          : (
                              parseFloat(price) -
                              (parseFloat(price) * parseFloat(promoValue)) / 100
                            ).toFixed(2)}
                      </Text>
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          {promoType === 'percentage'
                            ? `-${promoValue}%`
                            : `-$${(parseFloat(price) - parseFloat(promoValue)).toFixed(2)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Ubicación <Text style={styles.required}>*</Text>
          </Text>
          
          <View style={styles.locationRow}>
            <View style={styles.locationField}>
              <Text style={styles.smallLabel}>País</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={countryId ? styles.selectText : styles.selectPlaceholder}>
                  {getCountryName(countryId)}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationField}>
              <Text style={styles.smallLabel}>Ciudad</Text>
              <TouchableOpacity
                style={[styles.selectInput, !countryId && styles.selectInputDisabled]}
                onPress={() => countryId && setShowCityModal(true)}
                disabled={!countryId}
              >
                <Text style={cityId ? styles.selectText : styles.selectPlaceholder}>
                  {getCityName(cityId)}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Botón submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>
                {isEditing ? 'Actualizar Producto' : 'Publicar Producto'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Modales */}
      {/* Modal Categoría del Vendedor */}
      <Modal
        visible={showVendorCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVendorCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona una categoría</Text>
              <TouchableOpacity onPress={() => setShowVendorCategoryModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {vendorCategories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.modalOption,
                    vendorCategoryId === cat.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setVendorCategoryId(cat.id);
                    setShowVendorCategoryModal(false);
                  }}
                >
                  <Ionicons name="folder" size={24} color="#96d2d3" />
                  <Text
                    style={[
                      styles.modalOptionText,
                      vendorCategoryId === cat.id && styles.modalOptionTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Condición */}
      <Modal
        visible={showConditionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConditionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Estado del producto</Text>
              <TouchableOpacity onPress={() => setShowConditionModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {CONDITIONS.map((cond) => (
                <TouchableOpacity
                  key={cond.id}
                  style={[
                    styles.modalOption,
                    condition === cond.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setCondition(cond.id);
                    setShowConditionModal(false);
                  }}
                >
                  <Text style={styles.conditionIcon}>{cond.icon}</Text>
                  <Text
                    style={[
                      styles.modalOptionText,
                      condition === cond.id && styles.modalOptionTextActive,
                    ]}
                  >
                    {cond.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal País */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona el país</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  style={[
                    styles.modalOption,
                    countryId === country.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setCountryId(country.id);
                    setShowCountryModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      countryId === country.id && styles.modalOptionTextActive,
                    ]}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Ciudad */}
      <Modal
        visible={showCityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona la ciudad</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[
                    styles.modalOption,
                    cityId === city.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    setCityId(city.id);
                    setShowCityModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      cityId === city.id && styles.modalOptionTextActive,
                    ]}
                  >
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  optional: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '400',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    height: 120,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  charCountError: {
    color: '#EF4444',
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
  photosScroll: {
    marginTop: 8,
  },
  photoContainer: {
    position: 'relative',
    marginRight: 12,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#96d2d3',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1F2F2',
  },
  addPhotoText: {
    fontSize: 13,
    color: '#96d2d3',
    fontWeight: '600',
    marginTop: 4,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
  },
  selectInputDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.6,
  },
  selectText: {
    fontSize: 15,
    color: '#1F2937',
  },
  selectPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  linkText: {
    fontSize: 13,
    color: '#96d2d3',
    fontWeight: '600',
  },
  noCategoriesContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  noCategoriesText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  createCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#D1F2F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createCategoryText: {
    fontSize: 14,
    color: '#96d2d3',
    fontWeight: '700',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderColor: '#96d2d3',
    backgroundColor: '#D1F2F2',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 4,
  },
  typeTextActive: {
    color: '#96d2d3',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  promoTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  promoTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  promoTypeButtonActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  promoTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  promoTypeTextActive: {
    color: '#F59E0B',
  },
  inputGroup: {
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  pricePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  pricePreviewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  pricePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceOriginal: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  pricePromo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#10B981',
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  locationField: {
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    borderRadius: 16,
    padding: 18,
    marginBottom: 40,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  modalOptionActive: {
    backgroundColor: '#D1F2F2',
    borderWidth: 2,
    borderColor: '#96d2d3',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  modalOptionTextActive: {
    fontWeight: '700',
    color: '#96d2d3',
  },
  categoryImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  conditionIcon: {
    fontSize: 24,
  },
});

export default VendorCreateProductScreen;
