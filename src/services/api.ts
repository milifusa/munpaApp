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
    
    // Para esto necesitaríamos Firebase Auth SDK en el cliente
    // Por ahora, vamos a usar el customToken directamente
    // y modificar el backend para aceptarlo
    
    return customToken;
  } catch (error) {
    console.error('❌ Error intercambiando token:', error);
    throw error;
  }
};

// Interceptor para agregar token de autenticación, timezone y device info
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
    }

    // Agregar timezone del usuario en el header
    const timezone = getUserTimezone();
    config.headers['X-Timezone'] = timezone;
    
    // Agregar device info headers (lazy loading para no bloquear)
    try {
      const deviceInfoService = (await import('./deviceInfoService')).default;
      const deviceHeaders = await deviceInfoService.getHeaders();
      Object.assign(config.headers, deviceHeaders);
    } catch (error) {
      console.warn('⚠️ [INTERCEPTOR] No se pudieron agregar headers de dispositivo:', error);
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
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    } else if (error.response?.status === 403) {
      // Token inválido o expirado - pero no limpiar automáticamente
      // ya que puede ser un problema del backend
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
  countryId?: string;
  cityId?: string;
  countryName?: string;
  cityName?: string;
  professionalProfile?: {
    isActive: boolean;
    specialistId: string;
    accountType: 'specialist' | 'nutritionist' | 'coach' | 'psychologist' | 'service';
    verifiedAt: string;
  } | null;
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
    try {
      const response = await api.post('/api/auth/signup', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en registro:', error);
      throw error;
    }
  },

  // Login
  login: async (data: LoginData) => {
    try {
      const response = await api.post('/api/auth/login', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    }
  },

  // Login con Google usando idToken (nuevo endpoint que resuelve DEVELOPER_ERROR)
  googleLogin: async (idToken: string) => {
    try {
      const response = await api.post('/api/auth/google', { idToken });
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error.response?.data || error.message);
      throw error;
    }
  },

  // Login con Google (endpoint simplificado) - DEPRECATED, usar googleLogin
  googleLoginSimple: async (data: { email: string; displayName: string; photoURL?: string; googleId: string }) => {
    try {
      const response = await api.post('/api/auth/google-login-simple', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error en login con Google:', error.response?.data || error.message);
      throw error;
    }
  },

  // Login con Apple
  appleLogin: async (data: { identityToken: string; email?: string; fullName?: { givenName?: string; familyName?: string }; user: string }) => {
    try {
      const response = await api.post('/api/auth/apple-login', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en login con Apple:', error);
      throw error;
    }
  },

  // Obtener perfil
  getProfile: async () => {
    try {
      const response = await api.get('/api/auth/profile');
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo perfil:', error);
      throw error;
    }
  },

  // Actualizar perfil
  updateProfile: async (data: UpdateProfileData) => {
    try {
      const response = await api.put('/api/auth/profile', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  },

  // Actualizar ubicación del usuario
  updateLocation: async (data: {
    latitude: number;
    longitude: number;
    countryId?: string;
    cityId?: string;
  }) => {
    try {
      const response = await api.put('/api/auth/location', data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [AUTH] Error actualizando ubicación:', error.response?.data || error.message);
      throw error;
    }
  },

  // Actualizar foto de perfil (usando el endpoint de actualización de perfil)
  updateProfilePhoto: async (photoURL: string) => {
    try {
      const response = await api.put('/api/auth/profile', { photoURL });
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando foto de perfil:', error);
      throw error;
    }
  },

  // Cambiar contraseña
  changePassword: async (data: ChangePasswordData) => {
    try {
      const response = await api.put('/api/auth/change-password', data);
      return response.data;
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  },

  // Eliminar cuenta
  deleteAccount: async () => {
    try {
      const response = await api.delete('/api/auth/account');
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
      
      return response.data;
    } catch (error) {
      console.error('❌ Error renovando token:', error);
      throw error;
    }
  },

  // Logout (opcional - para futuras implementaciones del backend)
  logout: async () => {
    try {
      const response = await api.post('/api/auth/logout');
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
      return response.data;
    } catch (error) {
      console.error('❌ Error verificando estado del servidor:', error);
      throw error;
    }
  },

  // Función para solicitar restablecimiento de contraseña
  forgotPassword: async (email: string) => {
    
    try {
      const response = await api.post('/api/auth/forgot-password', { email });
      
      
      if (response.data) {
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
    try {
      const response = await api.post('/api/auth/reset-password', {
        oobCode,
        newPassword
      });
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
      return oobCode;
    } catch (error) {
      console.error('❌ [EXTRACT] Error extrayendo oobCode:', error);
      return null;
    }
  },

  // Función para manejar deep link de restablecimiento
  handlePasswordResetLink: async (url: string) => {
    
    const oobCode = authService.extractOobCodeFromUrl(url);
    if (!oobCode) {
      throw new Error('Código de restablecimiento no encontrado en la URL');
    }
    
    return oobCode;
  }
  ,
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
    
    try {
      const response = await api.post('/api/auth/children', data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error agregando hijo:', error);
      throw error;
    }
  },

  // Agregar múltiples hijos de una vez
  addMultipleChildren: async (children: CreateChildData[]) => {
    
    try {
      const promises = children.map(child => api.post('/api/auth/children', child));
      const responses = await Promise.all(promises);
      return responses.map(r => r.data);
    } catch (error) {
      console.error('❌ [CHILDREN] Error agregando múltiples hijos:', error);
      throw error;
    }
  },

  // Actualizar un hijo existente
  updateChild: async (childId: string, data: UpdateChildData) => {
    
    try {
      const response = await api.put(`/api/auth/children/${childId}`, data);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error actualizando hijo:', error);
      throw error;
    }
  },

  // Eliminar un hijo
  deleteChild: async (childId: string) => {
    
    try {
      const response = await api.delete(`/api/auth/children/${childId}`);
      return response.data;
    } catch (error) {
      console.error('❌ [CHILDREN] Error eliminando hijo:', error);
      throw error;
    }
  },

  // Obtener información de desarrollo del niño
  getChildDevelopmentInfo: async (name: string, ageInMonths: number, isUnborn: boolean = false, gestationWeeks: number | null = null) => {
    try {
      
      const response = await api.post('/api/children/development-info', {
        name,
        ageInMonths,
        isUnborn,
        gestationWeeks
      });
      
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
    countryId?: string;
    cityId?: string;
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
      
      const requestData = {
        name: data.name,
        keywords: data.keywords,
        description: data.description,
        isPublic: !data.isPrivate, // Convertir isPrivate a isPublic (negado)
        imageUrl: data.image // Cambiar a imageUrl para que coincida con el backend
      };
      
      
      response = await api.post('/api/communities', requestData);
      
      if (response) {
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
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error uniéndose a comunidad:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener solicitudes pendientes de una comunidad (solo para dueños)
  getJoinRequests: async (communityId: string) => {
    
    try {
      const response = await api.get(`/api/communities/${communityId}/join-requests`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo solicitudes:', error.response?.data || error.message);
      throw error;
    }
  },

  // Aprobar o rechazar solicitud de unión (solo para dueños)
  updateJoinRequest: async (communityId: string, requestId: string, action: 'approve' | 'reject') => {
    
    try {
      const response = await api.put(`/api/communities/${communityId}/join-requests/${requestId}`, {
        action: action
      });
      return response.data;
    } catch (error: any) {
      console.error(`❌ [COMMUNITIES] Error ${action === 'approve' ? 'aprobando' : 'rechazando'} solicitud:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener posts de una comunidad
  getCommunityPosts: async (communityId: string) => {
    
    try {
      const response = await api.get(`/api/communities/${communityId}/posts`);
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
    
    // Limpiar objeto removiendo propiedades undefined
    const cleanPostData = Object.entries(postData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    
    try {
      const response = await api.post(`/api/communities/${communityId}/posts`, cleanPostData);
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
    
    try {
      // Preparar datos del post incluyendo imageUrl
      const postDataWithImage = {
        ...postData,
        ...(imageUrl && { imageUrl })
      };
      
      
      // Llamar al endpoint normal (el backend procesará imageUrl)
      const response = await api.post(`/api/communities/${communityId}/posts`, postDataWithImage);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error creando post con imageUrl:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Likes para Posts
  likePost: async (postId: string) => {
    
    try {
      const response = await api.post(`/api/posts/${postId}/like`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LIKES] Error procesando like del post:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Likes para Comentarios
  likeComment: async (commentId: string) => {
    
    try {
      const response = await api.post(`/api/comments/${commentId}/like`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LIKES] Error procesando like del comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Comentarios
  // Obtener comentarios de un post
  getPostComments: async (postId: string) => {
    
    try {
      const response = await api.get(`/api/posts/${postId}/comments`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error obteniendo comentarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear un nuevo comentario en un post
  createComment: async (postId: string, content: string) => {
    
    try {
      const response = await api.post(`/api/posts/${postId}/comments`, { content });
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error creando comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Búsqueda Inteligente de Comunidades
  searchCommunities: async (query: string, limit: number = 20) => {
    
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
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [SEARCH] Error buscando comunidades:', error.response?.data || error.message);
      throw error;
    }
  },

  // Salir de una comunidad
  leaveCommunity: async (communityId: string) => {
    
    try {
      const response = await api.post(`/api/communities/${communityId}/leave`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error saliendo de la comunidad:', error.response?.data || error.message);
      throw error;
    }
  },

  // Top posts con más likes
  getTopPosts: async (limit: number = 3) => {
    try {
      const response = await api.get('/api/communities/posts/top', {
        params: { limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo top posts:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener un post específico por ID
  getPost: async (postId: string) => {
    
    try {
      const response = await api.get(`/api/posts/${postId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo post:', error.response?.data || error.message);
      throw error;
    }
  },

  // NUEVO: Eliminar un post (solo el autor puede hacerlo)
  deletePost: async (postId: string) => {
    
    try {
      const response = await api.delete(`/api/posts/${postId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error eliminando post:', error.response?.data || error.message);
      throw error;
    }
  },

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
    try {
      const response = await api.post(`/api/lists/${listId}/items`, data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error agregando item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Marcar/desmarcar item como completado
  toggleItem: async (listId: string, itemId: string) => {
    try {
      const response = await api.put(`/api/lists/${listId}/items/${itemId}/toggle`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error alternando estado del item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Eliminar item
  deleteItem: async (listId: string, itemId: string) => {
    try {
      const response = await api.delete(`/api/lists/${listId}/items/${itemId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error eliminando item:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Estrellas

  // Dar/quitar estrella a lista
  toggleStar: async (listId: string) => {
    try {
      const response = await api.post(`/api/lists/${listId}/star`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error alternando estrella:', error.response?.data || error.message);
      throw error;
    }
  },

  // Sistema de Comentarios

  // Obtener comentarios de un item
  getItemComments: async (listId: string, itemId: string) => {
    try {
      const response = await api.get(`/api/lists/${listId}/items/${itemId}/comments`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo comentarios:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar comentario a un item
  addItemComment: async (listId: string, itemId: string, data: { content: string }) => {
    try {
      const response = await api.post(`/api/lists/${listId}/items/${itemId}/comments`, data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error agregando comentario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Calificar un item (1-5 estrellas)
  rateItem: async (listId: string, itemId: string, rating: number) => {
    try {
      const response = await api.post(`/api/lists/${listId}/items/${itemId}/rate`, { rating });
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
    try {
      const response = await api.get('/api/categories');
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [CATEGORIES] Error obteniendo categorías');
      console.error('❌ [CATEGORIES] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener una categoría específica por ID
  getCategoryById: async (categoryId: string) => {
    try {
      const response = await api.get(`/api/categories/${categoryId}`);
      
      
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
    
    try {
      const response = await api.get(`/api/recommendations${queryParam}`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Buscar recomendaciones por texto
  searchRecommendations: async (query: string) => {
    try {
      const response = await api.get('/api/recommendations/search', {
        params: { q: query },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error buscando recomendaciones:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones por categoría (alias más específico) con paginación
  getRecommendationsByCategory: async (categoryId: string, page: number = 1, limit: number = 20) => {
    return recommendationsService.getRecommendations(categoryId, page, limit);
  },

  // Obtener una recomendación específica por ID
  getRecommendationById: async (recommendationId: string) => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendación:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener productos/servicios del profesional vinculado a una recomendación
  getRecommendationProducts: async (
    recommendationId: string,
    options?: { serviceType?: string; limit?: number }
  ) => {

    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/products`, {
        params: { ...options },
      });

      return response.data; // { hasProfessional, professional?, products? }
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo productos del profesional:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones cercanas mejor calificadas
  getNearbyTop: async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    categoryId?: string;
    limit?: number;
  }) => {
    try {
      const response = await api.get('/api/recommendations/nearby/top', {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo cercanas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener reviews de una recomendación
  getRecommendationReviews: async (recommendationId: string, page: number = 1, limit: number = 20) => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/reviews`, {
        params: { page, limit }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo reviews:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mi review para una recomendación
  getMyReview: async (recommendationId: string) => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/reviews/my-review`);
      
      
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
    
    try {
      const reviewData: any = {
        rating,
        comment: comment || ''
      };

      // Agregar campos opcionales solo si están presentes
      if (photos && photos.length > 0) reviewData.photos = photos;
      if (childAge) reviewData.childAge = childAge;
      if (visitedWith) reviewData.visitedWith = visitedWith;


      const response = await api.post(`/api/recommendations/${recommendationId}/reviews`, reviewData);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error guardando review:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Subir foto individual de review
  uploadReviewPhoto: async (recommendationId: string, photoFile: any) => {
    
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
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error subiendo foto:', error.response?.data || error.message);
      throw error;
    }
  },

  // Subir múltiples fotos de review (máx 5)
  uploadReviewPhotos: async (recommendationId: string, photoFiles: any[]) => {
    
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
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error subiendo fotos:', error.response?.data || error.message);
      throw error;
    }
  },

  // Toggle "útil" en una review
  toggleReviewHelpful: async (recommendationId: string, reviewId: string) => {
    
    try {
      const response = await api.post(
        `/api/recommendations/${recommendationId}/reviews/${reviewId}/helpful`
      );
      
      
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
    
    try {
      const response = await api.delete(`/api/recommendations/${recommendationId}/reviews/my-review`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error eliminando review:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mis favoritos
  getFavorites: async () => {
    
    try {
      const response = await api.get('/api/recommendations/favorites');
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo favoritos');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Verificar si es favorito
  isFavorite: async (recommendationId: string) => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/favorite`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error verificando favorito:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Toggle favorito (agregar/quitar)
  toggleFavorite: async (recommendationId: string) => {
    
    try {
      const response = await api.post(`/api/recommendations/${recommendationId}/favorite`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error con favorito:', recommendationId);
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones recientes
  getRecentRecommendations: async (limit: number = 10) => {
    
    try {
      const response = await api.get('/api/recommendations/recent', {
        params: { limit }
      });
      
      
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
    
    try {
      const response = await api.get('/api/recommendations/nearby', {
        params: { latitude, longitude, radius, categoryId }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones cercanas');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Crear nueva recomendación (usuario app)
  createRecommendation: async (data: {
    categoryId: string;
    name: string;
    description?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    countryId?: string;
    cityId?: string;
    countryName?: string;
    cityName?: string;
    phone?: string;
    email?: string;
    website?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    whatsapp?: string;
    imageUrl?: string;
  }) => {
    
    try {
      const response = await api.post('/api/recommendations', data);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error creando recomendación');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Agregar a lista de deseos
  addToWishlist: async (recommendationId: string, notes?: string, priority?: string) => {
    
    try {
      const response = await api.post('/api/recommendations/wishlist', {
        recommendationId,
        notes,
        priority
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error agregando a wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mi lista de deseos
  getWishlist: async (priority?: string) => {
    
    try {
      const response = await api.get('/api/recommendations/wishlist', {
        params: { priority }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Quitar de lista de deseos
  removeFromWishlist: async (wishlistId: string) => {
    
    try {
      const response = await api.delete(`/api/recommendations/wishlist/${wishlistId}`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error quitando de wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Verificar si está en wishlist
  isInWishlist: async (recommendationId: string) => {
    
    try {
      const response = await api.get(`/api/recommendations/${recommendationId}/wishlist`);
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error verificando wishlist');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Registrar visita a una recomendación
  registerVisit: async (recommendationId: string, childId?: string, visitDate?: Date) => {
    
    try {
      const response = await api.post(`/api/recommendations/${recommendationId}/visits`, {
        childId,
        visitDate: visitDate || new Date()
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error registrando visita');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones de una comunidad
  getCommunityRecommendations: async (communityId: string, categoryId?: string, limit: number = 20) => {
    
    try {
      const response = await api.get(`/api/communities/${communityId}/recommendations`, {
        params: { categoryId, limit }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones de comunidad');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Comparar recomendaciones
  compareRecommendations: async (recommendationIds: string[]) => {
    
    try {
      const response = await api.get('/api/recommendations/compare', {
        params: { ids: recommendationIds.join(',') }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error comparando recomendaciones');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener recomendaciones personalizadas según perfil del bebé
  getPersonalizedRecommendations: async (childId?: string) => {
    
    try {
      const response = await api.get('/api/recommendations/personalized', {
        params: { childId }
      });
      
      
      return response.data;
    } catch (error: any) {
      console.error('❌ [RECOMMENDATIONS] Error obteniendo recomendaciones personalizadas');
      console.error('❌ [RECOMMENDATIONS] Error:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// LOCATIONS
// ============================================
export const locationsService = {
  getCountries: async () => {
    try {
      const response = await api.get('/api/locations/countries');
      return response.data;
    } catch (error: any) {
      console.error('❌ [LOCATIONS] Error obteniendo países:', error.response?.data || error.message);
      throw error;
    }
  },
  getCities: async (countryId: string) => {
    try {
      const response = await api.get(`/api/locations/cities?countryId=${countryId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LOCATIONS] Error obteniendo ciudades:', error.response?.data || error.message);
      throw error;
    }
  },
  reverseGeocode: async (latitude: number, longitude: number) => {
    try {
      const response = await api.get(`/api/locations/reverse?latitude=${latitude}&longitude=${longitude}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LOCATIONS] Error en reverse geocode:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// GUIA DE HOY
// ============================================
export const guideService = {
  getTodayGuide: async (payload: {
    birthDate?: string;
    name?: string;
    gestationWeeks?: number;
    isPregnant?: boolean;
    ageWeeks?: number;
    childId?: string; // ✅ AGREGAR childId
  }) => {
    try {
      const response = await api.post('/api/guide/today', payload);
      return response.data;
    } catch (error: any) {
      console.error('❌ [GUIDE] Error obteniendo guía de hoy:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// MARKETPLACE
// ============================================

export const marketplaceService = {
  getNearbyTop: async (params: {
    latitude: number;
    longitude: number;
    radius?: number;
    limit?: number;
    type?: string;
    category?: string;
    status?: string;
  }) => {
    try {
      const response = await api.get('/api/marketplace/products/nearby/top', {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [MARKET] Error obteniendo productos cercanos:', error.response?.data || error.message);
      throw error;
    }
  },
};

// Servicio de administración
export const adminService = {
  // Fijar o desfijar un post
  pinPost: async (postId: string, isPinned: boolean) => {
    
    try {
      const response = await api.patch(`/api/admin/posts/${postId}/pin`, {
        isPinned
      });
      
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
    
    // Si endTime es undefined, no lo incluimos en el payload
    // Si endTime es null, lo enviamos para indicar que se debe eliminar
    const payload: any = {};
    if (data.startTime !== undefined) {
      payload.startTime = data.startTime;
    }
    if (data.endTime !== undefined) {
      payload.endTime = data.endTime; // Puede ser string o null
    }
    
    
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
          if (nap.actualDuration) {
          }
          if (nap.startTime && nap.endTime) {
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

// ============= VERSIÓN DE APP 📱 =============
export const appVersionService = {
  // Verificar versión de la app
  checkVersion: async (platform: 'ios' | 'android') => {
    try {
      const response = await api.get(`/api/app/version?platform=${platform}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [APP VERSION] Error verificando versión:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============= EMBARAZO 🤰 =============
export const pregnancyService = {
  getWeekInfo: async (gestationWeeks: number, name?: string, includeImage: boolean = true) => {
    try {
      const response = await api.post('/api/pregnancy/week-info', {
        gestationWeeks,
        name,
        includeImage,
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [PREGNANCY] Error obteniendo info de semana:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// GROWTH / CRECIMIENTO
// ============================================
export const growthService = {
  getWeightMeasurements: async (childId: string) => {
    const response = await api.get(`/api/children/${childId}/measurements/weight`);
    return response.data;
  },
  createWeightMeasurement: async (
    childId: string,
    data: { valueKg: number; measuredAt: string; notes?: string; source?: string }
  ) => {
    const response = await api.post(`/api/children/${childId}/measurements/weight`, data);
    return response.data;
  },
  updateWeightMeasurement: async (
    childId: string,
    id: string,
    data: { valueKg?: number; measuredAt?: string; notes?: string }
  ) => {
    const response = await api.put(`/api/children/${childId}/measurements/weight/${id}`, data);
    return response.data;
  },
  deleteWeightMeasurement: async (childId: string, id: string) => {
    const response = await api.delete(`/api/children/${childId}/measurements/weight/${id}`);
    return response.data;
  },
  getHeightMeasurements: async (childId: string) => {
    const response = await api.get(`/api/children/${childId}/measurements/height`);
    return response.data;
  },
  createHeightMeasurement: async (
    childId: string,
    data: { valueCm: number; measuredAt: string; notes?: string; source?: string }
  ) => {
    const response = await api.post(`/api/children/${childId}/measurements/height`, data);
    return response.data;
  },
  updateHeightMeasurement: async (
    childId: string,
    id: string,
    data: { valueCm?: number; measuredAt?: string; notes?: string }
  ) => {
    const response = await api.put(`/api/children/${childId}/measurements/height/${id}`, data);
    return response.data;
  },
  deleteHeightMeasurement: async (childId: string, id: string) => {
    const response = await api.delete(`/api/children/${childId}/measurements/height/${id}`);
    return response.data;
  },
  getHeadMeasurements: async (childId: string) => {
    const response = await api.get(`/api/children/${childId}/measurements/head`);
    return response.data;
  },
  createHeadMeasurement: async (
    childId: string,
    data: { valueCm: number; measuredAt: string; notes?: string; source?: string }
  ) => {
    const response = await api.post(`/api/children/${childId}/measurements/head`, data);
    return response.data;
  },
  updateHeadMeasurement: async (
    childId: string,
    id: string,
    data: { valueCm?: number; measuredAt?: string; notes?: string }
  ) => {
    const response = await api.put(`/api/children/${childId}/measurements/head/${id}`, data);
    return response.data;
  },
  deleteHeadMeasurement: async (childId: string, id: string) => {
    const response = await api.delete(`/api/children/${childId}/measurements/head/${id}`);
    return response.data;
  },
  getSummary: async (childId: string) => {
    const response = await api.get(`/api/children/${childId}/measurements/summary`);
    return response.data;
  },
  getPercentiles: async (params: { sex: 'M' | 'F'; type: 'weight' | 'height' | 'head'; ageWeeks?: number }) => {
    const response = await api.get('/api/growth/percentiles', { params });
    return response.data;
  },
};

// ============================================
// VACCINES / VACUNAS
// ============================================
export const vaccineService = {
  // Obtener vacunas de un niño
  getVaccines: async (childId: string) => {
    const response = await api.get(`/api/children/${childId}/vaccines`);
    return response.data;
  },
  
  // Crear/registrar vacuna
  createVaccine: async (
    childId: string,
    data: { 
      name: string;
      scheduledDate?: string;
      appliedDate?: string;
      status?: 'pending' | 'applied' | 'overdue';
      location?: string;
      batch?: string;
      notes?: string;
    }
  ) => {
    const response = await api.post(`/api/children/${childId}/vaccines`, data);
    return response.data;
  },
  
  // Actualizar vacuna
  updateVaccine: async (
    childId: string,
    vaccineId: string,
    data: { 
      name?: string;
      scheduledDate?: string;
      appliedDate?: string;
      status?: 'pending' | 'applied' | 'overdue';
      location?: string;
      batch?: string;
      notes?: string;
    }
  ) => {
    const response = await api.put(`/api/children/${childId}/vaccines/${vaccineId}`, data);
    return response.data;
  },
  
  // Eliminar vacuna
  deleteVaccine: async (childId: string, vaccineId: string) => {
    const response = await api.delete(`/api/children/${childId}/vaccines/${vaccineId}`);
    return response.data;
  },
  
  // Asignar calendario de vacunación por país
  assignSchedule: async (childId: string, countryId: string) => {
    const response = await api.post(`/api/children/${childId}/vaccines/assign-schedule`, {
      countryId,
    });
    return response.data;
  },
  
  // Obtener calendarios de vacunación activos
  getSchedules: async () => {
    const response = await api.get('/api/vaccines/schedules');
    return response.data;
  },
  
  // Obtener calendario por país
  getScheduleByCountry: async (countryId: string) => {
    const response = await api.get(`/api/vaccines/schedules/country/${countryId}`);
    return response.data;
  },
};

// ============================================
// FAQ MOMS
// ============================================
export const faqService = {
  getMomsFaq: async (childId: string) => {
    try {
      const response = await api.post('/api/faq/moms', { childId });
      return response.data;
    } catch (error: any) {
      console.error('❌ [FAQ] Error obteniendo preguntas:', error.response?.data || error.message);
      throw error;
    }
  },
};

// ============================================
// ARTICLES / ARTÍCULOS
// ============================================
export const articlesService = {
  // Obtener artículos por categoría
  getArticlesByCategory: async (categoryId: string, page: number = 1, limit: number = 20) => {
    try {
      const response = await api.get(`/api/articles/category/${categoryId}`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ [ARTICLES] Error obteniendo artículos:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener detalle de un artículo
  getArticleDetail: async (articleId: string) => {
    try {
      const response = await api.get(`/api/articles/${articleId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ [ARTICLES] Error obteniendo detalle de artículo:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener categorías de artículos
  getArticleCategories: async () => {
    try {
      const response = await api.get('/api/articles/categories');
      return response.data;
    } catch (error: any) {
      console.error('❌ [ARTICLES] Error obteniendo categorías:', error.response?.data || error.message);
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
  ...locationsService,
  ...guideService,
  ...adminService,
  ...sleepService,
  ...activitiesService,
  ...pregnancyService,
  ...growthService,
  ...vaccineService,
  ...faqService,
  ...appVersionService,
};
