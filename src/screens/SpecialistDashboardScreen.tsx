import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { axiosInstance } from '../services/api';
import specialistService from '../services/specialistService';
import analyticsService from '../services/analyticsService';

const SpecialistDashboardScreen = () => {
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
    completed: 0,
    totalEarnings: 0,
  });
  const [recentConsultations, setRecentConsultations] = useState<any[]>([]);

  // Estados para perfil de SERVICIO
  const [serviceStats, setServiceStats] = useState({
    totalProducts: 0,
    availableProducts: 0,
    totalSales: 0,
    totalEarnings: 0,
    pendingMessages: 0,
  });
  const [recentProducts, setRecentProducts] = useState<any[]>([]);

  useEffect(() => {
    analyticsService.logScreenView(isMedicalProfile ? 'specialist_dashboard' : 'service_dashboard');
    loadDashboardData();
  }, [isMedicalProfile]);

  const loadDashboardData = async () => {
    if (isMedicalProfile) {
      await loadMedicalDashboard();
    } else {
      await loadServiceDashboard();
    }
  };

  const loadMedicalDashboard = async () => {
    try {
      setLoading(true);
      
      // GET /api/specialist/consultations
      const response = await specialistService.getConsultations();
      const allConsultations = response?.data ?? response ?? [];
      const myConsultations = Array.isArray(allConsultations) ? allConsultations : [];

      // Calcular estadísticas
      const pending = myConsultations.filter((c: any) => c.status === 'pending').length;
      const active = myConsultations.filter((c: any) => 
        ['accepted', 'in_progress'].includes(c.status)
      ).length;
      const completed = myConsultations.filter((c: any) => c.status === 'completed').length;
      
      // Calcular ganancias
      const totalEarnings = myConsultations
        .filter((c: any) => c.status === 'completed')
        .reduce((sum: number, c: any) => sum + (c.pricing?.finalPrice || 0), 0);

      setStats({
        pending,
        active,
        completed,
        totalEarnings,
      });

      // Consultas recientes (últimas 5)
      const recent = myConsultations
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);

      setRecentConsultations(recent);
    } catch (error) {
      console.error('❌ [DASHBOARD] Error cargando datos médicos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadServiceDashboard = async () => {
    try {
      setLoading(true);
      console.log('📦 [DASHBOARD] Cargando datos de servicio...');
      
      // Cargar productos del vendedor
      const productsResponse = await axiosInstance.get('/api/vendor/products');
      const productsData = productsResponse?.data?.data || productsResponse?.data?.products || [];
      const productsList = Array.isArray(productsData) ? productsData : [];
      
      console.log('✅ [DASHBOARD] Productos cargados:', productsList.length);
      
      // Calcular estadísticas
      const availableProducts = productsList.filter((p: any) => 
        p.status === 'disponible' || p.status === 'available'
      ).length;
      
      const soldProducts = productsList.filter((p: any) => 
        p.status === 'vendido' || p.status === 'sold'
      ).length;
      
      // Calcular ganancias (productos vendidos)
      const totalEarnings = productsList
        .filter((p: any) => p.status === 'vendido' || p.status === 'sold')
        .reduce((sum: number, p: any) => sum + (p.price || 0), 0);
      
      setServiceStats({
        totalProducts: productsList.length,
        availableProducts,
        totalSales: soldProducts,
        totalEarnings,
        pendingMessages: 0, // TODO: Implementar cuando haya API de mensajes
      });
      
      // Productos recientes (últimos 5)
      const recentProductsList = productsList
        .sort((a: any, b: any) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        })
        .slice(0, 5);
      
      setRecentProducts(recentProductsList);
      
    } catch (error) {
      console.error('❌ [DASHBOARD] Error cargando datos de servicio:', error);
      // Mantener datos vacíos en caso de error
      setServiceStats({
        totalProducts: 0,
        availableProducts: 0,
        totalSales: 0,
        totalEarnings: 0,
        pendingMessages: 0,
      });
      setRecentProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'accepted': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#6B7280';
      default: return '#9CA3AF';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'in_progress': return 'En Curso';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#887CBC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {isMedicalProfile ? 'Dashboard Médico' : 'Dashboard Negocio'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {user?.displayName || (isMedicalProfile ? 'Profesional' : 'Negocio')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openMenu}
        >
          <Ionicons name="menu" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
        {/* Tarjetas de estadísticas - MÉDICO */}
        {isMedicalProfile && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="time-outline" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{stats.pending}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="chatbubbles-outline" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{stats.active}</Text>
              <Text style={styles.statLabel}>Activas</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#10B981" />
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="cash-outline" size={32} color="#887CBC" />
              <Text style={styles.statValue}>${stats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Ganancias</Text>
            </View>
          </View>
        )}

        {/* Tarjetas de estadísticas - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cube-outline" size={32} color="#F59E0B" />
              <Text style={styles.statValue}>{serviceStats.totalProducts}</Text>
              <Text style={styles.statLabel}>Productos</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="checkmark-circle-outline" size={32} color="#3B82F6" />
              <Text style={styles.statValue}>{serviceStats.availableProducts}</Text>
              <Text style={styles.statLabel}>Disponibles</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="cart-outline" size={32} color="#10B981" />
              <Text style={styles.statValue}>{serviceStats.totalSales}</Text>
              <Text style={styles.statLabel}>Ventas</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="cash-outline" size={32} color="#887CBC" />
              <Text style={styles.statValue}>${serviceStats.totalEarnings}</Text>
              <Text style={styles.statLabel}>Ganancias</Text>
            </View>
          </View>
        )}

        {/* Acciones rápidas - MÉDICO */}
        {isMedicalProfile && (
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              analyticsService.logEvent('specialist_view_pending_consultations');
              // TODO: Navegar a consultas pendientes
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="document-text" size={24} color="#887CBC" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Ver Consultas Pendientes</Text>
              <Text style={styles.actionSubtitle}>
                {stats.pending} consulta{stats.pending !== 1 ? 's' : ''} esperando revisión
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              analyticsService.logEvent('specialist_view_active_consultations');
              // TODO: Navegar a consultas activas
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#3B82F6" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Consultas en Curso</Text>
              <Text style={styles.actionSubtitle}>
                {stats.active} consulta{stats.active !== 1 ? 's' : ''} activa{stats.active !== 1 ? 's' : ''}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              analyticsService.logEvent('specialist_view_profile');
              // TODO: Navegar a perfil de especialista
            }}
          >
            <View style={styles.actionIcon}>
              <Ionicons name="person" size={24} color="#10B981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Mi Perfil Profesional</Text>
              <Text style={styles.actionSubtitle}>
                Editar información y especialidades
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
        )}

        {/* Acciones rápidas - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                analyticsService.logEvent('service_create_product');
                (navigation as any).navigate('VendorCreateProduct');
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="add-circle" size={24} color="#887CBC" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Publicar Nuevo Producto</Text>
                <Text style={styles.actionSubtitle}>
                  Agrega un producto al marketplace
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                analyticsService.logEvent('service_view_products');
                (navigation as any).navigate('MainTabs', { screen: 'MunpaMarket' });
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="cube" size={24} color="#3B82F6" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Gestionar Productos</Text>
                <Text style={styles.actionSubtitle}>
                  {serviceStats.totalProducts} producto{serviceStats.totalProducts !== 1 ? 's' : ''} total
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                analyticsService.logEvent('service_view_messages');
                // TODO: Navegar a mensajes
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="chatbubbles" size={24} color="#F59E0B" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Mensajes</Text>
                <Text style={styles.actionSubtitle}>
                  {serviceStats.pendingMessages} mensaje{serviceStats.pendingMessages !== 1 ? 's' : ''} sin leer
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                analyticsService.logEvent('service_view_promotions');
                // TODO: Navegar a promociones
              }}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="pricetag" size={24} color="#10B981" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Promociones</Text>
                <Text style={styles.actionSubtitle}>
                  Gestionar ofertas y descuentos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Consultas recientes - MÉDICO */}
        {isMedicalProfile && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Consultas Recientes</Text>
          
          {recentConsultations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No hay consultas recientes</Text>
            </View>
          ) : (
            recentConsultations.map((consultation) => (
              <TouchableOpacity
                key={consultation.consultationId || consultation.id}
                style={styles.consultationCard}
                onPress={() => {
                  analyticsService.logEvent('specialist_view_consultation', {
                    consultation_id: consultation.consultationId || consultation.id,
                  });
                  (navigation as any).navigate('ConsultationDetail', {
                    consultationId: consultation.consultationId || consultation.id,
                  });
                }}
              >
                <View style={styles.consultationHeader}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(consultation.status) + '20' }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(consultation.status) }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(consultation.status) }
                    ]}>
                      {getStatusLabel(consultation.status)}
                    </Text>
                  </View>
                  <Text style={styles.consultationType}>
                    {consultation.type === 'chat' ? '💬 Chat' : '📹 Video'}
                  </Text>
                </View>

                <Text style={styles.childName}>
                  Paciente: {consultation.childName}
                </Text>
                <Text style={styles.consultationDate}>
                  {new Date(consultation.createdAt).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        )}

        {/* Productos recientes - SERVICIO */}
        {isServiceProfile && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                Aquí aparecerán tus productos más recientes
              </Text>
            </View>

            {/* TODO: Mostrar productos recientes cuando se implemente la API */}
            {/* recentProducts.map((product) => ( ... )) */}
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
    backgroundColor: '#887CBC',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E9D5FF',
    marginTop: 2,
  },
  menuButton: {
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  quickActions: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    fontFamily: 'Montserrat',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  recentSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
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
  childName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  consultationDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});

export default SpecialistDashboardScreen;
