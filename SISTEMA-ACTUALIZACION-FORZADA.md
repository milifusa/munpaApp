# 📱 Sistema de Actualización Forzada

Este documento explica cómo funciona el sistema de actualización forzada de la aplicación Munpa.

## 🎯 Objetivo

Permitir que el backend obligue a los usuarios a actualizar la aplicación cuando sea necesario, mostrando una pantalla bloqueante si la versión instalada está desactualizada.

## 🏗️ Arquitectura

### 1. **API Endpoint** (Backend)

```
GET /api/app/version?platform=ios|android
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "platform": "ios",
    "minVersion": "2.0.0",
    "latestVersion": "2.0.4",
    "forceUpdate": true,
    "message": "Actualiza Munpa para acceder a nuevas funciones"
  }
}
```

**Campos:**
- `minVersion`: Versión mínima requerida para usar la app
- `latestVersion`: Última versión disponible en la tienda
- `forceUpdate`: Si `true`, se mostrará la pantalla de actualización obligatoria
- `message`: Mensaje personalizado (opcional)

### 2. **Servicio API** (Frontend)

**Archivo:** `src/services/api.ts`

```typescript
export const appVersionService = {
  checkVersion: async (platform: 'ios' | 'android') => {
    const response = await api.get(`/api/app/version?platform=${platform}`);
    return response.data;
  },
};
```

### 3. **Hook de Verificación**

**Archivo:** `src/hooks/useVersionCheck.ts`

Hook que:
- Obtiene la versión actual de la app (`expo-constants`)
- Consulta el endpoint del backend
- Compara versiones usando versionado semántico (X.Y.Z)
- Retorna si se necesita actualización y si es forzada

**Interface de retorno:**

```typescript
interface VersionCheckResult {
  needsUpdate: boolean;      // ¿Hay actualización disponible?
  forceUpdate: boolean;       // ¿Es obligatoria?
  currentVersion: string;     // Versión instalada
  latestVersion: string | null;
  minVersion: string | null;
  message: string | null;
  loading: boolean;           // Estado de carga
}
```

### 4. **Pantalla de Actualización**

**Archivo:** `src/screens/UpdateRequiredScreen.tsx`

Pantalla bloqueante que muestra:
- ✅ Icono de actualización
- ✅ Título y mensaje
- ✅ Versión actual vs. nueva versión
- ✅ Botón para ir a la tienda (App Store / Play Store)
- ✅ Información adicional

**Diseño:**
- Fondo degradado (colores de Munpa)
- Componentes centrados
- Botón destacado para actualizar
- No hay forma de cerrar la pantalla (es bloqueante)

### 5. **Integración en App.tsx**

**Archivo:** `App.tsx`

El flujo es:

```
1. App inicia
   ↓
2. useVersionCheck() consulta el backend
   ↓
3. Mientras carga → Muestra "Verificando versión..."
   ↓
4. Si forceUpdate === true → UpdateRequiredScreen (bloqueante)
   ↓
5. Si no → Continúa a AppNavigator normal
```

## 🔧 Comparación de Versiones

El sistema usa **versionado semántico** (X.Y.Z):

```
2.0.4 vs 2.0.0  →  2.0.4 es mayor ✅
2.1.0 vs 2.0.9  →  2.1.0 es mayor ✅
1.9.9 vs 2.0.0  →  2.0.0 es mayor ✅
```

**Ejemplo:**

```typescript
currentVersion: "2.0.3"
minVersion: "2.0.4"
forceUpdate: true

→ Resultado: Pantalla de actualización obligatoria
```

## 📦 URLs de las Tiendas

Las URLs están configuradas en `UpdateRequiredScreen.tsx`:

```typescript
const storeUrl = Platform.select({
  ios: 'https://apps.apple.com/us/app/munpa/id6754290929',
  android: 'https://play.google.com/store/apps/details?id=com.munpaapp',
});
```

Al presionar "Actualizar Ahora", se abre la tienda correspondiente.

## 🧪 Cómo Probar

### Backend (Configurar versión mínima)

En Firestore, colección `app_versions`:

**Documento `ios`:**
```json
{
  "platform": "ios",
  "minVersion": "2.0.5",
  "latestVersion": "2.0.5",
  "forceUpdate": true,
  "message": "Nueva versión con correcciones importantes"
}
```

**Documento `android`:**
```json
{
  "platform": "android",
  "minVersion": "2.0.5",
  "latestVersion": "2.0.5",
  "forceUpdate": true,
  "message": "Nueva versión con correcciones importantes"
}
```

### Frontend (Simular versión antigua)

En `package.json`, cambiar temporalmente:

```json
{
  "version": "2.0.3"
}
```

También en `app.config.js`:

```javascript
version: "2.0.3",
ios: {
  buildNumber: "2.0.3"
}
```

Recargar la app → Debería mostrar la pantalla de actualización.

## 🚨 Casos de Uso

### Caso 1: Actualización opcional (no forzada)

```json
{
  "minVersion": "2.0.0",
  "latestVersion": "2.0.5",
  "forceUpdate": false
}
```

→ Usuario puede seguir usando la app (se puede agregar un banner opcional en el futuro)

### Caso 2: Actualización obligatoria

```json
{
  "minVersion": "2.0.5",
  "latestVersion": "2.0.5",
  "forceUpdate": true
}
```

→ Usuario no puede usar la app hasta actualizar

### Caso 3: Sin configuración en backend

```json
{
  "success": true,
  "data": {
    "minVersion": null,
    "latestVersion": null,
    "forceUpdate": false
  }
}
```

→ App funciona normalmente (no se bloquea)

### Caso 4: Error en el backend

```
Error de red / timeout
```

→ App funciona normalmente (fail-safe, no bloqueamos por errores)

## 🎨 Personalización

### Cambiar mensaje

Modificar en `UpdateRequiredScreen.tsx`:

```typescript
{message || 'Tu mensaje personalizado aquí'}
```

### Cambiar colores

Ya usa los colores de Munpa (`themes.light.primary`), pero se puede modificar:

```typescript
colors={['#TU_COLOR_1', '#TU_COLOR_2']}
```

### Cambiar icono

```typescript
<Ionicons name="TU_ICONO" size={100} color="#FFFFFF" />
```

## 📊 Analytics (Futuro)

Se puede agregar tracking de:
- Cuántos usuarios ven la pantalla de actualización
- Cuántos hacen clic en "Actualizar"
- Versiones más comunes que necesitan actualización

```typescript
analyticsService.logEvent('force_update_shown', {
  currentVersion: versionCheck.currentVersion,
  requiredVersion: versionCheck.minVersion,
});
```

## ✅ Checklist de Implementación

- [x] Endpoint en backend (`GET /api/app/version`)
- [x] Servicio API en frontend (`appVersionService`)
- [x] Hook de verificación (`useVersionCheck`)
- [x] Pantalla de actualización (`UpdateRequiredScreen`)
- [x] Integración en `App.tsx`
- [x] Comparación de versiones semánticas
- [x] URLs de tiendas (iOS/Android)
- [x] Manejo de errores (fail-safe)
- [ ] Configurar versiones en Firestore (Backend)
- [ ] Probar con versión antigua
- [ ] Analytics (opcional)

## 🔮 Mejoras Futuras

1. **Banner opcional**: Si `forceUpdate: false` pero hay actualización, mostrar banner no bloqueante
2. **Contador de recordatorios**: Permitir "Recordar más tarde" X veces
3. **Changelog**: Mostrar qué hay de nuevo en la actualización
4. **Deep linking**: Abrir directamente la página de la app en la tienda
5. **Cache**: Guardar resultado en AsyncStorage para no consultar en cada inicio

---

**Versión del documento:** 1.0  
**Última actualización:** 2026-01-31  
**Autor:** AI Assistant
