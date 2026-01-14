# 🔔 Sistema de Predicciones y Notificaciones de Sueño - Munpa

## 📋 Resumen Ejecutivo

Sistema completo de predicciones dinámicas de sueño con notificaciones inteligentes que se adaptan automáticamente a los cambios en el horario del bebé.

---

## ✅ 1. Predicciones Dinámicas Basadas en Hora Real

### Cómo Funciona:
- **Backend ChatGPT** calcula predicciones usando:
  - Hora actual real
  - Última siesta registrada (hora de finalización)
  - Edad del bebé
  - Patrones históricos de sueño
  
- **NO usa horarios fijos** - todo se calcula dinámicamente
- **Ejemplo**: Si la última siesta terminó a las 2:42 PM, la siguiente se predice a las 4:42 PM (2h después)

### Endpoint Frontend:
```typescript
const prediction = await sleepService.getSleepPrediction(childId);
```

### Ubicación en código:
- **Frontend**: `src/screens/HomeScreen.tsx` - línea 328
- **API Service**: `src/services/api.ts` - línea 1816
- **Backend**: `/api/sleep/predict/${childId}` (vercel)

---

## ✅ 2. Guardado Automático en Firestore

### Estructura de Datos:
```
Firestore > sleepPredictions > {childId}_{YYYY-MM-DD}
```

### Contenido Guardado:
```json
{
  "childId": "K6vfrjDYcwAp8cDgH9sh",
  "date": "2026-01-13",
  "timestamp": "2026-01-13T21:42:00.000Z",
  "prediction": {
    "dailySchedule": {
      "allNaps": [
        {
          "time": "2026-01-13T16:42:00.000Z",
          "expectedDuration": 120,
          "type": "afternoon_nap",
          "status": "pending",
          "confidence": 85
        }
      ]
    },
    "bedtime": {
      "time": "2026-01-13T21:00:00.000Z",
      "confidence": 90
    },
    "sleepPressure": {
      "level": "low",
      "hoursSinceLastSleep": 1.4
    }
  }
}
```

### Actualización Automática:
- Se actualiza **cada vez** que se llama `/api/sleep/predict/${childId}`
- Se recalcula después de **cada siesta registrada**
- Las notificaciones **leen** desde Firestore para programarse

---

## ✅ 3. Sistema de Notificaciones Funcional

### Tipos de Notificaciones:

#### 1️⃣ **Pre-Nap** (30 min antes)
```typescript
await api.post(`/api/sleep/notifications/pre-nap/${childId}`);
```
- 🎯 **Objetivo**: Avisar para preparar el ambiente
- ⏰ **Cuándo**: 30 minutos antes de cada siesta predicha
- 📱 **Mensaje**: "En 30 minutos es hora de siesta. Prepara el ambiente tranquilo."

#### 2️⃣ **Nap-Time** (Hora exacta)
```typescript
await api.post(`/api/sleep/notifications/nap-time/${childId}`);
```
- 🎯 **Objetivo**: Recordar que es hora de dormir
- ⏰ **Cuándo**: A la hora exacta de la siesta predicha
- 📱 **Mensaje**: "Es hora de la siesta de [nombre]. ¿Quieres registrarla?"

#### 3️⃣ **Check-Late** (30 min tarde)
```typescript
await api.post(`/api/sleep/notifications/check-late/${childId}`);
```
- 🎯 **Objetivo**: Recordar registrar siesta si no se hizo
- ⏰ **Cuándo**: 30 minutos después de la hora predicha
- 📱 **Mensaje**: "¿Se durmió [nombre]? No olvides registrar la siesta."

#### 4️⃣ **Check-Long** (Siesta muy larga)
```typescript
await api.post(`/api/sleep/notifications/check-long/${childId}`);
```
- 🎯 **Objetivo**: Alertar sobre siestas inusualmente largas (>4h)
- ⏰ **Cuándo**: Se verifica cada hora durante siestas activas
- 📱 **Mensaje**: "La siesta lleva más de 4 horas. ¿Está todo bien?"

### Programación Automática:

#### En HomeScreen.tsx (líneas 359-389):
```typescript
// Se programa automáticamente cuando:
// 1. Se cargan predicciones nuevas
// 2. Se registra una nueva siesta (porque recalcula predicciones)

if (predictionRes.value.success) {
  // Validar que haya siestas válidas
  const upcomingNaps = predictionRes.value.prediction.dailySchedule.allNaps.filter(
    (nap: any) => nap.time && !nap.completed
  );
  
  if (upcomingNaps.length > 0) {
    // Reprogramar TODAS las notificaciones
    sleepNotificationScheduler.scheduleAllNotifications(childId, true);
  }
}
```

### Verificaciones Periódicas:

En `sleepNotificationScheduler.ts`:
- **Check Late**: Cada 30 minutos
- **Check Long**: Cada 60 minutos
- Se inician automáticamente con `startPeriodicChecks(childId)`

---

## 🔄 Flujo Completo del Sistema

### 1️⃣ Usuario registra una siesta:
```
Usuario → SleepTrackerScreen → POST /api/sleep/track
```

### 2️⃣ Backend recalcula predicciones:
```
Backend → ChatGPT → Calcula nuevas predicciones
Backend → Firestore → Guarda en sleepPredictions/{childId}_{date}
```

### 3️⃣ Frontend recarga predicciones:
```
HomeScreen.loadSleepData() → GET /api/sleep/predict/${childId}
```

### 4️⃣ Se reprograman notificaciones automáticamente:
```
sleepNotificationScheduler.scheduleAllNotifications(childId, true)
  ↓
POST /api/sleep/notifications/pre-nap/${childId}   (Lee desde Firestore)
POST /api/sleep/notifications/nap-time/${childId}  (Lee desde Firestore)
```

### 5️⃣ Notificaciones se envían cuando corresponde:
```
Backend → Firebase Cloud Messaging → Push al dispositivo
```

---

## 🛠️ Archivos Clave

### Frontend:
- **`src/screens/HomeScreen.tsx`**: Carga predicciones y programa notificaciones
- **`src/services/sleepNotificationScheduler.ts`**: Gestiona todas las notificaciones
- **`src/services/api.ts`**: Define endpoints de predicciones y notificaciones

### Backend (Vercel):
- **`/api/sleep/predict/[childId]`**: Genera predicciones con ChatGPT y guarda en Firestore
- **`/api/sleep/notifications/pre-nap/[childId]`**: Programa notificaciones 30min antes
- **`/api/sleep/notifications/nap-time/[childId]`**: Programa notificaciones a la hora exacta
- **`/api/sleep/notifications/check-late/[childId]`**: Verifica registros tarde
- **`/api/sleep/notifications/check-long/[childId]`**: Verifica siestas muy largas

---

## 🎯 Ventajas del Sistema

✅ **Dinámico**: Se adapta automáticamente a cambios en el horario
✅ **Automático**: No requiere intervención manual para programar notificaciones
✅ **Inteligente**: Lee desde Firestore para asegurar consistencia
✅ **Robusto**: Maneja errores sin crashear la app
✅ **Eficiente**: Solo reprograma cuando cambian las predicciones

---

## 🔍 Debugging

### Logs Clave en Frontend:
```
🎨 [PLANETA] -> Muestra qué imagen del planeta se usa
⚪ [HORA ACTUAL] -> Posición del punto blanco en órbita
✅ [HOME] Programando notificaciones para X siesta(s) válida(s)
📅 [SLEEP-NOTIF] Programando notificaciones del día...
⏰ [SLEEP-NOTIF] Pre-nap: ...
💤 [SLEEP-NOTIF] Nap-time: ...
```

### Verificar Estado:
```typescript
const status = await sleepNotificationScheduler.getScheduleStatus(childId);
console.log('Estado notificaciones:', status);
// { scheduled: true, date: "2026-01-13" }
```

### Limpiar y Reprogramar:
```typescript
await sleepNotificationScheduler.clearScheduledData(childId);
await sleepNotificationScheduler.scheduleAllNotifications(childId, true);
```

---

## 📝 Notas Importantes

1. **Timezone**: Todas las horas se manejan en **hora local** del usuario
2. **Validación**: Solo se programan notificaciones para siestas con `time` válido y `completed: false`
3. **Reprogramación**: Se fuerza reprogramación (`forceReschedule: true`) cuando cambian predicciones
4. **Persistencia**: El estado de programación se guarda en AsyncStorage para evitar duplicados

---

## 🚀 Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| Predicciones dinámicas | ✅ Funcional | Calcula desde hora real |
| Guardado en Firestore | ✅ Funcional | Automático en cada predicción |
| Notificaciones Pre-Nap | ✅ Funcional | 30min antes |
| Notificaciones Nap-Time | ✅ Funcional | Hora exacta |
| Notificaciones Check-Late | ✅ Funcional | 30min tarde |
| Notificaciones Check-Long | ✅ Funcional | Verificación cada hora |
| Verificaciones periódicas | ✅ Funcional | Activas en background |
| Imágenes de planetas | ✅ Funcional | Según nivel de energía |
| Punto hora actual | ✅ Funcional | En órbita del planeta |

---

**Última actualización**: 13 de Enero, 2026
**Versión**: 1.0
