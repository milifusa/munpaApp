import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online/api';

export interface MilestoneCategory {
  id: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  order: number;
  isActive: boolean;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  ageMonthsMin: number;
  ageMonthsMax: number;
  order: number;
  tips?: string;
  videoUrl?: string;
  imageUrl?: string;
  completed: boolean;
  completedAt?: string;
  notes?: string;
}

export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  icon: string;
  color: string;
  total: number;
  completed: number;
  completionRate: number;
  milestones: Milestone[];
}

export interface ProgressReport {
  child: {
    id: string;
    name: string;
    birthDate: string;
    ageMonths: number;
    ageDisplay: string;
  };
  overallProgress: {
    totalMilestones: number;
    completed: number;
    completionRate: number;
    lastUpdated: string;
  };
  progressByCategory: CategoryProgress[];
  recentlyCompleted: Milestone[];
  upcomingMilestones: Milestone[];
}

class MilestonesService {
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  // Obtener categorías
  async getCategories(): Promise<MilestoneCategory[]> {
    try {
      const url = `${API_BASE_URL}/milestones/categories`;
      
      const headers = await this.getHeaders();
      
      const response = await fetch(url, { headers });
      
      
      const data = await response.json();
      
      
      if (data.success && data.data && Array.isArray(data.data)) {
        return data.data;
      }
      
      // Si data es directamente un array
      if (Array.isArray(data)) {
        return data;
      }
      
      console.warn('⚠️ [MILESTONES SERVICE] No se encontraron categorías');
      return [];
    } catch (error) {
      console.error('❌ [MILESTONES SERVICE] Error obteniendo categorías:', error);
      return [];
    }
  }

  // Obtener hitos por edad del niño
  async getMilestonesByChild(childId: string, options?: {
    category?: string;
    ageBuffer?: number;
    includeAll?: boolean;
  }): Promise<{
    childAge: { months: number; displayAge: string };
    ageRange: { min: number; max: number };
    milestones: Milestone[];
    summary: { total: number; completed: number; completionRate: number };
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.category) params.append('category', options.category);
      if (options?.ageBuffer !== undefined) params.append('ageBuffer', options.ageBuffer.toString());
      if (options?.includeAll) params.append('includeAll', 'true');

      const url = `${API_BASE_URL}/children/${childId}/milestones${params.toString() ? '?' + params.toString() : ''}`;
      
      
      const headers = await this.getHeaders();
      
      const response = await fetch(url, { headers });
      
      
      const data = await response.json();
      
      
      if (data.success) {
        // El API puede devolver los hitos de diferentes maneras:
        // 1. data.data.milestones (formato esperado)
        // 2. data.data (si data es directamente el array de milestones)
        // 3. data.milestones (directamente en la raíz)
        
        let milestones = [];
        
        if (data.data?.milestones && Array.isArray(data.data.milestones)) {
          milestones = data.data.milestones;
        } else if (Array.isArray(data.data)) {
          milestones = data.data;
        } else if (data.milestones && Array.isArray(data.milestones)) {
          milestones = data.milestones;
        } else {
          console.warn('⚠️ [MILESTONES SERVICE] No se encontraron hitos en ningún formato conocido');
        }
        
        
        return {
          childAge: data.data?.childAge || data.childAge || { months: 0, displayAge: '0 meses' },
          ageRange: data.data?.ageRange || data.ageRange || { min: 0, max: 0 },
          milestones: milestones,
          summary: data.data?.summary || data.summary || { total: 0, completed: 0, completionRate: 0 },
        };
      }
      return {
        childAge: { months: 0, displayAge: '0 meses' },
        ageRange: { min: 0, max: 0 },
        milestones: [],
        summary: { total: 0, completed: 0, completionRate: 0 },
      };
    } catch (error) {
      console.error('❌ [MILESTONES SERVICE] Error obteniendo hitos:', error);
      return {
        childAge: { months: 0, displayAge: '0 meses' },
        ageRange: { min: 0, max: 0 },
        milestones: [],
        summary: { total: 0, completed: 0, completionRate: 0 },
      };
    }
  }

  // Obtener hitos agrupados por categoría
  async getMilestonesByCategory(childId: string): Promise<{
    childAge: { months: number; displayAge: string };
    categories: CategoryProgress[];
    overall: { total: number; completed: number; completionRate: number };
  }> {
    try {
      
      const response = await fetch(`${API_BASE_URL}/children/${childId}/milestones/by-category`, {
        headers: await this.getHeaders(),
      });
      
      
      const data = await response.json();
      
      
      if (data.success && data.data) {
        return data.data;
      }
      
      console.warn('⚠️ [MILESTONES SERVICE] Respuesta sin éxito o sin datos');
      return {
        childAge: { months: 0, displayAge: '0 meses' },
        categories: [],
        overall: { total: 0, completed: 0, completionRate: 0 },
      };
    } catch (error) {
      console.error('❌ [MILESTONES SERVICE] Error obteniendo hitos por categoría:', error);
      return {
        childAge: { months: 0, displayAge: '0 meses' },
        categories: [],
        overall: { total: 0, completed: 0, completionRate: 0 },
      };
    }
  }

  // Marcar hito como completado
  async completeMilestone(childId: string, milestoneId: string, notes?: string): Promise<boolean> {
    try {
      const url = `${API_BASE_URL}/children/${childId}/milestones/${milestoneId}/complete`;
      const body = { notes: notes || '' };
      
      
      const headers = await this.getHeaders();
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      
      
      const data = await response.json();
      
      
      return data.success;
    } catch (error) {
      console.error('❌ [MILESTONES SERVICE] Error completando hito:', error);
      return false;
    }
  }

  // Desmarcar hito
  async uncompleteMilestone(childId: string, milestoneId: string): Promise<boolean> {
    try {
      const url = `${API_BASE_URL}/children/${childId}/milestones/${milestoneId}/complete`;
      
      
      const headers = await this.getHeaders();
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers,
      });
      
      
      const data = await response.json();
      
      
      return data.success;
    } catch (error) {
      console.error('❌ [MILESTONES SERVICE] Error desmarcando hito:', error);
      return false;
    }
  }

  // Obtener reporte de progreso
  async getProgressReport(childId: string): Promise<ProgressReport | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/children/${childId}/milestones/progress-report`, {
        headers: await this.getHeaders(),
      });
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo reporte de progreso:', error);
      return null;
    }
  }
}

const milestonesService = new MilestonesService();
export default milestonesService;
