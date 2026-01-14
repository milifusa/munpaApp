import React, { createContext, useContext, useState, useRef } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'douli';
  timestamp: Date;
  showFeedback: boolean;
  usedFallback?: boolean;
  source?: 'openai' | 'knowledge_base';
  feedbackSent?: 'positive' | 'negative';
}

interface ChatContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  initializeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const initializeChat = () => {
    if (!isInitialized.current) {
      console.log('💬 [CHAT CONTEXT] Inicializando chat...');
      // Generar ID de conversación único
      const newConversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setConversationId(newConversationId);
      console.log('💬 [CHAT CONTEXT] Conversation ID generado:', newConversationId);
      
      // Agregar mensaje de bienvenida de Douli
      const welcomeMessage: Message = {
        id: Date.now(),
        text: 'Hola, soy Douli, tu Doula virtual, ¿en qué te puedo ayudar hoy?',
        sender: 'douli',
        timestamp: new Date(),
        showFeedback: false,
        source: 'knowledge_base'
      };
      
      console.log('💬 [CHAT CONTEXT] Mensaje de bienvenida creado:', welcomeMessage);
      setMessages([welcomeMessage]);
      isInitialized.current = true;
      console.log('💬 [CHAT CONTEXT] Chat inicializado correctamente');
    } else {
      console.log('💬 [CHAT CONTEXT] Chat ya estaba inicializado');
    }
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        setMessages,
        conversationId,
        setConversationId,
        initializeChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

