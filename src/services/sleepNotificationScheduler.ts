import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosInstance as api } from './api';

/**
 * 🔔 Sistema de Notificaciones Inteligentes de Sueño
 * 
 * Gestiona la programación automática de notificaciones para:
 * - 30 minutos antes de cada siesta
 * - Hora exacta de dormir (siestas + bedtime nocturno)
 * - Verificación de registros tarde
 * - Detección de siestas muy largas
 */
class SleepNotificationScheduler {
  private baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://mumpabackend-26kjoiljg-mishu-lojans-projects.vercel.app';
  private checkLateInterval: NodeJS.Timeout | null = null;
  private checkLongInterval: NodeJS.Timeout | null = null;

  /**
   * 📅 Programar todas las notificaciones del día
   * Se llama automáticamente al iniciar la app o cuando hay nuevas predicciones
   * @param childId - ID del niño
   * @param forceReschedule - Si es true, reprograma aunque ya se haya hecho hoy (útil cuando cambian predicciones)
   */
  async scheduleAllNotifications(childId: string, forceReschedule: boolean = false): Promise<void> {
    try {
      
      // Verificar si ya se programaron hoy (solo si no es forzado)
      if (!forceReschedule) {
        const lastScheduled = await AsyncStorage.getItem(
          `notifications_scheduled_${childId}`
        );
        const today = new Date().toISOString().split('T')[0];
        
        if (lastScheduled === today) {
          return;
        }
      } else {
      }
      
      // 1. Programar notificaciones 30min antes de cada siesta
      await this.schedulePreNap(childId);
      
      // 2. Programar notificaciones a la hora exacta de dormir (siestas Y bedtime)
      await this.scheduleNapTime(childId);
      
      // Guardar fecha de última programación
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem(
        `notifications_scheduled_${childId}`,
        today
      );
      
      
    } catch (error) {
      console.error('❌ [SLEEP-NOTIF] Error programando notificaciones:', error);
    }
  }

  /**
   * ⏰ Programar notificaciones 30min antes de cada siesta
   */
  private async schedulePreNap(childId: string): Promise<void> {
    try {
      const response = await api.post(
        `/api/sleep/notifications/pre-nap/${childId}`
      );
      
      const data = response.data;
      
      if (data.notifications && data.notifications.length > 0) {
      }
    } catch (error: any) {
      console.error('❌ [SLEEP-NOTIF] Error programando pre-nap:', error.response?.data || error.message);
    }
  }

  /**
   * 💤 Programar notificaciones a la hora de dormir (siestas Y bedtime)
   */
  private async scheduleNapTime(childId: string): Promise<void> {
    try {
      const response = await api.post(
        `/api/sleep/notifications/nap-time/${childId}`
      );
      
      const data = response.data;
      
      if (data.notifications && data.notifications.length > 0) {
      }
    } catch (error: any) {
      console.error('❌ [SLEEP-NOTIF] Error programando nap-time:', error.response?.data || error.message);
    }
  }

  /**
   * 🔄 Iniciar verificaciones periódicas
   * - Registros tarde: cada 30 minutos
   * - Siestas largas: cada hora
   */
  startPeriodicChecks(childId: string): void {
    
    // Limpiar intervalos existentes
    this.stopPeriodicChecks();
    
    // Verificar registros tarde cada 30 minutos
    this.checkLateInterval = setInterval(() => {
      this.checkLateRegistrations(childId);
    }, 30 * 60 * 1000); // 30 minutos
    
    // Verificar siestas largas cada hora
    this.checkLongInterval = setInterval(() => {
      this.checkLongNaps(childId);
    }, 60 * 60 * 1000); // 1 hora
    
    // Ejecutar verificaciones inmediatamente al iniciar
    this.checkLateRegistrations(childId);
    this.checkLongNaps(childId);
    
  }

  /**
   * 🛑 Detener verificaciones periódicas
   */
  stopPeriodicChecks(): void {
    if (this.checkLateInterval) {
      clearInterval(this.checkLateInterval);
      this.checkLateInterval = null;
    }
    
    if (this.checkLongInterval) {
      clearInterval(this.checkLongInterval);
      this.checkLongInterval = null;
    }
    
  }

  /**
   * ⚠️ Verificar si hay siestas sin registrar (más de 30min de retraso)
   */
  private async checkLateRegistrations(childId: string): Promise<void> {
    try {
      const response = await api.post(
        `/api/sleep/notifications/check-late/${childId}`
      );
      
      const data = response.data;
      
      if (data.lateNaps && data.lateNaps.length > 0) {
        data.lateNaps.forEach((nap: any) => {
        });
      } 
    } catch (error: any) {
      // Silencioso - no mostrar error al usuario
      console.error('❌ [SLEEP-NOTIF] Error verificando siestas tarde:', error.response?.data || error.message);
    }
  }

  /**
   * 🚨 Verificar si hay siestas muy largas (más de 4 horas)
   */
  private async checkLongNaps(childId: string): Promise<void> {
    try {
      const response = await api.post(
        `/api/sleep/notifications/check-long/${childId}`
      );
      
      const data = response.data;
      
      if (data.longNaps && data.longNaps.length > 0) {
        data.longNaps.forEach((nap: any) => {
        });
      } 
    } catch (error: any) {
      // Silencioso - no mostrar error al usuario
      console.error('❌ [SLEEP-NOTIF] Error verificando siestas largas:', error.response?.data || error.message);
    }
  }

  /**
   * 📨 Enviar notificación personalizada
   */
  async sendCustomNotification(
    userId: string,
    childId: string,
    title: string,
    body: string,
    type: string = 'custom_sleep_notification',
    data?: any
  ): Promise<boolean> {
    try {
      const response = await api.post('/api/sleep/notifications/send', {
        userId,
        childId,
        title,
        body,
        type,
        data: data || {}
      });
      
      const result = response.data;
      
      return result.success;
    } catch (error: any) {
      console.error('❌ [SLEEP-NOTIF] Error enviando notificación:', error.response?.data || error.message);
      return false;
    }
  }

  /**
   * 🗑️ Limpiar datos de programación (útil para testing o reset)
   */
  async clearScheduledData(childId: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`notifications_scheduled_${childId}`);
    } catch (error) {
      console.error('❌ [SLEEP-NOTIF] Error limpiando datos:', error);
    }
  }

  /**
   * 📊 Obtener estado de programación
   */
  async getScheduleStatus(childId: string): Promise<{ scheduled: boolean; date: string | null }> {
    try {
      const lastScheduled = await AsyncStorage.getItem(`notifications_scheduled_${childId}`);
      const today = new Date().toISOString().split('T')[0];
      
      return {
        scheduled: lastScheduled === today,
        date: lastScheduled
      };
    } catch (error) {
      console.error('❌ [SLEEP-NOTIF] Error obteniendo estado:', error);
      return { scheduled: false, date: null };
    }
  }
}

// Exportar instancia singleton
export default new SleepNotificationScheduler();
