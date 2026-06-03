import { axiosInstance as api } from './api';
import { Post, Attendee, CreatePostData } from '../types/posts';

export interface EventsFilter {
  filter?: 'upcoming' | 'past' | 'all';
  page?: number;
  limit?: number;
}

export interface AttendeesResponse {
  attendees: Attendee[];
  attendeeCount: number;
  maxAttendees?: number;
  spotsAvailable?: number;
}

class EventsService {
  /**
   * Confirmar asistencia a un evento
   * Si el evento está lleno, se agrega a lista de espera automáticamente
   */
  async attendEvent(postId: string): Promise<{ 
    attendeeCount: number; 
    userAttending: boolean;
    userInWaitlist?: boolean;
    waitlistCount?: number;
    message?: string;
  }> {
    
    try {
      const response = await api.post(`/api/posts/${postId}/attend`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error confirmando asistencia:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancelar asistencia a un evento
   */
  async cancelAttendance(postId: string): Promise<{ attendeeCount: number; userAttending: boolean }> {
    
    try {
      const response = await api.delete(`/api/posts/${postId}/attend`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error cancelando asistencia:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener lista de asistentes de un evento
   */
  async getAttendees(postId: string): Promise<AttendeesResponse> {
    
    try {
      const response = await api.get(`/api/posts/${postId}/attendees`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error obteniendo asistentes:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener eventos de una comunidad
   */
  async getCommunityEvents(communityId: string, filters: EventsFilter = {}): Promise<{ data: Post[]; pagination: any }> {
    
    try {
      const params = new URLSearchParams();
      if (filters.filter) params.append('filter', filters.filter);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());

      const queryString = params.toString();
      const url = `/api/communities/${communityId}/events${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      return {
        data: response.data.data || response.data || [],
        pagination: response.data.pagination || null,
      };
    } catch (error: any) {
      console.error('❌ [EVENTS] Error obteniendo eventos:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Actualizar un evento (solo el autor puede hacerlo)
   */
  async updateEvent(postId: string, data: Partial<CreatePostData>): Promise<Post> {
    
    try {
      const response = await api.put(`/api/posts/${postId}`, data);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error actualizando evento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Cancelar un evento (cambia status a 'cancelled')
   */
  async cancelEvent(postId: string): Promise<Post> {
    
    try {
      const response = await api.put(`/api/posts/${postId}`, {
        eventData: {
          status: 'cancelled'
        }
      });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error cancelando evento:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Verificar si un evento está lleno
   */
  isEventFull(event: Post): boolean {
    if (!event.eventData) return false;
    if (!event.eventData.maxAttendees) return false;
    return event.eventData.attendeeCount >= event.eventData.maxAttendees;
  }

  /**
   * Verificar si un evento ya pasó
   */
  isEventPast(event: Post): boolean {
    if (!event.eventData) return false;
    
    try {
      let eventDate: Date;
      
      if (event.eventData.eventDate._seconds) {
        eventDate = new Date(event.eventData.eventDate._seconds * 1000);
      } else {
        eventDate = new Date(event.eventData.eventDate);
      }
      
      return eventDate < new Date();
    } catch (error) {
      console.error('Error verificando si el evento pasó:', error);
      return false;
    }
  }

  /**
   * Formatear fecha del evento
   */
  formatEventDate(eventDate: any): string {
    try {
      let date: Date;
      
      if (eventDate._seconds) {
        date = new Date(eventDate._seconds * 1000);
      } else {
        date = new Date(eventDate);
      }
      
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formateando fecha del evento:', error);
      return 'Fecha no disponible';
    }
  }

  /**
   * Obtener tiempo restante hasta el evento
   */
  getTimeUntilEvent(eventDate: any): string {
    try {
      let date: Date;
      
      if (eventDate._seconds) {
        date = new Date(eventDate._seconds * 1000);
      } else {
        date = new Date(eventDate);
      }
      
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      
      if (diff < 0) {
        return 'Evento pasado';
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      if (days > 0) {
        return `En ${days} día${days !== 1 ? 's' : ''}`;
      } else if (hours > 0) {
        return `En ${hours} hora${hours !== 1 ? 's' : ''}`;
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `En ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
      }
    } catch (error) {
      console.error('Error calculando tiempo hasta el evento:', error);
      return '';
    }
  }

  // ========================================
  // NUEVAS FUNCIONALIDADES
  // ========================================

  /**
   * Salir de la lista de espera
   */
  async leaveWaitlist(postId: string): Promise<{ waitlistCount: number; userInWaitlist: boolean }> {
    
    try {
      const response = await api.delete(`/api/posts/${postId}/waitlist`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error saliendo de lista de espera:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Generar código QR para check-in (solo organizador)
   */
  async generateQRCode(postId: string): Promise<{
    postId: string;
    eventTitle: string;
    checkInCode: string;
    checkInUrl: string;
    qrData: string;
  }> {
    
    try {
      const response = await api.get(`/api/posts/${postId}/qr-code`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error generando QR:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Hacer check-in en el evento (escanear QR o ingresar código)
   */
  async checkIn(postId: string, code: string): Promise<{
    postId: string;
    checkedInCount: number;
    userCheckedIn: boolean;
    checkInTime: string;
  }> {
    
    try {
      const response = await api.post(`/api/posts/${postId}/checkin`, { code });
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error en check-in:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener URL de Google Calendar para agregar el evento
   */
  async getGoogleCalendarUrl(postId: string): Promise<{
    googleCalendarUrl: string;
    eventTitle: string;
    eventDate: string;
    eventEndDate?: string;
  }> {
    
    try {
      const response = await api.get(`/api/posts/${postId}/calendar/google`);
      return response.data.data || response.data;
    } catch (error: any) {
      console.error('❌ [EVENTS] Error obteniendo URL de Google Calendar:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Obtener URL para descargar archivo .ics
   */
  getICSFileUrl(postId: string): string {
    // La URL del backend para descargar el archivo .ics
    return `/api/posts/${postId}/calendar`;
  }
}

export default new EventsService();
