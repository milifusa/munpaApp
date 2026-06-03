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
    const response = await api.get('/api/marketplace/my-products', { params: filters });
    return response.data;
  },

  // Cambiar estado del producto
  updateProductStatus: async (productId: string, status: string) => {
    const response = await api.patch(`/api/marketplace/products/${productId}/status`, { status });
    
    analyticsService.logEvent('vendor_product_status_updated', {
      product_id: productId,
      status,
    });
    
    return response.data;
  },

  // Eliminar producto
  deleteProduct: async (productId: string) => {
    const response = await api.delete(`/api/marketplace/products/${productId}`);
    
    analyticsService.logEvent('vendor_product_deleted', {
      product_id: productId,
    });
    
    return response.data;
  },

  // ===== CATEGORÍAS PROPIAS =====
  
  // Listar mis categorías
  getCategories: async () => {
    const response = await api.get('/api/vendor/categories');
    return response.data;
  },

  // Crear categoría
  createCategory: async (data: {
    name: string;
    description?: string;
  }) => {
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
    const response = await api.put(`/api/vendor/categories/${categoryId}`, data);
    
    analyticsService.logEvent('vendor_category_updated', {
      category_id: categoryId,
    });
    
    return response.data;
  },

  // Eliminar categoría
  deleteCategory: async (categoryId: string) => {
    const response = await api.delete(`/api/vendor/categories/${categoryId}`);
    
    analyticsService.logEvent('vendor_category_deleted', {
      category_id: categoryId,
    });
    
    return response.data;
  },

  // ===== DESCUENTOS =====
  
  // Listar mis descuentos
  getDiscounts: async () => {
    const response = await api.get('/api/vendor/discounts');
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
    const response = await api.put(`/api/vendor/discounts/${discountId}`, data);
    
    analyticsService.logEvent('vendor_discount_updated', {
      discount_id: discountId,
    });
    
    return response.data;
  },

  // Eliminar descuento
  deleteDiscount: async (discountId: string) => {
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
    const response = await api.post('/api/vendor/discounts/validate', data);
    return response.data;
  },

  // ===== VENTAS Y ESTADÍSTICAS =====
  
  // Historial de ventas
  getSales: async (page: number = 1, limit: number = 20) => {
    const response = await api.get('/api/vendor/sales', { params: { page, limit } });
    return response.data;
  },

  // Estadísticas
  getStats: async (period: 'week' | 'month' | 'all' = 'month') => {
    const response = await api.get('/api/vendor/stats', { params: { period } });
    return response.data;
  },

  // Promociones activas
  getPromotions: async () => {
    const response = await api.get('/api/vendor/promotions');
    return response.data;
  },

  // ===== HORARIO DE APERTURA =====
  
  // Obtener horario
  getHours: async () => {
    const response = await api.get('/api/vendor/hours');
    return response.data;
  },

  // Actualizar horario
  updateHours: async (data: {
    schedule: Record<string, { open: string; close: string } | null>;
    timezone: string;
  }) => {
    const response = await api.put('/api/vendor/hours', data);
    
    analyticsService.logEvent('vendor_hours_updated', {
      days_active: Object.keys(data.schedule).filter(k => data.schedule[k] !== null).length,
    });
    
    return response.data;
  },

  // ===== MENSAJES =====
  
  // Obtener mensajes
  getMessages: async () => {
    const response = await api.get('/api/marketplace/messages');
    return response.data;
  },

  // Mensajes de un producto específico
  getProductMessages: async (productId: string) => {
    const response = await api.get(`/api/marketplace/messages/${productId}`);
    return response.data;
  },

  // Marcar mensaje como leído
  markMessageAsRead: async (messageId: string) => {
    const response = await api.patch(`/api/marketplace/messages/${messageId}/read`);
    return response.data;
  },

  // ===== CHECKOUT (STRIPE) =====
  
  // Crear PaymentIntent para orden vendor (Stripe)
  createCheckoutIntent: async (items: Array<{ productId: string; quantity: number }>) => {
    const response = await api.post('/api/vendor/orders/checkout/create-intent', { items });
    return response.data;
  },

  // ===== TRANSACCIONES =====
  
  // Obtener transacciones
  getTransactions: async () => {
    const response = await api.get('/api/marketplace/transactions');
    return response.data;
  },
};

export default vendorService;
