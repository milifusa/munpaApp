import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import specialistService from '../services/specialistService';

interface Prescription {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface CompleteConsultationModalProps {
  visible: boolean;
  onClose: () => void;
  consultationId: string;
  onSuccess: () => void;
  canPrescribe?: boolean;
}

const CompleteConsultationModal: React.FC<CompleteConsultationModalProps> = ({
  visible,
  onClose,
  consultationId,
  onSuccess,
  canPrescribe = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [notes, setNotes] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  const addPrescription = () => {
    setPrescriptions([...prescriptions, { medication: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const updatePrescription = (index: number, field: keyof Prescription, value: string) => {
    const updated = [...prescriptions];
    updated[index] = { ...updated[index], [field]: value };
    setPrescriptions(updated);
  };

  const handleComplete = async () => {
    if (!diagnosis.trim()) {
      Alert.alert('Error', 'El diagnóstico es requerido');
      return;
    }

    if (!treatment.trim()) {
      Alert.alert('Error', 'El tratamiento es requerido');
      return;
    }

    try {
      setLoading(true);

      const validPrescriptions = canPrescribe
        ? prescriptions
            .filter((p) => p.medication.trim())
            .map((p) => ({
              medication: p.medication.trim(),
              dosage: p.dosage.trim() || undefined,
              frequency: p.frequency.trim() || undefined,
              duration: p.duration.trim() || undefined,
              instructions: p.instructions.trim() || undefined,
            }))
        : undefined;

      await specialistService.completeConsultation(consultationId, {
        diagnosis: diagnosis.trim(),
        treatment: treatment.trim(),
        notes: notes.trim() || undefined,
        followUpRequired,
        followUpDate: followUpRequired ? followUpDate.toISOString().split('T')[0] : undefined,
        prescriptions: validPrescriptions?.length ? validPrescriptions : undefined,
      });

      Alert.alert('Consulta Completada', 'La consulta ha sido finalizada correctamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('❌ Error completando consulta:', error);
      Alert.alert('Error', 'No se pudo completar la consulta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDiagnosis('');
      setTreatment('');
      setNotes('');
      setFollowUpRequired(false);
      setFollowUpDate(new Date());
      setPrescriptions([]);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Completar Consulta</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.description}>
              Completa la información de la consulta. Esta información será visible para el paciente.
            </Text>

            {/* Diagnóstico */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Diagnóstico <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                value={diagnosis}
                onChangeText={setDiagnosis}
                placeholder="Describe el diagnóstico del paciente..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Tratamiento */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Tratamiento <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.textArea}
                value={treatment}
                onChangeText={setTreatment}
                placeholder="Indica el tratamiento recomendado..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Notas adicionales */}
            <View style={styles.section}>
              <Text style={styles.label}>Notas Adicionales</Text>
              <TextInput
                style={styles.textArea}
                value={notes}
                onChangeText={setNotes}
                placeholder="Información adicional o recomendaciones..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Seguimiento */}
            <View style={styles.section}>
              <View style={styles.switchRow}>
                <View style={styles.switchContent}>
                  <Text style={styles.switchLabel}>Requiere seguimiento</Text>
                  <Text style={styles.switchText}>
                    Indicar si el paciente necesita una consulta de seguimiento
                  </Text>
                </View>
                <Switch
                  value={followUpRequired}
                  onValueChange={setFollowUpRequired}
                  trackColor={{ false: '#D1D5DB', true: '#C4B5FD' }}
                  thumbColor={followUpRequired ? '#887CBC' : '#F3F4F6'}
                  ios_backgroundColor="#D1D5DB"
                />
              </View>
              {followUpRequired && (
                <>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#887CBC" />
                    <Text style={styles.datePickerText}>
                      Fecha de seguimiento: {followUpDate.toLocaleDateString('es-ES')}
                    </Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={followUpDate}
                      mode="date"
                      display="default"
                      onChange={(_, date) => {
                        setShowDatePicker(false);
                        if (date) setFollowUpDate(date);
                      }}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}
            </View>

            {/* Recetas (solo si canPrescribe) */}
            {canPrescribe && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.label}>Recetas</Text>
                  <TouchableOpacity onPress={addPrescription} style={styles.addButton}>
                    <Ionicons name="add-circle" size={24} color="#887CBC" />
                    <Text style={styles.addButtonText}>Agregar</Text>
                  </TouchableOpacity>
                </View>
                {prescriptions.map((p, i) => (
                  <View key={i} style={styles.prescriptionCard}>
                    <View style={styles.prescriptionHeader}>
                      <Text style={styles.prescriptionLabel}>Medicamento {i + 1}</Text>
                      <TouchableOpacity onPress={() => removePrescription(i)}>
                        <Ionicons name="trash-outline" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={p.medication}
                      onChangeText={(v) => updatePrescription(i, 'medication', v)}
                      placeholder="Nombre del medicamento *"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={styles.input}
                      value={p.dosage}
                      onChangeText={(v) => updatePrescription(i, 'dosage', v)}
                      placeholder="Dosis (ej: 500mg)"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={styles.input}
                      value={p.frequency}
                      onChangeText={(v) => updatePrescription(i, 'frequency', v)}
                      placeholder="Frecuencia (ej: cada 8 horas)"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={styles.input}
                      value={p.duration}
                      onChangeText={(v) => updatePrescription(i, 'duration', v)}
                      placeholder="Duración (ej: 3 días)"
                      placeholderTextColor="#9CA3AF"
                    />
                    <TextInput
                      style={[styles.input, styles.inputMultiline]}
                      value={p.instructions}
                      onChangeText={(v) => updatePrescription(i, 'instructions', v)}
                      placeholder="Instrucciones adicionales"
                      placeholderTextColor="#9CA3AF"
                      multiline
                    />
                  </View>
                ))}
              </View>
            )}

            {/* Info */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Una vez completada, el paciente podrá ver toda esta información y calificar la consulta.
              </Text>
            </View>

            {/* Botón */}
            <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Completar Consulta</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 100,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  switchContent: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  switchText: {
    fontSize: 13,
    color: '#6B7280',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  datePickerText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  prescriptionCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  prescriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prescriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 8,
  },
  inputMultiline: {
    minHeight: 60,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#887CBC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CompleteConsultationModal;
