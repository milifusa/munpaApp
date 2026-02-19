import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { axiosInstance } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DeviceInfoData {
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  buildNumber: string;
  deviceModel: string;
  osVersion: string;
  userAgent?: string;
}

class DeviceInfoService {
  private cachedInfo: DeviceInfoData | null = null;

  /**
   * Obtener información del dispositivo usando Expo
   */
  async getDeviceInfo(): Promise<DeviceInfoData> {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }

    try {
      const appVersion = Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version || '1.0.0';
      const buildNumber = Constants.expoConfig?.ios?.buildNumber || 
                         Constants.expoConfig?.android?.versionCode?.toString() || '1';
      const platform = Platform.OS as 'ios' | 'android' | 'web';
      const deviceModel = Device.modelName || Device.deviceName || 'Unknown';
      const osVersion = Device.osVersion || Platform.Version.toString();
      
      const userAgent = `Munpa/${appVersion} (${deviceModel}; ${Platform.OS} ${osVersion})`;

      this.cachedInfo = {
        appVersion,
        platform,
        buildNumber,
        deviceModel,
        osVersion,
        userAgent,
      };

      console.log('📱 [DEVICE INFO] Info del dispositivo:', this.cachedInfo);
      return this.cachedInfo;
    } catch (error) {
      console.error('❌ [DEVICE INFO] Error obteniendo info:', error);
      
      // Fallback con info básica
      return {
        appVersion: '1.0.0',
        platform: Platform.OS as 'ios' | 'android' | 'web',
        buildNumber: '1',
        deviceModel: 'Unknown',
        osVersion: Platform.Version.toString(),
      };
    }
  }

  /**
   * Obtener headers para incluir en todas las requests
   */
  async getHeaders(): Promise<Record<string, string>> {
    const info = await this.getDeviceInfo();
    
    return {
      'X-App-Version': info.appVersion,
      'X-Platform': info.platform,
      'X-Build-Number': info.buildNumber,
      'X-Device-Model': info.deviceModel,
      'X-OS-Version': info.osVersion,
    };
  }

  /**
   * Actualizar device info en el backend
   */
  async updateDeviceInfo(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        console.log('⚠️ [DEVICE INFO] No hay token, saltando actualización');
        return;
      }

      const deviceInfo = await this.getDeviceInfo();
      
      console.log('📤 [DEVICE INFO] Actualizando en backend...');

      const response = await axiosInstance.post(
        '/api/users/device-info',
        deviceInfo,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        console.log('✅ [DEVICE INFO] Actualizado exitosamente');
        
        // Guardar timestamp de última actualización
        await AsyncStorage.setItem(
          'lastDeviceInfoUpdate',
          new Date().toISOString()
        );
      }
    } catch (error: any) {
      console.error('❌ [DEVICE INFO] Error actualizando:', error.message);
      // No lanzar error para no bloquear otras operaciones
    }
  }

  /**
   * Verificar si necesita actualizar (una vez al día)
   */
  async shouldUpdate(): Promise<boolean> {
    try {
      const lastUpdate = await AsyncStorage.getItem('lastDeviceInfoUpdate');
      
      if (!lastUpdate) {
        return true; // Primera vez
      }

      const lastUpdateDate = new Date(lastUpdate);
      const now = new Date();
      const hoursSinceUpdate = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60);

      // Actualizar si pasaron más de 24 horas
      return hoursSinceUpdate > 24;
    } catch (error) {
      return true; // Si hay error, intentar actualizar
    }
  }

  /**
   * Actualizar solo si es necesario
   */
  async updateIfNeeded(): Promise<void> {
    const should = await this.shouldUpdate();
    
    if (should) {
      await this.updateDeviceInfo();
    } else {
      console.log('ℹ️ [DEVICE INFO] No es necesario actualizar todavía');
    }
  }

  /**
   * Limpiar caché (útil para testing)
   */
  clearCache(): void {
    this.cachedInfo = null;
  }
}

export default new DeviceInfoService();
