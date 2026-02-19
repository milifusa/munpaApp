import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { axiosInstance } from '../services/api';
import specialistService from '../services/specialistService';
import analyticsService from '../services/analyticsService';
import { LinearGradient } from 'expo-linear-gradient';

const SpecialistHomeScreen = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { openMenu } = useMenu();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Detectar tipo de perfil
  const accountType = user?.professionalProfile?.accountType || 'specialist';
  const isServiceProfile = accountType === 'service';
  const isMedicalProfile = !isServiceProfile; // Todos los demás son profesionales médicos
  
  // Estados para perfil MÉDICO
  const [stats, setStats] = useState({
    pending: 0,
    active: 0,
    completedToday: 0,
    todayEarnings: 0,
  });
  const [pendingConsultations, setPendingConsultations] = useState<any[]>([]);
  const [activeConsultations, setActiveConsultations] = useState<any[]>([]);

  // Estados para perfil de SERVICIO
  const [serviceStats, setServiceStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    salesToday: 0,
    todayEarnings: 0,
  });
  const [recentProducts, setRecentProducts] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    analyticsService.logScreenView(isMedicalProfile ? 'specialist_home' : 'service_home');
  }, [isMedicalProfile]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    if (isMedicalProfile) {
      await loadMedicalData();
    } else {
      await loadServiceData();
    }
  };

  const loadMedicalData = async () => {
    try {
      setLoading(true);
      
      // GET /api/specialist/consultations
      const response = await specialistService.getConsultations();
      const allConsultations = response?.data ?? response ?? [];
      const myConsultations = Array.isArray(allConsultations) ? allConsultations : [];

      // Calcular estadísticas
      const pending = myConsultations.filter((c: any) => c.status === 'pending');
      const active = myConsultations.filter((c: any) => 
        ['accepted', 'in_progress'].includes(c.status)
      );
      
      // Completadas hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const completedToday = myConsultations.filter((c: any) => {
        if (c.status !== 'completed') return false;
        const completedDate = new Date(c.schedule?.completedAt || 0);
        return completedDate >= today;
      });

      // Ganancias de hoy
      const todayEarnings = completedToday.reduce(
        (sum: number, c: any) => sum + (c.pricing?.finalPrice || 0),
        0
      );

      setStats({
        pending: pending.length,
        active: active.length,
        completedToday: completedToday.length,
        todayEarnings,
      });

      setPendingConsultations(pending.slice(0, 3));
      setActiveConsultations(active.slice(0, 3));
    } catch (error) {
      console.error('❌ [SPECIALIST HOME] Error cargando datos médicos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadServiceData = async () => {
    try {
      setLoading(true);
      console.log('📦 [SERVICE HOME] Cargando datos de servicio...');
      
      // Cargar productos del vendedor
      const productsResponse = await axiosInstance.get('/api/vendor/products');
      const productsData = productsResponse?.data?.data || productsResponse?.data?.products || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      
      console.log('✅ [SERVICE HOME] Productos cargados:', productsList.length);
      
      // Calcular estadísticas
      const availableProducts = productsList.filter((p: any) => 
        p.status === 'disponible' || p.status === 'available'
      ).length;
      
      // Ventas de hoy
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const salesToday = productsList.filter((p: any) => {
        if (!p.soldAt) return false;
        const soldDate = new Date(p.soldAt);
        return soldDate >= today && (p.status === 'vendido' || p.status === 'sold');
      });
      
      const todayEarnings = salesToday.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
      
      setServiceStats({
        totalProducts: productsList.length,
        availableProducts,
        salesToday: salesToday.length,
        todayEarnings,
      });
      
      // Productos recientes (últimos 3)
      const recentProductsList = productsList
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 3);
      
      setRecentProducts(recentProductsList);
      setRecentMessages([]); // TODO: Implementar cuando haya API de mensajes
      
    } catch (error) {
      console.error('❌ [SERVICE HOME] Error cargando datos de servicio:', error);
      // Mantener datos vacíos en caso de error
      setServiceStats({
        totalProducts: 0,
        availableProducts: 0,
        salesToday: 0,
        todayEarnings: 0,
      });
      setRecentProducts([]);
      setRecentMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'in_progress': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'in_progress': return 'En Curso';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#887CBC" />
      
      {/* Header con gradiente morado */}
      <LinearGradient
        colors={['#887CBC', '#7B68B0']}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>
              {user?.displayName || (isMedicalProfile ? 'Profesional' : 'Negocio')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={openMenu}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tarjetas de estadísticas en el header - MÉDICO */}
        {isMedicalProfile && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="chatbubbles" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats.active}</Text>
            <Text style={styles.statLabel}>Activas</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Hoy</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="cash" size={24} color="#887CBC" />
            </View>
            <Text style={styles.statValue}>${stats.todayEarnings}</Text>
            <Text style={styles.statLabel}>Ganado</Text>
          </View>
        </View>
        )}

        {/* Tarjetas de estadísticas en el header - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="cube" size={24} color="#F59E0B" />
              </View>
              <Text style={styles.statValue}>{serviceStats.totalProducts}</Text>
              <Text style={styles.statLabel}>Productos</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.statValue}>{serviceStats.availableProducts}</Text>
              <Text style={styles.statLabel}>Disponibles</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="cart" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{serviceStats.salesToday}</Text>
              <Text style={styles.statLabel}>Ventas Hoy</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="cash" size={24} color="#887CBC" />
              </View>
              <Text style={styles.statValue}>${serviceStats.todayEarnings}</Text>
              <Text style={styles.statLabel}>Ganado</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#887CBC"
          />
        }
      >
        {/* Acciones rápidas - MÉDICO */}
        {isMedicalProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
                onPress={() => {
                  analyticsService.logEvent('specialist_quick_action', { action: 'pending' });
                  // TODO: Navegar a pendientes
                }}
              >
                <Ionicons name="time" size={32} color="#F59E0B" />
                <Text style={[styles.actionText, { color: '#92400E' }]}>
                  Ver Pendientes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#DBEAFE' }]}
                onPress={() => {
                  analyticsService.logEvent('specialist_quick_action', { action: 'active' });
                  // TODO: Navegar a activas
                }}
              >
                <Ionicons name="chatbubbles" size={32} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#1E40AF' }]}>
                  Consultas Activas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#EDE9FE' }]}
                onPress={() => {
                  analyticsService.logEvent('specialist_quick_action', { action: 'dashboard' });
                  (navigation as any).navigate('SpecialistDashboard');
                }}
              >
                <Ionicons name="stats-chart" size={32} color="#887CBC" />
                <Text style={[styles.actionText, { color: '#5B21B6' }]}>
                  Dashboard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#D1FAE5' }]}
                onPress={() => {
                  analyticsService.logEvent('specialist_quick_action', { action: 'schedule' });
                  // TODO: Navegar a horario
                }}
              >
                <Ionicons name="calendar" size={32} color="#10B981" />
                <Text style={[styles.actionText, { color: '#065F46' }]}>
                  Mi Horario
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Acciones rápidas - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#FEF3C7' }]}
                onPress={() => {
                  analyticsService.logEvent('service_quick_action', { action: 'create_product' });
                  (navigation as any).navigate('VendorCreateProduct');
                }}
              >
                <Ionicons name="add-circle" size={32} color="#F59E0B" />
                <Text style={[styles.actionText, { color: '#92400E' }]}>
                  Nuevo Producto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#DBEAFE' }]}
                onPress={() => {
                  analyticsService.logEvent('service_quick_action', { action: 'my_products' });
                  (navigation as any).navigate('MainTabs', { screen: 'MunpaMarket' });
                }}
              >
                <Ionicons name="cube" size={32} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#1E40AF' }]}>
                  Mis Productos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#EDE9FE' }]}
                onPress={() => {
                  analyticsService.logEvent('service_quick_action', { action: 'messages' });
                  // TODO: Navegar a mensajes
                }}
              >
                <Ionicons name="chatbubbles" size={32} color="#887CBC" />
                <Text style={[styles.actionText, { color: '#5B21B6' }]}>
                  Mensajes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionCard, { backgroundColor: '#D1FAE5' }]}
                onPress={() => {
                  analyticsService.logEvent('service_quick_action', { action: 'discounts' });
                  (navigation as any).navigate('VendorDiscounts');
                }}
              >
                <Ionicons name="pricetag" size={32} color="#10B981" />
                <Text style={[styles.actionText, { color: '#065F46' }]}>
                  Descuentos
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Consultas pendientes - MÉDICO */}
        {isMedicalProfile && pendingConsultations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consultas Pendientes</Text>
              <TouchableOpacity
                onPress={() => {
                  // TODO: Ver todas las pendientes
                }}
              >
                <Text style={styles.seeAll}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {pendingConsultations.map((consultation) => (
              <TouchableOpacity
                key={consultation.consultationId || consultation.id}
                style={styles.consultationCard}
                onPress={() => {
                  (navigation as any).navigate('ConsultationDetail', {
                    consultationId: consultation.consultationId || consultation.id,
                  });
                }}
              >
                <View style={styles.consultationHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
                    <View style={[styles.statusDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={[styles.statusText, { color: '#92400E' }]}>
                      Pendiente
                    </Text>
                  </View>
                  <Text style={styles.consultationType}>
                    {consultation.type === 'chat' ? '💬 Chat' : '📹 Video'}
                  </Text>
                </View>

                <Text style={styles.patientName}>
                  Paciente: {consultation.childName}
                </Text>
                <Text style={styles.consultationDescription} numberOfLines={2}>
                  {consultation.request?.description}
                </Text>
                <Text style={styles.consultationTime}>
                  {new Date(consultation.createdAt).toLocaleString('es-ES')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Consultas activas - MÉDICO */}
        {isMedicalProfile && activeConsultations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Consultas Activas</Text>
              <TouchableOpacity
                onPress={() => {
                  // TODO: Ver todas las activas
                }}
              >
                <Text style={styles.seeAll}>Ver todas</Text>
              </TouchableOpacity>
            </View>

            {activeConsultations.map((consultation) => (
              <TouchableOpacity
                key={consultation.consultationId || consultation.id}
                style={styles.consultationCard}
                onPress={() => {
                  (navigation as any).navigate('ConsultationDetail', {
                    consultationId: consultation.consultationId || consultation.id,
                  });
                }}
              >
                <View style={styles.consultationHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
                    <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={[styles.statusText, { color: '#1E40AF' }]}>
                      {getStatusLabel(consultation.status)}
                    </Text>
                  </View>
                  <Text style={styles.consultationType}>
                    {consultation.type === 'chat' ? '💬 Chat' : '📹 Video'}
                  </Text>
                </View>

                <Text style={styles.patientName}>
                  Paciente: {consultation.childName}
                </Text>
                <Text style={styles.consultationDescription} numberOfLines={2}>
                  {consultation.request?.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Estado vacío - MÉDICO */}
        {isMedicalProfile && pendingConsultations.length === 0 && activeConsultations.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Todo al día! ✨</Text>
            <Text style={styles.emptyText}>
              No tienes consultas pendientes ni activas en este momento
            </Text>
          </View>
        )}

        {/* Estado vacío - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>¡Bienvenido! 🏪</Text>
            <Text style={styles.emptyText}>
              Comienza a publicar productos para que las familias puedan encontrar tu negocio
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#E9D5FF',
    fontWeight: '500',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  menuButton: {
    padding: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
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
    fontFamily: 'Montserrat',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  consultationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  consultationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  consultationDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    lineHeight: 20,
  },
  consultationTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SpecialistHomeScreen;
