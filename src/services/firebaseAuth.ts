// Firebase Web SDK Auth Service
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  signInWithCredential, 
  GoogleAuthProvider,
  getReactNativePersistence 
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuración de Firebase (desde GoogleService-Info.plist)
const firebaseConfig = {
  apiKey: "AIzaSyDOR0D2ZvAjwYvAjwgYZ5HGGyxo8zLZzF0",
  authDomain: "mumpabackend.firebaseapp.com",
  projectId: "mumpabackend",
  storageBucket: "mumpabackend.firebasestorage.app",
  messagingSenderId: "975014449237",
  appId: "1:975014449237:ios:2d54adfc178e18629dc4dc"
};

// Inicializar Firebase una sola vez
let app;
let auth;

export const initializeFirebaseAuth = () => {
  try {
    if (getApps().length === 0) {
      console.log('🔥 [FIREBASE AUTH] Inicializando Firebase Web SDK...');
      app = initializeApp(firebaseConfig);
      
      // Inicializar Auth con persistencia en AsyncStorage
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
      });
      
      console.log('✅ [FIREBASE AUTH] Firebase inicializado correctamente');
    } else {
      app = getApp();
      auth = getAuth(app);
      console.log('✅ [FIREBASE AUTH] Firebase ya estaba inicializado');
    }
    
    return auth;
  } catch (error) {
    console.error('❌ [FIREBASE AUTH] Error inicializando Firebase:', error);
    throw error;
  }
};

// Autenticar con Google y obtener Firebase ID Token
export const authenticateWithGoogle = async (googleIdToken: string): Promise<string> => {
  try {
    console.log('🔥 [FIREBASE AUTH] Autenticando con Google...');
    
    // Asegurar que Firebase esté inicializado
    if (!auth) {
      initializeFirebaseAuth();
    }
    
    // Crear credencial de Google
    const credential = GoogleAuthProvider.credential(googleIdToken);
    
    // Autenticar con Firebase
    console.log('🔑 [FIREBASE AUTH] Autenticando con credencial de Google...');
    const userCredential = await signInWithCredential(auth!, credential);
    
    // Obtener el Firebase ID Token
    const firebaseIdToken = await userCredential.user.getIdToken();
    
    console.log('✅ [FIREBASE AUTH] Firebase ID Token obtenido correctamente');
    console.log('🔑 [FIREBASE AUTH] Token (primeros 50 chars):', firebaseIdToken.substring(0, 50) + '...');
    
    return firebaseIdToken;
  } catch (error: any) {
    console.error('❌ [FIREBASE AUTH] Error en autenticación:', error);
    console.error('❌ [FIREBASE AUTH] Error code:', error.code);
    console.error('❌ [FIREBASE AUTH] Error message:', error.message);
    throw error;
  }
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebaseAuth();
  }
  return auth;
};
