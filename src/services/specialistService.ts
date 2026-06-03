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
    const response = await api.get('/api/specialist/consultations', { params: filters });
    return response.data;
  },

  // Obtener detalle de consulta
  getConsultation: async (consultationId: string) => {
    const response = await api.get(`/api/specialist/consultations/${consultationId}`);
    return response.data;
  },

  // Obtener mensajes de consulta (especialista)
  getMessages: async (consultationId: string, limit?: number, before?: string) => {
    const params: Record<string, unknown> = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;
    const response = await api.get(`/api/specialist/consultations/${consultationId}/messages`, { params });
    return response.data;
  },

  // Enviar mensaje (especialista)
  sendMessage: async (consultationId: string, message: string, attachments?: string[]) => {
    const response = await api.post(`/api/specialist/consultations/${consultationId}/messages`, {
      message,
      attachments,
    });
    return response.data;
  },

  // Aceptar consulta (scheduledFor, estimatedResponseTime en minutos)
  acceptConsultation: async (
    consultationId: string,
    scheduledFor?: string,
    estimatedResponseTime?: number
  ) => {
    
    const body: Record<string, unknown> = {};
    if (scheduledFor) body.scheduledFor = scheduledFor;
    if (estimatedResponseTime != null) body.estimatedResponseTime = estimatedResponseTime;
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/accept`, body);
    
    
    analyticsService.logEvent('specialist_consultation_accepted', {
      consultation_id: consultationId,
      scheduled: !!scheduledFor,
    });
    
    return response.data;
  },

  // Rechazar consulta
  rejectConsultation: async (consultationId: string, reason?: string) => {
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/reject`, {
      reason,
    });
    
    
    analyticsService.logEvent('specialist_consultation_rejected', {
      consultation_id: consultationId,
      has_reason: !!reason,
    });
    
    return response.data;
  },

  // Iniciar consulta
  startConsultation: async (consultationId: string) => {
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/start`);
    
    
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
    
    const response = await api.post(`/api/specialist/consultations/${consultationId}/complete`, outcome);
    
    
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
    const response = await api.get('/api/specialist/consultations/history', {
      params: { page, limit },
    });
    return response.data;
  },

  // ===== DISPONIBILIDAD =====
  
  // Obtener disponibilidad
  getAvailability: async () => {
    const response = await api.get('/api/specialist/availability');
    return response.data;
  },

  // Actualizar disponibilidad
  updateAvailability: async (data: {
    schedule: Record<string, string[]>;
    timezone: string;
    maxConsultationsPerDay: number;
  }) => {
    const response = await api.put('/api/specialist/availability', data);
    
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
    const response = await api.put('/api/specialist/pricing', data);
    
    analyticsService.logEvent('specialist_pricing_updated', {
      chat_price: data.chatConsultation,
      video_price: data.videoConsultation,
    });
    
    return response.data;
  },

  // ===== ESTADÍSTICAS =====
  
  // Obtener estadísticas
  getStats: async (period: 'week' | 'month' | 'all' = 'month') => {
    const response = await api.get('/api/specialist/stats', { params: { period } });
    return response.data;
  },

  // ===== CUPONES =====
  
  // Obtener cupones activos
  getCoupons: async () => {
    const response = await api.get('/api/specialist/coupons');
    return response.data;
  },
};

export default specialistService;
