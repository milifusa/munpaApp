import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
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
      return;
    }
    
    
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
      
      // Verificar si la app se abrió desde una notificación
      await this.checkInitialNotification();
      
      isInitialized = true;
    } catch (error) {
      console.error('❌ [NOTIF] Error inicializando notificaciones:', error);
      throw error;
    }
  },

  /**
   * Verifica si la app se abrió desde una notificación
   */
  async checkInitialNotification() {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        
        const rawData: any = response.notification.request.content.data || {};
        const nestedData: any = rawData.data || {};
        const type: string =
          rawData.type ||
          rawData.notificationType ||
          nestedData.type ||
          nestedData.notificationType ||
          '';
        const data: any = { ...nestedData, ...rawData, type };

        
        // Esperar a que handleNotificationNavigation esté disponible (hasta 8 segundos)
        const tryNavigate = (attempts: number) => {
          if (typeof (global as any).handleNotificationNavigation === 'function') {
            (global as any).handleNotificationNavigation({ type, screen: data.screen, data });
          } else if (attempts > 0) {
            console.warn(`⚠️ [NOTIF] handleNotificationNavigation no disponible, reintentando (${attempts} intentos restantes)...`);
            setTimeout(() => tryNavigate(attempts - 1), 500);
          } else {
            console.error('❌ [NOTIF] handleNotificationNavigation nunca estuvo disponible, navegación perdida.');
          }
        };
        setTimeout(() => tryNavigate(15), 300);
      } else {
      }
    } catch (error) {
      console.error('❌ [NOTIF] Error verificando notificación inicial:', error);
    }
  },

  /**
   * Configura los listeners para notificaciones recibidas y respuestas
   */
  configureNotificationListeners() {
    
    // Listener para notificaciones recibidas mientras la app está abierta
    Notifications.addNotificationReceivedListener((notification) => {
      if (this.isMedicationNotification(notification)) {
        Alert.alert(
          '¿Tomó el medicamento?',
          notification.request.content.body || 'Confirma si ya lo tomó.',
          [
            { text: 'No la tomé', style: 'destructive', onPress: () => undefined },
            { text: 'La tomé', onPress: () => undefined },
          ]
        );
      }
    });

    // Listener para cuando el usuario interactúa con una notificación
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      
      // Manejar acciones de medicamentos
      if (response.actionIdentifier === 'MED_TAKEN') {
      }
      if (response.actionIdentifier === 'MED_SKIPPED') {
      }
      
      // Manejar navegación basada en la notificación
      const rawData: any = response.notification.request.content.data || {};
      // Normalizar: el type puede estar en data.type, data.data.type, o data.notificationType
      const nestedData: any = rawData.data || {};
      const type: string =
        rawData.type ||
        rawData.notificationType ||
        nestedData.type ||
        nestedData.notificationType ||
        '';
      // Merge de campos para que lleguen al switch correctamente
      const data: any = { ...nestedData, ...rawData, type };


      // Usar la función global de navegación si está disponible
      if (typeof (global as any).handleNotificationNavigation === 'function') {
        (global as any).handleNotificationNavigation({ type, screen: data.screen, data });
      } else {
        console.warn('⚠️ [NOTIF] handleNotificationNavigation no está disponible');
      }
    });
    
  },

  /**
   * Obtiene el token de push notifications y lo registra con el backend
   */
  async registerToken(existingToken?: string): Promise<string | null> {
    try {

      let token = existingToken;
      let tokenType: 'expo' = 'expo';

      if (!token) {
        
        // Solicitar permisos (Expo maneja esto bien en ambas plataformas)
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return null;
        }
        if (!Device.isDevice) {
          return null;
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
        if (!projectId) {
          console.error('❌ [NOTIF] No se encontró projectId en configuración');
          return null;
        }

        if (typeof Notifications.getExpoPushTokenAsync !== 'function') {
          console.error('❌ [NOTIF] getExpoPushTokenAsync no disponible');
          return null;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        token = tokenData.data;
        tokenType = 'expo';

        if (typeof Clipboard?.setString === 'function') {
          Clipboard.setString(token);
        } else {
        }
      } else {
      }

      // Registrar token con el backend
      if (token) {
        
        const response = await api.post('/api/notifications/register-token', {
          token,
          tokenType,
          platform: Platform.OS,
          deviceId: Constants.deviceId || 'unknown',
        });
        
        
      } else {
      }

      return token;
    } catch (error: any) {
      console.error('❌ [NOTIF] Error registrando token:', error);
      console.error('❌ [NOTIF] Error details:', error.response?.data || error.message);
      console.error('❌ [NOTIF] Error stack:', error.stack);
      
      return null;
    }
  },

  /**
   * Elimina el token de push notifications del backend
   */
  async removeToken(): Promise<void> {
    try {
      await api.delete('/api/notifications/remove-token');
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
    } catch (error) {
      console.error('❌ [NOTIF] Error actualizando badge count:', error);
    }
  },
};

export default notificationService;



