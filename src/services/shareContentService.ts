import { axiosInstance as api } from './api';

export interface ShareContentResponse {
  success: boolean;
  data: {
    shareUrl: string; // Deep link: munpa://...
    webUrl: string; // URL web: https://munpa.online/...
    title: string;
    description: string; // Max 200 chars
    imageUrl?: string;
    metadata?: any; // Info adicional según el tipo
  };
}

export const shareContentService = {
  // 1. Compartir post de comunidad
  sharePost: async (postId: string): Promise<ShareContentResponse> => {
    
    try {
      const response = await api.get(`/api/posts/${postId}/share`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo post:', error.response?.data || error.message);
      throw error;
    }
  },

  // 2. Compartir recomendación
  shareRecommendation: async (recommendationId: string): Promise<ShareContentResponse> => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/share`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo recomendación:', error.response?.data || error.message);
      throw error;
    }
  },

  // 3. Compartir producto del marketplace
  shareProduct: async (productId: string): Promise<ShareContentResponse> => {
    
    try {
      const response = await api.get(`/api/marketplace/products/${productId}/share`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo producto:', error.response?.data || error.message);
      throw error;
    }
  },

  // 4. Compartir lista de favoritos del marketplace
  shareMarketplaceFavorites: async (): Promise<ShareContentResponse> => {
    
    try {
      const response = await api.get('/api/marketplace/favorites/share');
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo favoritos del marketplace:', error.response?.data || error.message);
      throw error;
    }
  },

  // 5. Compartir lista de lugares favoritos
  shareRecommendationsFavorites: async (): Promise<ShareContentResponse> => {
    
    try {
      const response = await api.get('/api/recommendations/favorites/share');
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo favoritos de recomendaciones:', error.response?.data || error.message);
      throw error;
    }
  },
};



