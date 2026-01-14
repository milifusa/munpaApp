import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online';

// Función para obtener el timezone del usuario
const getUserTimezone = (): string => {
  try {
    // Intenta obtener el timezone usando Intl API
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'America/Mexico_City'; // Fallback
  } catch (error) {
    console.warn('⚠️ [TIMEZONE] No se pudo detectar, usando fallback');
    return 'America/Mexico_City';
  }
};

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

// Interceptor para agregar token de autenticación y timezone
api.interceptors.request.use(
  async (config) => {
    
    const customToken = await AsyncStorage.getItem('authToken');
    
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

    // Agregar timezone del usuario en el header
    const timezone = getUserTimezone();
    config.headers['X-Timezone'] = timezone;
    
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
  photoURL?: string;
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

  // Login con Google usando idToken (nuevo endpoint que resuelve DEVELOPER_ERROR)
  googleLogin: async (idToken: string) => {
    console.log('🔑 Iniciando login con Google con idToken...');
    console.log('🔑 idToken (primeros 50 chars):', idToken.substring(0, 50) + '...');
    try {
      const response = await api.post('/api/auth/google', { idToken });
      console.log('✅ Login con Google exitoso:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error.response?.data || error.message);
      throw error;
    }
  },

  // Login con Google (endpoint simplificado) - DEPRECATED, usar googleLogin
  googleLoginSimple: async (data: { email: string; displayName: string; photoURL?: string; googleId: string }) => {
    console.log('🔑 Iniciando login con Google (simplificado)...');
    console.log('📤 Datos a enviar:', data);
    try {
      const response = await api.post('/api/auth/google-login-simple', data);
      console.log('✅ Login con Google exitoso:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error.response?.data || error.message);
      throw error;
    }
  },

  // Login con Apple
  appleLogin: async (data: { identityToken: string; email?: string; fullName?: { givenName?: string; familyName?: string }; user: string }) => {
    console.log('🍎 Iniciando login con Apple...');
    console.log('📤 Datos a enviar:', {
      identityToken: data.identityToken ? 'Presente' : 'Ausente',
      email: data.email || 'No proporcionado',
      fullName: data.fullName,
      user: data.user
    });
    try {
      const response = await api.post('/api/auth/apple-login', data);
      console.log('✅ Login con Apple exitoso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en login con Apple:', error);
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

  // Actualizar foto de perfil (usando el endpoint de actualización de perfil)
  updateProfilePhoto: async (photoURL: string) => {
    console.log('📸 Actualizando foto de perfil...');
    console.log('📤 photoURL:', photoURL);
    try {
      const response = await api.put('/api/auth/profile', { photoURL });
      console.log('✅ Foto de perfil actualizada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando foto de perfil:', error);
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
    try {
      const response = await api.get('/api/auth/verify-token');
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
    console.log('🔑 [API SERVICE] === INICIANDO FORGOT PASSWORD ===');
    console.log('📧 [API SERVICE] Email:', email);
    console.log('🌐 [API SERVICE] Endpoint: POST /api/auth/forgot-password');
    console.log('📦 [API SERVICE] Payload:', JSON.stringify({ email }, null, 2));
    
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      
      console.log('✅ [API SERVICE] === RESPUESTA EXITOSA DE LA API ===');
      console.log('✅ [API SERVICE] Status:', response.status);
      console.log('✅ [API SERVICE] Status Text:', response.statusText);
      console.log('✅ [API SERVICE] Headers:', JSON.stringify(response.headers, null, 2));
      console.log('✅ [API SERVICE] Data completa:', JSON.stringify(response.data, null, 2));
      console.log('✅ [API SERVICE] Tipo de data:', typeof response.data);
      console.log('✅ [API SERVICE] Propiedades de data:', Object.keys(response.data || {}));
      
      if (response.data) {
        console.log('✅ [API SERVICE] Success:', response.data.success);
        console.log('✅ [API SERVICE] Message:', response.data.message);
        console.log('✅ [API SERVICE] Data:', response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [API SERVICE] === ERROR EN LA API ===');
      console.error('❌ [API SERVICE] Tipo de error:', typeof error);
      console.error('❌ [API SERVICE] Error name:', error.name);
      console.error('❌ [API SERVICE] Error message:', error.message);
      console.error('❌ [API SERVICE] Error completo:', error);
      
      if (error.response) {
        console.error('❌ [API SERVICE] Response Status:', error.response.status);
        console.error('❌ [API SERVICE] Response Status Text:', error.response.statusText);
        console.error('❌ [API SERVICE] Response Headers:', JSON.stringify(error.response.headers, null, 2));
        console.error('❌ [API SERVICE] Response Data:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.error('❌ [API SERVICE] Request enviado pero sin respuesta');
        console.error('❌ [API SERVICE] Request:', error.request);
      } else {
        console.error('❌ [API SERVICE] Error al configurar el request:', error.message);
      }
      
      if (error.config) {
        console.error('❌ [API SERVICE] Config URL:', error.config.url);
        console.error('❌ [API SERVICE] Config Method:', error.config.method);
        console.error('❌ [API SERVICE] Config Data:', error.config.data);
      }
      
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
  // Nuevo sistema de fechas
  birthDate?: string; // Formato YYYY-MM-DD para hijos nacidos
  dueDate?: string; // Formato YYYY-MM-DD para bebés no nacidos
  // Sistema antiguo (compatible)
  ageInMonths?: number;
  isUnborn: boolean;
  gestationWeeks?: number;
}

export interface UpdateChildData {
  name?: string;
  // Nuevo sistema de fechas
  birthDate?: string; // Formato YYYY-MM-DD
  dueDate?: string; // Formato YYYY-MM-DD
  // Sistema antiguo (compatible)
  ageInMonths?: number;
  isUnborn?: boolean;
  gestationWeeks?: number;
}

// Servicios para gestión de hijos
export const childrenService = {
  // Obtener todos los hijos del usuario
  getChildren: async () => {
    
    try {
      const response = await api.get('/api/auth/children');
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
  },

  // Obtener información de desarrollo del niño
  getChildDevelopmentInfo: async (name: string, ageInMonths: number, isUnborn: boolean = false, gestationWeeks: number | null = null) => {
    try {
      console.log('👶 [DEVELOPMENT] Obteniendo información de desarrollo para:', name);
      
      const response = await api.post('/api/children/development-info', {
        name,
        ageInMonths,
        isUnborn,
        gestationWeeks
      });
      
      console.log('✅ [DEVELOPMENT] Información obtenida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [DEVELOPMENT] Error obteniendo información:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener tips/consejos de DOULI
  getDouliTips: async (tipType: string = 'general') => {
    try {
      
      const response = await api.post('/api/children/tips', {
        tipType
      });
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [DOULI] Error obteniendo tips:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Funciones de utilidad para el perfil
export const profileService = {
  // Obtener perfil completo
  getProfile: async () => {
    
    try {
      const response = await api.get('/api/auth/profile');
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
    
    try {
      const response = await api.put('/api/auth/profile', data);
      return response.data;
    } catch (error) {
      console.error('❌ [PROFILE] Error actualizando perfil:', error);
      throw error;
    }
  }
};

// Servicio de comunidades
export const communitiesService = {
  // Crear nueva comunidad
  createCommunity: async (data: {
    name: string;
    keywords: string;
    description: string;
    isPrivate: boolean;
    image: string | null;
  }) => {
    
    try {
      let response;
      
      // Enviar como JSON con o sin URL de imagen
      console.log('📝 [COMMUNITIES] Enviando como JSON:', {
        name: data.name,
        keywords: data.keywords,
        description: data.description,
        isPrivate: data.isPrivate,
        isPublic: !data.isPrivate,
        imageUrl: data.image,
        imageType: typeof data.image,
        imageLength: data.image?.length
      });
      
      const requestData = {
        name: data.name,
        keywords: data.keywords,
        description: data.description,
        isPublic: !data.isPrivate, // Convertir isPrivate a isPublic (negado)
        imageUrl: data.image // Cambiar a imageUrl para que coincida con el backend
      };
      
      console.log('📤 [COMMUNITIES] Datos exactos enviados al backend:', JSON.stringify(requestData, null, 2));
      
      response = await api.post('/api/communities', requestData);
      
      if (response) {
        console.log('✅ [COMMUNITIES] Comunidad creada:', response.data);
        return response.data;
      } else {
        throw new Error('No se pudo crear la comunidad');
      }
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error creando comunidad:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener todas las comunidades públicas
  getPublicCommunities: async () => {
    
    try {
      const response = await api.get('/api/communities');
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo comunidades públicas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener comunidades del usuario
  getUserCommunities: async () => {
    
    try {
      const response = await api.get('/api/user/communities');
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo comunidades del usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Unirse a una comunidad
  joinCommunity: async (communityId: string) => {
    
    try {
      const response = await api.post(`/api/communities/${communityId}/join`);
      console.log('✅ [COMMUNITIES] Unido a comunidad:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error uniéndose a comunidad:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener solicitudes pendientes de una comunidad (solo para dueños)
  getJoinRequests: async (communityId: string) => {
    console.log('👀 [COMMUNITIES] Obteniendo solicitudes pendientes para comunidad:', communityId);
    
    try {
      const response = await api.get(`/api/communities/${communityId}/join-requests`);
      console.log('✅ [COMMUNITIES] Solicitudes obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo solicitudes:', error.response?.data || error.message);
      throw error;
    }
  },

  // Aprobar o rechazar solicitud de unión (solo para dueños)
  updateJoinRequest: async (communityId: string, requestId: string, action: 'approve' | 'reject') => {
    console.log(`🔄 [COMMUNITIES] ${action === 'approve' ? 'Aprobando' : 'Rechazando'} solicitud:`, requestId);
    
    try {
      const response = await api.put(`/api/communities/${communityId}/join-requests/${requestId}`, {
        action: action
      });
      console.log(`✅ [COMMUNITIES] Solicitud ${action === 'approve' ? 'aprobada' : 'rechazada'}:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [COMMUNITIES] Error ${action === 'approve' ? 'aprobando' : 'rechazando'} solicitud:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener posts de una comunidad
  getCommunityPosts: async (communityId: string) => {
    console.log('📝 [COMMUNITIES] Obteniendo posts de comunidad:', communityId);
    
    try {
      const response = await api.get(`/api/communities/${communityId}/posts`);
      console.log('✅ [COMMUNITIES] Posts obtenidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo posts:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear un nuevo post en una comunidad
  createCommunityPost: async (communityId: string, postData: {
    title?: string;
    content: string;
    imageUrl?: string;
    tags?: string[];
    attachedLists?: string[]; // Array de IDs de listas
  }) => {
    console.log('📝 [COMMUNITIES] Creando nuevo post en comunidad:', communityId);
    console.log('📝 [COMMUNITIES] Datos del post:', postData);
    
    // Limpiar objeto removiendo propiedades undefined
    const cleanPostData = Object.entries(postData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    console.log('📝 [COMMUNITIES] Datos limpios del post:', cleanPostData);
    console.log('📝 [COMMUNITIES] Campos finales:', Object.keys(cleanPostData));
    
    try {
      const response = await api.post(`/api/communities/${communityId}/posts`, cleanPostData);
      console.log('✅ [COMMUNITIES] Post creado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error creando post:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear un nuevo post en una comunidad con imageUrl
  createCommunityPostWithImage: async (communityId: string, postData: {
    title?: string;
    content: string;
    tags?: string[];
  }, imageUrl?: string) => {
    console.log('📝 [COMMUNITIES] Creando nuevo post con imageUrl en comunidad:', communityId);
    console.log('📝 [COMMUNITIES] Datos del post:', postData);
    console.log('📝 [COMMUNITIES] imageUrl:', imageUrl || 'NO');
    
    try {
      // Preparar datos del post incluyendo imageUrl
      const postDataWithImage = {
        ...postData,
        ...(imageUrl && { imageUrl })
      };
      
      console.log('📝 [COMMUNITIES] Datos del post con imagen:', postDataWithImage);
      
      // Llamar al endpoint normal (el backend procesará imageUrl)
      const response = await api.post(`/api/communities/${communityId}/posts`, postDataWithImage);
      console.log('✅ [COMMUNITIES] Post con imageUrl creado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error creando post con imageUrl:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Likes para Posts
  likePost: async (postId: string) => {
    console.log('❤️ [LIKES] Dando like al post:', postId);
    
    try {
      const response = await api.post(`/api/posts/${postId}/like`);
      console.log('✅ [LIKES] Like del post procesado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LIKES] Error procesando like del post:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Likes para Comentarios
  likeComment: async (commentId: string) => {
    console.log('❤️ [LIKES] Dando like al comentario:', commentId);
    
    try {
      const response = await api.post(`/api/comments/${commentId}/like`);
      console.log('✅ [LIKES] Like del comentario procesado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LIKES] Error procesando like del comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Comentarios
  // Obtener comentarios de un post
  getPostComments: async (postId: string) => {
    console.log('💬 [COMMENTS] Obteniendo comentarios del post:', postId);
    
    try {
      const response = await api.get(`/api/posts/${postId}/comments`);
      console.log('✅ [COMMENTS] Comentarios obtenidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error obteniendo comentarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear un nuevo comentario en un post
  createComment: async (postId: string, content: string) => {
    console.log('💬 [COMMENTS] Creando comentario en post:', postId);
    console.log('💬 [COMMENTS] Contenido del comentario:', content);
    
    try {
      const response = await api.post(`/api/posts/${postId}/comments`, { content });
      console.log('✅ [COMMENTS] Comentario creado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error creando comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Búsqueda Inteligente de Comunidades
  searchCommunities: async (query: string, limit: number = 20) => {
    console.log('🔍 [SEARCH] Buscando comunidades con query:', query);
    console.log('🔍 [SEARCH] Límite de resultados:', limit);
    
    try {
      // Validar parámetros
      if (!query || query.trim().length === 0) {
        throw new Error('El término de búsqueda es obligatorio');
      }
      
      if (limit > 50) {
        console.warn('⚠️ [SEARCH] Límite excede el máximo, ajustando a 50');
        limit = 50;
      }
      
      const response = await api.get('/api/communities/search', {
        params: {
          query: query.trim(),
          limit: limit
        }
      });
      
      console.log('✅ [SEARCH] Búsqueda completada:', response.data);
      console.log('🔍 [SEARCH] Resultados encontrados:', response.data.data?.results?.length || 0);
      console.log('🔍 [SEARCH] Total encontrados por el backend:', response.data.data?.totalFound || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [SEARCH] Error buscando comunidades:', error.response?.data || error.message);
      throw error;
    }
  },

  // Salir de una comunidad
  leaveCommunity: async (communityId: string) => {
    console.log('🚪 [COMMUNITIES] Saliendo de la comunidad:', communityId);
    
    try {
      const response = await api.post(`/api/communities/${communityId}/leave`);
      console.log('✅ [COMMUNITIES] Salida exitosa de la comunidad:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error saliendo de la comunidad:', error.response?.data || error.message);
      throw error;
    }
  }
};

// Servicio para listas
export const listsService = {
  // Gestión de Listas
  
  // Crear nueva lista
  createList: async (data: {
    title: string;
    description?: string;
    imageUrl?: string;
    isPublic: boolean;
  }) => {
    try {
      const response = await api.post('/api/lists', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error creando lista:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mis listas (privadas y públicas propias)
  getUserLists: async (filters?: { isPublic?: boolean; limit?: number }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await api.get(`/api/user/lists?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo mis listas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener listas públicas
  getPublicLists: async (filters?: { limit?: number; sortBy?: 'stars' | 'recent' }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      
      const response = await api.get(`/api/lists/public?${params.toString()}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo listas públicas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener detalles de una lista específica
  getListDetails: async (listId: string) => {
    try {
      const response = await api.get(`/api/lists/${listId}`);
      console.log('✅ [LISTS] Detalles de lista obtenidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo detalles de lista:', error.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar lista
  updateList: async (listId: string, data: {
    title?: string;
    description?: string;
    isPublic?: boolean;
  }) => {
    try {
      const response = await api.put(`/api/lists/${listId}`, data);
      console.log('✅ [LISTS] Lista actualizada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error actualizando lista:', error.response?.data || error.message);
      throw error;
    }
  },

  // Copiar lista pública
  copyList: async (listId: string) => {
    try {
      const response = await api.post(`/api/lists/${listId}/copy`);
      console.log('✅ [LISTS] Lista copiada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error copiando lista:', error.response?.data || error.message);
      throw error;
    }
  },

  // Gestión de Items

  // Agregar item a lista
  addItem: async (listId: string, data: {
    text: string;
    imageUrl?: string;
    priority?: 'low' | 'medium' | 'high';
    details?: string;
    brand?: string;
    store?: string;
    approximatePrice?: number;
  }) => {
    console.log('📝 [LISTS] Agregando item a lista:', listId, data);
    try {
      const response = await api.post(`/api/lists/${listId}/items`, data);
      console.log('✅ [LISTS] Item agregado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error agregando item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Marcar/desmarcar item como completado
  toggleItem: async (listId: string, itemId: string) => {
    console.log('✅ [LISTS] Alternando estado del item:', listId, itemId);
    try {
      const response = await api.put(`/api/lists/${listId}/items/${itemId}/toggle`);
      console.log('✅ [LISTS] Estado del item alternado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error alternando estado del item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar item
  deleteItem: async (listId: string, itemId: string) => {
    console.log('🗑️ [LISTS] Eliminando item:', listId, itemId);
    try {
      const response = await api.delete(`/api/lists/${listId}/items/${itemId}`);
      console.log('✅ [LISTS] Item eliminado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error eliminando item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Estrellas

  // Dar/quitar estrella a lista
  toggleStar: async (listId: string) => {
    console.log('⭐ [LISTS] Alternando estrella en lista:', listId);
    try {
      const response = await api.post(`/api/lists/${listId}/star`);
      console.log('✅ [LISTS] Estrella alternada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error alternando estrella:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Comentarios

  // Obtener comentarios de un item
  getItemComments: async (listId: string, itemId: string) => {
    console.log('💬 [LISTS] Obteniendo comentarios del item:', listId, itemId);
    try {
      const response = await api.get(`/api/lists/${listId}/items/${itemId}/comments`);
      console.log('✅ [LISTS] Comentarios obtenidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo comentarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar comentario a un item
  addItemComment: async (listId: string, itemId: string, data: { content: string }) => {
    console.log('💬 [LISTS] Agregando comentario al item:', listId, itemId, data);
    try {
      const response = await api.post(`/api/lists/${listId}/items/${itemId}/comments`, data);
      console.log('✅ [LISTS] Comentario agregado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error agregando comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Calificar un item (1-5 estrellas)
  rateItem: async (listId: string, itemId: string, rating: number) => {
    console.log('⭐ [LISTS] Calificando item:', listId, itemId, 'Rating:', rating);
    try {
      const response = await api.post(`/api/lists/${listId}/items/${itemId}/rate`, { rating });
      console.log('✅ [LISTS] Item calificado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error calificando item:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// CATEGORÍAS DE RECOMENDACIONES
// ============================================

export const categoriesService = {
  // Obtener todas las categorías activas
  getCategories: async () => {
    console.log('📂 [CATEGORIES] Obteniendo todas las categorías');
    try {
      const response = await api.get('/api/categories');
      
      console.log('✅ [CATEGORIES] Categorías obtenidas exitosamente');
      console.log('📦 [CATEGORIES] Total de categorías:', response.data?.data?.length || 0);
      console.log('📦 [CATEGORIES] Datos:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [CATEGORIES] Error obteniendo categorías');
      console.error('❌ [CATEGORIES] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener una categoría específica por ID
  getCategoryById: async (categoryId: string) => {
    console.log('📂 [CATEGORIES] Obteniendo categoría:', categoryId);
    try {
      const response = await api.get(`/api/categories/${categoryId}`);
      
      console.log('✅ [CATEGORIES] Categoría obtenida exitosamente');
      console.log('📦 [CATEGORIES] Datos:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [CATEGORIES] Error obteniendo categoría:', categoryId);
      console.error('❌ [CATEGORIES] Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// RECOMENDACIONES
// ============================================

export const recommendationsService = {
  // Obtener todas las recomendaciones o filtradas por categoría con paginación
  getRecommendations: async (categoryId?: string, page: number = 1, limit: number = 20) => {
    const params = new URLSearchParams();
    if (categoryId) params.append('categoryId', categoryId);
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    const queryParam = params.toString() ? `?${params.toString()}` : '';
    console.log('⭐ [RECOMMENDATIONS] Obteniendo recomendaciones', categoryId ? `para categoría: ${categoryId}` : '', `Página: ${page}, Límite: ${limit}`);
    
    try {
      const response = await api.get(`/api/recommendations${queryParam}`);
      
      console.log('✅ [RECOMMENDATIONS] Recomendaciones obtenidas exitosamente');
      console.log('📦 [RECOMMENDATIONS] Total en esta página:', response.data?.data?.length || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones por categoría (alias más específico) con paginación
  getRecommendationsByCategory: async (categoryId: string, page: number = 1, limit: number = 20) => {
    console.log('⭐ [RECOMMENDATIONS] Obteniendo recomendaciones por categoría:', categoryId, `Página: ${page}, Límite: ${limit}`);
    return recommendationsService.getRecommendations(categoryId, page, limit);
  },

  // Obtener una recomendación específica por ID
  getRecommendationById: async (recommendationId: string) => {
    console.log('⭐ [RECOMMENDATIONS] Obteniendo recomendación:', recommendationId);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}`);
      
      console.log('✅ [RECOMMENDATIONS] Recomendación obtenida exitosamente');
      console.log('📦 [RECOMMENDATIONS] Datos:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendación:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener reviews de una recomendación
  getRecommendationReviews: async (recommendationId: string, page: number = 1, limit: number = 20) => {
    console.log('⭐ [RECOMMENDATIONS] Obteniendo reviews:', recommendationId, `Página: ${page}`);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/reviews`, {
        params: { page, limit }
      });
      
      console.log('✅ [RECOMMENDATIONS] Reviews obtenidas exitosamente');
      console.log('📦 [RECOMMENDATIONS] Total reviews:', response.data?.stats?.totalReviews || 0);
      console.log('📦 [RECOMMENDATIONS] Rating promedio:', response.data?.stats?.averageRating || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo reviews:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mi review para una recomendación
  getMyReview: async (recommendationId: string) => {
    console.log('⭐ [RECOMMENDATIONS] Obteniendo mi review:', recommendationId);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/reviews/my-review`);
      
      console.log('✅ [RECOMMENDATIONS] Mi review obtenida');
      console.log('📦 [RECOMMENDATIONS] Datos:', response.data?.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo mi review:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear o actualizar review (MEJORADO con fotos y contexto)
  createOrUpdateReview: async (
    recommendationId: string, 
    rating: number, 
    comment?: string,
    photos?: string[],
    childAge?: string,
    visitedWith?: 'Solo' | 'Pareja' | 'Familia' | 'Amigos'
  ) => {
    console.log('⭐ [RECOMMENDATIONS] Creando/actualizando review:', recommendationId, `Rating: ${rating}`);
    
    try {
      const reviewData: any = {
        rating,
        comment: comment || ''
      };

      // Agregar campos opcionales solo si están presentes
      if (photos && photos.length > 0) reviewData.photos = photos;
      if (childAge) reviewData.childAge = childAge;
      if (visitedWith) reviewData.visitedWith = visitedWith;

      console.log('📦 [RECOMMENDATIONS] Review data:', reviewData);

      const response = await api.post(`/api/recommendations/${recommendationId}/reviews`, reviewData);
      
      console.log('✅ [RECOMMENDATIONS] Review guardada exitosamente');
      console.log('📦 [RECOMMENDATIONS] Datos:', response.data);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error guardando review:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Subir foto individual de review
  uploadReviewPhoto: async (recommendationId: string, photoFile: any) => {
    console.log('📸 [RECOMMENDATIONS] Subiendo foto de review:', recommendationId);
    
    try {
      const formData = new FormData();
      formData.append('photo', {
        uri: photoFile.uri,
        type: photoFile.type || 'image/jpeg',
        name: photoFile.fileName || 'photo.jpg',
      } as any);

      const response = await api.post(
        `/api/recommendations/${recommendationId}/reviews/upload-photo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('✅ [RECOMMENDATIONS] Foto subida:', response.data.data.photoUrl);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error subiendo foto:', error.response?.data || error.message);
      throw error;
    }
  },

  // Subir múltiples fotos de review (máx 5)
  uploadReviewPhotos: async (recommendationId: string, photoFiles: any[]) => {
    console.log('📸 [RECOMMENDATIONS] Subiendo', photoFiles.length, 'fotos de review:', recommendationId);
    
    try {
      const formData = new FormData();
      
      photoFiles.forEach((file, index) => {
        formData.append('photos', {
          uri: file.uri,
          type: file.type || 'image/jpeg',
          name: file.fileName || `photo${index}.jpg`,
        } as any);
      });

      const response = await api.post(
        `/api/recommendations/${recommendationId}/reviews/upload-photos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      console.log('✅ [RECOMMENDATIONS] Fotos subidas:', response.data.data.photoUrls.length);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error subiendo fotos:', error.response?.data || error.message);
      throw error;
    }
  },

  // Toggle "útil" en una review
  toggleReviewHelpful: async (recommendationId: string, reviewId: string) => {
    console.log('👍 [RECOMMENDATIONS] Toggle útil en review:', reviewId);
    
    try {
      const response = await api.post(
        `/api/recommendations/${recommendationId}/reviews/${reviewId}/helpful`
      );
      
      console.log('✅ [RECOMMENDATIONS] Toggle útil exitoso:', response.data.isHelpful);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error toggle útil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Verificar si marqué como útil
  checkReviewHelpful: async (recommendationId: string, reviewId: string) => {
    try {
      const response = await api.get(
        `/api/recommendations/${recommendationId}/reviews/${reviewId}/helpful`
      );
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error verificando útil:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar mi review
  deleteMyReview: async (recommendationId: string) => {
    console.log('🗑️ [RECOMMENDATIONS] Eliminando mi review:', recommendationId);
    
    try {
      const response = await api.delete(`/api/recommendations/${recommendationId}/reviews/my-review`);
      
      console.log('✅ [RECOMMENDATIONS] Review eliminada exitosamente');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error eliminando review:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mis favoritos
  getFavorites: async () => {
    console.log('❤️ [RECOMMENDATIONS] Obteniendo favoritos');
    
    try {
      const response = await api.get('/api/recommendations/favorites');
      
      console.log('✅ [RECOMMENDATIONS] Favoritos obtenidos exitosamente');
      console.log('📦 [RECOMMENDATIONS] Total favoritos:', response.data?.data?.length || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo favoritos');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Verificar si es favorito
  isFavorite: async (recommendationId: string) => {
    console.log('❤️ [RECOMMENDATIONS] Verificando favorito:', recommendationId);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/favorite`);
      
      console.log('✅ [RECOMMENDATIONS] Estado de favorito:', response.data?.isFavorite);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error verificando favorito:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Toggle favorito (agregar/quitar)
  toggleFavorite: async (recommendationId: string) => {
    console.log('❤️ [RECOMMENDATIONS] Toggle favorito:', recommendationId);
    
    try {
      const response = await api.post(`/api/recommendations/${recommendationId}/favorite`);
      
      console.log('✅ [RECOMMENDATIONS] Favorito actualizado:', response.data?.isFavorite);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error con favorito:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones recientes
  getRecentRecommendations: async (limit: number = 10) => {
    console.log('🆕 [RECOMMENDATIONS] Obteniendo recomendaciones recientes, límite:', limit);
    
    try {
      const response = await api.get('/api/recommendations/recent', {
        params: { limit }
      });
      
      console.log('✅ [RECOMMENDATIONS] Recomendaciones recientes obtenidas exitosamente');
      console.log('📦 [RECOMMENDATIONS] Total recientes:', response.data?.data?.length || 0);
      console.log('📦 [RECOMMENDATIONS] Datos:', JSON.stringify(response.data, null, 2));
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones recientes');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // ============================================
  // NUEVAS FUNCIONES - FEATURES AVANZADAS
  // ============================================

  // Obtener recomendaciones cercanas (geolocalización)
  getNearbyRecommendations: async (
    latitude: number, 
    longitude: number, 
    radius: number = 10, 
    categoryId?: string
  ) => {
    console.log('📍 [RECOMMENDATIONS] Obteniendo recomendaciones cercanas');
    console.log(`📍 Ubicación: ${latitude}, ${longitude}, Radio: ${radius}km`);
    
    try {
      const response = await api.get('/api/recommendations/nearby', {
        params: { latitude, longitude, radius, categoryId }
      });
      
      console.log('✅ [RECOMMENDATIONS] Recomendaciones cercanas obtenidas');
      console.log('📦 [RECOMMENDATIONS] Total cercanas:', response.data?.data?.length || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones cercanas');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar a lista de deseos
  addToWishlist: async (recommendationId: string, notes?: string, priority?: string) => {
    console.log('💝 [RECOMMENDATIONS] Agregando a lista de deseos:', recommendationId);
    
    try {
      const response = await api.post('/api/recommendations/wishlist', {
        recommendationId,
        notes,
        priority
      });
      
      console.log('✅ [RECOMMENDATIONS] Agregado a lista de deseos');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error agregando a wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mi lista de deseos
  getWishlist: async (priority?: string) => {
    console.log('💝 [RECOMMENDATIONS] Obteniendo lista de deseos');
    
    try {
      const response = await api.get('/api/recommendations/wishlist', {
        params: { priority }
      });
      
      console.log('✅ [RECOMMENDATIONS] Lista de deseos obtenida');
      console.log('📦 [RECOMMENDATIONS] Total en wishlist:', response.data?.data?.length || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Quitar de lista de deseos
  removeFromWishlist: async (wishlistId: string) => {
    console.log('💔 [RECOMMENDATIONS] Quitando de lista de deseos:', wishlistId);
    
    try {
      const response = await api.delete(`/api/recommendations/wishlist/${wishlistId}`);
      
      console.log('✅ [RECOMMENDATIONS] Quitado de lista de deseos');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error quitando de wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Verificar si está en wishlist
  isInWishlist: async (recommendationId: string) => {
    console.log('💝 [RECOMMENDATIONS] Verificando si está en wishlist:', recommendationId);
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/wishlist`);
      
      console.log('✅ [RECOMMENDATIONS] Estado wishlist:', response.data?.data?.inWishlist);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error verificando wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Registrar visita a una recomendación
  registerVisit: async (recommendationId: string, childId?: string, visitDate?: Date) => {
    console.log('👣 [RECOMMENDATIONS] Registrando visita:', recommendationId);
    
    try {
      const response = await api.post(`/api/recommendations/${recommendationId}/visits`, {
        childId,
        visitDate: visitDate || new Date()
      });
      
      console.log('✅ [RECOMMENDATIONS] Visita registrada');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error registrando visita');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones de una comunidad
  getCommunityRecommendations: async (communityId: string, categoryId?: string, limit: number = 20) => {
    console.log('👥 [RECOMMENDATIONS] Obteniendo recomendaciones de comunidad:', communityId);
    
    try {
      const response = await api.get(`/api/communities/${communityId}/recommendations`, {
        params: { categoryId, limit }
      });
      
      console.log('✅ [RECOMMENDATIONS] Recomendaciones de comunidad obtenidas');
      console.log('📦 [RECOMMENDATIONS] Total:', response.data?.data?.length || 0);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones de comunidad');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Comparar recomendaciones
  compareRecommendations: async (recommendationIds: string[]) => {
    console.log('⚖️ [RECOMMENDATIONS] Comparando recomendaciones:', recommendationIds);
    
    try {
      const response = await api.get('/api/recommendations/compare', {
        params: { ids: recommendationIds.join(',') }
      });
      
      console.log('✅ [RECOMMENDATIONS] Comparación obtenida');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error comparando recomendaciones');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones personalizadas según perfil del bebé
  getPersonalizedRecommendations: async (childId?: string) => {
    console.log('🎯 [RECOMMENDATIONS] Obteniendo recomendaciones personalizadas');
    
    try {
      const response = await api.get('/api/recommendations/personalized', {
        params: { childId }
      });
      
      console.log('✅ [RECOMMENDATIONS] Recomendaciones personalizadas obtenidas');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones personalizadas');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Servicio de administración
export const adminService = {
  // Fijar o desfijar un post
  pinPost: async (postId: string, isPinned: boolean) => {
    console.log(`📌 [ADMIN] ${isPinned ? 'Fijando' : 'Desfijando'} post:`, postId);
    
    try {
      const response = await api.patch(`/api/admin/posts/${postId}/pin`, {
        isPinned
      });
      
      console.log(`✅ [ADMIN] Post ${isPinned ? 'fijado' : 'desfijado'} exitosamente`);
      return response.data;
    } catch (error: any) {
      console.error(`❌ [ADMIN] Error ${isPinned ? 'fijando' : 'desfijando'} post:`, error.response?.data || error.message);
      throw error;
    }
  },
};

// ==========================================
// 🛌 SLEEP TRACKING & AI PREDICTION SERVICE
// ==========================================
export const sleepService = {
  // Registrar evento de sueño (iniciar tracking)
  recordSleep: async (data: {
    childId: string;
    type: 'nap' | 'nightsleep';
    startTime: string;
    endTime?: string;
    duration?: number;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
    wakeUps?: number;
    location?: 'crib' | 'stroller' | 'car' | 'carrier';
    temperature?: number;
    noiseLevel?: number;
    notes?: string;
  }) => {
    
    try {
      const response = await api.post('/api/sleep/record', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error registrando evento:', error.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar evento de sueño (terminar tracking)
  updateSleepEvent: async (eventId: string, data: {
    endTime?: string;
    duration?: number;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
    wakeUps?: number;
    location?: 'crib' | 'stroller' | 'car' | 'carrier';
    temperature?: number;
    noiseLevel?: number;
    notes?: string;
    pauses?: Array<{
      id?: string;
      duration: number;
      reason?: string;
      startTime?: string;
      endTime?: string;
    }>;
  }) => {
    console.log('📝 [SLEEP] Actualizando evento:', eventId, data);
    
    try {
      const response = await api.put(`/api/sleep/${eventId}`, data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error actualizando evento:', error.response?.data || error.message);
      throw error;
    }
  },

  // Editar solo horarios (inicio/fin)
  updateSleepTimes: async (eventId: string, data: {
    startTime?: string;
    endTime?: string | null; // Permitir null para indicar que se debe eliminar
  }) => {
    console.log('⏰ [SLEEP] Actualizando horarios:', eventId, data);
    
    // Si endTime es undefined, no lo incluimos en el payload
    // Si endTime es null, lo enviamos para indicar que se debe eliminar
    const payload: any = {};
    if (data.startTime !== undefined) {
      payload.startTime = data.startTime;
    }
    if (data.endTime !== undefined) {
      payload.endTime = data.endTime; // Puede ser string o null
    }
    
    console.log('📤 [SLEEP] Payload a enviar:', payload);
    
    try {
      const response = await api.patch(`/api/sleep/${eventId}/times`, payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error actualizando horarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar pausa/interrupción
  addSleepPause: async (eventId: string, data: {
    duration?: number;
    startTime?: string;
    endTime?: string;
    reason?: string;
  }) => {
    console.log('⏸️ [SLEEP] Agregando pausa:', eventId, data);
    
    try {
      const response = await api.post(`/api/sleep/${eventId}/pause`, data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error agregando pausa:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar pausa
  removeSleepPause: async (eventId: string, pauseId: string) => {
    console.log('🗑️ [SLEEP] Eliminando pausa:', eventId, pauseId);
    
    try {
      const response = await api.delete(`/api/sleep/${eventId}/pause/${pauseId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error eliminando pausa:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener historial de sueño
  getSleepHistory: async (childId: string, days: number = 7) => {
    console.log(`📋 [SLEEP] Obteniendo historial de sueño (${days} días):`, childId);
    
    try {
      const response = await api.get(`/api/sleep/history/${childId}`, {
        params: { days }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error obteniendo historial:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener predicción con IA
  getSleepPrediction: async (childId: string) => {
    try {
      const response = await api.get(`/api/sleep/predict/${childId}`);
      
      // DEBUG: Verificar estructura completa de la respuesta
      
      // Log detallado de allNaps
      if (response.data?.prediction?.dailySchedule?.allNaps) {
        response.data.prediction.dailySchedule.allNaps.forEach((nap: any, index: number) => {
          console.log(`\nSiesta ${index + 1}:`);
          console.log(`  - Tipo: ${nap.type || 'N/A'}`);
          console.log(`  - Hora: ${nap.time || nap.startTime || 'N/A'}`);
          console.log(`  - Duración esperada: ${nap.expectedDuration || nap.duration || 'N/A'} min`);
          console.log(`  - Estado: ${nap.status || 'N/A'}`);
          console.log(`  - Source: ${nap.source || 'N/A'}`);
          console.log(`  - Confidence: ${nap.confidence || 'N/A'}%`);
          console.log(`  - Completada: ${nap.completed ? 'Sí' : 'No'}`);
          if (nap.actualDuration) {
            console.log(`  - Duración real: ${nap.actualDuration} min`);
          }
          if (nap.startTime && nap.endTime) {
            console.log(`  - Inicio real: ${nap.startTime}`);
            console.log(`  - Fin real: ${nap.endTime}`);
          }
        });
      } 
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP AI] Error obteniendo predicción:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener análisis detallado de patrones
  getSleepAnalysis: async (childId: string, days: number = 30) => {
    console.log(`📊 [SLEEP] Obteniendo análisis (${days} días):`, childId);
    
    try {
      const response = await api.get(`/api/sleep/analysis/${childId}`, {
        params: { days }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error obteniendo análisis:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener estadísticas semanales/mensuales
  getSleepStats: async (childId: string, period: 'week' | 'month' = 'week') => {
    console.log(`📈 [SLEEP] Obteniendo estadísticas (${period}):`, childId);
    
    try {
      const response = await api.get(`/api/sleep/stats/${childId}`, {
        params: { period }
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error obteniendo estadísticas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recordatorios inteligentes
  getSleepReminders: async (childId: string) => {
    try {
      const response = await api.get(`/api/sleep/reminders/${childId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error obteniendo recordatorios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar evento de sueño
  deleteSleepEvent: async (eventId: string) => {
    console.log('🗑️ [SLEEP] Eliminando evento:', eventId);
    
    try {
      const response = await api.delete(`/api/sleep/${eventId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error eliminando evento:', error.response?.data || error.message);
      throw error;
    }
  },

  // Registrar hora de despertar
  recordWakeTime: async (data: {
    childId: string;
    wakeTime: string; // ISO timestamp
  }) => {
    
    try {
      const response = await api.post('/api/sleep/wake-time', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error registrando hora de despertar:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener hora de despertar (registrada hoy o predicha)
  getWakeTime: async (childId: string) => {
    
    try {
      const response = await api.get(`/api/sleep/wake-time/${childId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SLEEP] Error obteniendo hora de despertar:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============= ACTIVIDADES PARA BEBÉS 🎨 =============
export const activitiesService = {
  // Obtener sugerencias de actividades según edad y estado del bebé
  getActivitySuggestions: async (childId: string) => {
    
    try {
      const response = await api.get(`/api/activities/suggestions/${childId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ACTIVITIES] Error obteniendo sugerencias:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Export de la instancia de axios para uso en otros servicios
export { api as axiosInstance };

// Export default con todos los servicios agrupados
export default {
  ...authService,
  ...childrenService,
  ...profileService,
  ...communitiesService,
  ...listsService,
  ...categoriesService,
  ...recommendationsService,
  ...adminService,
  ...sleepService,
  ...activitiesService,
};
