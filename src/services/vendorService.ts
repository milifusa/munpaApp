import { axiosInstance as api } from './api';
import analyticsService from './analyticsService';

// ============================================
// 🛒 VENDOR SERVICE
// ============================================

const vendorService = {
  // ===== PRODUCTOS =====
  
  // Mis productos
  getMyProducts: async (filters?: {
    status?: string;
    vendorCategoryId?: string;
    page?: number;
    limit?: number;
  }) => {
    console.log('📦 [VENDOR] Obteniendo mis productos...', filters);
    const response = await api.get('/api/marketplace/my-products', { params: filters });
    console.log('✅ [VENDOR] Productos obtenidos:', response.data);
    return response.data;
  },

  // Cambiar estado del producto
  updateProductStatus: async (productId: string, status: string) => {
    console.log('🔄 [VENDOR] Actualizando estado:', productId, status);
    const response = await api.patch(`/api/marketplace/products/${productId}/status`, { status });
    
    analyticsService.logEvent('vendor_product_status_updated', {
      product_id: productId,
      status,
    });
    
    return response.data;
  },

  // Eliminar producto
  deleteProduct: async (productId: string) => {
    console.log('🗑️ [VENDOR] Eliminando producto:', productId);
    const response = await api.delete(`/api/marketplace/products/${productId}`);
    
    analyticsService.logEvent('vendor_product_deleted', {
      product_id: productId,
    });
    
    return response.data;
  },

  // ===== CATEGORÍAS PROPIAS =====
  
  // Listar mis categorías
  getCategories: async () => {
    console.log('📁 [VENDOR] Obteniendo mis categorías...');
    const response = await api.get('/api/vendor/categories');
    console.log('✅ [VENDOR] Categorías obtenidas:', response.data);
    return response.data;
  },

  // Crear categoría
  createCategory: async (data: {
    name: string;
    description?: string;
  }) => {
    console.log('📁 [VENDOR] Creando categoría...', data);
    const response = await api.post('/api/vendor/categories', data);
    
    analyticsService.logEvent('vendor_category_created', {
      name: data.name,
    });
    
    return response.data;
  },

  // Actualizar categoría
  updateCategory: async (categoryId: string, data: {
    name?: string;
    description?: string;
    order?: number;
  }) => {
    console.log('📁 [VENDOR] Actualizando categoría:', categoryId, data);
    const response = await api.put(`/api/vendor/categories/${categoryId}`, data);
    
    analyticsService.logEvent('vendor_category_updated', {
      category_id: categoryId,
    });
    
    return response.data;
  },

  // Eliminar categoría
  deleteCategory: async (categoryId: string) => {
    console.log('🗑️ [VENDOR] Eliminando categoría:', categoryId);
    const response = await api.delete(`/api/vendor/categories/${categoryId}`);
    
    analyticsService.logEvent('vendor_category_deleted', {
      category_id: categoryId,
    });
    
    return response.data;
  },

  // ===== DESCUENTOS =====
  
  // Listar mis descuentos
  getDiscounts: async () => {
    console.log('🎁 [VENDOR] Obteniendo descuentos...');
    const response = await api.get('/api/vendor/discounts');
    console.log('✅ [VENDOR] Descuentos obtenidos:', response.data);
    return response.data;
  },

  // Crear descuento
  createDiscount: async (data: {
    name: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minPurchaseAmount?: number;
    validFrom: string;
    validUntil: string;
    maxUses?: number;
  }) => {
    console.log('🎁 [VENDOR] Creando descuento...', data);
    const response = await api.post('/api/vendor/discounts', data);
    
    analyticsService.logEvent('vendor_discount_created', {
      code: data.code,
      type: data.type,
      value: data.value,
    });
    
    return response.data;
  },

  // Actualizar descuento
  updateDiscount: async (discountId: string, data: any) => {
    console.log('🎁 [VENDOR] Actualizando descuento:', discountId, data);
    const response = await api.put(`/api/vendor/discounts/${discountId}`, data);
    
    analyticsService.logEvent('vendor_discount_updated', {
      discount_id: discountId,
    });
    
    return response.data;
  },

  // Eliminar descuento
  deleteDiscount: async (discountId: string) => {
    console.log('🗑️ [VENDOR] Eliminando descuento:', discountId);
    const response = await api.delete(`/api/vendor/discounts/${discountId}`);
    
    analyticsService.logEvent('vendor_discount_deleted', {
      discount_id: discountId,
    });
    
    return response.data;
  },

  // Validar código de descuento
  validateDiscount: async (data: {
    code: string;
    productId: string;
    amount: number;
  }) => {
    console.log('✅ [VENDOR] Validando descuento...', data);
    const response = await api.post('/api/vendor/discounts/validate', data);
    console.log('✅ [VENDOR] Descuento validado:', response.data);
    return response.data;
  },

  // ===== VENTAS Y ESTADÍSTICAS =====
  
  // Historial de ventas
  getSales: async (page: number = 1, limit: number = 20) => {
    console.log('💰 [VENDOR] Obteniendo ventas...', { page, limit });
    const response = await api.get('/api/vendor/sales', { params: { page, limit } });
    console.log('✅ [VENDOR] Ventas obtenidas:', response.data);
    return response.data;
  },

  // Estadísticas
  getStats: async (period: 'week' | 'month' | 'all' = 'month') => {
    console.log('📊 [VENDOR] Obteniendo estadísticas...', { period });
    const response = await api.get('/api/vendor/stats', { params: { period } });
    console.log('✅ [VENDOR] Estadísticas obtenidas:', response.data);
    return response.data;
  },

  // Promociones activas
  getPromotions: async () => {
    console.log('🏷️ [VENDOR] Obteniendo promociones...');
    const response = await api.get('/api/vendor/promotions');
    console.log('✅ [VENDOR] Promociones obtenidas:', response.data);
    return response.data;
  },

  // ===== HORARIO DE APERTURA =====
  
  // Obtener horario
  getHours: async () => {
    console.log('⏰ [VENDOR] Obteniendo horario...');
    const response = await api.get('/api/vendor/hours');
    console.log('✅ [VENDOR] Horario obtenido:', response.data);
    return response.data;
  },

  // Actualizar horario
  updateHours: async (data: {
    schedule: Record<string, { open: string; close: string } | null>;
    timezone: string;
  }) => {
    console.log('⏰ [VENDOR] Actualizando horario...', data);
    const response = await api.put('/api/vendor/hours', data);
    
    analyticsService.logEvent('vendor_hours_updated', {
      days_active: Object.keys(data.schedule).filter(k => data.schedule[k] !== null).length,
    });
    
    return response.data;
  },

  // ===== MENSAJES =====
  
  // Obtener mensajes
  getMessages: async () => {
    console.log('💬 [VENDOR] Obteniendo mensajes...');
    const response = await api.get('/api/marketplace/messages');
    console.log('✅ [VENDOR] Mensajes obtenidos:', response.data);
    return response.data;
  },

  // Mensajes de un producto específico
  getProductMessages: async (productId: string) => {
    console.log('💬 [VENDOR] Obteniendo mensajes del producto:', productId);
    const response = await api.get(`/api/marketplace/messages/${productId}`);
    console.log('✅ [VENDOR] Mensajes obtenidos:', response.data);
    return response.data;
  },

  // Marcar mensaje como leído
  markMessageAsRead: async (messageId: string) => {
    console.log('✅ [VENDOR] Marcando mensaje como leído:', messageId);
    const response = await api.patch(`/api/marketplace/messages/${messageId}/read`);
    return response.data;
  },

  // ===== CHECKOUT (STRIPE) =====
  
  // Crear PaymentIntent para orden vendor (Stripe)
  createCheckoutIntent: async (items: Array<{ productId: string; quantity: number }>) => {
    console.log('💳 [VENDOR] Creando checkout intent...', items);
    const response = await api.post('/api/vendor/orders/checkout/create-intent', { items });
    console.log('✅ [VENDOR] Checkout intent creado:', response.data);
    return response.data;
  },

  // ===== TRANSACCIONES =====
  
  // Obtener transacciones
  getTransactions: async () => {
    console.log('💳 [VENDOR] Obteniendo transacciones...');
    const response = await api.get('/api/marketplace/transactions');
    console.log('✅ [VENDOR] Transacciones obtenidas:', response.data);
    return response.data;
  },
};

export default vendorService;
