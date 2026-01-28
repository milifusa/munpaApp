import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import api from '../services/api';
import { colors } from '../styles/globalStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { imageUploadService } from '../services/imageUploadService';

interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

interface Country {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
}

const AddRecommendationScreen = ({ navigation }: any) => {
  const route = useRoute<any>();
  const preselectedCategoryId = route.params?.categoryId as string | undefined;
  const insets = useSafeAreaInsets();
  // Estados del formulario
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [countryId, setCountryId] = useState('');
  const [cityId, setCityId] = useState('');
  const [countryName, setCountryName] = useState('');
  const [cityName, setCityName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Estados de control
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    loadCategories();
    loadCountries();
  }, []);

  useEffect(() => {
    if (preselectedCategoryId) {
      setCategoryId(preselectedCategoryId);
    }
  }, [preselectedCategoryId]);

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

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const loadCountries = async () => {
    try {
      setIsLoadingCountries(true);
      const response = await api.getCountries();
      const items =
        response?.data ||
        response?.countries ||
        response?.data?.data ||
        [];
      setCountries(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Error cargando países:', error);
      Alert.alert('Error', 'No se pudieron cargar los países');
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const loadCities = async (selectedCountryId: string) => {
    try {
      setIsLoadingCities(true);
      const response = await api.getCities(selectedCountryId);
      const items =
        response?.data ||
        response?.cities ||
        response?.data?.data ||
        [];
      setCities(Array.isArray(items) ? items : []);
      setCityId('');
      setCityName('');
    } catch (error) {
      console.error('Error cargando ciudades:', error);
      Alert.alert('Error', 'No se pudieron cargar las ciudades');
    } finally {
      setIsLoadingCities(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setImageUri(asset.uri);
        setImageMimeType(asset.mimeType || null);
      }
    } catch (error) {
      console.error('❌ [RECOMMENDATION] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setImageUri(asset.uri);
        setImageMimeType(asset.mimeType || null);
      }
    } catch (error) {
      console.error('❌ [RECOMMENDATION] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
    setImageMimeType(null);
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!categoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }
    
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del lugar');
      return;
    }
    if (!countryId) {
      Alert.alert('Error', 'Por favor selecciona un país');
      return;
    }
    if (!cityId) {
      Alert.alert('Error', 'Por favor selecciona una ciudad');
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;
      if (imageUri) {
        setIsUploadingImage(true);
        const uploadResult = await imageUploadService.uploadImage(
          imageUri,
          'recommendation',
          imageMimeType || undefined
        );
        imageUrl = uploadResult?.data?.url || uploadResult?.url;
      }

      const response = await api.createRecommendation({
        categoryId,
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        countryId,
        cityId,
        countryName,
        cityName,
        imageUrl,
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        whatsapp: whatsapp.trim(),
      });

      if (response.success) {
        Alert.alert(
          '¡Éxito!',
          'Tu recomendación ha sido enviada para revisión. Te notificaremos cuando sea aprobada.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear la recomendación');
      }
    } catch (error: any) {
      console.error('Error creando recomendación:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la recomendación');
    } finally {
      setIsUploadingImage(false);
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Recomendación</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Descripción */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#59C6C0" />
            <Text style={styles.infoText}>
              Tu recomendación será revisada por nuestro equipo antes de ser publicada.
            </Text>
          </View>

          {/* Categoría */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Categoría <Text style={styles.required}>*</Text>
            </Text>
            {isLoadingCategories ? (
              <ActivityIndicator size="small" color="#59C6C0" />
            ) : (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCategoryModal(true)}
              >
                <Text style={categoryId ? styles.selectText : styles.selectPlaceholder}>
                  {categoryId ? categories.find((c) => c.id === categoryId)?.name || 'Selecciona una categoría' : 'Selecciona una categoría'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Nombre */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nombre del lugar <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Restaurante La Casa de María"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos sobre este lugar..."
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Dirección */}
          <View style={styles.section}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Av. Principal #123, Col. Centro"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#999"
            />
          </View>

          {/* Imagen */}
          <View style={styles.section}>
            <Text style={styles.label}>Imagen (opcional)</Text>
            <View style={styles.imageActions}>
              <TouchableOpacity style={styles.imageActionButton} onPress={handlePickImage}>
                <Ionicons name="images-outline" size={18} color="#59C6C0" />
                <Text style={styles.imageActionText}>Galería</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageActionButton} onPress={handleTakePhoto}>
                <Ionicons name="camera-outline" size={18} color="#59C6C0" />
                <Text style={styles.imageActionText}>Cámara</Text>
              </TouchableOpacity>
              {imageUri && (
                <TouchableOpacity style={styles.imageActionButton} onPress={handleRemoveImage}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  <Text style={styles.imageActionRemoveText}>Quitar</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              ) : (
                <Text style={styles.imagePlaceholder}>Agregar imagen</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Ubicación */}
          <View style={styles.section}>
            <Text style={styles.label}>
              País <Text style={styles.required}>*</Text>
            </Text>
            {isLoadingCountries ? (
              <ActivityIndicator size="small" color="#59C6C0" />
            ) : (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={countryId ? styles.selectText : styles.selectPlaceholder}>
                  {countryId ? countries.find((c) => c.id === countryId)?.name || 'Selecciona un país' : 'Selecciona un país'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>
              Ciudad <Text style={styles.required}>*</Text>
            </Text>
            {!countryId ? (
              <Text style={styles.helperText}>Selecciona un país para ver las ciudades.</Text>
            ) : isLoadingCities ? (
              <ActivityIndicator size="small" color="#59C6C0" />
            ) : (
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCityModal(true)}
              >
                <Text style={cityId ? styles.selectText : styles.selectPlaceholder}>
                  {cityId ? cities.find((c) => c.id === cityId)?.name || 'Selecciona una ciudad' : 'Selecciona una ciudad'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Contacto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="call-outline" size={18} color="#2C3E50" /> Contacto
            </Text>

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +52 123 456 7890"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: contacto@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +52 123 456 7890"
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Redes Sociales y Web */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="globe-outline" size={18} color="#2C3E50" /> Web y Redes Sociales
            </Text>

            <Text style={styles.label}>Sitio Web</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: https://www.ejemplo.com"
              value={website}
              onChangeText={setWebsite}
              placeholderTextColor="#999"
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Facebook</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={facebook}
              onChangeText={setFacebook}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Instagram</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={instagram}
              onChangeText={setInstagram}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Twitter</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={twitter}
              onChangeText={setTwitter}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Botón de enviar */}
          <TouchableOpacity
            style={[styles.submitButton, (isSubmitting || isUploadingImage) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting || isUploadingImage}
          >
            {isSubmitting || isUploadingImage ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>Enviar Recomendación</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Espacio adicional */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showCategoryModal} transparent animationType="fade" onRequestClose={() => setShowCategoryModal(false)}>
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona una categoría</Text>
            <ScrollView>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.selectOption, categoryId === category.id && styles.selectOptionActive]}
                  onPress={() => {
                    setCategoryId(category.id);
                    setShowCategoryModal(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, categoryId === category.id && styles.selectOptionTextActive]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.selectModalClose} onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCountryModal} transparent animationType="fade" onRequestClose={() => setShowCountryModal(false)}>
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona un país</Text>
            <ScrollView>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country.id}
                  style={[styles.selectOption, countryId === country.id && styles.selectOptionActive]}
                  onPress={() => {
                    setCountryId(country.id);
                    setShowCountryModal(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, countryId === country.id && styles.selectOptionTextActive]}>
                    {country.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.selectModalClose} onPress={() => setShowCountryModal(false)}>
              <Text style={styles.selectModalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showCityModal} transparent animationType="fade" onRequestClose={() => setShowCityModal(false)}>
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalCard}>
            <Text style={styles.selectModalTitle}>Selecciona una ciudad</Text>
            <ScrollView>
              {cities.map((city) => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.selectOption, cityId === city.id && styles.selectOptionActive]}
                  onPress={() => {
                    setCityId(city.id);
                    setShowCityModal(false);
                  }}
                >
                  <Text style={[styles.selectOptionText, cityId === city.id && styles.selectOptionTextActive]}>
                    {city.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.selectModalClose} onPress={() => setShowCityModal(false)}>
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
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 12,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
  },
  selectText: {
    fontSize: 14,
    color: '#2C3E50',
  },
  selectPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
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
    color: '#2C3E50',
  },
  selectOptionTextActive: {
    color: '#1B8077',
    fontWeight: '700',
  },
  selectModalClose: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectModalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#59C6C0',
  },
  imagePicker: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagePlaceholder: {
    color: '#6B7280',
    fontSize: 14,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  imageActionText: {
    fontSize: 13,
    color: '#2C3E50',
  },
  imageActionRemoveText: {
    fontSize: 13,
    color: '#EF4444',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryChipSelected: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#59C6C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddRecommendationScreen;
