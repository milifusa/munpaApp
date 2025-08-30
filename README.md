# MunpaApp - Aplicación de Autenticación

Una aplicación móvil desarrollada con Expo React Native que se conecta a tu backend de autenticación en `https://api.munpa.online/`.

## 🚀 Características

- **Autenticación completa**: Registro, login, logout, verificación de token
- **Gestión de perfil**: Editar información personal, cambiar contraseña, eliminar cuenta
- **Seguridad**: Validación de contraseñas, verificación de emails
- **Persistencia**: Tokens JWT almacenados localmente
- **UI moderna**: Diseño limpio y responsive
- **Navegación intuitiva**: Navegación por pestañas y stack
- **Debugging**: Herramientas para verificar estado de tokens y servidor

## 📱 Pantallas disponibles

### Autenticación
- **Login**: Inicio de sesión con validación de campos
- **Signup**: Registro con validación de contraseñas seguras
- **ForgotPassword**: Solicitud de restablecimiento de contraseña
- **ResetPassword**: Restablecimiento de contraseña con código

### Usuario autenticado
- **Home**: Pantalla principal con información del usuario
- **Profile**: Gestión completa del perfil

## 🛠️ Tecnologías utilizadas

- **Expo**: Framework para desarrollo móvil
- **React Native**: Framework de UI nativo
- **TypeScript**: Tipado estático
- **React Navigation**: Navegación entre pantallas
- **Axios**: Cliente HTTP para API
- **AsyncStorage**: Almacenamiento local
- **Context API**: Estado global de la aplicación

## 📋 Requisitos previos

- Node.js (versión 16 o superior)
- npm o yarn
- Expo CLI
- Dispositivo móvil o emulador

## 🔧 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <tu-repositorio>
   cd munpaApp
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar la aplicación**
   ```bash
   npm start
   ```

4. **Ejecutar en dispositivo/emulador**
   - Escanea el código QR con la app Expo Go
   - O presiona `i` para iOS o `a` para Android

## 🔌 Configuración del backend

La aplicación está configurada para conectarse a tu API en `https://api.munpa.online/`. Los endpoints disponibles son:

### Endpoints de autenticación
- `POST /api/auth/signup` - Registro de usuarios
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/forgot-password` - Solicitar restablecimiento de contraseña
- `POST /api/auth/reset-password` - Restablecer contraseña con código
- `GET /api/auth/profile` - Obtener perfil (requiere auth)
- `PUT /api/auth/profile` - Actualizar perfil (requiere auth)
- `PUT /api/auth/change-password` - Cambiar contraseña (requiere auth)
- `DELETE /api/auth/account` - Eliminar cuenta (requiere auth)
- `GET /api/auth/verify-token` - Verificar token (requiere auth)

### Endpoints de sistema
- `GET /health` - Estado del servidor
- `GET /` - Información de la API

## 🔒 Características de seguridad

- **Validación de contraseñas**: Mínimo 6 caracteres, mayúscula, minúscula, número
- **Verificación de emails**: Formato válido requerido
- **Tokens JWT**: Autenticación segura con Firebase
- **Middleware de autenticación**: Protección de rutas
- **Manejo seguro de errores**: Respuestas consistentes

## 📁 Estructura del proyecto

```
src/
├── contexts/
│   └── AuthContext.tsx          # Contexto de autenticación
├── navigation/
│   └── AppNavigator.tsx         # Navegación principal
├── screens/
│   ├── LoginScreen.tsx          # Pantalla de login
│   ├── SignupScreen.tsx         # Pantalla de registro
│   ├── ForgotPasswordScreen.tsx # Pantalla de olvidé contraseña
│   ├── ResetPasswordScreen.tsx  # Pantalla de restablecer contraseña
│   ├── HomeScreen.tsx           # Pantalla principal
│   └── ProfileScreen.tsx        # Pantalla de perfil
└── services/
    └── api.ts                   # Servicios de API
```

## 🎨 Características de UI/UX

- **Diseño moderno**: Colores atractivos y tipografía clara
- **Validación en tiempo real**: Feedback inmediato al usuario
- **Estados de carga**: Indicadores visuales durante operaciones
- **Manejo de errores**: Alertas informativas
- **Responsive**: Adaptable a diferentes tamaños de pantalla

## 🚀 Funcionalidades principales

### Registro de usuarios
- Validación de email único
- Contraseñas seguras con indicador de fortaleza
- Confirmación de contraseña
- Nombre opcional

### Inicio de sesión
- Validación de credenciales
- Persistencia de sesión
- Manejo de errores de autenticación

### Gestión de perfil
- Edición de información personal
- Cambio de contraseña seguro
- Eliminación de cuenta con confirmación
- Cierre de sesión

### Verificación de estado
- Health check del servidor
- Verificación de token de autenticación
- Información detallada del usuario

## 🔧 Personalización

### Cambiar URL del backend
Edita el archivo `src/services/api.ts`:
```typescript
const API_BASE_URL = 'https://tu-api.com';
```

### Modificar colores
Los colores principales están definidos en los archivos de estilos:
- Primario: `#3498db`
- Secundario: `#2c3e50`
- Fondo: `#f8f9fa`

### Agregar nuevas pantallas
1. Crea el componente en `src/screens/`
2. Agrega la ruta en `src/navigation/AppNavigator.tsx`
3. Actualiza los tipos en `src/services/api.ts` si es necesario

## 🐛 Solución de problemas

### Error de conexión
- Verifica que el backend esté funcionando
- Confirma la URL en `src/services/api.ts`
- Revisa la conectividad de red

### Error de autenticación
- Verifica las credenciales
- Confirma que el token no haya expirado
- Revisa los logs del backend

### Problemas de navegación
- Reinicia la aplicación
- Limpia el cache: `expo start -c`
- Verifica las dependencias de navegación

## 📄 Licencia

Este proyecto está bajo la Licencia MIT.

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte técnico o preguntas, contacta al equipo de desarrollo.

---

**Desarrollado con ❤️ para Munpa**
