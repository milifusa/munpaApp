import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useViewMode } from '../contexts/ViewModeContext';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';
import EditPricingModal from '../components/EditPricingModal';

const SpecialistProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { isMedicalProfile, profileType } = useViewMode();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [recommendationData, setRecommendationData] = useState<any>(null);

  useEffect(() => {
    analyticsService.logScreenView('specialist_profile');
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      console.log('👤 [PROFILE] Cargando perfil profesional...');

      // Cargar datos del perfil profesional
      const profileResponse = await axiosInstance.get('/api/profile/professional');
      console.log('✅ [PROFILE] Perfil obtenido:', profileResponse.data);
      
      const profile = profileResponse.data?.data || profileResponse.data;
      setProfileData(profile);

      // Cargar estadísticas básicas
      try {
        const statsResponse = await axiosInstance.get('/api/specialist/stats?period=all');
        const statsData = statsResponse.data?.data || statsResponse.data;
        setStats(statsData);
      } catch (error) {
        console.log('⚠️ [PROFILE] No se pudieron cargar estadísticas');
      }

      // Cargar datos del recomendado vinculado
      try {
        const recResponse = await axiosInstance.get('/api/professionals/me/recommendation');
        setRecommendationData(recResponse.data?.data || recResponse.data);
      } catch (error) {
        console.log('⚠️ [PROFILE] No se pudieron cargar datos del recomendado');
      }
    } catch (error: any) {
      console.error('❌ [PROFILE] Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar tu perfil profesional');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    navigation.navigate('EditSpecialistProfile');
  };

  const handleEditPricing = () => {
    setShowPricingModal(true);
  };

  const handleManageDocuments = () => {
    navigation.navigate('ManageDocuments');
  };

  const handleEditRecommendation = () => {
    navigation.navigate('EditRecommendation');
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: () => {
            analyticsService.logEvent('specialist_logout', {
              profile_type: profileType,
            });
            logout();
          },
        },
      ]
    );
  };

  const getProfileTypeLabel = () => {
    switch (profileType) {
      case 'specialist': return 'Médico Especialista';
      case 'nutritionist': return 'Nutricionista';
      case 'coach': return 'Coach';
      case 'psychologist': return 'Psicólogo';
      case 'service': return 'Negocio / Servicio';
      default: return 'Profesional';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  const displayName = profileData?.personalInfo?.displayName || 
                      profileData?.displayName || 
                      user?.displayName || 
                      'Profesional';
  
  const email = user?.email || 'No disponible';
  const phone = profileData?.personalInfo?.phone || profileData?.phone || 'No configurado';
  const bio = profileData?.personalInfo?.bio || profileData?.bio || 'Sin descripción';
  const specialties = profileData?.professional?.specialties || [];
  const yearsExperience = profileData?.professional?.yearsExperience || 0;
  const licenseNumber = profileData?.professional?.licenseNumber || 'No registrado';
  const university = profileData?.professional?.university || 'No especificado';
  const isVerified = user?.professionalProfile?.isActive || false;

  // Precios
  const chatPrice = profileData?.pricing?.chatConsultation || 0;
  const videoPrice = profileData?.pricing?.videoConsultation || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#887CBC"
            colors={['#887CBC']}
          />
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarContainer}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color="#887CBC" />
              </View>
            )}
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            )}
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.profileType}>{getProfileTypeLabel()}</Text>

          {isVerified ? (
            <View style={styles.statusBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text style={styles.statusBadgeText}>Verificado</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgePending]}>
              <Ionicons name="time" size={16} color="#F59E0B" />
              <Text style={[styles.statusBadgeText, styles.statusBadgeTextPending]}>
                Verificación Pendiente
              </Text>
            </View>
          )}
        </View>

        {/* Estadísticas rápidas */}
        {stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Ionicons name="chatbubbles" size={24} color="#887CBC" />
              <Text style={styles.statValue}>{stats.totalConsultations || 0}</Text>
              <Text style={styles.statLabel}>Consultas</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="star" size={24} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.averageRating || '0.0'}</Text>
              <Text style={styles.statLabel}>Valoración</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="calendar" size={24} color="#10B981" />
              <Text style={styles.statValue}>{yearsExperience}</Text>
              <Text style={styles.statLabel}>Años Exp.</Text>
            </View>
          </View>
        )}

        {/* Información de contacto */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Contacto</Text>
          
          <View style={styles.infoCard}>
            <Ionicons name="mail" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Ionicons name="call" size={20} color="#6B7280" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Teléfono</Text>
              <Text style={styles.infoValue}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* Información profesional (solo médicos) */}
        {isMedicalProfile && (
          <>
            {/* Especialidades */}
            {specialties.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Especialidades</Text>
                <View style={styles.tagsContainer}>
                  {specialties.map((specialty: string, index: number) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{specialty}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Biografía */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Acerca de mí</Text>
              <Text style={styles.bioText}>{bio}</Text>
            </View>

            {/* Credenciales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Credenciales</Text>
              
              <View style={styles.infoCard}>
                <Ionicons name="school" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Universidad</Text>
                  <Text style={styles.infoValue}>{university}</Text>
                </View>
              </View>

              <View style={styles.infoCard}>
                <Ionicons name="card" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nº de Licencia</Text>
                  <Text style={styles.infoValue}>{licenseNumber}</Text>
                </View>
              </View>
            </View>

            {/* Precios */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Precios de Consultas</Text>
                <TouchableOpacity onPress={handleEditPricing}>
                  <Ionicons name="create" size={20} color="#887CBC" />
                </TouchableOpacity>
              </View>

              <View style={styles.pricingCard}>
                <View style={styles.pricingItem}>
                  <Ionicons name="chatbubble" size={24} color="#3B82F6" />
                  <View style={styles.pricingInfo}>
                    <Text style={styles.pricingLabel}>Chat</Text>
                    <Text style={styles.pricingValue}>${chatPrice}</Text>
                  </View>
                </View>
                <View style={styles.pricingDivider} />
                <View style={styles.pricingItem}>
                  <Ionicons name="videocam" size={24} color="#887CBC" />
                  <View style={styles.pricingInfo}>
                    <Text style={styles.pricingLabel}>Video</Text>
                    <Text style={styles.pricingValue}>${videoPrice}</Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Recomendado vinculado */}
        {recommendationData?.name && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recomendado Vinculado</Text>
              <TouchableOpacity onPress={handleEditRecommendation}>
                <Ionicons name="create" size={20} color="#887CBC" />
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="storefront" size={20} color="#6B7280" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Nombre</Text>
                <Text style={styles.infoValue}>{recommendationData.name}</Text>
              </View>
            </View>

            {recommendationData.description ? (
              <View style={styles.infoCard}>
                <Ionicons name="information-circle" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Descripción</Text>
                  <Text style={styles.infoValue}>{recommendationData.description}</Text>
                </View>
              </View>
            ) : null}

            {recommendationData.address ? (
              <View style={styles.infoCard}>
                <Ionicons name="location" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Dirección</Text>
                  <Text style={styles.infoValue}>{recommendationData.address}</Text>
                </View>
              </View>
            ) : null}

            {recommendationData.phone ? (
              <View style={styles.infoCard}>
                <Ionicons name="call" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Teléfono</Text>
                  <Text style={styles.infoValue}>{recommendationData.phone}</Text>
                </View>
              </View>
            ) : null}

            {recommendationData.website ? (
              <View style={styles.infoCard}>
                <Ionicons name="globe" size={20} color="#6B7280" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Sitio Web</Text>
                  <Text style={styles.infoValue}>{recommendationData.website}</Text>
                </View>
              </View>
            ) : null}
          </View>
        )}

        {/* Acciones */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <Ionicons name="create" size={20} color="#887CBC" />
            <Text style={styles.actionButtonText}>Editar Perfil</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleEditRecommendation}>
            <Ionicons name="storefront-outline" size={20} color="#887CBC" />
            <Text style={styles.actionButtonText}>Editar Recomendado</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>


          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleManageDocuments}
          >
            <Ionicons name="document-text" size={20} color="#887CBC" />
            <Text style={styles.actionButtonText}>Gestionar Documentos</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Schedule')}
          >
            <Ionicons name="calendar" size={20} color="#887CBC" />
            <Text style={styles.actionButtonText}>Configurar Horario</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out" size={20} color="#EF4444" />
            <Text style={[styles.actionButtonText, styles.logoutButtonText]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>

        {/* Versión de la app */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Munpa Profesional v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Modal de edición de precios */}
      <EditPricingModal
        visible={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        currentChatPrice={chatPrice}
        currentVideoPrice={videoPrice}
        onSuccess={loadProfileData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#887CBC',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#887CBC',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 2,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileType: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  statusBadgeTextPending: {
    color: '#F59E0B',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#887CBC',
  },
  bioText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pricingItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pricingDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  pricingInfo: {
    flex: 1,
  },
  pricingLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  pricingValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  logoutButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  logoutButtonText: {
    color: '#EF4444',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

export default SpecialistProfileScreen;
