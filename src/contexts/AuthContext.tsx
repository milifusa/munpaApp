import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string, gender?: 'M' | 'F', childrenCount?: number, isPregnant?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number }) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  forgotPassword: (email: string) => Promise<any>;
  resetPassword: (oobCode: string, newPassword: string) => Promise<any>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Verificar token al iniciar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    console.log('🔍 Verificando estado de autenticación al iniciar...');
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataString = await AsyncStorage.getItem('userData');
      console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
      console.log('👤 Datos de usuario encontrados:', userDataString ? 'Sí' : 'No');
      
      if (token && userDataString) {
        try {
          // Intentar parsear los datos del usuario
          const userData = JSON.parse(userDataString);
          console.log('✅ Usuario autenticado desde almacenamiento:', userData);
          
          // Verificar que el token no esté expirado (opcional)
          // Por ahora, solo verificamos que exista
          if (token.length > 50) { // Token válido debe tener cierta longitud
            // Verificar token con el backend
            try {
              console.log('🔍 Verificando token con el backend...');
              await authService.verifyToken();
              setUser(userData);
              console.log('✅ Token válido, usuario autenticado');
            } catch (verifyError) {
              console.log('❌ Token inválido o expirado, limpiando datos');
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userData');
            }
          } else {
            console.log('⚠️ Token parece inválido, limpiando datos');
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('❌ Error parseando datos del usuario:', error);
          // Si hay error parseando, limpiar almacenamiento
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
          console.log('🧹 Datos corruptos, limpiando almacenamiento');
        }
      } else {
        console.log('❌ No hay token o datos de usuario, usuario no autenticado');
        // Limpiar cualquier dato residual
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('userData');
      }
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      // En caso de error, limpiar todo
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } finally {
      setIsLoading(false);
      console.log('🏁 Verificación de autenticación completada');
    }
  };

  const login = async (email: string, password: string) => {
    console.log('🔑 Iniciando proceso de login...');
    try {
      const response = await authService.login({ email, password });
      console.log('📋 Respuesta completa del login:', response);
      
      // Extraer datos directamente de response.data
      const { customToken, displayName: userName, email: userEmail, uid } = response.data;
      
      console.log('🔑 Token extraído:', customToken ? 'Sí' : 'No');
      console.log('👤 Datos del usuario extraídos:', { displayName: userName, email: userEmail, uid });
      
      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }
      
      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Guardando token y datos del usuario...');
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      console.log('✅ Login completado, actualizando estado...');
      setUser(user);
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, displayName?: string, gender?: 'M' | 'F', childrenCount?: number, isPregnant?: boolean) => {
    console.log('📝 Iniciando proceso de registro...');
    console.log('📊 Datos de registro:', { email, displayName, gender, childrenCount, isPregnant });
    try {
      const signupData: any = { email, password };
      if (displayName) signupData.displayName = displayName;
      if (gender) signupData.gender = gender;
      if (childrenCount !== undefined) signupData.childrenCount = childrenCount;
      if (isPregnant !== undefined) signupData.isPregnant = isPregnant;
      
      console.log('📤 Datos finales a enviar al backend:', signupData);
      const response = await authService.signup(signupData);
      console.log('📋 Respuesta completa del registro:', response);
      
      // Extraer datos directamente de response.data
      const { customToken, displayName: userName, email: userEmail, uid } = response.data;
      
      console.log('🔑 Token extraído:', customToken ? 'Sí' : 'No');
      console.log('👤 Datos del usuario extraídos:', { displayName: userName, email: userEmail, uid });
      
      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }
      
      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Guardando token y datos del usuario...');
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      console.log('✅ Registro completado, pero NO actualizando estado aún...');
      // No establecer el usuario como autenticado inmediatamente
      // para permitir que se complete el flujo de navegación
      // setUser(user);
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 Iniciando proceso de logout...');
    try {
      // Limpiar todos los datos del almacenamiento
      console.log('🧹 Limpiando datos del almacenamiento...');
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      console.log('✅ Datos limpiados del almacenamiento');
      
      // Limpiar el estado del usuario
      console.log('🔄 Actualizando estado de la aplicación...');
      setUser(null);
      console.log('✅ Estado de usuario actualizado');
      
      // Opcional: Llamar al backend para invalidar el token (si el backend lo soporta)
      // Nota: El endpoint /api/auth/logout no existe en el backend actual
      // try {
      //   console.log('🌐 Notificando al servidor sobre el logout...');
      //   await authService.logout();
      //   console.log('✅ Servidor notificado sobre el logout');
      // } catch (serverError) {
      //   console.log('⚠️ No se pudo notificar al servidor, pero el logout local se completó');
      // }
      
      console.log('✅ Logout completado exitosamente');
    } catch (error) {
      console.error('❌ Error durante logout:', error);
      // Aún así, intentar limpiar el estado local
      setUser(null);
      throw error;
    }
  };

  const clearStorage = async () => {
    console.log('🧹 Limpiando almacenamiento...');
    try {
      await AsyncStorage.multiRemove(['authToken', 'userData']);
      console.log('✅ Almacenamiento limpiado');
    } catch (error) {
      console.error('❌ Error limpiando almacenamiento:', error);
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number }) => {
    console.log('✏️ Iniciando actualización de perfil...');
    try {
      // Preparar datos para el backend
      const backendData: any = {};
      if (data.name) backendData.displayName = data.name;
      if (data.email) backendData.email = data.email;
      if (data.gender) backendData.gender = data.gender;
      if (data.childrenCount !== undefined) backendData.childrenCount = data.childrenCount;
      if (data.isPregnant !== undefined) backendData.isPregnant = data.isPregnant;
      if (data.gestationWeeks !== undefined) backendData.gestationWeeks = data.gestationWeeks;
      
      console.log('📤 Enviando datos al backend:', backendData);
      const response = await authService.updateProfile(backendData);
      console.log('📋 Respuesta de actualización:', response);
      
      // El backend devuelve { success: true, message: '...', data: { uid, ...updateData } }
      // Necesitamos obtener los datos actualizados del usuario
      const updatedUserData = response.data;
      
      // Crear objeto de usuario actualizado
      const updatedUser: User = {
        id: updatedUserData.uid,
        email: updatedUserData.email || user?.email || '',
        name: updatedUserData.displayName || updatedUserData.name || user?.name,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('✅ Perfil actualizado:', updatedUser);
      setUser(updatedUser);
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      console.log('💾 Datos actualizados en almacenamiento');
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    console.log('🔒 Iniciando cambio de contraseña...');
    try {
      const response = await authService.changePassword({ currentPassword, newPassword });
      console.log('📋 Respuesta de cambio de contraseña:', response);
      console.log('✅ Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    console.log('🗑️ Iniciando eliminación de cuenta...');
    try {
      const response = await authService.deleteAccount();
      console.log('📋 Respuesta de eliminación:', response);
      console.log('✅ Cuenta eliminada, limpiando datos...');
      await logout();
    } catch (error) {
      console.error('❌ Error eliminando cuenta:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    console.log('🔑 Iniciando solicitud de restablecimiento de contraseña...');
    try {
      const response = await authService.forgotPassword(email);
      console.log('📋 Respuesta de forgot password:', response);
      console.log('✅ Solicitud de restablecimiento enviada');
      return response;
    } catch (error) {
      console.error('❌ Error solicitando restablecimiento:', error);
      throw error;
    }
  };

  const resetPassword = async (oobCode: string, newPassword: string) => {
    console.log('🔑 Iniciando restablecimiento de contraseña...');
    try {
      const response = await authService.resetPassword(oobCode, newPassword);
      console.log('📋 Respuesta de reset password:', response);
      console.log('✅ Contraseña restablecida exitosamente');
      return response;
    } catch (error) {
      console.error('❌ Error restableciendo contraseña:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    signup,
    logout,
    updateProfile,
    changePassword,
    deleteAccount,
    forgotPassword,
    resetPassword,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
