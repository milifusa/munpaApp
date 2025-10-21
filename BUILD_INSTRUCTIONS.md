# 📦 Instrucciones para Build de Munpa

## 🚀 Builds con Auto-Incremento Automático

EAS está configurado para **auto-incrementar automáticamente** el build number cada vez que haces un build. ¡No necesitas hacer nada manual!

### Comandos de Build:

```bash
# Build para iOS (auto-incrementa automáticamente)
npm run build:ios

# Build para Android (auto-incrementa automáticamente)
npm run build:android

# Build para ambas plataformas (auto-incrementa automáticamente)
npm run build:all
```

O directamente con EAS:

```bash
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform all --profile production
```

## 🔧 Cómo Funciona

EAS usa **versiones remotas** configuradas con:
- `"appVersionSource": "remote"` - Versiones manejadas por EAS
- `"autoIncrement": true` - Auto-incremento automático

Esto significa que:
1. ✅ EAS mantiene el registro del último build number usado
2. ✅ Cada build incrementa automáticamente
3. ✅ No necesitas scripts manuales
4. ✅ Nunca tendrás builds duplicados

## 🔢 Numeración

- **App Version**: `1.0.0` (cambiar en app.json cuando sea una release mayor)
- **iOS buildNumber**: EAS lo incrementa automáticamente (1 → 2 → 3...)
- **Android versionCode**: EAS lo incrementa automáticamente (1 → 2 → 3...)

## 📊 Ver Historial de Builds

```bash
# Ver todos tus builds
eas build:list

# Ver detalles de un build específico
eas build:view [BUILD_ID]
```

## 🎯 Ejemplo de Workflow

```bash
# 1. Hacer cambios en el código
git add .
git commit -m "feat: nueva funcionalidad"
git push

# 2. Build para producción (EAS incrementa automáticamente)
npm run build:ios

# EAS mostrará algo como:
# ✔ Initialized buildNumber with 1.0.7.
# ✔ Using remote iOS credentials (Expo server)
# ⚙️  Building...
```

## ⚠️ Importante

- **Primera vez**: EAS inicializará el build number con el valor de tu `app.json`
- **Siguientes builds**: EAS auto-incrementa basándose en el último build remoto
- **No edites manualmente** los build numbers en `app.json` después del primer build
- **Versión de App**: Solo cambia `version` en `app.json` cuando hagas una release mayor (1.0.0 → 2.0.0)

## 📝 Notas

- Los builds y versiones se guardan en los servidores de EAS
- Puedes ver el historial completo en https://expo.dev/
- El auto-incremento funciona por plataforma (iOS y Android tienen contadores independientes)
- Si necesitas resetear los números, contacta a Expo Support o crea un nuevo proyecto

