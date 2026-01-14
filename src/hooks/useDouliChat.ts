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

// Ref global para rastrear si ya se mostró el mensaje inicial en esta sesión de la app
let hasShownInitialMessage = false;

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
      console.log('💬 [DOULI CHAT] Ya hay un mensaje visible, no mostrar otro');
      return;
    }
    
    console.log('💬 [DOULI CHAT] showMessage llamado');
    let messageToShow: DouliMessage;
    
    if (message) {
      messageToShow = message;
      console.log('💬 [DOULI CHAT] Usando mensaje proporcionado:', messageToShow.text.substring(0, 50));
    } else {
      try {
        messageToShow = await getRandomMessage();
        console.log('💬 [DOULI CHAT] Mensaje obtenido del backend:', messageToShow.text.substring(0, 50));
      } catch (error) {
        console.error('🔍 useDouliChat: Error obteniendo mensaje del backend:', error);
        messageToShow = WELCOME_MESSAGE;
        console.log('💬 [DOULI CHAT] Usando mensaje de bienvenida por defecto');
      }
    }
    
    console.log('💬 [DOULI CHAT] Estableciendo mensaje y visibilidad');
    setCurrentMessage(messageToShow);
    setIsVisible(true);
    lastShownTimeRef.current = Date.now();
    
    // No auto-cerrar, solo se cierra cuando el usuario hace click
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
    
    // Solo mostrar en pantalla Home
    if (currentRouteName !== 'Home') {
      clearTimers();
      hideMessage();
      return;
    }

    // Limpiar timers existentes antes de crear nuevos
    clearTimers();

    const scheduleNext = () => {
      // Mensaje cada 60 minutos (3600000 ms = 60 minutos)
      const delay = 3600000; // 60 minutos en milisegundos
      showTimeoutRef.current = setTimeout(async () => {
        if (currentRouteName === 'Home') {
          console.log('💬 [DOULI CHAT] Mostrando mensaje programado (60 min)');
          await showMessage();
          scheduleNext(); // Programa el siguiente
        }
      }, delay);
    };

    // Primer mensaje solo en la primera carga de la app (solo una vez en toda la sesión)
    if (!hasShownInitialMessage && !initialTimeoutRef.current) {
      console.log('💬 [DOULI CHAT] Programando primer mensaje (primera carga) para ruta:', currentRouteName);
      initialTimeoutRef.current = setTimeout(async () => {
        if (currentRouteName === 'Home') {
          console.log('💬 [DOULI CHAT] Mostrando primer mensaje (primera carga)');
          hasShownInitialMessage = true; // Marcar como mostrado
          await showMessage();
          scheduleNext(); // Inicia la secuencia de 60 minutos
        } else {
          console.log('💬 [DOULI CHAT] No mostrar mensaje fuera de Home');
        }
      }, 2000); // 2 segundos para dar tiempo a que cargue la pantalla
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
