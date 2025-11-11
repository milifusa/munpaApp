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
      // Generar ID de conversación único
      setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
      
      // Agregar mensaje de bienvenida de Douli
      const welcomeMessage: Message = {
        id: Date.now(),
        text: 'Hola, soy Douli, tu Doula virtual, ¿en qué te puedo ayudar hoy?',
        sender: 'douli',
        timestamp: new Date(),
        showFeedback: false,
        source: 'knowledge_base'
      };
      
      setMessages([welcomeMessage]);
      isInitialized.current = true;
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

