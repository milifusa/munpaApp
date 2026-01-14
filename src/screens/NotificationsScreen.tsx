import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { axiosInstance as api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import notificationService from '../services/notificationService';

interface Notification {
  id: string;
  type: 'new_message' | 'purchase' | 'reservation' | 'interest' | 'admin_notification' | 'broadcast';
  title: string;
  body: string;
  imageUrl?: string;
  data?: {
    type?: string;
    screen?: string;
    senderId?: string;
    productId?: string;
    [key: string]: any;
  };
  read: boolean;
  createdAt: string;
}

const NotificationsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      console.log('📬 [NOTIFICATIONS] Cargando notificaciones...');
      const response = await api.get('/api/notifications');
      
      if (response.data?.success) {
        const notifs = response.data.data || response.data.notifications || [];
        setNotifications(Array.isArray(notifs) ? notifs : []);
        const unread = notifs.filter((n: Notification) => !n.read).length;
        setUnreadCount(unread);
        
        // Actualizar badge count del sistema
        await notificationService.setBadgeCount(unread);
      } else {
        setNotifications([]);
        await notificationService.setBadgeCount(0);
      }
    } catch (error: any) {
      console.error('❌ [NOTIFICATIONS] Error cargando notificaciones:', error);
      if (error.response?.status === 404) {
        console.warn('⚠️ [NOTIFICATIONS] Endpoint no encontrado (404). El backend aún no está implementado.');
        setNotifications([]);
        await notificationService.setBadgeCount(0);
      } else {
        setNotifications([]);
        await notificationService.setBadgeCount(0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    // Marcar como leída
    if (!notification.read) {
      try {
        await api.patch(`/api/notifications/${notification.id}/read`);
        setNotifications(prev =>
          prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
        );
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        
        // Actualizar badge count del sistema
        await notificationService.setBadgeCount(newUnreadCount);
      } catch (error) {
        console.error('❌ [NOTIFICATIONS] Error marcando como leída:', error);
        // Aún así actualizar localmente y el badge
        const newUnreadCount = Math.max(0, unreadCount - 1);
        setUnreadCount(newUnreadCount);
        await notificationService.setBadgeCount(newUnreadCount);
      }
    }

    // Navegar según el tipo
    const data = notification.data || {};
    const type = notification.type || data.type;

    try {
      switch (type) {
        case 'new_message':
          if (data.productId && data.senderId) {
            navigation.navigate('MarketplaceMessages', {
              productId: data.productId,
              otherUserId: data.senderId,
            });
          }
          break;

        case 'purchase':
        case 'reservation':
        case 'interest':
          navigation.navigate('MyProducts');
          break;

        case 'admin_notification':
        case 'broadcast':
          if (data.screen) {
            let screenName = data.screen.replace('Screen', '');
            
            // Mapear pantallas conocidas a sus rutas correctas
            if (screenName === 'Home' || screenName === 'HomeMain') {
              // Home está dentro de MainTabs
              navigation.navigate('MainTabs');
              return;
            }
            
            // Intentar navegación directa primero (para pantallas en AuthenticatedNavigator)
            const directScreens = ['MyProducts', 'MarketplaceMessages', 'ProductDetail', 'CreateProduct', 'MarketplaceFavorites', 'Notifications', 'Profile', 'Doula'];
            if (directScreens.includes(screenName)) {
              try {
                navigation.navigate(screenName as any);
                return;
              } catch (err) {
                console.warn(`⚠️ [NOTIFICATIONS] No se pudo navegar directamente a ${screenName}, intentando navegación anidada...`);
              }
            }
            
            // Para otras pantallas, intentar navegación anidada a través de MainTabs
            try {
              navigation.navigate('MainTabs', {
                screen: screenName as any,
              });
            } catch (err) {
              console.warn(`⚠️ [NOTIFICATIONS] No se pudo navegar a ${screenName}, navegando a MainTabs por defecto`);
              navigation.navigate('MainTabs');
            }
          } else {
            // Navegar a MainTabs (que tiene Home como tab por defecto)
            navigation.navigate('MainTabs');
          }
          break;

        default:
          // Navegar a MainTabs por defecto (que tiene Home como tab por defecto)
          navigation.navigate('MainTabs');
      }
    } catch (error) {
      console.error('❌ [NOTIFICATIONS] Error navegando:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📬 [NOTIFICATIONS] Marcando todas las notificaciones como leídas...');
      const response = await api.patch('/api/notifications/mark-all-read');
      
      
      // Actualizar estado local inmediatamente
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      // Actualizar badge count del sistema a 0
      await notificationService.setBadgeCount(0);
      
      // Recargar notificaciones desde el servidor para asegurar sincronización
      setTimeout(() => {
        loadNotifications();
      }, 500);
    } catch (error: any) {
      console.error('❌ [NOTIFICATIONS] Error marcando todas como leídas:', error);
      console.error('❌ [NOTIFICATIONS] Detalles del error:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      
      // Si el endpoint no existe (404), actualizar solo localmente
      if (error.response?.status === 404) {
        console.warn('⚠️ [NOTIFICATIONS] Endpoint no encontrado (404). Actualizando solo localmente.');
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        // Actualizar badge count del sistema
        await notificationService.setBadgeCount(0);
      } else {
        // Para otros errores, intentar actualizar localmente de todas formas
        console.warn('⚠️ [NOTIFICATIONS] Error del servidor, actualizando localmente.');
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        // Actualizar badge count del sistema
        await notificationService.setBadgeCount(0);
      }
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_message':
        return 'chatbubble-ellipses';
      case 'purchase':
        return 'checkmark-circle';
      case 'reservation':
        return 'bookmark';
      case 'interest':
        return 'eye';
      case 'admin_notification':
      case 'broadcast':
        return 'megaphone';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'new_message':
        return '#59C6C0';
      case 'purchase':
        return '#B4C14B';
      case 'reservation':
        return '#887CBC';
      case 'interest':
        return '#FFA500';
      case 'admin_notification':
      case 'broadcast':
        return '#FF6B6B';
      default:
        return '#887CBC';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const iconColor = getNotificationColor(item.type);
    const iconName = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotification,
        ]}
        onPress={() => handleNotificationPress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <Ionicons name={iconName as any} size={24} color={iconColor} />
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody}>
            {item.body}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      {unreadCount > 0 && (
        <View style={styles.markAllContainer}>
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={markAllAsRead}
          >
            <Text style={styles.markAllText}>Marcar todas como leídas</Text>
          </TouchableOpacity>
        </View>
      )}

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off" size={64} color="#CCC" />
          <Text style={styles.emptyText}>No tienes notificaciones</Text>
          <Text style={styles.emptySubtext}>
            Te notificaremos cuando recibas mensajes, compras o actualizaciones importantes
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#59C6C0"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  markAllContainer: {
    backgroundColor: '#96d2d3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'flex-end',
  },
  markAllButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
  },
  markAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    padding: 10,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#59C6C0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: 'bold',
  },
  notificationBody: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#96d2d3',
    alignSelf: 'center',
    marginLeft: 8,
  },
});

export default NotificationsScreen;

