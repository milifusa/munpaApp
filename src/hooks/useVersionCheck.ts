import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { appVersionService } from '../services/api';
import Constants from 'expo-constants';

interface VersionCheckResult {
  needsUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string | null;
  minVersion: string | null;
  message: string | null;
  loading: boolean;
}

/**
 * Hook para verificar la versión de la aplicación
 * Compara la versión actual con la versión mínima requerida del backend
 */
export const useVersionCheck = (): VersionCheckResult => {
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult>({
    needsUpdate: false,
    forceUpdate: false,
    currentVersion: Constants.expoConfig?.version || '0.0.0',
    latestVersion: null,
    minVersion: null,
    message: null,
    loading: true,
  });

  useEffect(() => {
    checkVersion();
  }, []);

  const checkVersion = async () => {
    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      const response = await appVersionService.checkVersion(platform);

      if (response.success && response.data) {
        const { minVersion, latestVersion, forceUpdate, message } = response.data;


        // Comparar versiones
        const needsUpdate = minVersion
          ? compareVersions(versionCheck.currentVersion, minVersion) < 0
          : false;


        setVersionCheck({
          needsUpdate,
          forceUpdate: needsUpdate && forceUpdate,
          currentVersion: versionCheck.currentVersion,
          latestVersion,
          minVersion,
          message,
          loading: false,
        });
      } else {
        // No hay configuración, permitir usar la app
        setVersionCheck((prev) => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('❌ [VERSION CHECK] Error verificando versión:', error);
      // En caso de error, permitir usar la app
      setVersionCheck((prev) => ({ ...prev, loading: false }));
    }
  };

  return versionCheck;
};

/**
 * Compara dos versiones en formato semántico (X.Y.Z)
 * @param current Versión actual
 * @param minimum Versión mínima requerida
 * @returns -1 si current < minimum, 0 si son iguales, 1 si current > minimum
 */
const compareVersions = (current: string, minimum: string): number => {
  const currentParts = current.split('.').map((n) => parseInt(n, 10) || 0);
  const minimumParts = minimum.split('.').map((n) => parseInt(n, 10) || 0);

  // Asegurar que ambas versiones tengan 3 partes
  while (currentParts.length < 3) currentParts.push(0);
  while (minimumParts.length < 3) minimumParts.push(0);

  for (let i = 0; i < 3; i++) {
    if (currentParts[i] < minimumParts[i]) return -1;
    if (currentParts[i] > minimumParts[i]) return 1;
  }

  return 0;
};
