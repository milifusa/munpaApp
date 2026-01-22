import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert, Platform } from 'react-native';
import Constants from 'expo-constants';
import { axiosInstance as api } from './api';
import messaging from '@react-native-firebase/messaging';

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
      let tokenType: 'fcm' | 'apns' | 'expo' = 'fcm'; // Por defecto FCM

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

        // Obtener token: Intentar FCM primero, fallback a Expo si no funciona
        if (Device.isDevice) {
          console.log('🔔 [NOTIF] Dispositivo real detectado, intentando obtener token FCM...');
          
          try {
            // Verificar si el módulo de messaging está disponible
            console.log('🔍 [NOTIF] Verificando disponibilidad de Firebase Messaging...');
            
            // Verificar estado de autorización de Firebase Messaging
            const authStatus = await messaging().requestPermission();
            const enabled =
              authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
              authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (!enabled) {
              console.log('⚠️ [NOTIF] Usuario no autorizó notificaciones de Firebase');
              throw new Error('Usuario no autorizó notificaciones de Firebase');
            }

            console.log('✅ [NOTIF] Autorización de Firebase Messaging concedida');
            
            // Obtener token FCM directamente (funciona en iOS y Android nativos)
            token = await messaging().getToken();
            tokenType = 'fcm';
            
            if (!token) {
              console.error('❌ [NOTIF] Token FCM vacío, intentando fallback a Expo...');
              throw new Error('Token FCM vacío');
            }
            
            console.log(`✅ [NOTIF] Token FCM obtenido (${token.length} caracteres):`, token.substring(0, 50) + '...');
            console.log(`🔍 [NOTIF] Token completo para debug:`, token);
            
            // Mostrar alerta con el token FCM COMPLETO
            Alert.alert(
              '✅ Token FCM Obtenido',
              `TIPO: FCM\nLongitud: ${token.length} chars\n\nTOKEN COMPLETO:\n${token}`,
              [{ text: 'OK' }]
            );
            
          } catch (fcmError: any) {
            console.error('❌ [NOTIF] Error obteniendo token FCM:', fcmError);
            console.error('❌ [NOTIF] Error details:', fcmError.message);
            
            // Fallback a Expo Push Token para desarrollo/testing
            console.log('🔄 [NOTIF] Fallback: intentando obtener token de Expo...');
            try {
              const projectId = Constants.expoConfig?.extra?.eas?.projectId;
              if (!projectId) {
                console.error('❌ [NOTIF] No se encontró projectId en configuración');
                return null;
              }
              
              const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
              token = tokenData.data;
              tokenType = 'expo';
              console.log('⚠️ [NOTIF] Token Expo obtenido (DESARROLLO):', token.substring(0, 50) + '...');
              console.log('⚠️ [NOTIF] ADVERTENCIA: Token Expo no funcionará con FCM en producción');
              console.log('⚠️ [NOTIF] Necesitas hacer build nativo: npx expo run:ios');
              
              // Mostrar alerta con el token Expo COMPLETO
              Alert.alert(
                '⚠️ Token Expo (Desarrollo)',
                `TIPO: EXPO (Fallback)\nLongitud: ${token.length} chars\n\nTOKEN COMPLETO:\n${token}\n\n⚠️ Este token NO funcionará con FCM.\nHaz build nativo: npx expo run:ios`,
                [{ text: 'Entendido' }]
              );
              
            } catch (expoError: any) {
              console.error('❌ [NOTIF] Error obteniendo token de Expo:', expoError);
              return null;
            }
          }
        } else {
          console.log('⚠️ [NOTIF] Simulador detectado, usando token de Expo para desarrollo...');
          try {
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;
            if (!projectId) {
              console.error('❌ [NOTIF] No se encontró projectId en configuración');
              return null;
            }
            
            const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
            token = tokenData.data;
            tokenType = 'expo';
            console.log('📱 [NOTIF] Token Expo obtenido (SIMULADOR):', token.substring(0, 50) + '...');
          } catch (error: any) {
            console.error('❌ [NOTIF] Error obteniendo token de Expo:', error);
            return null;
          }
        }
      } else {
        // Si hay token existente, asumimos que es FCM
        tokenType = 'fcm';
        console.log(`🔔 [NOTIF] Usando token existente tipo FCM`);
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
        
        // Mostrar alerta de confirmación
        Alert.alert(
          '✅ Token Registrado',
          `Token tipo ${tokenType.toUpperCase()} registrado con el backend correctamente.\n\nPlatform: ${Platform.OS}\nToken length: ${token.length} chars`,
          [{ text: 'OK' }]
        );
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



