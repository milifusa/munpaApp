import { axiosInstance } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tipos de datos para hijos con foto
export interface Child {
  id: string;
  parentId: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks: number | null;
  photoUrl: string | null; // URL de la foto
  createdAt: string;
  updatedAt: string;
}

export interface UpdateChildData {
  name?: string;
  ageInMonths?: number;
  isUnborn?: boolean;
  gestationWeeks?: number;
  photoUrl?: string; // Solo en actualización
}

// Servicios para gestión de fotos de hijos usando Firebase Storage
export const childrenPhotoService = {
  // Subir foto usando Firebase Storage
  uploadPhoto: async (uri: string, childId: string) => {
    
    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('photo', {
        uri: uri,
        type: 'image/jpeg',
        name: 'photo.jpg'
      } as any);
      formData.append('childId', childId);

      // Obtener token de autenticación
      const authToken = await AsyncStorage.getItem('authToken');

      // Configurar headers para multipart/form-data
      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        }
      };

      // Subir foto al servidor (que la subirá a Firebase Storage)
      const response = await axiosInstance.post('/api/auth/children/upload-photo', formData, config);
      
      return response.data.data.photoUrl;
    } catch (error) {
      console.error('❌ [FIREBASE] Error subiendo foto:', error);
      throw error;
    }
  },

  // Eliminar foto de Firebase Storage
  removeChildPhoto: async (childId: string) => {
    
    try {
      const response = await axiosInstance.delete(`/api/auth/children/${childId}/photo`);
      return response.data;
    } catch (error) {
      console.error('❌ [FIREBASE] Error eliminando foto:', error);
      throw error;
    }
  },

  // Actualizar foto de un hijo (usar URL externa)
  updateChildPhoto: async (childId: string, photoUrl: string) => {
    
    try {
      const response = await axiosInstance.put(`/api/auth/children/${childId}`, {
        photoUrl: photoUrl
      });
      return response.data;
    } catch (error) {
      console.error('❌ [FIREBASE] Error actualizando foto:', error);
      throw error;
    }
  },

  // Función auxiliar para convertir imagen a Base64 (mantenida por compatibilidad)
  convertImageToBase64: async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result?.toString().split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error convirtiendo imagen a Base64:', error);
      throw error;
    }
  }
};
