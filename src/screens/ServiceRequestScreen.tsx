import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import api, { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';
import * as ImagePicker from 'expo-image-picker';

interface ProfileCategory {
  id: string;
  name: string;
  icon?: string;
}

interface Country {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  countryId: string;
}

const ServiceRequestScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Estados del formulario
  const [businessName, setBusinessName] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [address, setAddress] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [extraInfo, setExtraInfo] = useState('');
  
  // Estados de carga
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Estado del modal de éxito
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Datos del servidor
  const [categories, setCategories] = useState<ProfileCategory[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    analyticsService.logScreenView('ServiceRequest');
    loadCategories();
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedCountry) {
      loadCities(selectedCountry);
    } else {
      setCities([]);
      setSelectedCity(null);
    }
  }, [selectedCountry]);

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await axiosInstance.get('/api/professionals/profile-categories');
      console.log('📋 [CATEGORIES] Respuesta:', response.data);
      
      const categoriesData = response.data?.data || response.data?.categories || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error: any) {
      console.error('❌ [CATEGORIES] Error cargando categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías. Intenta de nuevo.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await api.getCountries();
      console.log('🌍 [COUNTRIES] Respuesta:', response);
      
      const countriesData = response?.data || response?.countries || response || [];
      setCountries(Array.isArray(countriesData) ? countriesData : []);
    } catch (error: any) {
      console.error('❌ [COUNTRIES] Error cargando países:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async (countryId: string) => {
    try {
      setLoadingCities(true);
      const response = await api.getCities(countryId);
      console.log('🏙️ [CITIES] Respuesta:', response);
      
      const citiesData = response?.data || response?.cities || response || [];
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (error: any) {
      console.error('❌ [CITIES] Error cargando ciudades:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const pickLogo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a tus fotos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setLogoUri(result.assets[0].uri);
        analyticsService.logEvent('service_request_logo_selected');
        await uploadLogo(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ [LOGO] Error seleccionando logo:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const uploadLogo = async (uri: string) => {
    try {
      setIsUploadingLogo(true);

      const filename = uri.split('/').pop() || 'logo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const formData = new FormData();
      formData.append('logo', {
        uri,
        name: filename,
        type,
      } as any);

      console.log('📤 [LOGO] Subiendo logo...');
      const response = await axiosInstance.post('/api/professionals/requests/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [LOGO] Logo subido:', response.data);
      console.log('✅ [LOGO] Respuesta completa:', JSON.stringify(response.data, null, 2));
      
      const uploadedUrl = response.data?.data?.imageUrl || 
                         response.data?.imageUrl ||
                         response.data?.data?.url || 
                         response.data?.url || 
                         response.data?.data?.logoUrl ||
                         response.data?.logoUrl ||
                         '';
      
      console.log('✅ [LOGO] URL extraída:', uploadedUrl);
      
      if (!uploadedUrl) {
        console.error('❌ [LOGO] No se pudo obtener la URL del logo de la respuesta');
        Alert.alert('Error', 'El logo se subió pero no se pudo obtener la URL. Intenta de nuevo.');
        setLogoUri(null);
        return;
      }
      
      setLogoUrl(uploadedUrl);
      Alert.alert('Éxito', 'Logo subido correctamente');
    } catch (error: any) {
      console.error('❌ [LOGO] Error subiendo logo:', error);
      Alert.alert('Error', 'No se pudo subir el logo. Intenta de nuevo.');
      setLogoUri(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const validateForm = () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de tu negocio');
      return false;
    }
    if (!summary.trim()) {
      Alert.alert('Error', 'Por favor describe tu negocio');
      return false;
    }
    if (summary.trim().length < 30) {
      Alert.alert('Error', 'La descripción debe tener al menos 30 caracteres. Actualmente tiene ' + summary.trim().length + ' caracteres.');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return false;
    }
    if (!logoUrl || !logoUrl.trim()) {
      Alert.alert('Error', 'Por favor sube el logo de tu negocio');
      return false;
    }
    if (!address.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu dirección');
      return false;
    }
    if (!selectedCountry) {
      Alert.alert('Error', 'Por favor selecciona un país');
      return false;
    }
    if (!selectedCity) {
      Alert.alert('Error', 'Por favor selecciona una ciudad');
      return false;
    }
    if (!whatsappLink.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu link de WhatsApp');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      console.log('📍 [DEBUG] selectedCountry:', selectedCountry);
      console.log('📍 [DEBUG] selectedCity:', selectedCity);
      console.log('📍 [DEBUG] countries:', countries.length, 'ciudades:', cities.length);

      const requestData: any = {
        businessName: businessName.trim(),
        summary: summary.trim(),
        profileCategoryId: selectedCategory,
        logoUrl: logoUrl,
        address: address.trim(),
        countryId: selectedCountry,
        cityId: selectedCity,
        whatsappLink: whatsappLink.trim(),
        latitude: latitude && latitude.trim() ? parseFloat(latitude) : 0.0000,
        longitude: longitude && longitude.trim() ? parseFloat(longitude) : -0.0000,
      };

      // Campos opcionales
      if (website.trim()) requestData.website = website.trim();
      if (instagram.trim()) requestData.instagram = instagram.trim();
      if (extraInfo.trim()) requestData.extraInfo = extraInfo.trim();

      console.log('📤 [SERVICE REQUEST] Enviando solicitud:', requestData);
      console.log('📤 [SERVICE REQUEST] Datos completos:', JSON.stringify(requestData, null, 2));

      const response = await axiosInstance.post('/api/professionals/requests', requestData);

      console.log('✅ [SERVICE REQUEST] Solicitud enviada exitosamente:', response.data);

      analyticsService.logEvent('professional_request_submitted', {
        category: selectedCategory,
        businessName: businessName,
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ [SERVICE REQUEST] Error enviando solicitud:', error);
      console.error('❌ [SERVICE REQUEST] Error details:', error.response?.data);
      
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No pudimos enviar tu solicitud. Por favor intenta de nuevo más tarde.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCategoryObj = categories.find(c => c.id === selectedCategory);
  const selectedCountryObj = countries.find(c => c.id === selectedCountry);
  const selectedCityObj = cities.find(c => c.id === selectedCity);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Solicitud Profesional</Text>
          <Text style={styles.headerSubtitle}>Únete a la comunidad Munpa</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.contentWrapper}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Intro */}
            <View style={styles.introCard}>
              <Text style={styles.introIcon}>💜</Text>
              <Text style={styles.introTitle}>¡Crece con Munpa!</Text>
              <Text style={styles.introText}>
                Sabemos lo difícil que es emprender siendo mamá o papá. Déjanos ayudarte a conectar tu negocio con miles de familias que necesitan tus servicios. ¡Juntos llegamos más lejos!
              </Text>
            </View>

            {/* Logo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Logo del Negocio <Text style={styles.required}>*</Text>
              </Text>
              
              <TouchableOpacity 
                style={styles.logoUploadButton}
                onPress={pickLogo}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <ActivityIndicator size="large" color="#96d2d3" />
                ) : logoUri ? (
                  <Image source={{ uri: logoUri }} style={styles.logoPreview} />
                ) : (
                  <View style={styles.logoPlaceholder}>
                    <Ionicons name="image-outline" size={48} color="#CCC" />
                    <Text style={styles.logoPlaceholderText}>Toca para subir logo *</Text>
                    <Text style={styles.logoPlaceholderSubtext}>(Obligatorio)</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Información del Negocio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información del Negocio</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Nombre del Negocio <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Fotografía Infantil Luna"
                  value={businessName}
                  onChangeText={setBusinessName}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Descripción / Resumen <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Escribe un resumen de tu negocio. OJO, esta es la información que verán los clientes, así que métele corazón!"
                  value={summary}
                  onChangeText={setSummary}
                  multiline
                  numberOfLines={4}
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={[
                  styles.charCount,
                  summary.trim().length < 30 && summary.length > 0 && styles.charCountError
                ]}>
                  {summary.length}/500 (mínimo 30 caracteres)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Categoría <Text style={styles.required}>*</Text>
                </Text>
                {loadingCategories ? (
                  <ActivityIndicator size="small" color="#96d2d3" style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => {
                        Alert.alert(
                          'Selecciona una categoría',
                          '',
                          [
                            ...categories.map(cat => ({
                              text: cat.name,
                              onPress: () => setSelectedCategory(cat.id),
                            })),
                            { text: 'Cancelar', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Text style={selectedCategory ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                        {selectedCategoryObj?.name || 'Selecciona una categoría'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                    <View style={styles.helperTextContainer}>
                      <Ionicons name="information-circle-outline" size={16} color="#96d2d3" />
                      <Text style={styles.helperText}>
                        ¿No encuentras tu categoría o aplica a más de una? Selecciona la que más se parezca y descríbelo en "Información Adicional".
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Ubicación */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>

              <View style={styles.helperTextContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#96d2d3" />
                <Text style={styles.helperText}>
                  ¿Tu negocio es digital, ofreces asesorías o entregas a nivel nacional? Selecciona la dirección de donde te encuentres y especifica lo demás en "Información Adicional".
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Dirección <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Calle, número, sector..."
                  value={address}
                  onChangeText={setAddress}
                  maxLength={200}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  País <Text style={styles.required}>*</Text>
                </Text>
                {loadingCountries ? (
                  <ActivityIndicator size="small" color="#96d2d3" style={{ marginVertical: 20 }} />
                ) : (
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => {
                      Alert.alert(
                        'Selecciona un país',
                        '',
                        [
                          ...countries.map(country => ({
                            text: country.name,
                            onPress: () => {
                              console.log('🌍 [PAÍS SELECCIONADO] ID:', country.id, 'Nombre:', country.name);
                              setSelectedCountry(country.id);
                            },
                          })),
                          { text: 'Cancelar', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Text style={selectedCountry ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                      {selectedCountryObj?.name || 'Selecciona un país'}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              {selectedCountry && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    Ciudad <Text style={styles.required}>*</Text>
                  </Text>
                  {loadingCities ? (
                    <ActivityIndicator size="small" color="#96d2d3" style={{ marginVertical: 20 }} />
                  ) : (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => {
                        if (cities.length === 0) {
                          Alert.alert('Sin ciudades', 'No hay ciudades disponibles para este país');
                          return;
                        }
                        Alert.alert(
                          'Selecciona una ciudad',
                          '',
                          [
                            ...cities.map(city => ({
                              text: city.name,
                              onPress: () => {
                                console.log('🏙️ [CIUDAD SELECCIONADA] ID:', city.id, 'Nombre:', city.name);
                                setSelectedCity(city.id);
                              },
                            })),
                            { text: 'Cancelar', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Text style={selectedCity ? styles.pickerButtonTextSelected : styles.pickerButtonText}>
                        {selectedCityObj?.name || 'Selecciona una ciudad'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Latitud (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="-0.1807"
                    value={latitude}
                    onChangeText={setLatitude}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Longitud (opcional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="-78.4678"
                    value={longitude}
                    onChangeText={setLongitude}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Redes y Contacto */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Redes y Contacto</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Sitio Web</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://tunegocio.com"
                  value={website}
                  onChangeText={setWebsite}
                  keyboardType="url"
                  autoCapitalize="none"
                  maxLength={200}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Instagram</Text>
                <TextInput
                  style={styles.input}
                  placeholder="@tunegocio"
                  value={instagram}
                  onChangeText={setInstagram}
                  autoCapitalize="none"
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  WhatsApp Link <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://wa.me/593..."
                  value={whatsappLink}
                  onChangeText={setWhatsappLink}
                  keyboardType="url"
                  autoCapitalize="none"
                  maxLength={200}
                />
              </View>
            </View>

            {/* Información Adicional */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información Adicional</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>¿Algo más que quieras contarnos?</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Horarios, precios, experiencia, certificaciones, etc."
                  value={extraInfo}
                  onChangeText={setExtraInfo}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{extraInfo.length} caracteres</Text>
              </View>
            </View>

            {/* Botón de Envío */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Enviar Solicitud</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Nota Legal */}
            <View style={styles.legalNote}>
              <Ionicons name="information-circle-outline" size={20} color="#7F8C8D" />
              <Text style={styles.legalText}>
                Al enviar esta solicitud, aceptas que Munpa revise tu información y se ponga en
                contacto contigo para evaluar tu participación en nuestra plataforma.
              </Text>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Modal de Éxito */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.successModalContent}>
            {/* Corazones decorativos */}
            <View style={styles.heartsContainer}>
              <Text style={styles.heartEmoji}>💜</Text>
              <Text style={[styles.heartEmoji, styles.heartSmall]}>💜</Text>
              <Text style={[styles.heartEmoji, styles.heartSmall]}>💜</Text>
            </View>

            {/* Título principal */}
            <Text style={styles.successTitle}>¡Estamos emocionados!</Text>
            
            {/* Subtítulo */}
            <Text style={styles.successSubtitle}>
              ¡Esperamos que tu negocio sea parte de Munpa! 🎉
            </Text>

            {/* Mensajes informativos con íconos */}
            <View style={styles.infoMessagesContainer}>
              <View style={styles.infoMessageRow}>
                <Text style={styles.infoIcon}>✨</Text>
                <Text style={styles.infoMessage}>
                  Tu solicitud será revisada por nuestro equipo
                </Text>
              </View>

              <View style={styles.infoMessageRow}>
                <Text style={styles.infoIcon}>📞</Text>
                <Text style={styles.infoMessage}>
                  Nos contactaremos contigo, así que asegúrate de que tus datos estén correctos
                </Text>
              </View>

              <View style={styles.infoMessageRow}>
                <Text style={styles.infoIcon}>⏰</Text>
                <Text style={styles.infoMessage}>
                  El tiempo de aprobación o rechazo puede demorar hasta 7 días
                </Text>
              </View>

              <View style={styles.infoMessageRow}>
                <Text style={styles.infoIcon}>📱</Text>
                <Text style={styles.infoMessage}>
                  Si es aprobada, activaremos una nueva sección en tu app para que administres tu perfil profesional
                </Text>
              </View>
            </View>

            {/* Slogan */}
            <View style={styles.sloganContainer}>
              <Text style={styles.sloganText}>🤝 Mom Support Mom</Text>
              <Text style={styles.sloganSubtext}>Mamás que crecen juntas</Text>
            </View>

            {/* Mensaje de redes sociales */}
            <Text style={styles.socialMessage}>
              💬 Para más info, búscanos en nuestras redes sociales
            </Text>

            {/* Botón de cierre */}
            <TouchableOpacity
              style={styles.successButton}
              onPress={() => {
                analyticsService.logEvent('service_request_success_modal_closed');
                setShowSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.successButtonText}>¡Genial!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#96d2d3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 2,
    opacity: 0.9,
  },
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  introIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  introText: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
  },
  logoUploadButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E8ECEF',
    borderStyle: 'dashed',
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  logoPlaceholder: {
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 8,
    textAlign: 'center',
  },
  logoPlaceholderSubtext: {
    fontSize: 11,
    color: '#E74C3C',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 8,
  },
  required: {
    color: '#E74C3C',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#2C3E50',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  charCount: {
    fontSize: 12,
    color: '#7F8C8D',
    textAlign: 'right',
    marginTop: 4,
  },
  charCountError: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  pickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#999',
  },
  pickerButtonTextSelected: {
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F0F9F9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#96d2d3',
  },
  helperText: {
    flex: 1,
    fontSize: 13,
    color: '#5A7A7A',
    lineHeight: 18,
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#96d2d3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#59C6C0',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#BDC3C7',
    shadowOpacity: 0.1,
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  legalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  legalText: {
    flex: 1,
    fontSize: 13,
    color: '#7F8C8D',
    lineHeight: 18,
    marginLeft: 8,
  },
  // Estilos del modal de éxito
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  heartsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heartEmoji: {
    fontSize: 50,
    marginHorizontal: 5,
  },
  heartSmall: {
    fontSize: 30,
    opacity: 0.7,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#887CBC',
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 18,
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 24,
  },
  infoMessagesContainer: {
    width: '100%',
    marginBottom: 20,
  },
  infoMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  infoIcon: {
    fontSize: 22,
    marginRight: 12,
    marginTop: 2,
  },
  infoMessage: {
    flex: 1,
    fontSize: 15,
    color: '#34495E',
    lineHeight: 22,
  },
  sloganContainer: {
    backgroundColor: '#F8F0FF',
    borderRadius: 15,
    padding: 18,
    marginBottom: 18,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8D5FF',
  },
  sloganText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#887CBC',
    marginBottom: 4,
  },
  sloganSubtext: {
    fontSize: 14,
    color: '#7F8C8D',
    fontStyle: 'italic',
  },
  socialMessage: {
    fontSize: 14,
    color: '#7F8C8D',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: '#96d2d3',
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#96d2d3',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  successButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ServiceRequestScreen;
