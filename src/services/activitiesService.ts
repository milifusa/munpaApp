import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosInstance } from './api';

export interface Activity {
  id: string;
  title: string;
  description: string;
  duration: number;
  category?: string;
  ageRange?: { min: number; max: number };
  benefits?: string | string[];
  materials?: string | string[];
  instructions?: string;
}

export interface ActivityHistory {
  id: string;
  activityId?: string;
  activity: Activity;
  rating: number; // 1-5
  notes?: string;
  completedAt: string;
  childId: string;
}

export interface ActivityFavorite {
  id: string;
  activity: Activity;
  createdAt: string;
}

class ActivitiesService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('authToken');
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  // Obtener sugerencias de actividades para un niño
  async getActivitySuggestions(childId: string): Promise<any> {
    try {
      const response = await axiosInstance.get(`/api/activities/suggestions/${childId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error obteniendo sugerencias:', error.response?.data || error.message);
      throw error;
    }
  }

  // Agregar actividad al historial del niño
  async addHistory(
    childId: string,
    activity: Activity,
    rating: number,
    notes?: string
  ): Promise<any> {
    try {
      const response = await axiosInstance.post(
        `/api/children/${childId}/activities/history`,
        { activity, rating, notes }
      );
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error agregando historial:', error.response?.data || error.message);
      throw error;
    }
  }

  // Obtener historial de actividades del niño
  async getHistory(
    childId: string,
    category?: string,
    page: number = 1
  ): Promise<{ data: ActivityHistory[]; total?: number; page?: number }> {
    try {
      const params: Record<string, any> = { page };
      if (category) params.category = category;

      const response = await axiosInstance.get(
        `/api/children/${childId}/activities/history`,
        { params }
      );
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error obteniendo historial:', error.response?.data || error.message);
      throw error;
    }
  }

  // Eliminar entrada del historial
  async deleteHistory(historyId: string): Promise<any> {
    try {
      const response = await axiosInstance.delete(`/api/activities/history/${historyId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error eliminando historial:', error.response?.data || error.message);
      throw error;
    }
  }

  // Agregar actividad a favoritos
  async addFavorite(activity: Activity): Promise<any> {
    try {
      const response = await axiosInstance.post('/api/activities/favorites', { activity });
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error agregando favorito:', error.response?.data || error.message);
      throw error;
    }
  }

  // Obtener actividades favoritas
  async getFavorites(category?: string): Promise<{ data: ActivityFavorite[] }> {
    try {
      const params: Record<string, any> = {};
      if (category) params.category = category;

      const response = await axiosInstance.get('/api/activities/favorites', { params });
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error obteniendo favoritos:', error.response?.data || error.message);
      throw error;
    }
  }

  // Eliminar actividad de favoritos
  async deleteFavorite(favoriteId: string): Promise<any> {
    try {
      const response = await axiosInstance.delete(`/api/activities/favorites/${favoriteId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error eliminando favorito:', error.response?.data || error.message);
      throw error;
    }
  }

  // Verificar si una actividad está en favoritos
  async checkFavorite(title: string): Promise<{ isFavorite: boolean; favoriteId?: string }> {
    try {
      const response = await axiosInstance.get('/api/activities/favorites/check', {
        params: { title },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error verificando favorito:', error.response?.data || error.message);
      return { isFavorite: false };
    }
  }
}

const activitiesService = new ActivitiesService();
export default activitiesService;
