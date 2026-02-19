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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import specialistService from '../services/specialistService';

interface ManageConsultationModalProps {
  visible: boolean;
  onClose: () => void;
  consultationId: string;
  consultationType: 'chat' | 'video';
  onSuccess: () => void;
}

const ManageConsultationModal: React.FC<ManageConsultationModalProps> = ({
  visible,
  onClose,
  consultationId,
  consultationType,
  onSuccess,
}) => {
  const [action, setAction] = useState<'accept' | 'reject' | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Para aceptar
  const [scheduleDate, setScheduleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleNow, setScheduleNow] = useState(true);
  
  // Para rechazar
  const [rejectReason, setRejectReason] = useState('');

  const handleAccept = async () => {
    try {
      setLoading(true);
      
      const scheduledFor = scheduleNow ? undefined : scheduleDate.toISOString();
      
      await specialistService.acceptConsultation(consultationId, scheduledFor);
      
      Alert.alert('Éxito', 'Consulta aceptada correctamente');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('❌ Error aceptando consulta:', error);
      Alert.alert('Error', 'No se pudo aceptar la consulta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Por favor indica el motivo del rechazo');
      return;
    }

    try {
      setLoading(true);
      
      await specialistService.rejectConsultation(consultationId, rejectReason.trim());
      
      Alert.alert('Consulta Rechazada', 'El paciente será notificado');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('❌ Error rechazando consulta:', error);
      Alert.alert('Error', 'No se pudo rechazar la consulta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAction(null);
      setRejectReason('');
      setScheduleNow(true);
      setScheduleDate(new Date());
      onClose();
    }
  };

  const renderActionSelection = () => (
    <View style={styles.content}>
      <Text style={styles.title}>¿Qué deseas hacer?</Text>
      <Text style={styles.description}>
        Puedes aceptar esta consulta y comenzar a atenderla, o rechazarla si no puedes atenderla en este momento.
      </Text>

      <TouchableOpacity
        style={[styles.actionButton, styles.acceptButton]}
        onPress={() => setAction('accept')}
      >
        <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        <View style={styles.actionButtonContent}>
          <Text style={styles.actionButtonTitle}>Aceptar Consulta</Text>
          <Text style={styles.actionButtonText}>
            Comenzar a atender al paciente
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.rejectButton]}
        onPress={() => setAction('reject')}
      >
        <Ionicons name="close-circle" size={32} color="#EF4444" />
        <View style={styles.actionButtonContent}>
          <Text style={styles.actionButtonTitle}>Rechazar Consulta</Text>
          <Text style={styles.actionButtonText}>
            No puedo atender en este momento
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
      </TouchableOpacity>
    </View>
  );

  const renderAcceptForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAction(null)}
      >
        <Ionicons name="arrow-back" size={24} color="#6B7280" />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Aceptar Consulta</Text>
      <Text style={styles.description}>
        Confirma que deseas atender esta consulta por {consultationType === 'video' ? 'videollamada' : 'chat'}.
      </Text>

      {/* Opciones de programación */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>¿Cuándo atenderás?</Text>

        <TouchableOpacity
          style={[styles.optionCard, scheduleNow && styles.optionCardActive]}
          onPress={() => setScheduleNow(true)}
        >
          <Ionicons
            name={scheduleNow ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={scheduleNow ? '#887CBC' : '#9CA3AF'}
          />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Ahora</Text>
            <Text style={styles.optionText}>
              Comenzar a atender inmediatamente
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.optionCard, !scheduleNow && styles.optionCardActive]}
          onPress={() => setScheduleNow(false)}
        >
          <Ionicons
            name={!scheduleNow ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={!scheduleNow ? '#887CBC' : '#9CA3AF'}
          />
          <View style={styles.optionContent}>
            <Text style={styles.optionTitle}>Programar</Text>
            <Text style={styles.optionText}>
              Establecer fecha y hora específica
            </Text>
          </View>
        </TouchableOpacity>

        {!scheduleNow && (
          <TouchableOpacity
            style={styles.datePickerButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar" size={20} color="#887CBC" />
            <Text style={styles.datePickerText}>
              {scheduleDate.toLocaleDateString('es-EC', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
        )}

        {showDatePicker && (
          <DateTimePicker
            value={scheduleDate}
            mode="datetime"
            display="default"
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) setScheduleDate(date);
            }}
            minimumDate={new Date()}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.submitButton, styles.submitButtonAccept, loading && styles.submitButtonDisabled]}
        onPress={handleAccept}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Aceptar Consulta</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

  const renderRejectForm = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => setAction(null)}
      >
        <Ionicons name="arrow-back" size={24} color="#6B7280" />
        <Text style={styles.backButtonText}>Volver</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Rechazar Consulta</Text>
      <Text style={styles.description}>
        Por favor indica el motivo por el cual no puedes atender esta consulta. El paciente recibirá esta información.
      </Text>

      <View style={styles.section}>
        <Text style={styles.label}>Motivo del rechazo *</Text>
        <TextInput
          style={styles.textArea}
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="Ej: No tengo disponibilidad en este momento, te recomiendo solicitar otra fecha..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      <TouchableOpacity
        style={[styles.submitButton, styles.submitButtonReject, loading && styles.submitButtonDisabled]}
        onPress={handleReject}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="close-circle" size={20} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Rechazar Consulta</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );

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
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={loading}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {!action && renderActionSelection()}
          {action === 'accept' && renderAcceptForm()}
          {action === 'reject' && renderRejectForm()}
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
    justifyContent: 'flex-end',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  acceptButton: {
    borderColor: '#D1FAE5',
    backgroundColor: '#F0FDF4',
  },
  rejectButton: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  actionButtonContent: {
    flex: 1,
  },
  actionButtonTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#6B7280',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  optionCardActive: {
    borderColor: '#887CBC',
    backgroundColor: '#EDE9FE',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  datePickerText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
    minHeight: 120,
  },
  submitButton: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    gap: 8,
  },
  submitButtonAccept: {
    backgroundColor: '#10B981',
  },
  submitButtonReject: {
    backgroundColor: '#EF4444',
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

export default ManageConsultationModal;
