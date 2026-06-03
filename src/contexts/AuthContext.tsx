import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import notificationService from '../services/notificationService';
import sentryService from '../services/sentryService';
import analyticsService from '../services/analyticsService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signup: (email: string, password: string, displayName?: string, gender?: 'M' | 'F', childrenCount?: number, isPregnant?: boolean, gestationWeeks?: number) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number; photoURL?: string }) => Promise<void>;
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

  useEffect(() => {
    
    // Configurar Google Sign-In
    GoogleSignin.configure({
      webClientId: '975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com',
      iosClientId: '975014449237-1d0vk75uqm3oqd3psjmcjvc1la9232kb.apps.googleusercontent.com',
      offlineAccess: true,
    });
    
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user?.id) {
      analyticsService.setUser(user.id, {
        email: user.email,
        name: user.name,
      });
    } else {
      analyticsService.setUser(null);
    }
  }, [user?.id]);

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

              // Siempre obtener el perfil completo del backend para tener
              // professionalProfile, ubicación y demás campos actualizados
              try {
                const profileResponse = await authService.getProfile();
                const profileData = profileResponse?.data || profileResponse;


                const updatedUserData: User = {
                  ...userData,
                  countryId: profileData.countryId || userData.countryId,
                  cityId: profileData.cityId || userData.cityId,
                  countryName: profileData.countryName || userData.countryName,
                  cityName: profileData.cityName || userData.cityName,
                  gender: profileData.gender || userData.gender,
                  childrenCount: profileData.childrenCount !== undefined ? profileData.childrenCount : userData.childrenCount,
                  isPregnant: profileData.isPregnant !== undefined ? profileData.isPregnant : userData.isPregnant,
                  gestationWeeks: profileData.gestationWeeks !== undefined ? profileData.gestationWeeks : userData.gestationWeeks,
                  photoURL: profileData.photoURL || userData.photoURL,
                  professionalProfile: profileData.professionalProfile ?? userData.professionalProfile ?? null,
                };


                await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
                setUser(updatedUserData);
              } catch (profileError) {
                console.error('❌ [AUTH] Error obteniendo perfil, usando datos locales:', profileError);
                setUser(userData);
              }

              // Inicializar notificaciones en auto-login (el flag isInitialized evita doble init)
              notificationService.initialize().catch((error) => {
                console.error('❌ [AUTH] Error inicializando notificaciones en auto-login:', error);
              });

            } catch (verifyError) {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userData');
            }
          } else {
            await AsyncStorage.removeItem('authToken');
            await AsyncStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('❌ Error parseando datos del usuario:', error);
          // Si hay error parseando, limpiar almacenamiento
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userData');
        }
      } else {
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

  const getAuthResponseRoot = (response: any) => response?.data ?? response;
  const getAuthResponseSuccess = (response: any) => {
    const root = getAuthResponseRoot(response);
    return root?.success ?? true;
  };
  const getAuthPayload = (response: any) => {
    const root = getAuthResponseRoot(response);
    return root?.data ?? root ?? {};
  };

  // Helper para actualizar device info después del login
  const updateDeviceInfoAfterLogin = async () => {
    try {
      const deviceInfoService = (await import('../services/deviceInfoService')).default;
      await deviceInfoService.updateDeviceInfo();
    } catch (deviceError) {
      console.error('❌ [AUTH] Error actualizando device info:', deviceError);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      
      const data = getAuthPayload(response);
      const {
        customToken,
        displayName: userName,
        email: userEmail,
        uid,
        isPregnant: isPregnantFromServer,
        gestationWeeks: gestationWeeksFromServer,
        countryId,
        cityId,
        countryName,
        cityName,
        professionalProfile,
      } = data;


      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }

      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        isPregnant: isPregnantFromServer ?? false,
        gestationWeeks: gestationWeeksFromServer ?? undefined,
        countryId: countryId ?? undefined,
        cityId: cityId ?? undefined,
        countryName: countryName ?? undefined,
        cityName: cityName ?? undefined,
        professionalProfile: professionalProfile ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      setUser(user);
      
      // 📊 Analytics: Login exitoso
      analyticsService.logEvent('login', {
        method: 'email',
        user_id: user.id,
        has_country: !!user.countryId,
        has_city: !!user.cityId,
      });
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del login
      // Esperar un poco más para asegurar que el token esté guardado
      setTimeout(async () => {
        try {
          // Inicializar servicio de notificaciones
          await notificationService.initialize();
          
          // Verificar si hay un token pendiente
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            await notificationService.registerToken(pendingToken);
            // Limpiar token pendiente después de registrarlo
            await AsyncStorage.removeItem('fcm_token_pending');
          } else {
            // Si no hay token pendiente, obtener y registrar uno nuevo
            await notificationService.registerToken();
          }
        } catch (error) {
          console.error('❌ [AUTH] Error inicializando notificaciones después del login:', error);
        }

        // Actualizar device info después del login
        await updateDeviceInfoAfterLogin();
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      sentryService.captureException(error, { context: 'login', email });
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      // Verificar configuración
      
      // Verificar si Google Play Services están disponibles (solo Android)
      if (Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        } catch (playServicesError: any) {
          console.error('❌ [GOOGLE SIGN-IN] Error con Google Play Services:', playServicesError);
          throw new Error('Google Play Services no están disponibles. Por favor, actualiza Google Play Services desde la Play Store.');
        }
      }
      
      // Realizar sign in con Google
      const userInfo = await GoogleSignin.signIn();
      
      // Obtener idToken de Google OAuth
      const googleOAuthToken = userInfo.data?.idToken || (userInfo as any).idToken;
      
      if (!googleOAuthToken) {
        console.error('❌ No se pudo obtener idToken de Google');
        throw new Error('No se pudo obtener idToken de Google. Por favor, intenta de nuevo.');
      }
      
      
      // Extraer datos del usuario de Google para logs
      const googleUser = userInfo.data?.user || (userInfo as any).user;
      if (googleUser) {
      }
      
      // Intercambiar token de Google por Firebase ID token
      const firebaseWebApiKey = 'AIzaSyDDX0_GPvfxwnmC4H0Rs1cUEyz44IAY1S4';
      const firebaseTokenResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${firebaseWebApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postBody: `id_token=${googleOAuthToken}&providerId=google.com`,
            requestUri: 'http://localhost',
            returnIdpCredential: true,
            returnSecureToken: true,
          }),
        }
      );
      const firebaseTokenData = await firebaseTokenResponse.json();
      if (!firebaseTokenResponse.ok || !firebaseTokenData?.idToken) {
        console.error('❌ [GOOGLE SIGN-IN] Error Firebase token:', firebaseTokenData);
        throw new Error(firebaseTokenData?.error?.message || 'No se pudo obtener Firebase ID token');
      }

      const response = await authService.googleLogin(firebaseTokenData.idToken);
      
      // El backend retorna: { success, message, data: { uid, email, displayName, photoUrl, customToken }, isNewUser }
      if (!getAuthResponseSuccess(response)) {
        throw new Error(getAuthResponseRoot(response)?.message || 'Error en login con Google');
      }
      
      const data = getAuthPayload(response);
      const { customToken, displayName: userName, email: userEmail, uid, photoUrl, countryId, cityId, countryName, cityName, professionalProfile } = data;


      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }

      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        photoURL: photoUrl || googleUser?.photo,
        countryId: countryId ?? undefined,
        cityId: cityId ?? undefined,
        countryName: countryName ?? undefined,
        cityName: cityName ?? undefined,
        professionalProfile: professionalProfile ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      setUser(user);
      
      // 📊 Analytics: Login con Google
      const isNewUser = (response as any)?.isNewUser || false;
      analyticsService.logEvent(isNewUser ? 'sign_up' : 'login', {
        method: 'google',
        user_id: user.id,
        has_country: !!user.countryId,
        has_city: !!user.cityId,
        is_new_user: isNewUser,
      });
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del login
      setTimeout(async () => {
        try {
          // Inicializar servicio de notificaciones
          await notificationService.initialize();
          
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            await notificationService.registerToken(pendingToken);
            await AsyncStorage.removeItem('fcm_token_pending');
          } else {
            await notificationService.registerToken();
          }
        } catch (error) {
          console.error('❌ [AUTH] Error inicializando notificaciones después del login con Google:', error);
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ [GOOGLE SIGN-IN] Error completo:', error);
      console.error('❌ [GOOGLE SIGN-IN] Error message:', error?.message);
      console.error('❌ [GOOGLE SIGN-IN] Error code:', error?.code);
      
      // Si el usuario canceló el sign in
      if (error.code === 'SIGN_IN_CANCELLED' || error?.message?.includes('cancel')) {
        // No mostrar alerta si el usuario canceló
        return; // Salir sin error
      }
      
      // Si Google Play Services no están disponibles
      if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert(
          'Google Play Services',
          'Google Play Services no están disponibles. Por favor, actualiza Google Play Services desde la Play Store.',
          [{ text: 'OK' }]
        );
        throw error;
      }
      
      // Manejar DEVELOPER_ERROR (aunque ahora debería estar resuelto con el nuevo endpoint)
      if (error?.code === 'DEVELOPER_ERROR' || error?.message?.includes('DEVELOPER_ERROR')) {
        console.error('❌ [GOOGLE SIGN-IN] DEVELOPER_ERROR detectado');
        Alert.alert(
          'Error de Configuración',
          'El login con Google no está configurado correctamente.\n\n' +
          'Por favor, verifica:\n' +
          '• Que el SHA-1 esté registrado en Google Cloud Console\n' +
          '• Que el package name sea "com.munpa.app"\n' +
          '• Revisa SOLUCIONAR_ERROR_GOOGLE_SIGNIN.md',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          error?.message || 'No se pudo iniciar sesión con Google. Por favor, intenta de nuevo.',
          [{ text: 'OK' }]
        );
      }
      throw error;
    }
  };

  const loginWithApple = async () => {
    
    // Verificar que estamos en iOS
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In solo está disponible en iOS');
    }
    
    try {
      // Verificar que Apple Auth está disponible en el dispositivo
      // isSupported es una propiedad booleana, no una función
      const isSupported = appleAuth.isSupported;
      
      if (!isSupported) {
        console.error('❌ Apple Sign-In no está soportado en este dispositivo');
        throw new Error('Apple Sign-In no está disponible en este dispositivo. Requiere iOS 13 o superior.');
      }
      
      
      // Realizar sign in con Apple
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      
      
      // Verificar que obtuvimos un identityToken
      const { identityToken, email, fullName, user: appleUserId } = appleAuthRequestResponse;
      
      if (!identityToken) {
        console.error('❌ No se recibió identity token de Apple');
        throw new Error('No se recibió token de Apple');
      }
      
      
      
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
      
      
      if (!getAuthResponseSuccess(response)) {
        throw new Error(getAuthResponseRoot(response)?.message || 'Error en login con Apple');
      }
      
      const data = getAuthPayload(response);
      const { customToken, displayName: userName, email: userEmail, uid, photoURL, countryId, cityId, countryName, cityName, professionalProfile } = data;


      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }

      // Crear objeto de usuario
      const userData: User = {
        id: uid,
        email: userEmail,
        name: userName,
        photoURL: photoURL || null,
        countryId: countryId ?? undefined,
        cityId: cityId ?? undefined,
        countryName: countryName ?? undefined,
        cityName: cityName ?? undefined,
        professionalProfile: professionalProfile ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      
      // 📊 Analytics: Login con Apple
      const isNewUser = (response as any)?.isNewUser || false;
      analyticsService.logEvent(isNewUser ? 'sign_up' : 'login', {
        method: 'apple',
        user_id: userData.id,
        has_country: !!userData.countryId,
        has_city: !!userData.cityId,
        is_new_user: isNewUser,
      });
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: userData.id,
        email: userData.email,
        username: userData.name,
      });
      
      // Registrar token de notificaciones después del login
      setTimeout(async () => {
        try {
          // Inicializar servicio de notificaciones
          await notificationService.initialize();
          
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            await notificationService.registerToken(pendingToken);
            await AsyncStorage.removeItem('fcm_token_pending');
          } else {
            await notificationService.registerToken();
          }
        } catch (error) {
          console.error('❌ [AUTH] Error inicializando notificaciones después del login con Apple:', error);
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error en login con Apple:', error);
      console.error('📋 Error code:', error.code);
      console.error('📋 Error message:', error.message);
      
      // Si el usuario canceló (código 1000 o CANCELED)
      if (error.code === '1000' || error.code === 1000 || error.code === appleAuth.Error.CANCELED) {
        throw new Error('Login con Apple cancelado');
      }
      
      // Error de credenciales o configuración
      if (error.code === '1001' || error.code === 1001) {
        console.error('❌ Error de credenciales con Apple');
        throw new Error('Error de autenticación con Apple. Por favor intenta nuevamente.');
      }
      
      // Para cualquier otro error
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    displayName?: string,
    gender?: 'M' | 'F',
    childrenCount?: number,
    isPregnant?: boolean,
    gestationWeeks?: number
  ) => {
    try {
      const signupData: any = { email, password };
      if (displayName) signupData.displayName = displayName;
      if (gender) signupData.gender = gender;
      if (childrenCount !== undefined) signupData.childrenCount = childrenCount;
      if (isPregnant !== undefined) signupData.isPregnant = isPregnant;
      if (gestationWeeks !== undefined) signupData.gestationWeeks = gestationWeeks;
      
      const response = await authService.signup(signupData);
      
      const data = getAuthPayload(response);
      const { customToken, displayName: userName, email: userEmail, uid, countryId, cityId, countryName, cityName } = data;
      
      
      if (!customToken) {
        throw new Error('No se recibió token del servidor');
      }
      
      // Crear objeto de usuario compatible
      const user: User = {
        id: uid,
        email: userEmail,
        name: userName,
        countryId: countryId ?? undefined,
        cityId: cityId ?? undefined,
        countryName: countryName ?? undefined,
        cityName: cityName ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      setUser(user);
      
      // 📊 Analytics: Registro exitoso
      analyticsService.logEvent('sign_up', {
        method: 'email',
        user_id: user.id,
        has_gender: !!gender,
        has_children_count: !!childrenCount,
        is_pregnant: !!isPregnant,
        has_gestation_weeks: !!gestationWeeks,
      });
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del registro
      setTimeout(async () => {
        try {
          // Inicializar servicio de notificaciones
          await notificationService.initialize();
          
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            await notificationService.registerToken(pendingToken);
            await AsyncStorage.removeItem('fcm_token_pending');
          } else {
            await notificationService.registerToken();
          }
        } catch (error) {
          console.error('❌ [AUTH] Error inicializando notificaciones después del registro:', error);
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      sentryService.captureException(error, { context: 'signup' });
      throw error;
    }
  };

  const logout = async () => {
    try {
      const userId = user?.id;
      
      // Eliminar token de notificaciones del backend
      await notificationService.removeToken().catch((error) => {
        console.error('❌ [AUTH] Error eliminando token de notificaciones:', error);
      });
      
      // Limpiar token, userData y hasChildren
      await AsyncStorage.multiRemove(['authToken', 'userData', 'hasChildren']);
      setUser(null);
      
      // 📊 Analytics: Logout
      if (userId) {
        analyticsService.logEvent('logout', {
          user_id: userId,
        });
      }
      
      // Limpiar usuario de Sentry
      sentryService.clearUser();
      
    } catch (error: any) {
      console.error('❌ Error durante logout:', error);
      sentryService.captureException(error, { context: 'logout' });
      setUser(null);
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; displayName?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number; photoURL?: string }) => {
    try {
      // Preparar datos para el backend
      const profileData: any = {};
      if (data.displayName) profileData.displayName = data.displayName;
      if (data.name) profileData.displayName = data.name; // Si viene name, usar como displayName
      if (data.email) profileData.email = data.email;
      if (data.gender) profileData.gender = data.gender;
      if (data.childrenCount !== undefined) profileData.childrenCount = data.childrenCount;
      if (data.isPregnant !== undefined) profileData.isPregnant = data.isPregnant;
      if (data.gestationWeeks !== undefined) profileData.gestationWeeks = data.gestationWeeks;
      if (data.photoURL !== undefined) profileData.photoURL = data.photoURL;

      // Llamar al backend para actualizar el perfil
      const response = await authService.updateProfile(profileData);
      

      // Actualizar estado local
      if (user) {
        const updatedUser: User = {
          ...user,
          name: data.displayName || data.name || user.name,
          email: data.email || user.email,
          gender: data.gender || user.gender,
          childrenCount: data.childrenCount !== undefined ? data.childrenCount : user.childrenCount,
          isPregnant: data.isPregnant !== undefined ? data.isPregnant : user.isPregnant,
          gestationWeeks: data.gestationWeeks !== undefined ? data.gestationWeeks : user.gestationWeeks,
          photoURL: data.photoURL !== undefined ? data.photoURL : user.photoURL,
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
    try {
      // Simular cambio de contraseña exitoso
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  };

  const deleteAccount = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('❌ Error eliminando cuenta:', error);
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    
    try {
      
      const response = await authService.forgotPassword(email);
      
      
      if (response) {
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ [AUTH CONTEXT] === ERROR EN forgotPassword ===');
      console.error('❌ [AUTH CONTEXT] Tipo de error:', typeof error);
      console.error('❌ [AUTH CONTEXT] Error completo:', error);
      console.error('❌ [AUTH CONTEXT] Error message:', error.message);
      
      if (error.response) {
        console.error('❌ [AUTH CONTEXT] Response status:', error.response.status);
        console.error('❌ [AUTH CONTEXT] Response data:', JSON.stringify(error.response.data, null, 2));
      }
      
      console.error('❌ [AUTH CONTEXT] Error solicitando restablecimiento:', error);
      throw error;
    }
  };

  const resetPassword = async (oobCode: string, newPassword: string) => {
    try {
      // Simular restablecimiento exitoso
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
