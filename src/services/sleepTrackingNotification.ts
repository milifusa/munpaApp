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
    if (!this.currentNapData) return;

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

      await Notifications.scheduleNotificationAsync({
        identifier: this.notificationId,
        content: {
          title: this.currentNapData.isPaused ? '⏸️ Siesta pausada' : '😴 Siesta',
          body: bodyText,
          categoryIdentifier: categoryId,
          sound: false,
          sticky: true, // Para Android
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'nap-tracking',
            startTime: this.currentNapData.startTime,
          },
        },
        trigger: null, // Mostrar inmediatamente
      });

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
