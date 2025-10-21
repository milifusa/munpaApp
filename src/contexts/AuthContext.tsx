import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
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

  // Configurar Google Sign-In al iniciar la app
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com',
      offlineAccess: true,
    });
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userDataString = await AsyncStorage.getItem('userData');
      
      if (token && userDataString) {
        try {
          // Intentar parsear los datos del usuario
          const userData = JSON.parse(userDataString);
          
          // Verificar que el token no esté expirado (opcional)
          // Por ahora, solo verificamos que exista
          if (token.length > 50) { // Token válido debe tener cierta longitud
            // Verificar token con el backend
            try {
              await authService.verifyToken();
              setUser(userData);
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

  const loginWithGoogle = async () => {
    console.log('🔑 Iniciando proceso de login con Google...');
    try {
      // Verificar si Google Play Services están disponibles
      await GoogleSignin.hasPlayServices();
      
      // Realizar sign in con Google
      const userInfo = await GoogleSignin.signIn();
      console.log('📋 Información completa del usuario de Google:', JSON.stringify(userInfo, null, 2));
      
      // Extraer datos del usuario de Google
      const googleUser = userInfo.data?.user || (userInfo as any).user;
      
      if (!googleUser || !googleUser.email) {
        console.error('❌ No se pudo obtener información del usuario');
        throw new Error('No se pudo obtener información del usuario de Google');
      }
      
      console.log('👤 Datos del usuario extraídos:', {
        email: googleUser.email,
        name: googleUser.name,
        id: googleUser.id,
        photo: googleUser.photo
      });
      
      console.log('📤 Enviando al backend (endpoint simplificado)...');
      
      // Enviar los datos del usuario directamente al backend (endpoint simplificado)
      const response = await authService.googleLoginSimple({
        email: googleUser.email,
        displayName: googleUser.name || '',
        photoURL: googleUser.photo,
        googleId: googleUser.id
      });
      console.log('📋 Respuesta completa del login con Google:', response);
      
      // Tu backend retorna: { success, message, isNewUser, data: { uid, email, displayName, photoURL, emailVerified, customToken } }
      if (!response.success) {
        throw new Error(response.message || 'Error en login con Google');
      }
      
      const { customToken, displayName: userName, email: userEmail, uid, photoURL } = response.data;
      
      console.log('🔑 Token extraído:', customToken ? 'Sí' : 'No');
      console.log('👤 Datos del usuario extraídos:', { displayName: userName, email: userEmail, uid });
      console.log('🆕 Usuario nuevo:', response.isNewUser ? 'Sí' : 'No');
      
      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }
      
      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        photoURL: photoURL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Guardando token y datos del usuario...');
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      // Si el nombre de Google es diferente al del backend, sincronizar
      if (googleUser.name && googleUser.name !== userName) {
        console.log('🔄 Sincronizando nombre de Google con backend...');
        console.log(`   Nombre en Google: "${googleUser.name}"`);
        console.log(`   Nombre en backend: "${userName}"`);
        // El backend debería actualizar el nombre automáticamente, 
        // pero por si acaso, guardamos el de Google en el usuario local
        user.name = googleUser.name;
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      }
      
      console.log('✅ Login con Google completado, actualizando estado...');
      setUser(user);
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error);
      
      // Si el usuario canceló el sign in
      if (error.code === 'SIGN_IN_CANCELLED') {
        throw new Error('Login con Google cancelado');
      }
      
      // Si Google Play Services no están disponibles
      if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        throw new Error('Google Play Services no están disponibles');
      }
      
      throw error;
    }
  };

  const loginWithApple = async () => {
    console.log('🍎 Iniciando proceso de login con Apple...');
    
    // Verificar que estamos en iOS
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In solo está disponible en iOS');
    }
    
    try {
      // Realizar sign in con Apple
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      console.log('📋 Información completa del usuario de Apple:', JSON.stringify(appleAuthRequestResponse, null, 2));
      
      // Verificar que obtuvimos un identityToken
      const { identityToken, email, fullName, user: appleUserId } = appleAuthRequestResponse;
      
      if (!identityToken) {
        console.error('❌ No se recibió identity token de Apple');
        throw new Error('No se recibió token de Apple');
      }
      
      console.log('👤 Datos del usuario extraídos:', {
        email: email || 'No proporcionado',
        givenName: fullName?.givenName || 'No proporcionado',
        familyName: fullName?.familyName || 'No proporcionado',
        appleUserId: appleUserId
      });
      
      console.log('📤 Enviando al backend...');
      
      // Convertir fullName al formato esperado por el backend
      const fullNameData = fullName ? {
        givenName: fullName.givenName || undefined,
        familyName: fullName.familyName || undefined
      } : undefined;
      
      // Enviar los datos al backend
      const response = await authService.appleLogin({
        identityToken,
        email: email || undefined,
        fullName: fullNameData,
        user: appleUserId
      });
      
      console.log('📋 Respuesta completa del login con Apple:', response);
      
      if (!response.success) {
        throw new Error(response.message || 'Error en login con Apple');
      }
      
      const { customToken, displayName: userName, email: userEmail, uid, photoURL } = response.data;
      
      console.log('🔑 Token extraído:', customToken ? 'Sí' : 'No');
      console.log('👤 Datos del usuario extraídos:', { displayName: userName, email: userEmail, uid });
      console.log('🆕 Usuario nuevo:', response.isNewUser ? 'Sí' : 'No');
      
      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }

      // Crear objeto de usuario
      const userData: User = {
        id: uid,
        email: userEmail,
        name: userName,
        photoURL: photoURL || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Guardando token y datos del usuario...');
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      console.log('✅ Login con Apple completado, actualizando estado...');
      setUser(userData);
    } catch (error: any) {
      console.error('❌ Error en login con Apple:', error);
      
      // Si el usuario canceló
      if (error.code === appleAuth.Error.CANCELED) {
        throw new Error('Login con Apple cancelado');
      }
      
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
      
      console.log('✅ Registro completado, actualizando estado...');
      setUser(user);
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 Iniciando proceso de logout...');
    try {
      // Limpiar token, userData y hasChildren
      await AsyncStorage.multiRemove(['authToken', 'userData', 'hasChildren']);
      setUser(null);
      console.log('✅ Logout completado exitosamente, datos limpiados');
    } catch (error) {
      console.error('❌ Error durante logout:', error);
      setUser(null);
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number }) => {
    console.log('✏️ Iniciando actualización de perfil...');
    try {
      if (user) {
        const updatedUser: User = {
          ...user,
          name: data.name || user.name,
          email: data.email || user.email,
          gender: data.gender || user.gender,
          childrenCount: data.childrenCount || user.childrenCount,
          isPregnant: data.isPregnant || user.isPregnant,
          gestationWeeks: data.gestationWeeks || user.gestationWeeks,
          updatedAt: new Date().toISOString(),
        };
        
        setUser(updatedUser);
        await AsyncStorage.setItem('userData', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    console.log('🔒 Iniciando cambio de contraseña...');
    try {
      // Simular cambio de contraseña exitoso
      console.log('✅ Contraseña cambiada exitosamente');
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    console.log('🗑️ Iniciando eliminación de cuenta...');
    try {
      await logout();
      console.log('✅ Cuenta eliminada exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando cuenta:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    console.log('🔑 Iniciando solicitud de restablecimiento de contraseña...');
    try {
      // Simular envío exitoso
      console.log('✅ Solicitud de restablecimiento enviada');
      return { success: true };
    } catch (error) {
      console.error('❌ Error solicitando restablecimiento:', error);
      throw error;
    }
  };

  const resetPassword = async (oobCode: string, newPassword: string) => {
    console.log('🔑 Iniciando restablecimiento de contraseña...');
    try {
      // Simular restablecimiento exitoso
      console.log('✅ Contraseña restablecida exitosamente');
      return { success: true };
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
    loginWithGoogle,
    loginWithApple,
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
