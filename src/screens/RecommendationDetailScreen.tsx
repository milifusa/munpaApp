import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Linking,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';
import recommendationAnalyticsService from '../services/recommendationAnalyticsService';
import { useAuth } from '../contexts/AuthContext';
import { shareContentHelper } from '../utils/shareContentHelper';

interface Review {
  id: string;
  rating: number;
  comment: string;
  user: {
    id: string;
    displayName: string;
    photoURL?: string;
  } | null;
  createdAt: Date;
  updatedAt: Date;
  photos?: string[]; // Array de URLs de fotos
  childAge?: string; // Edad del hijo al visitar (ej: "6 meses", "2 años")
  visitedWith?: string; // Con quién visitó (ej: "Pareja", "Solo", "Familia")
  helpfulCount?: number; // Cantidad de "útil"
  isHelpfulByMe?: boolean; // Si el usuario actual lo marcó como útil
}

interface Recommendation {
  id: string;
  name: string;
  description: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
  imageUrl?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
    imageUrl?: string;
  };
  practicalInfo?: {
    openingHours?: string;
    averagePrice?: string;
    acceptsCreditCards?: boolean;
    hasWifi?: boolean;
    hasHighChairs?: boolean;
    hasKidsMenu?: boolean;
    hasParkingLot?: boolean;
    isStrollerAccessible?: boolean;
    ageRange?: string;
    specialNotes?: string;
  };
  communityStats?: {
    totalVisits?: number;
    visitedByFriends?: number;
    friendsWhoVisited?: Array<{
      id: string;
      displayName: string;
      photoURL?: string;
      visitDate?: Date;
    }>;
    popularWithCommunities?: Array<{
      communityId: string;
      communityName: string;
      visitCount: number;
    }>;
  };
}

const RecommendationDetailScreen = ({ route, navigation }: any) => {
  const { recommendationId } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [stats, setStats] = useState({ totalReviews: 0, averageRating: 0 });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal de review
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPhotos, setReviewPhotos] = useState<string[]>([]);
  const [reviewChildAge, setReviewChildAge] = useState('');
  const [reviewVisitedWith, setReviewVisitedWith] = useState<'Solo' | 'Pareja' | 'Familia' | 'Amigos' | ''>('');
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    loadData();
  }, [recommendationId]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadRecommendation(),
        loadReviews(),
        loadMyReview(),
      ]);
    } catch (error) {
      console.error('❌ [DETAIL] Error cargando datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecommendation = async () => {
    console.log('🔄 [DETAIL] Cargando recomendación:', recommendationId);
    
    try {
      const response = await api.getRecommendationById(recommendationId);
      
      if (response.success && response.data) {
        console.log('✅ [DETAIL] Recomendación cargada');
        setRecommendation(response.data);
        
        // Trackear vista de recomendación
        recommendationAnalyticsService.trackView(recommendationId, {
          source: route.params?.source || 'direct',
          timestamp: new Date(),
        });
      } else {
        setError('Recomendación no encontrada');
      }
    } catch (error: any) {
      // Si es un 404, mostrar mensaje más amigable y redirigir
      if (error.response?.status === 404 || error.status === 404) {
        console.warn('⚠️ [DETAIL] Recomendación no encontrada:', recommendationId);
        setError('Recomendación no encontrada');
        // Redirigir después de 2 segundos
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        console.error('❌ [DETAIL] Error cargando recomendación:', error);
        setError('Error al cargar la recomendación');
      }
    }
  };

  const loadReviews = async () => {
    console.log('🔄 [DETAIL] Cargando reviews');
    setIsLoadingReviews(true);
    
    try {
      const response = await api.getRecommendationReviews(recommendationId);
      
      if (response.success) {
        console.log('✅ [DETAIL] Reviews cargadas:', response.data.length);
        setReviews(response.data);
        setStats(response.stats);
      }
    } catch (error: any) {
      // Si es un 404, no mostrar error (la recomendación no existe)
      if (error.response?.status !== 404 && error.status !== 404) {
        console.error('❌ [DETAIL] Error cargando reviews:', error);
      }
    } finally {
      setIsLoadingReviews(false);
    }
  };

  const loadMyReview = async () => {
    console.log('🔄 [DETAIL] Cargando mi review');
    
    try {
      const response = await api.getMyReview(recommendationId);
      
      if (response.success && response.data) {
        console.log('✅ [DETAIL] Mi review cargada');
        setMyReview(response.data);
      } else {
        setMyReview(null);
      }
    } catch (error: any) {
      // Si es un 404, no mostrar error (la recomendación no existe o no hay review)
      if (error.response?.status !== 404 && error.status !== 404) {
        console.error('❌ [DETAIL] Error cargando mi review:', error);
      }
      setMyReview(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleOpenReviewModal = () => {
    if (myReview) {
      setReviewRating(myReview.rating);
      setReviewComment(myReview.comment || '');
      setReviewPhotos(myReview.photos || []);
      setReviewChildAge(myReview.childAge || '');
      setReviewVisitedWith((myReview.visitedWith as any) || '');
    } else {
      setReviewRating(0);
      setReviewComment('');
      setReviewPhotos([]);
      setReviewChildAge('');
      setReviewVisitedWith('');
    }
    setShowReviewModal(true);
  };

  const handlePickPhotos = async () => {
    try {
      const ImagePicker = await import('expo-image-picker');
      
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Necesitamos permisos para acceder a tus fotos');
        return;
      }

      // Seleccionar imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 5 - reviewPhotos.length, // Máximo 5 fotos totales
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setIsUploadingPhoto(true);
        
        try {
          // Subir las fotos al servidor
          const uploadedUrls: string[] = [];
          
          for (const asset of result.assets) {
            const response = await api.uploadReviewPhoto(recommendationId, {
              uri: asset.uri,
              type: 'image/jpeg',
              fileName: `photo_${Date.now()}.jpg`,
            });
            uploadedUrls.push(response.data.photoUrl);
          }
          
          setReviewPhotos([...reviewPhotos, ...uploadedUrls]);
          Alert.alert('Éxito', `${uploadedUrls.length} foto(s) agregada(s)`);
        } catch (error) {
          console.error('Error subiendo fotos:', error);
          Alert.alert('Error', 'No se pudieron subir las fotos');
        } finally {
          setIsUploadingPhoto(false);
        }
      }
    } catch (error) {
      console.error('Error seleccionando fotos:', error);
      Alert.alert('Error', 'No se pudieron seleccionar las fotos');
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...reviewPhotos];
    newPhotos.splice(index, 1);
    setReviewPhotos(newPhotos);
  };

  const handleSaveReview = async () => {
    if (reviewRating === 0) {
      Alert.alert('Error', 'Por favor selecciona una calificación');
      return;
    }

    setIsSavingReview(true);
    
    try {
      await api.createOrUpdateReview(
        recommendationId, 
        reviewRating, 
        reviewComment,
        reviewPhotos,
        reviewChildAge || undefined,
        reviewVisitedWith || undefined
      );
      
      Alert.alert('Éxito', 'Tu reseña ha sido guardada');
      setShowReviewModal(false);
      
      // Recargar datos
      await Promise.all([loadReviews(), loadMyReview()]);
    } catch (error: any) {
      console.error('❌ [DETAIL] Error guardando review:', error);
      Alert.alert('Error', 'No se pudo guardar la reseña');
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleDeleteReview = async () => {
    Alert.alert(
      'Eliminar Reseña',
      '¿Estás seguro de que quieres eliminar tu reseña?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteMyReview(recommendationId);
              Alert.alert('Éxito', 'Tu reseña ha sido eliminada');
              setShowReviewModal(false);
              await Promise.all([loadReviews(), loadMyReview()]);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar la reseña');
            }
          },
        },
      ]
    );
  };

  const handleToggleHelpful = async (reviewId: string) => {
    try {
      const response = await api.toggleReviewHelpful(recommendationId, reviewId);
      
      // Actualizar la review en el estado local
      setReviews(prevReviews =>
        prevReviews.map(review =>
          review.id === reviewId
            ? {
                ...review,
                helpfulCount: response.helpfulCount,
                isHelpfulByMe: response.isHelpful,
              }
            : review
        )
      );
    } catch (error) {
      console.error('Error toggling helpful:', error);
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const handleOpenLink = async (url: string) => {
    if (url) {
      // Determinar si es email o website
      if (url.startsWith('mailto:')) {
        const email = url.replace('mailto:', '');
        // Trackear click en email
        try {
          await recommendationAnalyticsService.trackEmail(recommendationId, email, {
            source: 'detail_screen',
          });
          console.log('✅ [DETAIL] Evento de email registrado');
        } catch (error) {
          console.error('❌ [DETAIL] Error registrando email:', error);
        }
      } else {
        // Trackear click en website
        try {
          await recommendationAnalyticsService.trackWebsite(recommendationId, url, {
            source: 'detail_screen',
          });
          console.log('✅ [DETAIL] Evento de website registrado');
        } catch (error) {
          console.error('❌ [DETAIL] Error registrando website:', error);
        }
      }
      
      Linking.openURL(url).catch(err => console.error('Error abriendo URL:', err));
    }
  };

  const handleCall = async (phone: string) => {
    if (phone) {
      console.log('📞 [DETAIL] Iniciando llamada:', phone);
      
      // Trackear llamada
      try {
        await recommendationAnalyticsService.trackCall(recommendationId, phone, {
          source: 'detail_screen',
        });
        console.log('✅ [DETAIL] Evento de llamada registrado');
      } catch (error) {
        console.error('❌ [DETAIL] Error registrando llamada:', error);
      }
      
      Linking.openURL(`tel:${phone}`).catch(err => console.error('Error llamando:', err));
    }
  };

  const handleWhatsApp = async (phone: string) => {
    if (phone) {
      console.log('💬 [DETAIL] Iniciando WhatsApp:', phone);
      
      // Trackear contacto por WhatsApp
      try {
        await recommendationAnalyticsService.trackWhatsApp(recommendationId, phone, {
          source: 'detail_screen',
        });
        console.log('✅ [DETAIL] Evento de WhatsApp registrado');
      } catch (error) {
        console.error('❌ [DETAIL] Error registrando WhatsApp:', error);
      }
      
      // Limpiar el número de teléfono (solo números)
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      
      // Usar wa.me que funciona universalmente en Android e iOS
      // Si WhatsApp está instalado, lo abre directamente
      // Si no está instalado, abre WhatsApp Web
      const whatsappUrl = `https://wa.me/${cleanPhone}`;
      
      Linking.openURL(whatsappUrl).catch((err) => {
        console.error('❌ [DETAIL] Error abriendo WhatsApp:', err);
        Alert.alert(
          'Error',
          'No se pudo abrir WhatsApp. Por favor, verifica que WhatsApp esté instalado o usa el número: ' + phone
        );
      });
    }
  };

  const handleOpenMap = (lat: number, lng: number) => {
    // Trackear click en mapa
    recommendationAnalyticsService.trackMap(recommendationId, { latitude: lat, longitude: lng }, {
      source: 'detail_screen',
    });
    
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url).catch(err => console.error('Error abriendo mapa:', err));
  };

  const renderStars = (rating: number, size: number = 16, color: string = '#FFD700') => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? 'star' : 'star-outline'}
          size={size}
          color={color}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewModal = () => (
    <Modal
      visible={showReviewModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowReviewModal(false)}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardView}
        >
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {myReview ? 'Editar Reseña' : 'Escribir Reseña'}
                </Text>
                <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {/* Rating selector */}
              <View style={styles.ratingSelector}>
                <Text style={styles.ratingLabel}>Calificación *</Text>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={star <= reviewRating ? 'star' : 'star-outline'}
                        size={40}
                        color="#FFD700"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Comment input */}
              <View style={styles.commentSection}>
                <Text style={styles.commentLabel}>Comentario (opcional)</Text>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Cuéntanos tu experiencia..."
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              {/* Edad del bebé */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="calendar-outline" size={16} color="#666" /> Edad de tu bebé (opcional)
                </Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="ej: 6 meses, 2 años"
                  value={reviewChildAge}
                  onChangeText={setReviewChildAge}
                />
              </View>

              {/* Visitado con */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="people-outline" size={16} color="#666" /> Visitado con (opcional)
                </Text>
                <View style={styles.chipContainer}>
                  {(['Solo', 'Pareja', 'Familia', 'Amigos'] as const).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.chip,
                        reviewVisitedWith === option && styles.chipActive
                      ]}
                      onPress={() => setReviewVisitedWith(reviewVisitedWith === option ? '' : option)}
                    >
                      <Text style={[
                        styles.chipText,
                        reviewVisitedWith === option && styles.chipTextActive
                      ]}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Fotos */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  <Ionicons name="camera-outline" size={16} color="#666" /> Fotos (opcional, máx 5)
                </Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosScroll}
                  contentContainerStyle={styles.photosScrollContent}
                >
                  {reviewPhotos.map((photo, index) => (
                    <View key={index} style={styles.photoPreview}>
                      <Image source={{ uri: photo }} style={styles.photoPreviewImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => handleRemovePhoto(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {reviewPhotos.length < 5 && (
                    <TouchableOpacity
                      style={styles.addPhotoButton}
                      onPress={handlePickPhotos}
                      disabled={isUploadingPhoto}
                    >
                      {isUploadingPhoto ? (
                        <ActivityIndicator size="small" color="#59C6C0" />
                      ) : (
                        <>
                          <Ionicons name="camera" size={32} color="#59C6C0" />
                          <Text style={styles.addPhotoText}>Agregar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </View>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                {myReview && (
                  <TouchableOpacity
                    style={styles.deleteReviewButton}
                    onPress={handleDeleteReview}
                  >
                    <Ionicons name="trash" size={20} color="white" />
                    <Text style={styles.deleteReviewButtonText}>Eliminar</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.saveReviewButton, { flex: myReview ? 1 : undefined }]}
                  onPress={handleSaveReview}
                  disabled={isSavingReview}
                >
                  {isSavingReview ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={styles.saveReviewButtonText}>Guardar</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recommendation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || 'Error cargando la recomendación'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <View style={styles.contentWrapper}>
        {/* Header */}
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.header}
        >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {recommendation.name}
        </Text>
        <TouchableOpacity 
          onPress={() => shareContentHelper.shareRecommendation(recommendationId)}
          style={styles.shareButton}
        >
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Imagen */}
        {recommendation.imageUrl ? (
          <Image source={{ uri: recommendation.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.defaultIcon}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Contenido principal */}
        <View style={styles.content}>
          {/* Título y categoría */}
          <Text style={styles.title}>{recommendation.name}</Text>
          
          {recommendation.category && (
            <View style={styles.categoryBadge}>
              {recommendation.category.icon && (
                <Ionicons name={recommendation.category.icon as any} size={16} color="#59C6C0" />
              )}
              <Text style={styles.categoryText}>{recommendation.category.name}</Text>
            </View>
          )}

          {/* Rating */}
          <View style={styles.ratingSection}>
            {renderStars(Math.round(stats.averageRating), 20)}
            <Text style={styles.ratingText}>
              {stats.averageRating.toFixed(1)} ({stats.totalReviews} {stats.totalReviews === 1 ? 'reseña' : 'reseñas'})
            </Text>
          </View>

          {/* Descripción */}
          {recommendation.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Descripción</Text>
              <Text style={styles.description}>{recommendation.description}</Text>
            </View>
          )}

          {/* Información de contacto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Contacto</Text>
            
            {recommendation.address && (
              <TouchableOpacity 
                style={styles.infoRow}
                onPress={() => recommendation.latitude && recommendation.longitude && 
                  handleOpenMap(recommendation.latitude, recommendation.longitude)}
              >
                <Ionicons name="location" size={20} color="#59C6C0" />
                <Text style={styles.infoText}>{recommendation.address}</Text>
              </TouchableOpacity>
            )}

            {recommendation.phone && (
              <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(recommendation.phone!)}>
                <Ionicons name="call" size={20} color="#59C6C0" />
                <Text style={styles.infoText}>{recommendation.phone}</Text>
              </TouchableOpacity>
            )}

            {recommendation.email && (
              <TouchableOpacity 
                style={styles.infoRow}
                onPress={() => handleOpenLink(`mailto:${recommendation.email}`)}
              >
                <Ionicons name="mail" size={20} color="#59C6C0" />
                <Text style={styles.infoText}>{recommendation.email}</Text>
              </TouchableOpacity>
            )}

            {recommendation.website && (
              <TouchableOpacity 
                style={styles.infoRow}
                onPress={() => handleOpenLink(recommendation.website!)}
              >
                <Ionicons name="globe" size={20} color="#59C6C0" />
                <Text style={styles.infoText}>{recommendation.website}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Botones de acción */}
          <View style={styles.actionButtons}>
            {recommendation.phone && (
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleCall(recommendation.phone!)}
              >
                <Ionicons name="call" size={20} color="white" />
                <Text style={styles.actionButtonText}>Llamar</Text>
              </TouchableOpacity>
            )}

            {recommendation.whatsapp && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#25D366' }]}
                onPress={() => handleWhatsApp(recommendation.whatsapp!)}
              >
                <Ionicons name="logo-whatsapp" size={20} color="white" />
                <Text style={styles.actionButtonText}>WhatsApp</Text>
              </TouchableOpacity>
            )}

            {recommendation.latitude && recommendation.longitude && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#4285F4' }]}
                onPress={() => handleOpenMap(recommendation.latitude!, recommendation.longitude!)}
              >
                <Ionicons name="navigate" size={20} color="white" />
                <Text style={styles.actionButtonText}>Mapa</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Información Práctica para Padres */}
          {recommendation.practicalInfo && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                📋 Información Práctica
              </Text>
              
              <View style={styles.practicalInfoContainer}>
                {/* Horario */}
                {recommendation.practicalInfo.openingHours && (
                  <View style={styles.practicalInfoItem}>
                    <View style={[styles.practicalInfoIcon, { backgroundColor: '#E3F2FD' }]}>
                      <Ionicons name="time-outline" size={20} color="#2196F3" />
                    </View>
                    <View style={styles.practicalInfoContent}>
                      <Text style={styles.practicalInfoLabel}>Horario</Text>
                      <Text style={styles.practicalInfoValue}>{recommendation.practicalInfo.openingHours}</Text>
                    </View>
                  </View>
                )}

                {/* Precio promedio */}
                {recommendation.practicalInfo.averagePrice && (
                  <View style={styles.practicalInfoItem}>
                    <View style={[styles.practicalInfoIcon, { backgroundColor: '#FFF3E0' }]}>
                      <Ionicons name="wallet-outline" size={20} color="#FF9800" />
                    </View>
                    <View style={styles.practicalInfoContent}>
                      <Text style={styles.practicalInfoLabel}>Precio promedio</Text>
                      <Text style={styles.practicalInfoValue}>{recommendation.practicalInfo.averagePrice}</Text>
                    </View>
                  </View>
                )}

                {/* Rango de edad */}
                {recommendation.practicalInfo.ageRange && (
                  <View style={styles.practicalInfoItem}>
                    <View style={[styles.practicalInfoIcon, { backgroundColor: '#F3E5F5' }]}>
                      <Ionicons name="people-outline" size={20} color="#9C27B0" />
                    </View>
                    <View style={styles.practicalInfoContent}>
                      <Text style={styles.practicalInfoLabel}>Rango de edad recomendado</Text>
                      <Text style={styles.practicalInfoValue}>{recommendation.practicalInfo.ageRange}</Text>
                    </View>
                  </View>
                )}

                {/* Facilidades (tags) */}
                <View style={styles.practicalInfoFacilities}>
                  {recommendation.practicalInfo.acceptsCreditCards && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="card-outline" size={14} color="#4CAF50" />
                      <Text style={styles.facilityTagText}>Tarjetas</Text>
                    </View>
                  )}
                  {recommendation.practicalInfo.hasWifi && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="wifi-outline" size={14} color="#2196F3" />
                      <Text style={styles.facilityTagText}>WiFi</Text>
                    </View>
                  )}
                  {recommendation.practicalInfo.hasHighChairs && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="restaurant-outline" size={14} color="#FF9800" />
                      <Text style={styles.facilityTagText}>Silla alta</Text>
                    </View>
                  )}
                  {recommendation.practicalInfo.hasKidsMenu && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="fast-food-outline" size={14} color="#FF5722" />
                      <Text style={styles.facilityTagText}>Menú niños</Text>
                    </View>
                  )}
                  {recommendation.practicalInfo.hasParkingLot && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="car-outline" size={14} color="#607D8B" />
                      <Text style={styles.facilityTagText}>Parking</Text>
                    </View>
                  )}
                  {recommendation.practicalInfo.isStrollerAccessible && (
                    <View style={styles.facilityTag}>
                      <Ionicons name="accessibility-outline" size={14} color="#9C27B0" />
                      <Text style={styles.facilityTagText}>Acceso coche</Text>
                    </View>
                  )}
                </View>

                {/* Notas especiales */}
                {recommendation.practicalInfo.specialNotes && (
                  <View style={styles.specialNotesContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#59C6C0" />
                    <Text style={styles.specialNotesText}>{recommendation.practicalInfo.specialNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Estadísticas de comunidad */}
          {recommendation.communityStats && (recommendation.communityStats.totalVisits || 0) > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                👥 De tu comunidad
              </Text>
              
              <View style={styles.communityStatsContainer}>
                {/* Estadísticas generales */}
                <View style={styles.communityStatsRow}>
                  <View style={styles.communityStatItem}>
                    <Text style={styles.communityStatNumber}>{recommendation.communityStats.totalVisits}</Text>
                    <Text style={styles.communityStatLabel}>visitas totales</Text>
                  </View>
                  {recommendation.communityStats.visitedByFriends && recommendation.communityStats.visitedByFriends > 0 && (
                    <View style={styles.communityStatItem}>
                      <Text style={styles.communityStatNumber}>{recommendation.communityStats.visitedByFriends}</Text>
                      <Text style={styles.communityStatLabel}>amigos visitaron</Text>
                    </View>
                  )}
                </View>

                {/* Amigos que visitaron */}
                {recommendation.communityStats.friendsWhoVisited && recommendation.communityStats.friendsWhoVisited.length > 0 && (
                  <View style={styles.friendsSection}>
                    <Text style={styles.friendsSectionTitle}>Visitado por:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsList}>
                      {recommendation.communityStats.friendsWhoVisited.slice(0, 10).map((friend) => (
                        <View key={friend.id} style={styles.friendCard}>
                          {friend.photoURL ? (
                            <Image source={{ uri: friend.photoURL }} style={styles.friendPhoto} />
                          ) : (
                            <View style={styles.friendPhotoPlaceholder}>
                              <Ionicons name="person" size={16} color="#999" />
                            </View>
                          )}
                          <Text style={styles.friendName} numberOfLines={1}>{friend.displayName}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Comunidades populares */}
                {recommendation.communityStats.popularWithCommunities && recommendation.communityStats.popularWithCommunities.length > 0 && (
                  <View style={styles.popularCommunitiesSection}>
                    <Text style={styles.friendsSectionTitle}>Popular en:</Text>
                    {recommendation.communityStats.popularWithCommunities.slice(0, 3).map((community) => (
                      <View key={community.communityId} style={styles.popularCommunityItem}>
                        <View style={styles.popularCommunityIcon}>
                          <Ionicons name="people" size={16} color="#59C6C0" />
                        </View>
                        <Text style={styles.popularCommunityName}>{community.communityName}</Text>
                        <Text style={styles.popularCommunityCount}>{community.visitCount} visitas</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Mi reseña */}
          <View style={styles.section}>
            <View style={styles.myReviewHeader}>
              <Text style={styles.sectionTitle}>Mi Reseña</Text>
              <TouchableOpacity 
                style={styles.writeReviewButton}
                onPress={handleOpenReviewModal}
              >
                <Ionicons 
                  name={myReview ? "pencil" : "add-circle"} 
                  size={20} 
                  color="white" 
                />
                <Text style={styles.writeReviewButtonText}>
                  {myReview ? 'Editar' : 'Escribir'}
                </Text>
              </TouchableOpacity>
            </View>

            {myReview && (
              <View style={styles.myReviewCard}>
                {renderStars(myReview.rating, 18)}
                {myReview.comment && (
                  <Text style={styles.myReviewComment}>{myReview.comment}</Text>
                )}
              </View>
            )}
          </View>

          {/* Reseñas */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Reseñas ({stats.totalReviews})
            </Text>
            
            {isLoadingReviews ? (
              <ActivityIndicator color="#59C6C0" style={{ marginVertical: 20 }} />
            ) : reviews.length > 0 ? (
              reviews.map((review) => (
                <View key={review.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewUser}>
                      {review.user?.photoURL ? (
                        <Image 
                          source={{ uri: review.user.photoURL }} 
                          style={styles.reviewUserPhoto}
                        />
                      ) : (
                        <View style={styles.reviewUserPhotoPlaceholder}>
                          <Ionicons name="person" size={20} color="#999" />
                        </View>
                      )}
                      <View>
                        <Text style={styles.reviewUserName}>
                          {review.user?.displayName || 'Usuario'}
                        </Text>
                        {renderStars(review.rating, 14)}
                      </View>
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  
                  {/* Contexto de la visita */}
                  {(review.childAge || review.visitedWith) && (
                    <View style={styles.reviewContext}>
                      {review.childAge && (
                        <View style={styles.contextTag}>
                          <Ionicons name="calendar-outline" size={12} color="#666" />
                          <Text style={styles.contextText}>{review.childAge}</Text>
                        </View>
                      )}
                      {review.visitedWith && (
                        <View style={styles.contextTag}>
                          <Ionicons name="people-outline" size={12} color="#666" />
                          <Text style={styles.contextText}>{review.visitedWith}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}

                  {/* Fotos de la reseña */}
                  {review.photos && review.photos.length > 0 && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false} 
                      style={styles.reviewPhotos}
                    >
                      {review.photos.map((photo, index) => (
                        <TouchableOpacity 
                          key={index}
                          onPress={() => {
                            // TODO: Abrir modal de vista previa de foto
                            console.log('Ver foto:', photo);
                          }}
                        >
                          <Image 
                            source={{ uri: photo }} 
                            style={styles.reviewPhoto}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Botón "útil" */}
                  {review.helpfulCount !== undefined && (
                    <View style={styles.reviewFooter}>
                      <TouchableOpacity 
                        style={[
                          styles.helpfulButton,
                          review.isHelpfulByMe && styles.helpfulButtonActive
                        ]}
                        onPress={() => handleToggleHelpful(review.id)}
                      >
                        <Ionicons 
                          name={review.isHelpfulByMe ? "thumbs-up" : "thumbs-up-outline"} 
                          size={16} 
                          color={review.isHelpfulByMe ? "#59C6C0" : "#666"} 
                        />
                        <Text style={[
                          styles.helpfulText,
                          review.isHelpfulByMe && styles.helpfulTextActive
                        ]}>
                          Útil ({review.helpfulCount || 0})
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>
                Aún no hay reseñas. ¡Sé el primero en escribir una!
              </Text>
            )}
          </View>

          <View style={styles.finalSpacing} />
        </View>
      </ScrollView>

        {renderReviewModal()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  shareButton: {
    marginLeft: 15,
    padding: 5,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },

  // Image
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#F0F0F0',
  },
  imagePlaceholder: {
    width: '100%',
    height: 250,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultIcon: {
    width: 120,
    height: 120,
    opacity: 0.6,
  },

  // Content
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 15,
  },
  categoryText: {
    fontSize: 14,
    color: '#59C6C0',
    fontWeight: '600',
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  // Sections
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },

  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    color: '#666',
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },

  // My review
  myReviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  writeReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  writeReviewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  myReviewCard: {
    backgroundColor: '#F0FDFC',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#59C6C0',
  },
  myReviewComment: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    lineHeight: 20,
  },

  // Reviews
  reviewCard: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  reviewUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  reviewUserPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewUserPhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  reviewComment: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewContext: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  contextTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  contextText: {
    fontSize: 11,
    color: '#666',
  },
  reviewPhotos: {
    marginTop: 10,
    marginBottom: 10,
  },
  reviewPhoto: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  helpfulButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
  },
  helpfulButtonActive: {
    backgroundColor: '#E6F7F5',
  },
  helpfulText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  helpfulTextActive: {
    color: '#59C6C0',
    fontWeight: '600',
  },
  noReviewsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },

  // Información Práctica
  practicalInfoContainer: {
    gap: 15,
  },
  practicalInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  practicalInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  practicalInfoContent: {
    flex: 1,
  },
  practicalInfoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  practicalInfoValue: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  practicalInfoFacilities: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 5,
  },
  facilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  facilityTagText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  specialNotesContainer: {
    flexDirection: 'row',
    backgroundColor: '#E8F5F9',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 10,
  },
  specialNotesText: {
    flex: 1,
    fontSize: 13,
    color: '#00838F',
    lineHeight: 18,
  },

  // Estadísticas de comunidad
  communityStatsContainer: {
    gap: 20,
  },
  communityStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
  },
  communityStatItem: {
    alignItems: 'center',
  },
  communityStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#59C6C0',
    marginBottom: 4,
  },
  communityStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  friendsSection: {
    gap: 10,
  },
  friendsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  friendsList: {
    flexDirection: 'row',
  },
  friendCard: {
    alignItems: 'center',
    marginRight: 16,
    width: 70,
  },
  friendPhoto: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    borderWidth: 2,
    borderColor: '#59C6C0',
  },
  friendPhotoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#DDD',
  },
  friendName: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  popularCommunitiesSection: {
    gap: 10,
  },
  popularCommunityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  popularCommunityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popularCommunityName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  popularCommunityCount: {
    fontSize: 12,
    color: '#59C6C0',
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalKeyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalScrollView: {
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: '#F7FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingSelector: {
    marginBottom: 20,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  starButton: {
    padding: 5,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  commentInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  fieldSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  fieldInput: {
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  chipActive: {
    backgroundColor: '#E6F7F5',
    borderColor: '#59C6C0',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#59C6C0',
    fontWeight: '600',
  },
  photosScroll: {
    marginTop: 8,
  },
  photosScrollContent: {
    gap: 12,
  },
  photoPreview: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photoPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
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
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#59C6C0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FFFF',
  },
  addPhotoText: {
    fontSize: 12,
    color: '#59C6C0',
    marginTop: 4,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  deleteReviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveReviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 6,
  },
  saveReviewButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  finalSpacing: {
    height: 30,
  },
});

export default RecommendationDetailScreen;

