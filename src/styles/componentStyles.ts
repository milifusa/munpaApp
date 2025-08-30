import { StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from './globalStyles';

// Estilos para botones
export const buttonStyles = StyleSheet.create({
  // Botón primario
  primary: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  
  // Botón secundario
  secondary: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  
  // Botón outline
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  
  // Botón de texto
  text: {
    backgroundColor: 'transparent',
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Botón deshabilitado
  disabled: {
    backgroundColor: colors.gray[300],
    opacity: 0.6,
  },
  
  // Botón pequeño
  small: {
    padding: spacing.sm,
    minHeight: 36,
  },
  
  // Botón grande
  large: {
    padding: spacing.lg,
    minHeight: 56,
  },
  
  // Texto del botón
  text: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  
  textOutline: {
    color: colors.primary,
  },
  
  textSecondary: {
    color: colors.white,
  },
  
  textDisabled: {
    color: colors.text.disabled,
  },
});

// Estilos para inputs
export const inputStyles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.base,
    padding: spacing.md,
    fontSize: typography.sizes.base,
    backgroundColor: colors.gray[50],
    color: colors.text.primary,
    minHeight: 48,
  },
  
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  
  inputError: {
    borderColor: colors.error,
  },
  
  inputDisabled: {
    backgroundColor: colors.gray[100],
    color: colors.text.disabled,
  },
  
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
  
  helperText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.sm,
    marginTop: spacing.xs,
  },
});

// Estilos para tarjetas
export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.base,
  },
  
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  
  cardSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  
  cardContent: {
    marginBottom: spacing.md,
  },
  
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
});

// Estilos para badges
export const badgeStyles = StyleSheet.create({
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  
  badgeSecondary: {
    backgroundColor: colors.secondary,
  },
  
  badgeWarning: {
    backgroundColor: colors.warning,
  },
  
  badgeError: {
    backgroundColor: colors.error,
  },
  
  badgeInfo: {
    backgroundColor: colors.info,
  },
  
  badgeText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
  },
  
  badgeLarge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  
  badgeLargeText: {
    fontSize: typography.sizes.sm,
  },
});

// Estilos para avatares
export const avatarStyles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  
  avatarText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  
  avatarTextSmall: {
    fontSize: typography.sizes.sm,
  },
  
  avatarTextLarge: {
    fontSize: typography.sizes.xl,
  },
});

// Estilos para listas
export const listStyles = StyleSheet.create({
  listItem: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  listItemContent: {
    flex: 1,
    marginLeft: spacing.md,
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
  
  listItemRight: {
    alignItems: 'flex-end',
  },
  
  listItemChevron: {
    color: colors.text.secondary,
    fontSize: typography.sizes.lg,
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
  
  modalContent: {
    marginBottom: spacing.lg,
  },
  
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});

// Estilos para indicadores de carga
export const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  text: {
    marginTop: spacing.md,
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
});

// Estilos para separadores
export const separatorStyles = StyleSheet.create({
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  
  separatorVertical: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
  
  separatorDashed: {
    height: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.md,
  },
});

// Estilos para tooltips
export const tooltipStyles = StyleSheet.create({
  tooltip: {
    backgroundColor: colors.gray[800],
    borderRadius: borderRadius.base,
    padding: spacing.sm,
    maxWidth: 200,
  },
  
  tooltipText: {
    color: colors.white,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
  
  tooltipArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.gray[800],
    alignSelf: 'center',
  },
});

export default {
  buttonStyles,
  inputStyles,
  cardStyles,
  badgeStyles,
  avatarStyles,
  listStyles,
  modalStyles,
  loadingStyles,
  separatorStyles,
  tooltipStyles,
};

