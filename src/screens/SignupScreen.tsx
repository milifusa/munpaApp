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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import MunpaLogo from '../components/MunpaLogo';
import { profileService } from '../services/api';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../styles';

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { user, signup } = useAuth();
  const [isProfileCompletionMode, setIsProfileCompletionMode] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<'M' | 'F' | ''>('');
  const [childrenCount, setChildrenCount] = useState(0);
  const [pregnancyStatus, setPregnancyStatus] = useState<'none' | 'pregnant'>('none');
  const [isMultiplePregnancy, setIsMultiplePregnancy] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si estamos en modo "completar perfil"
  React.useEffect(() => {
    const checkProfileCompletionMode = async () => {
      const needsCompletion = await AsyncStorage.getItem('needsProfileCompletion');
      const userData = await AsyncStorage.getItem('userData');
      
      if (needsCompletion === 'true' && userData) {
        console.log('📝 Modo completar perfil activado');
        setIsProfileCompletionMode(true);
        const parsedUser = JSON.parse(userData);
        setDisplayName(parsedUser.name || parsedUser.displayName || '');
        setEmail(parsedUser.email || '');
      }
    };
    checkProfileCompletionMode();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    // Mínimo 6 caracteres, al menos una mayúscula, una minúscula y un número
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/;
    return passwordRegex.test(password);
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, color: '#e1e8ed', text: '' };
    if (password.length < 6) return { strength: 1, color: '#e74c3c', text: 'Muy débil' };
    if (!validatePassword(password)) return { strength: 2, color: '#FFC211', text: 'Débil' };
    return { strength: 3, color: '#B4C14B', text: 'Fuerte' };
  };

  const handleSignup = async () => {
    console.log('📝 Iniciando validación...');
    console.log('🔄 Modo completar perfil:', isProfileCompletionMode);
    
    // Validación del nombre (siempre requerido)
    if (!displayName.trim()) {
      console.log('❌ Validación fallida: Nombre vacío');
      Alert.alert('Error', 'Por favor ingresa tu nombre completo');
      return;
    }

    // Validaciones de email y contraseña solo si NO estamos en modo completar perfil
    if (!isProfileCompletionMode) {
      if (!email.trim()) {
        console.log('❌ Validación fallida: Email vacío');
        Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
        return;
      }

      if (!password.trim()) {
        console.log('❌ Validación fallida: Contraseña vacía');
        Alert.alert('Error', 'Por favor ingresa una contraseña');
        return;
      }

      if (!validateEmail(email)) {
        console.log('❌ Validación fallida: Email inválido');
        Alert.alert('Error', 'Por favor ingresa un email válido');
        return;
      }

      if (!validatePassword(password)) {
        console.log('❌ Validación fallida: Contraseña no cumple requisitos');
        Alert.alert(
          'Error',
          'La contraseña debe tener al menos 6 caracteres, una mayúscula, una minúscula y un número'
        );
        return;
      }
    }

    if (!gender) {
      console.log('❌ Validación fallida: Género no seleccionado');
      Alert.alert('Error', 'Por favor selecciona si eres papá o mamá');
      return;
    }

    // Si no tiene hijos, debe especificar estado de embarazo/espera
    if (childrenCount === 0 && pregnancyStatus === 'none') {
      console.log('❌ Validación fallida: Estado de embarazo/espera no especificado');
      const genderText = gender === 'F' ? 'embarazada' : 'esperando bebé(s)';
      Alert.alert(
        'App para familias',
        `Esta aplicación está diseñada específicamente para personas ${genderText} o que ya tienen hijos. Si no estás ${genderText} y no tienes hijos, te recomendamos esperar hasta que estés en esa etapa de tu vida para aprovechar mejor todas las funcionalidades de la app.`,
        [
          { text: 'Entiendo', style: 'cancel' },
          { 
            text: 'Continuar de todas formas', 
            onPress: () => {
              // Permitir continuar pero mostrar advertencia
              console.log(`⚠️ Usuario decidió continuar sin estar ${genderText} o tener hijos`);
            }
          }
        ]
      );
      return;
    }

    // Si no tiene hijos y no está esperando bebé(s), mostrar mensaje informativo
    if (childrenCount === 0 && pregnancyStatus === 'none') {
      console.log('⚠️ Usuario sin hijos ni esperando bebé(s) - mostrando mensaje informativo');
      const genderText = gender === 'F' ? 'embarazada' : 'esperando bebé(s)';
      Alert.alert(
        'App para familias',
        `Esta aplicación está diseñada específicamente para personas que ya tienen hijos o están ${genderText}. Si no tienes hijos y no estás ${genderText}, te recomendamos esperar hasta que estés en esa etapa de tu vida para aprovechar mejor todas las funcionalidades de la app.`,
        [
          { text: 'Entiendo', style: 'cancel' },
          { 
            text: 'Continuar de todas formas', 
            onPress: () => {
              // Permitir continuar pero mostrar advertencia
              console.log(`⚠️ Usuario decidió continuar sin tener hijos ni estar ${genderText}`);
            }
          }
        ]
      );
      return;
    }

    console.log('✅ Validación exitosa...');
    setIsLoading(true);
    try {
      if (isProfileCompletionMode) {
        // Modo completar perfil: actualizar perfil existente
        console.log('📊 Actualizando perfil con:', { displayName, gender, childrenCount, isPregnant: pregnancyStatus === 'pregnant' });
        await profileService.updateProfile({
          displayName: displayName.trim(),
          gender,
          childrenCount,
          isPregnant: pregnancyStatus === 'pregnant',
        });
        console.log('✅ Perfil actualizado exitosamente');
        
        // Limpiar flag de completar perfil
        await AsyncStorage.removeItem('needsProfileCompletion');
      } else {
        // Modo registro normal
        console.log('📊 Datos a enviar:', { email, displayName, gender, childrenCount, pregnancyStatus });
        const isPregnantForSignup = pregnancyStatus === 'pregnant' ? false : false;
        await signup(email, password, displayName.trim(), gender, childrenCount, isPregnantForSignup);
        console.log('✅ Registro completado exitosamente');
      }
      
      // Si hay hijos o está embarazada/esperando, navegar a la pantalla de datos de hijos
      if (childrenCount > 0 || pregnancyStatus !== 'none') {
        console.log('👶 Navegando a pantalla de datos de hijos...');
        
        // Calcular el total de hijos a registrar
        let totalChildren = childrenCount;
        if (pregnancyStatus === 'pregnant') {
          totalChildren += isMultiplePregnancy ? 2 : 1; // 2 para múltiples, 1 para único
        }
        
        navigation.navigate('ChildrenData', {
          childrenCount: totalChildren,
          gender,
          pregnancyStatus,
          isMultiplePregnancy,
        });
      } else {
        // Si no hay hijos, establecer el usuario como autenticado y ir al Home
        console.log('🏠 No hay hijos, estableciendo usuario como autenticado...');
        const { setUser } = useAuth();
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error: any) {
      console.error('❌ Error en registro:', error);
      const errorMessage = error.response?.data?.message || 'Error al crear la cuenta';
      console.log('📋 Mensaje de error:', errorMessage);
      Alert.alert('Error de registro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

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

        {/* Título de la pantalla */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>
            {isProfileCompletionMode ? 'Completa tu perfil' : 'Crea tu cuenta'}
          </Text>
          {isProfileCompletionMode && (
            <Text style={styles.subtitle}>
              Para comenzar, cuéntanos un poco sobre ti
            </Text>
          )}
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Campo Nombre */}
          <View style={styles.inputContainer}>
            <Text style={styles.labelText}>Nombre completo *</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu nombre completo"
              placeholderTextColor="#FFFFFF"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!isProfileCompletionMode}
            />
          </View>

          {/* Campos Email y Contraseña - solo en modo registro */}
          {!isProfileCompletionMode && (
            <>
              {/* Campo Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.labelText}>Correo electrónico *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="tu@email.com"
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
                <Text style={styles.labelText}>Contraseña *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Tu contraseña"
                    placeholderTextColor="#FFFFFF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
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
                {password.length > 0 && (
                  <View style={styles.passwordStrength}>
                    <View style={styles.strengthBar}>
                      <View
                        style={[
                          styles.strengthFill,
                          {
                            width: `${(passwordStrength.strength / 3) * 100}%`,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.strengthText}>{passwordStrength.text}</Text>
                  </View>
                )}
              </View>
            </>
          )}



          {/* Campo Género */}
          <View style={styles.inputContainer}>
            <Text style={styles.labelText}>Soy: *</Text>
            <View style={styles.genderContainer}>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'M' && styles.genderButtonActive
                ]}
                onPress={() => setGender('M')}
              >
                <Text style={[
                  styles.genderButtonText,
                  gender === 'M' && styles.genderButtonTextActive
                ]}>
                  Papá
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.genderButton,
                  gender === 'F' && styles.genderButtonActive
                ]}
                onPress={() => setGender('F')}
              >
                <Text style={[
                  styles.genderButtonText,
                  gender === 'F' && styles.genderButtonTextActive
                ]}>
                  Mamá
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Campo Número de Hijos */}
          <View style={styles.inputContainer}>
            <Text style={styles.labelText}>Número de hijos *</Text>
            <View style={styles.childrenCountContainer}>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => setChildrenCount(Math.max(0, childrenCount - 1))}
              >
                <Text style={styles.countButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.childrenCountText}>{childrenCount}</Text>
              <TouchableOpacity
                style={styles.countButton}
                onPress={() => setChildrenCount(childrenCount + 1)}
              >
                <Text style={styles.countButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

                    {/* Estado de embarazo (para ambos géneros) */}
          {gender && (
            <View style={styles.inputContainer}>
              <Text style={styles.labelText}>
                {gender === 'F' ? '¿Estás embarazada?' : '¿Estás esperando bebé(s)?'} *
              </Text>
              <View style={styles.pregnancyContainer}>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    pregnancyStatus === 'pregnant' && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setPregnancyStatus('pregnant')}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    pregnancyStatus === 'pregnant' && styles.pregnancyButtonTextActive
                  ]}>
                    Sí
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    pregnancyStatus === 'none' && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setPregnancyStatus('none')}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    pregnancyStatus === 'none' && styles.pregnancyButtonTextActive
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Opción de embarazo múltiple (solo si está esperando bebé(s)) */}
          {gender && pregnancyStatus === 'pregnant' && (
            <View style={styles.inputContainer}>
              <Text style={styles.labelText}>
                {gender === 'F' ? '¿Es un embarazo múltiple?' : '¿Esperas múltiples bebés?'}
              </Text>
              <View style={styles.pregnancyContainer}>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    isMultiplePregnancy && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setIsMultiplePregnancy(true)}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    isMultiplePregnancy && styles.pregnancyButtonTextActive
                  ]}>
                    {gender === 'F' ? 'Sí (gemelos, trillizos, etc.)' : 'Sí (gemelos, trillizos, etc.)'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    !isMultiplePregnancy && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setIsMultiplePregnancy(false)}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    !isMultiplePregnancy && styles.pregnancyButtonTextActive
                  ]}>
                    {gender === 'F' ? 'No (un solo bebé)' : 'No (un solo bebé)'}
                </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Botón Registro / Continuar */}
          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.signupButtonText}>
                {isProfileCompletionMode ? 'Guardando...' : 'Creando cuenta...'}
              </Text>
            ) : (
              <Text style={styles.signupButtonText}>
                {isProfileCompletionMode ? 'CONTINUAR' : 'CREAR CUENTA'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Enlaces - solo en modo registro */}
        {!isProfileCompletionMode && (
          <View style={styles.linksContainer}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>¿Ya tienes una cuenta? Inicia sesión</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3', // Fondo púrpura principal
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
    marginBottom: spacing.sm,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  screenTitle: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.white,
    fontSize: typography.sizes.base,
    textAlign: 'center',
    opacity: 0.8,
    marginTop: spacing.xs,
  },
  form: {
    backgroundColor: 'transparent',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  labelText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: '#A99DD9',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    color: '#2D3748',
    minHeight: 48,
    textAlign: 'center',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    paddingRight: 50, // Espacio para el botón del ojo
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  eyeIcon: {
    fontSize: 20,
  },
  passwordStrength: {
    marginTop: spacing.sm,
  },
  strengthBar: {
    height: 4,
    backgroundColor: '#e1e8ed',
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: typography.sizes.sm,
    color: colors.white,
    textAlign: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    backgroundColor: 'rgba(169, 157, 217, 0.3)',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  genderButtonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  genderButtonTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  childrenCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(169, 157, 217, 0.3)',
    borderRadius: borderRadius.base,
    padding: spacing.sm,
  },
  countButton: {
    width: 48,
    height: 48,
    backgroundColor: '#FFC211',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countButtonText: {
    color: colors.white,
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
  },
  childrenCountText: {
    color: colors.white,
    fontSize: typography.sizes['2xl'],
    fontWeight: 'bold',
    marginHorizontal: spacing.xl,
    minWidth: 40,
    textAlign: 'center',
  },
  pregnancyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  pregnancyButton: {
    flex: 1,
    backgroundColor: 'rgba(169, 157, 217, 0.3)',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pregnancyButtonActive: {
    backgroundColor: '#F08EB7',
    borderColor: '#F08EB7',
  },
  pregnancyButtonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: '600',
  },
  pregnancyButtonTextActive: {
    color: colors.white,
    fontWeight: 'bold',
  },
  signupButton: {
    backgroundColor: '#B4C14B',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginBottom: spacing.md,
    ...shadows.base,
  },
  buttonDisabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.6,
  },
  signupButtonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  linksContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  linkButton: {
    padding: spacing.md,
  },
  linkText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default SignupScreen;
