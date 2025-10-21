#!/bin/bash
set -e

echo "🔧 Ejecutando hook pre-build para incrementar build number..."

# Crear script temporal de Node.js
cat > /tmp/increment-build.js << 'EOF'
const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(process.cwd(), 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// Obtener valores actuales
const currentBuildNumber = appJson.expo.ios.buildNumber;
const currentVersionCode = appJson.expo.android.versionCode;

// Incrementar
const [major, minor, patch] = currentBuildNumber.split('.').map(Number);
const newBuildNumber = `${major}.${minor}.${patch + 1}`;
const newVersionCode = currentVersionCode + 1;

// Actualizar
appJson.expo.ios.buildNumber = newBuildNumber;
appJson.expo.android.versionCode = newVersionCode;

// Guardar
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');

console.log(`✅ Build incrementado: iOS ${newBuildNumber}, Android ${newVersionCode}`);
EOF

# Ejecutar el script
node /tmp/increment-build.js

# Limpiar
rm /tmp/increment-build.js

echo "✅ Hook pre-build completado"

