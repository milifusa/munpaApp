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
    console.log('📤 [SHARE CONTENT] Compartiendo post:', postId);
    
    try {
      const response = await api.get(`/api/posts/${postId}/share`);
      console.log('✅ [SHARE CONTENT] Post compartido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo post:', error.response?.data || error.message);
      throw error;
    }
  },

  // 2. Compartir recomendación
  shareRecommendation: async (recommendationId: string): Promise<ShareContentResponse> => {
    console.log('📤 [SHARE CONTENT] Compartiendo recomendación:', recommendationId);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/share`);
      console.log('✅ [SHARE CONTENT] Recomendación compartida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo recomendación:', error.response?.data || error.message);
      throw error;
    }
  },

  // 3. Compartir producto del marketplace
  shareProduct: async (productId: string): Promise<ShareContentResponse> => {
    console.log('📤 [SHARE CONTENT] Compartiendo producto:', productId);
    
    try {
      const response = await api.get(`/api/marketplace/products/${productId}/share`);
      console.log('✅ [SHARE CONTENT] Producto compartido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo producto:', error.response?.data || error.message);
      throw error;
    }
  },

  // 4. Compartir lista de favoritos del marketplace
  shareMarketplaceFavorites: async (): Promise<ShareContentResponse> => {
    console.log('📤 [SHARE CONTENT] Compartiendo favoritos del marketplace');
    
    try {
      const response = await api.get('/api/marketplace/favorites/share');
      console.log('✅ [SHARE CONTENT] Favoritos del marketplace compartidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo favoritos del marketplace:', error.response?.data || error.message);
      throw error;
    }
  },

  // 5. Compartir lista de lugares favoritos
  shareRecommendationsFavorites: async (): Promise<ShareContentResponse> => {
    console.log('📤 [SHARE CONTENT] Compartiendo favoritos de recomendaciones');
    
    try {
      const response = await api.get('/api/recommendations/favorites/share');
      console.log('✅ [SHARE CONTENT] Favoritos de recomendaciones compartidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CONTENT] Error compartiendo favoritos de recomendaciones:', error.response?.data || error.message);
      throw error;
    }
  },
};



