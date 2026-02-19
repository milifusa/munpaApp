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
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import marketplaceService, { MarketplaceMessage } from '../services/marketplaceService';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance as api } from '../services/api';

const MarketplaceMessagesScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { productId, otherUserId } = route.params || {};

  const [messages, setMessages] = useState<MarketplaceMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [productInfo, setProductInfo] = useState<{ title?: string; sellerId?: string; sellerName?: string; sellerPhoto?: string }>({});
  const [otherUserInfo, setOtherUserInfo] = useState<{ id?: string; name?: string; photo?: string }>({});
  const flatListRef = useRef<FlatList<MarketplaceMessage>>(null);

  useEffect(() => {
    loadMessages();
    loadProductInfo();
    
    // Recargar mensajes cada 5 segundos
    const interval = setInterval(() => {
      loadMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [productId]);

  const loadProductInfo = async () => {
    try {
      console.log('📦 [MESSAGES] Cargando información del producto:', productId);
      const product = await marketplaceService.getProductById(productId);
      
      console.log('📦 [MESSAGES] Información del producto recibida:', {
        productId: product.id,
        title: product.title,
        sellerId: product.userId,
        sellerName: product.userName || 'NO TIENE NOMBRE',
        sellerPhoto: product.userPhoto || 'NO TIENE FOTO',
      });
      
      setProductInfo({
        title: product.title,
        sellerId: product.userId,
        sellerName: product.userName,
        sellerPhoto: product.userPhoto,
      });
      
      // Identificar quién es el otro usuario
      // Si el usuario actual es el vendedor, el otro usuario es el comprador (otherUserId)
      // Si el usuario actual es el comprador, el otro usuario es el vendedor (product.userId)
      const theOtherUserId = user?.id === product.userId 
        ? otherUserId  // Si soy el vendedor, el otro es el comprador
        : product.userId; // Si soy el comprador, el otro es el vendedor
      
      console.log('👥 [MESSAGES] Identificando otro usuario:', {
        usuarioActualId: user?.id,
        productUserId: product.userId,
        otherUserIdParam: otherUserId,
        theOtherUserId,
        esVendedor: user?.id === product.userId,
      });
      
      if (theOtherUserId && theOtherUserId !== user?.id) {
        // Si el otro usuario es el vendedor, usar la información del producto
        if (theOtherUserId === product.userId) {
          console.log('✅ [MESSAGES] Otro usuario es el vendedor, usando info del producto:', {
            id: product.userId,
            name: product.userName || 'NO TIENE NOMBRE',
            photo: product.userPhoto || 'NO TIENE FOTO',
          });
          setOtherUserInfo({
            id: product.userId,
            name: product.userName,
            photo: product.userPhoto,
          });
        } else {
          // Si el otro usuario es un comprador, la información vendrá de los mensajes
          console.log('⚠️ [MESSAGES] Otro usuario es comprador, información vendrá de mensajes:', {
            id: theOtherUserId,
            nota: '⚠️ BACKEND DEBE ENVIAR senderName y senderPhoto en los mensajes',
          });
          setOtherUserInfo(prev => ({
            id: theOtherUserId,
            name: prev.name,
            photo: prev.photo,
          }));
        }
      }
    } catch (error) {
      console.error('❌ [MESSAGES] Error cargando información del producto:', error);
    }
  };

  const loadMessages = async () => {
    try {
      console.log('💬 [MESSAGES] Cargando mensajes para producto:', productId);
      console.log('👤 [MESSAGES] Usuario actual ID:', user?.id);
      console.log('👤 [MESSAGES] Otro usuario ID:', otherUserId);
      console.log('👤 [MESSAGES] Usuario actual nombre:', user?.name || user?.displayName);
      
      const fetchedMessages = await marketplaceService.getProductMessages(productId);
      console.log('✅ [MESSAGES] Mensajes cargados del backend:', fetchedMessages?.length || 0);
      
      const messagesArray = Array.isArray(fetchedMessages) ? fetchedMessages : [];
      
      // FILTRAR SOLO LOS MENSAJES DE ESTA CONVERSACIÓN ESPECÍFICA
      // Una conversación es entre el usuario actual y otherUserId
      const filteredMessages = messagesArray.filter((msg: any) => {
        const isFromMe = msg.senderId === user?.id;
        const isToMe = msg.receiverId === user?.id;
        const isFromOther = msg.senderId === otherUserId;
        const isToOther = msg.receiverId === otherUserId;
        
        // El mensaje es parte de esta conversación si:
        // - Lo envié yo al otro usuario (senderId: yo, receiverId: otro)
        // - El otro me lo envió a mí (senderId: otro, receiverId: yo)
        const belongsToThisConversation = 
          (isFromMe && isToOther) || (isFromOther && isToMe);
        
        return belongsToThisConversation;
      });
      
      console.log('✅ [MESSAGES] Mensajes filtrados para esta conversación:', filteredMessages.length);
      console.log('📊 [MESSAGES] Total mensajes del producto:', messagesArray.length);
      console.log('📊 [MESSAGES] Mensajes filtrados:', filteredMessages.length);
      
      // Encontrar información del otro usuario desde los mensajes FILTRADOS
      const otherUserMessages = filteredMessages.filter((m: any) => m.senderId !== user?.id);
      
      const otherUserMessage = otherUserMessages.find((m: any) => 
        m.senderName && 
        m.senderName !== 'Usuario'
      );
      
      console.log('✅ [MESSAGES] Mensaje con información válida del otro usuario:', otherUserMessage ? {
        senderId: otherUserMessage.senderId,
        senderName: otherUserMessage.senderName,
        senderPhoto: otherUserMessage.senderPhoto ? 'Presente' : 'Ausente',
      } : 'NO ENCONTRADO');
      
      // Si encontramos información del otro usuario en los mensajes, guardarla
      if (otherUserMessage && (!otherUserInfo.id || otherUserInfo.id === otherUserMessage.senderId)) {
        console.log('💾 [MESSAGES] Guardando información del otro usuario:', {
          id: otherUserMessage.senderId,
          name: otherUserMessage.senderName,
          photo: otherUserMessage.senderPhoto ? 'Presente' : 'Ausente',
        });
        setOtherUserInfo({
          id: otherUserMessage.senderId,
          name: otherUserMessage.senderName,
          photo: otherUserMessage.senderPhoto,
        });
      }
      
      // Validar y normalizar SOLO los mensajes filtrados
      const normalizedMessages = filteredMessages.map((msg: any) => {
        // Validar y normalizar createdAt - preservar la fecha original si es válida
        let createdAt = msg.createdAt;
        if (createdAt) {
          // Intentar parsear la fecha en diferentes formatos
          let date: Date | null = null;
          
          // Si es un objeto con _seconds (Firestore timestamp)
          if (typeof createdAt === 'object' && createdAt._seconds) {
            date = new Date(createdAt._seconds * 1000);
          } 
          // Si es un string o número
          else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
            date = new Date(createdAt);
          }
          // Si ya es una fecha
          else if (createdAt instanceof Date) {
            date = createdAt;
          }
          
          // Si la fecha es inválida, mantener el valor original pero loguear
          if (date && isNaN(date.getTime())) {
            console.warn('⚠️ [MESSAGES] Fecha inválida en mensaje:', msg.id, createdAt);
            // Mantener el valor original en lugar de reemplazarlo
            createdAt = msg.createdAt;
          } else if (date) {
            // Convertir a ISO string si es válida
            createdAt = date.toISOString();
          }
        } else {
          // Solo si no hay createdAt, usar fecha actual como fallback
          console.warn('⚠️ [MESSAGES] Mensaje sin createdAt:', msg.id);
          createdAt = new Date().toISOString();
        }
        
        // Normalizar el nombre y foto del remitente
        let senderName = msg.senderName;
        let senderPhoto = msg.senderPhoto;
        
        // Si es el usuario actual
        if (msg.senderId === user?.id) {
          senderName = user?.name || user?.displayName || msg.senderName || 'Tú';
          senderPhoto = user?.photoURL || msg.senderPhoto;
          console.log('✅ [MESSAGES] Mensaje propio normalizado:', {
            senderId: msg.senderId,
            senderName,
            senderPhoto: senderPhoto ? 'Presente' : 'Ausente',
          });
        } 
        // Si es el otro usuario
        else if (msg.senderId !== user?.id) {
          const hasOriginalSenderName = !!(msg.senderName && msg.senderName !== 'Usuario');
          const hasOriginalSenderPhoto = !!msg.senderPhoto;
          
          console.log('🔍 [MESSAGES] Normalizando mensaje del otro usuario:', {
            senderId: msg.senderId,
            senderNameOriginal: msg.senderName || '❌ NO TIENE',
            senderPhotoOriginal: msg.senderPhoto || '❌ NO TIENE',
            tieneSenderName: hasOriginalSenderName ? '✅ SÍ' : '❌ NO',
            tieneSenderPhoto: hasOriginalSenderPhoto ? '✅ SÍ' : '❌ NO',
            productInfoSellerId: productInfo.sellerId,
            productInfoSellerName: productInfo.sellerName,
            productInfoSellerPhoto: productInfo.sellerPhoto ? 'Presente' : 'Ausente',
            otherUserInfoId: otherUserInfo.id,
            otherUserInfoName: otherUserInfo.name,
            otherUserInfoPhoto: otherUserInfo.photo ? 'Presente' : 'Ausente',
          });
          
          // PRIORIDAD 1: Usar la información que viene directamente del mensaje (del backend)
          if (hasOriginalSenderName) {
            senderName = msg.senderName;
            senderPhoto = msg.senderPhoto;
            console.log('✅ [MESSAGES] ✅✅✅ USANDO INFORMACIÓN DEL BACKEND (MENSAJE) ✅✅✅');
            console.log('✅ [MESSAGES] senderName del backend:', senderName);
            console.log('✅ [MESSAGES] senderPhoto del backend:', senderPhoto || 'No tiene foto');
          }
          // PRIORIDAD 2: Si el senderId coincide con el sellerId del producto, usar la info del producto
          else if (productInfo.sellerId && msg.senderId === productInfo.sellerId) {
            senderName = productInfo.sellerName || msg.senderName || 'Usuario';
            senderPhoto = productInfo.sellerPhoto || msg.senderPhoto;
            console.log('✅ [MESSAGES] Usando información del producto (vendedor):', {
              senderName,
              senderPhoto: senderPhoto ? 'Presente' : 'Ausente',
            });
          }
          // PRIORIDAD 3: Si tenemos información del otro usuario guardada
          else if (otherUserInfo.id && otherUserInfo.id === msg.senderId) {
            senderName = otherUserInfo.name || msg.senderName || 'Usuario';
            senderPhoto = otherUserInfo.photo || msg.senderPhoto;
            console.log('✅ [MESSAGES] Usando información guardada del otro usuario:', {
              senderName,
              senderPhoto: senderPhoto ? 'Presente' : 'Ausente',
            });
          }
          // Si no hay información, usar la del mensaje aunque sea "Usuario"
          else {
            senderName = msg.senderName || 'Usuario';
            senderPhoto = msg.senderPhoto;
            console.warn('⚠️ [MESSAGES] No se encontró información válida, usando valores del mensaje:', {
              senderName,
              senderPhoto: senderPhoto ? 'Presente' : 'Ausente',
            });
          }
        }
        
        return {
          ...msg,
          createdAt,
          id: msg.id || `msg_${Date.now()}_${Math.random()}`,
          senderName: senderName || 'Usuario',
          senderPhoto: senderPhoto,
        };
      });
      
      setMessages(normalizedMessages);
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

    const messageText = inputText.trim();
    try {
      setSending(true);
      const newMessage = await marketplaceService.sendMessage(productId, messageText);
      
      // Validar y normalizar el mensaje antes de agregarlo
      const normalizedMessage = {
        ...newMessage,
        createdAt: newMessage.createdAt || new Date().toISOString(),
        id: newMessage.id || `msg_${Date.now()}`,
        // Asegurar que el senderName y senderPhoto sean correctos
        senderName: newMessage.senderName || user?.name || user?.displayName || 'Usuario',
        senderId: newMessage.senderId || user?.id || '',
        senderPhoto: newMessage.senderPhoto || user?.photoURL || undefined,
      };
      
      setMessages([...messages, normalizedMessage]);
      setInputText('');
      flatListRef.current?.scrollToEnd();

      // Enviar notificación push al receptor (si no es el mismo usuario)
      // El backend debería manejar esto automáticamente, pero lo enviamos como respaldo
      const receiverId = otherUserId || productInfo.sellerId;
      console.log('🔔 [MESSAGES] Intentando enviar notificación:', {
        receiverId,
        otherUserId,
        productInfoSellerId: productInfo.sellerId,
        usuarioActualId: user?.id,
        esMismoUsuario: receiverId === user?.id,
      });
      
      if (receiverId && receiverId !== user?.id) {
        try {
          const notificationPayload = {
            receiverId,
            senderId: user?.id,
            senderName: user?.name || user?.displayName || 'Usuario',
            message: messageText,
            productId,
            productTitle: productInfo.title || 'Producto',
            type: 'new_message',
          };
          
          console.log('📤 [MESSAGES] Enviando notificación push:', notificationPayload);
          const notifResponse = await api.post('/api/notifications/new-message', notificationPayload);
          console.log('✅ [MESSAGES] Notificación de nuevo mensaje enviada:', {
            status: notifResponse.status,
            data: notifResponse.data,
          });
        } catch (notifError: any) {
          // No fallar si la notificación no se puede enviar (el backend puede manejarlo)
          console.error('❌ [MESSAGES] Error enviando notificación:', {
            status: notifError.response?.status,
            message: notifError.message,
            data: notifError.response?.data,
            url: notifError.config?.url,
          });
          if (notifError.response?.status === 404) {
            console.warn('⚠️ [MESSAGES] Endpoint de notificaciones no encontrado (404). El backend debe implementar /api/notifications/new-message');
          }
        }
      } else {
        console.warn('⚠️ [MESSAGES] No se puede enviar notificación:', {
          reason: !receiverId ? 'No hay receiverId' : 'Es el mismo usuario',
          receiverId,
          usuarioActualId: user?.id,
        });
      }
    } catch (error: any) {
      console.error('❌ [MESSAGES] Error enviando mensaje:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudo enviar el mensaje. Por favor intenta de nuevo.'
      );
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: MarketplaceMessage }) => {
    const isMe = item.senderId === user?.id;
    
    // Obtener la foto del remitente
    let senderPhoto: string | undefined;
    if (isMe) {
      senderPhoto = user?.photoURL || item.senderPhoto;
    } else {
      // Si es el vendedor, usar la foto del producto
      if (item.senderId === productInfo.sellerId) {
        senderPhoto = productInfo.sellerPhoto || item.senderPhoto;
      } else {
        senderPhoto = item.senderPhoto || otherUserInfo.photo;
      }
    }
    
    // Obtener el nombre del remitente
    let senderName: string;
    if (isMe) {
      senderName = user?.name || user?.displayName || item.senderName || 'Tú';
    } else {
      // Si es el vendedor, usar el nombre del producto
      if (item.senderId === productInfo.sellerId) {
        senderName = productInfo.sellerName || item.senderName || 'Usuario';
      } else {
        senderName = item.senderName || otherUserInfo.name || 'Usuario';
      }
    }

    // Formatear fecha y hora
    const formatDateTime = () => {
      try {
        if (!item.createdAt) return '';
        const date = new Date(item.createdAt);
        if (isNaN(date.getTime())) return '';
        
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // Si es de hoy, solo mostrar la hora
        if (messageDate.getTime() === today.getTime()) {
          return date.toLocaleTimeString('es-MX', {
            hour: '2-digit',
            minute: '2-digit',
          });
        } else {
          // Si no es de hoy, mostrar fecha y hora
          return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch (error) {
        return '';
      }
    };

    return (
      <View style={[
        styles.messageContainer,
        isMe ? styles.myMessageContainer : styles.theirMessageContainer,
      ]}>
        {/* Avatar a la izquierda para mensajes ajenos */}
        {!isMe && (
          <>
            {senderPhoto ? (
              <Image 
                source={{ uri: senderPhoto }} 
                style={styles.senderAvatar}
              />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#999" />
              </View>
            )}
          </>
        )}
        
        {/* Contenido del mensaje */}
        <View style={styles.messageContent}>
          <Text style={[
            styles.senderName,
            isMe && styles.mySenderName,
          ]}>{senderName}</Text>
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
          <Text style={[
            styles.messageTime,
            isMe && styles.myMessageTime,
          ]}>
            {formatDateTime()}
          </Text>
        </View>
        
        {/* Avatar a la derecha para mensajes propios */}
        {isMe && (
          <>
            {senderPhoto ? (
              <Image 
                source={{ uri: senderPhoto }} 
                style={styles.senderAvatar}
              />
            ) : (
              <View style={styles.senderAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#999" />
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          {otherUserInfo.photo || productInfo.sellerPhoto ? (
            <Image 
              source={{ uri: otherUserInfo.photo || productInfo.sellerPhoto }} 
              style={styles.headerAvatar}
            />
          ) : (
            <View style={styles.headerAvatarPlaceholder}>
              <Ionicons name="person" size={20} color="white" />
            </View>
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUserInfo.name || productInfo.sellerName || 'Usuario'}
            </Text>
            <Text style={styles.headerProductTitle} numberOfLines={1}>
              {productInfo.title || 'Producto'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          onPress={() => navigation.navigate('ProductDetail', { productId })}
          style={styles.infoButton}
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#96d2d3',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 6,
    paddingBottom: 15,
  },
  backButton: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  headerProductTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  infoButton: {
    padding: 4,
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
    justifyContent: 'space-between',
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
    flexDirection: 'row',
    maxWidth: '85%',
    alignItems: 'flex-end',
  },
  myMessageContainer: {
    alignSelf: 'flex-end',
  },
  theirMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
  },
  senderAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 4,
    fontWeight: '600',
    marginLeft: 0,
    marginRight: 0,
  },
  mySenderName: {
    textAlign: 'right',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: '#96d2d3',
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
  },
  myMessageTime: {
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
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
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#333',
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
});

export default MarketplaceMessagesScreen;

