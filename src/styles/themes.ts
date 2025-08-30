import { colors as baseColors } from './globalStyles';

// Tema claro (por defecto)
export const lightTheme = {
  colors: {
    ...baseColors,
    // Sobrescribir colores específicos del tema claro
    background: '#f8f9fa',
    surface: '#ffffff',
    card: '#ffffff',
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      disabled: '#bdc3c7',
      inverse: '#ffffff',
    },
    border: '#e1e8ed',
    borderLight: '#f1f3f4',
    borderDark: '#cbd5e0',
  },
  name: 'light',
};

// Tema oscuro
export const darkTheme = {
  colors: {
    ...baseColors,
    // Colores específicos del tema oscuro
    background: '#1a1d20',
    surface: '#2c3e50',
    card: '#34495e',
    text: {
      primary: '#ecf0f1',
      secondary: '#bdc3c7',
      disabled: '#7f8c8d',
      inverse: '#2c3e50',
    },
    border: '#34495e',
    borderLight: '#2c3e50',
    borderDark: '#1a1d20',
    gray: {
      50: '#2c3e50',
      100: '#34495e',
      200: '#4a5568',
      300: '#5a6c7d',
      400: '#6b7c8d',
      500: '#7c8c9d',
      600: '#8d9cad',
      700: '#9eacbd',
      800: '#afbccd',
      900: '#c0ccdd',
    },
  },
  name: 'dark',
};

// Tema personalizado para Munpa
export const customTheme = {
  colors: {
    ...baseColors,
    // Colores personalizados para Munpa
    primary: '#887CBC', // Púrpura actualizado
    primaryDark: '#7B68B0',
    primaryLight: '#A99DD9',
    secondary: '#B4C14B', // Verde actualizado
    secondaryDark: '#8FBC3A',
    secondaryLight: '#B8D96B',
    background: '#887CBC', // Púrpura actualizado
    surface: '#ffffff',
    card: '#A99DD9',
    text: {
      primary: '#2d3748',
      secondary: '#718096',
      disabled: '#a0aec0',
      inverse: '#ffffff',
    },
    border: '#e2e8f0',
    borderLight: '#f7fafc',
    borderDark: '#cbd5e0',
  },
  name: 'munpa',
};

// Tema específico para Munpa
export const munpaTheme = {
  colors: {
    primary: '#887CBC', // Púrpura principal
    secondary: '#B4C14B', // Verde lima
    background: '#887CBC', // Fondo púrpura
    surface: '#ffffff',
    card: '#A99DD9', // Input fields
    text: {
      primary: '#2d3748',
      secondary: '#718096',
      disabled: '#a0aec0',
      inverse: '#ffffff',
    },
    border: '#e2e8f0',
    borderLight: '#f7fafc',
    borderDark: '#cbd5e0',
  },
  name: 'munpa',
};

// Función para obtener el tema actual
export const getTheme = (themeName: string = 'light') => {
  switch (themeName) {
    case 'dark':
      return darkTheme;
    case 'munpa':
      return munpaTheme;
    case 'custom':
      return customTheme;
    default:
      return lightTheme;
  }
};

// Función para cambiar entre temas
export const toggleTheme = (currentTheme: string) => {
  return currentTheme === 'light' ? 'dark' : 'light';
};

// Tipos para TypeScript
export type Theme = typeof lightTheme;
export type ThemeName = 'light' | 'dark' | 'custom' | 'munpa';

export default {
  lightTheme,
  darkTheme,
  customTheme,
  munpaTheme,
  getTheme,
  toggleTheme,
};
