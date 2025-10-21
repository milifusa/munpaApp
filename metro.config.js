const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Configuración para manejar fuentes
config.resolver.assetExts.push('ttf', 'otf');

module.exports = config;
