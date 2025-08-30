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

const ResetPasswordScreen: React.FC<{ navigation: any; route: any }> = ({ navigation, route }) => {
  const { resetPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Obtener el oobCode de los parámetros de la ruta
  const { oobCode } = route.params || {};

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumber,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
    };
  };

  const handleResetPassword = async () => {
    if (!oobCode) {
      Alert.alert('Error', 'Código de restablecimiento no válido');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      Alert.alert(
        'Error',
        'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número'
      );
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(oobCode, newPassword);
      Alert.alert(
        'Contraseña restablecida',
        'Tu contraseña ha sido restablecida exitosamente. Puedes iniciar sesión con tu nueva contraseña.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al restablecer la contraseña';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPasswordStrength = () => {
    if (!newPassword) return null;

    const validation = validatePassword(newPassword);
    const strength = [
      validation.minLength,
      validation.hasUpperCase,
      validation.hasLowerCase,
      validation.hasNumber,
    ].filter(Boolean).length;

    return (
      <View style={styles.strengthContainer}>
        <Text style={styles.strengthText}>Fortaleza de la contraseña:</Text>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthFill,
              {
                width: `${(strength / 4) * 100}%`,
                backgroundColor: strength <= 2 ? '#e74c3c' : strength <= 3 ? '#f39c12' : '#27ae60',
              },
            ]}
          />
        </View>
        <Text style={styles.strengthLabel}>
          {strength <= 2 ? 'Débil' : strength <= 3 ? 'Media' : 'Fuerte'}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <Text style={styles.title}>Restablecer contraseña</Text>
          <Text style={styles.subtitle}>
            Ingresa tu nueva contraseña
          </Text>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!isLoading}
            />

            {renderPasswordStrength()}

            <TextInput
              style={styles.input}
              placeholder="Confirmar nueva contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.buttonText}>Restablecer contraseña</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Volver</Text>
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
  strengthContainer: {
    marginBottom: 20,
    width: '100%',
  },
  strengthText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 5,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    color: '#666',
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

export default ResetPasswordScreen;
