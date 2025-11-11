import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import marketplaceService, { MarketplaceMessage } from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';

const MarketplaceMessagesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { productId, sellerId } = route.params;
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList<MarketplaceMessage>>(null);

  useEffect(() => {
    loadMessages();
    
    // Recargar mensajes cada 5 segundos
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [productId]);

  const loadMessages = async () => {
    try {
      console.log('💬 [MESSAGES] Cargando mensajes para producto:', productId);
      const fetchedMessages = await marketplaceService.getProductMessages(productId);
      console.log('✅ [MESSAGES] Mensajes cargados:', fetchedMessages?.length || 0);
      setMessages(Array.isArray(fetchedMessages) ? fetchedMessages : []);
      setLoading(false);
    } catch (error) {
      console.error('❌ [MESSAGES] Error cargando mensajes:', error);
      // Si hay un error, simplemente mostrar array vacío en lugar de fallar
      setMessages([]);
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    try {
      setSending(true);
      const newMessage = await marketplaceService.sendMessage(productId, inputText.trim());
      setMessages([...messages, newMessage]);
      setInputText('');
      flatListRef.current?.scrollToEnd();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MarketplaceMessage }) => {
    const isMe = item.senderId === user?.id;

    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer,
      ]}>
        {!isMe && (
          <Text style={styles.senderName}>{item.senderName}</Text>
        )}
        <View style={[
          styles.messageBubble,
          isMe ? styles.myMessageBubble : styles.theirMessageBubble,
        ]}>
          <Text style={[
            styles.messageText,
            isMe ? styles.myMessageText : styles.theirMessageText,
          ]}>
            {item.message}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 50 : 15) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mensajes</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { productId })}
        >
          <Ionicons name="information-circle-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Lista de mensajes */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>Aún no hay mensajes</Text>
              <Text style={styles.emptySubtext}>
                Envía un mensaje para iniciar la conversación
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesList}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
              onLayout={() => flatListRef.current?.scrollToEnd()}
            />
          )}

          {/* Input de mensaje */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#999"
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons
                  name="send"
                  size={20}
                  color={inputText.trim() ? 'white' : '#ccc'}
                />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#59C6C0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatContainer: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Montserrat',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 8,
    textAlign: 'center',
  },
  messagesList: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 4,
    marginLeft: 12,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#59C6C0',
    borderBottomRightRadius: 4,
  },
  theirMessageBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  messageText: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  myMessageText: {
    color: 'white',
  },
  theirMessageText: {
    color: '#333',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'Montserrat',
    marginTop: 4,
    marginHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#333',
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});

export default MarketplaceMessagesScreen;

