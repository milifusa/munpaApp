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
      
      // Verificar si la app se abrió desde una notificación
      await this.checkInitialNotification();
      
      isInitialized = true;
      console.log('✅ [NOTIF] Servicio de notificaciones inicializado.');
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
      console.log('🔍 [NOTIF] Verificando si hay notificación inicial...');
      const response = await Notifications.getLastNotificationResponseAsync();
      
      if (response) {
        console.log('🎯 [NOTIF] ===== APP ABIERTA DESDE NOTIFICACIÓN =====');
        console.log('🎯 [NOTIF] Título:', response.notification.request.content.title);
        console.log('🎯 [NOTIF] Data:', JSON.stringify(response.notification.request.content.data));
        
        const rawData: any = response.notification.request.content.data || {};
        const nestedData: any = rawData.data || {};
        const type: string =
          rawData.type ||
          rawData.notificationType ||
          nestedData.type ||
          nestedData.notificationType ||
          '';
        const data: any = { ...nestedData, ...rawData, type };

        console.log('🔍 [NOTIF] Type extraído:', type);
        
        // Esperar a que handleNotificationNavigation esté disponible (hasta 8 segundos)
        const tryNavigate = (attempts: number) => {
          if (typeof (global as any).handleNotificationNavigation === 'function') {
            console.log('🚀 [NOTIF] Navegando desde notificación inicial...');
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
        console.log('ℹ️ [NOTIF] No hay notificación inicial');
      }
    } catch (error) {
      console.error('❌ [NOTIF] Error verificando notificación inicial:', error);
    }
  },

  /**
   * Configura los listeners para notificaciones recibidas y respuestas
   */
  configureNotificationListeners() {
    console.log('🎯 [NOTIF] Configurando listeners de notificaciones...');
    
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
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('👆👆👆 [NOTIF] ===== CLICK EN NOTIFICACIÓN DETECTADO =====');
      console.log('👆 [NOTIF] Usuario interactuó con notificación:', response.notification.request.content.title);
      console.log('👆 [NOTIF] Notification data:', JSON.stringify(response.notification.request.content.data));
      console.log('👆 [NOTIF] Action identifier:', response.actionIdentifier);
      
      // Manejar acciones de medicamentos
      if (response.actionIdentifier === 'MED_TAKEN') {
        console.log('✅ [MED] Confirmado: tomado');
      }
      if (response.actionIdentifier === 'MED_SKIPPED') {
        console.log('🟡 [MED] Confirmado: no tomado');
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

      console.log('🔍 [NOTIF] Type extraído de data:', type);
      console.log('🔍 [NOTIF] Screen extraído de data:', data.screen);
      console.log('🔍 [NOTIF] Data normalizada:', JSON.stringify(data));

      // Usar la función global de navegación si está disponible
      if (typeof (global as any).handleNotificationNavigation === 'function') {
        console.log('🚀 [NOTIF] Llamando a handleNotificationNavigation con:', { type, screen: data.screen, data });
        (global as any).handleNotificationNavigation({ type, screen: data.screen, data });
      } else {
        console.warn('⚠️ [NOTIF] handleNotificationNavigation no está disponible');
      }
    });
    
    console.log('✅ [NOTIF] Listener de respuestas registrado:', responseListener);
  },

  /**
   * Obtiene el token de push notifications y lo registra con el backend
   */
  async registerToken(existingToken?: string): Promise<string | null> {
    try {
      console.log('🚀 [NOTIF] ========================================');
      console.log('🚀 [NOTIF] INICIO DE registerToken()');
      console.log('🚀 [NOTIF] ========================================');
      console.log('🔔 [NOTIF] Iniciando registro de token...');
      console.log('🔔 [NOTIF] Token existente:', existingToken ? existingToken.substring(0, 50) + '...' : 'ninguno');

      let token = existingToken;
      let tokenType: 'expo' = 'expo';

      if (!token) {
        console.log('🔔 [NOTIF] No hay token existente, solicitando permisos...');
        
        // Solicitar permisos (Expo maneja esto bien en ambas plataformas)
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
        if (!Device.isDevice) {
          console.log('⚠️ [NOTIF] Simulador detectado, no se puede obtener token Expo.');
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

        console.log('✅ [NOTIF] Token Expo obtenido:', token);
        if (typeof Clipboard?.setString === 'function') {
          Clipboard.setString(token);
        } else {
          console.log('⚠️ [NOTIF] Clipboard no disponible, no se pudo copiar el token');
        }
      } else {
        console.log(`🔔 [NOTIF] Usando token existente tipo EXPO`);
      }

      // Registrar token con el backend
      if (token) {
        console.log('📤 [NOTIF] Enviando token al backend...');
        console.log('📤 [NOTIF] Token (primeros 50 chars):', token.substring(0, 50) + '...');
        console.log('📤 [NOTIF] Token length:', token.length);
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



