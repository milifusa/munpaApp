import { axiosInstance } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Función para obtener la extensión desde un tipo MIME
const getExtensionFromMimeType = (mimeType: string): string => {
  const mimeLower = mimeType.toLowerCase();
  if (mimeLower.includes('png')) return 'png';
  if (mimeLower.includes('gif')) return 'gif';
  if (mimeLower.includes('webp')) return 'webp';
  if (mimeLower.includes('jpeg') || mimeLower.includes('jpg')) return 'jpg';
  return 'jpg'; // Por defecto
};

// Función para detectar el tipo MIME y extensión basándose en la URI
const getImageTypeAndExtension = (uri: string): { mimeType: string; extension: string; fileName: string } => {
  // Extraer la extensión del archivo de la URI
  const uriLower = uri.toLowerCase();
  let extension = 'jpg';
  let mimeType = 'image/jpeg';
  
  // Intentar detectar por extensión en la URI
  if (uriLower.includes('.png') || uriLower.endsWith('png')) {
    extension = 'png';
    mimeType = 'image/png';
  } else if (uriLower.includes('.gif') || uriLower.endsWith('gif')) {
    extension = 'gif';
    mimeType = 'image/gif';
  } else if (uriLower.includes('.webp') || uriLower.endsWith('webp')) {
    extension = 'webp';
    mimeType = 'image/webp';
  } else if (uriLower.includes('.jpeg') || uriLower.includes('.jpg') || uriLower.endsWith('jpeg') || uriLower.endsWith('jpg')) {
    extension = 'jpg';
    mimeType = 'image/jpeg';
  }
  // Si no se detecta extensión (común en iOS con URIs como ph:// o assets-library://)
  // Por defecto usamos JPEG que es el formato más común y compatible
  // El backend debería aceptar JPEG como formato por defecto
  
  // Generar nombre de archivo único
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const fileName = `image_${timestamp}_${randomSuffix}.${extension}`;
  
  
  return { mimeType, extension, fileName };
};

// Servicio para subir imágenes y obtener URLs
export const imageUploadService = {
  // Subir imagen y obtener URL
  uploadImage: async (uri: string, type: string = 'community', providedMimeType?: string) => {
    
    try {
      // Usar el tipo MIME proporcionado si está disponible, sino detectarlo desde la URI
      let mimeType: string;
      let fileName: string;
      
      if (providedMimeType) {
        // Si tenemos el tipo MIME real del ImagePicker, usarlo
        mimeType = providedMimeType;
        const extension = getExtensionFromMimeType(providedMimeType);
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        fileName = `image_${timestamp}_${randomSuffix}.${extension}`;
      } else {
        // Si no hay tipo MIME, intentar detectarlo desde la URI
        const detected = getImageTypeAndExtension(uri);
        mimeType = detected.mimeType;
        fileName = detected.fileName;
      }
      
      
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('image', {
        uri: uri,
        type: mimeType,
        name: fileName
      } as any);
      formData.append('type', type);
      

      // Obtener token de autenticación
      const authToken = await AsyncStorage.getItem('authToken');

      // Configurar headers para multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      };
      

      // Subir imagen al servidor
      
      const response = await axiosInstance.post('/api/communities/upload-photo', formData, config);
      
      
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
  uploadCommunityImage: async (uri: string, mimeType?: string) => {
    try {
      const result = await imageUploadService.uploadImage(uri, 'community', mimeType);
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
  },

  // Subir imagen de banner profesional (endpoint dedicado)
  uploadBannerImage: async (uri: string): Promise<string> => {
    const { mimeType, fileName } = getImageTypeAndExtension(uri);
    const formData = new FormData();
    formData.append('image', { uri, type: mimeType, name: fileName } as any);
    const authToken = await AsyncStorage.getItem('authToken');
    const response = await axiosInstance.post(
      '/api/professionals/me/banners/upload-image',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${authToken}` } }
    );
    const url = response.data?.data?.imageUrl || response.data?.imageUrl || response.data?.url || response.data?.data?.url;
    if (!url) throw new Error('No se recibió URL de imagen del banner');
    return url;
  },
};
