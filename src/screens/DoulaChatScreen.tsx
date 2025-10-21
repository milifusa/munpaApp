import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import learningService from '../services/learning-service';

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

const DouliChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  // Generar ID de conversación único
  useEffect(() => {
    setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // Función para enviar mensaje
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || !conversationId) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date(),
      showFeedback: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await learningService.chatWithDouli(inputText.trim(), conversationId);
      
      console.log('📋 Respuesta completa del chat:', response);
      
      // Extraer la respuesta del formato correcto
      const responseText = response.data?.response || response.response || 'No se pudo obtener la respuesta';
      const source = response.data?.source || response.source;
      const usedFallback = response.data?.usedFallback || response.usedFallback;
      
      console.log('📝 Texto extraído:', responseText);
      
      const douliMessage: Message = {
        id: Date.now() + 1,
        text: responseText,
        sender: 'douli',
        timestamp: new Date(),
        showFeedback: true,
        usedFallback: usedFallback,
        source: source
      };

      setMessages(prev => [...prev, douliMessage]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Función para enviar feedback
  const sendFeedback = async (messageId: number, feedback: 'positive' | 'negative') => {
    if (!conversationId) return;
    
    try {
      await learningService.sendFeedback(conversationId, feedback);
      
      // Actualizar mensaje para ocultar botones de feedback
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, showFeedback: false, feedbackSent: feedback }
          : msg
      ));

      // Mostrar confirmación
      const feedbackText = feedback === 'positive' ? '👍' : '👎';
      Alert.alert('Gracias', `Feedback enviado ${feedbackText}`);
    } catch (error) {
      console.error('Error enviando feedback:', error);
      Alert.alert('Error', 'No se pudo enviar el feedback');
    }
  };

  // Función para renderizar mensaje
  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageContainer,
      item.sender === 'user' ? styles.userMessage : styles.douliMessage
    ]}>
      {/* Avatar */}
      <View style={[
        styles.avatar,
        item.sender === 'user' ? styles.userAvatar : styles.douliMessageAvatar
      ]}>
        {item.sender === 'user' ? (
          <Ionicons 
            name="person" 
            size={20} 
            color="white" 
          />
        ) : (
          <Image 
            source={require('../../assets/douli.png')} 
            style={styles.douliMessageImage} 
          />
        )}
      </View>

      {/* Contenido del mensaje */}
      <View style={[
        styles.messageContent,
        item.sender === 'user' ? styles.userContent : styles.douliContent
      ]}>
        <Text style={[
          styles.messageText,
          item.sender === 'user' ? styles.userText : styles.douliText
        ]}>
          {item.text}
        </Text>

        {/* Indicador de fuente (solo para Douli) */}
        {item.sender === 'douli' && item.source && (
          <View style={styles.sourceIndicator}>
            <Text style={styles.sourceText}>
              {item.source === 'openai' ? '🤖 IA' : '📚 Base de conocimiento'}
            </Text>
          </View>
        )}

        {/* Botones de feedback (solo para respuestas de Douli) */}
        {item.sender === 'douli' && item.showFeedback && (
          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>¿Te ayudó esta respuesta?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity
                style={[styles.feedbackButton, styles.positiveButton]}
                onPress={() => sendFeedback(item.id, 'positive')}
              >
                <Ionicons name="thumbs-up" size={16} color="#4CAF50" />
                <Text style={styles.positiveButtonText}>Útil</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.feedbackButton, styles.negativeButton]}
                onPress={() => sendFeedback(item.id, 'negative')}
              >
                <Ionicons name="thumbs-down" size={16} color="#F44336" />
                <Text style={styles.negativeButtonText}>Mejorar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Confirmación de feedback enviado */}
        {item.feedbackSent && (
          <View style={styles.feedbackSent}>
            <Text style={styles.feedbackSentText}>
              {item.feedbackSent === 'positive' ? '👍 Gracias por tu feedback' : '👎 Entendido, mejoraremos'}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.douliInfo}>
          <View style={styles.douliAvatar}>
            <Image 
              source={require('../../assets/douli.png')} 
              style={styles.douliAvatarImage} 
            />
          </View>
          <View>
            <Text style={styles.douliName}>DOULI</Text>
            <Text style={styles.douliSubtitle}>Tu doula virtual</Text>
          </View>
        </View>
      </View>

      {/* Lista de mensajes */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id.toString()}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        onLayout={() => flatListRef.current?.scrollToEnd()}
        keyboardShouldPersistTaps="handled"
      />

      {/* Indicador de carga */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#E91E63" />
          <Text style={styles.loadingText}>DOULI está pensando...</Text>
        </View>
      )}

      {/* Input de mensaje */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu pregunta a DOULI..."
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isLoading) && styles.sendButtonDisabled
          ]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={(!inputText.trim() || isLoading) ? "#ccc" : "white"} 
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  douliInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  douliAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#887CBC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden', // Para que la imagen respete el borderRadius
  },
  douliAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  douliName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  douliSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  douliMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  userAvatar: {
    backgroundColor: '#887CBC',
  },
  douliMessageAvatar: {
    backgroundColor: '#887CBC',
    overflow: 'hidden', // Para que la imagen respete el borderRadius
  },
  douliMessageImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContent: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userContent: {
    backgroundColor: '#887CBC',
    borderBottomRightRadius: 4,
  },
  douliContent: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  douliText: {
    color: '#333',
  },
  sourceIndicator: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  sourceText: {
    fontSize: 12,
    color: '#666',
  },
  feedbackContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feedbackText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  positiveButton: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  negativeButton: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  positiveButtonText: {
    fontSize: 12,
    color: '#4CAF50',
    marginLeft: 4,
  },
  negativeButtonText: {
    fontSize: 12,
    color: '#F44336',
    marginLeft: 4,
  },
  feedbackSent: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  feedbackSentText: {
    fontSize: 12,
    color: '#1976D2',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E91E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
});

export default DouliChat;
