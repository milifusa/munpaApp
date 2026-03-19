import AsyncStorage from '@react-native-async-storage/async-storage';
import { axiosInstance } from './api';

export interface Ingredient {
  item: string;
  quantity: string;
}

export interface NutritionalInfo {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
}

export interface Recipe {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner';
  name: string;
  description: string;
  ageAppropriate: boolean;
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty: string;
  ingredients: Ingredient[];
  instructions: string[];
  nutritionalInfo: NutritionalInfo;
  tips: string[];
  allergens: string[];
  childId: string;
  ageMonths: number;
  generatedAt: string;
}

export interface NutritionSponsor {
  id: string;
  brandName: string;
  logoUrl?: string;
  bannerImageUrl?: string;
  tagline?: string;
  accentColor?: string;
  sectionTitle?: string;
  sectionTagline?: string;
  targetKeywords: string[];
  ctaLabel?: string;
  ctaType?: 'external' | 'product' | 'article';
  ctaUrl?: string;
  ctaProductId?: string;
  ctaArticleId?: string;
  active: boolean;
}

export interface RecipesResponse {
  success: boolean;
  data: Recipe[];
  metadata: {
    childAge: {
      months: number;
      years: number;
      remainingMonths: number;
      displayAge: string;
    };
    cached: boolean;
    generatedAt: string;
    totalRecipes: number;
  };
}

class NutritionService {
  /**
   * Obtener una receta del día para el home
   * GET /api/home/recipe?childId=xxx&mealType=xxx
   */
  async getTodayRecipe(
    childId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner'
  ): Promise<Recipe | null> {
    try {
      console.log('🍽️ [NUTRITION] Obteniendo receta del día:', { childId, mealType });

      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const response = await axiosInstance.get(
        `/api/home/recipe`,
        {
          params: {
            childId,
            mealType,
          },
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [NUTRITION] Receta del día obtenida:', response.data.data?.name);

      return response.data.data || null;
    } catch (error: any) {
      console.error('❌ [NUTRITION] Error obteniendo receta del día:', error);
      
      if (error.response?.status === 400 && error.response?.data?.message?.includes('6 meses')) {
        // Bebé menor de 6 meses - lactancia exclusiva
        console.log('ℹ️ [NUTRITION] Bebé menor de 6 meses, lactancia exclusiva');
        return null;
      }
      
      throw new Error(error.response?.data?.message || 'Error al obtener receta del día');
    }
  }

  /**
   * Obtener una receta por ID
   * GET /api/recipes/{recipeId}
   */
  async getRecipeById(recipeId: string): Promise<Recipe | null> {
    try {
      console.log('🍽️ [NUTRITION] Obteniendo receta por ID:', recipeId);

      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const response = await axiosInstance.get(
        `/api/recipes/${recipeId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [NUTRITION] Receta obtenida:', response.data.data?.name);

      return response.data.data || response.data || null;
    } catch (error: any) {
      console.error('❌ [NUTRITION] Error obteniendo receta por ID:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener la receta');
    }
  }

  /**
   * Obtener recetas personalizadas para un niño
   */
  async getRecipes(
    childId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'all' = 'all',
    regenerate: boolean = false
  ): Promise<RecipesResponse> {
    try {
      console.log('🍽️ [NUTRITION] Obteniendo recetas:', { childId, mealType, regenerate });

      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const params = new URLSearchParams();
      params.append('mealType', mealType);
      if (regenerate) {
        params.append('regenerate', 'true');
      }

      const response = await axiosInstance.get(
        `/api/children/${childId}/nutrition/recipes?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✅ [NUTRITION] Recetas obtenidas:', {
        total: response.data.data?.length || 0,
        cached: response.data.metadata?.cached,
      });

      // DEBUG: Imprimir primera receta para verificar estructura
      if (response.data.data && response.data.data.length > 0) {
        console.log('🔍 [NUTRITION] Primera receta:', {
          name: response.data.data[0].name,
          hasIngredients: !!response.data.data[0].ingredients,
          ingredientsLength: response.data.data[0].ingredients?.length,
          hasInstructions: !!response.data.data[0].instructions,
          instructionsLength: response.data.data[0].instructions?.length,
          hasTips: !!response.data.data[0].tips,
          tipsLength: response.data.data[0].tips?.length,
          hasAllergens: !!response.data.data[0].allergens,
          allergensLength: response.data.data[0].allergens?.length,
          hasNutritionalInfo: !!response.data.data[0].nutritionalInfo,
        });
        
        // DEBUG completo de la primera receta
        console.log('📦 [NUTRITION] Receta completa:', JSON.stringify(response.data.data[0], null, 2));
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ [NUTRITION] Error obteniendo recetas:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Niño no encontrado');
      } else if (error.response?.status === 403) {
        throw new Error('No tienes permiso para acceder a este niño');
      } else if (error.response?.status === 503) {
        throw new Error('Servicio de recetas temporalmente no disponible');
      }
      
      throw new Error(error.response?.data?.message || 'Error al obtener recetas');
    }
  }

  /**
   * Obtener recetas a partir de ingredientes
   * POST /api/recipes/from-ingredients
   */
  async getRecipesFromIngredients(
    ingredients: string,
    childId: string
  ): Promise<{ success: boolean; data: Recipe[] }> {
    try {
      console.log('🍽️ [NUTRITION] Obteniendo recetas por ingredientes:', { ingredients: ingredients.substring(0, 50), childId });

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        throw new Error('Token de autenticación no encontrado');
      }

      const response = await axiosInstance.post(
        '/api/recipes/from-ingredients',
        { ingredients: ingredients.trim(), childId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data?.data ?? response.data ?? [];
      const recipes = Array.isArray(data) ? data : [];
      console.log('✅ [NUTRITION] Recetas por ingredientes:', recipes.length);

      return { success: true, data: recipes };
    } catch (error: any) {
      console.error('❌ [NUTRITION] Error obteniendo recetas por ingredientes:', error);
      throw new Error(error.response?.data?.message || 'Error al obtener recetas');
    }
  }

  /**
   * Obtener solo desayunos
   */
  async getBreakfasts(childId: string, regenerate: boolean = false): Promise<Recipe[]> {
    const response = await this.getRecipes(childId, 'breakfast', regenerate);
    return response.data;
  }

  /**
   * Obtener solo almuerzos
   */
  async getLunches(childId: string, regenerate: boolean = false): Promise<Recipe[]> {
    const response = await this.getRecipes(childId, 'lunch', regenerate);
    return response.data;
  }

  /**
   * Obtener solo cenas
   */
  async getDinners(childId: string, regenerate: boolean = false): Promise<Recipe[]> {
    const response = await this.getRecipes(childId, 'dinner', regenerate);
    return response.data;
  }

  /**
   * Obtener sponsor activo de nutrición
   * GET /api/nutrition/sponsors/active
   */
  async getNutritionSponsor(): Promise<NutritionSponsor | null> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return null;
      const response = await axiosInstance.get('/api/nutrition/sponsors/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = response.data?.data ?? response.data;
      if (Array.isArray(raw)) return raw.length > 0 ? raw[0] : null;
      return raw || null;
    } catch {
      return null;
    }
  }

  /**
   * Helper para obtener icono según tipo de comida
   */
  getMealIcon(mealType: string): string {
    switch (mealType) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      default:
        return '🍽️';
    }
  }

  /**
   * Helper para traducir tipo de comida
   */
  getMealTypeLabel(mealType: string): string {
    switch (mealType) {
      case 'breakfast':
        return 'Desayuno';
      case 'lunch':
        return 'Almuerzo';
      case 'dinner':
        return 'Cena';
      default:
        return 'Comida';
    }
  }
}

export default new NutritionService();
