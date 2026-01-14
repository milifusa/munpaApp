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
      console.log('⚙️ [NAP-NOTIF] Configurando categorías de notificaciones...');
      
      // Configurar handler PRIMERO
      Notifications.setNotificationHandler({
        handleNotification: async () => {
          console.log('📬 [NAP-NOTIF] Handler de notificación llamado');
          return {
            shouldShowAlert: true,
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
      
      // PRIMERO: Detener intervalo anterior si existe
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // SEGUNDO: Guardar los datos ANTES de actualizar
      this.currentNapData = napData;
      console.log('💾 [NAP-NOTIF] Datos de siesta guardados:', napData);

      // TERCERO: Configurar handler de comportamiento de notificaciones
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      // CUARTO: Mostrar notificación inicial
      await this.updateNotification();

      // QUINTO: Actualizar cada minuto
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
      console.log('📊 [NAP-NOTIF] Datos actuales:', {
        startTime: this.currentNapData.startTime,
        expectedDuration: this.currentNapData.expectedDuration,
        isPaused: this.currentNapData.isPaused
      });
      
      const now = new Date();
      const startTime = new Date(this.currentNapData.startTime);
      const elapsedMinutes = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
      
      console.log('⏱️ [NAP-NOTIF] Tiempo transcurrido:', elapsedMinutes, 'minutos');
      
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

      console.log('📱 [NAP-NOTIF] Mostrando notificación:', {
        title,
        body: bodyText
      });

      // Primero cancelar notificación anterior si existe
      await Notifications.dismissNotificationAsync(this.notificationId);
      console.log('🗑️ [NAP-NOTIF] Notificación anterior cancelada');
      
      // Presentar notificación inmediatamente
      try {
        await Notifications.presentNotificationAsync({
          title,
          body: bodyText,
          data: {
            type: 'nap-tracking',
            startTime: this.currentNapData.startTime,
          },
          sound: false,
        });
        console.log('✅ [NAP-NOTIF] Notificación presentada exitosamente');
      } catch (presentError) {
        console.error('❌ [NAP-NOTIF] Error al presentar notificación:', presentError);
        // Intentar con método alternativo
        console.log('🔄 [NAP-NOTIF] Intentando método alternativo (schedule)...');
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body: bodyText,
            data: {
              type: 'nap-tracking',
              startTime: this.currentNapData.startTime,
            },
            sound: false,
          },
          trigger: null,
        });
        console.log('✅ [NAP-NOTIF] Notificación programada con método alternativo');
      }

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
