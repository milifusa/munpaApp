import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import consultationsService, { Symptom, URGENCY_LEVELS } from '../services/consultationsService';
import { imageUploadService } from '../services/imageUploadService';
import { useAuth } from '../contexts/AuthContext';
import analyticsService from '../services/analyticsService';

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_ACCENT = '#59C6C0';
const TEXT_PRIMARY = '#1F2937';

const QUICK_CONCERNS = [
  'Fiebre',
  'No quiere comer',
  'Llanto o irritabilidad',
  'Piel o sarpullido',
  'Sueño',
  'Vómito o diarrea',
];

const ConsultationRequestScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const specialistId = route.params?.specialistId;
  const specialistName = route.params?.specialistName;

  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [consultationType, setConsultationType] = useState<'chat' | 'video'>('chat');
  const [urgency, setUrgency] = useState<'low' | 'normal' | 'high'>('normal');
  const [couponCode, setCouponCode] = useState('');
  const [chatPricing, setChatPricing] = useState<any>(null);
  const [videoPricing, setVideoPricing] = useState<any>(null);
  const [specialist, setSpecialist] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSymptoms, setShowSymptoms] = useState(false);
  const [showCoupon, setShowCoupon] = useState(false);

  const specialistDisplayName = specialist?.displayName || specialistName;
  const specialistSpecialty = specialist?.specialties?.[0] || 'Especialista';
  const currentPricing = consultationType === 'chat' ? chatPricing : videoPricing;
  const fallbackPrice = consultationType === 'chat'
    ? specialist?.pricing?.chatConsultation ?? 5
    : specialist?.pricing?.videoConsultation ?? 15;
  const totalPrice = currentPricing?.finalPrice ?? fallbackPrice;
  const isReadyToSubmit = Boolean(selectedChild && description.trim().length >= 20);

  useEffect(() => {
    loadInitialData();
    analyticsService.logScreenView('ConsultationRequest');
  }, []);

  useEffect(() => {
    // Calcular precios para ambos tipos cuando cambia el cupón
    calculateBothPrices();
  }, [couponCode, specialist]);

  const calculateBothPrices = async () => {
    try {
      // Calcular precio para chat
      const chatResponse = await consultationsService.calculatePrice(
        'chat',
        specialistId,
        couponCode || undefined
      );
      setChatPricing(chatResponse.data || chatResponse);

      // Calcular precio para video
      const videoResponse = await consultationsService.calculatePrice(
        'video',
        specialistId,
        couponCode || undefined
      );
      setVideoPricing(videoResponse.data || videoResponse);
    } catch (error) {
      console.error('❌ Error calculando precios:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'No se encontró token de autenticación');
        setLoading(false);
        return;
      }

      // Cargar datos en paralelo
      const promises: any[] = [
        fetch('https://api.munpa.online/api/auth/children', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }),
        consultationsService.getSymptoms(),
      ];

      // Si hay specialistId, cargar también los datos del especialista
      if (specialistId) {
        promises.push(consultationsService.getSpecialist(specialistId));
      }

      const results = await Promise.all(promises);
      const childrenResponse = results[0];
      const symptomsData = results[1];
      const specialistData = results[2];

      const childrenData = await childrenResponse.json();
      
      let childrenList = [];
      if (Array.isArray(childrenData)) {
        childrenList = childrenData;
      } else if (childrenData?.children && Array.isArray(childrenData.children)) {
        childrenList = childrenData.children;
      } else if (childrenData?.data?.children && Array.isArray(childrenData.data.children)) {
        childrenList = childrenData.data.children;
      } else if (childrenData?.data && Array.isArray(childrenData.data)) {
        childrenList = childrenData.data;
      }
      
      
      const validChildren = childrenList.filter((c: any) => c && c.id && c.name);
      
      setChildren(validChildren);
      
      if (validChildren.length > 0) {
        setSelectedChild(validChildren[0]);
      }

      const symptomsDataList = symptomsData.data || symptomsData;
      setSymptoms(Array.isArray(symptomsDataList) ? symptomsDataList : []);

      // Si se cargó el especialista, guardarlo
      if (specialistData) {
        const specialistInfo = specialistData.data || specialistData;
        setSpecialist(specialistInfo);
        
        // Establecer precios iniciales del especialista
        if (specialistInfo.pricing) {
        }
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos necesarios');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para subir fotos');
        return;
      }

      setUploadingImage(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - photos.length,
      });

      if (!result.canceled && result.assets) {
        for (const asset of result.assets) {
          try {
            const uploadedUrl = await imageUploadService.uploadImage(asset.uri);
            setPhotos(prev => [...prev, uploadedUrl]);
          } catch (uploadError) {
            console.error('❌ Error subiendo imagen:', uploadError);
            Alert.alert('Error', 'No se pudo subir una de las imágenes');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId)
        ? prev.filter(id => id !== symptomId)
        : [...prev, symptomId]
    );
  };

  const addConcernToDescription = (concern: string) => {
    if (description.toLowerCase().includes(concern.toLowerCase())) {
      return;
    }

    const nextText = description.trim()
      ? `${description.trim()}\n${concern}: `
      : `${concern}: `;

    setDescription(nextText);
  };

  const handleSubmit = async () => {
    if (!selectedChild) {
      Alert.alert('Error', 'Debes seleccionar un hijo');
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert('Error', 'La descripción debe tener al menos 20 caracteres');
      return;
    }

    try {
      setSubmitting(true);


      const consultationData = {
        description: description.trim(),
        photos,
        symptoms: selectedSymptoms,
        type: consultationType,
        urgency,
        preferredSpecialistId: specialistId,
        couponCode: couponCode || undefined,
      };


      const response = await consultationsService.createConsultation(selectedChild.id, consultationData);
      const consultation = response.data || response;


      const consultationId = consultation.consultationId || consultation.id;
      const finalPrice = consultation.pricing?.finalPrice ?? (consultationType === 'chat' ? chatPricing?.finalPrice : videoPricing?.finalPrice) ?? 0;
      const status = consultation.status || 'awaiting_payment';
      const needsPayment = (finalPrice > 0) || (status === 'awaiting_payment');

      analyticsService.logEvent('consultation_created', {
        consultation_id: consultationId,
        type: consultationType,
        urgency,
        has_photos: photos.length > 0,
        symptoms_count: selectedSymptoms.length,
        has_coupon: !!couponCode,
        price: finalPrice,
      });

      if (needsPayment) {
        Alert.alert(
          'Consulta creada',
          `Tu solicitud ha sido creada. Debes pagar $${finalPrice} para que el especialista la reciba.`,
          [
            {
              text: 'Ir a pagar',
              onPress: () => navigation.replace('ConsultationDetail', { consultationId }),
            },
          ]
        );
      } else {
        Alert.alert(
          'Consulta creada',
          'Tu solicitud de consulta ha sido creada exitosamente. Un especialista te atenderá pronto.',
          [
            {
              text: 'Ver consulta',
              onPress: () => {
                navigation.replace('ConsultationDetail', { consultationId });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ Error creando consulta:', error);
      console.error('❌ Error response:', error.response?.data);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear la consulta. Intenta nuevamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
        <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consulta con especialista</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
      
      <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consulta con especialista</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.consultationHero}>
            <View style={styles.heroIcon}>
              <Ionicons name="heart-circle" size={26} color={MUNPA_ACCENT} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Preparemos tu consulta</Text>
              <Text style={styles.heroText}>
                Cuéntanos qué pasa y reunimos la información clave para el especialista.
              </Text>
            </View>
          </View>

          {specialistDisplayName && (
            <View style={styles.specialistSummaryCard}>
              {specialist?.photoUrl ? (
                <Image source={{ uri: specialist.photoUrl }} style={styles.specialistSummaryPhoto} />
              ) : (
                <View style={styles.specialistSummaryPhoto}>
                  <Text style={styles.specialistSummaryInitial}>
                    {specialistDisplayName.substring(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.specialistSummaryInfo}>
                <Text style={styles.specialistSummaryLabel}>Te atenderá</Text>
                <Text style={styles.specialistSummaryName} numberOfLines={1}>
                  {specialistDisplayName}
                </Text>
                <View style={styles.specialistSummaryMeta}>
                  <Ionicons name="checkmark-circle" size={15} color="#22C55E" />
                  <Text style={styles.specialistSummaryMetaText} numberOfLines={1}>
                    {specialistSpecialty}
                  </Text>
                </View>
              </View>
              <View style={styles.specialistSummaryPrice}>
                <Text style={styles.specialistPriceLabel}>Desde</Text>
                <Text style={styles.specialistPriceValue}>
                  ${specialist?.pricing?.chatConsultation ?? totalPrice}
                </Text>
              </View>
            </View>
          )}

          {/* Seleccionar hijo */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="person" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Paciente</Text>
                <Text style={styles.cardSubtitle}>Selecciona para quién es la consulta</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childrenScroll}>
              {children && children.length > 0 && children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.childCard, selectedChild?.id === child.id && styles.childCardActive]}
                  onPress={() => setSelectedChild(child)}
                  activeOpacity={0.7}
                >
                  {child.photoUrl ? (
                    <Image 
                      source={{ uri: child.photoUrl }} 
                      style={styles.childPhoto}
                    />
                  ) : (
                    <View style={styles.childPhoto}>
                      <Text style={styles.childPhotoText}>
                        {child.name.substring(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.childName, selectedChild?.id === child.id && styles.childNameActive]}>
                    {child.name}
                  </Text>
                  {selectedChild?.id === child.id && (
                    <View style={styles.checkmarkBadge}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Descripción */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="document-text" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>¿Qué te preocupa?</Text>
                <Text style={styles.cardSubtitle}>Empieza con lo más importante; puedes agregar detalles después</Text>
              </View>
            </View>
            <View style={styles.quickConcernRow}>
              {QUICK_CONCERNS.map((concern) => (
                <TouchableOpacity
                  key={concern}
                  style={styles.quickConcernChip}
                  onPress={() => addConcernToDescription(concern)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.quickConcernText}>{concern}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Ejemplo: Tiene fiebre desde ayer, llegó a 38.5°C, está irritable y ha comido menos de lo normal..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
            <View style={styles.textAreaFooter}>
              <Text style={[styles.charCount, description.length >= 20 && styles.charCountValid]}>
                {description.length >= 20 ? '✓' : ''} {description.length} caracteres {description.length < 20 ? `(mínimo 20)` : ''}
              </Text>
            </View>
          </View>

          {/* Fotos */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="images" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Fotos que ayuden</Text>
                <Text style={styles.cardSubtitle}>Una imagen puede darle más contexto al especialista</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
              {photos && photos.length > 0 && photos.map((photo, index) => (
                <View key={index} style={styles.photoItem}>
                  <Image source={{ uri: photo }} style={styles.photoImage} />
                  <TouchableOpacity
                    style={styles.photoRemove}
                    onPress={() => handleRemovePhoto(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
              
              {photos.length < 5 && (
                <TouchableOpacity
                  style={styles.addPhotoButton}
                  onPress={handlePickImage}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={MUNPA_PRIMARY} />
                  ) : (
                    <>
                      <Ionicons name="camera" size={32} color={MUNPA_PRIMARY} />
                      <Text style={styles.addPhotoText}>Agregar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
            {photos.length > 0 && (
              <Text style={styles.photoCount}>{photos.length} de 5 fotos</Text>
            )}
          </View>

          {/* Síntomas */}
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.cardHeader, !showSymptoms && styles.cardHeaderCollapsed]}
              onPress={() => setShowSymptoms(prev => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="medkit" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Agregar síntomas</Text>
                <Text style={styles.cardSubtitle}>
                  {selectedSymptoms.length > 0
                    ? `${selectedSymptoms.length} seleccionado${selectedSymptoms.length > 1 ? 's' : ''}`
                    : 'Opcional, ayuda a ordenar la consulta'}
                </Text>
              </View>
              <Ionicons name={showSymptoms ? 'chevron-up' : 'chevron-down'} size={22} color="#9CA3AF" />
            </TouchableOpacity>

            {showSymptoms && (
              <View style={styles.symptomsGrid}>
                {symptoms && symptoms.length > 0 && symptoms.slice(0, 12).map(symptom => (
                  <TouchableOpacity
                    key={symptom.id}
                    style={[
                      styles.symptomChip,
                      selectedSymptoms.includes(symptom.id) && styles.symptomChipActive,
                    ]}
                    onPress={() => toggleSymptom(symptom.id)}
                    activeOpacity={0.7}
                  >
                    {symptom.imageUrl && (
                      <Image
                        source={{ uri: symptom.imageUrl }}
                        style={styles.symptomIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.symptomChipText,
                        selectedSymptoms.includes(symptom.id) && styles.symptomChipTextActive,
                      ]}
                    >
                      {symptom.name}
                    </Text>
                    {selectedSymptoms.includes(symptom.id) && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Tipo de consulta */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="phone-portrait" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>¿Cómo quieres consultar?</Text>
                <Text style={styles.cardSubtitle}>Elige el método que prefieras</Text>
              </View>
            </View>
            <View style={styles.consultationTypeRow}>
              <TouchableOpacity
                style={[styles.consultationTypeCard, consultationType === 'chat' && styles.consultationTypeCardActive]}
                onPress={() => setConsultationType('chat')}
                activeOpacity={0.9}
              >
                <View style={styles.consultationTypeIconBadge}>
                  <Ionicons name="chatbubbles" size={24} color={consultationType === 'chat' ? MUNPA_PRIMARY : '#9CA3AF'} />
                </View>
                <Text style={[styles.consultationTypeTitle, consultationType === 'chat' && styles.consultationTypeTextActive]}>
                  Chat
                </Text>
                <Text style={styles.consultationTypePrice}>
                  ${chatPricing?.finalPrice !== undefined 
                    ? chatPricing.finalPrice 
                    : specialist?.pricing?.chatConsultation ?? 5
                  }
                </Text>
                <Text style={styles.consultationTypeInfo}>Respuesta escrita</Text>
                {consultationType === 'chat' && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color={MUNPA_PRIMARY} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.consultationTypeCard, consultationType === 'video' && styles.consultationTypeCardActive]}
                onPress={() => setConsultationType('video')}
                activeOpacity={0.9}
              >
                <View style={styles.consultationTypeIconBadge}>
                  <Ionicons name="videocam" size={24} color={consultationType === 'video' ? '#887CBC' : '#9CA3AF'} />
                </View>
                <Text style={[styles.consultationTypeTitle, consultationType === 'video' && styles.consultationTypeTextActive]}>
                  Video
                </Text>
                <Text style={styles.consultationTypePrice}>
                  ${videoPricing?.finalPrice !== undefined 
                    ? videoPricing.finalPrice 
                    : specialist?.pricing?.videoConsultation ?? 15
                  }
                </Text>
                <Text style={styles.consultationTypeInfo}>Llamada en vivo</Text>
                {consultationType === 'video' && (
                  <View style={styles.selectedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#887CBC" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Urgencia */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="speedometer" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Nivel de urgencia</Text>
                <Text style={styles.cardSubtitle}>¿Qué tan urgente es?</Text>
              </View>
            </View>
            <View style={styles.urgencyRow}>
              {Object.entries(URGENCY_LEVELS).map(([key, level]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.urgencyButton,
                    urgency === key && { borderColor: level.color, backgroundColor: `${level.color}15` },
                  ]}
                  onPress={() => setUrgency(key as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.urgencyDot, { backgroundColor: level.color }]} />
                  <Text style={[styles.urgencyName, urgency === key && { fontWeight: '600', color: level.color }]}>
                    {level.name}
                  </Text>
                  {urgency === key && (
                    <Ionicons name="checkmark-circle" size={16} color={level.color} style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Cupón */}
          <View style={styles.card}>
            <TouchableOpacity
              style={[styles.cardHeader, !showCoupon && styles.cardHeaderCollapsed]}
              onPress={() => setShowCoupon(prev => !prev)}
              activeOpacity={0.75}
            >
              <View style={styles.cardIconContainer}>
                <Ionicons name="pricetag" size={20} color={MUNPA_PRIMARY} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Tengo un cupón</Text>
                <Text style={styles.cardSubtitle}>Opcional</Text>
              </View>
              <Ionicons name={showCoupon ? 'chevron-up' : 'chevron-down'} size={22} color="#9CA3AF" />
            </TouchableOpacity>
            {showCoupon && (
              <View>
                <View style={styles.couponRow}>
                  <TextInput
                    style={styles.couponInput}
                    placeholder="CODIGO123"
                    placeholderTextColor="#9CA3AF"
                    value={couponCode}
                    onChangeText={setCouponCode}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity style={styles.couponButton} onPress={calculateBothPrices}>
                    <Text style={styles.couponButtonText}>Aplicar</Text>
                  </TouchableOpacity>
                </View>
                {((chatPricing && chatPricing.discount > 0) || (videoPricing && videoPricing.discount > 0)) && (
                  <View style={styles.discountBanner}>
                    <Ionicons name="checkmark-circle" size={20} color="#059669" />
                    <Text style={styles.discountText}>
                      Descuento aplicado: Chat ${chatPricing?.discount || 0} | Video ${videoPricing?.discount || 0}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Resumen de precio */}
          {currentPricing && (
            <View style={styles.pricingSummary}>
              <Text style={styles.pricingTitle}>Detalle de pago</Text>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Precio base:</Text>
                <Text style={styles.pricingValue}>${currentPricing.basePrice}</Text>
              </View>
              {currentPricing.discount > 0 && (
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Descuento:</Text>
                  <Text style={[styles.pricingValue, { color: '#059669' }]}>-${currentPricing.discount}</Text>
                </View>
              )}
              <View style={[styles.pricingRow, styles.pricingTotal]}>
                <Text style={styles.pricingLabelTotal}>Total a pagar:</Text>
                <Text style={styles.pricingValueTotal}>${currentPricing.finalPrice}</Text>
              </View>
            </View>
          )}

          {/* Mensaje de validación */}
          {(!selectedChild || description.trim().length < 20) && (
            <View style={styles.validationMessage}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <View style={styles.validationTextContainer}>
                <Text style={styles.validationText}>
                  {!selectedChild && '• Selecciona un hijo\n'}
                  {description.trim().length < 20 && 'Agrega un poco más de contexto para que el especialista pueda ayudarte mejor.'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.footerSummary}>
            <View>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerReadyText}>
                {isReadyToSubmit ? 'Listo para continuar' : 'Completa el motivo'}
              </Text>
            </View>
            <Text style={styles.footerPrice}>${totalPrice}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || !isReadyToSubmit) && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={submitting || !isReadyToSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <View style={styles.submitButtonContent}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Procesando...</Text>
              </View>
            ) : (
              <View style={styles.submitButtonContent}>
                <Text style={styles.submitButtonText}>
                  {totalPrice > 0 ? 'Continuar al pago' : 'Enviar consulta'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.securePaymentRow}>
            <Ionicons name="lock-closed" size={13} color="#6B7280" />
            <Text style={styles.securePaymentText}>Pago seguro y encriptado</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 178,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  progressContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: MUNPA_PRIMARY,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderCollapsed: {
    marginBottom: 0,
  },
  consultationHero: {
    marginHorizontal: 16,
    marginTop: 14,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5F4F3',
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F7',
    marginRight: 12,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 4,
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
  },
  specialistSummaryCard: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDF3F2',
  },
  specialistSummaryPhoto: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  specialistSummaryInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: MUNPA_ACCENT,
  },
  specialistSummaryInfo: {
    flex: 1,
    minWidth: 0,
  },
  specialistSummaryLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 2,
  },
  specialistSummaryName: {
    fontSize: 17,
    fontWeight: '800',
    color: TEXT_PRIMARY,
  },
  specialistSummaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  specialistSummaryMetaText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  specialistSummaryPrice: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  specialistPriceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  specialistPriceValue: {
    fontSize: 19,
    color: MUNPA_ACCENT,
    fontWeight: '900',
    marginTop: 2,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${MUNPA_PRIMARY}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  childrenScroll: {
    marginHorizontal: -4,
  },
  childCard: {
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    minWidth: 90,
    position: 'relative',
  },
  childCardActive: {
    borderColor: MUNPA_PRIMARY,
    backgroundColor: `${MUNPA_PRIMARY}10`,
  },
  childPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  childPhotoText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  childNameActive: {
    color: MUNPA_PRIMARY,
    fontWeight: '700',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 132,
    backgroundColor: '#FAFAFA',
    lineHeight: 21,
  },
  quickConcernRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  quickConcernChip: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#F0FAF9',
    borderWidth: 1,
    borderColor: '#D5F0EF',
  },
  quickConcernText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#168F88',
  },
  textAreaFooter: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  charCountValid: {
    color: '#059669',
    fontWeight: '600',
  },
  photosScroll: {
    marginHorizontal: -4,
  },
  photoItem: {
    position: 'relative',
    marginHorizontal: 4,
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  photoRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MUNPA_PRIMARY,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${MUNPA_PRIMARY}05`,
    marginHorizontal: 4,
  },
  addPhotoText: {
    fontSize: 12,
    color: MUNPA_PRIMARY,
    marginTop: 6,
    fontWeight: '600',
  },
  photoCount: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 12,
    textAlign: 'center',
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  symptomChipActive: {
    backgroundColor: MUNPA_PRIMARY,
    borderColor: MUNPA_PRIMARY,
  },
  symptomIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  symptomChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  symptomChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  selectedCount: {
    fontSize: 12,
    color: MUNPA_PRIMARY,
    marginTop: 12,
    fontWeight: '600',
  },
  consultationTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  consultationTypeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    minHeight: 136,
    position: 'relative',
  },
  consultationTypeCardActive: {
    borderColor: MUNPA_PRIMARY,
    backgroundColor: `${MUNPA_PRIMARY}10`,
    borderWidth: 3,
  },
  consultationTypeIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  consultationTypeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 4,
  },
  consultationTypeTextActive: {
    color: MUNPA_PRIMARY,
  },
  consultationTypePrice: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 6,
  },
  consultationTypeInfo: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'center',
  },
  consultationTypeDescription: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    width: '100%',
  },
  consultationTypeDescriptionText: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    padding: 3,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedBadgeText: {
    fontSize: 10,
    color: MUNPA_PRIMARY,
    fontWeight: '700',
  },
  urgencyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  urgencyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  urgencyName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  couponRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  couponButton: {
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  discountBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  pricingSummary: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pricingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: TEXT_PRIMARY,
    marginBottom: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pricingLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  pricingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  pricingTotal: {
    borderTopWidth: 2,
    borderTopColor: '#E5E7EB',
    paddingTop: 14,
    marginTop: 6,
    marginBottom: 0,
  },
  pricingLabelTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  pricingValueTotal: {
    fontSize: 24,
    fontWeight: '800',
    color: MUNPA_PRIMARY,
  },
  validationMessage: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    gap: 10,
  },
  validationTextContainer: {
    flex: 1,
  },
  validationText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: MUNPA_PRIMARY,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: MUNPA_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  securePaymentText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  stickyFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  footerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  footerLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  footerReadyText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  footerPrice: {
    fontSize: 26,
    fontWeight: '900',
    color: TEXT_PRIMARY,
  },
  securePaymentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
});

export default ConsultationRequestScreen;
