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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
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
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [maxConsultationsPerDay, setMaxConsultationsPerDay] = useState(10);

  useEffect(() => {
    analyticsService.logScreenView('specialist_schedule');
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/specialist/availability');
      console.log('📅 [SCHEDULE] Horario cargado:', response.data);
      
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
            });
          
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
        newSchedule[day as keyof Schedule] = [{ start: '09:00', end: '17:00' }];
      }
      return newSchedule;
    });
  };

  const isDayActive = (day: string) => {
    return schedule[day as keyof Schedule] !== undefined && 
           schedule[day as keyof Schedule]!.length > 0;
  };

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

      const requestData = {
        schedule: formattedSchedule,
        timezone: 'America/Guayaquil',
        maxConsultationsPerDay,
      };

      console.log('📤 [SCHEDULE] Guardando horario:', requestData);
      const response = await axiosInstance.put('/api/specialist/availability', requestData);
      
      console.log('✅ [SCHEDULE] Horario guardado:', response.data);
      
      analyticsService.logEvent('specialist_schedule_saved', {
        days_active: Object.keys(formattedSchedule).length,
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
            <View key={key} style={styles.dayRow}>
              <View style={styles.dayInfo}>
                <Text style={styles.dayLabel}>{label}</Text>
                {isDayActive(key) && (
                  <Text style={styles.dayTime}>
                    {schedule[key as keyof Schedule]?.[0]?.start || '09:00'} - {schedule[key as keyof Schedule]?.[0]?.end || '17:00'}
                  </Text>
                )}
              </View>
              <Switch
                value={isDayActive(key)}
                onValueChange={() => toggleDay(key)}
                trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                thumbColor={isDayActive(key) ? '#887CBC' : '#F3F4F6'}
                ios_backgroundColor="#D1D5DB"
              />
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
});

export default SpecialistScheduleScreen;
