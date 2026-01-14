# 🔄 Cambios Backend - Siestas en Progreso

## 📋 Resumen

Actualización del manejo de siestas en progreso para distinguir correctamente entre siestas activas y completadas.

---

## ❌ ANTES (Incorrecto)

### Siesta sin endTime:
```json
{
  "type": "completed",  // ❌ INCORRECTO
  "status": "completed",  // ❌ INCORRECTO
  "expectedDuration": undefined  // ❌ INCORRECTO
}
```

**Problema**: Una siesta activa (sin `endTime`) se marcaba como "completed", causando confusión en predicciones y UI.

---

## ✅ AHORA (Correcto)

### Siesta sin endTime (EN PROGRESO):
```json
{
  "type": "in_progress",  // ✅ CORRECTO
  "status": "in_progress",  // ✅ CORRECTO
  "expectedDuration": 75,  // ✅ CORRECTO (basado en edad)
  "isInProgress": true  // ✅ CORRECTO
}
```

### Siesta con endTime (COMPLETADA):
```json
{
  "type": "nap",  // ✅ CORRECTO
  "status": "completed",  // ✅ CORRECTO
  "actualDuration": 75,  // ✅ CORRECTO (duración real)
  "isInProgress": false  // ✅ CORRECTO
}
```

---

## 🔄 Flujo Completo

### 1️⃣ Iniciar Siesta

**Request:**
```typescript
POST /api/sleep/record
{
  "type": "nap",
  "startTime": "2026-01-13T16:24:00.000Z"
  // Sin endTime
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "type": "nap",
    "status": "in_progress",  // ✅
    "startTime": "2026-01-13T16:24:00.000Z",
    "expectedDuration": 75,  // ✅ Calculado por edad
    "isInProgress": true,  // ✅
    "childAge": 5  // En meses
  }
}
```

### 2️⃣ Frontend Muestra:
```
Siesta 3:
  - Tipo: in_progress ✅
  - Estado: in_progress ✅
  - Duración esperada: 75 min ✅
  - En progreso: Sí ✅
```

### 3️⃣ Terminar Siesta

**Request:**
```typescript
PUT /api/sleep/record/abc123
{
  "endTime": "2026-01-13T17:39:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "abc123",
    "type": "nap",
    "status": "completed",  // ✅
    "startTime": "2026-01-13T16:24:00.000Z",
    "endTime": "2026-01-13T17:39:00.000Z",
    "actualDuration": 75,  // ✅ Duración real calculada
    "isInProgress": false,  // ✅
    "completed": true
  }
}
```

---

## 📊 Duración Estimada por Edad

El backend debe calcular `expectedDuration` automáticamente si no se proporciona:

| Edad del Bebé | Duración Estimada |
|---------------|-------------------|
| 0-6 meses     | 75 minutos        |
| 6+ meses      | 90 minutos        |
| 12+ meses     | 60 minutos        |

**Implementación Recomendada (Backend):**
```javascript
function getExpectedDurationByAge(ageInMonths) {
  if (ageInMonths < 6) return 75;
  if (ageInMonths < 12) return 90;
  return 60;
}

// Al crear/actualizar siesta sin endTime:
if (!sleepRecord.endTime) {
  sleepRecord.status = 'in_progress';
  sleepRecord.type = 'in_progress';
  sleepRecord.isInProgress = true;
  sleepRecord.expectedDuration = getExpectedDurationByAge(child.ageInMonths);
}
```

---

## 📱 Logs Mejorados

### En Predicciones (GET /api/sleep/predict/:childId):
```
📊 [PREDICT] Breakdown:
   - Registradas completadas: 2
   - Registradas en progreso: 1 ✅
   - Predichas futuras (upcoming): 0
   
🔍 [PREDICT] Desglose de siestas:
   Siesta 1: ✅ Completada (60 min)
   Siesta 2: ✅ Completada (90 min)
   Siesta 3: ⏳ En progreso (esperada: 75 min)
```

---

## 🎯 Endpoints Afectados

### 1. POST /api/sleep/record
- ✅ Crear siesta con `status: 'in_progress'` si no hay `endTime`
- ✅ Calcular `expectedDuration` basado en edad

### 2. PUT /api/sleep/record/:id
- ✅ Actualizar a `status: 'completed'` cuando se agrega `endTime`
- ✅ Calcular `actualDuration` desde startTime hasta endTime
- ✅ Cambiar `isInProgress` a `false`

### 3. GET /api/sleep/predict/:childId
- ✅ Distinguir correctamente entre siestas completadas y en progreso
- ✅ Incluir `isInProgress: true` en siestas activas
- ✅ Logs mejorados con breakdown

### 4. GET /api/sleep/history/:childId
- ✅ Filtrar correctamente por status
- ✅ Mostrar siestas en progreso separadas de completadas

---

## 🔍 Validaciones Necesarias

### Backend debe validar:

1. **Al crear siesta:**
   ```javascript
   // Si NO hay endTime
   if (!endTime) {
     sleepRecord.status = 'in_progress';
     sleepRecord.type = 'in_progress';
     sleepRecord.isInProgress = true;
   }
   ```

2. **Al actualizar siesta:**
   ```javascript
   // Si se agrega endTime
   if (endTime && prevStatus === 'in_progress') {
     sleepRecord.status = 'completed';
     sleepRecord.type = 'nap';
     sleepRecord.isInProgress = false;
     sleepRecord.completed = true;
     sleepRecord.actualDuration = calculateDuration(startTime, endTime);
   }
   ```

3. **En predicciones:**
   ```javascript
   const inProgressNaps = allNaps.filter(nap => 
     nap.status === 'in_progress' || nap.isInProgress === true
   );
   
   const completedNaps = allNaps.filter(nap => 
     nap.status === 'completed' && !nap.isInProgress
   );
   ```

---

## ✅ Checklist de Implementación

### Backend:
- [ ] Actualizar POST /api/sleep/record para crear siestas con `status: 'in_progress'`
- [ ] Agregar cálculo automático de `expectedDuration` por edad
- [ ] Actualizar PUT /api/sleep/record/:id para cambiar a `completed` cuando hay endTime
- [ ] Calcular `actualDuration` automáticamente
- [ ] Agregar campo `isInProgress: boolean`
- [ ] Actualizar logs en /api/sleep/predict con breakdown correcto
- [ ] Validar que siestas sin endTime NUNCA tengan `status: 'completed'`

### Frontend (ya implementado):
- [x] Manejar `status: 'in_progress'` en HomeScreen
- [x] Mostrar "En progreso ⏳" para siestas activas
- [x] Filtrar correctamente siestas para notificaciones
- [x] Logs detallados en frontend

---

## 🧪 Casos de Prueba

### Caso 1: Crear siesta sin endTime
```bash
curl -X POST /api/sleep/record \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "K6vfrjDYcwAp8cDgH9sh",
    "type": "nap",
    "startTime": "2026-01-13T16:24:00.000Z"
  }'

# Debe retornar:
# status: "in_progress"
# isInProgress: true
# expectedDuration: 75
```

### Caso 2: Completar siesta
```bash
curl -X PUT /api/sleep/record/abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "endTime": "2026-01-13T17:39:00.000Z"
  }'

# Debe retornar:
# status: "completed"
# isInProgress: false
# actualDuration: 75
```

### Caso 3: Verificar predicciones
```bash
curl -X GET /api/sleep/predict/K6vfrjDYcwAp8cDgH9sh

# Logs deben mostrar:
# "Registradas completadas: 2"
# "Registradas en progreso: 1"
```

---

## 📝 Notas Importantes

1. **Nunca** una siesta sin `endTime` debe tener `status: 'completed'`
2. **Siempre** calcular `expectedDuration` si no se proporciona
3. **Siempre** incluir `isInProgress` en la respuesta
4. **Actualizar** Firestore con estos nuevos campos
5. **Validar** en predicciones que solo siestas `completed` cuenten como historial

---

## 🚀 Estado Actual

| Componente | Estado | Notas |
|------------|--------|-------|
| Frontend | ✅ Listo | Ya maneja `in_progress` correctamente |
| Backend POST /record | ⏳ Pendiente | Necesita actualización |
| Backend PUT /record | ⏳ Pendiente | Necesita actualización |
| Backend GET /predict | ⏳ Pendiente | Necesita logs mejorados |
| Firestore Schema | ⏳ Pendiente | Agregar campos nuevos |

---

**Última actualización**: 13 de Enero, 2026  
**Versión**: 2.0  
**Prioridad**: 🔴 ALTA
