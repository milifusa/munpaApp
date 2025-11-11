import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online/api';

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  imageStoragePath?: string;
  link?: string;
  order: number;
  duration: number; // Segundos
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  views: number;
  clicks: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

class BannerService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  private async getHeaders(includeAuth: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (includeAuth) {
      const token = await this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Obtener banners activos (público)
  async getActiveBanners(): Promise<Banner[]> {
    try {
      console.log('📢 [BANNERS] Obteniendo banners activos');
      
      const response = await fetch(`${API_BASE_URL}/banners`, {
        method: 'GET',
        headers: await this.getHeaders(false),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [BANNERS] Endpoint no disponible (404), retornando array vacío');
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [BANNERS] Error obteniendo banners:', errorData);
        throw new Error(errorData.message || 'Error obteniendo banners');
      }

      const data = await response.json();
      console.log('📦 [BANNERS] Respuesta completa del servidor:', JSON.stringify(data).substring(0, 300));
      
      // Manejar diferentes formatos de respuesta
      const banners = data.data || data.banners || (Array.isArray(data) ? data : []);
      
      if (!Array.isArray(banners)) {
        console.warn('⚠️ [BANNERS] Los banners no son un array, retornando array vacío');
        return [];
      }
      
      console.log('✅ [BANNERS] Banners encontrados:', banners.length);
      return banners as Banner[];
    } catch (error) {
      console.error('❌ [BANNERS] Error en getActiveBanners:', error);
      // Si es un error de red o ruta no encontrada, retornar array vacío
      return [];
    }
  }

  // Registrar vista de banner
  async registerView(bannerId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/banners/${bannerId}/view`, {
        method: 'POST',
        headers: await this.getHeaders(false),
      });
    } catch (error) {
      console.error('❌ [BANNERS] Error registrando vista:', error);
      // No lanzar error, solo loguear
    }
  }

  // Registrar click de banner
  async registerClick(bannerId: string): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/banners/${bannerId}/click`, {
        method: 'POST',
        headers: await this.getHeaders(false),
      });
    } catch (error) {
      console.error('❌ [BANNERS] Error registrando click:', error);
      // No lanzar error, solo loguear
    }
  }
}

const bannerService = new BannerService();
export default bannerService;

