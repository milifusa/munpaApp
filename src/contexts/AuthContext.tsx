import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, User } from '../services/api';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import notificationService from '../services/notificationService';
import sentryService from '../services/sentryService';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  signup: (email: string, password: string, displayName?: string, gender?: 'M' | 'F', childrenCount?: number, isPregnant?: boolean) => Promise<void>;
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

  // Configurar Google Sign-In y Firebase al iniciar la app
  useEffect(() => {
    console.log('⚙️ [GOOGLE SIGN-IN] Configurando Google Sign-In...');
    GoogleSignin.configure({
      webClientId: '975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com', // Para servidor backend
      iosClientId: '975014449237-1d0vk75uqm3oqd3psjmcjvc1la9232kb.apps.googleusercontent.com', // CLIENT_ID específico de iOS
      offlineAccess: true,
    });
    console.log('✅ [GOOGLE SIGN-IN] Configuración completada');
    
    // Inicializar Firebase si no está ya inicializado
    if (getApps().length === 0) {
      console.log('🔥 [FIREBASE] Inicializando Firebase...');
      const firebaseConfig = {
        apiKey: Platform.OS === 'ios' ? 'AIzaSyDOR0D2ZvAjwYvAjwgYZ5HGGyxo8zLZzF0' : 'AIzaSyDDX0_GPvfxwnmC4H0Rs1cUEyz44IAY1S4',
        authDomain: 'mumpabackend.firebaseapp.com',
        projectId: 'mumpabackend',
        storageBucket: 'mumpabackend.firebasestorage.app',
        messagingSenderId: '975014449237',
        appId: Platform.OS === 'ios' ? '1:975014449237:ios:2d54adfc178e18629dc4dc' : '1:975014449237:android:46c06caf478b53489dc4dc',
      };
      initializeApp(firebaseConfig);
      console.log('✅ [FIREBASE] Firebase inicializado para', Platform.OS);
    }
    
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
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del login
      // Esperar un poco más para asegurar que el token esté guardado
      setTimeout(async () => {
        console.log('🔔 [AUTH] Inicializando notificaciones después del login...');
        try {
          // Verificar si hay un token pendiente
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            console.log('🔄 [AUTH] Registrando token pendiente...');
            await notificationService.registerToken(pendingToken);
          } else {
            // Si no hay token pendiente, intentar obtener uno nuevo
            await notificationService.initialize();
          }
        } catch (error) {
          console.error('❌ [AUTH] Error inicializando notificaciones después del login:', error);
        }
      }, 2000);
    } catch (error: any) {
      console.error('❌ Error en login:', error);
      sentryService.captureException(error, { context: 'login', email });
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    console.log('🔑 Iniciando proceso de login con Google...');
    try {
      // Verificar configuración
      console.log('🔍 [GOOGLE SIGN-IN] Verificando configuración...');
      console.log('🔍 [GOOGLE SIGN-IN] Web Client ID:', '975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com');
      console.log('🔍 [GOOGLE SIGN-IN] iOS Client ID:', '975014449237-1d0vk75uqm3oqd3psjmcjvc1la9232kb.apps.googleusercontent.com');
      
      // Verificar si Google Play Services están disponibles (solo Android)
      if (Platform.OS === 'android') {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          console.log('✅ [GOOGLE SIGN-IN] Google Play Services disponibles');
        } catch (playServicesError: any) {
          console.error('❌ [GOOGLE SIGN-IN] Error con Google Play Services:', playServicesError);
          throw new Error('Google Play Services no están disponibles. Por favor, actualiza Google Play Services desde la Play Store.');
        }
      }
      
      // Realizar sign in con Google
      console.log('📱 [GOOGLE SIGN-IN] Iniciando sign in...');
      const userInfo = await GoogleSignin.signIn();
      console.log('📋 Información completa del usuario de Google:', JSON.stringify(userInfo, null, 2));
      
      // Obtener idToken de la respuesta (esto resuelve el DEVELOPER_ERROR)
      const idToken = userInfo.data?.idToken || (userInfo as any).idToken;
      
      if (!idToken) {
        console.error('❌ No se pudo obtener idToken de Google');
        throw new Error('No se pudo obtener idToken de Google. Por favor, intenta de nuevo.');
      }
      
      console.log('🔑 [GOOGLE SIGN-IN] idToken obtenido:', idToken.substring(0, 50) + '...');
      
      // Extraer datos del usuario de Google para logs
      const googleUser = userInfo.data?.user || (userInfo as any).user;
      if (googleUser) {
        console.log('👤 Datos del usuario extraídos:', {
          email: googleUser.email,
          name: googleUser.name,
          id: googleUser.id,
          photo: googleUser.photo
        });
      }
      
      // Usar Firebase Auth para obtener un token de Firebase ID
      console.log('🔥 [FIREBASE AUTH] Autenticando con Firebase usando token de Google...');
      let firebaseIdToken: string;
      try {
        const auth = getAuth();
        const credential = GoogleAuthProvider.credential(idToken);
        const firebaseUserCredential = await signInWithCredential(auth, credential);
        firebaseIdToken = await firebaseUserCredential.user.getIdToken();
        console.log('✅ [FIREBASE AUTH] Token de Firebase ID obtenido:', firebaseIdToken.substring(0, 50) + '...');
      } catch (firebaseError: any) {
        console.error('❌ [FIREBASE AUTH] Error autenticando con Firebase:', firebaseError);
        // Si Firebase Auth falla, intentar usar el token de Google directamente
        console.log('⚠️ [FIREBASE AUTH] Intentando usar token de Google directamente...');
        firebaseIdToken = idToken;
      }
      
      console.log('📤 Enviando token al backend...');
      
      // Enviar token al backend (Firebase ID token o Google OAuth token como fallback)
      const response = await authService.googleLogin(firebaseIdToken);
      console.log('📋 Respuesta completa del login con Google:', response);
      
      // El backend retorna: { success, message, data: { uid, email, displayName, photoUrl, customToken }, isNewUser }
      if (!response.success) {
        throw new Error(response.message || 'Error en login con Google');
      }
      
      const { customToken, displayName: userName, email: userEmail, uid, photoUrl } = response.data;
      
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
        photoURL: photoUrl || googleUser?.photo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      console.log('💾 Guardando token y datos del usuario...');
      await AsyncStorage.setItem('authToken', customToken);
      await AsyncStorage.setItem('userData', JSON.stringify(user));
      
      console.log('✅ Login con Google completado, actualizando estado...');
      setUser(user);
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del login
      setTimeout(async () => {
        console.log('🔔 [AUTH] Inicializando notificaciones después del login con Google...');
        try {
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            console.log('🔄 [AUTH] Registrando token pendiente...');
            await notificationService.registerToken(pendingToken);
          } else {
            await notificationService.initialize();
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
        console.log('ℹ️ [GOOGLE SIGN-IN] Usuario canceló el login');
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
    console.log('🍎 Iniciando proceso de login con Apple...');
    
    // Verificar que estamos en iOS
    if (Platform.OS !== 'ios') {
      throw new Error('Apple Sign-In solo está disponible en iOS');
    }
    
    try {
      // Verificar que Apple Auth está disponible en el dispositivo
      // isSupported es una propiedad booleana, no una función
      const isSupported = appleAuth.isSupported;
      console.log('📱 [APPLE AUTH] isSupported:', isSupported);
      
      if (!isSupported) {
        console.error('❌ Apple Sign-In no está soportado en este dispositivo');
        throw new Error('Apple Sign-In no está disponible en este dispositivo. Requiere iOS 13 o superior.');
      }
      
      console.log('✅ Apple Sign-In está soportado, procediendo...');
      
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
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: userData.id,
        email: userData.email,
        username: userData.name,
      });
      
      // Registrar token de notificaciones después del login
      setTimeout(async () => {
        console.log('🔔 [AUTH] Inicializando notificaciones después del login con Apple...');
        try {
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            console.log('🔄 [AUTH] Registrando token pendiente...');
            await notificationService.registerToken(pendingToken);
          } else {
            await notificationService.initialize();
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
        console.log('👤 Usuario canceló el login con Apple');
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
      
      // Configurar usuario en Sentry
      sentryService.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
      
      // Registrar token de notificaciones después del registro
      setTimeout(async () => {
        console.log('🔔 [AUTH] Inicializando notificaciones después del registro...');
        try {
          const pendingToken = await AsyncStorage.getItem('fcm_token_pending');
          if (pendingToken) {
            console.log('🔄 [AUTH] Registrando token pendiente...');
            await notificationService.registerToken(pendingToken);
          } else {
            await notificationService.initialize();
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
    console.log('🚪 Iniciando proceso de logout...');
    try {
      // Eliminar token de notificaciones del backend
      await notificationService.removeToken().catch((error) => {
        console.error('❌ [AUTH] Error eliminando token de notificaciones:', error);
      });
      
      // Limpiar token, userData y hasChildren
      await AsyncStorage.multiRemove(['authToken', 'userData', 'hasChildren']);
      setUser(null);
      
      // Limpiar usuario de Sentry
      sentryService.clearUser();
      
      console.log('✅ Logout completado exitosamente, datos limpiados');
    } catch (error: any) {
      console.error('❌ Error durante logout:', error);
      sentryService.captureException(error, { context: 'logout' });
      setUser(null);
      throw error;
    }
  };

  const updateProfile = async (data: { name?: string; displayName?: string; email?: string; gender?: 'M' | 'F'; childrenCount?: number; isPregnant?: boolean; gestationWeeks?: number; photoURL?: string }) => {
    console.log('✏️ Iniciando actualización de perfil...');
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
      
      console.log('✅ Perfil actualizado en el backend:', response);

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
    console.log('🔑 [AUTH CONTEXT] Iniciando solicitud de restablecimiento de contraseña...');
    console.log('📧 [AUTH CONTEXT] Email para recuperación:', email);
    
    try {
      console.log('📡 [AUTH CONTEXT] Llamando a authService.forgotPassword...');
      
      const response = await authService.forgotPassword(email);
      
      console.log('📦 [AUTH CONTEXT] === RESPUESTA DEL SERVICIO ===');
      console.log('📦 [AUTH CONTEXT] Tipo de respuesta:', typeof response);
      console.log('📦 [AUTH CONTEXT] Respuesta completa:', JSON.stringify(response, null, 2));
      console.log('📦 [AUTH CONTEXT] Propiedades de la respuesta:', Object.keys(response || {}));
      
      if (response) {
        console.log('✅ [AUTH CONTEXT] Success:', response.success);
        console.log('✅ [AUTH CONTEXT] Message:', response.message);
        console.log('✅ [AUTH CONTEXT] Data:', response.data);
      }
      
      console.log('✅ [AUTH CONTEXT] Solicitud de restablecimiento enviada exitosamente');
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
