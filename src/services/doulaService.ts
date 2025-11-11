import { axiosInstance as api } from './api';

// Tipos para el chat de doula
export interface DoulaMessage {
  id?: string;
  message: string;
  response?: string;
  timestamp?: string;
  isUser?: boolean;
}

export interface DoulaChatResponse {
  success: boolean;
  message: string;
  data?: {
    response: string;
    timestamp: string;
  };
}

// Servicio para el chat de DOULI
export const doulaService = {
  // Enviar mensaje al chat de DOULI
  sendMessage: async (message: string): Promise<DoulaChatResponse> => {
    
    try {
      const response = await api.post('/api/doula/chat', {
        message: message
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [DOULI] Error enviando mensaje:', error);
      throw error;
    }
  },

  // Obtener historial de chat (si el backend lo soporta)
  getChatHistory: async (): Promise<DoulaMessage[]> => {
    
    try {
      const response = await api.get('/api/doula/chat/history');
      return response.data.data || [];
    } catch (error) {
      console.error('❌ [DOULI] Error obteniendo historial:', error);
      // Si el endpoint no existe, retornar array vacío
      return [];
    }
  },

  // Limpiar historial de chat (si el backend lo soporta)
  clearChatHistory: async (): Promise<boolean> => {
    
    try {
      const response = await api.delete('/api/doula/chat/history');
      return true;
    } catch (error) {
      console.error('❌ [DOULI] Error limpiando historial:', error);
      return false;
    }
  }
};
