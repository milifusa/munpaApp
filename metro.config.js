const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para manejar fuentes
config.resolver.assetExts.push('ttf', 'otf');

// Forzar domutils a resolverse desde node_modules raíz (evita ENOENT en css-select/node_modules/domutils)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  domutils: path.resolve(__dirname, 'node_modules/domutils'),
};

module.exports = config;
