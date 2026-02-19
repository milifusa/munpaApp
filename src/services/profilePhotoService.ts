import * as ImagePicker from 'expo-image-picker';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { imageUploadService } from './imageUploadService';
import { authService } from './api';

/**
 * Solicitar permisos de cámara y galería
 */
export const requestPermissions = async () => {
  if (Platform.OS !== 'web') {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus.status !== 'granted' || mediaStatus.status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Se necesitan permisos de cámara y galería para cambiar tu foto de perfil.'
      );
      return false;
    }
  }
  return true;
};

/**
 * Seleccionar foto de la galería
 */
export const selectPhotoFromGallery = async () => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error al seleccionar foto:', error);
    Alert.alert('Error', 'No se pudo seleccionar la foto');
    return null;
  }
};

/**
 * Tomar foto con la cámara
 */
export const takePhotoWithCamera = async () => {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      return result.assets[0];
    }

    return null;
  } catch (error) {
    console.error('Error al tomar foto:', error);
    Alert.alert('Error', 'No se pudo tomar la foto');
    return null;
  }
};

/**
 * Subir foto de perfil al backend
 */
export const uploadProfilePhoto = async (photo: ImagePicker.ImagePickerAsset) => {
  try {
    console.log('📸 Subiendo foto de perfil...');

    // 1. Subir imagen a Firebase Storage usando el servicio existente
    const photoURL = await imageUploadService.uploadProfileImage(photo.uri);
    
    console.log('📸 Imagen subida a Firebase:', photoURL);

    // 2. Actualizar perfil con la nueva URL de foto
    const response = await authService.updateProfilePhoto(photoURL);

    console.log('✅ Foto de perfil actualizada exitosamente');

    return {
      success: true,
      photoURL: photoURL,
    };
  } catch (error: any) {
    console.error('❌ Error al subir foto:', error);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Error del servidor',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Error al subir la foto',
    };
  }
};

/**
 * Actualizar foto de perfil con URL externa
 */
export const updateProfilePhotoURL = async (photoURL: string) => {
  try {
    console.log('📸 Actualizando URL de foto de perfil...');

    const response = await authService.updateProfilePhoto(photoURL);

    console.log('✅ URL de foto actualizada exitosamente');

    return {
      success: true,
      photoURL: photoURL,
    };
  } catch (error: any) {
    console.error('❌ Error al actualizar URL de foto:', error);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Error del servidor',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Error al actualizar la foto',
    };
  }
};

/**
 * Eliminar foto de perfil
 */
export const deleteProfilePhoto = async () => {
  try {
    console.log('🗑️ Eliminando foto de perfil...');

    // Actualizar perfil con photoURL nulo/vacío
    await authService.updateProfilePhoto('');

    console.log('✅ Foto eliminada exitosamente');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Error al eliminar foto:', error);
    
    if (error.response) {
      return {
        success: false,
        error: error.response.data?.message || 'Error del servidor',
      };
    }
    
    return {
      success: false,
      error: error.message || 'Error al eliminar la foto',
    };
  }
};

/**
 * Flujo completo: Seleccionar y subir foto de perfil
 */
export const selectAndUploadProfilePhoto = async (source: 'gallery' | 'camera' = 'gallery') => {
  try {
    console.log(`📸 Seleccionando foto desde ${source}...`);

    // 1. Seleccionar foto
    const photo = source === 'camera' 
      ? await takePhotoWithCamera()
      : await selectPhotoFromGallery();

    if (!photo) {
      return {
        success: false,
        error: 'Selección cancelada',
        cancelled: true,
      };
    }

    // 2. Subir foto
    const result = await uploadProfilePhoto(photo);

    return result;
  } catch (error: any) {
    console.error('❌ Error en flujo de foto:', error);
    return {
      success: false,
      error: error.message || 'Error al procesar la foto',
    };
  }
};

