import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';

type Period = 'week' | 'month' | 'all';

const SpecialistStatsScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    analyticsService.logScreenView('specialist_stats');
    loadStats();
  }, [period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/specialist/stats?period=${period}`);
      console.log('📊 [STATS] Estadísticas cargadas:', response.data);
      
      const statsData = response.data?.data || response.data;
      setStats(statsData);
    } catch (error: any) {
      console.error('❌ [STATS] Error cargando estadísticas:', error);
      // Datos de ejemplo si falla
      setStats({
        totalConsultations: 0,
        totalEarnings: 0,
        averageRating: 0,
        consultationsByType: { chat: 0, video: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Selector de período */}
      <View style={styles.periodSelector}>
        {[
          { key: 'week', label: 'Semana' },
          { key: 'month', label: 'Mes' },
          { key: 'all', label: 'Todo' },
        ].map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[
              styles.periodButton,
              period === p.key && styles.periodButtonActive,
            ]}
            onPress={() => setPeriod(p.key as Period)}
          >
            <Text style={[
              styles.periodButtonText,
              period === p.key && styles.periodButtonTextActive,
            ]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#887CBC" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Tarjetas principales */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="chatbubbles" size={32} color="#887CBC" />
              <Text style={styles.statValue}>{stats?.totalConsultations || 0}</Text>
              <Text style={styles.statLabel}>Consultas Totales</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cash" size={32} color="#10B981" />
              <Text style={styles.statValue}>${stats?.totalEarnings || 0}</Text>
              <Text style={styles.statLabel}>Ganancias</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="star" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{stats?.averageRating || '0.0'}</Text>
              <Text style={styles.statLabel}>Valoración</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="time" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{stats?.avgResponseTime || '0'}h</Text>
              <Text style={styles.statLabel}>Resp. Promedio</Text>
            </View>
          </View>

          {/* Por tipo de consulta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Por Tipo de Consulta</Text>
            
            <View style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <Ionicons name="chatbubble" size={24} color="#3B82F6" />
                <Text style={styles.typeTitle}>Chat</Text>
              </View>
              <Text style={styles.typeValue}>
                {stats?.consultationsByType?.chat || 0} consultas
              </Text>
            </View>

            <View style={styles.typeCard}>
              <View style={styles.typeHeader}>
                <Ionicons name="videocam" size={24} color="#887CBC" />
                <Text style={styles.typeTitle}>Video</Text>
              </View>
              <Text style={styles.typeValue}>
                {stats?.consultationsByType?.video || 0} consultas
              </Text>
            </View>
          </View>

          {/* Mensaje informativo */}
          <View style={styles.infoSection}>
            <Ionicons name="information-circle" size={20} color="#6B7280" />
            <Text style={styles.infoSectionText}>
              Las estadísticas se actualizan en tiempo real conforme completas consultas
            </Text>
          </View>
        </ScrollView>
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#887CBC',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#887CBC',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dayTime: {
    fontSize: 14,
    color: '#887CBC',
    marginTop: 4,
  },
  consultationsLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  consultationsLimitInfo: {
    flex: 1,
    marginLeft: 12,
  },
  consultationsLimitLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  consultationsLimitValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#887CBC',
    marginTop: 4,
  },
  consultationsButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  consultationsButton: {
    padding: 8,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginLeft: 12,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#887CBC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  typeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
    gap: 12,
  },
  infoSectionText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});

export default SpecialistStatsScreen;
