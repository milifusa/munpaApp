# ✅ Configuración Google Sign-In para Munpa

## 📋 Estado Actual
- ✅ Backend implementado (`POST /api/auth/google-login`)
- ✅ Código React Native implementado
- ⏳ Pendiente: Configuración de credenciales

---

## 1️⃣ Google Cloud Console

### Crear proyecto y habilitar API
1. Ve a https://console.cloud.google.com/
2. Crea proyecto "Munpa" (o usa uno existente)
3. Habilita **Google Sign-In API** en "APIs y servicios"

### Crear credenciales OAuth 2.0

#### Para Android:
- Tipo: **Android**
- Nombre: "Munpa Android"
- Package name: `com.munpa.app`
- SHA-1 (debug keystore):
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
  Copia el SHA-1 que aparece

#### Para iOS:
- Tipo: **iOS**
- Nombre: "Munpa iOS"
- Bundle ID: `com.munpa.app`

#### **Web Client (IMPORTANTE - este es el que usas en el código):**
- Tipo: **Aplicación web**
- Nombre: "Munpa Web Client"
- NO necesitas URIs de redirección
- **COPIA ESTE CLIENT ID** - lo necesitarás en el paso 2

---

## 2️⃣ Configurar Web Client ID en el código

**Archivo:** `src/contexts/AuthContext.tsx` (línea 45)

**Cambiar:**
```javascript
webClientId: 'TU_WEB_CLIENT_ID_AQUI',
```

**Por tu Web Client ID real:**
```javascript
webClientId: '123456789-abcdefghijk.apps.googleusercontent.com',
```

---

## 3️⃣ Firebase Console (opcional pero recomendado)

1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto
3. Ve a **Authentication** → **Sign-in method**
4. Habilita **Google**
5. Descarga archivos de configuración:
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
6. Colócalos en la raíz del proyecto: `/Users/Mishu/Documents/munpaApp/`

---

## 4️⃣ Backend Configurado ✅

Tu backend está listo con endpoint simplificado:
- **Endpoint:** `POST https://api.munpa.online/api/auth/google-login-simple`
- **Recibe:**
  ```json
  {
    "email": "usuario@gmail.com",
    "displayName": "Juan Pérez",
    "photoURL": "https://...",
    "googleId": "123456789"
  }
  ```
- **Retorna:**
  ```json
  {
    "success": true,
    "message": "Login exitoso",
    "isNewUser": false,
    "data": {
      "uid": "...",
      "email": "...",
      "displayName": "...",
      "photoURL": "...",
      "emailVerified": true,
      "customToken": "..."
    }
  }
  ```

---

## 5️⃣ Rebuild la App

```bash
cd /Users/Mishu/Documents/munpaApp
npx expo prebuild --clean
npx expo run:android
# o para iOS
npx expo run:ios
```

---

## 🧪 Testing

1. **Usa dispositivo físico** (el emulador puede tener problemas con Google Play Services)
2. Toca el botón "Iniciar sesión con Google"
3. Selecciona una cuenta
4. La app debe:
   - Obtener token de Google
   - Enviarlo al backend
   - Recibir customToken
   - Navegar al home

---

## 🔍 Troubleshooting

### Error: "DEVELOPER_ERROR"
- **Causa:** Web Client ID incorrecto
- **Solución:** Verifica que hayas copiado el Web Client ID correcto

### Error: "PLAY_SERVICES_NOT_AVAILABLE"
- **Causa:** Google Play Services no disponible
- **Solución:** Instala Google Play Services o usa dispositivo físico

### Error: "Token de Google inválido" en backend
- **Causa:** El idToken no se está obteniendo correctamente o el Web Client ID no coincide
- **Solución:** 
  - ✅ RESUELTO: Ahora usamos `GoogleSignin.getTokens()` para obtener el idToken correcto
  - Verifica que el Web Client ID en el código coincida con el de Google Cloud Console
  - Verifica que el Web Client ID esté configurado en Firebase Console

### Error: "SIGN_IN_CANCELLED"
- **Causa:** Usuario canceló el login
- **Solución:** Esto es normal, no mostrar error

### Error: "TurboModuleRegistry.getEnforcing(...): 'RNGoogleSignin' could not be found"
- **Causa:** El módulo nativo no está linkeado
- **Solución:** 
  - ✅ RESUELTO: Ejecutar `npx expo prebuild --clean` y `pod install`
  - Agregar el plugin en `app.config.js`

---

## 📝 Archivos Modificados

- ✅ `src/contexts/AuthContext.tsx` - Login con Google
- ✅ `src/services/api.ts` - Endpoint `/api/auth/google-login`
- ✅ `src/screens/LoginScreen.tsx` - Botón de Google
- ✅ `app.config.js` - Configuración de archivos de Google

---

## 🎯 Próximos Pasos

1. Obtén tu Web Client ID de Google Cloud Console
2. Reemplaza `'TU_WEB_CLIENT_ID_AQUI'` en `AuthContext.tsx`
3. (Opcional) Descarga y agrega archivos de configuración
4. Rebuild la app
5. Prueba en dispositivo físico

**¡El código está listo! Solo falta la configuración de credenciales.**

