import { axiosInstance as api } from './api';
import analyticsService from './analyticsService';

// ============================================
// 🩺 SPECIALIST SERVICE
// ============================================

const specialistService = {
  // ===== CONSULTAS =====
  
  // Listar consultas (6.1 - status, urgency, type, page, limit)
  getConsultations: async (filters?: {
    status?: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
    urgency?: string;
    type?: 'chat' | 'video';
    page?: number;
    limit?: number;
  }) => {
    console.log('📋 [SPECIALIST] Obteniendo consultas...', filters);
    const response = await api.get('/api/specialist/consultations', { params: filters });
    console.log('✅ [SPECIALIST] Consultas obtenidas:', response.data);
    return response.data;
  },

  // Obtener detalle de consulta
  getConsultation: async (consultationId: string) => {
    console.log('📋 [SPECIALIST] Obteniendo consulta:', consultationId);
    const response = await api.get(`/api/specialist/consultations/${consultationId}`);
    console.log('✅ [SPECIALIST] Consulta obtenida:', response.data);
    return response.data;
  },

  // Obtener mensajes de consulta (especialista)
  getMessages: async (consultationId: string, limit?: number, before?: string) => {
    console.log('💬 [SPECIALIST] Obteniendo mensajes...', { consultationId, limit, before });
    const params: Record<string, unknown> = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;
    const response = await api.get(`/api/specialist/consultations/${consultationId}/messages`, { params });
    console.log('✅ [SPECIALIST] Mensajes obtenidos:', response.data);
    return response.data;
  },

  // Enviar mensaje (especialista)
  sendMessage: async (consultationId: string, message: string, attachments?: string[]) => {
    console.log('💬 [SPECIALIST] Enviando mensaje...', { consultationId, message: message.substring(0, 50) });
    const response = await api.post(`/api/specialist/consultations/${consultationId}/messages`, {
      message,
      attachments,
    });
    console.log('✅ [SPECIALIST] Mensaje enviado:', response.data);
    return response.data;
  },

  // Aceptar consulta (scheduledFor, estimatedResponseTime en minutos)
  acceptConsultation: async (
    consultationId: string,
    scheduledFor?: string,
    estimatedResponseTime?: number
  ) => {
    console.log('✅ [SPECIALIST] Aceptando consulta:', consultationId, { scheduledFor, estimatedResponseTime });
    
    const body: Record<string, unknown> = {};
    if (scheduledFor) body.scheduledFor = scheduledFor;
    if (estimatedResponseTime != null) body.estimatedResponseTime = estimatedResponseTime;
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/accept`, body);
    
    console.log('✅ [SPECIALIST] Consulta aceptada:', response.data);
    
    analyticsService.logEvent('specialist_consultation_accepted', {
      consultation_id: consultationId,
      scheduled: !!scheduledFor,
    });
    
    return response.data;
  },

  // Rechazar consulta
  rejectConsultation: async (consultationId: string, reason?: string) => {
    console.log('❌ [SPECIALIST] Rechazando consulta:', consultationId, { reason });
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/reject`, {
      reason,
    });
    
    console.log('✅ [SPECIALIST] Consulta rechazada:', response.data);
    
    analyticsService.logEvent('specialist_consultation_rejected', {
      consultation_id: consultationId,
      has_reason: !!reason,
    });
    
    return response.data;
  },

  // Iniciar consulta
  startConsultation: async (consultationId: string) => {
    console.log('▶️ [SPECIALIST] Iniciando consulta:', consultationId);
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/start`);
    
    console.log('✅ [SPECIALIST] Consulta iniciada:', response.data);
    
    analyticsService.logEvent('specialist_consultation_started', {
      consultation_id: consultationId,
    });
    
    return response.data;
  },

  // Completar consulta (6.6 - diagnosis y treatment obligatorios)
  completeConsultation: async (consultationId: string, outcome: {
    diagnosis: string;
    treatment: string;
    notes?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
    prescriptions?: Array<{
      medication: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
  }) => {
    console.log('✔️ [SPECIALIST] Completando consulta:', consultationId, outcome);
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/complete`, outcome);
    
    console.log('✅ [SPECIALIST] Consulta completada:', response.data);
    
    analyticsService.logEvent('specialist_consultation_completed', {
      consultation_id: consultationId,
      has_diagnosis: !!outcome.diagnosis,
      has_treatment: !!outcome.treatment,
      follow_up_required: outcome.followUpRequired,
    });
    
    return response.data;
  },

  // Historial de consultas
  getHistory: async (page: number = 1, limit: number = 20) => {
    console.log('📚 [SPECIALIST] Obteniendo historial...', { page, limit });
    const response = await api.get('/api/specialist/consultations/history', {
      params: { page, limit },
    });
    console.log('✅ [SPECIALIST] Historial obtenido:', response.data);
    return response.data;
  },

  // ===== DISPONIBILIDAD =====
  
  // Obtener disponibilidad
  getAvailability: async () => {
    console.log('📅 [SPECIALIST] Obteniendo disponibilidad...');
    const response = await api.get('/api/specialist/availability');
    console.log('✅ [SPECIALIST] Disponibilidad obtenida:', response.data);
    return response.data;
  },

  // Actualizar disponibilidad
  updateAvailability: async (data: {
    schedule: Record<string, string[]>;
    timezone: string;
    maxConsultationsPerDay: number;
  }) => {
    console.log('📅 [SPECIALIST] Actualizando disponibilidad...', data);
    const response = await api.put('/api/specialist/availability', data);
    console.log('✅ [SPECIALIST] Disponibilidad actualizada:', response.data);
    
    analyticsService.logEvent('specialist_availability_updated', {
      days_active: Object.keys(data.schedule).length,
      max_per_day: data.maxConsultationsPerDay,
    });
    
    return response.data;
  },

  // ===== PRECIOS =====
  
  // Actualizar precios
  updatePricing: async (data: {
    chatConsultation: number;
    videoConsultation: number;
    currency?: string;
    acceptsFreeConsultations?: boolean;
  }) => {
    console.log('💰 [SPECIALIST] Actualizando precios...', data);
    const response = await api.put('/api/specialist/pricing', data);
    console.log('✅ [SPECIALIST] Precios actualizados:', response.data);
    
    analyticsService.logEvent('specialist_pricing_updated', {
      chat_price: data.chatConsultation,
      video_price: data.videoConsultation,
    });
    
    return response.data;
  },

  // ===== ESTADÍSTICAS =====
  
  // Obtener estadísticas
  getStats: async (period: 'week' | 'month' | 'all' = 'month') => {
    console.log('📊 [SPECIALIST] Obteniendo estadísticas...', { period });
    const response = await api.get('/api/specialist/stats', { params: { period } });
    console.log('✅ [SPECIALIST] Estadísticas obtenidas:', response.data);
    return response.data;
  },

  // ===== CUPONES =====
  
  // Obtener cupones activos
  getCoupons: async () => {
    console.log('🎁 [SPECIALIST] Obteniendo cupones...');
    const response = await api.get('/api/specialist/coupons');
    console.log('✅ [SPECIALIST] Cupones obtenidos:', response.data);
    return response.data;
  },
};

export default specialistService;
