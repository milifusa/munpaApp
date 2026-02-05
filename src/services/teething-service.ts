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

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface ToothEvent {
  id: string;
  toothId: string;
  toothName: string;
  type: 'erupt' | 'shed';
  occurredAt: string;
  symptoms?: string[];
  notes?: string;
  notifyToothFairy?: boolean;
  createdBy: {
    uid: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ToothState {
  id: string;
  name: string;
  arch: 'upper' | 'lower';
  type: 'incisor' | 'canine' | 'molar';
  eruptRangeMonths: [number, number];
  shedRangeYears: [number, number];
  status: 'none' | 'erupted' | 'shed';
  lastEvent: {
    type: 'erupt' | 'shed';
    occurredAt: string;
  } | null;
}

export interface TeethingSummary {
  ageMonths: number;
  teeth: ToothState[];
  timeline: ToothEvent[];
}

export interface TeethingSummaryResponse {
  success: boolean;
  data: TeethingSummary;
}

export interface CreateTeethingEventPayload {
  toothId: string;
  type: 'erupt' | 'shed';
  occurredAt: string;
  symptoms?: string[];
  notes?: string;
}

const teethingService = {
  // Obtener resumen de dentición
  async getSummary(childId: string): Promise<TeethingSummaryResponse> {
    const response = await api.get(`/children/${childId}/teething/summary`);
    return response.data;
  },

  // Obtener eventos por mes
  async getEventsByMonth(childId: string, month?: number) {
    const params = month ? { month } : {};
    const response = await api.get(`/children/${childId}/teething/events`, { params });
    return response.data;
  },

  // Crear evento de dentición
  async createEvent(childId: string, payload: CreateTeethingEventPayload): Promise<ToothEvent> {
    const response = await api.post(`/children/${childId}/teething/events`, payload);
    return response.data;
  },

  // Actualizar evento de dentición
  async updateEvent(
    childId: string, 
    eventId: string, 
    payload: Partial<CreateTeethingEventPayload>
  ): Promise<ToothEvent> {
    const response = await api.put(`/children/${childId}/teething/events/${eventId}`, payload);
    return response.data;
  },

  // Eliminar evento de dentición
  async deleteEvent(childId: string, eventId: string): Promise<void> {
    await api.delete(`/children/${childId}/teething/events/${eventId}`);
  },
};

export default teethingService;
