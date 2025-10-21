import { useState, useEffect, useCallback, useRef } from 'react';
import { childrenService } from '../services/api';

interface DouliMessage {
  id: string;
  text: string;
  category: 'welcome' | 'tips' | 'encouragement' | 'reminder';
  priority: 'low' | 'medium' | 'high';
}

// Solo el primer mensaje de bienvenida se mantiene local
const WELCOME_MESSAGE: DouliMessage = {
  id: 'welcome-1',
  text: '¡Hola! Soy Douli 🌸 tu doula virtual. ¿Cómo te sientes hoy?',
  category: 'welcome',
  priority: 'medium'
};

export const useDouliChat = (currentRouteName?: string) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<DouliMessage | null>(null);
  const lastShownTimeRef = useRef<number>(0);
  const initialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const showTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Función para obtener mensajes del backend usando el servicio de api.ts
  const getMessageFromBackend = useCallback(async (): Promise<DouliMessage> => {
 
    try {
      // Usar el servicio de api.ts
      const data = await childrenService.getDouliTips('general');
      
      // Extraer el mensaje del backend
      let messageText = '¡Hola! Soy Douli, tu doula virtual 🌸';
      
      // El backend devuelve: { data: { tips: ["tip1", "tip2"] }, success: true }
      if (data && data.success && data.data && data.data.tips && data.data.tips.length > 0) {
        // Tomar el primer tip del array y agregar prefijo
        const tipFromBackend = data.data.tips[0];
        messageText = `Douli Tips: ${tipFromBackend}`;
        console.log('🔍 useDouliChat: Tip extraído del backend:', tipFromBackend);
      }
      
      
      return {
        id: `backend-${Date.now()}`,
        text: messageText,
        category: 'tips',
        priority: 'medium'
      };
    } catch (error) {
      console.error('🔍 useDouliChat: Error obteniendo mensaje del backend:', error);
      // Fallback si hay error
      return WELCOME_MESSAGE;
    }
  }, []);

  // Función para obtener mensaje aleatorio (solo del backend ahora)
  const getRandomMessage = useCallback(async (): Promise<DouliMessage> => {
    return await getMessageFromBackend();
  }, [getMessageFromBackend]);

  const showMessage = useCallback(async (message?: DouliMessage) => {
    if (isVisible) {
      return;
    }
    
    
    let messageToShow: DouliMessage;
    
    if (message) {
      messageToShow = message;
    } else {
      try {
        messageToShow = await getRandomMessage();
      } catch (error) {
        console.error('🔍 useDouliChat: Error obteniendo mensaje del backend:', error);
        messageToShow = WELCOME_MESSAGE;
      }
    }
    
    setCurrentMessage(messageToShow);
    setIsVisible(true);
    lastShownTimeRef.current = Date.now();
    
    // Auto-cierre después de 10 segundos
    const autoCloseTimer = setTimeout(() => {
      setIsVisible(false);
    }, 10000);
    
    // Limpiar el timer si se cierra manualmente
    return () => clearTimeout(autoCloseTimer);
  }, [getRandomMessage, isVisible]);

  const hideMessage = useCallback(() => {
    setIsVisible(false);
    // Asegurar que no haya mensajes superpuestos
    setCurrentMessage(null);
  }, []);

  // limpiar timers helper
  const clearTimers = useCallback(() => {
    if (initialTimeoutRef.current) { clearTimeout(initialTimeoutRef.current); initialTimeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current as any); intervalRef.current = null; }
    if (showTimeoutRef.current) { clearTimeout(showTimeoutRef.current); showTimeoutRef.current = null; }
  }, []);

  // configurar timers
  useEffect(() => {
    
    // No mostrar en pantalla de Doula
    if (currentRouteName === 'Doula') {
      clearTimers();
      hideMessage();
      return;
    }

    // Limpiar timers existentes antes de crear nuevos
    clearTimers();

    const scheduleNext = () => {
      // Mensaje cada 5 minutos exactos (300000 ms)
      const delay = 3000000; // 5 minutos
      showTimeoutRef.current = setTimeout(async () => {
        if (currentRouteName !== 'Doula') {
          await showMessage();
          scheduleNext(); // Programa el siguiente
        }
      }, delay);
    };

    // Primer mensaje inmediatamente al iniciar (solo una vez)
    if (!initialTimeoutRef.current) {
      initialTimeoutRef.current = setTimeout(async () => {
        if (currentRouteName !== 'Doula') {
          await showMessage();
          scheduleNext(); // Inicia la secuencia
        }
      }, 1000);
    }

    return () => {
      clearTimers();
    };
  }, [currentRouteName]); // Solo depende de currentRouteName

  // Ocultar al entrar a Doula
  useEffect(() => {
    if (currentRouteName === 'Doula' && isVisible) hideMessage();
  }, [currentRouteName, isVisible, hideMessage]);

  const handleChatPress = useCallback(() => {
    hideMessage();
  }, [hideMessage]);

  const showWelcomeMessage = useCallback(() => {
    if (currentRouteName === 'Doula') {
      showMessage({ id: 'welcome-doula', text: '¡Hola soy Douli! Tu guia y compañera en esta hermosa (y dificil) etapa de tu vida. ¿En qué puedo asistirte hoy? ', category: 'welcome', priority: 'high' });
    }
  }, [currentRouteName, showMessage]);

  return { isVisible, currentMessage, showMessage, hideMessage, handleChatPress, showWelcomeMessage };
};
