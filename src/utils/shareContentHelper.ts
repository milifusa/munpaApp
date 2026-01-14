import { Share, Platform, Alert } from 'react-native';
import { shareContentService, ShareContentResponse } from '../services/shareContentService';

/**
 * Helper para compartir contenido usando el servicio de compartir
 * Maneja el compartir con Share API de React Native
 */
export const shareContentHelper = {
  /**
   * Compartir un post de comunidad
   */
  sharePost: async (postId: string): Promise<void> => {
    try {
      const response = await shareContentService.sharePost(postId);
      await shareContent(response);
    } catch (error: any) {
      console.error('❌ [SHARE HELPER] Error compartiendo post:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo compartir el post'
      );
    }
  },

  /**
   * Compartir una recomendación
   */
  shareRecommendation: async (recommendationId: string): Promise<void> => {
    try {
      const response = await shareContentService.shareRecommendation(recommendationId);
      await shareContent(response);
    } catch (error: any) {
      console.error('❌ [SHARE HELPER] Error compartiendo recomendación:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo compartir la recomendación'
      );
    }
  },

  /**
   * Compartir un producto del marketplace
   */
  shareProduct: async (productId: string): Promise<void> => {
    try {
      const response = await shareContentService.shareProduct(productId);
      await shareContent(response);
    } catch (error: any) {
      console.error('❌ [SHARE HELPER] Error compartiendo producto:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo compartir el producto'
      );
    }
  },

  /**
   * Compartir lista de favoritos del marketplace
   */
  shareMarketplaceFavorites: async (): Promise<void> => {
    try {
      const response = await shareContentService.shareMarketplaceFavorites();
      await shareContent(response);
    } catch (error: any) {
      console.error('❌ [SHARE HELPER] Error compartiendo favoritos del marketplace:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo compartir la lista de favoritos'
      );
    }
  },

  /**
   * Compartir lista de lugares favoritos
   */
  shareRecommendationsFavorites: async (): Promise<void> => {
    try {
      const response = await shareContentService.shareRecommendationsFavorites();
      await shareContent(response);
    } catch (error: any) {
      console.error('❌ [SHARE HELPER] Error compartiendo favoritos de recomendaciones:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo compartir la lista de favoritos'
      );
    }
  },
};

/**
 * Función interna para compartir usando la API de Share
 */
async function shareContent(response: ShareContentResponse): Promise<void> {
  const { data } = response;
  
  // Construir mensaje para compartir
  const message = `${data.title}\n\n${data.description}\n\n${data.webUrl}`;
  
  console.log('📤 [SHARE] Compartiendo contenido:', {
    title: data.title,
    webUrl: data.webUrl,
    shareUrl: data.shareUrl,
  });

  try {
    if (Platform.OS === 'ios') {
      await Share.share({
        message,
        title: data.title,
        url: data.shareUrl, // iOS puede usar el deep link directamente
      });
    } else {
      // Android: usar webUrl para mejor compatibilidad
      await Share.share({
        message,
        title: data.title,
      });
    }
  } catch (error: any) {
    // El usuario canceló el compartir
    if (error.message !== 'User did not share') {
      console.error('❌ [SHARE] Error en Share API:', error);
      throw error;
    }
  }
}



