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
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, loginWithApple } = useAuth();

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

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.message === 'Login con Google cancelado') {
        return; // No mostrar error si el usuario canceló
      }
      Alert.alert(
        'Error de inicio de sesión',
        error.response?.data?.message || error.message || 'Error al iniciar sesión con Google'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithApple();
    } catch (error: any) {
      // No mostrar error si el usuario canceló
      if (error.message === 'Login con Apple cancelado' || 
          error.message?.includes('cancelado') ||
          error.code === '1000' || 
          error.code === 1000) {
        console.log('👤 Usuario canceló el login con Apple');
        return;
      }
      
      // Para otros errores, mostrar alert
      Alert.alert(
        'Error de inicio de sesión',
        error.response?.data?.message || error.message || 'Error al iniciar sesión con Apple. Por favor intenta nuevamente.'
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
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo y Header */}
        <View style={styles.header}>
          <MunpaLogo size="mega" showTagline={true} />
          <Text style={styles.welcomeText}>¡Bienvenida de nuevo!</Text>
          <Text style={styles.subtitleText}>Ingresa para continuar</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Campo Email */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="mail-outline" 
                size={20} 
                color="#FFF" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="Correo electrónico"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Campo Contraseña */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color="#FFF" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.input}
                placeholder="Contraseña"
                placeholderTextColor="rgba(255, 255, 255, 0.7)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '👁️' : '🙈'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Botón Login */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.buttonContent}>
                <Text style={styles.loginButtonText}>Iniciando sesión...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.loginButtonText}>Iniciar sesión</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
              </View>
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
        </View>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>O ingresa con</Text>
          <View style={styles.divider} />
        </View>

        {/* Login Social */}
        <View style={styles.socialContainer}>
          {/* Login con Apple - solo disponible en iOS - PRIMERO según Apple Guidelines */}
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialLoginButton, styles.appleButton]}
              onPress={handleAppleLogin}
              disabled={isLoading}
            >
              <Ionicons name="logo-apple" size={24} color="#FFF" />
              <Text style={styles.appleButtonText}>Continuar con Apple</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.socialLoginButton, styles.googleButton]}
            onPress={handleGoogleLogin}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>
        </View>

        {/* Crear cuenta */}
        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.signupLink}>Crear cuenta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    paddingTop: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: typography.sizes.base,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(169, 157, 217, 0.8)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    ...shadows.base,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.white,
    paddingVertical: spacing.sm,
  },
  eyeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: '#B4C14B',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    marginTop: spacing.lg,
    ...shadows.lg,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[400],
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loginButtonText: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linksContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  linkButton: {
    padding: spacing.sm,
  },
  linkText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.sizes.sm,
    marginHorizontal: spacing.md,
    fontWeight: '500',
  },
  socialContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  socialLoginButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.lg,
    marginBottom: 12,
    minHeight: 56,
    gap: spacing.sm,
    ...shadows.base,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderWidth: 0,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  signupText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: typography.sizes.base,
  },
  signupLink: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
