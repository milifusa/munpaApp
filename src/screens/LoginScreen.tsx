import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import MunpaLogo from '../components/MunpaLogo';
import SocialLoginButton from '../components/SocialLoginButton';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../styles';


interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Por favor ingresa un email válido');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (error: any) {
      Alert.alert(
        'Error de inicio de sesión',
        error.response?.data?.message || 'Error al iniciar sesión'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo y Header */}
        <View style={styles.header}>
          <MunpaLogo size="mega" showTagline={true} />
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Campo Email */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Correo electrónico"
              placeholderTextColor="#FFFFFF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#FFFFFF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Botón Login */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.loginButtonText}>Iniciando sesión...</Text>
            ) : (
              <Text style={styles.loginButtonText}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Enlaces de recuperación y registro */}
        <View style={styles.linksContainer}>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.linkText}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Login Social */}
        <View style={styles.socialContainer}>
          <Text style={styles.socialText}>O ingresa con:</Text>
          <View style={styles.socialButtons}>
            <SocialLoginButton
              type="google"
              onPress={() => Alert.alert('Google', 'Login con Google próximamente')}
              size="medium"
            />
            <View style={styles.socialSpacer} />
            <SocialLoginButton
              type="facebook"
              onPress={() => Alert.alert('Facebook', 'Login con Facebook próximamente')}
              size="medium"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#887CBC', // Fondo púrpura principal actualizado
    paddingBottom: 0,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingBottom: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  form: {
    backgroundColor: 'transparent',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: '#A99DD9', // Púrpura más claro para inputs
    borderRadius: borderRadius.base,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    // fontFamily: 'Montserrat' // Temporalmente comentado,
    color: '#2D3748', // Color más oscuro para mejor contraste
    minHeight: 48,
    textAlign: 'center',
  },
  loginButton: {
    backgroundColor: '#B4C14B', // Verde lima actualizado para el botón
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.md,
    ...shadows.base,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.6,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  linksContainer: {
    alignItems: 'center',
    marginBottom: 0,
    paddingBottom: spacing.xl,
  },
  linkButton: {
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  linkText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    // fontFamily: 'Montserrat' // Temporalmente comentado,
    textAlign: 'center',
  },
  socialContainer: {
    alignItems: 'center',
  },
  socialText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    // fontFamily: 'Montserrat' // Temporalmente comentado,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  socialButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialSpacer: {
    width: spacing.lg,
  },
});

export default LoginScreen;
