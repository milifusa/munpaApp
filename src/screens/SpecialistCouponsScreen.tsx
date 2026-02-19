import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import specialistService from '../services/specialistService';
import analyticsService from '../services/analyticsService';

const SpecialistCouponsScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coupons, setCoupons] = useState<any[]>([]);

  useEffect(() => {
    analyticsService.logScreenView('specialist_coupons');
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const response = await specialistService.getCoupons();
      const couponsData = response?.data || response || [];
      setCoupons(Array.isArray(couponsData) ? couponsData : []);
    } catch (error) {
      console.error('❌ [COUPONS] Error cargando cupones:', error);
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCoupons();
    setRefreshing(false);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Porcentaje';
      case 'fixed': return 'Monto Fijo';
      case 'free': return 'Gratis';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return 'percent';
      case 'fixed': return 'cash';
      case 'free': return 'gift';
      default: return 'pricetag';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage': return '#3B82F6';
      case 'fixed': return '#10B981';
      case 'free': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getApplicableToLabel = (applicableTo: string) => {
    switch (applicableTo) {
      case 'all': return 'Todas las consultas';
      case 'chat': return 'Solo Chat';
      case 'video': return 'Solo Video';
      case 'specific_specialist': return 'Solo para ti';
      default: return applicableTo;
    }
  };

  const getDiscountText = (coupon: any) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    } else if (coupon.type === 'fixed') {
      return `$${coupon.value} OFF`;
    } else if (coupon.type === 'free') {
      return 'GRATIS';
    }
    return '';
  };

  const isExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  const isMaxedOut = (coupon: any) => {
    return coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando cupones...</Text>
      </View>
    );
  }

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
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Los cupones activos se pueden usar en tus consultas. Los pacientes pueden aplicarlos al solicitar una consulta contigo.
          </Text>
        </View>

        {/* Lista de cupones */}
        {coupons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No hay cupones activos</Text>
            <Text style={styles.emptyStateText}>
              Los cupones promocionales aparecerán aquí cuando sean creados
            </Text>
          </View>
        ) : (
          coupons.map((coupon) => {
            const expired = isExpired(coupon.validUntil);
            const maxedOut = isMaxedOut(coupon);
            const inactive = !coupon.isActive || expired || maxedOut;

            return (
              <View
                key={coupon.id}
                style={[styles.couponCard, inactive && styles.couponCardInactive]}
              >
                {/* Header */}
                <View style={styles.couponHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: getTypeColor(coupon.type) + '20' }]}>
                    <Ionicons
                      name={getTypeIcon(coupon.type) as any}
                      size={24}
                      color={getTypeColor(coupon.type)}
                    />
                  </View>
                  <View style={styles.couponHeaderContent}>
                    <Text style={styles.couponCode}>{coupon.code}</Text>
                    <Text style={styles.couponType}>{getTypeLabel(coupon.type)}</Text>
                  </View>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{getDiscountText(coupon)}</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={styles.couponInfo}>
                  <View style={styles.couponInfoRow}>
                    <Ionicons name="checkmark-circle" size={16} color="#6B7280" />
                    <Text style={styles.couponInfoText}>
                      {getApplicableToLabel(coupon.applicableTo)}
                    </Text>
                  </View>

                  <View style={styles.couponInfoRow}>
                    <Ionicons name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.couponInfoText}>
                      Válido hasta {new Date(coupon.validUntil).toLocaleDateString('es-EC')}
                    </Text>
                  </View>

                  {coupon.maxUses > 0 && (
                    <View style={styles.couponInfoRow}>
                      <Ionicons name="people" size={16} color="#6B7280" />
                      <Text style={styles.couponInfoText}>
                        Usado {coupon.usedCount} de {coupon.maxUses} veces
                      </Text>
                    </View>
                  )}
                </View>

                {/* Estado */}
                {inactive && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>
                      {expired ? 'Expirado' : maxedOut ? 'Agotado' : 'Inactivo'}
                    </Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
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
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  couponCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  couponCardInactive: {
    opacity: 0.6,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponHeaderContent: {
    flex: 1,
  },
  couponCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  couponType: {
    fontSize: 13,
    color: '#6B7280',
  },
  discountBadge: {
    backgroundColor: '#887CBC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  discountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  couponInfo: {
    gap: 8,
  },
  couponInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  couponInfoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF4444',
    textAlign: 'center',
  },
});

export default SpecialistCouponsScreen;
