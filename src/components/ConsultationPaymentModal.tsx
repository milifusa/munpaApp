import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useConfirmPayment,
  useStripe,
  CardField,
  PlatformPayButton,
  PlatformPay,
} from '@stripe/stripe-react-native';
import * as Device from 'expo-device';
import consultationsService from '../services/consultationsService';

const MUNPA_PRIMARY = '#96d2d3';

interface ConsultationPaymentModalProps {
  visible: boolean;
  consultationId: string;
  amount: number;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ConsultationPaymentModal({
  visible,
  consultationId,
  amount,
  onSuccess,
  onCancel,
}: ConsultationPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const { confirmPayment } = useConfirmPayment();
  const { confirmPlatformPayPayment } = useStripe();

  const runCardPayment = async () => {
    try {
      setLoading(true);

      const { data } = await consultationsService.createPaymentIntent(consultationId);
      const clientSecret = data?.clientSecret;

      if (!clientSecret) {
        throw new Error('No se recibió clientSecret del servidor');
      }

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: 'Card',
      });

      if (error) {
        Alert.alert('Error de pago', error.message || 'No se pudo procesar el pago');
      } else {
        Alert.alert('Pago exitoso', 'Tu consulta ha sido pagada. El especialista te contactará pronto.');
        onSuccess();
      }
    } catch (err: any) {
      console.error('❌ Error en pago (tarjeta):', err);
      Alert.alert('Error', err?.message || 'No se pudo completar el pago');
    } finally {
      setLoading(false);
    }
  };

  const runPlatformPay = async () => {
    try {
      setLoading(true);

      const { data } = await consultationsService.createPaymentIntent(consultationId);
      const clientSecret = data?.clientSecret;

      if (!clientSecret) {
        throw new Error('No se recibió clientSecret del servidor');
      }

      const amountStr = amount.toFixed(2);
      const cartItems: PlatformPay.ImmediateCartSummaryItem[] = [
        {
          paymentType: PlatformPay.PaymentType.Immediate,
          label: 'Consulta',
          amount: amountStr,
        },
      ];

      const params: PlatformPay.ConfirmParams = Platform.OS === 'ios'
        ? {
            applePay: {
              merchantCountryCode: 'US',
              currencyCode: 'USD',
              cartItems,
            },
          }
        : {
            googlePay: {
              testEnv: __DEV__,
              merchantCountryCode: 'US',
              currencyCode: 'USD',
              amount: Math.round(amount * 100),
              label: 'Consulta',
            },
          };

      const { error } = await confirmPlatformPayPayment(clientSecret, params);

      if (error) {
        Alert.alert('Error de pago', error.message || 'No se pudo procesar el pago');
      } else {
        Alert.alert('Pago exitoso', 'Tu consulta ha sido pagada. El especialista te contactará pronto.');
        onSuccess();
      }
    } catch (err: any) {
      console.error('❌ Error en pago (Apple/Google Pay):', err);
      Alert.alert('Error', err?.message || 'No se pudo completar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Completa el pago</Text>
            <Text style={styles.headerSubtitle}>
              Tu consulta ha sido creada. Paga ahora para que el especialista la reciba.
            </Text>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.amount}>${amount}</Text>

            {/* Apple Pay (iOS) / Google Pay (Android) - solo en dispositivo físico */}
            {/* En el simulador iOS, Apple Pay causa crash por el token mock; ocultamos el botón */}
            {Device.isDevice && (Platform.OS === 'ios' || Platform.OS === 'android') && (
              <>
                <View style={styles.platformPayContainer}>
                  <PlatformPayButton
                    type={PlatformPay.ButtonType.Checkout}
                    onPress={runPlatformPay}
                    disabled={loading}
                    style={styles.platformPayButton}
                  />
                </View>
                <Text style={styles.separator}>ó</Text>
              </>
            )}

            {/* Tarjeta */}
            <View style={styles.cardFieldContainer}>
              <CardField
                postalCodeEnabled={false}
                placeholders={{ number: '4242 4242 4242 4242' }}
                cardStyle={cardFieldStyle}
                style={styles.cardField}
              />
            </View>

            <TouchableOpacity
              style={[styles.payButton, loading && styles.payButtonDisabled]}
              onPress={runCardPayment}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="card" size={22} color="#FFFFFF" />
                  <Text style={styles.payButtonText}>Pagar ${amount}</Text>
                </>
              )}
            </TouchableOpacity>

            {onCancel && (
              <TouchableOpacity style={styles.cancelLink} onPress={onCancel} disabled={loading}>
                <Text style={styles.cancelLinkText}>Cancelar consulta</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const cardFieldStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#D1D5DB',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  content: {
    padding: 24,
  },
  amount: {
    fontSize: 32,
    fontWeight: '700',
    color: MUNPA_PRIMARY,
    marginBottom: 24,
    textAlign: 'center',
  },
  platformPayContainer: {
    marginBottom: 16,
    width: '100%',
    minHeight: 48,
  },
  platformPayButton: {
    width: '100%',
    height: 48,
  },
  separator: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  methodBtnActive: {
    backgroundColor: MUNPA_PRIMARY,
    borderColor: MUNPA_PRIMARY,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  methodTextActive: {
    color: '#FFFFFF',
  },
  cardFieldContainer: {
    marginBottom: 20,
    minHeight: 50,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
  },
  payButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelLink: {
    marginTop: 20,
    alignSelf: 'center',
    padding: 8,
  },
  cancelLinkText: {
    fontSize: 14,
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
});
