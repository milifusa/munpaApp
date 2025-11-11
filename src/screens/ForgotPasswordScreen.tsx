import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

const ForgotPasswordScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async () => {
    console.log('🔐 [FORGOT PASSWORD] Iniciando proceso de recuperación de contraseña');
    console.log('📧 [FORGOT PASSWORD] Email ingresado:', email);
    
    if (!email.trim()) {
      console.log('❌ [FORGOT PASSWORD] Error: Email vacío');
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('❌ [FORGOT PASSWORD] Error: Email inválido:', email.trim());
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    console.log('✅ [FORGOT PASSWORD] Email válido, enviando solicitud a la API...');
    setIsLoading(true);
    
    try {
      const result = await forgotPassword(email.trim());
      
      console.log('📦 [FORGOT PASSWORD] === RESPUESTA DE LA API ===');
      console.log('📦 [FORGOT PASSWORD] Tipo de resultado:', typeof result);
      console.log('📦 [FORGOT PASSWORD] Resultado completo:', JSON.stringify(result, null, 2));
      console.log('📦 [FORGOT PASSWORD] Propiedades del resultado:', Object.keys(result || {}));
      
      if (result) {
        console.log('✅ [FORGOT PASSWORD] Success:', result.success);
        console.log('✅ [FORGOT PASSWORD] Message:', result.message);
        console.log('✅ [FORGOT PASSWORD] Data:', result.data);
      }
      
      console.log('✅ [FORGOT PASSWORD] Email de recuperación enviado exitosamente');
      
      Alert.alert(
        'Email enviado',
        'Se ha enviado un enlace de restablecimiento a tu email. Por favor revisa tu bandeja de entrada.',
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('🔄 [FORGOT PASSWORD] Usuario navega de vuelta al Login');
              navigation.navigate('Login');
            },
          },
        ]
      );
    } catch (error: any) {
      console.log('❌ [FORGOT PASSWORD] === ERROR EN LA API ===');
      console.log('❌ [FORGOT PASSWORD] Tipo de error:', typeof error);
      console.log('❌ [FORGOT PASSWORD] Error completo:', error);
      console.log('❌ [FORGOT PASSWORD] Error message:', error.message);
      console.log('❌ [FORGOT PASSWORD] Error response:', error.response);
      
      if (error.response) {
        console.log('❌ [FORGOT PASSWORD] Response status:', error.response.status);
        console.log('❌ [FORGOT PASSWORD] Response data:', JSON.stringify(error.response.data, null, 2));
        console.log('❌ [FORGOT PASSWORD] Response headers:', error.response.headers);
      }
      
      if (error.request) {
        console.log('❌ [FORGOT PASSWORD] Request data:', error.request);
      }
      
      const errorMessage = error.response?.data?.message || 'Error al enviar el email de restablecimiento';
      console.log('❌ [FORGOT PASSWORD] Mensaje de error mostrado al usuario:', errorMessage);
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
      console.log('🏁 [FORGOT PASSWORD] Proceso finalizado');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
          <Text style={styles.subtitle}>
            Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleForgotPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Enviar email de restablecimiento</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Volver al login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#887CBC',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    backgroundColor: '#A99DD9',
    borderWidth: 1,
    borderColor: '#A99DD9',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    color: '#2D3748',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#B4C14B',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    // fontFamily: 'Montserrat-Medium' // Temporalmente comentado,
  },
  backButton: {
    padding: 15,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default ForgotPasswordScreen;
