import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConfirmPayment, CardField } from '@stripe/stripe-react-native';
import consultationsService from '../services/consultationsService';

const MUNPA_PRIMARY = '#96d2d3';

interface ConsultationPaymentSectionProps {
  consultationId: string;
  amount: number;
  onSuccess: () => void;
}

export default function ConsultationPaymentSection({
  consultationId,
  amount,
  onSuccess,
}: ConsultationPaymentSectionProps) {
  const [loading, setLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<'card' | 'apple' | 'google'>('card');
  const { confirmPayment } = useConfirmPayment();

  const handlePay = async () => {
    try {
      setLoading(true);

      const { data } = await consultationsService.createPaymentIntent(consultationId);
      const clientSecret = data?.clientSecret;

      if (!clientSecret) {
        throw new Error('No se recibió clientSecret del servidor');
      }

      const paymentMethodType =
        payMethod === 'apple' ? 'ApplePay' : payMethod === 'google' ? 'GooglePay' : 'Card';

      const { error } = await confirmPayment(clientSecret, {
        paymentMethodType: paymentMethodType as any,
      });

      if (error) {
        Alert.alert('Error de pago', error.message || 'No se pudo procesar el pago');
      } else {
        Alert.alert('Pago exitoso', 'Tu consulta ha sido pagada. El especialista te contactará pronto.');
        onSuccess();
      }
    } catch (err: any) {
      console.error('❌ Error en pago:', err);
      Alert.alert('Error', err?.message || 'No se pudo completar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Completa el pago</Text>
      <Text style={styles.subtitle}>
        Tu consulta ha sido creada. Paga ahora para que el especialista la reciba.
      </Text>
      <Text style={styles.amount}>${amount}</Text>

      {/* Opciones de método de pago */}
      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[styles.methodBtn, payMethod === 'card' && styles.methodBtnActive]}
          onPress={() => setPayMethod('card')}
        >
          <Ionicons name="card" size={24} color={payMethod === 'card' ? '#fff' : '#6B7280'} />
          <Text style={[styles.methodText, payMethod === 'card' && styles.methodTextActive]}>
            Tarjeta
          </Text>
        </TouchableOpacity>
        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.methodBtn, payMethod === 'apple' && styles.methodBtnActive]}
            onPress={() => setPayMethod('apple')}
          >
            <Ionicons name="logo-apple" size={24} color={payMethod === 'apple' ? '#fff' : '#6B7280'} />
            <Text style={[styles.methodText, payMethod === 'apple' && styles.methodTextActive]}>
              Apple Pay
            </Text>
          </TouchableOpacity>
        )}
        {Platform.OS === 'android' && (
          <TouchableOpacity
            style={[styles.methodBtn, payMethod === 'google' && styles.methodBtnActive]}
            onPress={() => setPayMethod('google')}
          >
            <Ionicons name="logo-google" size={24} color={payMethod === 'google' ? '#fff' : '#6B7280'} />
            <Text style={[styles.methodText, payMethod === 'google' && styles.methodTextActive]}>
              Google Pay
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {payMethod === 'card' && (
        <View style={styles.cardFieldContainer}>
          <CardField
            postalCodeEnabled={false}
            placeholders={{ number: '4242 4242 4242 4242' }}
            cardStyle={cardFieldStyle}
            style={styles.cardField}
          />
        </View>
      )}

      <TouchableOpacity
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={handlePay}
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
    </View>
  );
}

const cardFieldStyle = {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#D1D5DB',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
    color: MUNPA_PRIMARY,
    marginBottom: 16,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    marginBottom: 16,
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
    paddingVertical: 14,
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
});
