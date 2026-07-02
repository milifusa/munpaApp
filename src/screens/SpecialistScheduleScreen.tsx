import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';

interface TimeSlot {
  start: string;
  end: string;
}

interface Schedule {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}

type PickerState = {
  day: keyof Schedule;
  index: number;
  field: 'start' | 'end';
} | null;

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const SpecialistScheduleScreen = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [maxConsultationsPerDay, setMaxConsultationsPerDay] = useState(10);
  const [activePicker, setActivePicker] = useState<PickerState>(null);

  useEffect(() => {
    analyticsService.logScreenView('specialist_schedule');
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/specialist/availability');
      
      const apiSchedule = response.data?.data?.schedule || response.data?.schedule || {};
      
      // Convertir el formato de la API al formato interno
      // De: { monday: ['09:00-17:00', '19:00-21:00'] }
      // A: { monday: [{ start: '09:00', end: '17:00' }, { start: '19:00', end: '21:00' }] }
      const formattedSchedule: Schedule = {};
      Object.keys(apiSchedule).forEach((day) => {
        const slots = apiSchedule[day];
        if (Array.isArray(slots) && slots.length > 0) {
          // Filtrar y convertir solo slots válidos
          const validSlots = slots
            .filter((slot: any) => typeof slot === 'string' && slot.includes('-'))
            .map((slot: string) => {
              const [start, end] = slot.split('-');
              return { start: start || '09:00', end: end || '17:00' };
            })
            .sort((a: TimeSlot, b: TimeSlot) => timeToMinutes(a.start) - timeToMinutes(b.start));
          
          if (validSlots.length > 0) {
            formattedSchedule[day as keyof Schedule] = validSlots;
          }
        }
      });
      
      setSchedule(formattedSchedule);
      
      const maxPerDay = response.data?.data?.maxConsultationsPerDay || response.data?.maxConsultationsPerDay || 10;
      setMaxConsultationsPerDay(maxPerDay);
    } catch (error: any) {
      console.error('❌ [SCHEDULE] Error cargando horario:', error);
      if (error.response?.status === 404) {
        // No tiene horario configurado aún, usar valores por defecto
        setSchedule({});
      } else {
        Alert.alert('Error', 'No se pudo cargar tu horario');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSchedule(prev => {
      const newSchedule = { ...prev };
      if (newSchedule[day as keyof Schedule]) {
        delete newSchedule[day as keyof Schedule];
      } else {
        newSchedule[day as keyof Schedule] = [{ start: '09:00', end: '10:00' }];
      }
      return newSchedule;
    });
  };

  const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  const minutesToTime = (totalMinutes: number) => {
    const clampedMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
    const hours = Math.floor(clampedMinutes / 60);
    const minutes = clampedMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const timeToDate = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  const dateToTime = (date: Date) => {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatTimeLabel = (time: string) => {
    return timeToDate(time).toLocaleTimeString('es-EC', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTotalSlots = (currentSchedule: Schedule) => {
    return Object.values(currentSchedule).reduce((total, slots) => total + (slots?.length || 0), 0);
  };

  const isDayActive = (day: string) => {
    return schedule[day as keyof Schedule] !== undefined && 
           schedule[day as keyof Schedule]!.length > 0;
  };

  const updateTimeSlot = (
    day: keyof Schedule,
    index: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setSchedule(prev => {
      const daySlots = [...(prev[day] || [])];
      if (!daySlots[index]) return prev;

      daySlots[index] = {
        ...daySlots[index],
        [field]: value,
      };

      return {
        ...prev,
        [day]: daySlots,
      };
    });
  };

  const addTimeSlot = (day: keyof Schedule) => {
    setSchedule(prev => {
      const daySlots = [...(prev[day] || [])].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
      const lastSlot = daySlots[daySlots.length - 1];
      const nextStart = lastSlot ? timeToMinutes(lastSlot.end) + 60 : 9 * 60;

      if (nextStart >= 23 * 60) {
        Alert.alert('Horario completo', 'No hay suficiente espacio al final del día para agregar otro rango.');
        return prev;
      }

      const newSlot: TimeSlot = {
        start: minutesToTime(nextStart),
        end: minutesToTime(Math.min(nextStart + 60, 23 * 60 + 59)),
      };

      return {
        ...prev,
        [day]: [...daySlots, newSlot],
      };
    });
  };

  const removeTimeSlot = (day: keyof Schedule, index: number) => {
    setSchedule(prev => {
      const daySlots = [...(prev[day] || [])];
      daySlots.splice(index, 1);

      const newSchedule = { ...prev };
      if (daySlots.length > 0) {
        newSchedule[day] = daySlots;
      } else {
        delete newSchedule[day];
      }

      return newSchedule;
    });
  };

  const validateSchedule = (currentSchedule: Schedule) => {
    for (const { key, label } of DAYS) {
      const dayKey = key as keyof Schedule;
      const slots = currentSchedule[dayKey] || [];
      const sortedSlots = [...slots].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));

      for (let index = 0; index < sortedSlots.length; index += 1) {
        const slot = sortedSlots[index];
        const startMinutes = timeToMinutes(slot.start);
        const endMinutes = timeToMinutes(slot.end);

        if (startMinutes >= endMinutes) {
          return `${label}: la hora de inicio debe ser anterior a la hora de fin.`;
        }

        const nextSlot = sortedSlots[index + 1];
        if (nextSlot && endMinutes > timeToMinutes(nextSlot.start)) {
          return `${label}: los rangos no deben solaparse.`;
        }
      }
    }

    return null;
  };

  const handlePickerChange = (event: any, selectedDate?: Date) => {
    if (!activePicker) return;

    if (Platform.OS !== 'ios') {
      setActivePicker(null);
    }

    if (event?.type === 'dismissed' || !selectedDate) {
      return;
    }

    updateTimeSlot(activePicker.day, activePicker.index, activePicker.field, dateToTime(selectedDate));
  };

  const activePickerSlot = activePicker ? schedule[activePicker.day]?.[activePicker.index] : undefined;

  const saveSchedule = async () => {
    try {
      setSaving(true);

      // Convertir el formato del schedule al formato esperado por la API
      // De: { monday: [{ start: '09:00', end: '17:00' }] }
      // A: { monday: ['09:00-17:00'] }
      const formattedSchedule: any = {};
      Object.keys(schedule).forEach((day) => {
        const slots = schedule[day as keyof Schedule];
        if (slots && slots.length > 0) {
          // Filtrar y convertir solo slots válidos
          const validSlots = slots
            .filter(slot => slot && slot.start && slot.end)
            .sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start))
            .map(slot => `${slot.start}-${slot.end}`);
          
          if (validSlots.length > 0) {
            formattedSchedule[day] = validSlots;
          }
        }
      });

      // Validar que haya al menos un día configurado
      if (Object.keys(formattedSchedule).length === 0) {
        Alert.alert('Error', 'Debes configurar al menos un día de disponibilidad');
        setSaving(false);
        return;
      }

      const validationError = validateSchedule(schedule);
      if (validationError) {
        Alert.alert('Revisa tus horarios', validationError);
        setSaving(false);
        return;
      }

      const requestData = {
        schedule: formattedSchedule,
        timezone: 'America/Guayaquil',
        maxConsultationsPerDay,
      };

      await axiosInstance.put('/api/specialist/availability', requestData);
      
      
      analyticsService.logEvent('specialist_schedule_saved', {
        days_active: Object.keys(formattedSchedule).length,
        total_slots: getTotalSlots(schedule),
        max_per_day: maxConsultationsPerDay,
      });

      Alert.alert('Éxito', 'Tu horario ha sido actualizado correctamente');
    } catch (error: any) {
      console.error('❌ [SCHEDULE] Error guardando horario:', error);
      Alert.alert('Error', 'No se pudo guardar tu horario. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando horario...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Información */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#887CBC" />
          <Text style={styles.infoText}>
            Selecciona los días y horarios en los que estarás disponible para atender consultas
          </Text>
        </View>

        {/* Días de la semana */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Días Disponibles</Text>
          
          {DAYS.map(({ key, label }) => (
            <View key={key} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dayInfo}>
                  <Text style={styles.dayLabel}>{label}</Text>
                  <Text style={[styles.dayTime, !isDayActive(key) && styles.dayTimeInactive]}>
                    {isDayActive(key)
                      ? `${schedule[key as keyof Schedule]?.length || 0} rango${(schedule[key as keyof Schedule]?.length || 0) === 1 ? '' : 's'} configurado${(schedule[key as keyof Schedule]?.length || 0) === 1 ? '' : 's'}`
                      : 'No disponible'}
                  </Text>
                </View>
                <Switch
                  value={isDayActive(key)}
                  onValueChange={() => toggleDay(key)}
                  trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                  thumbColor={isDayActive(key) ? '#887CBC' : '#F3F4F6'}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>

              {isDayActive(key) && (
                <View style={styles.timeSlotsContainer}>
                  {schedule[key as keyof Schedule]?.map((slot, index) => (
                    <View key={`${key}-${index}`} style={styles.timeSlotRow}>
                      <View style={styles.timeControls}>
                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => setActivePicker({ day: key as keyof Schedule, index, field: 'start' })}
                        >
                          <Text style={styles.timePickerLabel}>Inicio</Text>
                          <Text style={styles.timePickerValue}>{formatTimeLabel(slot.start)}</Text>
                        </TouchableOpacity>

                        <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />

                        <TouchableOpacity
                          style={styles.timePickerButton}
                          onPress={() => setActivePicker({ day: key as keyof Schedule, index, field: 'end' })}
                        >
                          <Text style={styles.timePickerLabel}>Fin</Text>
                          <Text style={styles.timePickerValue}>{formatTimeLabel(slot.end)}</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        style={styles.removeSlotButton}
                        onPress={() => removeTimeSlot(key as keyof Schedule, index)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addSlotButton}
                    onPress={() => addTimeSlot(key as keyof Schedule)}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#887CBC" />
                    <Text style={styles.addSlotText}>Agregar otro rango</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Consultas por día */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Límite de Consultas por Día</Text>
          <View style={styles.consultationsLimitCard}>
            <Ionicons name="people" size={24} color="#887CBC" />
            <View style={styles.consultationsLimitInfo}>
              <Text style={styles.consultationsLimitLabel}>
                Máximo de consultas diarias
              </Text>
              <Text style={styles.consultationsLimitValue}>
                {maxConsultationsPerDay} consultas
              </Text>
            </View>
          </View>
          <View style={styles.consultationsButtons}>
            <TouchableOpacity
              style={styles.consultationsButton}
              onPress={() => setMaxConsultationsPerDay(Math.max(1, maxConsultationsPerDay - 1))}
            >
              <Ionicons name="remove-circle" size={32} color="#E74C3C" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.consultationsButton}
              onPress={() => setMaxConsultationsPerDay(maxConsultationsPerDay + 1)}
            >
              <Ionicons name="add-circle" size={32} color="#10B981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nota */}
        <View style={styles.noteCard}>
          <Ionicons name="bulb" size={20} color="#F59E0B" />
          <Text style={styles.noteText}>
            Recuerda que los pacientes verán tu disponibilidad y podrán solicitar consultas en estos horarios
          </Text>
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveSchedule}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Guardar Horario</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {activePicker && activePickerSlot && Platform.OS === 'ios' && (
        <View style={styles.iosPickerContainer}>
          <View style={styles.iosPickerHeader}>
            <Text style={styles.iosPickerTitle}>
              {activePicker.field === 'start' ? 'Hora de inicio' : 'Hora de fin'}
            </Text>
            <TouchableOpacity onPress={() => setActivePicker(null)} style={styles.iosPickerDoneButton}>
              <Text style={styles.iosPickerDoneText}>Listo</Text>
            </TouchableOpacity>
          </View>
          <DateTimePicker
            value={timeToDate(activePickerSlot[activePicker.field])}
            mode="time"
            is24Hour={false}
            display="spinner"
            onChange={handlePickerChange}
          />
        </View>
      )}

      {activePicker && activePickerSlot && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={timeToDate(activePickerSlot[activePicker.field])}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handlePickerChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#887CBC',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginLeft: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  dayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  dayTime: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '500',
  },
  dayTimeInactive: {
    color: '#9CA3AF',
  },
  timeSlotsContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 10,
  },
  timeSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timeControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timePickerButton: {
    flex: 1,
    minHeight: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    backgroundColor: '#F8F7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  timePickerValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  removeSlotButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  addSlotButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#887CBC',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  addSlotText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#887CBC',
  },
  consultationsLimitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  consultationsLimitInfo: {
    flex: 1,
    marginLeft: 12,
  },
  consultationsLimitLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  consultationsLimitValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
  },
  consultationsButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  consultationsButton: {
    padding: 8,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
    marginLeft: 12,
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#887CBC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iosPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  iosPickerHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iosPickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  iosPickerDoneButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  iosPickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#887CBC',
  },
});

export default SpecialistScheduleScreen;
