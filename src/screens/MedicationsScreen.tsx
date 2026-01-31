import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService } from '../services/api';
import { medicationsService } from '../services/childProfileService';
import BannerCarousel from '../components/BannerCarousel';
import analyticsService from '../services/analyticsService';

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  birthDate?: string | null;
  dueDate?: string | null;
  photoUrl?: string | null;
  createdAt: any;
}

const MUNPA_PRIMARY = '#59C6C0';
const MUNPA_BG = '#96d2d3';

const MedicationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);

  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any | null>(null);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medDoseUnit, setMedDoseUnit] = useState('ml');
  const [medScheduleMode, setMedScheduleMode] = useState<'times' | 'interval'>('interval');
  const [medTimes, setMedTimes] = useState<string[]>(['08:00']);
  const [medEveryHours, setMedEveryHours] = useState('');
  const [medFirstDose, setMedFirstDose] = useState(new Date());
  const [medEndTime, setMedEndTime] = useState(new Date());
  const [medStartDate, setMedStartDate] = useState(new Date());
  const [medEndDate, setMedEndDate] = useState<Date | null>(null);
  const [medNotes, setMedNotes] = useState('');
  const [medScheduleDays, setMedScheduleDays] = useState('14');
  const [showMedStartDatePicker, setShowMedStartDatePicker] = useState(false);
  const [showMedEndDatePicker, setShowMedEndDatePicker] = useState(false);
  const [showMedFirstDosePicker, setShowMedFirstDosePicker] = useState(false);
  const [showMedEndTimePicker, setShowMedEndTimePicker] = useState(false);
  const [showMedTimePicker, setShowMedTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);

  const [showMedicationDetailModal, setShowMedicationDetailModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);

  const loadChildren = async () => {
    try {
      setLoading(true);
      const childrenResponse = await childrenService.getChildren();
      const data =
        (Array.isArray(childrenResponse?.data) && childrenResponse.data) ||
        (Array.isArray(childrenResponse?.data?.children) && childrenResponse.data.children) ||
        (Array.isArray(childrenResponse?.children) && childrenResponse.children) ||
        (Array.isArray(childrenResponse) && childrenResponse) ||
        [];
      if (data.length > 0) {
        setChildren(data);
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect = null;
        if (savedChildId) {
          childToSelect = data.find((c: Child) => c.id === savedChildId) || null;
        }
        if (!childToSelect && data.length > 0) {
          childToSelect = data[0];
          await AsyncStorage.setItem('selectedChildId', childToSelect.id);
        }
        if (childToSelect) {
          setSelectedChild(childToSelect);
        }
      } else {
        setChildren([]);
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('Error cargando hijos:', error);
      setChildren([]);
      setSelectedChild(null);
      Alert.alert('Error', 'No se pudieron cargar los datos de los hijos');
    } finally {
      setLoading(false);
    }
  };

  const syncSelectedChild = async () => {
    const savedChildId = await AsyncStorage.getItem('selectedChildId');
    if (!savedChildId || children.length === 0) return;
    if (selectedChild?.id === savedChildId) return;
    const child = children.find((c: Child) => c.id === savedChildId);
    if (child) {
      setSelectedChild(child);
    }
  };

  const loadMedications = async (childId: string) => {
    try {
      setLoadingMedications(true);
      const response = await medicationsService.getMedications(childId);
      const items =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        (Array.isArray(response?.medications) && response.medications) ||
        (Array.isArray(response) && response) ||
        [];
      console.log('💊 [MED] Medicamentos recibidos:', items);
      if (response?.success !== false) {
        setMedications(items);
      } else {
        setMedications([]);
      }
    } catch (error) {
      console.error('❌ Error cargando medicamentos:', error);
      setMedications([]);
    } finally {
      setLoadingMedications(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useFocusEffect(
    useCallback(() => {
      syncSelectedChild();
      if (selectedChild?.id) {
        loadMedications(selectedChild.id);
      }
    }, [selectedChild?.id, children.length])
  );

  const openAddMedicationModal = () => {
    analyticsService.logEvent('medication_add_opened', {
      child_id: selectedChild?.id,
    });
    setEditingMedication(null);
    setMedName('');
    setMedDose('');
    setMedDoseUnit('ml');
    setMedScheduleMode('interval');
    setMedTimes(['08:00']);
    setMedEveryHours('');
    setMedFirstDose(new Date());
    setMedEndTime(new Date());
    setMedStartDate(new Date());
    setMedEndDate(null);
    setMedNotes('');
    setMedScheduleDays('14');
    setShowMedicationModal(true);
  };

  const openEditMedicationModal = (medication: any) => {
    setEditingMedication(medication);
    setMedName(medication.name);
    setMedDose(medication.dose.toString());
    setMedDoseUnit(medication.doseUnit);

    if (medication.times && medication.times.length > 0) {
      setMedScheduleMode('times');
      setMedTimes(medication.times);
    } else if (medication.repeatEveryMinutes) {
      setMedScheduleMode('interval');
      setMedEveryHours((medication.repeatEveryMinutes / 60).toString());
      if (medication.startTime) {
        const [hours, minutes] = medication.startTime.split(':');
        const firstDose = new Date();
        firstDose.setHours(parseInt(hours), parseInt(minutes));
        setMedFirstDose(firstDose);
      }
      if (medication.endTime) {
        const [hours, minutes] = medication.endTime.split(':');
        const lastDose = new Date();
        lastDose.setHours(parseInt(hours), parseInt(minutes));
        setMedEndTime(lastDose);
      } else {
        setMedEndTime(new Date());
      }
    }

    if (medication.startDate) {
      setMedStartDate(new Date(medication.startDate));
    }
    if (medication.endDate) {
      setMedEndDate(new Date(medication.endDate));
    }
    setMedNotes(medication.notes || '');
    setMedScheduleDays(medication.scheduleDays?.toString() || '14');
    setShowMedicationModal(true);
  };

  const handleSaveMedication = async () => {
    if (!selectedChild) return;

    if (!medName.trim()) {
      Alert.alert('Error', 'El nombre del medicamento es requerido');
      return;
    }

    try {
      let times: string[] | undefined;
      let repeatEveryMinutes: number | undefined;
      let startTime: string | undefined;
      let endTime: string | undefined;

      const doseValue = parseFloat(medDose.trim());
      if (isNaN(doseValue) || doseValue <= 0) {
        Alert.alert('Error', 'Ingresa una dosis válida');
        return;
      }

      if (medScheduleMode === 'times') {
        times = medTimes;
      } else {
        const hours = parseFloat(medEveryHours);
        if (isNaN(hours) || hours <= 0) {
          Alert.alert('Error', 'Ingresa un intervalo válido en horas (ej: 0.1 para 6 minutos, 1 para 1 hora)');
          return;
        }
        repeatEveryMinutes = Math.round(hours * 60);
        startTime = `${medFirstDose.getHours().toString().padStart(2, '0')}:${medFirstDose.getMinutes().toString().padStart(2, '0')}`;
        endTime = `${medEndTime.getHours().toString().padStart(2, '0')}:${medEndTime.getMinutes().toString().padStart(2, '0')}`;
      }

      const scheduleDays = parseInt(medScheduleDays);
      if (isNaN(scheduleDays) || scheduleDays < 1 || scheduleDays > 60) {
        Alert.alert('Error', 'Los días de programación deben estar entre 1 y 60');
        return;
      }

      if (editingMedication) {
        await medicationsService.updateMedication(editingMedication.id, {
          name: medName.trim(),
          dose: doseValue,
          doseUnit: medDoseUnit.trim() || 'ml',
          times: medScheduleMode === 'times' ? times : undefined,
          repeatEveryMinutes,
          startTime,
          endTime,
          startDate: medStartDate.toISOString().split('T')[0],
          endDate: medEndDate ? medEndDate.toISOString().split('T')[0] : undefined,
          notes: medNotes.trim(),
          scheduleDays,
        });
        analyticsService.logEvent('medication_updated', {
          child_id: selectedChild.id,
          medication_name: medName.trim(),
          schedule_mode: medScheduleMode,
          has_notes: !!medNotes.trim(),
        });
      } else {
        await medicationsService.addMedication(selectedChild.id, {
          name: medName.trim(),
          dose: doseValue,
          doseUnit: medDoseUnit.trim() || 'ml',
          times: medScheduleMode === 'times' ? times : undefined,
          repeatEveryMinutes,
          startTime,
          endTime,
          startDate: medStartDate.toISOString().split('T')[0],
          endDate: medEndDate ? medEndDate.toISOString().split('T')[0] : undefined,
          notes: medNotes.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          scheduleDays,
        });
        analyticsService.logEvent('medication_added', {
          child_id: selectedChild.id,
          medication_name: medName.trim(),
          schedule_mode: medScheduleMode,
          has_notes: !!medNotes.trim(),
          schedule_days: scheduleDays,
        });
      }

      setShowMedicationModal(false);
      await loadMedications(selectedChild.id);
      Alert.alert('Éxito', editingMedication ? 'Medicamento actualizado' : 'Medicamento agregado');
    } catch (error: any) {
      console.error('Error guardando medicamento:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar el medicamento');
    }
  };

  const getMedicationTimes = (medication: any): string[] => {
    if (medication.times && medication.times.length > 0) {
      return medication.times;
    }
    return [];
  };

  const getScheduleSummary = (times: string[]): string => {
    if (times.length === 0) return 'Sin horario definido';
    if (times.length === 1) return `1 toma (${times[0]})`;
    return `${times.length} tomas (${times[0]}, ${times[times.length - 1]})`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.contentWrapper}>
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.screenHeader}>
              <View style={styles.screenHeaderIcon}>
                <Ionicons name="medkit-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.screenHeaderText}>
                <Text style={styles.screenHeaderTitle}>Medicación</Text>
                <Text style={styles.screenHeaderSubtitle}>
                  {selectedChild ? `Seguimiento de ${selectedChild.name}` : 'Seguimiento de tu bebé'}
                </Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
            </View>

            <BannerCarousel 
              section="medicina" 
              fallbackToHome={false} 
              imageResizeMode="cover"
              bannerHeight={180}
            />

            <View style={styles.medicationsSection}>
              <View style={styles.medicationsHeader}>
                <View>
                  <Text style={styles.medicationsTitle}>Medicamentos</Text>
                  <Text style={styles.medicationsSubtitle}>
                    {selectedChild ? `Para ${selectedChild.name}` : 'Selecciona un hijo'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.addMedicationButton} onPress={openAddMedicationModal}>
                  <Ionicons name="add-circle" size={20} color={MUNPA_PRIMARY} />
                  <Text style={styles.addMedicationButtonText}>Agregar</Text>
                </TouchableOpacity>
              </View>

              {loadingMedications ? (
                <View style={styles.medicationsLoadingCard}>
                  <ActivityIndicator size="small" color={MUNPA_PRIMARY} />
                  <Text style={styles.medicationsLoadingText}>Cargando medicamentos...</Text>
                </View>
              ) : medications.length === 0 ? (
                <View style={styles.emptyMedicationsCard}>
                  <Ionicons name="medkit-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyMedicationsText}>No hay medicamentos registrados</Text>
                  <Text style={styles.emptyMedicationsSubtext}>
                    Presiona "Agregar" para registrar un medicamento
                  </Text>
                </View>
              ) : (
                medications.map((medication) => (
                  <TouchableOpacity
                    key={medication.id}
                    style={styles.medicationCard}
                    onPress={() => {
                      setSelectedMedication(medication);
                      setShowMedicationDetailModal(true);
                    }}
                  >
                <View style={styles.medicationCardHeader}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <View
                    style={[
                      styles.medicationStatus,
                      { backgroundColor: medication.active ? 'rgba(86, 204, 242, 0.2)' : '#999' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.medicationStatusText,
                        { color: medication.active ? '#56CCF2' : '#FFF' },
                      ]}
                    >
                      {medication.active ? 'Activo' : 'Finalizado'}
                    </Text>
                  </View>
                </View>

                <View style={styles.medicationDoseRow}>
                  <Text style={styles.medicationDoseText}>
                    {medication.dose} {medication.doseUnit}
                  </Text>
                  <Text style={styles.medicationDoseSeparator}>·</Text>
                  <Text style={styles.medicationFrequencyText}>
                    {(() => {
                      const times = getMedicationTimes(medication);
                      if (times.length === 1) return '1 toma';
                      return `${times.length} tomas`;
                    })()}
                  </Text>
                </View>

                <View style={styles.medicationInfoGrid}>
                  <View style={styles.medicationInfoGridItem}>
                    <Text style={styles.medicationInfoLabel}>Última toma</Text>
                    <Text style={styles.medicationInfoValue}>
                      {(() => {
                        const times = getMedicationTimes(medication);
                        if (times.length === 0) return '—';
                        const now = new Date();
                        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
                        const pastTimes = times.filter((time: string) => {
                          const [h, m] = time.split(':').map(Number);
                          const timeTotalMinutes = h * 60 + m;
                          return timeTotalMinutes <= currentTotalMinutes;
                        });
                        return pastTimes.length > 0 ? pastTimes[pastTimes.length - 1] : '—';
                      })()}
                    </Text>
                  </View>

                  <View style={styles.medicationInfoGridItem}>
                    <Text style={styles.medicationInfoLabel}>Próxima toma</Text>
                    <Text style={styles.medicationInfoValue}>
                      {(() => {
                        const times = getMedicationTimes(medication);
                        if (times.length === 0) return '—';
                        const now = new Date();
                        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
                        const nextTime = times.find((time: string) => {
                          const [h, m] = time.split(':').map(Number);
                          const timeTotalMinutes = h * 60 + m;
                          return timeTotalMinutes > currentTotalMinutes;
                        });
                        return nextTime || times[0];
                      })()}
                    </Text>
                  </View>

                  <View style={styles.medicationInfoGridItem}>
                    <Text style={styles.medicationInfoLabel}>Frecuencia</Text>
                    <Text style={styles.medicationInfoValue}>
                      {(() => {
                        const times = getMedicationTimes(medication);
                        if (times.length === 1) return '1 toma al día';
                        return `${times.length} tomas al día`;
                      })()}
                    </Text>
                  </View>
                </View>

                {getMedicationTimes(medication).length > 0 && (
                  <View style={styles.medicationTimesContainer}>
                    {getMedicationTimes(medication).map((time: string, idx: number) => {
                      const now = new Date();
                      const [h, m] = time.split(':').map(Number);
                      const timeDate = new Date();
                      timeDate.setHours(h, m, 0, 0);
                      const isPast = timeDate.getTime() < now.getTime();
                      return (
                        <View
                          key={`${medication.id}-time-${idx}`}
                          style={[styles.medicationTimeChip, isPast && styles.medicationTimeChipPast]}
                        >
                          <Ionicons
                            name={isPast ? 'checkmark-circle' : 'time-outline'}
                            size={14}
                            color={isPast ? '#4CAF50' : '#56CCF2'}
                          />
                          <Text style={[styles.medicationTimeText, isPast && styles.medicationTimeTextPast]}>
                            {time}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                <View style={styles.medicationDatesRow}>
                  <View style={styles.medicationDateItem}>
                    <Text style={styles.medicationDateLabel}>Inicio</Text>
                    <Text style={styles.medicationDateValue}>
                      {medication.startDate
                        ? new Date(medication.startDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.medicationDateItem}>
                    <Text style={styles.medicationDateLabel}>Fin</Text>
                    <Text style={styles.medicationDateValue}>
                      {medication.endDate
                        ? new Date(medication.endDate).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : '—'}
                    </Text>
                  </View>
                </View>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </SafeAreaView>

      {selectedChild && (
        <TouchableOpacity
          style={[styles.fab, { bottom: 30 + insets.bottom }]}
          onPress={openAddMedicationModal}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={showMedicationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMedicationModal(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#887CBC' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.medModalContainer}
          >
            <View style={styles.medModalHeader}>
              <TouchableOpacity onPress={() => setShowMedicationModal(false)}>
                <Text style={styles.medModalCancelButton}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.medModalTitle}>
                {editingMedication ? 'Editar Medicamento' : 'Nuevo Medicamento'}
              </Text>
              <TouchableOpacity onPress={handleSaveMedication}>
                <Text style={styles.medModalSaveButton}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.medModalScrollView}>
              <View style={styles.medModalBody}>
                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Nombre del medicamento</Text>
                  <TextInput
                    style={styles.medInput}
                    value={medName}
                    onChangeText={setMedName}
                    placeholder="Ej: Paracetamol"
                  />
                </View>

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Dosis</Text>
                  <View style={styles.medInputRow}>
                    <TextInput
                      style={[styles.medInput, { flex: 2 }]}
                      value={medDose}
                      onChangeText={setMedDose}
                      placeholder="5"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.medInput, { flex: 1, marginLeft: 10 }]}
                      value={medDoseUnit}
                      onChangeText={setMedDoseUnit}
                      placeholder="ml"
                    />
                  </View>
                </View>

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>¿Cómo programar?</Text>
                  <View style={styles.medSegmentedControl}>
                    <TouchableOpacity
                      style={[styles.medSegment, medScheduleMode === 'interval' && styles.medActiveSegment]}
                      onPress={() => setMedScheduleMode('interval')}
                    >
                      <Text style={[styles.medSegmentText, medScheduleMode === 'interval' && styles.medActiveSegmentText]}>
                        Cada X horas
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.medSegment, medScheduleMode === 'times' && styles.medActiveSegment]}
                      onPress={() => setMedScheduleMode('times')}
                    >
                      <Text style={[styles.medSegmentText, medScheduleMode === 'times' && styles.medActiveSegmentText]}>
                        Horas exactas
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {medScheduleMode === 'interval' && (
                  <>
                    <View style={styles.medInputGroup}>
                      <Text style={styles.medInputLabel}>Cada cuántas horas</Text>
                      <TextInput
                        style={styles.medInput}
                        value={medEveryHours}
                        onChangeText={setMedEveryHours}
                        placeholder="Ej: 8"
                        keyboardType="decimal-pad"
                      />
                      <Text style={styles.medInputHelper}>
                        Puedes usar decimales (ej: 0.1 = 6 min, 0.5 = 30 min, 1 = 1 hora)
                      </Text>
                    </View>

                    <View style={styles.medInputGroup}>
                      <Text style={styles.medInputLabel}>Primera toma</Text>
                      <TouchableOpacity style={styles.medDateButton} onPress={() => setShowMedFirstDosePicker(true)}>
                        <Text style={styles.medDateButtonText}>
                          {medFirstDose.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                      {showMedFirstDosePicker && (
                        <DateTimePicker
                          value={medFirstDose}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, date) => {
                            setShowMedFirstDosePicker(Platform.OS === 'ios');
                            if (date) setMedFirstDose(date);
                          }}
                        />
                      )}
                    </View>

                    <View style={styles.medInputGroup}>
                      <Text style={styles.medInputLabel}>Hora fin</Text>
                      <TouchableOpacity style={styles.medDateButton} onPress={() => setShowMedEndTimePicker(true)}>
                        <Text style={styles.medDateButtonText}>
                          {medEndTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </TouchableOpacity>
                      {showMedEndTimePicker && (
                        <DateTimePicker
                          value={medEndTime}
                          mode="time"
                          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                          onChange={(event, date) => {
                            setShowMedEndTimePicker(Platform.OS === 'ios');
                            if (date) setMedEndTime(date);
                          }}
                        />
                      )}
                    </View>
                  </>
                )}

                {medScheduleMode === 'times' && (
                  <View style={styles.medInputGroup}>
                    <Text style={styles.medInputLabel}>Horarios</Text>
                    {medTimes.map((time, index) => (
                      <View key={index} style={styles.medTimeRow}>
                        <TouchableOpacity
                          style={styles.medTimeButton}
                          onPress={() => {
                            setEditingTimeIndex(index);
                            setShowMedTimePicker(true);
                          }}
                        >
                          <Text style={styles.medTimeButtonText}>{time}</Text>
                        </TouchableOpacity>
                        {medTimes.length > 1 && (
                          <TouchableOpacity
                            onPress={() => {
                              const newTimes = medTimes.filter((_, i) => i !== index);
                              setMedTimes(newTimes);
                            }}
                          >
                            <Ionicons name="trash" size={20} color="#F44336" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.medAddTimeButton}
                      onPress={() => setMedTimes([...medTimes, '09:00'])}
                    >
                      <Ionicons name="add-circle" size={20} color="#887CBC" />
                      <Text style={styles.medAddTimeButtonText}>Agregar horario</Text>
                    </TouchableOpacity>
                    {showMedTimePicker && editingTimeIndex !== null && (
                      <DateTimePicker
                        value={new Date(`2000-01-01T${medTimes[editingTimeIndex]}:00`)}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          setShowMedTimePicker(Platform.OS === 'ios');
                          if (date) {
                            const newTimes = [...medTimes];
                            newTimes[editingTimeIndex!] = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                            setMedTimes(newTimes);
                          }
                          if (event.type === 'set') {
                            setEditingTimeIndex(null);
                          }
                        }}
                      />
                    )}
                  </View>
                )}

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Fecha de inicio</Text>
                  <TouchableOpacity style={styles.medDateButton} onPress={() => setShowMedStartDatePicker(true)}>
                    <Text style={styles.medDateButtonText}>
                      {medStartDate.toLocaleDateString('es-ES')}
                    </Text>
                  </TouchableOpacity>
                  {showMedStartDatePicker && (
                    <DateTimePicker
                      value={medStartDate}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onChange={(event, date) => {
                        setShowMedStartDatePicker(Platform.OS === 'ios');
                        if (date) setMedStartDate(date);
                      }}
                    />
                  )}
                </View>

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Fecha de fin (opcional)</Text>
                  <TouchableOpacity style={styles.medDateButton} onPress={() => setShowMedEndDatePicker(true)}>
                    <Text style={styles.medDateButtonText}>
                      {medEndDate ? medEndDate.toLocaleDateString('es-ES') : 'Sin fecha de fin'}
                    </Text>
                  </TouchableOpacity>
                  {medEndDate && (
                    <TouchableOpacity style={styles.medRemoveButton} onPress={() => setMedEndDate(null)}>
                      <Text style={styles.medRemoveButtonText}>Quitar</Text>
                    </TouchableOpacity>
                  )}
                  {showMedEndDatePicker && (
                    <DateTimePicker
                      value={medEndDate || new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'compact' : 'default'}
                      onChange={(event, date) => {
                        setShowMedEndDatePicker(Platform.OS === 'ios');
                        if (date) setMedEndDate(date);
                      }}
                    />
                  )}
                </View>

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={[styles.medInput, styles.medTextArea]}
                    value={medNotes}
                    onChangeText={setMedNotes}
                    placeholder="Ej: Con alimento"
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Días a programar</Text>
                  <TextInput
                    style={styles.medInput}
                    value={medScheduleDays}
                    onChangeText={setMedScheduleDays}
                    placeholder="14"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showMedicationDetailModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMedicationDetailModal(false)}
      >
        <View style={styles.medDetailOverlay}>
          <View style={styles.medDetailContent}>
            <View style={styles.medDetailHeader}>
              <Text style={styles.medDetailTitle}>{selectedMedication?.name}</Text>
              <TouchableOpacity onPress={() => setShowMedicationDetailModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.medDetailBody}>
              <View style={styles.medDetailRow}>
                <Text style={styles.medDetailLabel}>Dosis:</Text>
                <Text style={styles.medDetailValue}>
                  {selectedMedication?.dose} {selectedMedication?.doseUnit}
                </Text>
              </View>

              <View style={styles.medDetailRow}>
                <Text style={styles.medDetailLabel}>Frecuencia:</Text>
                <Text style={styles.medDetailValue}>
                  {getMedicationTimes(selectedMedication || {}).length > 0
                    ? getScheduleSummary(getMedicationTimes(selectedMedication || {}))
                    : 'No especificado'}
                </Text>
              </View>

              {selectedMedication?.startDate && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Inicio:</Text>
                  <Text style={styles.medDetailValue}>
                    {new Date(selectedMedication.startDate).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}

              {selectedMedication?.endDate && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Fin:</Text>
                  <Text style={styles.medDetailValue}>
                    {new Date(selectedMedication.endDate).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}

              {selectedMedication?.notes && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Notas:</Text>
                  <Text style={styles.medDetailValue}>{selectedMedication.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.medDetailActions}>
              <TouchableOpacity
                style={[styles.medDetailButton, styles.medDetailEditButton]}
                onPress={() => {
                  setShowMedicationDetailModal(false);
                  openEditMedicationModal(selectedMedication);
                }}
              >
                <Ionicons name="create" size={20} color="#FFF" />
                <Text style={styles.medDetailButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.medDetailButton, styles.medDetailDeleteButton]}
                onPress={() => {
                  Alert.alert('Eliminar medicamento', '¿Estás seguro de que deseas eliminar este medicamento?', [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Eliminar',
                      style: 'destructive',
                      onPress: async () => {
                        try {
                          await medicationsService.deleteMedication(selectedMedication.id);
                          analyticsService.logEvent('medication_deleted', {
                            child_id: selectedChild?.id,
                            medication_name: selectedMedication.name,
                          });
                          setShowMedicationDetailModal(false);
                          if (selectedChild) {
                            await loadMedications(selectedChild.id);
                          }
                          Alert.alert('Éxito', 'Medicamento eliminado');
                        } catch (error) {
                          Alert.alert('Error', 'No se pudo eliminar el medicamento');
                        }
                      },
                    },
                  ]);
                }}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.medDetailButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MUNPA_BG,
  },
  safeArea: {
    flex: 1,
    backgroundColor: MUNPA_BG,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  screenHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenHeaderText: {
    flex: 1,
  },
  screenHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  screenHeaderSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  medicationsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 20,
  },
  medicationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  medicationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  medicationsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    opacity: 0.8,
    marginTop: 2,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addMedicationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUNPA_PRIMARY,
  },
  medicationsLoadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  medicationsLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyMedicationsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyMedicationsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyMedicationsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  medicationCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A202C',
    flex: 1,
  },
  medicationStatus: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  medicationStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  medicationDoseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  medicationDoseText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  medicationDoseSeparator: {
    fontSize: 14,
    color: '#CBD5E0',
    fontWeight: '700',
  },
  medicationFrequencyText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  medicationInfoGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  medicationInfoGridItem: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 10,
  },
  medicationInfoLabel: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  medicationInfoValue: {
    fontSize: 14,
    color: '#1A202C',
    fontWeight: '700',
  },
  medicationTimesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  medicationTimeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(86, 204, 242, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(86, 204, 242, 0.3)',
  },
  medicationTimeChipPast: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  medicationTimeText: {
    fontSize: 13,
    color: '#56CCF2',
    fontWeight: '600',
  },
  medicationTimeTextPast: {
    color: '#4CAF50',
  },
  medicationDatesRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  medicationDateItem: {
    flex: 1,
  },
  medicationDateLabel: {
    fontSize: 12,
    color: '#718096',
    marginBottom: 2,
    fontWeight: '500',
  },
  medicationDateValue: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  medModalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  medModalScrollView: {
    flex: 1,
  },
  medModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#887CBC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  medModalCancelButton: {
    fontSize: 16,
    color: '#FFF',
  },
  medModalSaveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  medModalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  medInputGroup: {
    marginBottom: 20,
  },
  medInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  medInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medInputHelper: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  medTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  medSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 2,
  },
  medSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  medActiveSegment: {
    backgroundColor: '#FFF',
  },
  medSegmentText: {
    fontSize: 14,
    color: '#666',
  },
  medActiveSegmentText: {
    color: '#887CBC',
    fontWeight: '600',
  },
  medDateButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medDateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  medRemoveButton: {
    marginTop: 8,
    padding: 8,
  },
  medRemoveButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  medTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  medTimeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medTimeButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  medAddTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#F0ECFF',
    borderRadius: 8,
  },
  medAddTimeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  medDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  medDetailContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  medDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  medDetailBody: {
    padding: 20,
  },
  medDetailRow: {
    marginBottom: 16,
  },
  medDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  medDetailValue: {
    fontSize: 16,
    color: '#333',
  },
  medDetailActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  medDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  medDetailEditButton: {
    backgroundColor: '#887CBC',
  },
  medDetailDeleteButton: {
    backgroundColor: '#F44336',
  },
  medDetailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default MedicationsScreen;
