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
import * as DocumentPicker from 'expo-document-picker';

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

type RequestType = 'business' | 'professional';
type AccountType = 'specialist' | 'nutritionist' | 'coach' | 'psychologist';

const ServiceRequestScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Tipo de solicitud
  const [requestType, setRequestType] = useState<RequestType>('business');

  // Estados del formulario para NEGOCIO
  const [businessName, setBusinessName] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [logoStoragePath, setLogoStoragePath] = useState<string>('');
  const [address, setAddress] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [whatsappLink, setWhatsappLink] = useState('');
  const [extraInfo, setExtraInfo] = useState('');

  // Estados del formulario para PROFESIONAL MÉDICO
  const [accountType, setAccountType] = useState<AccountType>('specialist');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certificationInput, setCertificationInput] = useState('');
  const [documents, setDocuments] = useState<string[]>([]);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  
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
        mediaTypes: ['images'],
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
      
      const storagePath = response.data?.data?.storagePath ||
                         response.data?.storagePath ||
                         response.data?.data?.path ||
                         response.data?.path ||
                         '';
      
      console.log('✅ [LOGO] URL extraída:', uploadedUrl);
      console.log('✅ [LOGO] Storage path extraído:', storagePath);
      
      if (!uploadedUrl) {
        console.error('❌ [LOGO] No se pudo obtener la URL del logo de la respuesta');
        Alert.alert('Error', 'El logo se subió pero no se pudo obtener la URL. Intenta de nuevo.');
        setLogoUri(null);
        return;
      }
      
      setLogoUrl(uploadedUrl);
      setLogoStoragePath(storagePath);
      Alert.alert('Éxito', 'Logo subido correctamente');
    } catch (error: any) {
      console.error('❌ [LOGO] Error subiendo logo:', error);
      Alert.alert('Error', 'No se pudo subir el logo. Intenta de nuevo.');
      setLogoUri(null);
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const pickDocument = async () => {
    try {
      Alert.alert(
        'Seleccionar Documento',
        'Elige cómo quieres subir tu documento',
        [
          {
            text: 'Tomar Foto',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso necesario', 'Se necesita permiso para usar la cámara');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: false,
                quality: 0.9,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadDocument(result.assets[0].uri, 'photo');
              }
            },
          },
          {
            text: 'Galería de Fotos',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a tus fotos');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: false,
                quality: 0.9,
              });

              if (!result.canceled && result.assets[0]) {
                await uploadDocument(result.assets[0].uri, 'photo');
              }
            },
          },
          {
            text: 'Seleccionar Archivo',
            onPress: async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
              });

              console.log('📄 [DOCUMENT PICKER] Result:', result);

              if (!result.canceled && result.assets && result.assets[0]) {
                await uploadDocument(result.assets[0].uri, 'file', result.assets[0].name, result.assets[0].mimeType);
              }
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('❌ [DOCUMENT] Error seleccionando documento:', error);
      Alert.alert('Error', 'No se pudo seleccionar el documento');
    }
  };

  const uploadDocument = async (uri: string, source: 'photo' | 'file' = 'photo', fileName?: string, mimeType?: string) => {
    try {
      setUploadingDocument(true);

      const filename = fileName || uri.split('/').pop() || 'document.jpg';
      let type = mimeType;

      // Si no tenemos mimeType, inferirlo de la extensión
      if (!type) {
        const match = /\.(\w+)$/.exec(filename);
        if (match) {
          const ext = match[1].toLowerCase();
          if (ext === 'pdf') {
            type = 'application/pdf';
          } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
          } else {
            type = 'application/octet-stream';
          }
        } else {
          type = 'image/jpeg';
        }
      }

      const formData = new FormData();
      formData.append('document', {
        uri,
        name: filename,
        type,
      } as any);

      console.log('📤 [DOCUMENT] Subiendo documento:', { filename, type, source });
      const response = await axiosInstance.post('/api/professionals/requests/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [DOCUMENT] Documento subido:', response.data);
      
      const uploadedUrl = response.data?.data?.documentUrl || 
                         response.data?.documentUrl ||
                         response.data?.data?.url || 
                         response.data?.url ||
                         '';
      
      if (!uploadedUrl) {
        Alert.alert('Error', 'El documento se subió pero no se pudo obtener la URL.');
        return;
      }
      
      setDocuments([...documents, uploadedUrl]);
      Alert.alert('Éxito', 'Documento subido correctamente');
    } catch (error: any) {
      console.error('❌ [DOCUMENT] Error subiendo documento:', error);
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
    } finally {
      setUploadingDocument(false);
    }
  };

  const removeDocument = (index: number) => {
    const newDocuments = [...documents];
    newDocuments.splice(index, 1);
    setDocuments(newDocuments);
  };

  const addSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    const newSpecialties = [...specialties];
    newSpecialties.splice(index, 1);
    setSpecialties(newSpecialties);
  };

  const addCertification = () => {
    if (certificationInput.trim() && !certifications.includes(certificationInput.trim())) {
      setCertifications([...certifications, certificationInput.trim()]);
      setCertificationInput('');
    }
  };

  const removeCertification = (index: number) => {
    const newCertifications = [...certifications];
    newCertifications.splice(index, 1);
    setCertifications(newCertifications);
  };

  const validateBusinessForm = () => {
    // ✅ Campos REQUERIDOS por el API
    if (!businessName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de tu negocio');
      return false;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return false;
    }

    // 📝 Validaciones adicionales de UX (recomendadas pero no obligatorias por el API)
    if (summary.trim() && summary.trim().length < 30) {
      Alert.alert('Error', 'La descripción debe tener al menos 30 caracteres. Actualmente tiene ' + summary.trim().length + ' caracteres.');
      return false;
    }

    // Validación de logo (recomendado para mejor calidad)
    if (!logoUrl || !logoUrl.trim()) {
      Alert.alert('Advertencia', '¿Estás seguro de enviar sin logo? Es importante para tu negocio.', [
        { text: 'Agregar logo', style: 'cancel' },
        { text: 'Continuar sin logo', onPress: () => true, style: 'destructive' }
      ]);
      return false;
    }

    return true;
  };

  const validateProfessionalForm = () => {
    // ✅ Campos REQUERIDOS
    if (!displayName.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'Por favor ingresa tu número de teléfono');
      return false;
    }
    if (specialties.length === 0) {
      Alert.alert('Error', 'Por favor agrega al menos una especialidad');
      return false;
    }
    if (documents.length === 0) {
      Alert.alert('Error', 'Por favor sube al menos un documento (título, cédula profesional, etc.)');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (requestType === 'business') {
      await handleBusinessSubmit();
    } else {
      await handleProfessionalSubmit();
    }
  };

  const handleBusinessSubmit = async () => {
    if (!validateBusinessForm()) return;

    setIsSubmitting(true);

    try {
      console.log('📍 [DEBUG] selectedCountry:', selectedCountry);
      console.log('📍 [DEBUG] selectedCity:', selectedCity);
      console.log('📍 [DEBUG] countries:', countries.length, 'ciudades:', cities.length);

      // ✅ Campos Requeridos
      const requestData: any = {
        businessName: businessName.trim(),
        profileCategoryId: selectedCategory,
      };

      // 📝 Campos Opcionales - Solo agregar si tienen valor
      // Ubicación
      if (selectedCountry) requestData.countryId = selectedCountry;
      if (selectedCity) requestData.cityId = selectedCity;
      if (address.trim()) requestData.address = address.trim();
      if (latitude && latitude.trim() && parseFloat(latitude) !== 0) {
        requestData.latitude = parseFloat(latitude);
      }
      if (longitude && longitude.trim() && parseFloat(longitude) !== 0) {
        requestData.longitude = parseFloat(longitude);
      }

      // Descripción
      if (summary.trim()) requestData.summary = summary.trim();
      if (extraInfo.trim()) requestData.extraInfo = extraInfo.trim();

      // Contacto
      if (whatsappLink.trim()) requestData.whatsappLink = whatsappLink.trim();
      if (instagram.trim()) requestData.instagram = instagram.trim().replace('@', ''); // Remover @ si existe
      if (website.trim()) requestData.website = website.trim();

      // Logo/Imagen
      if (logoUrl) requestData.logoUrl = logoUrl;
      if (logoStoragePath) requestData.logoStoragePath = logoStoragePath;

      console.log('📤 [SERVICE REQUEST] Enviando solicitud a /api/profile/request-service');
      console.log('📤 [SERVICE REQUEST] Datos completos:', JSON.stringify(requestData, null, 2));

      const response = await axiosInstance.post('/api/profile/request-service', requestData);

      console.log('✅ [SERVICE REQUEST] Solicitud enviada exitosamente:', response.data);

      analyticsService.logEvent('professional_request_submitted', {
        category: selectedCategory,
        businessName: businessName,
        type: 'business',
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

  const handleProfessionalSubmit = async () => {
    if (!validateProfessionalForm()) return;

    setIsSubmitting(true);

    try {
      const requestData: any = {
        accountType: accountType,
        personalInfo: {
          displayName: displayName.trim(),
          phone: phone.trim(),
        },
        professional: {
          specialties: specialties,
        },
        documents: documents,
      };

      // Campos opcionales de personalInfo
      if (bio.trim()) requestData.personalInfo.bio = bio.trim();

      // Campos opcionales de professional
      if (licenseNumber.trim()) requestData.professional.licenseNumber = licenseNumber.trim();
      if (university.trim()) requestData.professional.university = university.trim();
      if (yearsExperience.trim() && parseInt(yearsExperience) > 0) {
        requestData.professional.yearsExperience = parseInt(yearsExperience);
      }
      if (certifications.length > 0) requestData.professional.certifications = certifications;

      console.log('📤 [PROFESSIONAL REQUEST] Enviando solicitud a /api/profile/request-professional');
      console.log('📤 [PROFESSIONAL REQUEST] Datos completos:', JSON.stringify(requestData, null, 2));

      const response = await axiosInstance.post('/api/profile/request-professional', requestData);

      console.log('✅ [PROFESSIONAL REQUEST] Solicitud enviada exitosamente:', response.data);

      analyticsService.logEvent('professional_request_submitted', {
        accountType: accountType,
        displayName: displayName,
        type: 'medical',
      });

      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('❌ [PROFESSIONAL REQUEST] Error enviando solicitud:', error);
      console.error('❌ [PROFESSIONAL REQUEST] Error details:', error.response?.data);
      
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

            {/* Selector de Tipo de Solicitud */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tipo de Solicitud</Text>
              <View style={styles.requestTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.requestTypeCard,
                    requestType === 'business' && styles.requestTypeCardActive
                  ]}
                  onPress={() => setRequestType('business')}
                >
                  <Ionicons 
                    name="storefront" 
                    size={32} 
                    color={requestType === 'business' ? '#96d2d3' : '#7F8C8D'} 
                  />
                  <Text style={[
                    styles.requestTypeTitle,
                    requestType === 'business' && styles.requestTypeTitleActive
                  ]}>
                    Negocio / Servicio
                  </Text>
                  <Text style={styles.requestTypeDescription}>
                    Productos, servicios, emprendimientos
                  </Text>
                  {requestType === 'business' && (
                    <View style={styles.requestTypeCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#96d2d3" />
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.requestTypeCard,
                    requestType === 'professional' && styles.requestTypeCardActive
                  ]}
                  onPress={() => setRequestType('professional')}
                >
                  <Ionicons 
                    name="medical" 
                    size={32} 
                    color={requestType === 'professional' ? '#887CBC' : '#7F8C8D'} 
                  />
                  <Text style={[
                    styles.requestTypeTitle,
                    requestType === 'professional' && styles.requestTypeTitleActiveProfessional
                  ]}>
                    Profesional Médico
                  </Text>
                  <Text style={styles.requestTypeDescription}>
                    Consultas médicas, nutrición, psicología
                  </Text>
                  {requestType === 'professional' && (
                    <View style={styles.requestTypeCheckmark}>
                      <Ionicons name="checkmark-circle" size={24} color="#887CBC" />
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Formulario de NEGOCIO */}
            {requestType === 'business' && (
              <>
                {/* Logo */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Logo del Negocio <Text style={styles.optional}>(Recomendado)</Text>
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
                    <Text style={styles.logoPlaceholderText}>Toca para subir logo</Text>
                    <Text style={styles.logoPlaceholderSubtext}>(Recomendado)</Text>
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
                  Descripción / Resumen <Text style={styles.optional}>(Recomendado)</Text>
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
                  {summary.length}/500 (recomendado mínimo 30 caracteres)
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
              <Text style={styles.sectionTitle}>Ubicación <Text style={styles.optional}>(Opcional)</Text></Text>

              <View style={styles.helperTextContainer}>
                <Ionicons name="information-circle-outline" size={16} color="#96d2d3" />
                <Text style={styles.helperText}>
                  ¿Tu negocio es digital, ofreces asesorías o entregas a nivel nacional? Selecciona la dirección de donde te encuentres y especifica lo demás en "Información Adicional".
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Dirección
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
                  País
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
                    Ciudad
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
                  WhatsApp Link
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://wa.me/593... o +593999999999"
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
              </>
            )}

            {/* Formulario de PROFESIONAL MÉDICO */}
            {requestType === 'professional' && (
              <>
                {/* Tipo de Cuenta */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Tipo de Profesional <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.accountTypeGrid}>
                    {[
                      { id: 'specialist', label: 'Médico Especialista', icon: 'medical' },
                      { id: 'nutritionist', label: 'Nutricionista', icon: 'nutrition' },
                      { id: 'psychologist', label: 'Psicólogo', icon: 'happy' },
                      { id: 'coach', label: 'Coach', icon: 'fitness' },
                    ].map((type) => (
                      <TouchableOpacity
                        key={type.id}
                        style={[
                          styles.accountTypeButton,
                          accountType === type.id && styles.accountTypeButtonActive
                        ]}
                        onPress={() => setAccountType(type.id as AccountType)}
                      >
                        <Ionicons 
                          name={type.icon as any} 
                          size={24} 
                          color={accountType === type.id ? '#887CBC' : '#7F8C8D'} 
                        />
                        <Text style={[
                          styles.accountTypeLabel,
                          accountType === type.id && styles.accountTypeLabelActive
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Información Personal */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Información Personal</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Nombre Completo <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Dr. Juan Pérez / Lic. María García"
                      value={displayName}
                      onChangeText={setDisplayName}
                      maxLength={100}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Teléfono <Text style={styles.required}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholder="+593999999999"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={20}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Biografía Profesional</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe tu experiencia, especialización y enfoque profesional..."
                      value={bio}
                      onChangeText={setBio}
                      multiline
                      numberOfLines={4}
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{bio.length}/500</Text>
                  </View>
                </View>

                {/* Información Profesional */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Información Profesional</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Especialidades <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.tagInputContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Ej: Pediatría, Neonatología"
                        value={specialtyInput}
                        onChangeText={setSpecialtyInput}
                        onSubmitEditing={addSpecialty}
                        maxLength={50}
                      />
                      <TouchableOpacity 
                        style={styles.addTagButton}
                        onPress={addSpecialty}
                      >
                        <Ionicons name="add-circle" size={32} color="#96d2d3" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tagsContainer}>
                      {specialties.map((specialty, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{specialty}</Text>
                          <TouchableOpacity onPress={() => removeSpecialty(index)}>
                            <Ionicons name="close-circle" size={18} color="#E74C3C" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Número de Licencia / Cédula Profesional</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="MSP-12345-2020"
                      value={licenseNumber}
                      onChangeText={setLicenseNumber}
                      maxLength={50}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Universidad</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Universidad Central del Ecuador"
                      value={university}
                      onChangeText={setUniversity}
                      maxLength={100}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Años de Experiencia</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="10"
                      value={yearsExperience}
                      onChangeText={setYearsExperience}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Certificaciones</Text>
                    <View style={styles.tagInputContainer}>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Ej: Certificación en Pediatría"
                        value={certificationInput}
                        onChangeText={setCertificationInput}
                        onSubmitEditing={addCertification}
                        maxLength={100}
                      />
                      <TouchableOpacity 
                        style={styles.addTagButton}
                        onPress={addCertification}
                      >
                        <Ionicons name="add-circle" size={32} color="#96d2d3" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tagsContainer}>
                      {certifications.map((cert, index) => (
                        <View key={index} style={styles.tag}>
                          <Text style={styles.tagText}>{cert}</Text>
                          <TouchableOpacity onPress={() => removeCertification(index)}>
                            <Ionicons name="close-circle" size={18} color="#E74C3C" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>

                {/* Documentos */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Documentos <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.helperTextContainer}>
                    <Ionicons name="information-circle-outline" size={16} color="#887CBC" />
                    <Text style={styles.helperText}>
                      Sube tu título profesional, cédula profesional, licencia o cualquier documento que valide tu práctica. Puedes tomar fotos, seleccionar de tu galería o subir archivos PDF.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.uploadDocumentButton}
                    onPress={pickDocument}
                    disabled={uploadingDocument}
                  >
                    {uploadingDocument ? (
                      <ActivityIndicator size="small" color="#887CBC" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={24} color="#887CBC" />
                        <Text style={styles.uploadDocumentText}>
                          Subir Foto o Archivo (PDF, Imagen)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.documentsContainer}>
                    {documents.map((doc, index) => (
                      <View key={index} style={styles.documentItem}>
                        <Ionicons name="document-text" size={20} color="#96d2d3" />
                        <Text style={styles.documentName} numberOfLines={1}>
                          Documento {index + 1}
                        </Text>
                        <TouchableOpacity onPress={() => removeDocument(index)}>
                          <Ionicons name="trash" size={20} color="#E74C3C" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}

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
    color: '#7F8C8D',
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
  optional: {
    color: '#7F8C8D',
    fontSize: 13,
    fontWeight: '400',
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
  // Estilos para selector de tipo
  requestTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  requestTypeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8ECEF',
    position: 'relative',
  },
  requestTypeCardActive: {
    borderColor: '#96d2d3',
    backgroundColor: '#F0F9F9',
  },
  requestTypeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 12,
    textAlign: 'center',
  },
  requestTypeTitleActive: {
    color: '#96d2d3',
  },
  requestTypeTitleActiveProfessional: {
    color: '#887CBC',
  },
  requestTypeDescription: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 4,
    textAlign: 'center',
  },
  requestTypeCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  // Estilos para tipo de cuenta
  accountTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  accountTypeButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8ECEF',
  },
  accountTypeButtonActive: {
    borderColor: '#887CBC',
    backgroundColor: '#F8F0FF',
  },
  accountTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C3E50',
    marginTop: 8,
    textAlign: 'center',
  },
  accountTypeLabelActive: {
    color: '#887CBC',
  },
  // Estilos para tags (especialidades/certificaciones)
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addTagButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F4F8',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    color: '#2C3E50',
    fontWeight: '500',
  },
  // Estilos para documentos
  uploadDocumentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F0FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#887CBC',
    borderStyle: 'dashed',
    gap: 8,
  },
  uploadDocumentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#887CBC',
  },
  documentsContainer: {
    marginTop: 16,
    gap: 8,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    gap: 12,
  },
  documentName: {
    flex: 1,
    fontSize: 14,
    color: '#2C3E50',
  },
});

export default ServiceRequestScreen;
