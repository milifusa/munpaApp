module.exports = ({ config }) => ({
  ...config,
  name: 'Munpa',
  slug: 'munpaApp',
  version: '0.0.2',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#887CBC'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.munpa.app',
    icon: './assets/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false
    },
    googleServicesFile: './GoogleService-Info.plist'
  },
  android: {
    package: 'com.munpa.app',
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#887CBC'
    },
    edgeToEdgeEnabled: true,
    icon: './assets/icon.png',
    googleServicesFile: './google-services.json'
  },
  web: {
    favicon: './assets/favicon.png',
    name: 'Munpa - Tu compañera de maternidad',
    shortName: 'Munpa'
  },
  plugins: [
    'expo-font',
    [
      'expo-image-picker',
      {
        photosPermission: 'La aplicación necesita acceso a tus fotos para seleccionar imágenes de comunidades.',
        cameraPermission: 'La aplicación necesita acceso a tu cámara para tomar fotos de comunidades.'
      }
    ],
    '@react-native-google-signin/google-signin'
  ],
  fonts: [
    {
      asset: './assets/Montserrat/static/Montserrat-Regular.ttf',
      family: 'Montserrat'
    },
    {
      asset: './assets/Montserrat/static/Montserrat-Bold.ttf',
      family: 'Montserrat-Bold'
    },
    {
      asset: './assets/Montserrat/static/Montserrat-Medium.ttf',
      family: 'Montserrat-Medium'
    },
    {
      asset: './assets/Montserrat/static/Montserrat-SemiBold.ttf',
      family: 'Montserrat-SemiBold'
    },
    {
      asset: './assets/IndieFlower.ttf',
      family: 'Indie Flower',
      weight: '400'
    },
    {
      asset: './assets/Hug Me Tight - TTF.ttf',
      family: 'HugMeTight',
      weight: '400'
    }
  ],
  extra: {
    eas: {
      projectId: '07ff9291-f151-4077-94b9-a744a255bf24'
    }
  },
  owner: 'milifusa16'
});
