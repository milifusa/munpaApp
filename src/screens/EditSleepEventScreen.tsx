import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { sleepService } from '../services/api';
import { SleepEntry, SleepPause } from '../types/sleep';

const EditSleepEventScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId, sleepEvent } = route.params as { eventId: string; sleepEvent: SleepEntry };

  // Estados para el formulario
  const [startTime, setStartTime] = useState(new Date(sleepEvent.startTime));
  const [endTime, setEndTime] = useState(
    sleepEvent.endTime ? new Date(sleepEvent.endTime) : new Date()
  );
  const [quality, setQuality] = useState(sleepEvent.quality || 'good');
  const [wakeUps, setWakeUps] = useState(sleepEvent.wakeUps?.toString() || '0');
  const [location, setLocation] = useState(sleepEvent.location || 'crib');
  const [notes, setNotes] = useState(sleepEvent.notes || '');
  const [pauses, setPauses] = useState<SleepPause[]>(sleepEvent.pauses || []);

  // Estados UI
  const [loading, setLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showAddPauseModal, setShowAddPauseModal] = useState(false);
  
  // Estados para nueva pausa
  const [newPauseDuration, setNewPauseDuration] = useState('');
  const [newPauseReason, setNewPauseReason] = useState('');

  // Calcular duraciones
  const calculateDurations = () => {
    if (!sleepEvent.endTime) {
      return { gross: 0, net: 0, pauses: 0 };
    }

    const start = startTime.getTime();
    const end = endTime.getTime();
    const grossMinutes = Math.floor((end - start) / (1000 * 60));
    
    const pausesTotal = pauses.reduce((sum, pause) => sum + pause.duration, 0);
    const netMinutes = Math.max(0, grossMinutes - pausesTotal);

    return {
      gross: grossMinutes,
      net: netMinutes,
      pauses: pausesTotal,
    };
  };

  const durations = calculateDurations();

  // Guardar cambios
  const handleSave = async () => {
    try {
      setLoading(true);

      // Validaciones
      const now = new Date();
      
      if (startTime > now) {
        Alert.alert('Error', 'No puedes registrar siestas en el futuro');
        setLoading(false);
        return;
      }

      if (endTime > now) {
        Alert.alert('Error', 'La hora de fin no puede ser en el futuro');
        setLoading(false);
        return;
      }

      if (endTime <= startTime) {
        Alert.alert('Error', 'La hora de fin debe ser posterior a la hora de inicio');
        setLoading(false);
        return;
      }

      // Actualizar horarios primero
      await sleepService.updateSleepTimes(eventId, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });

      // Actualizar otros campos
      await sleepService.updateSleepEvent(eventId, {
        quality: quality as any,
        wakeUps: parseInt(wakeUps) || 0,
        location: location as any,
        notes: notes.trim() || undefined,
      });

      Alert.alert('Éxito', 'Cambios guardados correctamente', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error('Error guardando cambios:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudieron guardar los cambios'
      );
    } finally {
      setLoading(false);
    }
  };

  // Agregar pausa
  const handleAddPause = async () => {
    const duration = parseInt(newPauseDuration);
    
    if (!duration || duration <= 0) {
      Alert.alert('Error', 'La duración debe ser un número mayor a 0');
      return;
    }

    try {
      setLoading(true);
      
      const response = await sleepService.addSleepPause(eventId, {
        duration,
        reason: newPauseReason.trim() || undefined,
      });

      if (response.success) {
        setPauses([...pauses, response.pause]);
        setNewPauseDuration('');
        setNewPauseReason('');
        setShowAddPauseModal(false);
        Alert.alert('Éxito', 'Pausa agregada correctamente');
      }
    } catch (error: any) {
      console.error('Error agregando pausa:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo agregar la pausa'
      );
    } finally {
      setLoading(false);
    }
  };

  // Eliminar siesta completa
  const handleDeleteSleepEvent = () => {
    Alert.alert(
      'Eliminar siesta',
      '¿Estás seguro de que deseas eliminar esta siesta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await sleepService.deleteSleepEvent(eventId);
              Alert.alert('Éxito', 'Siesta eliminada correctamente', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              console.error('Error eliminando siesta:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo eliminar la siesta'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Eliminar pausa
  const handleRemovePause = async (pauseId: string) => {
    Alert.alert(
      'Eliminar pausa',
      '¿Estás seguro de que deseas eliminar esta pausa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              await sleepService.removeSleepPause(eventId, pauseId);
              setPauses(pauses.filter(p => p.id !== pauseId));
              
              Alert.alert('Éxito', 'Pausa eliminada correctamente');
            } catch (error: any) {
              console.error('Error eliminando pausa:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo eliminar la pausa'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Formatear tiempo
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Formatear duración
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const qualityOptions = [
    { value: 'poor', label: 'Pobre', emoji: '😢', color: '#FF6B6B' },
    { value: 'fair', label: 'Regular', emoji: '😐', color: '#FFA500' },
    { value: 'good', label: 'Buena', emoji: '😊', color: '#4ECDC4' },
    { value: 'excellent', label: 'Excelente', emoji: '😄', color: '#2ECC71' },
  ];

  const locationOptions = [
    { value: 'crib', label: 'Cuna', icon: 'bed' },
    { value: 'stroller', label: 'Cochecito', icon: 'walk' },
    { value: 'car', label: 'Auto', icon: 'car' },
    { value: 'carrier', label: 'Portabebé', icon: 'body' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Siesta</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#FFF" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Tipo de sueño */}
        <View style={styles.typeCard}>
          <View style={styles.typeIcon}>
            <Text style={styles.typeEmoji}>
              {sleepEvent.type === 'nap' ? '☀️' : '🌙'}
            </Text>
          </View>
          <Text style={styles.typeLabel}>
            {sleepEvent.type === 'nap' ? 'Siesta' : 'Sueño nocturno'}
          </Text>
        </View>

        {/* Horarios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Horarios</Text>
          
          <View style={styles.timeRow}>
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#887CBC" />
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Inicio</Text>
                <Text style={styles.timeValue}>{formatTime(startTime)}</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#887CBC" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#667eea" />
              <View style={styles.timeInfo}>
                <Text style={styles.timeLabel}>Fin</Text>
                <Text style={styles.timeValue}>{formatTime(endTime)}</Text>
              </View>
              <Ionicons name="create-outline" size={20} color="#667eea" />
            </TouchableOpacity>
          </View>

          {/* Date Time Pickers */}
          {showStartPicker && (
            <DateTimePicker
              value={startTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowStartPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const now = new Date();
                  if (selectedDate > now) {
                    Alert.alert('Error', 'No puedes seleccionar una hora futura');
                    return;
                  }
                  if (selectedDate >= endTime) {
                    Alert.alert('Error', 'La hora de inicio debe ser anterior a la hora de fin');
                    return;
                  }
                  setStartTime(selectedDate);
                }
              }}
            />
          )}

          {showEndPicker && (
            <DateTimePicker
              value={endTime}
              mode="time"
              is24Hour={true}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowEndPicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const now = new Date();
                  if (selectedDate > now) {
                    Alert.alert('Error', 'No puedes seleccionar una hora futura');
                    return;
                  }
                  if (selectedDate <= startTime) {
                    Alert.alert('Error', 'La hora de fin debe ser posterior a la hora de inicio');
                    return;
                  }
                  setEndTime(selectedDate);
                }
              }}
            />
          )}
        </View>

        {/* Duraciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💤 Duración</Text>
          
          <View style={styles.durationGrid}>
            <View style={styles.durationCard}>
              <Ionicons name="hourglass-outline" size={24} color="#887CBC" />
              <Text style={styles.durationLabel}>Total</Text>
              <Text style={styles.durationValue}>{formatDuration(durations.gross)}</Text>
            </View>

            <View style={styles.durationCard}>
              <Ionicons name="pause-circle-outline" size={24} color="#FFA500" />
              <Text style={styles.durationLabel}>Pausas</Text>
              <Text style={styles.durationValue}>{formatDuration(durations.pauses)}</Text>
            </View>

            <View style={[styles.durationCard, styles.durationCardHighlight]}>
              <Ionicons name="checkmark-circle" size={24} color="#2ECC71" />
              <Text style={styles.durationLabel}>Efectiva</Text>
              <Text style={[styles.durationValue, { color: '#2ECC71' }]}>
                {formatDuration(durations.net)}
              </Text>
            </View>
          </View>
        </View>

        {/* Pausas/Interrupciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>⏸️ Pausas/Interrupciones</Text>
            <TouchableOpacity
              style={styles.addPauseButton}
              onPress={() => setShowAddPauseModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#887CBC" />
              <Text style={styles.addPauseText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          {pauses.length > 0 ? (
            pauses.map((pause, index) => (
              <View key={pause.id || index} style={styles.pauseCard}>
                <View style={styles.pauseIcon}>
                  <Ionicons name="pause" size={20} color="#FFA500" />
                </View>
                <View style={styles.pauseInfo}>
                  <Text style={styles.pauseDuration}>{pause.duration} min</Text>
                  {pause.reason && (
                    <Text style={styles.pauseReason}>{pause.reason}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removePauseButton}
                  onPress={() => handleRemovePause(pause.id)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyPauses}>
              <Ionicons name="moon-outline" size={32} color="#CCC" />
              <Text style={styles.emptyPausesText}>Sin interrupciones</Text>
            </View>
          )}
        </View>

        {/* Calidad */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⭐ Calidad del sueño</Text>
          
          <View style={styles.qualityGrid}>
            {qualityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.qualityOption,
                  quality === option.value && {
                    backgroundColor: option.color,
                    borderColor: option.color,
                  },
                ]}
                onPress={() => setQuality(option.value)}
              >
                <Text style={styles.qualityEmoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.qualityLabel,
                    quality === option.value && styles.qualityLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Despertares */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>😴 Despertares</Text>
          
          <View style={styles.wakeUpsContainer}>
            {[0, 1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.wakeUpButton,
                  wakeUps === num.toString() && styles.wakeUpButtonActive,
                ]}
                onPress={() => setWakeUps(num.toString())}
              >
                <Text
                  style={[
                    styles.wakeUpText,
                    wakeUps === num.toString() && styles.wakeUpTextActive,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Ubicación</Text>
          
          <View style={styles.locationGrid}>
            {locationOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.locationOption,
                  location === option.value && styles.locationOptionActive,
                ]}
                onPress={() => setLocation(option.value)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={location === option.value ? '#FFF' : '#887CBC'}
                />
                <Text
                  style={[
                    styles.locationLabel,
                    location === option.value && styles.locationLabelActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Notas</Text>
          
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Agrega notas sobre el sueño..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Botón de eliminar */}
        <View style={styles.deleteSection}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteSleepEvent}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="#FFF" />
            <Text style={styles.deleteButtonText}>Eliminar siesta</Text>
          </TouchableOpacity>
        </View>

        {/* Espaciado final */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal de agregar pausa */}
      <Modal
        visible={showAddPauseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPauseModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Agregar Pausa</Text>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Duración (minutos) *</Text>
              <TextInput
                style={styles.modalInput}
                value={newPauseDuration}
                onChangeText={setNewPauseDuration}
                placeholder="Ej: 10"
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalField}>
              <Text style={styles.modalLabel}>Razón (opcional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={newPauseReason}
                onChangeText={setNewPauseReason}
                placeholder="Ej: Despertó llorando"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowAddPauseModal(false);
                  setNewPauseDuration('');
                  setNewPauseReason('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleAddPause}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmText}>Agregar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#96d2d3',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  saveButton: {
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  typeEmoji: {
    fontSize: 24,
  },
  typeLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  section: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 15,
    fontFamily: 'Montserrat',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  durationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  durationCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  durationCardHighlight: {
    borderWidth: 2,
    borderColor: '#2ECC71',
  },
  durationLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  durationValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  addPauseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addPauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  pauseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pauseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF5E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  pauseInfo: {
    flex: 1,
  },
  pauseDuration: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  pauseReason: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  removePauseButton: {
    padding: 8,
  },
  emptyPauses: {
    backgroundColor: '#FFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
    borderStyle: 'dashed',
  },
  emptyPausesText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
    fontFamily: 'Montserrat',
  },
  qualityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  qualityOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  qualityEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  qualityLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  qualityLabelActive: {
    color: '#FFF',
  },
  wakeUpsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  wakeUpButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  wakeUpButtonActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#887CBC',
  },
  wakeUpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    fontFamily: 'Montserrat',
  },
  wakeUpTextActive: {
    color: '#FFF',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  locationOption: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F0F0F0',
  },
  locationOptionActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#887CBC',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  locationLabelActive: {
    color: '#FFF',
  },
  notesInput: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 120,
    fontFamily: 'Montserrat',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  modalField: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  modalInput: {
    backgroundColor: '#F7FAFC',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalTextArea: {
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Montserrat',
  },
  modalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#96d2d3',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  deleteSection: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
});

export default EditSleepEventScreen;

