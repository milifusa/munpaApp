import { Platform } from 'react-native';
import { getTrackingStatus, requestTrackingPermission, TrackingStatus } from 'react-native-tracking-transparency';

/**
 * Servicio para gestionar App Tracking Transparency (ATT)
 * Solo aplica en iOS 14.5+
 */
export const trackingService = {
  /**
   * Solicita permiso de tracking al usuario
   * Debe llamarse después de que la app esté visible
   */
  requestTrackingPermission: async (): Promise<TrackingStatus> => {
    
    // Solo en iOS
    if (Platform.OS !== 'ios') {
      console.log('⚠️ [TRACKING] ATT solo aplica en iOS, saltando...');
      return 'unavailable';
    }

    try {
      // Verificar el estado actual
      const currentStatus = await getTrackingStatus();

      // Si ya se decidió (authorized o denied), no volver a preguntar
      if (currentStatus === 'authorized' || currentStatus === 'denied') {
        return currentStatus;
      }

      // Si está "not-determined", solicitar permiso
      if (currentStatus === 'not-determined') {
        const newStatus = await requestTrackingPermission();
        return newStatus;
      }

      // Para cualquier otro caso (restricted, unavailable)
      console.log('⚠️ [TRACKING] Estado especial:', currentStatus);
      return currentStatus;
    } catch (error) {
      console.error('❌ [TRACKING] Error solicitando permiso:', error);
      return 'unavailable';
    }
  },

  /**
   * Obtiene el estado actual del permiso de tracking
   */
  getTrackingStatus: async (): Promise<TrackingStatus> => {
    if (Platform.OS !== 'ios') {
      return 'unavailable';
    }

    try {
      const status = await getTrackingStatus();
      return status;
    } catch (error) {
      console.error('❌ [TRACKING] Error obteniendo estado:', error);
      return 'unavailable';
    }
  },

  /**
   * Verifica si el tracking está autorizado
   */
  isTrackingAuthorized: async (): Promise<boolean> => {
    const status = await trackingService.getTrackingStatus();
    return status === 'authorized';
  },

  /**
   * Obtiene una explicación del estado actual
   */
  getStatusDescription: (status: TrackingStatus): string => {
    switch (status) {
      case 'authorized':
        return 'Tracking autorizado. Puedes personalizar la experiencia del usuario.';
      case 'denied':
        return 'Tracking denegado. El usuario no quiere ser rastreado.';
      case 'not-determined':
        return 'Permiso no solicitado aún. Solicita cuando sea apropiado.';
      case 'restricted':
        return 'Tracking restringido por configuración del dispositivo o parental controls.';
      case 'unavailable':
        return 'ATT no disponible (iOS < 14.5 o Android).';
      default:
        return 'Estado desconocido.';
    }
  }
};

/**
 * Tipos de eventos que puedes trackear (si el usuario autoriza)
 * 
 * IMPORTANTE: Solo trackea si trackingService.isTrackingAuthorized() === true
 */
export interface TrackingEvent {
  eventName: string;
  properties?: Record<string, any>;
  userId?: string;
}

/**
 * Función para enviar eventos de tracking (si está autorizado)
 */
export const trackEvent = async (event: TrackingEvent): Promise<void> => {
  const isAuthorized = await trackingService.isTrackingAuthorized();

  if (!isAuthorized) {
    console.log('🚫 [TRACKING] Evento no enviado - tracking no autorizado:', event.eventName);
    return;
  }
  
  // Aquí irían tus servicios de analytics (Firebase Analytics, Mixpanel, etc.)
  // Por ejemplo:
  // await analytics().logEvent(event.eventName, event.properties);
};

