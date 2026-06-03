import { axiosInstance as api } from './api';

// ============================================
// 📋 INTERFACES
// ============================================

export interface Symptom {
  id: string;
  name: string;
  description: string;
  imageUrl?: string;
  category: 'general' | 'digestivo' | 'respiratorio' | 'piel' | 'neurologico' | 'ojos_oidos' | 'otros';
  severity: 'mild' | 'moderate' | 'severe';
  order?: number;
  isActive: boolean;
}

export interface Specialist {
  id: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  phone?: string;
  bio?: string;
  specialties: string[];
  licenseNumber?: string;
  university?: string;
  yearsExperience?: number;
  certifications?: string[];
  pricing: {
    chatConsultation: number;
    videoConsultation: number;
    currency: string;
    acceptsFreeConsultations?: boolean;
  };
  availability?: {
    schedule?: Record<string, string[]>;
    timezone?: string;
    maxConsultationsPerDay?: number;
  };
  stats?: {
    totalConsultations: number;
    averageRating: number;
    responseTime: number;
    completionRate: number;
  };
  status: 'active' | 'inactive';
}

export interface Consultation {
  id: string;
  parentId: string;
  childId: string;
  childName?: string;
  specialistId?: string;
  specialistName?: string;
  specialistPhoto?: string;
  type: 'chat' | 'video';
  status: 'awaiting_payment' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  request: {
    description: string;
    photos?: string[];
    symptoms?: string[];
    urgency: 'low' | 'normal' | 'high';
  };
  pricing: {
    basePrice: number;
    discount: number;
    finalPrice: number;
    isFree: boolean;
    couponCode?: string;
  };
  payment?: {
    method?: string;
    transactionId?: string;
    status?: 'pending' | 'completed' | 'failed';
    paidAt?: string;
  };
  schedule?: {
    requestedAt: string;
    acceptedAt?: string;
    scheduledFor?: string;
    startedAt?: string;
    completedAt?: string;
  };
  chat?: {
    channelId?: string;
    messageCount: number;
  };
  video?: {
    roomId?: string;
    duration?: number;
  };
  outcome?: {
    diagnosis?: string;
    treatment?: string;
    prescriptions?: any[];
    notes?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
  };
  // API 'result' cuando la consulta está completada
  result?: {
    diagnosis?: string;
    treatment?: string;
    prescriptions?: Array<{
      medication?: string;
      dosage?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    notes?: string;
    followUpRequired?: boolean;
    followUpDate?: string;
    completedAt?: string;
  };
  rating?: {
    score?: number;
    comment?: string;
    ratedAt?: string;
  };
  canPrescribe?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderType: 'parent' | 'specialist';
  senderName?: string;
  senderPhoto?: string;
  message: string;
  attachments?: string[];
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free';
  value: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  applicableTo: 'all' | 'chat' | 'video' | 'specific_specialist';
  specialistId?: string;
  isActive: boolean;
}

export interface PriceCalculation {
  basePrice: number;
  discount: number;
  finalPrice: number;
  currency: string;
  coupon?: {
    code: string;
    type: string;
    value: number;
  };
  isFree: boolean;
}

// ============================================
// 🩺 CONSULTATIONS SERVICE
// ============================================

const consultationsService = {
  // ===== SÍNTOMAS =====
  
  // Listar síntomas activos (App)
  getSymptoms: async (category?: string) => {
    const params = category ? { category } : {};
    const response = await api.get('/api/symptoms', { params });
    return response.data;
  },

  // ===== ESPECIALISTAS =====
  
  // Listar especialistas disponibles (App)
  getSpecialists: async (specialty?: string, available?: boolean) => {
    const params: any = {};
    if (specialty) params.specialty = specialty;
    if (available !== undefined) params.available = available;
    
    const response = await api.get('/api/specialists', { params });
    return response.data;
  },

  // Obtener especialista por ID (App)
  getSpecialist: async (specialistId: string) => {
    const response = await api.get(`/api/specialists/${specialistId}`);
    return response.data;
  },

  // ===== CUPONES =====
  
  // Verificar cupón (App)
  verifyCoupon: async (code: string, type?: 'chat' | 'video', specialistId?: string) => {
    const params: any = {};
    if (type) params.type = type;
    if (specialistId) params.specialistId = specialistId;
    
    const response = await api.get(`/api/coupons/verify/${code}`, { params });
    return response.data;
  },

  // Calcular precio con descuento (App)
  calculatePrice: async (type: 'chat' | 'video', specialistId?: string, couponCode?: string) => {
    const response = await api.post('/api/consultations/calculate-price', {
      type,
      specialistId,
      couponCode,
    });
    return response.data;
  },

  // ===== CONSULTAS =====
  
  // Crear consulta (App)
  createConsultation: async (childId: string, data: {
    description: string;
    photos?: string[];
    symptoms?: string[];
    type: 'chat' | 'video';
    urgency?: 'low' | 'normal' | 'high';
    preferredSpecialistId?: string;
    couponCode?: string;
  }) => {
    
    // Intentar primero con el endpoint estándar
    try {
      const response = await api.post(`/api/children/${childId}/consultations`, data);
      return response.data;
    } catch (error: any) {
      console.error('⚠️ [CONSULTATIONS] Error con endpoint estándar, intentando alternativo...', error.response?.status);
      
      // Si falla con 404, intentar con childId en el body
      if (error.response?.status === 404) {
        const response = await api.post('/api/consultations', {
          childId,
          ...data,
        });
        return response.data;
      }
      
      throw error;
    }
  },

  // Listar consultas del usuario (App)
  getConsultations: async (filters?: {
    status?: string;
    childId?: string;
    page?: number;
    limit?: number;
  }) => {
    const path = '/api/consultations';
    const baseURL = api.defaults.baseURL || 'https://api.munpa.online';
    const params = filters ? Object.fromEntries(Object.entries(filters).filter(([, v]) => v != null)) : {};
    const fullUrl = Object.keys(params).length > 0
      ? `${baseURL}${path}?${new URLSearchParams(params as Record<string, string>).toString()}`
      : `${baseURL}${path}`;
    const response = await api.get(path, { params: filters });
    return response.data;
  },

  // Obtener detalles de consulta (App)
  getConsultation: async (consultationId: string) => {
    const response = await api.get(`/api/consultations/${consultationId}`);
    return response.data;
  },

  // Cancelar consulta (App)
  cancelConsultation: async (consultationId: string, reason?: string) => {
    const response = await api.delete(`/api/consultations/${consultationId}`, {
      data: { reason },
    });
    return response.data;
  },

  // Crear PaymentIntent para Stripe (consultas)
  createPaymentIntent: async (consultationId: string) => {
    const response = await api.post(`/api/consultations/${consultationId}/payment/create-intent`);
    return response.data;
  },

  // Procesar pago (App) - legacy / pago simulado
  processPayment: async (consultationId: string, paymentData: {
    paymentMethod: 'stripe' | 'payphone' | 'transfer';
    paymentToken?: string;
  }) => {
    const response = await api.post(`/api/consultations/${consultationId}/payment`, paymentData);
    return response.data;
  },

  // ===== CHAT =====
  
  // Enviar mensaje (App)
  sendMessage: async (consultationId: string, message: string, attachments?: string[]) => {
    const response = await api.post(`/api/consultations/${consultationId}/messages`, {
      message,
      attachments,
    });
    return response.data;
  },

  // Obtener mensajes (App)
  getMessages: async (consultationId: string, limit?: number, before?: string) => {
    const params: any = {};
    if (limit) params.limit = limit;
    if (before) params.before = before;
    
    const response = await api.get(`/api/consultations/${consultationId}/messages`, { params });
    return response.data;
  },

  // Marcar mensaje como leído (App)
  markMessageAsRead: async (consultationId: string, messageId: string) => {
    const response = await api.patch(`/api/consultations/${consultationId}/messages/${messageId}/read`);
    return response.data;
  },

  // ===== VIDEOLLAMADAS =====
  // Padre y médico usan los mismos endpoints: /api/consultations/:id/video/...

  // Unirse a videollamada (Padre y médico - mismo endpoint)
  joinVideo: async (consultationId: string) => {
    const response = await api.post(`/api/consultations/${consultationId}/video/join`);
    return response.data;
  },

  // Iniciar videollamada (alias de join - mismo endpoint)
  startVideo: async (consultationId: string) => {
    return api.post(`/api/consultations/${consultationId}/video/join`).then((r) => r.data);
  },

  // Finalizar videollamada (Padre y médico - mismo endpoint)
  endVideo: async (consultationId: string, duration: number) => {
    const response = await api.post(`/api/consultations/${consultationId}/video/end`, { duration });
    return response.data;
  },

  // ===== CALIFICACIONES =====
  
  // Calificar consulta (App)
  rateConsultation: async (consultationId: string, rating: {
    score: number;
    comment?: string;
  }) => {
    const response = await api.post(`/api/consultations/${consultationId}/rating`, rating);
    return response.data;
  },
};

// ============================================
// 📊 CONSTANTES
// ============================================

export const SYMPTOM_CATEGORIES = {
  general: {
    name: 'General',
    icon: '🌡️',
    color: '#FF9244',
  },
  digestivo: {
    name: 'Digestivo',
    icon: '🍼',
    color: '#96d2d3',
  },
  respiratorio: {
    name: 'Respiratorio',
    icon: '🫁',
    color: '#887CBC',
  },
  piel: {
    name: 'Piel',
    icon: '🧴',
    color: '#F08EB7',
  },
  neurologico: {
    name: 'Neurológico',
    icon: '🧠',
    color: '#B4C14B',
  },
  ojos_oidos: {
    name: 'Ojos y Oídos',
    icon: '👁️',
    color: '#FF9244',
  },
  otros: {
    name: 'Otros',
    icon: '⚕️',
    color: '#96d2d3',
  },
};

export const SPECIALTIES = [
  { id: 'pediatra', name: 'Pediatra General', icon: '👶' },
  { id: 'neonatologo', name: 'Neonatólogo', icon: '🍼' },
  { id: 'neurologo', name: 'Neurólogo Pediátrico', icon: '🧠' },
  { id: 'cardiologo', name: 'Cardiólogo Pediátrico', icon: '❤️' },
  { id: 'odontopediatra', name: 'Odontopediatra', icon: '🦷' },
  { id: 'oftalmologo', name: 'Oftalmólogo', icon: '👀' },
  { id: 'traumatologo', name: 'Traumatólogo', icon: '🦴' },
  { id: 'dermatologo', name: 'Dermatólogo', icon: '🧴' },
  { id: 'nutricionista', name: 'Nutricionista', icon: '🍎' },
  { id: 'psicologo', name: 'Psicólogo Infantil', icon: '🧠' },
];

export const URGENCY_LEVELS = {
  low: {
    name: 'Baja',
    color: '#10B981',
    responseTime: '2-4 horas',
    priority: 1,
  },
  normal: {
    name: 'Normal',
    color: '#3B82F6',
    responseTime: '30-60 min',
    priority: 2,
  },
  high: {
    name: 'Alta',
    color: '#EF4444',
    responseTime: '10-15 min',
    priority: 3,
    surcharge: 10,
  },
};

export default consultationsService;
