// Exportar estilos globales
export * from './globalStyles';

// Exportar estilos de componentes
export * from './componentStyles';

// Exportar temas
export * from './themes';

// Exportar todo como default
export { default as globalStyles } from './globalStyles';
export { default as componentStyles } from './componentStyles';
export { default as themes } from './themes';

// Re-exportar elementos específicos para fácil acceso
export {
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
} from './globalStyles';

export {
  buttonStyles,
  inputStyles,
  cardStyles,
  badgeStyles,
  avatarStyles,
  listStyles as componentListStyles,
  modalStyles as componentModalStyles,
  loadingStyles,
  separatorStyles,
  tooltipStyles,
} from './componentStyles';

export {
  lightTheme,
  darkTheme,
  customTheme,
  getTheme,
  toggleTheme,
  type Theme,
  type ThemeName,
} from './themes';

