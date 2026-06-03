import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * 📱 Servicio de Notificación en Curso para Tracking de Siesta
 * 
 * Muestra una notificación persistente en iOS/Android mientras hay una siesta activa,
 * similar a la que muestran apps de música o cronómetros.
 * 
 * Incluye:
 * - Tiempo transcurrido en tiempo real
 * - Tiempo restante estimado
 * - Botones de pausa/reanudar y detener
 */

interface ActiveNapData {
  startTime: string;
  expectedDuration?: number;
  isPaused?: boolean;
  napNumber?: number;
}

class SleepTrackingNotification {
  private notificationId: string = 'active-nap-tracking';
  private updateInterval: NodeJS.Timeout | null = null;
  private currentNapData: ActiveNapData | null = null;

  /**
   * Solicitar permisos de notificaciones
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('⚠️ [NAP-NOTIF] Permisos de notificaciones no otorgados');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error solicitando permisos:', error);
      return false;
    }
  }

  /**
   * Configurar categorías de notificaciones con acciones (botones)
   */
  async setupNotificationCategories(): Promise<void> {
    try {
      
      // Configurar handler PRIMERO
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          return {
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        },
      });
      
      // Definir acciones para cuando está corriendo
      await Notifications.setNotificationCategoryAsync('nap-tracking-running', [
        {
          identifier: 'pause-nap',
          buttonTitle: '⏸️ Pausar',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'stop-nap',
          buttonTitle: '⏹️ Detener',
          options: {
            opensAppToForeground: true,
            isDestructive: true,
          },
        },
      ]);

      // Definir acciones para cuando está pausada
      await Notifications.setNotificationCategoryAsync('nap-tracking-paused', [
        {
          identifier: 'resume-nap',
          buttonTitle: '▶️ Reanudar',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'stop-nap',
          buttonTitle: '⏹️ Detener',
          options: {
            opensAppToForeground: true,
            isDestructive: true,
          },
        },
      ]);

    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error configurando categorías:', error);
    }
  }

  /**
   * Iniciar notificación de tracking de siesta
   */
  async startTracking(napData: ActiveNapData): Promise<void> {
    try {
      
      // Verificar y solicitar permisos
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ [NAP-NOTIF] No hay permisos, no se puede mostrar notificación');
        return;
      }
      
      // PRIMERO: Detener intervalo anterior si existe
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // SEGUNDO: Guardar los datos ANTES de actualizar
      this.currentNapData = napData;

      // TERCERO: Configurar handler de comportamiento de notificaciones
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // CUARTO: Mostrar notificación UNA SOLA VEZ
      await this.updateNotification();

      // NO actualizar periódicamente porque en iOS cada actualización crea una nueva notificación
      // La barra visual en HomeScreen se actualiza en tiempo real
      
    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error iniciando tracking:', error);
    }
  }

  /**
   * Actualizar el estado de pausa
   */
  async updatePauseState(isPaused: boolean): Promise<void> {
    if (this.currentNapData) {
      this.currentNapData.isPaused = isPaused;
      await this.updateNotification();
    }
  }

  /**
   * Actualizar la notificación con el tiempo actual
   */
  private async updateNotification(): Promise<void> {
    if (!this.currentNapData) {
      console.warn('⚠️ [NAP-NOTIF] No hay datos de siesta para actualizar notificación');
      return;
    }

    try {
      
      const now = new Date();
      const startTime = new Date(this.currentNapData.startTime);
      const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
      
      
      const hours = Math.floor(elapsedMinutes / 60);
      const mins = elapsedMinutes % 60;
      const timeText = hours > 0 ? `${hours}:${mins.toString().padStart(2, '0')}` : `${mins} min`;

      let bodyText = `⏱️ ${timeText}`;
      
      if (this.currentNapData.expectedDuration) {
        const remaining = this.currentNapData.expectedDuration - elapsedMinutes;
        if (remaining > 0) {
          // Calcular hora de finalización
          const endTime = new Date(startTime.getTime() + this.currentNapData.expectedDuration * 60000);
          const endTimeText = endTime.toLocaleTimeString('es-MX', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });
          
          bodyText += ` • 🌙 ${endTimeText}`;
        }
      }

      const title = this.currentNapData.isPaused ? '⏸️ Siesta pausada' : '😴 Siesta';
      const categoryId = this.currentNapData.isPaused ? 'nap-tracking-paused' : 'nap-tracking-running';


      // Cancelar notificación anterior programada
      await Notifications.cancelScheduledNotificationAsync(this.notificationId);
      // También dismissar si ya está mostrada
      await Notifications.dismissNotificationAsync(this.notificationId);
      
      // Programar notificación persistente con acciones
      const notificationId = await Notifications.scheduleNotificationAsync({
        identifier: this.notificationId,
        content: {
          title,
          body: bodyText,
          categoryIdentifier: categoryId,
          data: {
            type: 'nap-tracking',
            startTime: this.currentNapData.startTime,
            persistent: true,
          },
          sound: false,
          badge: 0,
          priority: Notifications.AndroidNotificationPriority.MAX,
          // iOS: mantener la notificación visible
          autoDismiss: false,
          sticky: true,
        },
        trigger: null, // Mostrar inmediatamente
      });
      

    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error actualizando notificación:', error);
      console.error('❌ [NAP-NOTIF] Stack trace:', (error as Error).stack);
    }
  }

  /**
   * Detener tracking y eliminar notificación
   */
  async stopTracking(): Promise<void> {
    try {
      // Detener intervalo de actualización
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Cancelar notificación
      await Notifications.dismissNotificationAsync(this.notificationId);
      
      this.currentNapData = null;
      
    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error deteniendo tracking:', error);
    }
  }

  /**
   * Verificar si hay tracking activo
   */
  isTracking(): boolean {
    return this.currentNapData !== null && this.updateInterval !== null;
  }
}

// Exportar instancia singleton
export default new SleepTrackingNotification();
