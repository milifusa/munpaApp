import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Función para intercambiar customToken por idToken usando Firebase Auth
const exchangeCustomTokenForIdToken = async (customToken: string): Promise<string> => {
  try {
    console.log('🔄 Intercambiando customToken por idToken...');
    
    // Para esto necesitaríamos Firebase Auth SDK en el cliente
    // Por ahora, vamos a usar el customToken directamente
    // y modificar el backend para aceptarlo
    
    console.log('⚠️ Usando customToken directamente (backend debe ser modificado)');
    return customToken;
  } catch (error) {
    console.error('❌ Error intercambiando token:', error);
    throw error;
  }
};

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    console.log('🔍 [INTERCEPTOR] Iniciando interceptor para:', config.url);
    
    const customToken = await AsyncStorage.getItem('authToken');
    console.log('🔑 [INTERCEPTOR] Token encontrado en AsyncStorage:', customToken ? 'Sí' : 'No');
    
    if (customToken) {
      try {
        // Para endpoints que requieren autenticación, usar el customToken directamente
        // ya que el backend está configurado para aceptar customTokens
        config.headers.Authorization = `Bearer ${customToken}`;

      } catch (error) {
        console.error('❌ [INTERCEPTOR] Error configurando token:', error);
      }
    } else {
      console.log('⚠️ [INTERCEPTOR] No hay token disponible');
    }

    
    return config;
  },
  (error) => {
    console.error('❌ [INTERCEPTOR] Request Error:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de respuesta
api.interceptors.response.use(
  (response) => {

    return response;
  },
  async (error) => {
    // Log detallado del error
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      data: error.response?.data,
      message: error.message,
    });
    
    if (error.response?.status === 401) {
      // Token de acceso requerido - limpiar almacenamiento
      console.log('🔐 Token de acceso requerido, limpiando almacenamiento...');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } else if (error.response?.status === 403) {
      // Token inválido o expirado - pero no limpiar automáticamente
      // ya que puede ser un problema del backend
      console.log('🔐 Token inválido o expirado (posible problema del backend)');
      console.log('⚠️ No se limpia automáticamente el token para permitir debugging');
    }
    return Promise.reject(error);
  }
);

// Tipos de datos
export interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  gender?: 'M' | 'F';
  childrenCount?: number;
  isPregnant?: boolean;
  gestationWeeks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  displayName?: string; // Cambiado de 'name' a 'displayName'
  gender?: 'M' | 'F';
  childrenCount?: number;
  isPregnant?: boolean;
}

export interface UpdateProfileData {
  displayName?: string;
  email?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

// Servicios de autenticación
export const authService = {
  // Registro
  signup: async (data: SignupData) => {
    console.log('📝 Iniciando registro con datos:', data);
    console.log('📊 Datos específicos:', {
      email: data.email,
      displayName: data.displayName,
      gender: data.gender,
      childrenCount: data.childrenCount,
      isPregnant: data.isPregnant
    });
    try {
      const response = await api.post('/api/auth/signup', data);
      console.log('✅ Registro exitoso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  },

  // Login
  login: async (data: LoginData) => {
    console.log('🔑 Iniciando login con email:', data.email);
    try {
      const response = await api.post('/api/auth/login', data);
      console.log('✅ Login exitoso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },

  // Obtener perfil
  getProfile: async () => {
    console.log('👤 Obteniendo perfil del usuario...');
    try {
      const response = await api.get('/api/auth/profile');
      console.log('✅ Perfil obtenido:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      throw error;
    }
  },

  // Actualizar perfil
  updateProfile: async (data: UpdateProfileData) => {
    console.log('✏️ Actualizando perfil del usuario...');
    console.log('📤 Datos enviados al backend:', data);
    try {
      const response = await api.put('/api/auth/profile', data);
      console.log('✅ Perfil actualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  },

  // Cambiar contraseña
  changePassword: async (data: ChangePasswordData) => {
    console.log('🔒 Cambiando contraseña...');
    try {
      const response = await api.put('/api/auth/change-password', data);
      console.log('✅ Contraseña cambiada exitosamente');
      return response.data;
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  },

  // Eliminar cuenta
  deleteAccount: async () => {
    console.log('🗑️ Eliminando cuenta...');
    try {
      const response = await api.delete('/api/auth/account');
      console.log('✅ Cuenta eliminada exitosamente');
      return response.data;
    } catch (error) {
      console.error('❌ Error eliminando cuenta:', error);
      throw error;
    }
  },

  // Verificar token
  verifyToken: async () => {
    console.log('🔍 Verificando token...');
    try {
      const response = await api.get('/api/auth/verify-token');
      console.log('✅ Token válido');
      return response.data;
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      throw error;
    }
  },

  // Renovar token (obtener un nuevo customToken)
  refreshToken: async () => {
    console.log('🔄 Renovando token...');
    try {
      // Obtener el email del usuario actual
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        throw new Error('No hay datos de usuario para renovar el token');
      }
      
      const user = JSON.parse(userData);
      
      // Hacer login nuevamente para obtener un nuevo token
      const response = await api.post('/api/auth/login', {
        email: user.email,
        password: '' // Necesitamos la contraseña, pero no la tenemos almacenada
      });
      
      console.log('✅ Token renovado');
      return response.data;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      throw error;
    }
  },

  // Logout (opcional - para futuras implementaciones del backend)
  logout: async () => {
    console.log('🚪 Enviando logout al servidor...');
    try {
      const response = await api.post('/api/auth/logout');
      console.log('✅ Logout enviado al servidor');
      return response.data;
    } catch (error) {
      console.error('❌ Error enviando logout al servidor:', error);
      throw error;
    }
  },

  // Estado del servidor
  healthCheck: async () => {
    console.log('🏥 Verificando estado del servidor...');
    try {
      const response = await api.get('/health');
      console.log('✅ Estado del servidor:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error verificando estado del servidor:', error);
      throw error;
    }
  },

  // Función para solicitar restablecimiento de contraseña
  forgotPassword: async (email: string) => {
    console.log('🔑 [FORGOT-PASSWORD] Solicitando restablecimiento para:', email);
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      console.log('✅ [FORGOT-PASSWORD] Solicitud enviada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [FORGOT-PASSWORD] Error:', error);
      throw error;
    }
  },

  // Función para restablecer contraseña
  resetPassword: async (oobCode: string, newPassword: string) => {
    console.log('🔑 [RESET-PASSWORD] Restableciendo contraseña...');
    try {
      const response = await api.post('/api/auth/reset-password', {
        oobCode,
        newPassword
      });
      console.log('✅ [RESET-PASSWORD] Contraseña restablecida:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [RESET-PASSWORD] Error:', error);
      throw error;
    }
  },

  // Función para extraer oobCode de URL (para React Native)
  extractOobCodeFromUrl: (url: string) => {
    try {
      const urlObj = new URL(url);
      const oobCode = urlObj.searchParams.get('oobCode');
      console.log('🔍 [EXTRACT] oobCode extraído:', oobCode ? 'SÍ' : 'NO');
      return oobCode;
    } catch (error) {
      console.error('❌ [EXTRACT] Error extrayendo oobCode:', error);
      return null;
    }
  },

  // Función para manejar deep link de restablecimiento
  handlePasswordResetLink: async (url: string) => {
    console.log('🔗 [DEEP-LINK] Procesando URL de restablecimiento:', url);
    
    const oobCode = authService.extractOobCodeFromUrl(url);
    if (!oobCode) {
      throw new Error('Código de restablecimiento no encontrado en la URL');
    }
    
    return oobCode;
  }
};

// Tipos de datos para hijos
export interface Child {
  id: string;
  parentId: string;
  name: string;
  ageInMonths: number;
  isUnborn: boolean;
  gestationWeeks?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChildData {
  name: string;
  ageInMonths: number;
  isUnborn: boolean;
  gestationWeeks?: number;
}

export interface UpdateChildData {
  name?: string;
  ageInMonths?: number;
  isUnborn?: boolean;
  gestationWeeks?: number;
}

// Servicios para gestión de hijos
export const childrenService = {
  // Obtener todos los hijos del usuario
  getChildren: async () => {
    console.log('👶 [CHILDREN] Obteniendo lista de hijos...');
    
    try {
      const response = await api.get('/api/auth/children');
      console.log('✅ [CHILDREN] Hijos obtenidos:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error obteniendo hijos:', error);
      throw error;
    }
  },

  // Agregar un nuevo hijo
  addChild: async (data: CreateChildData) => {
    console.log('👶 [CHILDREN] Agregando hijo:', data);
    
    try {
      const response = await api.post('/api/auth/children', data);
      console.log('✅ [CHILDREN] Hijo agregado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error agregando hijo:', error);
      throw error;
    }
  },

  // Agregar múltiples hijos de una vez
  addMultipleChildren: async (children: CreateChildData[]) => {
    console.log('👶 [CHILDREN] Agregando múltiples hijos:', children);
    
    try {
      const promises = children.map(child => api.post('/api/auth/children', child));
      const responses = await Promise.all(promises);
      console.log('✅ [CHILDREN] Todos los hijos agregados:', responses.map(r => r.data));
      return responses.map(r => r.data);
    } catch (error) {
      console.error('❌ [CHILDREN] Error agregando múltiples hijos:', error);
      throw error;
    }
  },

  // Actualizar un hijo existente
  updateChild: async (childId: string, data: UpdateChildData) => {
    console.log('👶 [CHILDREN] Actualizando hijo:', childId, data);
    
    try {
      const response = await api.put(`/api/auth/children/${childId}`, data);
      console.log('✅ [CHILDREN] Hijo actualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error actualizando hijo:', error);
      throw error;
    }
  },

  // Eliminar un hijo
  deleteChild: async (childId: string) => {
    console.log('👶 [CHILDREN] Eliminando hijo:', childId);
    
    try {
      const response = await api.delete(`/api/auth/children/${childId}`);
      console.log('✅ [CHILDREN] Hijo eliminado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error eliminando hijo:', error);
      throw error;
    }
  }
};

// Funciones de utilidad para el perfil
export const profileService = {
  // Obtener perfil completo
  getProfile: async () => {
    console.log('👤 [PROFILE] Obteniendo perfil...');
    
    try {
      const response = await api.get('/api/auth/profile');
      console.log('✅ [PROFILE] Perfil obtenido:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [PROFILE] Error obteniendo perfil:', error);
      throw error;
    }
  },

  // Actualizar perfil con género, número de hijos, estado de embarazo y semanas de gestación
  updateProfile: async (data: {
    displayName?: string;
    email?: string;
    gender?: 'M' | 'F';
    childrenCount?: number;
    isPregnant?: boolean;
    gestationWeeks?: number;
  }) => {
    console.log('👤 [PROFILE] Actualizando perfil:', data);
    
    try {
      const response = await api.put('/api/auth/profile', data);
      console.log('✅ [PROFILE] Perfil actualizado:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [PROFILE] Error actualizando perfil:', error);
      throw error;
    }
  }
};

export default api;
