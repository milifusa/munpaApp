# 🔔 Firebase Cloud Messaging (FCM) - Configuración Completa

## ✅ Qué se hizo

Se migró de **Expo Push Tokens** a **Firebase Cloud Messaging (FCM)** nativo para que las notificaciones push funcionen correctamente.

### Problema anterior:
- ❌ Backend recibía tokens Expo: `ExponentPushToken[abc123...]`
- ❌ Firebase rechazaba: "not a valid FCM registration token"
- ❌ Push notifications no se enviaban

### Solución implementada:
- ✅ Instalado `@react-native-firebase/app@21.14.0`
- ✅ Instalado `@react-native-firebase/messaging@21.14.0`
- ✅ Actualizado `notificationService.ts` para usar módulo nativo
- ✅ Configurado iOS con pods de Firebase Messaging
- ✅ Backend ahora recibirá tokens FCM válidos

---

## 📱 Cómo probar (IMPORTANTE)

### ⚠️ No funciona con Expo Go
Firebase Messaging **requiere build nativo**. No puedes probarlo con Expo Go.

### Opción 1: Build local en iOS

```bash
# 1. Instalar dependencias
npm install

# 2. Instalar pods
cd ios && pod install && cd ..

# 3. Hacer build y ejecutar en dispositivo real o simulador
npx expo run:ios
```

### Opción 2: Build con EAS (recomendado para producción)

```bash
# 1. Build de desarrollo (incluye DevClient)
eas build --profile development --platform ios

# 2. Instalar el build en tu dispositivo
# Escanea el QR que genera EAS

# 3. Ejecutar con:
npx expo start --dev-client
```

---

## 🔍 Verificar que funciona

### 1. Logs al iniciar la app:

Deberías ver logs como estos en la consola:

```
🔔 [NOTIF] Iniciando registro de token...
🔔 [NOTIF] Dispositivo real detectado, obteniendo token FCM...
✅ [NOTIF] Autorización de Firebase Messaging concedida
✅ [NOTIF] Token FCM obtenido (150 caracteres): dH8sKp3vQ7...
📤 [NOTIF] Enviando token al backend...
📤 [NOTIF] Token Type: fcm
✅ [NOTIF] Token registrado con el backend exitosamente
```

### 2. Verificar en backend:

Pide al backend que revise la base de datos:

```sql
SELECT token, tokenType, platform 
FROM notification_tokens 
WHERE userId = 'tu-user-id'
ORDER BY createdAt DESC 
LIMIT 1;
```

Deberías ver:
- `tokenType`: **fcm** (no "expo" ni "apns")
- `token`: String largo (~150+ caracteres)
- `platform`: **ios** o **android**

### 3. Probar envío de push:

Pide al backend que envíe un push de prueba. Debería funcionar correctamente.

---

## 📊 Diferencia de tokens

| Tipo | Formato | Longitud | Firebase acepta |
|------|---------|----------|----------------|
| **Expo** | `ExponentPushToken[abc...]` | ~50 chars | ❌ NO |
| **APNS** | Hex: `a1b2c3d4e5f6...` | 64 chars | ❌ NO |
| **FCM** | Base64/AlphaNum | 150+ chars | ✅ SÍ |

---

## 🛠 Troubleshooting

### Error: "Unable to obtain FCM token"

**Causa**: Firebase no está configurado correctamente en el proyecto iOS.

**Solución**:
1. Verifica que `GoogleService-Info.plist` esté en `ios/Munpa/`
2. Verifica que el Bundle ID coincida con el de Firebase Console
3. Limpia y reconstruye:
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   npx expo run:ios
   ```

### Error: "User not authorized"

**Causa**: Usuario rechazó permisos de notificaciones.

**Solución**:
1. Ve a Settings > Munpa > Notifications
2. Activa "Allow Notifications"
3. Cierra y vuelve a abrir la app

### Sigue diciendo "ExponentPushToken"

**Causa**: Estás usando Expo Go en lugar de build nativo.

**Solución**: Hacer build nativo (ver sección "Cómo probar")

---

## 🚀 Stack tecnológico

### Frontend (App):
- `@react-native-firebase/messaging` → Obtiene token FCM
- `notificationService.ts` → Registra token con backend
- Llamada en `HomeScreen.tsx` (cada vez que se enfoca)

### Backend:
- Firebase Admin SDK → Envía push notifications vía FCM
- Endpoint: `POST /api/notifications/register-token`
- Guarda: `{ token, tokenType: 'fcm', platform, userId, childId }`

### Firebase:
- Firebase Cloud Messaging (FCM)
- Firebase Project: (tu proyecto)
- iOS: APNS → FCM (conversión automática)
- Android: FCM nativo

---

## 📝 Próximos pasos

1. ✅ **Build nativo en iOS**: `npx expo run:ios`
2. ✅ **Verificar logs**: Buscar "Token FCM obtenido"
3. ✅ **Confirmar en backend**: Token tipo FCM guardado
4. ✅ **Probar push**: Enviar notificación de prueba desde backend
5. ✅ **Repetir en Android**: `npx expo run:android`

---

## 💡 Notas importantes

- **No usar Expo Go**: Requiere build nativo
- **Dispositivo real recomendado**: Simulador puede tener limitaciones
- **Tokens únicos por dispositivo**: Cada instalación genera un token diferente
- **Tokens pueden expirar**: El backend debe manejar tokens inválidos

---

## 🔗 Recursos

- [React Native Firebase Docs](https://rnfirebase.io/messaging/usage)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [iOS Setup Guide](https://rnfirebase.io/messaging/ios-permissions)

---

**Última actualización**: 2026-01-22  
**Commit**: `37c061c`
