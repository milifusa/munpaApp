import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  Linking,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Post, Attendee } from '../types/posts';
import eventsService from '../services/eventsService';
import { useAuth } from '../contexts/AuthContext';
import QRCode from 'react-native-qrcode-svg';
import analyticsService from '../services/analyticsService';

const EventDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { event: initialEvent, postId } = route.params || {};

  const [event, setEvent] = useState<Post | null>(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent && !!postId); // Loading si no hay evento inicial pero sí postId
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [isLoadingAttendees, setIsLoadingAttendees] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [showAllAttendees, setShowAllAttendees] = useState(false);
  
  // NUEVO: Estados para funcionalidades nuevas
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [showCalendarOptions, setShowCalendarOptions] = useState(false);

  const isOrganizer = user?.id === event?.authorId;

  // Cargar evento si solo se pasó postId
  useEffect(() => {
    const loadEvent = async () => {
      if (postId && !initialEvent) {
        console.log('📥 [EVENT DETAIL] Cargando evento con postId:', postId);
        try {
          setLoading(true);
          const { communitiesService } = await import('../services/api');
          const response = await communitiesService.getPost(postId);
          console.log('✅ [EVENT DETAIL] Evento cargado:', response);
          
          // Extraer el evento de response.data si existe, si no, usar response directamente
          const eventData = response?.data || response;
          
          if (eventData && eventData.id) {
            console.log('✅ [EVENT DETAIL] Estableciendo evento:', eventData);
            setEvent(eventData);
            
            // ✅ Analytics: Evento cargado
            analyticsService.logEvent('event_detail_viewed', {
              event_id: eventData.id,
              event_title: eventData.eventData?.title,
              community_id: eventData.communityId,
              is_organizer: user?.id === eventData.authorId,
            });
          } else {
            console.error('❌ [EVENT DETAIL] Respuesta inválida:', response);
            Alert.alert('Error', 'No se pudo cargar el evento');
            navigation.goBack();
          }
        } catch (error: any) {
          console.error('❌ [EVENT DETAIL] Error cargando evento:', error);
          Alert.alert('Error', 'Evento no encontrado');
          navigation.goBack();
        } finally {
          setLoading(false);
        }
      } else if (initialEvent) {
        // ✅ Analytics: Evento visto desde navegación directa
        analyticsService.logEvent('event_detail_viewed', {
          event_id: initialEvent.id,
          event_title: initialEvent.eventData?.title,
          community_id: initialEvent.communityId,
          is_organizer: user?.id === initialEvent.authorId,
        });
      }
    };
    
    loadEvent();
  }, [postId, initialEvent]);

  useEffect(() => {
    if (event?.id) {
      loadAttendees();
    }
  }, [event?.id]);

  const loadAttendees = async () => {
    try {
      setIsLoadingAttendees(true);
      const response = await eventsService.getAttendees(event.id);
      setAttendees(response.attendees || []);
    } catch (error) {
      console.error('Error cargando asistentes:', error);
    } finally {
      setIsLoadingAttendees(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Evento',
      '¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { communitiesService } = await import('../services/api');
              await communitiesService.deletePost(event.id);
              Alert.alert('Éxito', 'Evento eliminado correctamente');
              navigation.goBack();
            } catch (error: any) {
              console.error('Error eliminando evento:', error);
              Alert.alert('Error', error.response?.data?.message || 'No se pudo eliminar el evento');
            }
          },
        },
      ]
    );
  };

  const handleAttend = async () => {
    if (eventsService.isEventPast(event)) {
      Alert.alert('Evento Finalizado', 'Este evento ya terminó');
      return;
    }

    try {
      setIsAttending(true);
      
      if (event.userAttending) {
        // Cancelar asistencia
        await eventsService.cancelAttendance(event.id);
        
        // ✅ Analytics: Cancelar asistencia
        analyticsService.logEvent('event_attendance_cancelled', {
          event_id: event.id,
          event_title: event.eventData?.title,
          community_id: event.communityId,
        });
        
        Alert.alert('Asistencia Cancelada', 'Ya no confirmarás asistencia a este evento');
        setEvent(prev => ({
          ...prev,
          userAttending: false,
          eventData: prev.eventData ? {
            ...prev.eventData,
            attendeeCount: prev.eventData.attendeeCount - 1,
          } : undefined,
        }));
      } else if (event.userInWaitlist) {
        // Salir de lista de espera
        await eventsService.leaveWaitlist(event.id);
        
        // ✅ Analytics: Salir de lista de espera
        analyticsService.logEvent('event_waitlist_left', {
          event_id: event.id,
          event_title: event.eventData?.title,
          community_id: event.communityId,
        });
        
        Alert.alert('Saliste de la Lista', 'Ya no estás en la lista de espera');
        setEvent(prev => ({
          ...prev,
          userInWaitlist: false,
          eventData: prev.eventData ? {
            ...prev.eventData,
            waitlistCount: (prev.eventData.waitlistCount || 0) - 1,
          } : undefined,
        }));
      } else {
        // Confirmar asistencia o entrar a lista de espera
        const response = await eventsService.attendEvent(event.id);
        
        if (response.userInWaitlist) {
          // Agregado a lista de espera
          // ✅ Analytics: Agregado a lista de espera
          analyticsService.logEvent('event_waitlist_joined', {
            event_id: event.id,
            event_title: event.eventData?.title,
            community_id: event.communityId,
            waitlist_position: response.waitlistCount,
          });
          
          Alert.alert(
            '📋 Lista de Espera',
            'El evento está lleno. Te agregamos a la lista de espera. Te notificaremos si se libera un cupo.',
            [{ text: 'OK' }]
          );
          setEvent(prev => ({
            ...prev,
            userInWaitlist: true,
            userAttending: false,
            eventData: prev.eventData ? {
              ...prev.eventData,
              waitlistCount: response.waitlistCount || 0,
            } : undefined,
          }));
        } else {
          // Asistencia confirmada
          // ✅ Analytics: Asistencia confirmada
          analyticsService.logEvent('event_attendance_confirmed', {
            event_id: event.id,
            event_title: event.eventData?.title,
            community_id: event.communityId,
            attendee_count: response.attendeeCount,
          });
          
          Alert.alert('¡Confirmado!', 'Tu asistencia fue confirmada. Te enviaremos un recordatorio.');
          setEvent(prev => ({
            ...prev,
            userAttending: true,
            userInWaitlist: false,
            eventData: prev.eventData ? {
              ...prev.eventData,
              attendeeCount: response.attendeeCount,
            } : undefined,
          }));
        }
      }
      
      loadAttendees();
    } catch (error: any) {
      console.error('Error confirmando asistencia:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo procesar tu solicitud');
    } finally {
      setIsAttending(false);
    }
  };

  const openMap = () => {
    if (!event.eventData?.location?.latitude || !event.eventData?.location?.longitude) {
      Alert.alert('Ubicación No Disponible', 'Este evento no tiene coordenadas GPS');
      return;
    }

    const { latitude, longitude } = event.eventData.location;
    const label = event.eventData.location.name;
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    Linking.openURL(url!);
  };

  // NUEVO: Generar QR para check-in (solo organizador)
  const handleGenerateQR = async () => {
    try {
      const response = await eventsService.generateQRCode(event.id);
      setQrData(response);
      setShowQRModal(true);
      
      // ✅ Analytics: QR generado
      analyticsService.logEvent('event_qr_generated', {
        event_id: event.id,
        event_title: event.eventData?.title,
        community_id: event.communityId,
      });
    } catch (error: any) {
      console.error('Error generando QR:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo generar el código QR');
    }
  };

  // NUEVO: Hacer check-in
  const handleCheckIn = async () => {
    if (!checkInCode.trim()) {
      Alert.alert('Código Requerido', 'Por favor ingresa el código del evento');
      return;
    }

    try {
      setIsCheckingIn(true);
      const response = await eventsService.checkIn(event.id, checkInCode.trim().toUpperCase());
      
      // ✅ Analytics: Check-in exitoso
      analyticsService.logEvent('event_checkin_completed', {
        event_id: event.id,
        event_title: event.eventData?.title,
        community_id: event.communityId,
        checkin_count: response.checkedInCount,
      });
      
      Alert.alert('✅ Check-in Exitoso', 'Tu asistencia fue registrada correctamente');
      setShowCheckInModal(false);
      setCheckInCode('');
      
      // Actualizar estado del evento
      setEvent(prev => ({
        ...prev,
        userCheckedIn: true,
        eventData: prev.eventData ? {
          ...prev.eventData,
          checkedInCount: response.checkedInCount,
        } : undefined,
      }));
    } catch (error: any) {
      console.error('Error en check-in:', error);
      Alert.alert('Error', error.response?.data?.message || 'Código inválido o ya hiciste check-in');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // NUEVO: Agregar a Google Calendar
  const handleAddToGoogleCalendar = async () => {
    try {
      const response = await eventsService.getGoogleCalendarUrl(event.id);
      Linking.openURL(response.googleCalendarUrl);
      setShowCalendarOptions(false);
      
      // ✅ Analytics: Agregado a Google Calendar
      analyticsService.logEvent('event_added_to_google_calendar', {
        event_id: event.id,
        event_title: event.eventData?.title,
        community_id: event.communityId,
      });
    } catch (error: any) {
      console.error('Error obteniendo URL de Google Calendar:', error);
      Alert.alert('Error', 'No se pudo generar el enlace de Google Calendar');
    }
  };

  // NUEVO: Descargar archivo .ics
  const handleDownloadICS = () => {
    const icsUrl = `${eventsService.getICSFileUrl(event.id)}`;
    Linking.openURL(icsUrl);
    setShowCalendarOptions(false);
    
    // ✅ Analytics: Descargado archivo ICS
    analyticsService.logEvent('event_ics_downloaded', {
      event_id: event.id,
      event_title: event.eventData?.title,
      community_id: event.communityId,
    });
  };

  // Mostrar loading mientras se carga el evento
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando evento...</Text>
      </View>
    );
  }

  if (!event || !event.eventData) {
    return (
      <View style={styles.container}>
        <Text>Evento no encontrado</Text>
      </View>
    );
  }

  const eventData = event.eventData;
  const isFull = eventsService.isEventFull(event);
  const isPast = eventsService.isEventPast(event);
  const isCancelled = eventData.status === 'cancelled';
  const timeUntil = eventsService.getTimeUntilEvent(eventData.eventDate);

  const displayedAttendees = showAllAttendees ? attendees : attendees.slice(0, 5);

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#887CBC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle del Evento</Text>
        <View style={styles.headerActions}>
          {isOrganizer && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Imagen */}
        {event.imageUrl && (
          <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
        )}

        {/* Badge de estado */}
        {isCancelled && (
          <View style={[styles.statusBanner, styles.statusCancelled]}>
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
            <Text style={styles.statusBannerText}>Este evento fue cancelado</Text>
          </View>
        )}
        {isPast && !isCancelled && (
          <View style={[styles.statusBanner, styles.statusPast]}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.statusBannerText}>Este evento ya finalizó</Text>
          </View>
        )}

        {/* Título y fecha */}
        <View style={styles.section}>
          <Text style={styles.eventTitle}>{eventData.title}</Text>
          <View style={styles.dateContainer}>
            <Ionicons name="calendar" size={20} color="#887CBC" />
            <Text style={styles.dateText}>
              {eventsService.formatEventDate(eventData.eventDate)}
            </Text>
          </View>
          {timeUntil && !isPast && (
            <View style={styles.timeUntilContainer}>
              <Text style={styles.timeUntilText}>{timeUntil}</Text>
            </View>
          )}
        </View>

        {/* Ubicación */}
        {eventData.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={styles.locationCard}>
              <Ionicons name="location" size={24} color="#887CBC" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{eventData.location.name}</Text>
                {eventData.location.address && (
                  <Text style={styles.locationAddress}>{eventData.location.address}</Text>
                )}
              </View>
              {eventData.location.latitude && (
                <TouchableOpacity onPress={openMap} style={styles.mapButton}>
                  <Ionicons name="navigate" size={20} color="#887CBC" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{event.content}</Text>
        </View>

        {/* NUEVO: Botones de Acción (Agregar a Calendario, Check-in, QR) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          
          {/* Agregar a Calendario */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowCalendarOptions(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#887CBC" />
            <Text style={styles.actionButtonText}>Agregar a mi calendario</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Check-in (solo si está confirmado y no ha hecho check-in) */}
          {event.userAttending && !event.userCheckedIn && !isPast && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowCheckInModal(true)}
            >
              <Ionicons name="qr-code-outline" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Hacer check-in</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          {/* Badge de check-in realizado */}
          {event.userCheckedIn && (
            <View style={styles.checkedInBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.checkedInText}>✓ Check-in realizado</Text>
            </View>
          )}

          {/* Generar QR (solo organizador) */}
          {isOrganizer && !isPast && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={handleGenerateQR}
            >
              <Ionicons name="qr-code" size={20} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                Generar QR para check-in
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Asistentes */}
        <View style={styles.section}>
          <View style={styles.attendeesHeader}>
            <Text style={styles.sectionTitle}>
              Asistentes ({eventData.attendeeCount})
              {eventData.maxAttendees && ` / ${eventData.maxAttendees}`}
            </Text>
            {isFull && (
              <View style={styles.fullBadge}>
                <Text style={styles.fullBadgeText}>Cupo Lleno</Text>
              </View>
            )}
          </View>

          {/* NUEVO: Lista de espera */}
          {eventData.waitlistCount && eventData.waitlistCount > 0 && (
            <View style={styles.waitlistBanner}>
              <Ionicons name="list" size={16} color="#F59E0B" />
              <Text style={styles.waitlistText}>
                {eventData.waitlistCount} {eventData.waitlistCount === 1 ? 'persona' : 'personas'} en lista de espera
              </Text>
            </View>
          )}

          {/* Badge de check-ins (solo organizador) */}
          {isOrganizer && eventData.checkedInCount !== undefined && (
            <View style={styles.checkInStats}>
              <Ionicons name="checkbox-outline" size={16} color="#10B981" />
              <Text style={styles.checkInStatsText}>
                {eventData.checkedInCount} de {eventData.attendeeCount} hicieron check-in
              </Text>
            </View>
          )}

          {isLoadingAttendees ? (
            <ActivityIndicator size="small" color="#887CBC" />
          ) : attendees.length > 0 ? (
            <>
              {displayedAttendees.map((attendee, index) => (
                <View key={attendee.userId} style={styles.attendeeItem}>
                  <View style={styles.attendeeAvatar}>
                    {attendee.userPhoto ? (
                      <Image source={{ uri: attendee.userPhoto }} style={styles.attendeeAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={20} color="#887CBC" />
                    )}
                  </View>
                  <Text style={styles.attendeeName}>{attendee.userName}</Text>
                </View>
              ))}
              {attendees.length > 5 && !showAllAttendees && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllAttendees(true)}
                >
                  <Text style={styles.showMoreText}>
                    Ver todos ({attendees.length})
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.noAttendeesText}>Aún no hay asistentes confirmados</Text>
          )}
        </View>

        {/* Organizador */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organizado por</Text>
          <View style={styles.organizerCard}>
            <View style={styles.organizerAvatar}>
              {event.authorPhoto ? (
                <Image source={{ uri: event.authorPhoto }} style={styles.organizerAvatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#887CBC" />
              )}
            </View>
            <Text style={styles.organizerName}>{event.authorName}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Botón de acción fijo */}
      {!isPast && !isCancelled && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[
              styles.attendButton,
              event.userAttending && styles.attendButtonActive,
              event.userInWaitlist && styles.attendButtonWaitlist,
              (isFull && !event.userAttending && !event.userInWaitlist) && styles.attendButtonDisabled,
            ]}
            onPress={handleAttend}
            disabled={isAttending}
          >
            {isAttending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons
                  name={
                    event.userAttending ? "checkmark-circle" : 
                    event.userInWaitlist ? "list" : 
                    "person-add"
                  }
                  size={20}
                  color={
                    event.userAttending ? "#10B981" : 
                    event.userInWaitlist ? "#F59E0B" : 
                    "#FFFFFF"
                  }
                />
                <Text style={[
                  styles.attendButtonText,
                  event.userAttending && styles.attendButtonTextActive,
                  event.userInWaitlist && styles.attendButtonTextWaitlist,
                ]}>
                  {event.userAttending ? 'Cancelar asistencia' : 
                   event.userInWaitlist ? 'Salir de lista de espera' :
                   isFull ? 'Unirme a lista de espera' : 
                   'Confirmar asistencia'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* NUEVO: Modal de QR Code */}
      <Modal
        visible={showQRModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQRModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Código QR para Check-in</Text>
              <TouchableOpacity onPress={() => setShowQRModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {qrData && (
              <>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={qrData.qrData}
                    size={200}
                  />
                </View>

                <View style={styles.codeDisplay}>
                  <Text style={styles.codeLabel}>Código:</Text>
                  <Text style={styles.codeValue}>{qrData.checkInCode}</Text>
                </View>

                {eventData.checkedInCount !== undefined && (
                  <View style={styles.qrStats}>
                    <Ionicons name="people" size={20} color="#887CBC" />
                    <Text style={styles.qrStatsText}>
                      {eventData.checkedInCount} de {eventData.attendeeCount} asistentes registrados
                    </Text>
                  </View>
                )}

                <Text style={styles.qrInstructions}>
                  Muestra este código QR en la entrada del evento para que los asistentes puedan hacer check-in
                </Text>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* NUEVO: Modal de Check-in */}
      <Modal
        visible={showCheckInModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCheckInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hacer Check-in</Text>
              <TouchableOpacity onPress={() => setShowCheckInModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.checkInInstructions}>
              Ingresa el código de 8 caracteres que aparece en el QR del organizador
            </Text>

            <TextInput
              style={styles.codeInput}
              placeholder="Ej: A7K9M2X1"
              value={checkInCode}
              onChangeText={setCheckInCode}
              autoCapitalize="characters"
              maxLength={8}
            />

            <TouchableOpacity
              style={[styles.checkInButton, isCheckingIn && styles.checkInButtonDisabled]}
              onPress={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.checkInButtonText}>Confirmar Check-in</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* NUEVO: Modal de opciones de calendario */}
      <Modal
        visible={showCalendarOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendarOptions(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Agregar a Calendario</Text>
              <TouchableOpacity onPress={() => setShowCalendarOptions(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.calendarOption}
              onPress={handleAddToGoogleCalendar}
            >
              <Ionicons name="logo-google" size={24} color="#4285F4" />
              <Text style={styles.calendarOptionText}>Google Calendar</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.calendarOption}
              onPress={handleDownloadICS}
            >
              <Ionicons name="download-outline" size={24} color="#887CBC" />
              <Text style={styles.calendarOptionText}>Descargar archivo .ics</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <Text style={styles.calendarNote}>
              Compatible con Apple Calendar, Outlook y otras apps de calendario
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#887CBC',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#887CBC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  content: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  eventImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F3F4F6',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
  },
  statusCancelled: {
    backgroundColor: '#EF4444',
  },
  statusPast: {
    backgroundColor: '#6B7280',
  },
  statusBannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 12,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  timeUntilContainer: {
    marginTop: 8,
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  timeUntilText: {
    fontSize: 13,
    color: '#887CBC',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  locationAddress: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Montserrat',
    marginTop: 2,
  },
  mapButton: {
    padding: 8,
  },
  description: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    fontFamily: 'Montserrat',
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fullBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  fullBadgeText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendeeAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  attendeeName: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  noAttendeesText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
    fontStyle: 'italic',
  },
  showMoreButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  attendButton: {
    backgroundColor: '#887CBC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  attendButtonActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  attendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  attendButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  attendButtonTextActive: {
    color: '#10B981',
  },
  // NUEVOS ESTILOS
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  actionButtonPrimary: {
    backgroundColor: '#887CBC',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  actionButtonTextPrimary: {
    color: '#FFFFFF',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  checkedInText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: 'Montserrat',
  },
  waitlistBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    marginBottom: 12,
  },
  waitlistText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    fontFamily: 'Montserrat',
  },
  checkInStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    marginBottom: 12,
  },
  checkInStatsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    fontFamily: 'Montserrat',
  },
  attendButtonWaitlist: {
    backgroundColor: '#F59E0B',
  },
  attendButtonTextWaitlist: {
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  codeDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F3E8FF',
    borderRadius: 8,
    marginVertical: 16,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#887CBC',
    fontFamily: 'Montserrat',
    letterSpacing: 2,
  },
  qrStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  qrStatsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  qrInstructions: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
    fontFamily: 'Montserrat',
  },
  checkInInstructions: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  codeInput: {
    borderWidth: 2,
    borderColor: '#887CBC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat',
    letterSpacing: 2,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
  },
  checkInButtonDisabled: {
    opacity: 0.6,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  calendarOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 10,
  },
  calendarOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  calendarNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
    fontFamily: 'Montserrat',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
});

export default EventDetailScreen;
