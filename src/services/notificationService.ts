import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { axiosInstance as api } from './api';

// Configurar cómo se manejan las notificaciones cuando la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let isInitialized = false;

const notificationService = {
  async configureNotificationCategories() {
    try {
      await Notifications.setNotificationCategoryAsync('medication_reminder', [
        {
          identifier: 'MED_TAKEN',
          buttonTitle: 'La tomé',
          options: { opensAppToForeground: false },
        },
        {
          identifier: 'MED_SKIPPED',
          buttonTitle: 'No la tomé',
          options: { opensAppToForeground: false },
        },
      ]);
      console.log('✅ [NOTIF] Categorías de notificación configuradas.');
    } catch (error) {
      console.error('❌ [NOTIF] Error configurando categorías:', error);
    }
  },

  isMedicationNotification(notification: Notifications.Notification) {
    const data: any = notification.request.content.data || {};
    const title = notification.request.content.title || '';
    return (
      data?.type === 'medication_reminder' ||
      data?.kind === 'medication' ||
      data?.medicationId ||
      data?.reminderId ||
      /medicamento/i.test(title)
    );
  },
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
      await this.configureNotificationCategories();
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
      if (this.isMedicationNotification(notification)) {
        Alert.alert(
          '¿Tomó el medicamento?',
          notification.request.content.body || 'Confirma si ya lo tomó.',
          [
            { text: 'No la tomé', style: 'destructive', onPress: () => console.log('🟡 [MED] No tomado') },
            { text: 'La tomé', onPress: () => console.log('✅ [MED] Tomado') },
          ]
        );
      }
    });

    // Listener para cuando el usuario interactúa con una notificación
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆 [NOTIF] Usuario interactuó con notificación:', response.notification.request.content.title);
      if (response.actionIdentifier === 'MED_TAKEN') {
        console.log('✅ [MED] Confirmado: tomado');
      }
      if (response.actionIdentifier === 'MED_SKIPPED') {
        console.log('🟡 [MED] Confirmado: no tomado');
      }
      // Aquí puedes manejar la navegación basada en la notificación
    });
  },

  /**
   * Obtiene el token de push notifications y lo registra con el backend
   */
  async registerToken(existingToken?: string): Promise<string | null> {
    try {
      console.log('🔔 [NOTIF] Iniciando registro de token...');
      console.log('🔔 [NOTIF] Token existente:', existingToken ? existingToken.substring(0, 50) + '...' : 'ninguno');
      
      let token = existingToken;
      let tokenType: 'fcm' | 'apns' | 'expo' | undefined;

      if (!token) {
        console.log('🔔 [NOTIF] No hay token existente, solicitando permisos...');
        
        // Solicitar permisos
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        console.log('🔔 [NOTIF] Estado de permisos actual:', existingStatus);

        if (existingStatus !== 'granted') {
          console.log('🔔 [NOTIF] Solicitando permisos...');
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          console.log('🔔 [NOTIF] Permisos otorgados:', finalStatus);
        }

        if (finalStatus !== 'granted') {
          console.log('⚠️ [NOTIF] Permiso de notificaciones no concedido');
          return null;
        }

        // Obtener token del dispositivo (FCM/APNs)
        if (Device.isDevice) {
          console.log('🔔 [NOTIF] Dispositivo real detectado, obteniendo token...');
          
          try {
            const deviceToken = await Notifications.getDevicePushTokenAsync();
            token = deviceToken.data;
            tokenType = Platform.OS === 'android' ? 'fcm' : 'apns';
            console.log(`✅ [NOTIF] Token ${tokenType.toUpperCase()} obtenido:`, token?.substring(0, 50) + '...');
          } catch (deviceTokenError) {
            console.error('❌ [NOTIF] Error obteniendo token del dispositivo:', deviceTokenError);
          }

          // Fallback a token de Expo si no hay token del dispositivo
          if (!token) {
            console.log('🔔 [NOTIF] No se pudo obtener token del dispositivo, usando Expo...');
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
              console.error('❌ [NOTIF] No se encontró el projectId en la configuración');
              return null;
            }
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            token = tokenData.data;
            tokenType = 'expo';
            console.log('✅ [NOTIF] Token Expo obtenido:', token?.substring(0, 50) + '...');
          }
        } else {
          console.log('⚠️ [NOTIF] Simulador detectado, no se puede obtener token');
          return null;
        }
      } else {
        // Si hay token existente, determinar el tipo
        tokenType = Platform.OS === 'android' ? 'fcm' : 'apns';
        console.log(`🔔 [NOTIF] Usando token existente tipo ${tokenType.toUpperCase()}`);
      }

      // Registrar token con el backend
      if (token) {
        console.log('📤 [NOTIF] Enviando token al backend...');
        console.log('📤 [NOTIF] Token:', token.substring(0, 50) + '...');
        console.log('📤 [NOTIF] Token Type:', tokenType);
        console.log('📤 [NOTIF] Platform:', Platform.OS);
        console.log('📤 [NOTIF] Device ID:', Constants.deviceId || 'unknown');
        
        const response = await api.post('/api/notifications/register-token', {
          token,
          tokenType,
          platform: Platform.OS,
          deviceId: Constants.deviceId || 'unknown',
        });
        
        console.log('✅ [NOTIF] Token registrado con el backend exitosamente');
        console.log('✅ [NOTIF] Respuesta del backend:', response.data);
      } else {
        console.log('⚠️ [NOTIF] No hay token para registrar');
      }

      return token;
    } catch (error: any) {
      console.error('❌ [NOTIF] Error registrando token:', error);
      console.error('❌ [NOTIF] Error details:', error.response?.data || error.message);
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



