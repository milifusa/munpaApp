import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import specialistService from '../services/specialistService';
import analyticsService from '../services/analyticsService';
import ManageConsultationModal from '../components/ManageConsultationModal';
import CompleteConsultationModal from '../components/CompleteConsultationModal';

type ConsultationStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
type FilterTab = 'pending' | 'active' | 'completed' | 'all';

const SpecialistConsultationsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedConsultation, setSelectedConsultation] = useState<any>(null);

  useEffect(() => {
    analyticsService.logScreenView('specialist_consultations');
    
    // Agregar botón de refresh en el header
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 10 }}>
          <TouchableOpacity
            onPress={loadConsultations}
            disabled={loading}
            style={{ padding: 8 }}
          >
            <Ionicons name="refresh" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [loading]);

  useFocusEffect(
    useCallback(() => {
      loadConsultations();
    }, [])
  );

  const loadConsultations = async () => {
    try {
      setLoading(true);
      console.log('📋 [SPECIALIST CONSULTATIONS] Cargando consultas...');
      
      // GET /api/specialist/consultations
      const response = await specialistService.getConsultations();
      console.log('✅ [SPECIALIST CONSULTATIONS] Consultas obtenidas:', response);
      
      const consultationsData = response?.data ?? response ?? [];
      const consultationsList = Array.isArray(consultationsData) ? consultationsData : [];
      
      // Ordenar por fecha (más recientes primero)
      const sorted = consultationsList.sort((a: any, b: any) => {
        const dateA = new Date(a.createdAt || a.request?.date || 0).getTime();
        const dateB = new Date(b.createdAt || b.request?.date || 0).getTime();
        return dateB - dateA;
      });
      
      setConsultations(sorted);
      console.log(`📊 [SPECIALIST CONSULTATIONS] ${sorted.length} consultas cargadas`);
    } catch (error) {
      console.error('❌ [SPECIALIST CONSULTATIONS] Error cargando consultas:', error);
      setConsultations([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConsultations();
    setRefreshing(false);
  };

  const getFilteredConsultations = () => {
    switch (activeTab) {
      case 'pending':
        return consultations.filter(c => c.status === 'pending');
      case 'active':
        return consultations.filter(c => 
          c.status === 'accepted' || c.status === 'in_progress'
        );
      case 'completed':
        return consultations.filter(c => 
          c.status === 'completed' || c.status === 'cancelled'
        );
      case 'all':
      default:
        return consultations;
    }
  };

  const getStatusColor = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#3B82F6';
      case 'in_progress': return '#10B981';
      case 'completed': return '#6B7280';
      case 'cancelled': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: ConsultationStatus) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'in_progress': return 'En Curso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'video' ? 'videocam' : 'chatbubble';
  };

  const getTypeColor = (type: string) => {
    return type === 'video' ? '#887CBC' : '#3B82F6';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      return `Hace ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `Hace ${diffDays}d`;
    }
  };

  const handleStartConsultation = async (consultationId: string) => {
    try {
      await specialistService.startConsultation(consultationId);
      await loadConsultations();
      navigation.navigate('ConsultationDetail', { consultationId });
    } catch (error) {
      console.error('Error iniciando consulta:', error);
    }
  };

  const renderConsultationCard = (consultation: any) => {
    const consultationId = consultation.consultationId || consultation.id;
    const status = consultation.status;
    const type = consultation.type || 'chat';
    const childName = consultation.childName || 'Paciente';
    const createdAt = consultation.createdAt || consultation.request?.date;
    const symptoms = consultation.request?.symptoms || [];
    const urgency = consultation.request?.urgency || 'normal';

    return (
      <TouchableOpacity
        key={consultationId}
        style={styles.consultationCard}
        onPress={() => navigation.navigate('ConsultationDetail', { 
          consultationId,
          fromSpecialistView: true 
        })}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.childName}>{childName}</Text>
            <Text style={styles.consultationDate}>{formatDate(createdAt)}</Text>
          </View>
          <View style={styles.badges}>
            <View style={[styles.typeBadge, { backgroundColor: getTypeColor(type) + '20' }]}>
              <Ionicons name={getTypeIcon(type)} size={14} color={getTypeColor(type)} />
              <Text style={[styles.typeBadgeText, { color: getTypeColor(type) }]}>
                {type === 'video' ? 'Video' : 'Chat'}
              </Text>
            </View>
          </View>
        </View>

        {/* Síntomas */}
        {symptoms.length > 0 && (
          <View style={styles.symptomsContainer}>
            <Ionicons name="medical" size={14} color="#6B7280" />
            <Text style={styles.symptomsText} numberOfLines={1}>
              {symptoms.slice(0, 2).join(', ')}
              {symptoms.length > 2 && ` +${symptoms.length - 2}`}
            </Text>
          </View>
        )}

        {/* Urgencia */}
        {urgency === 'urgent' && (
          <View style={styles.urgencyBadge}>
            <Ionicons name="warning" size={14} color="#EF4444" />
            <Text style={styles.urgencyText}>Urgente</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
            <Text style={styles.statusBadgeText}>{getStatusLabel(status)}</Text>
          </View>
          
          {(status === 'pending' || status === 'accepted') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                if (status === 'pending') {
                  setSelectedConsultation(consultation);
                  setShowManageModal(true);
                } else if (status === 'accepted') {
                  handleStartConsultation(consultationId);
                }
              }}
            >
              <Text style={styles.actionButtonText}>
                {status === 'pending' ? 'Revisar' : 'Iniciar'}
              </Text>
              <Ionicons 
                name={status === 'pending' ? 'arrow-forward' : 'play-circle'} 
                size={14} 
                color={status === 'pending' ? '#887CBC' : '#10B981'} 
              />
            </TouchableOpacity>
          )}
          
          {status === 'in_progress' && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  navigation.navigate('ConsultationDetail', { consultationId });
                }}
              >
                <Text style={styles.actionButtonText}>Continuar</Text>
                <Ionicons name="chatbubble-ellipses" size={14} color="#3B82F6" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedConsultation(consultation);
                  setShowCompleteModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>Completar</Text>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const filteredConsultations = getFilteredConsultations();

  return (
    <View style={styles.container}>
      {/* Tabs de filtro */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            { key: 'pending', label: 'Pendientes', icon: 'time' },
            { key: 'active', label: 'Activas', icon: 'chatbubbles' },
            { key: 'completed', label: 'Completadas', icon: 'checkmark-circle' },
            { key: 'all', label: 'Todas', icon: 'list' },
          ].map((tab) => {
            const count = tab.key === 'all' 
              ? consultations.length 
              : getFilteredConsultations().length;
            
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  activeTab === tab.key && styles.tabActive,
                ]}
                onPress={() => setActiveTab(tab.key as FilterTab)}
              >
                <Ionicons 
                  name={tab.icon as any} 
                  size={18} 
                  color={activeTab === tab.key ? '#887CBC' : '#6B7280'} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}>
                  {tab.label}
                </Text>
                {activeTab === tab.key && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de consultas */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#887CBC" />
          <Text style={styles.loadingText}>Cargando consultas...</Text>
        </View>
      ) : (
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
          {filteredConsultations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>
                {activeTab === 'pending' && 'No hay consultas pendientes'}
                {activeTab === 'active' && 'No hay consultas activas'}
                {activeTab === 'completed' && 'No hay consultas completadas'}
                {activeTab === 'all' && 'No tienes consultas aún'}
              </Text>
              <Text style={styles.emptyStateText}>
                {activeTab === 'pending' && 'Las nuevas solicitudes aparecerán aquí'}
                {activeTab === 'active' && 'Aquí verás las consultas en progreso'}
                {activeTab === 'completed' && 'Tu historial de consultas estará aquí'}
                {activeTab === 'all' && 'Cuando recibas consultas, las verás aquí'}
              </Text>
            </View>
          ) : (
            <View style={styles.consultationsList}>
              {filteredConsultations.map(renderConsultationCard)}
            </View>
          )}
        </ScrollView>
      )}

      {/* Modales */}
      {selectedConsultation && (
        <>
          <ManageConsultationModal
            visible={showManageModal}
            onClose={() => {
              setShowManageModal(false);
              setSelectedConsultation(null);
            }}
            consultationId={selectedConsultation.id || selectedConsultation.consultationId}
            consultationType={selectedConsultation.type}
            onSuccess={loadConsultations}
          />
          
          <CompleteConsultationModal
            visible={showCompleteModal}
            onClose={() => {
              setShowCompleteModal(false);
              setSelectedConsultation(null);
            }}
            consultationId={selectedConsultation.id || selectedConsultation.consultationId}
            onSuccess={loadConsultations}
            canPrescribe={selectedConsultation.canPrescribe ?? user?.professionalProfile?.accountType === 'specialist'}
          />
        </>
      )}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F9FAFB',
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#EDE9FE',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#887CBC',
  },
  tabBadge: {
    backgroundColor: '#887CBC',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  consultationsList: {
    padding: 16,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  consultationDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  symptomsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  symptomsText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 4,
  },
  completeButton: {
    backgroundColor: '#D1FAE5',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SpecialistConsultationsScreen;
