import { axiosInstance } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Servicio para subir imágenes y obtener URLs
export const imageUploadService = {
  // Subir imagen y obtener URL
  uploadImage: async (uri: string, type: string = 'community') => {
    console.log('📤 [IMAGE UPLOAD] Subiendo imagen a /api/communities/upload-photo:', { uri, type });
    console.log('📤 [IMAGE UPLOAD] URI recibida:', uri);
    console.log('📤 [IMAGE UPLOAD] Tipo recibido:', type);
    
    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        type: 'image/jpeg',
        name: 'image.jpg'
      } as any);
      formData.append('type', type);
      
      console.log('📤 [IMAGE UPLOAD] FormData creado:', formData);

      // Obtener token de autenticación
      const authToken = await AsyncStorage.getItem('authToken');
      console.log('🔑 [IMAGE UPLOAD] Token obtenido:', authToken ? 'SÍ' : 'NO');
      console.log('🔑 [IMAGE UPLOAD] Longitud del token:', authToken?.length || 0);

      // Configurar headers para multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      };
      
      console.log('📤 [IMAGE UPLOAD] Configuración preparada:', {
        hasToken: !!authToken,
        contentType: config.headers['Content-Type'],
        hasAuthorization: !!config.headers.Authorization
      });

      // Subir imagen al servidor
      console.log('📤 [IMAGE UPLOAD] Llamando a API con URL:', '/api/communities/upload-photo');
      console.log('📤 [IMAGE UPLOAD] Llamando a API con FormData:', formData);
      console.log('📤 [IMAGE UPLOAD] Llamando a API con config:', config);
      
      const response = await axiosInstance.post('/api/communities/upload-photo', formData, config);
      
      console.log('✅ [IMAGE UPLOAD] Imagen subida exitosamente a /api/communities/upload-photo:', response.data);
      console.log('🖼️ [IMAGE UPLOAD] Estructura de respuesta:', {
        success: response.data.success,
        message: response.data.message,
        data: response.data.data,
        photoUrl: response.data.data?.photoUrl,
        fileName: response.data.data?.fileName
      });
      
      const photoUrl = response.data.data.photoUrl;
      if (!photoUrl) {
        throw new Error('No se recibió photoUrl en la respuesta del servidor');
      }
      
      return photoUrl; // Retornar la URL de la imagen desde photoUrl
    } catch (error) {
      console.error('❌ [IMAGE UPLOAD] Error subiendo imagen:', error);
      throw error;
    }
  },

  // Subir imagen específicamente para comunidades
  uploadCommunityImage: async (uri: string) => {
    console.log('🖼️ [IMAGE UPLOAD] uploadCommunityImage llamado con URI:', uri);
    console.log('🖼️ [IMAGE UPLOAD] Tipo de URI:', typeof uri);
    try {
      const result = await imageUploadService.uploadImage(uri, 'community');
      console.log('✅ [IMAGE UPLOAD] uploadCommunityImage completado, resultado:', result);
      return result;
    } catch (error) {
      console.error('❌ [IMAGE UPLOAD] Error en uploadCommunityImage:', error);
      throw error;
    }
  },

  // Subir imagen para perfil de usuario
  uploadProfileImage: async (uri: string) => {
    return await imageUploadService.uploadImage(uri, 'profile');
  },

  // Subir imagen para hijos
  uploadChildImage: async (uri: string) => {
    return await imageUploadService.uploadImage(uri, 'child');
  },

  // Subir imagen para marketplace
  uploadMarketplaceImage: async (uri: string) => {
    return await imageUploadService.uploadImage(uri, 'marketplace');
  }
};
