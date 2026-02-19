import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import consultationsService, { Consultation } from '../services/consultationsService';
import analyticsService from '../services/analyticsService';

const MUNPA_PRIMARY = '#96d2d3';

const MyConsultationsScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  useEffect(() => {
    loadConsultations();
    analyticsService.logScreenView('MyConsultations');
  }, [filter]);

  const loadConsultations = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const filters: any = {};
      if (filter === 'pending') {
        filters.status = 'pending,accepted,in_progress';
      } else if (filter === 'completed') {
        filters.status = 'completed';
      }

      const response = await consultationsService.getConsultations(filters);
      const consultationsData = response.data || response;
      
      setConsultations(Array.isArray(consultationsData) ? consultationsData : []);
      
      analyticsService.logEvent('my_consultations_viewed', {
        filter,
        consultations_count: Array.isArray(consultationsData) ? consultationsData.length : 0,
      });
    } catch (error) {
      console.error('❌ [MY CONSULTATIONS] Error cargando consultas:', error);
      setConsultations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadConsultations(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
      awaiting_payment: { label: 'Esperando pago', color: '#F59E0B', bgColor: '#FEF3C7', icon: 'time' },
      pending: { label: 'Pendiente', color: '#3B82F6', bgColor: '#DBEAFE', icon: 'hourglass' },
      accepted: { label: 'Aceptada', color: '#10B981', bgColor: '#D1FAE5', icon: 'checkmark-circle' },
      in_progress: { label: 'En progreso', color: '#8B5CF6', bgColor: '#EDE9FE', icon: 'chatbubbles' },
      completed: { label: 'Completada', color: '#059669', bgColor: '#D1FAE5', icon: 'checkmark-done-circle' },
      cancelled: { label: 'Cancelada', color: '#EF4444', bgColor: '#FEE2E2', icon: 'close-circle' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Ionicons name={config.icon as any} size={14} color={config.color} />
        <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderConsultation = ({ item }: { item: Consultation }) => (
    <TouchableOpacity
      style={styles.consultationCard}
      onPress={() => navigation.navigate('ConsultationDetail', { consultationId: item.id })}
      activeOpacity={0.7}
    >
      <View style={styles.consultationHeader}>
        <View style={styles.consultationTypeIcon}>
          <Ionicons
            name={item.type === 'chat' ? 'chatbubbles' : 'videocam'}
            size={20}
            color={item.type === 'chat' ? MUNPA_PRIMARY : '#887CBC'}
          />
        </View>
        <View style={styles.consultationHeaderInfo}>
          <Text style={styles.consultationChildName}>{item.childName}</Text>
          <Text style={styles.consultationSpecialist}>
            {item.specialistName || 'Especialista asignado'}
          </Text>
        </View>
        {getStatusBadge(item.status)}
      </View>

      <Text style={styles.consultationDescription} numberOfLines={2}>
        {item.request.description}
      </Text>

      <View style={styles.consultationFooter}>
        <View style={styles.consultationDate}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.consultationDateText}>
            {new Date(item.createdAt).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
        
        {item.pricing && (
          <Text style={styles.consultationPrice}>${item.pricing.finalPrice}</Text>
        )}

        {item.chat && item.chat.messageCount > 0 && (
          <View style={styles.messageCount}>
            <Ionicons name="chatbubble" size={14} color={MUNPA_PRIMARY} />
            <Text style={styles.messageCountText}>{item.chat.messageCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
      
      {/* Header */}
      <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Consultas</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            Todas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
            Activas
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterButtonText, filter === 'completed' && styles.filterButtonTextActive]}>
            Completadas
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
          <Text style={styles.loadingText}>Cargando consultas...</Text>
        </View>
      ) : (
        <FlatList
          data={consultations}
          renderItem={renderConsultation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[MUNPA_PRIMARY]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No tienes consultas</Text>
              <Text style={styles.emptyStateText}>
                {filter === 'completed'
                  ? 'No has completado ninguna consulta aún'
                  : 'Inicia una consulta con un especialista'}
              </Text>
              {filter === 'all' && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('SpecialistsList')}
                >
                  <Text style={styles.emptyStateButtonText}>Consultar especialista</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: MUNPA_PRIMARY,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  consultationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  consultationTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  consultationHeaderInfo: {
    flex: 1,
  },
  consultationChildName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  consultationSpecialist: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  consultationDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  consultationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  consultationDate: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  consultationDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  consultationPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: MUNPA_PRIMARY,
    marginRight: 12,
  },
  messageCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  messageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: MUNPA_PRIMARY,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: MUNPA_PRIMARY,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default MyConsultationsScreen;
