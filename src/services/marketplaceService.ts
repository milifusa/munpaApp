import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online/api';

// Interfaces
export interface MarketplaceProduct {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  
  // Información del producto
  title: string;
  description: string;
  category: string;
  condition: 'nuevo' | 'como_nuevo' | 'buen_estado' | 'usado';
  photos: string[];
  
  // Tipo de transacción
  type: 'venta' | 'donacion' | 'trueque';
  price?: number;
  tradeFor?: string;
  
  // Ubicación
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  
  // Estado del producto
  status: 'disponible' | 'reservado' | 'vendido' | 'donado' | 'intercambiado' | 'eliminado';
  
  // Interacciones
  views: number;
  favorites: number;
  messages: number;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  soldAt?: string;
  
  // Moderación
  isApproved: boolean;
  isReported: boolean;
  reportCount: number;
  
  // Campo adicional para favoritos
  isFavorite?: boolean;
}

export interface ProductFilters {
  type?: 'venta' | 'donacion' | 'trueque' | 'all';
  category?: string;
  status?: string;
  condition?: 'nuevo' | 'como_nuevo' | 'buen_estado' | 'usado';
  minPrice?: number;
  maxPrice?: number;
  location?: string;
  search?: string;
  page?: number;
  limit?: number;
  orderBy?: 'reciente' | 'precio_asc' | 'precio_desc' | 'distancia' | 'vistas';
  // Para búsqueda por proximidad
  latitude?: number;
  longitude?: number;
  radius?: number; // Radio en km
}

export interface CreateProductData {
  title: string;
  description: string;
  category: string;
  condition: string;
  photos: string[];
  type: 'venta' | 'donacion' | 'trueque';
  price?: number;
  tradeFor?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface MarketplaceMessage {
  id: string;
  productId: string;
  productTitle: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId: string;
  receiverName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;
  imageUrl?: string;
  order: number;
  isActive?: boolean;
  productCount?: number;
}

// Categorías por defecto (fallback si el backend no está disponible)
export const DEFAULT_CATEGORIES = [
  { id: 'transporte', name: 'Transporte', slug: 'transporte', icon: '🚗', order: 1 },
  { id: 'ropa', name: 'Ropa', slug: 'ropa', icon: '👕', order: 2 },
  { id: 'juguetes', name: 'Juguetes', slug: 'juguetes', icon: '🧸', order: 3 },
  { id: 'alimentacion', name: 'Alimentación', slug: 'alimentacion', icon: '🍼', order: 4 },
  { id: 'muebles', name: 'Muebles', slug: 'muebles', icon: '🛏️', order: 5 },
  { id: 'higiene', name: 'Higiene', slug: 'higiene', icon: '🛁', order: 6 },
  { id: 'libros', name: 'Libros', slug: 'libros', icon: '📚', order: 7 },
  { id: 'maternidad', name: 'Maternidad', slug: 'maternidad', icon: '🤰', order: 8 },
  { id: 'electronica', name: 'Electrónica', slug: 'electronica', icon: '📱', order: 9 },
  { id: 'otros', name: 'Otros', slug: 'otros', icon: '📦', order: 10 },
];

// Variable para mantener categorías en caché
let cachedCategories: MarketplaceCategory[] | null = null;

export const CATEGORIES = DEFAULT_CATEGORIES;

export const CONDITIONS = [
  { id: 'nuevo', name: 'Nuevo' },
  { id: 'como_nuevo', name: 'Como nuevo' },
  { id: 'buen_estado', name: 'Buen estado' },
  { id: 'usado', name: 'Usado' },
];

class MarketplaceService {
  // Obtener token de autenticación
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }

  // Headers para las peticiones
  private async getHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    console.log('🔑 [MARKETPLACE] Token disponible:', token ? 'SÍ' : 'NO');
    console.log('🔑 [MARKETPLACE] Longitud del token:', token?.length || 0);
    
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // ===== PRODUCTOS =====

  // Obtener lista de productos con filtros
  async getProducts(filters: ProductFilters = {}): Promise<{ products: MarketplaceProduct[]; total: number }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters.type && filters.type !== 'all') queryParams.append('type', filters.type);
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.condition) queryParams.append('condition', filters.condition);
      if (filters.minPrice) queryParams.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) queryParams.append('maxPrice', filters.maxPrice.toString());
      if (filters.location) queryParams.append('location', filters.location);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.page) queryParams.append('page', filters.page.toString());
      if (filters.limit) queryParams.append('limit', filters.limit.toString());
      if (filters.orderBy) queryParams.append('orderBy', filters.orderBy);

      const response = await fetch(
        `${API_BASE_URL}/marketplace/products?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Si la ruta no existe (404), retornar array vacío en lugar de error
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoints no disponibles aún. Retornando array vacío.');
          return { products: [], total: 0 };
        }
        
        console.error('❌ [MARKETPLACE] Error:', errorData);
        throw new Error(errorData.message || 'Error obteniendo productos');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor:', JSON.stringify(data).substring(0, 300));
      
      // Manejar diferentes formatos de respuesta
      if (data.products) {
        console.log('✅ [MARKETPLACE] Productos encontrados en data.products:', data.products.length);
        return { products: data.products, total: data.total || data.products.length };
      } else if (data.data && Array.isArray(data.data)) {
        console.log('✅ [MARKETPLACE] Productos encontrados en data.data:', data.data.length);
        return { products: data.data, total: data.total || data.data.length };
      } else if (Array.isArray(data)) {
        console.log('✅ [MARKETPLACE] Respuesta es un array directo:', data.length);
        return { products: data, total: data.length };
      } else {
        console.warn('⚠️ [MARKETPLACE] Formato de respuesta desconocido:', Object.keys(data));
        return { products: [], total: 0 };
      }
    } catch (error) {
      console.error('Error en getProducts:', error);
      // Si es un error de red o ruta no encontrada, retornar vacío
      return { products: [], total: 0 };
    }
  }

  // Obtener productos cercanos (por proximidad)
  async getNearbyProducts(filters: {
    latitude: number;
    longitude: number;
    radius?: number;
    type?: 'venta' | 'donacion' | 'trueque';
    category?: string;
    status?: string;
    minPrice?: number;
    maxPrice?: number;
    search?: string;
    orderBy?: 'distancia' | 'reciente' | 'precio_asc' | 'precio_desc';
    page?: number;
    limit?: number;
  }): Promise<{ products: MarketplaceProduct[]; total: number; distance?: number }> {
    try {
      const params = new URLSearchParams();
      params.append('latitude', filters.latitude.toString());
      params.append('longitude', filters.longitude.toString());
      
      if (filters.radius) params.append('radius', filters.radius.toString());
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.orderBy) params.append('orderBy', filters.orderBy);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const response = await fetch(
        `${API_BASE_URL}/marketplace/products/nearby?${params.toString()}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoint /nearby no disponible, usando endpoint normal');
          // Fallback al endpoint normal
          return this.getProducts({
            ...filters,
            latitude: filters.latitude,
            longitude: filters.longitude,
          });
        }
        throw new Error('Error obteniendo productos cercanos');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en getNearbyProducts:', error);
      // Fallback al endpoint normal
      return this.getProducts({
        ...filters,
        latitude: filters.latitude,
        longitude: filters.longitude,
      });
    }
  }

  // Obtener detalle de un producto
  async getProductById(productId: string): Promise<MarketplaceProduct> {
    try {
      console.log('🔍 [MARKETPLACE] Obteniendo producto:', productId);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/products/${productId}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Producto no encontrado (404)');
          throw new Error('Producto no encontrado');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error obteniendo producto:', errorData);
        throw new Error(errorData.message || 'Error obteniendo producto');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor (getProductById):', JSON.stringify(data).substring(0, 500));
      
      // Manejar diferentes formatos de respuesta
      const product = data.product || data.data || data;
      
      if (!product || typeof product !== 'object') {
        console.error('❌ [MARKETPLACE] Producto inválido o no encontrado en la respuesta');
        throw new Error('Producto no encontrado');
      }
      
      // Log detallado de la información del vendedor
      console.log('👤 [MARKETPLACE] Información del vendedor recibida:', {
        userId: product.userId || product.user_id,
        userName: product.userName || product.user_name || 'NO TIENE',
        userPhoto: product.userPhoto || product.user_photo ? 'Presente' : 'Ausente',
        sellerName: product.sellerName || product.seller_name || 'NO TIENE',
        sellerPhoto: product.sellerPhoto || product.seller_photo ? 'Presente' : 'Ausente',
        allKeys: Object.keys(product).filter(key => 
          key.toLowerCase().includes('user') || 
          key.toLowerCase().includes('seller') ||
          key.toLowerCase().includes('name')
        ),
      });
      
      // Normalizar el nombre del usuario - intentar diferentes campos
      if (!product.userName || product.userName === 'Usuario' || product.userName === '') {
        const possibleNames = [
          product.sellerName,
          product.seller_name,
          product.user_name,
          product.name,
          product.displayName,
          product.display_name,
        ].filter(Boolean);
        
        if (possibleNames.length > 0) {
          product.userName = possibleNames[0];
          console.log('✅ [MARKETPLACE] Nombre del vendedor normalizado desde:', possibleNames[0]);
        } else {
          console.warn('⚠️ [MARKETPLACE] No se encontró nombre válido del vendedor. El backend debe enviar userName o sellerName');
        }
      }
      
      console.log('✅ [MARKETPLACE] Producto encontrado:', product.id || product._id);
      console.log('✅ [MARKETPLACE] Nombre del vendedor final:', product.userName);
      return product as MarketplaceProduct;
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en getProductById:', error);
      throw error;
    }
  }

  // Crear nuevo producto
  async createProduct(productData: CreateProductData): Promise<MarketplaceProduct> {
    try {
      console.log('📤 [MARKETPLACE] Creando producto:', productData);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/products`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify(productData),
        }
      );

      console.log('📥 [MARKETPLACE] Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('❌ [MARKETPLACE] Error del servidor:', errorData);
        console.error('❌ [MARKETPLACE] Producto enviado:', {
          title: productData.title,
          category: productData.category,
          type: productData.type,
        });
        
        // Si la ruta no existe, dar un mensaje claro
        if (response.status === 404) {
          throw new Error('El marketplace aún no está disponible. Los endpoints del backend necesitan ser activados.');
        }
        
        // Si es error de categoría, dar mensaje más específico
        if (errorData.message && errorData.message.includes('Categoría')) {
          throw new Error(`Categoría inválida: "${productData.category}". Por favor, selecciona una categoría válida de la lista.`);
        }
        
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ [MARKETPLACE] Producto creado:', data);
      return data.product;
    } catch (error: any) {
      console.error('❌ [MARKETPLACE] Error en createProduct:', {
        message: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Actualizar producto
  async updateProduct(productId: string, productData: Partial<CreateProductData>): Promise<MarketplaceProduct> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/products/${productId}`,
        {
          method: 'PUT',
          headers: await this.getHeaders(),
          body: JSON.stringify(productData),
        }
      );

      if (!response.ok) {
        throw new Error('Error actualizando producto');
      }

      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error('Error en updateProduct:', error);
      throw error;
    }
  }

  // Eliminar producto
  async deleteProduct(productId: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/products/${productId}`,
        {
          method: 'DELETE',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Error eliminando producto');
      }
    } catch (error) {
      console.error('Error en deleteProduct:', error);
      throw error;
    }
  }

  // Cambiar estado del producto
  async updateProductStatus(
    productId: string,
    status: 'disponible' | 'vendido' | 'donado' | 'intercambiado'
  ): Promise<MarketplaceProduct> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/products/${productId}/status`,
        {
          method: 'PATCH',
          headers: await this.getHeaders(),
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error('Error actualizando estado');
      }

      const data = await response.json();
      return data.product;
    } catch (error) {
      console.error('Error en updateProductStatus:', error);
      throw error;
    }
  }

  // Obtener mis productos
  async getMyProducts(): Promise<MarketplaceProduct[]> {
    try {
      console.log('📦 [MARKETPLACE] Obteniendo mis productos');
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/my-products`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoint de mis productos no disponible (404), retornando array vacío');
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error obteniendo mis productos:', errorData);
        throw new Error(errorData.message || 'Error obteniendo mis productos');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor (getMyProducts):', JSON.stringify(data).substring(0, 300));
      
      // Manejar diferentes formatos de respuesta
      const myProducts = data.products || data.data || (Array.isArray(data) ? data : []);
      
      if (!Array.isArray(myProducts)) {
        console.warn('⚠️ [MARKETPLACE] Los productos no son un array, retornando array vacío');
        return [];
      }
      
      console.log('✅ [MARKETPLACE] Mis productos encontrados:', myProducts.length);
      return myProducts as MarketplaceProduct[];
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en getMyProducts:', error);
      // Si es un error de red o ruta no encontrada, retornar array vacío
      return [];
    }
  }

  // ===== FAVORITOS =====

  // Obtener favoritos
  async getFavorites(): Promise<MarketplaceProduct[]> {
    try {
      console.log('❤️ [MARKETPLACE] Obteniendo favoritos');
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/favorites`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        // Si la ruta no existe, retornar array vacío
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoints de favoritos no disponibles aún (404)');
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error obteniendo favoritos:', errorData);
        throw new Error(errorData.message || 'Error obteniendo favoritos');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor (getFavorites):', JSON.stringify(data).substring(0, 500));
      console.log('📦 [MARKETPLACE] Estructura de respuesta:', {
        hasProducts: !!data.products,
        hasData: !!data.data,
        isArray: Array.isArray(data),
        keys: Object.keys(data || {}),
      });
      
      // Manejar diferentes formatos de respuesta
      let favorites: MarketplaceProduct[] = [];
      
      if (data.products && Array.isArray(data.products)) {
        favorites = data.products;
        console.log('✅ [MARKETPLACE] Favoritos encontrados en data.products:', favorites.length);
      } else if (data.data && Array.isArray(data.data)) {
        favorites = data.data;
        console.log('✅ [MARKETPLACE] Favoritos encontrados en data.data:', favorites.length);
      } else if (Array.isArray(data)) {
        favorites = data;
        console.log('✅ [MARKETPLACE] Respuesta es un array directo:', favorites.length);
      } else {
        console.warn('⚠️ [MARKETPLACE] Formato de respuesta desconocido, retornando array vacío');
        return [];
      }
      
      // Validar que realmente sean favoritos (opcional: verificar que tengan isFavorite: true)
      // Por ahora solo retornamos lo que viene del backend
      console.log('✅ [MARKETPLACE] Total de favoritos a retornar:', favorites.length);
      if (favorites.length > 0) {
        console.log('📦 [MARKETPLACE] Primer favorito:', {
          id: favorites[0].id,
          title: favorites[0].title,
          isFavorite: (favorites[0] as any).isFavorite,
        });
      }
      
      return favorites as MarketplaceProduct[];
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en getFavorites:', error);
      // Si es un error de red o ruta no encontrada, retornar array vacío
      return [];
    }
  }

  // Agregar a favoritos
  async addToFavorites(productId: string): Promise<void> {
    try {
      console.log('❤️ [MARKETPLACE] Agregando a favoritos:', productId);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/favorites/${productId}`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoint de favoritos no disponible (404)');
          throw new Error('La funcionalidad de favoritos no está disponible aún');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error agregando a favoritos:', errorData);
        throw new Error(errorData.message || 'Error agregando a favoritos');
      }

      const data = await response.json().catch(() => ({}));
      console.log('✅ [MARKETPLACE] Agregado a favoritos exitosamente');
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en addToFavorites:', error);
      throw error;
    }
  }

  // Quitar de favoritos
  async removeFromFavorites(productId: string): Promise<void> {
    try {
      console.log('💔 [MARKETPLACE] Quitando de favoritos:', productId);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/favorites/${productId}`,
        {
          method: 'DELETE',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Endpoint de favoritos no disponible (404)');
          throw new Error('La funcionalidad de favoritos no está disponible aún');
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error quitando de favoritos:', errorData);
        throw new Error(errorData.message || 'Error quitando de favoritos');
      }

      const data = await response.json().catch(() => ({}));
      console.log('✅ [MARKETPLACE] Quitado de favoritos exitosamente');
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en removeFromFavorites:', error);
      throw error;
    }
  }

  // ===== MENSAJES =====

  // Obtener conversaciones
  async getConversations(): Promise<any[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/messages`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Error obteniendo conversaciones');
      }

      const data = await response.json();
      return data.conversations;
    } catch (error) {
      console.error('Error en getConversations:', error);
      throw error;
    }
  }

  // Obtener conversaciones de un producto específico (agrupadas por usuario)
  async getProductConversations(productId: string, currentUserId: string): Promise<Array<{
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto?: string;
    lastMessage: string;
    lastMessageDate: string;
    unreadCount: number;
    totalMessages: number;
  }>> {
    try {
      console.log('💬 [MARKETPLACE] Obteniendo conversaciones para producto:', productId);
      console.log('👤 [MARKETPLACE] Usuario actual:', currentUserId);
      
      const messages = await this.getProductMessages(productId);
      
      // Agrupar mensajes por usuario (el otro usuario en la conversación)
      const conversationsMap = new Map<string, {
        otherUserId: string;
        otherUserName: string;
        otherUserPhoto?: string;
        messages: MarketplaceMessage[];
      }>();

      messages.forEach((msg) => {
        // Determinar quién es el otro usuario
        const isMe = msg.senderId === currentUserId;
        
        // Si el mensaje es mío, el otro usuario es el receiver
        // Si el mensaje no es mío, el otro usuario es el sender
        const theOtherUserId = isMe ? msg.receiverId : msg.senderId;
        const theOtherUserName = isMe ? (msg.receiverName || 'Usuario') : (msg.senderName || 'Usuario');
        const theOtherUserPhoto = isMe ? undefined : msg.senderPhoto;

        if (!conversationsMap.has(theOtherUserId)) {
          conversationsMap.set(theOtherUserId, {
            otherUserId: theOtherUserId,
            otherUserName: theOtherUserName,
            otherUserPhoto: theOtherUserPhoto,
            messages: [],
          });
        }

        const conversation = conversationsMap.get(theOtherUserId)!;
        conversation.messages.push(msg);
      });

      // Convertir a array y ordenar por fecha del último mensaje
      const conversations = Array.from(conversationsMap.values()).map(conv => {
        // Ordenar mensajes por fecha
        conv.messages.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const lastMessage = conv.messages[0];
        const unreadCount = conv.messages.filter(m => !m.isRead && m.senderId !== currentUserId).length;

        return {
          otherUserId: conv.otherUserId,
          otherUserName: conv.otherUserName,
          otherUserPhoto: conv.otherUserPhoto,
          lastMessage: lastMessage.message,
          lastMessageDate: lastMessage.createdAt,
          unreadCount,
          totalMessages: conv.messages.length,
        };
      }).sort((a, b) => 
        new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime()
      );

      console.log('✅ [MARKETPLACE] Conversaciones encontradas:', conversations.length);
      return conversations;
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error obteniendo conversaciones del producto:', error);
      return [];
    }
  }

  // Obtener mensajes de un producto
  async getProductMessages(productId: string): Promise<MarketplaceMessage[]> {
    try {
      console.log('💬 [MARKETPLACE] Obteniendo mensajes para producto:', productId);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/messages/${productId}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Mensajes no encontrados (404), retornando array vacío');
          return [];
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error obteniendo mensajes:', errorData);
        throw new Error(errorData.message || 'Error obteniendo mensajes');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor (getProductMessages):', JSON.stringify(data, null, 2).substring(0, 2000));
      console.log('📦 [MARKETPLACE] Estructura de la respuesta (getProductMessages):', {
        success: data.success,
        message: data.message,
        hasMessages: !!data.messages,
        hasData: !!data.data,
        isArray: Array.isArray(data),
        keys: Object.keys(data),
      });
      
      // Manejar diferentes formatos de respuesta
      // Formato esperado: { success: true, message: "...", data: [...] } o { messages: [...] }
      const messages = data.data || data.messages || (Array.isArray(data) ? data : []);
      
      if (!Array.isArray(messages)) {
        console.warn('⚠️ [MARKETPLACE] Los mensajes no son un array, retornando array vacío');
        return [];
      }
      
      console.log('✅ [MARKETPLACE] Mensajes encontrados:', messages.length);
      
      // Log detallado de la estructura de los mensajes
      if (messages.length > 0) {
        console.log('📋 [MARKETPLACE] Estructura del primer mensaje:', {
          id: messages[0].id,
          senderId: messages[0].senderId,
          senderName: messages[0].senderName || 'NO TIENE senderName',
          senderPhoto: messages[0].senderPhoto || 'NO TIENE senderPhoto',
          receiverId: messages[0].receiverId,
          receiverName: messages[0].receiverName || 'NO TIENE receiverName',
          message: messages[0].message?.substring(0, 50),
          createdAt: messages[0].createdAt,
          allKeys: Object.keys(messages[0]),
        });
        
        // Verificar si algún mensaje tiene información del remitente
        const messagesWithSenderInfo = messages.filter((m: any) => 
          m.senderName && m.senderName !== 'Usuario' && m.senderName !== ''
        );
        console.log('📊 [MARKETPLACE] Mensajes con información del remitente:', messagesWithSenderInfo.length, 'de', messages.length);
        
        if (messagesWithSenderInfo.length === 0) {
          console.warn('⚠️ [MARKETPLACE] ⚠️⚠️⚠️ NINGÚN MENSAJE TIENE senderName VÁLIDO ⚠️⚠️⚠️');
          console.warn('⚠️ [MARKETPLACE] El backend debe enviar senderName y senderPhoto en cada mensaje');
        }
      }
      
      return messages as MarketplaceMessage[];
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en getProductMessages:', error);
      // Si es un error de red o ruta no encontrada, retornar array vacío en lugar de lanzar error
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  // Enviar mensaje
  async sendMessage(productId: string, message: string): Promise<MarketplaceMessage> {
    try {
      console.log('📤 [MARKETPLACE] Enviando mensaje para producto:', productId);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/messages`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({ productId, message }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ [MARKETPLACE] Error enviando mensaje:', errorData);
        throw new Error(errorData.message || 'Error enviando mensaje');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Respuesta completa del servidor (sendMessage):', JSON.stringify(data, null, 2));
      console.log('📦 [MARKETPLACE] Estructura de la respuesta:', {
        success: data.success,
        message: data.message,
        hasMessage: !!data.message,
        hasData: !!data.data,
        isArray: Array.isArray(data),
        keys: Object.keys(data),
      });
      
      // Manejar diferentes formatos de respuesta
      // Formato esperado: { success: true, message: "...", data: { ... } }
      let sentMessage = data.data || data.message || data;
      
      // Si sentMessage es undefined, intentar data directamente
      if (!sentMessage) {
        sentMessage = data;
      }
      
      // Log del mensaje extraído
      if (sentMessage) {
        const hasSenderName = !!(sentMessage.senderName && sentMessage.senderName !== 'Usuario');
        const hasSenderPhoto = !!sentMessage.senderPhoto;
        const hasReceiverName = !!(sentMessage.receiverName && sentMessage.receiverName !== 'Usuario');
        const hasReceiverPhoto = !!sentMessage.receiverPhoto;
        
        console.log('📋 [MARKETPLACE] Mensaje extraído de la respuesta:', {
          id: sentMessage.id,
          senderId: sentMessage.senderId,
          senderName: sentMessage.senderName || '❌ NO TIENE senderName',
          senderPhoto: sentMessage.senderPhoto || '❌ NO TIENE senderPhoto',
          receiverId: sentMessage.receiverId,
          receiverName: sentMessage.receiverName || '❌ NO TIENE receiverName',
          receiverPhoto: sentMessage.receiverPhoto || '❌ NO TIENE receiverPhoto',
          message: sentMessage.message?.substring(0, 50),
          createdAt: sentMessage.createdAt,
        });
        
        // Verificación clara de la información recibida
        if (hasSenderName && hasSenderPhoto) {
          console.log('✅ [MARKETPLACE] ✅✅✅ INFORMACIÓN COMPLETA DEL REMITENTE RECIBIDA ✅✅✅');
          console.log('✅ [MARKETPLACE] senderName:', sentMessage.senderName);
          console.log('✅ [MARKETPLACE] senderPhoto:', sentMessage.senderPhoto);
        } else {
          console.warn('⚠️ [MARKETPLACE] ⚠️⚠️⚠️ FALTA INFORMACIÓN DEL REMITENTE ⚠️⚠️⚠️');
          if (!hasSenderName) console.warn('⚠️ [MARKETPLACE] Falta senderName');
          if (!hasSenderPhoto) console.warn('⚠️ [MARKETPLACE] Falta senderPhoto');
        }
      }
      
      // Si la respuesta es un array, tomar el primer elemento
      if (Array.isArray(sentMessage) && sentMessage.length > 0) {
        sentMessage = sentMessage[0];
      }
      
      // Si sentMessage no es un objeto válido, intentar construir uno desde los datos disponibles
      if (!sentMessage || typeof sentMessage !== 'object') {
        console.warn('⚠️ [MARKETPLACE] Respuesta no tiene formato esperado, intentando construir mensaje...');
        console.warn('⚠️ [MARKETPLACE] Tipo de respuesta:', typeof sentMessage);
        console.warn('⚠️ [MARKETPLACE] Contenido de data:', data);
        
        // Si data tiene los campos necesarios directamente, usarlos
        if (data.id || data.message || data.productId) {
          sentMessage = {
            id: data.id || `msg_${Date.now()}`,
            productId: data.productId || productId,
            productTitle: data.productTitle || '',
            senderId: data.senderId || data.userId || '',
            senderName: data.senderName || data.userName || 'Usuario',
            senderPhoto: data.senderPhoto || data.userPhoto,
            receiverId: data.receiverId || '',
            receiverName: data.receiverName || '',
            message: data.message || message,
            isRead: data.isRead || false,
            createdAt: data.createdAt || new Date().toISOString(),
          };
        } else {
          console.error('❌ [MARKETPLACE] No se pudo construir mensaje desde la respuesta');
          throw new Error('Error enviando mensaje: respuesta inválida');
        }
      }
      
      // Validar que el mensaje tenga los campos mínimos necesarios
      if (!sentMessage.id || !sentMessage.message) {
        console.warn('⚠️ [MARKETPLACE] Mensaje construido pero faltan campos:', sentMessage);
        // Aún así intentar retornar el mensaje con valores por defecto
        sentMessage = {
          ...sentMessage,
          id: sentMessage.id || `msg_${Date.now()}`,
          message: sentMessage.message || message,
          createdAt: sentMessage.createdAt || new Date().toISOString(),
        };
      }
      
      console.log('✅ [MARKETPLACE] Mensaje enviado exitosamente:', sentMessage.id);
      console.log('📋 [MARKETPLACE] Información del mensaje enviado:', {
        id: sentMessage.id,
        senderId: sentMessage.senderId,
        senderName: sentMessage.senderName || 'NO TIENE senderName',
        senderPhoto: sentMessage.senderPhoto || 'NO TIENE senderPhoto',
        receiverId: sentMessage.receiverId,
        receiverName: sentMessage.receiverName || 'NO TIENE receiverName',
        message: sentMessage.message?.substring(0, 50),
        createdAt: sentMessage.createdAt,
        allKeys: Object.keys(sentMessage),
      });
      
      // Verificar si el mensaje tiene la información necesaria
      if (!sentMessage.senderName || sentMessage.senderName === 'Usuario') {
        console.warn('⚠️ [MARKETPLACE] ⚠️⚠️⚠️ EL MENSAJE NO TIENE senderName VÁLIDO ⚠️⚠️⚠️');
        console.warn('⚠️ [MARKETPLACE] El backend debe enviar senderName en la respuesta de sendMessage');
      }
      if (!sentMessage.senderPhoto) {
        console.warn('⚠️ [MARKETPLACE] ⚠️⚠️⚠️ EL MENSAJE NO TIENE senderPhoto ⚠️⚠️⚠️');
        console.warn('⚠️ [MARKETPLACE] El backend debe enviar senderPhoto en la respuesta de sendMessage');
      }
      
      return sentMessage as MarketplaceMessage;
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en sendMessage:', error);
      throw error;
    }
  }

  // Reportar producto
  async reportProduct(productId: string, reason: string, description: string): Promise<void> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/reports`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({ productId, reason, description }),
        }
      );

      if (!response.ok) {
        throw new Error('Error reportando producto');
      }
    } catch (error) {
      console.error('Error en reportProduct:', error);
      throw error;
    }
  }

  // ===== CATEGORÍAS =====

  // Obtener categorías (con caché)
  async getCategories(forceRefresh: boolean = false): Promise<MarketplaceCategory[]> {
    try {
      // Si hay categorías en caché y no se fuerza el refresh, retornarlas
      if (cachedCategories && !forceRefresh) {
        console.log('📦 [MARKETPLACE] Usando categorías en caché');
        return cachedCategories;
      }

      console.log('🔄 [MARKETPLACE] Obteniendo categorías del servidor...');
      console.log('🔄 [MARKETPLACE] URL:', `${API_BASE_URL}/marketplace/categories`);
      
      const response = await fetch(
        `${API_BASE_URL}/marketplace/categories`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      console.log('📡 [MARKETPLACE] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [MARKETPLACE] Error response:', errorText);
        
        // Si el backend no está disponible, usar categorías por defecto
        if (response.status === 404) {
          console.warn('⚠️ [MARKETPLACE] Usando categorías por defecto (backend no disponible)');
          cachedCategories = DEFAULT_CATEGORIES;
          return DEFAULT_CATEGORIES;
        }
        throw new Error('Error obteniendo categorías');
      }

      const data = await response.json();
      console.log('📦 [MARKETPLACE] Data recibida:', JSON.stringify(data).substring(0, 200));
      const categories = data.data || data;
      
      // Ordenar por order
      categories.sort((a: MarketplaceCategory, b: MarketplaceCategory) => a.order - b.order);
      
      // Log detallado de categorías
      console.log('📋 [MARKETPLACE] Categorías recibidas del backend:');
      categories.forEach((cat: MarketplaceCategory, index: number) => {
        console.log(`  ${index + 1}. ${cat.name} (slug: ${cat.slug}, id: ${cat.id})`);
      });
      
      // Guardar en caché
      cachedCategories = categories;
      console.log('✅ [MARKETPLACE] Categorías cargadas:', categories.length);
      
      return categories;
    } catch (error) {
      console.error('❌ [MARKETPLACE] Error en getCategories:', error);
      console.error('❌ [MARKETPLACE] Error type:', error instanceof Error ? error.message : 'Unknown error');
      // En caso de error, retornar categorías por defecto
      console.warn('⚠️ [MARKETPLACE] Usando categorías por defecto debido a error');
      cachedCategories = DEFAULT_CATEGORIES;
      return DEFAULT_CATEGORIES;
    }
  }

  // Obtener detalle de una categoría
  async getCategoryById(categoryId: string): Promise<MarketplaceCategory | null> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/marketplace/categories/${categoryId}`,
        {
          method: 'GET',
          headers: await this.getHeaders(),
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      console.error('Error en getCategoryById:', error);
      return null;
    }
  }

  // Limpiar caché de categorías
  clearCategoriesCache(): void {
    cachedCategories = null;
  }
}

export default new MarketplaceService();

