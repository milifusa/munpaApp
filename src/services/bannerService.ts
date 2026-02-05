import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online/api';

export type BannerSection =
  | 'home'
  | 'home1'
  | 'home2'
  | 'home3'
  | 'marketplace'
  | 'products'
  | 'comunidades'
  | 'recomendaciones'
  | 'medicina'
  | 'crecimiento'
  | 'vacunas'
  | 'denticion'
  | 'hitos'
  | 'menu-lateral';

export interface Banner {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  imageStoragePath?: string;
  link?: string;
  linkType?: string; // NUEVO: Tipo de link (recommendation-category, etc)
  articleCategoryId?: string; // ID de categoría de artículos
  articleId?: string; // ID de artículo específico
  recommendationCategoryId?: string; // NUEVO: ID de categoría de recomendaciones
  order: number;
  duration: number; // Segundos
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  views: number;
  clicks: number;
  section?: BannerSection; // NUEVO: Sección del banner
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
  // section: opcional, filtra banners por sección. Si no se proporciona, devuelve todos los banners activos
  async getActiveBanners(section?: BannerSection): Promise<Banner[]> {
    try {
      // Construir URL con parámetro de sección si se proporciona
      let url = `${API_BASE_URL}/banners`;
      if (section) {
        url += `?section=${section}`;
      }
      
      
      const response = await fetch(url, {
        method: 'GET',
        headers: await this.getHeaders(false),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error obteniendo banners');
      }

      const data = await response.json();
      
      console.log(`🔍 [BANNERS] Respuesta del API para sección "${section || 'todas'}":`, JSON.stringify(data, null, 2));
      
      // Manejar diferentes formatos de respuesta
      let banners = data.data || data.banners || (Array.isArray(data) ? data : []);
      
      console.log(`🔍 [BANNERS] Banners procesados (${banners.length}):`, JSON.stringify(banners, null, 2));
      
      if (!Array.isArray(banners)) {
        console.warn('⚠️ [BANNERS] Los banners no son un array, retornando array vacío');
        return [];
      }
      
      // Si se solicitó una sección específica, filtrar por esa sección en el frontend también
      // (por si el backend no filtra correctamente)
      if (section && banners.length > 0) {
        const filteredBanners = banners.filter((banner: any) => {
          const bannerSection = banner.section || 'home'; // Default a 'home' si no tiene sección
          return bannerSection === section;
        });
        console.log(`🔍 [BANNERS] Banners filtrados por sección "${section}" (${filteredBanners.length}):`, JSON.stringify(filteredBanners, null, 2));
        banners = filteredBanners;
      }
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

