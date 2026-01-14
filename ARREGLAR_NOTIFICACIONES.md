# 🔔 Arreglar Notificaciones Push - Firebase

## ✅ Cambios Aplicados

1. **✓** Project ID configurado en `notificationService.ts`: `07ff9291-f151-4077-94b9-a744a255bf24`
2. **✓** Plugin de `expo-notifications` actualizado en `app.config.js` con `useNextNotificationsApi: true`
3. **✓** `google-services.json` ya está correctamente configurado
4. **✓** `googleServicesFile` ya está referenciado en `app.config.js`

---

## 🔧 Pasos para Aplicar los Cambios

### **1. Limpiar el Proyecto**

```bash
# Limpia caché de Metro
npx expo start -c

# Limpia build de Android
cd android
./gradlew clean
cd ..
```

### **2. Hacer Prebuild (IMPORTANTE)**

```bash
# Regenera las carpetas android/ e ios/ con la nueva configuración
npx expo prebuild --clean
```

**⚠️ IMPORTANTE**: Si te pregunta algo durante el prebuild, acepta todo con `Y` (Yes)

### **3. Rebuild de la App Android**

```bash
# Opción 1: Con Expo
npx expo run:android

# O Opción 2: Con npm
npm run android
```

### **4. Verificar que Funciona**

Una vez que la app se abra en el emulador/dispositivo:

1. Ve a **Home** → Card de sueño → **Sleep Tracker**
2. Toca el botón **🔔** en el header
3. Toca **"Activar Notificaciones"**
4. Acepta los permisos cuando Android te lo pida
5. Deberías ver: ✅ **"Notificaciones activadas"**

---

## 🚨 Si Aún Ves el Error

### **Opción A: Verificar Firebase en Google Cloud Console**

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto: **mumpabackend**
3. Ve a **Project Settings** (⚙️)
4. En la pestaña **Cloud Messaging**, verifica que:
   - **Cloud Messaging API (Legacy)** esté **HABILITADA**
   - O que **Firebase Cloud Messaging API (V1)** esté **HABILITADA**

### **Opción B: Regenerar google-services.json**

Si el error persiste, regenera el archivo:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Proyecto **mumpabackend** → ⚙️ **Project Settings**
3. Baja a **Your apps** → Android app
4. Click en **"Download google-services.json"**
5. Reemplaza el archivo en la raíz del proyecto
6. Vuelve a hacer **prebuild** y **rebuild**

### **Opción C: Verificar que FCM está habilitado**

```bash
# Ve a Google Cloud Console
https://console.cloud.google.com/

# Selecciona proyecto: mumpabackend

# Ve a APIs & Services → Library

# Busca: "Firebase Cloud Messaging API"

# Asegúrate de que esté ENABLED
```

---

## 📱 Probar Notificaciones

Una vez que funcione:

### **1. Programar Notificación Manual (Prueba)**

En el código, puedes probar manualmente:

```javascript
// En HomeScreen o SleepTrackerScreen
import notificationService from '../services/notificationService';

// Probar notificación inmediata
await Notifications.scheduleNotificationAsync({
  content: {
    title: '🔔 Prueba de notificación',
    body: '¡Las notificaciones funcionan!',
  },
  trigger: null, // null = inmediata
});
```

### **2. Probar con Predicciones Reales**

1. Registra algunas siestas en el Sleep Tracker
2. La IA generará predicciones
3. Las notificaciones se programarán automáticamente
4. Revisa en **Configuración de Notificaciones** cuántas hay programadas

---

## 🎯 Qué Hace Cada Archivo

### **app.config.js**
```javascript
android: {
  googleServicesFile: './google-services.json', // ← Apunta a Firebase config
}

plugins: [
  ['expo-notifications', {
    android: {
      useNextNotificationsApi: true, // ← Usa FCM moderno
    },
  }],
]

extra: {
  eas: {
    projectId: '07ff9291-f151-4077-94b9-a744a255bf24' // ← Tu project ID
  }
}
```

### **google-services.json**
Contiene:
- `project_id`: mumpabackend
- `mobilesdk_app_id`: 1:975014449237:android:46c06caf478b53489dc4dc
- `package_name`: com.munpa.app ✓
- `current_key`: AIzaSyDDX0_GPvfxwnmC4H0Rs1cUEyz44IAY1S4

### **notificationService.ts**
```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: '07ff9291-f151-4077-94b9-a744a255bf24', // ← Ahora correcto
});
```

---

## 📊 Comandos Útiles para Debug

```bash
# Ver logs en tiempo real
npx expo start

# Ver logs de Android específicamente
adb logcat | grep -i firebase

# Ver logs de Expo Notifications
adb logcat | grep -i notification

# Verificar que Firebase está en la build
cd android && ./gradlew :app:dependencies | grep firebase
```

---

## ✅ Checklist Final

- [ ] Ejecuté `npx expo prebuild --clean`
- [ ] Ejecuté `npm run android` o `npx expo run:android`
- [ ] La app compiló sin errores
- [ ] La app abrió correctamente
- [ ] Acepté permisos de notificaciones
- [ ] Veo "Notificaciones activadas" en Configuración
- [ ] Puedo programar notificaciones

---

## 🆘 Si Nada Funciona

Última opción: **Rebuild desde cero**

```bash
# 1. Eliminar carpetas build
rm -rf android/build
rm -rf android/app/build
rm -rf ios/build
rm -rf node_modules

# 2. Reinstalar dependencias
npm install

# 3. Prebuild limpio
npx expo prebuild --clean

# 4. Rebuild Android
npx expo run:android
```

---

## 📝 Notas

- Las notificaciones **solo funcionan en dispositivos físicos** o emuladores con Google Play Services
- En modo desarrollo, las notificaciones pueden tardar unos segundos
- En producción, son instantáneas
- El token de Expo Push se genera en el primer registro

---

## 🎉 Cuando Funcione

Deberías ver en los logs:

```
✅ Push token obtenido: ExponentPushToken[xxxxxx]
✅ Notificaciones programadas automáticamente
📬 Notificación recibida: { ... }
```

Y en la app:

```
╔══════════════════════════════════════╗
║  ✅ Notificaciones activadas         ║
║  Recibirás recordatorios según       ║
║  tu configuración                    ║
╚══════════════════════════════════════╝
```

---

**¡Listo!** Una vez que hagas el prebuild y rebuild, las notificaciones deberían funcionar perfectamente. 🚀



