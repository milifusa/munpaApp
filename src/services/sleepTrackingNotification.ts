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
      
      console.log('✅ [NAP-NOTIF] Permisos de notificaciones otorgados');
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

      console.log('✅ [NAP-NOTIF] Categorías de notificación configuradas');
    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error configurando categorías:', error);
    }
  }

  /**
   * Iniciar notificación de tracking de siesta
   */
  async startTracking(napData: ActiveNapData): Promise<void> {
    try {
      console.log('🚀 [NAP-NOTIF] Iniciando tracking de siesta...');
      
      // Verificar y solicitar permisos
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('⚠️ [NAP-NOTIF] No hay permisos, no se puede mostrar notificación');
        return;
      }
      
      this.currentNapData = napData;

      // Detener tracking anterior si existe
      await this.stopTracking();

      // Configurar handler de comportamiento de notificaciones
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // Mostrar notificación inicial
      await this.updateNotification();

      // Actualizar cada minuto
      this.updateInterval = setInterval(() => {
        this.updateNotification();
      }, 60000); // 1 minuto

      console.log('✅ [NAP-NOTIF] Tracking de siesta iniciado');
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
      console.log('🔄 [NAP-NOTIF] Actualizando notificación...');
      
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
          const remHours = Math.floor(remaining / 60);
          const remMins = remaining % 60;
          const remText = remHours > 0 ? `${remHours}:${remMins.toString().padStart(2, '0')}` : `${remMins} min`;
          
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

      const categoryId = this.currentNapData.isPaused ? 'nap-tracking-paused' : 'nap-tracking-running';

      console.log('📱 [NAP-NOTIF] Programando notificación:', {
        title: this.currentNapData.isPaused ? '⏸️ Siesta pausada' : '😴 Siesta',
        body: bodyText,
        categoryId
      });

      // Primero cancelar notificación anterior si existe
      await Notifications.dismissNotificationAsync(this.notificationId);
      
      // Presentar notificación inmediatamente (no programar)
      await Notifications.presentNotificationAsync({
        title: this.currentNapData.isPaused ? '⏸️ Siesta pausada' : '😴 Siesta',
        body: bodyText,
        data: {
          type: 'nap-tracking',
          startTime: this.currentNapData.startTime,
        },
        sound: false,
      });
      
      console.log('✅ [NAP-NOTIF] Notificación presentada');

    } catch (error) {
      console.error('❌ [NAP-NOTIF] Error actualizando notificación:', error);
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
      
      console.log('✅ [NAP-NOTIF] Tracking de siesta detenido');
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
