import { StyleSheet } from 'react-native';

// Paleta de colores
export const colors = {
  // Colores principales - Púrpura para Munpa
  primary: '#887CBC', // Púrpura principal actualizado
  primaryDark: '#7B68B0',
  primaryLight: '#A99DD9',

  // Colores secundarios - Verde lima para botones
  secondary: '#B4C14B', // Verde lima actualizado
  secondaryDark: '#8FBC3A',
  secondaryLight: '#B8D96B',
  
  // Colores de estado
  success: '#27ae60',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
  
  // Colores neutros
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f8f9fa',
    100: '#e9ecef',
    200: '#dee2e6',
    300: '#ced4da',
    400: '#adb5bd',
    500: '#6c757d',
    600: '#495057',
    700: '#343a40',
    800: '#212529',
    900: '#1a1d20',
  },
  
  // Colores de fondo
  background: '#887CBC', // Fondo púrpura principal actualizado
  surface: '#ffffff',
  card: '#A99DD9', // Input fields con púrpura más claro
  
  // Colores de texto
  text: {
    primary: '#000000',
    secondary: '#7f8c8d',
    disabled: '#bdc3c7',
    inverse: '#ffffff',
  },
  
  // Colores de borde
  border: '#e1e8ed',
  borderLight: '#f1f3f4',
  borderDark: '#cbd5e0',
};

// Tipografía
export const typography = {
  // Tamaños de fuente
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
    '5xl': 36,
  },
  
  // Pesos de fuente
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
          // Familia de fuentes
        fontFamily: {
          primary: 'Montserrat', // Fuente personalizada Montserrat Regular
          logo: 'Montserrat-Bold', // Logo en negrita
          heading: 'Montserrat-Bold', // Títulos en negrita
          body: 'Montserrat', // Texto normal
        },
  
  // Alturas de línea
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Espaciado
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

// Bordes y radios
export const borderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Sombras
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6.27,
    elevation: 8,
  },
};

// Estilos base para componentes comunes
export const baseStyles = StyleSheet.create({
  // Contenedores
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: colors.background,
  },
  
  contentContainer: {
    padding: spacing.md,
  },
  
  // Tarjetas
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.base,
  },
  
  // Formularios
  form: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.base,
  },
  
  inputContainer: {
    marginBottom: spacing.md,
  },
  
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.body,
    backgroundColor: colors.gray[50],
    color: colors.text.primary,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
  },
  
  inputError: {
    borderColor: colors.error,
  },
  
  // Botones
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  
  buttonDisabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.6,
  },
  
  buttonText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fontFamily.primary,
  },
  
  buttonTextOutline: {
    color: colors.primary,
  },
  
  // Textos
  title: {
    fontSize: typography.sizes['3xl'],
    // fontWeight: typography.weights.bold, // Temporalmente comentado
    fontFamily: typography.fontFamily.heading,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  subtitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    fontFamily: typography.fontFamily.body,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeights.normal,
  },
  
  heading: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    fontFamily: typography.fontFamily.heading,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  bodyText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    fontFamily: typography.fontFamily.body,
    color: colors.text.primary,
    lineHeight: typography.lineHeights.normal,
  },
  
  caption: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.normal,
    fontFamily: typography.fontFamily.body,
    color: colors.text.secondary,
  },
  
  // Enlaces
  link: {
    color: colors.primary,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  
  // Etiquetas
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  // Mensajes de error
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  
  // Indicadores de carga
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Separadores
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  
  // Badges
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  
  badgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
});

// Estilos específicos para pantallas
export const screenStyles = StyleSheet.create({
  // Pantalla de login/registro
  authScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  authContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  
  authHeader: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  
  // Pantalla principal
  mainScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  // Pantalla de perfil
  profileScreen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  
  profileHeader: {
    backgroundColor: colors.primary,
    padding: spacing.lg,
    alignItems: 'center',
  },
  
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    marginBottom: spacing.md,
  },
});

// Estilos para navegación
export const navigationStyles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    elevation: 0,
    shadowOpacity: 0,
  },
  
  headerTitle: {
    color: colors.white,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: spacing.sm,
    paddingTop: spacing.sm,
    height: 60,
  },
  
  tabBarActive: {
    color: colors.primary,
  },
  
  tabBarInactive: {
    color: colors.text.secondary,
  },
});

// Estilos para modales
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modal: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    margin: spacing.lg,
    maxWidth: 400,
    width: '100%',
    ...shadows.lg,
  },
  
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  
  modalClose: {
    padding: spacing.xs,
  },
});

// Estilos para listas
export const listStyles = StyleSheet.create({
  listItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  
  listItemTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  
  listItemSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
});

// Estilos para estados
export const stateStyles = StyleSheet.create({
  success: {
    backgroundColor: colors.success,
  },
  
  warning: {
    backgroundColor: colors.warning,
  },
  
  error: {
    backgroundColor: colors.error,
  },
  
  info: {
    backgroundColor: colors.info,
  },
});

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  baseStyles,
  screenStyles,
  navigationStyles,
  modalStyles,
  listStyles,
  stateStyles,
};
