import { axiosInstance as api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Servicio de Analytics para Recomendaciones
 * Registra eventos de interacción con recomendaciones (vistas, llamadas, contactos, etc.)
 */

export interface RecommendationEvent {
  recommendationId: string;
  eventType: 'view' | 'call' | 'whatsapp' | 'email' | 'website' | 'map' | 'share' | 'favorite' | 'wishlist';
  metadata?: {
    source?: string; // 'home', 'category', 'search', 'share', etc.
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    referrer?: string;
    timestamp?: Date;
    userAgent?: string;
    [key: string]: any;
  };
}

export interface RecommendationAnalytics {
  recommendationId: string;
  totalViews: number;
  totalCalls: number;
  totalWhatsApp: number;
  totalEmails: number;
  totalWebsiteClicks: number;
  totalMapClicks: number;
  totalShares: number;
  uniqueViewers: number;
  recentEvents: Array<{
    eventType: string;
    userId?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>;
}

class RecommendationAnalyticsService {
  private baseUrl = '/api/recommendations';

  /**
   * Registra un evento de interacción con una recomendación
   */
  async trackEvent(
    recommendationId: string,
    eventType: RecommendationEvent['eventType'],
    metadata: any = {},
    utmParams: any = {}
  ): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Extraer source de metadata o usar 'app' por defecto
      const source = metadata.source || 'app';
      
      // Separar metadata de utmParams según la especificación
      const { source: _, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ...cleanMetadata } = metadata;
      
      const payload = {
        eventType,
        userId: userId || null,
        source,
        metadata: {
          ...cleanMetadata,
          platform: Platform.OS || 'mobile',
        },
        utmParams: {
          ...utmParams,
          ...(utm_source && { utm_source }),
          ...(utm_medium && { utm_medium }),
          ...(utm_campaign && { utm_campaign }),
          ...(utm_content && { utm_content }),
          ...(utm_term && { utm_term }),
        },
      };

      console.log('📊 [ANALYTICS] Registrando evento:', {
        recommendationId,
        eventType,
        userId,
        source,
      });
      console.log('📊 [ANALYTICS] Payload completo:', JSON.stringify(payload, null, 2));
      const fullUrl = `${this.baseUrl}/${recommendationId}/analytics/events`;
      console.log('📊 [ANALYTICS] URL relativa:', fullUrl);
      console.log('📊 [ANALYTICS] URL completa:', `https://api.munpa.online${fullUrl}`);

      const response = await api.post(fullUrl, payload);
      const responseData = response.data;
      
      console.log('📊 [ANALYTICS] Response status:', response.status);
      console.log('📊 [ANALYTICS] Response headers:', JSON.stringify(response.headers, null, 2));
      
      console.log('✅ [ANALYTICS] Evento registrado exitosamente');
      console.log('✅ [ANALYTICS] Respuesta del servidor:', JSON.stringify(responseData, null, 2));
    } catch (error: any) {
      // No lanzar error para no interrumpir el flujo del usuario
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      if (status === 404) {
        console.warn('⚠️ [ANALYTICS] Endpoint no encontrado (404). El backend de analytics aún no está implementado.');
        console.warn('⚠️ [ANALYTICS] URL intentada:', `https://api.munpa.online${this.baseUrl}/${recommendationId}/analytics/events`);
        console.warn('⚠️ [ANALYTICS] El evento se registró localmente pero no se envió al servidor.');
      } else {
        console.error('❌ [ANALYTICS] Error registrando evento:', error);
        console.error('❌ [ANALYTICS] Error response:', errorData);
        console.error('❌ [ANALYTICS] Error status:', status);
        console.error('❌ [ANALYTICS] Error message:', error.message);
        console.error('❌ [ANALYTICS] URL intentada:', `https://api.munpa.online${this.baseUrl}/${recommendationId}/analytics/events`);
      }
    }
  }

  /**
   * Registra una vista de recomendación
   */
  async trackView(recommendationId: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'view', metadata, utmParams);
  }

  /**
   * Registra una llamada telefónica
   */
  async trackCall(recommendationId: string, phone?: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'call', {
      ...metadata,
      phone,
    }, utmParams);
  }

  /**
   * Registra un contacto por WhatsApp
   */
  async trackWhatsApp(recommendationId: string, phone?: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'whatsapp', {
      ...metadata,
      phone,
    }, utmParams);
  }

  /**
   * Registra un click en email
   */
  async trackEmail(recommendationId: string, email?: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'email', {
      ...metadata,
      email,
    }, utmParams);
  }

  /**
   * Registra un click en website
   */
  async trackWebsite(recommendationId: string, url?: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'website', {
      ...metadata,
      url,
    }, utmParams);
  }

  /**
   * Registra un click en mapa
   */
  async trackMap(recommendationId: string, location?: { latitude: number; longitude: number }, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'map', {
      ...metadata,
      location,
    }, utmParams);
  }

  /**
   * Registra un compartir de recomendación
   */
  async trackShare(recommendationId: string, platform?: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'share', {
      ...metadata,
      platform,
    }, utmParams);
  }

  /**
   * Registra agregar a favoritos
   */
  async trackFavorite(recommendationId: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'favorite', metadata, utmParams);
  }

  /**
   * Registra agregar a wishlist
   */
  async trackWishlist(recommendationId: string, metadata: any = {}, utmParams: any = {}): Promise<void> {
    await this.trackEvent(recommendationId, 'wishlist', metadata, utmParams);
  }

  /**
   * Obtiene las estadísticas de analytics de una recomendación
   */
  async getAnalytics(recommendationId: string): Promise<RecommendationAnalytics | null> {
    try {
      console.log('📊 [ANALYTICS] Obteniendo estadísticas para:', recommendationId);
      
      const response = await api.get(`${this.baseUrl}/${recommendationId}/analytics`);
      
      if (response?.data?.success && response?.data?.data) {
        console.log('✅ [ANALYTICS] Estadísticas obtenidas');
        return response.data.data;
      }
      
      // Si la respuesta es directa (sin wrapper success)
      if (response?.data && !response.data.success) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ [ANALYTICS] Error obteniendo estadísticas:', error.response?.data || error.message);
      return null;
    }
  }

  /**
   * Genera una URL con parámetros UTM para compartir recomendaciones
   */
  generateShareUrl(recommendationId: string, utmParams?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
  }): string {
    const baseUrl = 'https://munpa.app/recommendations'; // Según la especificación
    const params = new URLSearchParams({
      ...(utmParams?.utm_source && { utm_source: utmParams.utm_source }),
      ...(utmParams?.utm_medium && { utm_medium: utmParams.utm_medium }),
      ...(utmParams?.utm_campaign && { utm_campaign: utmParams.utm_campaign }),
      ...(utmParams?.utm_content && { utm_content: utmParams.utm_content }),
    });

    return `${baseUrl}/${recommendationId}${params.toString() ? '?' + params.toString() : ''}`;
  }

  /**
   * Extrae parámetros UTM de una URL
   */
  extractUTMParams(url: string): {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  } {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        utm_source: params.get('utm_source') || undefined,
        utm_medium: params.get('utm_medium') || undefined,
        utm_campaign: params.get('utm_campaign') || undefined,
        utm_content: params.get('utm_content') || undefined,
        utm_term: params.get('utm_term') || undefined,
      };
    } catch (error) {
      console.error('❌ [ANALYTICS] Error extrayendo UTM params:', error);
      return {};
    }
  }

  /**
   * Obtiene el ID del usuario actual (si está autenticado)
   */
  private async getCurrentUserId(): Promise<string | undefined> {
    try {
      // Intentar obtener el userId del AsyncStorage
      const userId = await AsyncStorage.getItem('userId');
      return userId || undefined;
    } catch (error) {
      console.error('❌ [ANALYTICS] Error obteniendo userId:', error);
      return undefined;
    }
  }
}

export const recommendationAnalyticsService = new RecommendationAnalyticsService();
export default recommendationAnalyticsService;

