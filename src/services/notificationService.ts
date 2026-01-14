import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { axiosInstance as api } from './api';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

let isInitialized = false;

const notificationService = {
  /**
   * Inicializa el servicio de notificaciones (solo para recibir push notifications del backend)
   */
  async initialize() {
    if (isInitialized) {
      console.log('🔔 [NOTIF] Servicio de notificaciones ya inicializado.');
      return;
    }
    
    console.log('🚀 [NOTIF] Inicializando servicio de notificaciones...');
    
    try {
      // Configurar canales de Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificaciones predeterminadas',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#59C6C0',
        });
      }

      // Registrar listeners de notificaciones
      this.configureNotificationListeners();
      
      isInitialized = true;
      console.log('✅ [NOTIF] Servicio de notificaciones inicializado.');
    } catch (error) {
      console.error('❌ [NOTIF] Error inicializando notificaciones:', error);
      throw error;
    }
  },

  /**
   * Configura los listeners para notificaciones recibidas y respuestas
   */
  configureNotificationListeners() {
    // Listener para notificaciones recibidas mientras la app está abierta
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('📨 [NOTIF] Notificación recibida:', notification.request.content.title);
    });

    // Listener para cuando el usuario interactúa con una notificación
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 [NOTIF] Usuario interactuó con notificación:', response.notification.request.content.title);
      // Aquí puedes manejar la navegación basada en la notificación
    });
  },

  /**
   * Obtiene el token de push notifications y lo registra con el backend
   */
  async registerToken(existingToken?: string): Promise<string | null> {
    try {
      let token = existingToken;

      if (!token) {
        // Solicitar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('⚠️ [NOTIF] Permiso de notificaciones no concedido');
          return null;
        }

        // Obtener token de Expo
        if (Device.isDevice) {
          const projectId = Constants.expoConfig?.extra?.eas?.projectId;
          
          if (!projectId) {
            console.error('❌ [NOTIF] No se encontró el projectId en la configuración');
            return null;
          }

          const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
          token = tokenData.data;
          console.log('✅ [NOTIF] Token obtenido:', token);
        } else {
          console.log('⚠️ [NOTIF] No se puede obtener token en simulador');
          return null;
        }
      }

      // Registrar token con el backend
      if (token) {
        await api.post('/api/notifications/register-token', {
          token,
          platform: Platform.OS,
          deviceId: Constants.deviceId || 'unknown',
        });
        console.log('✅ [NOTIF] Token registrado con el backend');
      }

      return token;
    } catch (error) {
      console.error('❌ [NOTIF] Error registrando token:', error);
      return null;
    }
  },

  /**
   * Elimina el token de push notifications del backend
   */
  async removeToken(): Promise<void> {
    try {
      await api.delete('/api/notifications/remove-token');
      console.log('✅ [NOTIF] Token eliminado del backend');
    } catch (error) {
      console.error('❌ [NOTIF] Error eliminando token:', error);
      throw error;
    }
  },

  /**
   * Actualiza el badge count de la aplicación
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`✅ [NOTIF] Badge count actualizado a: ${count}`);
    } catch (error) {
      console.error('❌ [NOTIF] Error actualizando badge count:', error);
    }
  },
};

export default notificationService;



