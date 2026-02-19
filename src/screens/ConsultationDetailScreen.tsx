import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import consultationsService, { Consultation, ConsultationMessage } from '../services/consultationsService';
import specialistService from '../services/specialistService';
import { imageUploadService } from '../services/imageUploadService';
import ManageConsultationModal from '../components/ManageConsultationModal';
import CompleteConsultationModal from '../components/CompleteConsultationModal';
import ConsultationPaymentModal from '../components/ConsultationPaymentModal';
import { useAuth } from '../contexts/AuthContext';
import { useViewMode } from '../contexts/ViewModeContext';
import analyticsService from '../services/analyticsService';

const MUNPA_PRIMARY = '#96d2d3';

// Parsear fechas de Firebase/Firestore (Timestamp con _seconds/seconds) o ISO string
const parseFirebaseDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    const sec = value._seconds ?? value.seconds;
    if (typeof sec === 'number') {
      const nano = value._nanoseconds ?? value.nanoseconds ?? 0;
      return new Date(sec * 1000 + nano / 1000000);
    }
    if (value.toDate && typeof value.toDate === 'function') return value.toDate();
  }
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const formatFollowUpDate = (value: any): string => {
  const d = parseFirebaseDate(value);
  return d ? d.toLocaleDateString('es-ES') : '';
};

const ConsultationDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isSpecialistMode } = useViewMode();
  const scrollViewRef = useRef<ScrollView>(null);

  const consultationId = route.params?.consultationId;

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ConsultationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [joiningVideo, setJoiningVideo] = useState(false);

  useEffect(() => {
    loadConsultation();
    analyticsService.logScreenView('ConsultationDetail');

    // Auto-refresh each 10 seconds if consultation is active
    const interval = setInterval(() => {
      if (consultation?.status === 'in_progress' || consultation?.status === 'accepted') {
        loadMessages(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [consultationId]);

  const loadConsultation = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Usar modo de vista: en modo padre → /api/consultations, en modo especialista → /api/specialist/consultations
      const isSpecialist = isSpecialistMode;
      const consultationApi = isSpecialist ? specialistService : consultationsService;
      const messagesApi = isSpecialist ? specialistService : consultationsService;

      // Especialista: GET /api/specialist/consultations/:id | Padre: GET /api/consultations/:id
      let consultationData: any;
      try {
        consultationData = await consultationApi.getConsultation(consultationId);
      } catch (err) {
        console.error('❌ Error cargando consulta:', err);
        Alert.alert('Error', 'No se pudo cargar la consulta');
        return;
      }

      const consultation = consultationData?.data ?? consultationData;
      setConsultation(consultation);

      // Mensajes: usarlos si vienen en la respuesta (especialista), si no cargar
      const messagesFromResponse = consultation?.messages;
      if (Array.isArray(messagesFromResponse)) {
        setMessages(messagesFromResponse);
      }

      try {
        const messagesData = await messagesApi.getMessages(consultationId, 100);
        const messages = messagesData?.data ?? messagesData ?? [];
        setMessages(Array.isArray(messages) ? messages : []);
      } catch (err) {
        console.warn('⚠️ No se pudieron cargar los mensajes:', err);
        if (!Array.isArray(messagesFromResponse)) setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error cargando consulta:', error);
      Alert.alert('Error', 'No se pudo cargar la consulta');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMessages = async (silent: boolean = false) => {
    try {
      if (!silent) setRefreshing(true);
      const isSpecialist = isSpecialistMode;
      const messagesApi = isSpecialist ? specialistService : consultationsService;
      const messagesData = await messagesApi.getMessages(consultationId, 100);
      const messages = messagesData?.data ?? messagesData ?? [];
      setMessages(Array.isArray(messages) ? messages : []);
    } catch (error) {
      console.error('❌ Error cargando mensajes:', error);
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  const handleSendMessage = async () => {
    if (newMessage.trim().length === 0) return;

    try {
      setSending(true);
      const isSpecialist = isSpecialistMode;
      const messagesApi = isSpecialist ? specialistService : consultationsService;
      await messagesApi.sendMessage(consultationId, newMessage.trim());
      
      analyticsService.logEvent('consultation_message_sent', {
        consultation_id: consultationId,
        message_length: newMessage.length,
      });

      setNewMessage('');
      await loadMessages(true);
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
    } finally {
      setSending(false);
    }
  };

  const handleAttachImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
        return;
      }

      setUploadingImage(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uploadedUrl = await imageUploadService.uploadImage(result.assets[0].uri);
        const messagesApi = isSpecialistMode ? specialistService : consultationsService;
        await messagesApi.sendMessage(consultationId, '📎 Imagen adjunta', [uploadedUrl]);
        
        await loadMessages(true);
        
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error);
      Alert.alert('Error', 'No se pudo subir la imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleJoinVideo = async () => {
    try {
      setJoiningVideo(true);
      const res = await consultationsService.joinVideo(consultationId);
      const data = res?.data ?? res;
      const url = data?.url ?? data?.videoUrl;
      const videoData = data?.enlace ?? (data?.channelName ? data : null);
      if (url) {
        navigation.navigate('ConsultationVideo', { url });
      } else if (videoData?.channelName && videoData?.token && videoData?.appId) {
        navigation.navigate('ConsultationVideo', {
          videoData: {
            channelName: videoData.channelName,
            uid: videoData.uid,
            token: videoData.token,
            appId: videoData.appId,
          },
        });
      } else {
        throw new Error('No se recibieron los datos de la videollamada');
      }
    } catch (error: any) {
      console.error('❌ Error uniendo a videollamada:', error);
      Alert.alert('Error', error?.message || 'No se pudo conectar a la videollamada');
    } finally {
      setJoiningVideo(false);
    }
  };

  const handleStartConsultation = async () => {
    try {
      if (consultation?.type === 'video') setJoiningVideo(true);
      await specialistService.startConsultation(consultationId);
      if (consultation?.type === 'video') {
        await handleJoinVideo();
      } else {
        loadConsultation(true);
      }
    } catch (error: any) {
      console.error('❌ Error iniciando consulta:', error);
      Alert.alert('Error', error?.message || 'No se pudo iniciar la consulta');
    } finally {
      if (consultation?.type === 'video') setJoiningVideo(false);
    }
  };

  const handleCancelConsultation = () => {
    Alert.alert(
      'Cancelar consulta',
      '¿Estás seguro de que quieres cancelar esta consulta?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await consultationsService.cancelConsultation(consultationId);
              
              analyticsService.logEvent('consultation_cancelled', {
                consultation_id: consultationId,
              });

              Alert.alert('Consulta cancelada', 'La consulta ha sido cancelada exitosamente');
              navigation.goBack();
            } catch (error) {
              console.error('❌ Error cancelando consulta:', error);
              Alert.alert('Error', 'No se pudo cancelar la consulta');
            }
          },
        },
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
      awaiting_payment: { label: 'Esperando pago', color: '#F59E0B', bgColor: '#FEF3C7' },
      pending: { label: 'Pendiente', color: '#3B82F6', bgColor: '#DBEAFE' },
      accepted: { label: 'Aceptada', color: '#10B981', bgColor: '#D1FAE5' },
      in_progress: { label: 'En progreso', color: '#8B5CF6', bgColor: '#EDE9FE' },
      completed: { label: 'Completada', color: '#059669', bgColor: '#D1FAE5' },
      cancelled: { label: 'Cancelada', color: '#EF4444', bgColor: '#FEE2E2' },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
        <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
      </View>
    );
  };

  const renderMessage = (message: ConsultationMessage) => {
    const isMyMessage = message.senderType === 'parent';

    return (
      <View
        key={message.id}
        style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.specialistMessage]}
      >
        {!isMyMessage && (
          <Image
            source={
              message.senderPhoto 
                ? { uri: message.senderPhoto } 
                : require('../../assets/icon.png')
            }
            style={styles.messageSenderPhoto}
          />
        )}
        
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessageBubble : styles.specialistMessageBubble]}>
          {!isMyMessage && (
            <Text style={styles.messageSenderName}>{message.senderName || 'Especialista'}</Text>
          )}
          
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.specialistMessageText]}>
            {message.message}
          </Text>
          
          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.messageAttachments}>
              {message.attachments.map((url, index) => (
                <Image key={index} source={{ uri: url }} style={styles.messageAttachmentImage} />
              ))}
            </View>
          )}
          
          <Text style={[styles.messageTime, isMyMessage ? styles.myMessageTime : styles.specialistMessageTime]}>
            {new Date(message.createdAt).toLocaleTimeString('es-ES', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
        <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consulta</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  if (!consultation) {
    return (
      <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
        <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consulta</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>No se encontró la consulta</Text>
        </View>
      </SafeAreaView>
    );
  }

  const canChat = consultation.status === 'accepted' || consultation.status === 'in_progress';
  const isVideoConsultation = consultation.type === 'video';
  const canJoinVideo = isVideoConsultation && canChat;
  const isSpecialist = isSpecialistMode;
  const isPendingForSpecialist = consultation.status === 'pending' && isSpecialist;
  const canCompleteForSpecialist = isSpecialist && (consultation.status === 'accepted' || consultation.status === 'in_progress');
  const canStartForSpecialist = isSpecialist && consultation.status === 'accepted';
  const canCancel = (consultation.status === 'awaiting_payment' || consultation.status === 'pending') && !isSpecialist;
  // Mostrar pago cuando: es padre, tiene costo y aún no está pagado
  const hasCost = consultation.pricing.finalPrice > 0;
  const isPaid = consultation.payment?.status === 'completed';
  const canPay = !isSpecialist && hasCost && !isPaid;

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
      
      <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backButton, canPay && { opacity: 0.3 }]}
          disabled={canPay}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {isSpecialist ? `Consulta de ${consultation.childName || 'Paciente'}` : (consultation.specialistName || 'Especialista')}
          </Text>
          <Text style={styles.headerSubtitle}>{consultation.type === 'chat' ? 'Chat' : 'Videollamada'}</Text>
        </View>
        {canCancel && !canPay && (
          <TouchableOpacity onPress={handleCancelConsultation} style={styles.cancelButton}>
            <Ionicons name="close-circle-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadConsultation(true)} colors={[MUNPA_PRIMARY]} />
          }
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Info de la consulta */}
          <View style={styles.consultationInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              {getStatusBadge(consultation.status)}
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Hijo:</Text>
              <Text style={styles.infoValue}>{consultation.childName}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Descripción:</Text>
            </View>
            <Text style={styles.descriptionText}>{consultation.request.description}</Text>
            
            {consultation.request.photos && consultation.request.photos.length > 0 && (
              <View style={styles.photosContainer}>
                {consultation.request.photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.consultationPhoto} />
                ))}
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Precio:</Text>
              <Text style={styles.priceText}>${consultation.pricing.finalPrice}</Text>
            </View>
          </View>

          {/* Resultado de la consulta (cuando está completada) */}
          {(consultation.status === 'completed' && (consultation.result || consultation.outcome)) && (
            <View style={styles.resultSection}>
              <Text style={styles.resultTitle}>Resultado de la consulta</Text>
              {(() => {
                const r = consultation.result || consultation.outcome;
                if (!r) return null;
                return (
                  <>
                    {r.diagnosis && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Diagnóstico:</Text>
                        <Text style={styles.resultValue}>{r.diagnosis}</Text>
                      </View>
                    )}
                    {r.treatment && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Tratamiento:</Text>
                        <Text style={styles.resultValue}>{r.treatment}</Text>
                      </View>
                    )}
                    {r.prescriptions && r.prescriptions.length > 0 && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Recetas:</Text>
                        {r.prescriptions.map((p: any, i: number) => (
                          <View key={i} style={styles.prescriptionCard}>
                            <Text style={styles.prescriptionMedication}>{p.medication}</Text>
                            {(p.dosage || p.frequency) && (
                              <Text style={styles.prescriptionDetail}>{[p.dosage, p.frequency].filter(Boolean).join(' • ')}</Text>
                            )}
                            {p.duration && <Text style={styles.prescriptionDetail}>Duración: {p.duration}</Text>}
                            {p.instructions && <Text style={styles.prescriptionInstructions}>{p.instructions}</Text>}
                          </View>
                        ))}
                      </View>
                    )}
                    {r.notes && (
                      <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Notas:</Text>
                        <Text style={styles.resultValue}>{r.notes}</Text>
                      </View>
                    )}
                    {r.followUpRequired && (
                      <View style={[styles.resultRow, { alignItems: 'center' }]}>
                        <Ionicons name="calendar" size={16} color="#059669" />
                        <Text style={styles.followUpText}>
                          Control de seguimiento requerido
                          {'followUpDate' in r && r.followUpDate
                            ? ` · ${formatFollowUpDate(r.followUpDate)}`
                            : ''}
                        </Text>
                      </View>
                    )}
                  </>
                );
              })()}
            </View>
          )}

          {/* Acciones para especialista: Aceptar o Rechazar (cuando está pendiente) */}
          {isPendingForSpecialist && (
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>Decide sobre esta consulta</Text>
              <TouchableOpacity
                style={styles.manageButton}
                onPress={() => setShowManageModal(true)}
              >
                <Ionicons name="checkmark-done-circle-outline" size={24} color="#FFFFFF" />
                <Text style={styles.manageButtonText}>Aceptar o Rechazar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Acciones para especialista: Iniciar y Completar (cuando aceptada o en progreso) */}
          {canCompleteForSpecialist && (
            <View style={styles.actionsSection}>
              <Text style={styles.actionsTitle}>Acciones</Text>
              <View style={styles.actionsRow}>
                {canStartForSpecialist && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.startButton]}
                    onPress={handleStartConsultation}
                    disabled={joiningVideo}
                  >
                    {joiningVideo ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="play-circle" size={22} color="#FFFFFF" />
                    )}
                    <Text style={styles.actionBtnText}>
                      {isVideoConsultation ? 'Iniciar videollamada' : 'Iniciar consulta'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, styles.completeButton]}
                  onPress={() => setShowCompleteModal(true)}
                  disabled={joiningVideo}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Completar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Botón Iniciar videollamada (padre o especialista cuando ya está en progreso) */}
          {canJoinVideo && !canStartForSpecialist && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.manageButton, styles.videoButton]}
                onPress={handleJoinVideo}
                disabled={joiningVideo}
              >
                {joiningVideo ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="videocam" size={28} color="#FFFFFF" />
                )}
                <Text style={styles.manageButtonText}>
                  {joiningVideo ? 'Conectando...' : 'Iniciar videollamada'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Chat de mensajes */}
          {canChat && (
            <View style={styles.chatContainer}>
              <Text style={styles.chatTitle}>Conversación</Text>
              
              {messages.length === 0 ? (
                <View style={styles.emptyChat}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyChatText}>No hay mensajes aún</Text>
                  <Text style={styles.emptyChatSubtext}>Inicia la conversación con el especialista</Text>
                </View>
              ) : (
                messages.map(renderMessage)
              )}
            </View>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Modal Aceptar/Rechazar (solo especialista, consulta pendiente) */}
        {consultation && isPendingForSpecialist && (
          <ManageConsultationModal
            visible={showManageModal}
            onClose={() => setShowManageModal(false)}
            consultationId={consultationId}
            consultationType={consultation.type || 'chat'}
            onSuccess={() => {
              setShowManageModal(false);
              loadConsultation(true);
            }}
          />
        )}

        {/* Modal de pago (bloqueante - no se puede continuar sin pagar) */}
        {canPay && (
          <ConsultationPaymentModal
            visible={true}
            consultationId={consultationId}
            amount={consultation.pricing.finalPrice}
            onSuccess={() => loadConsultation(true)}
            onCancel={handleCancelConsultation}
          />
        )}

        {/* Modal Completar (especialista, consulta aceptada o en progreso) */}
        {consultation && canCompleteForSpecialist && (
          <CompleteConsultationModal
            visible={showCompleteModal}
            onClose={() => setShowCompleteModal(false)}
            consultationId={consultationId}
            onSuccess={() => {
              setShowCompleteModal(false);
              loadConsultation(true);
            }}
            canPrescribe={consultation.canPrescribe ?? user?.professionalProfile?.accountType === 'specialist'}
          />
        )}

        {/* Input de mensaje */}
        {canChat && (
          <View style={styles.messageInputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={handleAttachImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={MUNPA_PRIMARY} />
              ) : (
                <Ionicons name="image" size={24} color={MUNPA_PRIMARY} />
              )}
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor="#9CA3AF"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              maxLength={1000}
            />
            
            <TouchableOpacity
              style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSendMessage}
              disabled={!newMessage.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  cancelButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
  },
  consultationInfo: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 12,
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  consultationPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '700',
    color: MUNPA_PRIMARY,
  },
  resultSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 12,
  },
  resultRow: {
    marginBottom: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    width: '100%',
  },
  resultValue: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    flex: 1,
  },
  prescriptionCard: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  prescriptionMedication: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  prescriptionDetail: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  prescriptionInstructions: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  followUpText: {
    fontSize: 13,
    color: '#059669',
    marginLeft: 6,
  },
  actionsSection: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#887CBC',
    paddingVertical: 14,
    borderRadius: 12,
  },
  videoButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
  },
  manageButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
    minWidth: 140,
  },
  startButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chatContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    minHeight: 200,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
  },
  specialistMessage: {
    alignSelf: 'flex-start',
  },
  messageSenderPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '100%',
  },
  myMessageBubble: {
    backgroundColor: MUNPA_PRIMARY,
    borderBottomRightRadius: 4,
  },
  specialistMessageBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  specialistMessageText: {
    color: '#1F2937',
  },
  messageAttachments: {
    marginTop: 8,
  },
  messageAttachmentImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: '#FFFFFF',
    opacity: 0.7,
    textAlign: 'right',
  },
  specialistMessageTime: {
    color: '#6B7280',
  },
  messageInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: MUNPA_PRIMARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default ConsultationDetailScreen;
