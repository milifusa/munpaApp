# 🎨 Sistema de Estilos - MunpaApp

Este directorio contiene el sistema de estilos globales para toda la aplicación.

## 📁 Estructura de archivos

```
src/styles/
├── globalStyles.ts      # Estilos globales y variables de diseño
├── componentStyles.ts   # Estilos específicos para componentes
├── themes.ts           # Temas (claro/oscuro/personalizado)
├── index.ts            # Archivo de exportación principal
└── README.md           # Esta documentación
```

## 🎯 Características

### ✅ **Sistema de Diseño Consistente**
- Paleta de colores unificada
- Tipografía escalable
- Espaciado consistente
- Bordes y sombras estandarizados

### ✅ **Componentes Reutilizables**
- Estilos para botones, inputs, tarjetas
- Badges, avatares, listas
- Modales y tooltips
- Indicadores de carga

### ✅ **Sistema de Temas**
- Tema claro (por defecto)
- Tema oscuro
- Tema personalizado
- Fácil cambio entre temas

## 🚀 Uso

### Importar estilos globales
```typescript
import { colors, typography, spacing, baseStyles } from '../styles';
```

### Importar estilos de componentes
```typescript
import { buttonStyles, inputStyles, cardStyles } from '../styles';
```

### Importar temas
```typescript
import { lightTheme, darkTheme, getTheme } from '../styles';
```

## 🎨 Paleta de Colores

### Colores Principales
- `primary`: #887CBC (Púrpura principal para Munpa)
- `primaryDark`: #7B68B0 (Púrpura oscuro)
- `primaryLight`: #A99DD9 (Púrpura claro)

### Colores Secundarios
- `secondary`: #B4C14B (Verde lima para Munpa)
- `secondaryDark`: #8FBC3A (Verde oscuro)
- `secondaryLight`: #B8D96B (Verde claro)

### Fuente Principal
- `Montserrat`: Fuente personalizada para toda la aplicación

### Colores de Estado
- `success`: #27ae60 (Verde éxito)
- `warning`: #f39c12 (Naranja advertencia)
- `error`: #e74c3c (Rojo error)
- `info`: #3498db (Azul información)

### Colores Neutros
- `white`: #ffffff
- `black`: #000000
- `gray`: Escala del 50 al 900

## 📝 Tipografía

### Tamaños de Fuente
```typescript
sizes: {
  xs: 12,      // Extra pequeño
  sm: 14,      // Pequeño
  base: 16,    // Base
  lg: 18,      // Grande
  xl: 20,      // Extra grande
  '2xl': 24,   // 2X grande
  '3xl': 28,   // 3X grande
  '4xl': 32,   // 4X grande
  '5xl': 36,   // 5X grande
}
```

### Pesos de Fuente
```typescript
weights: {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
}
```

## 📏 Espaciado

```typescript
spacing: {
  xs: 4,       // Extra pequeño
  sm: 8,       // Pequeño
  md: 16,      // Medio
  lg: 24,      // Grande
  xl: 32,      // Extra grande
  '2xl': 48,   // 2X grande
  '3xl': 64,   // 3X grande
}
```

## 🔄 Bordes y Radios

```typescript
borderRadius: {
  none: 0,
  sm: 4,
  base: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}
```

## 🌟 Sombras

```typescript
shadows: {
  sm: { /* Sombra pequeña */ },
  base: { /* Sombra base */ },
  lg: { /* Sombra grande */ },
}
```

## 🧩 Componentes Disponibles

### Botones
- `buttonStyles.primary` - Botón primario
- `buttonStyles.secondary` - Botón secundario
- `buttonStyles.outline` - Botón outline
- `buttonStyles.text` - Botón de texto
- `buttonStyles.disabled` - Botón deshabilitado

### Inputs
- `inputStyles.input` - Input base
- `inputStyles.inputFocused` - Input enfocado
- `inputStyles.inputError` - Input con error
- `inputStyles.label` - Etiqueta de input

### Tarjetas
- `cardStyles.card` - Tarjeta base
- `cardStyles.cardHeader` - Encabezado de tarjeta
- `cardStyles.cardContent` - Contenido de tarjeta
- `cardStyles.cardFooter` - Pie de tarjeta

### Badges
- `badgeStyles.badge` - Badge base
- `badgeStyles.badgeSecondary` - Badge secundario
- `badgeStyles.badgeWarning` - Badge de advertencia
- `badgeStyles.badgeError` - Badge de error

## 🎭 Temas

### Tema Claro (Por defecto)
```typescript
import { lightTheme } from '../styles';
```

### Tema Oscuro
```typescript
import { darkTheme } from '../styles';
```

### Tema Personalizado
```typescript
import { customTheme } from '../styles';
```

### Cambiar tema
```typescript
import { getTheme, toggleTheme } from '../styles';

const currentTheme = getTheme('dark');
const newTheme = toggleTheme('light'); // Retorna 'dark'
```

## 📱 Ejemplo de Uso

```typescript
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, buttonStyles, baseStyles } from '../styles';

const MyComponent = () => {
  return (
    <View style={baseStyles.container}>
      <Text style={baseStyles.title}>Mi Título</Text>
      <TouchableOpacity style={buttonStyles.primary}>
        <Text style={buttonStyles.text}>Mi Botón</Text>
      </TouchableOpacity>
    </View>
  );
};
```

## 🔧 Personalización

### Agregar nuevos colores
```typescript
// En globalStyles.ts
export const colors = {
  // ... colores existentes
  custom: '#ff6b6b',
};
```

### Agregar nuevos estilos de componentes
```typescript
// En componentStyles.ts
export const customStyles = StyleSheet.create({
  customComponent: {
    backgroundColor: colors.custom,
    padding: spacing.md,
  },
});
```

### Crear nuevo tema
```typescript
// En themes.ts
export const newTheme = {
  colors: {
    // ... colores personalizados
  },
  name: 'new',
};
```

## 📋 Mejores Prácticas

1. **Usar siempre las variables de diseño** en lugar de valores hardcodeados
2. **Mantener consistencia** usando los estilos base
3. **Reutilizar componentes** existentes antes de crear nuevos
4. **Documentar** nuevos estilos agregados
5. **Probar** en diferentes temas antes de implementar

## 🚀 Próximas Mejoras

- [ ] Soporte para modo oscuro automático
- [ ] Animaciones y transiciones
- [ ] Más variantes de componentes
- [ ] Sistema de iconos
- [ ] Accesibilidad mejorada
