import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import specialistService from '../services/specialistService';
import analyticsService from '../services/analyticsService';

const SpecialistHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    analyticsService.logScreenView('specialist_history');
    loadHistory();
  }, []);

  const loadHistory = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);

      const response = await specialistService.getHistory(pageNum, 20);
      const data = response?.data || response || {};
      const newConsultations = data?.consultations || [];
      const pagination = data?.pagination || {};

      if (append) {
        setConsultations([...consultations, ...newConsultations]);
      } else {
        setConsultations(newConsultations);
      }

      setHasMore(pagination.page < pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('❌ [HISTORY] Error cargando historial:', error);
      if (!append) setConsultations([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setHasMore(true);
    await loadHistory(1, false);
    setRefreshing(false);
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadHistory(page + 1, true);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderConsultation = ({ item }: { item: any }) => {
    const type = item.type || 'chat';
    const rating = item.rating?.score || 0;
    const hasRating = !!item.rating?.score;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ConsultationDetail', { 
          consultationId: item.id,
          fromSpecialistView: true 
        })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.childName}>{item.childName || 'Paciente'}</Text>
            <Text style={styles.date}>{formatDate(item.schedule?.completedAt || item.updatedAt)}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: type === 'video' ? '#887CBC20' : '#3B82F620' }]}>
            <Ionicons
              name={type === 'video' ? 'videocam' : 'chatbubble'}
              size={14}
              color={type === 'video' ? '#887CBC' : '#3B82F6'}
            />
            <Text style={[styles.typeBadgeText, { color: type === 'video' ? '#887CBC' : '#3B82F6' }]}>
              {type === 'video' ? 'Video' : 'Chat'}
            </Text>
          </View>
        </View>

        {item.outcome?.diagnosis && (
          <View style={styles.outcomeSection}>
            <Text style={styles.outcomeLabel}>Diagnóstico:</Text>
            <Text style={styles.outcomeText} numberOfLines={2}>
              {item.outcome.diagnosis}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.priceContainer}>
            <Ionicons name="cash" size={16} color="#10B981" />
            <Text style={styles.priceText}>${item.pricing?.finalPrice || 0}</Text>
          </View>

          {hasRating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color="#887CBC" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {consultations.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyStateTitle}>No hay historial</Text>
          <Text style={styles.emptyStateText}>
            Las consultas completadas aparecerán aquí
          </Text>
        </View>
      ) : (
        <FlatList
          data={consultations}
          renderItem={renderConsultation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#887CBC"
              colors={['#887CBC']}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
        />
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
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  date: {
    fontSize: 13,
    color: '#6B7280',
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
  outcomeSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  outcomeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  outcomeText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});

export default SpecialistHistoryScreen;
