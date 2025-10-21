import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://mumpabackend-dmu43qca8-mishu-lojans-projects.vercel.app';

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

// Interceptor para manejar errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userData');
    }
    return Promise.reject(error);
  }
);

// ===== SERVICIOS DE APRENDIZAJE CONTINUO =====

const learningService = {
  // ===== CHAT CON DOULI (MEJORADO CON RAG) =====
  chatWithDouli: async (message: string, conversationId: string | null = null) => {
    try {
      console.log('🤖 [DOULI] Enviando mensaje:', message);
      
      const response = await api.post('/api/doula/chat', {
        message,
        conversationId
      });
      
      console.log('✅ [DOULI] Respuesta recibida:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [DOULI] Error en chat:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== FEEDBACK DEL USUARIO =====
  sendFeedback: async (conversationId: string, feedback: 'positive' | 'negative', details: any = {}) => {
    try {
      console.log('📝 [FEEDBACK] Enviando feedback:', feedback);
      
      const response = await api.post('/api/doula/feedback', {
        conversationId,
        feedback,
        details
      });
      
      console.log('✅ [FEEDBACK] Feedback enviado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [FEEDBACK] Error enviando feedback:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== MEMORIA DEL USUARIO =====
  updateUserMemory: async (notes: string[] = [], preferences: any = {}) => {
    try {
      console.log('🧠 [MEMORY] Actualizando memoria del usuario');
      
      const response = await api.put('/api/doula/memory', {
        notes,
        preferences
      });
      
      console.log('✅ [MEMORY] Memoria actualizada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [MEMORY] Error actualizando memoria:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== AGREGAR CONOCIMIENTO (ADMIN) =====
  addKnowledge: async (text: string, metadata: any = {}) => {
    try {
      console.log('📚 [KNOWLEDGE] Agregando conocimiento:', metadata.topic);
      
      const response = await api.post('/api/doula/knowledge', {
        text,
        metadata
      });
      
      console.log('✅ [KNOWLEDGE] Conocimiento agregado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [KNOWLEDGE] Error agregando conocimiento:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== APRENDIZAJE VALIDADO (POST /learn) =====
  learnValidatedKnowledge: async (text: string, metadata: any, validation: any) => {
    try {
      console.log('🔍 [LEARN] Aprendizaje validado:', metadata.topic);
      
      const response = await api.post('/api/doula/learn', {
        text,
        metadata,
        validation
      });
      
      console.log('✅ [LEARN] Conocimiento validado y aprendido:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [LEARN] Error en aprendizaje validado:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== TEST DE CALIDAD =====
  runQualityTest: async () => {
    try {
      console.log('🧪 [QUALITY] Ejecutando test de calidad...');
      
      const response = await api.post('/api/doula/quality-test');
      
      console.log('✅ [QUALITY] Test completado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [QUALITY] Error en test de calidad:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== BORRAR MEMORIA DEL USUARIO =====
  clearUserMemory: async () => {
    try {
      console.log('🗑️ [MEMORY] Borrando memoria del usuario...');
      
      const response = await api.delete('/api/doula/memory');
      
      console.log('✅ [MEMORY] Memoria borrada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [MEMORY] Error borrando memoria:', error.response?.data || error.message);
      throw error;
    }
  },

  // ===== OBTENER CONOCIMIENTO BASE =====
  getBaseKnowledge: () => {
    return [
      {
        text: "Durante el primer trimestre del embarazo, es normal experimentar náuseas matutinas, fatiga extrema y sensibilidad en los senos. Estos síntomas son causados por los cambios hormonales y generalmente mejoran después del primer trimestre.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'síntomas_embarazo',
          stage: 'embarazo',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "Los ejercicios seguros durante el embarazo incluyen caminar, yoga prenatal, natación y pilates adaptado. Es importante escuchar a tu cuerpo y consultar con tu médico antes de comenzar cualquier rutina de ejercicios.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'ejercicios_embarazo',
          stage: 'embarazo',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "La lactancia materna proporciona nutrición perfecta para el bebé, fortalece su sistema inmunológico y crea un vínculo especial entre madre e hijo. Se recomienda amamantar a demanda y buscar ayuda profesional si hay dificultades.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'lactancia',
          stage: 'posparto',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "El postparto es un período de recuperación física y emocional. Es normal sentir emociones intensas, fatiga y cambios de humor. Es importante descansar cuando el bebé duerme y pedir ayuda a familiares y amigos.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'postparto',
          stage: 'posparto',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "La nutrición durante el embarazo debe incluir frutas y verduras frescas, proteínas magras, granos enteros y lácteos bajos en grasa. Es importante evitar pescado alto en mercurio, carne cruda y alcohol.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'nutrición_embarazo',
          stage: 'embarazo',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "Las técnicas de respiración durante el parto incluyen respiración lenta y profunda, respiración de jadeo para el pujo y respiración de relajación. Practicar estas técnicas antes del parto ayuda a estar preparada.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'técnicas_parto',
          stage: 'embarazo',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "Los bebés recién nacidos necesitan alimentarse cada 2-3 horas, incluyendo durante la noche. Es normal que duerman entre 14-17 horas al día, pero en períodos cortos.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'cuidado_bebé',
          stage: 'posparto',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      },
      {
        text: "La depresión postparto es una condición médica real que puede afectar a las madres. Los síntomas incluyen tristeza persistente, pérdida de interés en actividades, cambios en el apetito y pensamientos de hacer daño.",
        metadata: {
          source: 'medical_guidelines',
          topic: 'salud_mental',
          stage: 'posparto',
          version: '1.0',
          language: 'es',
          qualityScore: 0.9
        }
      }
    ];
  },

  // ===== INICIALIZAR BASE DE CONOCIMIENTO =====
  initializeKnowledgeBase: async () => {
    try {
      console.log('🧠 [KNOWLEDGE] Inicializando base de conocimiento...');
      
      const baseKnowledge = learningService.getBaseKnowledge();
      let successCount = 0;
      let totalCount = baseKnowledge.length;
      
      for (const knowledgeItem of baseKnowledge) {
        try {
          await learningService.addKnowledge(knowledgeItem.text, knowledgeItem.metadata);
          successCount++;
          console.log(`✅ [KNOWLEDGE] ${successCount}/${totalCount} - ${knowledgeItem.metadata.topic}`);
          
          // Esperar un poco entre peticiones
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          console.log(`❌ [KNOWLEDGE] Error en ${knowledgeItem.metadata.topic}:`, error.message);
        }
      }
      
      console.log(`🎉 [KNOWLEDGE] Inicialización completada: ${successCount}/${totalCount}`);
      return { successCount, totalCount };
    } catch (error: any) {
      console.error('💥 [KNOWLEDGE] Error en inicialización:', error);
      throw error;
    }
  },

  // ===== FUNCIONES COMPATIBILIDAD (mantener para compatibilidad) =====
  
  // Obtener historial de conversación (opcional)
  getConversationHistory: async (conversationId: string): Promise<any[]> => {
    console.log('📚 [DOULI] Obteniendo historial:', conversationId);
    
    try {
      const response = await api.get(`/api/doula/conversation/${conversationId}`);
      console.log('✅ [DOULI] Historial obtenido:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ [DOULI] Error obteniendo historial:', error);
      return [];
    }
  },

  // Limpiar conversación (opcional)
  clearConversation: async (conversationId: string): Promise<boolean> => {
    console.log('🗑️ [DOULI] Limpiando conversación:', conversationId);
    
    try {
      const response = await api.delete(`/api/doula/conversation/${conversationId}`);
      console.log('✅ [DOULI] Conversación limpiada:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ [DOULI] Error limpiando conversación:', error);
      return false;
    }
  },

  // Obtener conocimiento por tema
  getKnowledgeByTopic: async (topic: string): Promise<any[]> => {
    console.log('🔍 [KNOWLEDGE] Buscando conocimiento por tema:', topic);
    
    try {
      const response = await api.get(`/api/doula/knowledge/topic/${topic}`);
      console.log('✅ [KNOWLEDGE] Conocimiento encontrado:', response.data);
      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ [KNOWLEDGE] Error buscando conocimiento:', error);
      return [];
    }
  },

  // Eliminar conocimiento
  deleteKnowledge: async (knowledgeId: string): Promise<boolean> => {
    console.log('🗑️ [KNOWLEDGE] Eliminando conocimiento:', knowledgeId);
    
    try {
      const response = await api.delete(`/api/doula/knowledge/${knowledgeId}`);
      console.log('✅ [KNOWLEDGE] Conocimiento eliminado:', response.data);
      return true;
    } catch (error: any) {
      console.error('❌ [KNOWLEDGE] Error eliminando conocimiento:', error);
      throw error;
    }
  }
};

// ===== TIPOS DE DATOS =====

export interface DouliResponse {
  response: string;
  usedFallback: boolean;
  source: 'openai' | 'knowledge_base';
}

export interface FeedbackData {
  conversationId: string;
  feedback: 'positive' | 'negative';
}

export interface KnowledgeItem {
  id: string;
  text: string;
  metadata: {
    source: string;
    topic: string;
    stage: 'embarazo' | 'posparto' | 'general';
    version: string;
    language: string;
    qualityScore: number;
  };
}

export interface KnowledgeMetadata {
  source: string;
  topic: string;
  stage: 'embarazo' | 'posparto' | 'general';
  version: string;
  language: string;
  qualityScore: number;
}

export interface InitializeResult {
  successCount: number;
  totalCount: number;
}

export interface DouliMessage {
  message: string;
  response: string;
  timestamp: Date;
  conversationId?: string;
  usedFallback?: boolean;
  source?: 'openai' | 'fallback';
}

export interface UserMemory {
  notes: string[];
  preferences: any;
}

export default learningService;
