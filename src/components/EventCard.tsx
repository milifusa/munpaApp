import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Post } from '../types/posts';
import eventsService from '../services/eventsService';

interface EventCardProps {
  post: Post;
  onViewDetail: (post: Post) => void;
  onAttend?: (post: Post) => void;
}

const EventCard: React.FC<EventCardProps> = ({ post, onViewDetail, onAttend }) => {
  const navigation = useNavigation<any>();
  const eventData = post.eventData;

  if (!eventData) return null;

  const isFull = eventsService.isEventFull(post);
  const isPast = eventsService.isEventPast(post);
  const isCancelled = eventData.status === 'cancelled';
  const userAttending = post.userAttending || false;

  const getStatusBadge = () => {
    if (isCancelled) {
      return (
        <View style={[styles.statusBadge, styles.statusCancelled]}>
          <Ionicons name="close-circle" size={14} color="#EF4444" />
          <Text style={styles.statusTextCancelled}>Cancelado</Text>
        </View>
      );
    }
    if (isPast) {
      return (
        <View style={[styles.statusBadge, styles.statusPast]}>
          <Ionicons name="checkmark-circle" size={14} color="#6B7280" />
          <Text style={styles.statusTextPast}>Finalizado</Text>
        </View>
      );
    }
    if (isFull) {
      return (
        <View style={[styles.statusBadge, styles.statusFull]}>
          <Ionicons name="people" size={14} color="#F59E0B" />
          <Text style={styles.statusTextFull}>Cupo lleno</Text>
        </View>
      );
    }
    return null;
  };

  const formatShortDate = () => {
    try {
      let date: Date;
      if (eventData.eventDate._seconds) {
        date = new Date(eventData.eventDate._seconds * 1000);
      } else {
        date = new Date(eventData.eventDate);
      }
      
      const day = date.getDate();
      const month = date.toLocaleDateString('es-ES', { month: 'short' });
      const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      return { day, month, time };
    } catch {
      return { day: '--', month: '---', time: '--:--' };
    }
  };

  const { day, month, time } = formatShortDate();
  const timeUntil = eventsService.getTimeUntilEvent(eventData.eventDate);

  return (
    <TouchableOpacity 
      style={styles.eventCard}
      onPress={() => onViewDetail(post)}
      activeOpacity={0.7}
    >
      {/* Badge de evento */}
      <View style={styles.eventBadge}>
        <Ionicons name="calendar" size={14} color="#FFFFFF" />
        <Text style={styles.eventBadgeText}>EVENTO</Text>
      </View>

      {/* Estado */}
      {getStatusBadge()}

      {/* Imagen del evento si existe */}
      {post.imageUrl && (
        <Image source={{ uri: post.imageUrl }} style={styles.eventImage} />
      )}

      {/* Contenido */}
      <View style={styles.eventContent}>
        {/* Fecha destacada */}
        <View style={styles.dateBox}>
          <Text style={styles.dateDay}>{day}</Text>
          <Text style={styles.dateMonth}>{month.toUpperCase()}</Text>
        </View>

        <View style={styles.eventInfo}>
          {/* Título */}
          <Text style={styles.eventTitle} numberOfLines={2}>
            {eventData.title}
          </Text>

          {/* Fecha y hora */}
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {time}{timeUntil ? ` • ${timeUntil}` : ''}
            </Text>
          </View>

          {/* Ubicación */}
          {eventData.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.infoText} numberOfLines={1}>
                {eventData.location.name}
              </Text>
            </View>
          )}

          {/* Asistentes */}
          <View style={styles.infoRow}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              {eventData.attendeeCount}{eventData.maxAttendees ? `/${eventData.maxAttendees}` : ''} {eventData.attendeeCount !== 1 ? 'asistentes' : 'asistente'}
            </Text>
          </View>
        </View>
      </View>

      {/* Botón de acción */}
      {!isPast && !isCancelled && (
        <View style={styles.actionContainer}>
          {userAttending ? (
            <View style={styles.attendingBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              <Text style={styles.attendingText}>Confirmaré asistencia</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.attendButton, isFull && styles.attendButtonDisabled]}
              onPress={(e) => {
                e.stopPropagation();
                if (onAttend && !isFull) {
                  onAttend(post);
                }
              }}
              disabled={isFull}
            >
              <Ionicons name="person-add-outline" size={18} color={isFull ? "#9CA3AF" : "#FFFFFF"} />
              <Text style={[styles.attendButtonText, isFull && styles.attendButtonTextDisabled]}>
                {isFull ? 'Cupo lleno' : 'Confirmar asistencia'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Footer con autor */}
      <View style={styles.footer}>
        <Text style={styles.authorText}>Organizado por {post.authorName}</Text>
        <TouchableOpacity onPress={() => onViewDetail(post)}>
          <Text style={styles.viewDetailsText}>Ver detalles →</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  eventBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#887CBC',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  eventBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  statusBadge: {
    position: 'absolute',
    top: 48,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    zIndex: 10,
  },
  statusCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusTextCancelled: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  statusPast: {
    backgroundColor: '#F3F4F6',
  },
  statusTextPast: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  statusFull: {
    backgroundColor: '#FEF3C7',
  },
  statusTextFull: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  eventImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#F3F4F6',
  },
  eventContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  dateBox: {
    width: 60,
    height: 60,
    backgroundColor: '#887CBC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  eventInfo: {
    flex: 1,
    gap: 6,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  attendButton: {
    backgroundColor: '#887CBC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  attendButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  attendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  attendButtonTextDisabled: {
    color: '#9CA3AF',
  },
  attendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    gap: 8,
  },
  attendingText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  authorText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#887CBC',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
});

export default EventCard;
