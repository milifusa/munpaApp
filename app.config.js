require('dotenv').config();

module.exports = ({ config }) => ({
  ...config,
  name: 'Munpa',
  slug: 'munpaApp',
  version: '2.0.5',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  scheme: 'munpa',
  splash: {
    image: './assets/logo.png',
    resizeMode: 'contain',
    backgroundColor: '#887CBC'
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.munpa.app',
    buildNumber: '2.0.5',
    icon: './assets/icon.png',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSUserTrackingUsageDescription: 'Munpa utiliza esta información para mostrarte contenido relevante y mejorar tu experiencia en la comunidad de padres. Tus datos nunca se comparten con terceros para publicidad.'
    },
    googleServicesFile: './GoogleService-Info.plist',
    entitlements: {
      'aps-environment': 'production'
    },
    scheme: 'munpa',
    associatedDomains: ['munpa.online', 'www.munpa.online']
  },
  android: {
    package: 'com.munpa.app',
    permissions: [
      "com.google.android.gms.permission.AD_ID"
    ],
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#887CBC'
    },
    edgeToEdgeEnabled: true,
    icon: './assets/icon.png',
    googleServicesFile: './google-services.json',
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'munpa',
            host: 'share-child'
          },
          {
            scheme: 'munpa',
            host: 'post'
          },
          {
            scheme: 'munpa',
            host: 'recommendation'
          },
          {
            scheme: 'munpa',
            host: 'marketplace',
            pathPrefix: '/product'
          },
          {
            scheme: 'munpa',
            host: 'marketplace',
            pathPrefix: '/favorites'
          },
          {
            scheme: 'munpa',
            host: 'recommendations',
            pathPrefix: '/favorites'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      },
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/share-child'
          },
          {
            scheme: 'https',
            host: 'www.munpa.online',
            pathPrefix: '/share-child'
          },
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/post'
          },
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/recommendation'
          },
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/marketplace/product'
          },
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/marketplace/favorites'
          },
          {
            scheme: 'https',
            host: 'munpa.online',
            pathPrefix: '/recommendations/favorites'
          }
        ],
        category: ['BROWSABLE', 'DEFAULT']
      }
    ]
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
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: 'Munpa necesita acceso a tu ubicación para mostrarte recomendaciones cercanas y lugares de interés para padres cerca de ti.',
        locationAlwaysPermission: 'Munpa necesita acceso a tu ubicación para mostrarte recomendaciones cercanas.',
        locationWhenInUsePermission: 'Munpa necesita acceso a tu ubicación para mostrarte recomendaciones cercanas y lugares de interés para padres cerca de ti.',
        isAndroidBackgroundLocationEnabled: false,
        isIosBackgroundLocationEnabled: false
      }
    ],
    '@react-native-google-signin/google-signin',
    [
      'expo-maps',
      {
        // Google Maps API Key (OBLIGATORIA para Android)
        // Obtén tu API key en: https://developers.google.com/maps/documentation/android-sdk/get-api-key
        // Ver instrucciones en: COMO_OBTENER_GOOGLE_MAPS_API_KEY.md
        // 
        // Para configurar:
        // 1. Crea un archivo .env en la raíz del proyecto
        // 2. Agrega: GOOGLE_MAPS_API_KEY=tu_api_key_aqui
        // 3. O reemplaza directamente el string vacío con tu API key
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || ''
      }
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#59C6C0',
        mode: 'production',
        android: {
          useNextNotificationsApi: true,
        },
      }
    ],
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
