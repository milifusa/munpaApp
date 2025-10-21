# 🔍 Verificar Configuración de Google Sign-In

## ❌ Error Actual:
```
Token inválido y no se proporcionó email para crear usuario
```

## 🔎 Diagnóstico:

El token se está obteniendo y enviando correctamente al backend, pero **Firebase Admin SDK en tu backend no puede verificarlo**.

### Posibles causas:

1. **El Web Client ID no está configurado en Firebase Console** ✅ MÁS PROBABLE
2. El token está expirado (poco probable si acabas de hacer login)
3. El backend está usando una configuración incorrecta

---

## ✅ SOLUCIÓN: Verificar Firebase Console

### Paso 1: Ir a Firebase Console
1. Ve a https://console.firebase.google.com/
2. Selecciona tu proyecto: **mumpabackend**

### Paso 2: Verificar Google Sign-In
1. En el menú lateral, ve a **Authentication**
2. Haz clic en **Sign-in method**
3. Busca **Google** en la lista de proveedores
4. Verifica que esté **Habilitado** ✅

### Paso 3: IMPORTANTE - Configurar Web Client ID
1. En la configuración de Google, verifica el **Web SDK configuration**
2. Debe aparecer el Web Client ID: 
   ```
   975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com
   ```

### Paso 4: Verificar en Google Cloud Console
1. Ve a https://console.cloud.google.com/
2. Selecciona el proyecto **mumpabackend**
3. Ve a **APIs y servicios** → **Credenciales**
4. Verifica que exista un **ID de cliente de OAuth 2.0** de tipo **Aplicación web**
5. El ID debe ser: `975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com`
6. **IMPORTANTE:** Verifica que en **Orígenes de JavaScript autorizados** NO haya restricciones que bloqueen tu dominio

---

## 🐛 DEBUG: Ver qué está recibiendo el backend

Agrega estos logs temporales en tu backend (archivo donde verificas el token):

```javascript
// En tu endpoint /api/auth/google-login
app.post('/api/auth/google-login', async (req, res) => {
  try {
    const { idToken } = req.body;
    
    console.log('🔑 Token recibido (primeros 50 chars):', idToken?.substring(0, 50));
    console.log('🔑 Longitud del token:', idToken?.length);
    
    // Antes de verificar el token, log el Web Client ID que estás usando
    console.log('🌐 Web Client ID esperado:', GOOGLE_CLIENT_ID);
    
    // Intenta verificar el token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,  // Este debe ser el mismo del frontend
    });
    
    const payload = ticket.getPayload();
    console.log('✅ Token verificado, payload:', payload);
    
    // ... resto del código
  } catch (error) {
    console.error('❌ Error verificando token:', error.message);
    console.error('❌ Error completo:', error);
    // ... manejo de error
  }
});
```

---

## 🔧 Configuración Actual (Frontend)

### Web Client ID configurado en el código:
```javascript
// src/contexts/AuthContext.tsx, línea 45
webClientId: '975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com'
```

### Archivos de configuración:
- ✅ `google-services.json` (Android) - Contiene el Web Client ID correcto
- ✅ `GoogleService-Info.plist` (iOS) - Contiene el iOS Client ID
- ✅ Código actualizado para usar `GoogleSignin.getTokens()`

---

## 📋 Checklist de Verificación:

### En Firebase Console:
- [ ] Google Sign-In está habilitado en Authentication
- [ ] Web Client ID `975014449237-9crsati0bs65e787cb5no3ntu2utmqe1` está configurado
- [ ] No hay restricciones de dominio que bloqueen la app

### En Google Cloud Console:
- [ ] El Web Client ID existe y está activo
- [ ] No tiene restricciones de IP o dominio
- [ ] El proyecto es `mumpabackend` (ID: 975014449237)

### En el Backend:
- [ ] El backend está usando el mismo Web Client ID para verificar
- [ ] Firebase Admin SDK está inicializado correctamente
- [ ] El backend tiene permisos para verificar tokens de Google

---

## 🎯 Acción Inmediata:

**Verifica en Firebase Console que el Google Sign-In esté configurado con el Web Client ID correcto.**

Si el Web Client ID NO está en Firebase Console:
1. Ve a Firebase Console > Authentication > Sign-in method
2. Haz clic en Google
3. En "Web SDK configuration", agrega el Web Client ID:
   ```
   975014449237-9crsati0bs65e787cb5no3ntu2utmqe1.apps.googleusercontent.com
   ```
4. Guarda los cambios
5. Prueba de nuevo el login

---

## 📞 Si el problema persiste:

El error puede estar en el backend. Necesitarías verificar:
1. Que el backend esté usando el Web Client ID correcto
2. Que Firebase Admin SDK esté configurado correctamente
3. Que el service account tenga permisos

**Logs útiles del backend:**
- ¿Qué Web Client ID está usando para verificar el token?
- ¿Qué error específico arroja `verifyIdToken()`?
- ¿El proyecto de Firebase coincide con el del frontend?

