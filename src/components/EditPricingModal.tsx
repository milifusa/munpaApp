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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';

interface EditPricingModalProps {
  visible: boolean;
  onClose: () => void;
  currentChatPrice: number;
  currentVideoPrice: number;
  onSuccess: () => void;
}

const EditPricingModal: React.FC<EditPricingModalProps> = ({
  visible,
  onClose,
  currentChatPrice,
  currentVideoPrice,
  onSuccess,
}) => {
  const [chatPrice, setChatPrice] = useState(currentChatPrice.toString());
  const [videoPrice, setVideoPrice] = useState(currentVideoPrice.toString());
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const chatPriceNum = parseFloat(chatPrice);
    const videoPriceNum = parseFloat(videoPrice);

    // Validaciones
    if (isNaN(chatPriceNum) || chatPriceNum < 0) {
      Alert.alert('Error', 'El precio de chat debe ser un número válido');
      return;
    }
    if (isNaN(videoPriceNum) || videoPriceNum < 0) {
      Alert.alert('Error', 'El precio de video debe ser un número válido');
      return;
    }
    if (chatPriceNum === 0 && videoPriceNum === 0) {
      Alert.alert('Error', 'Al menos un precio debe ser mayor a cero');
      return;
    }

    try {
      setSaving(true);
      console.log('💰 [PRICING] Actualizando precios...');

      const requestData = {
        chatConsultation: chatPriceNum,
        videoConsultation: videoPriceNum,
        currency: 'USD',
      };

      const response = await axiosInstance.put('/api/specialist/pricing', requestData);
      console.log('✅ [PRICING] Precios actualizados:', response.data);

      analyticsService.logEvent('specialist_pricing_updated', {
        chat_price: chatPriceNum,
        video_price: videoPriceNum,
      });

      Alert.alert('Éxito', 'Precios actualizados correctamente');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('❌ [PRICING] Error actualizando precios:', error);
      Alert.alert('Error', 'No se pudieron actualizar los precios. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setChatPrice(currentChatPrice.toString());
      setVideoPrice(currentVideoPrice.toString());
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Editar Precios</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={saving}
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.description}>
              Define los precios para tus consultas. Los pacientes verán estos precios al solicitar una consulta contigo.
            </Text>

            {/* Chat Price */}
            <View style={styles.priceItem}>
              <View style={styles.priceHeader}>
                <Ionicons name="chatbubble" size={24} color="#3B82F6" />
                <Text style={styles.priceLabel}>Consulta por Chat</Text>
              </View>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={chatPrice}
                  onChangeText={setChatPrice}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              <Text style={styles.hint}>
                Consulta por mensaje de texto en tiempo real
              </Text>
            </View>

            {/* Video Price */}
            <View style={styles.priceItem}>
              <View style={styles.priceHeader}>
                <Ionicons name="videocam" size={24} color="#887CBC" />
                <Text style={styles.priceLabel}>Consulta por Video</Text>
              </View>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.priceInput}
                  value={videoPrice}
                  onChangeText={setVideoPrice}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  editable={!saving}
                />
              </View>
              <Text style={styles.hint}>
                Consulta por videollamada en vivo
              </Text>
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text style={styles.infoText}>
                Puedes cambiar tus precios en cualquier momento. Los cambios se aplicarán a nuevas consultas.
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
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
  priceItem: {
    marginBottom: 24,
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  priceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    paddingVertical: 16,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveButton: {
    backgroundColor: '#887CBC',
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default EditPricingModal;
