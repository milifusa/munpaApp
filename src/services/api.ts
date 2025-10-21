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

  // Login con Google (endpoint simplificado)
  googleLoginSimple: async (data: { email: string; displayName: string; photoURL?: string; googleId: string }) => {
    console.log('🔑 Iniciando login con Google (simplificado)...');
    console.log('📤 Datos a enviar:', data);
    try {
      const response = await api.post('/api/auth/google-login-simple', data);
      console.log('✅ Login con Google exitoso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error en login con Google:', error);
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
    console.log('🏗️ [COMMUNITIES] Creando nueva comunidad:', data);
    
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
    console.log('🏗️ [COMMUNITIES] Obteniendo comunidades públicas...');
    
    try {
      const response = await api.get('/api/communities');
      console.log('✅ [COMMUNITIES] Comunidades públicas obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo comunidades públicas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener comunidades del usuario
  getUserCommunities: async () => {
    console.log('🏗️ [COMMUNITIES] Obteniendo comunidades del usuario...');
    
    try {
      const response = await api.get('/api/user/communities');
      console.log('✅ [COMMUNITIES] Comunidades del usuario obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error obteniendo comunidades del usuario:', error.response?.data || error.message);
      throw error;
    }
  },

  // Unirse a una comunidad
  joinCommunity: async (communityId: string) => {
    console.log('🏗️ [COMMUNITIES] Uniéndose a comunidad:', communityId);
    
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
  }) => {
    console.log('📝 [COMMUNITIES] Creando nuevo post en comunidad:', communityId);
    console.log('📝 [COMMUNITIES] Datos del post:', postData);
    
    try {
      const response = await api.post(`/api/communities/${communityId}/posts`, postData);
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
    console.log('📋 [LISTS] Creando nueva lista:', data);
    try {
      const response = await api.post('/api/lists', data);
      console.log('✅ [LISTS] Lista creada exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error creando lista:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener mis listas (privadas y públicas propias)
  getUserLists: async (filters?: { isPublic?: boolean; limit?: number }) => {
    console.log('📋 [LISTS] Obteniendo mis listas:', filters);
    try {
      const params = new URLSearchParams();
      if (filters?.isPublic !== undefined) params.append('isPublic', filters.isPublic.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      
      const response = await api.get(`/api/user/lists?${params.toString()}`);
      console.log('✅ [LISTS] Mis listas obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo mis listas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener listas públicas
  getPublicLists: async (filters?: { limit?: number; sortBy?: 'stars' | 'recent' }) => {
    console.log('📋 [LISTS] Obteniendo listas públicas:', filters);
    try {
      const params = new URLSearchParams();
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      
      const response = await api.get(`/api/lists/public?${params.toString()}`);
      console.log('✅ [LISTS] Listas públicas obtenidas:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LISTS] Error obteniendo listas públicas:', error.response?.data || error.message);
      throw error;
    }
  },

  // Obtener detalles de una lista específica
  getListDetails: async (listId: string) => {
    console.log('📋 [LISTS] Obteniendo detalles de lista:', listId);
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
    console.log('📋 [LISTS] Actualizando lista:', listId, data);
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
    console.log('📋 [LISTS] Copiando lista pública:', listId);
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

export default api;
