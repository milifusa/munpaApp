import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, AppState, ErrorUtils, View, Text, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { MenuProvider } from './src/contexts/MenuContext';
import { ChatProvider } from './src/contexts/ChatContext';
import AppNavigator from './src/navigation/AppNavigator';
import { trackingService } from './src/services/trackingService';
import sentryService from './src/services/sentryService';
import { ensureFirebaseApp } from './src/services/firebaseApp';
import analyticsService from './src/services/analyticsService';

// Evita error de tipado en RN 0.81+
(Text as any).defaultProps = {
  allowFontScaling: false,
};

// Evita error de tipado en RN 0.81+
(TextInput as any).defaultProps = {
  allowFontScaling: false,
};

export default function App() {
  useEffect(() => {
    console.log('🚀 [APP] Iniciando aplicación...');

    // Inicializar Sentry para monitoreo de errores
    sentryService.initialize().catch((error) => {
      console.error('❌ [APP] Error inicializando Sentry:', error);
    });

    // Inicializar Firebase + Analytics
    try {
      ensureFirebaseApp();
      analyticsService.setEnabled(true);
    } catch (error) {
      console.warn('⚠️ [APP] Error inicializando Firebase:', error);
    }

    // Configurar handler global de errores
    if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
      try {
        const originalHandler = ErrorUtils.getGlobalHandler();
        ErrorUtils.setGlobalHandler((error, isFatal) => {
          console.error('❌ [APP] Error global capturado:', error);
          console.error('❌ [APP] Es fatal:', isFatal);
          
          // Capturar en Sentry
          sentryService.captureException(error, {
            isFatal,
            timestamp: new Date().toISOString(),
          });
          
          // Llamar al handler original
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      } catch (error) {
        console.warn('⚠️ [APP] No se pudo configurar handler global de errores:', error);
      }
    } else {
      console.warn('⚠️ [APP] ErrorUtils.getGlobalHandler no está disponible');
    }

    // Solicitar permiso de tracking cuando la app se vuelve activa
    // NOTA: Requiere NSUserTrackingUsageDescription en Info.plist (ya agregado en app.json)
    // Necesita rebuild para que funcione: npx expo prebuild --clean && npx expo run:ios
    const requestTracking = async () => {
      // Solo en iOS
      if (Platform.OS !== 'ios') {
        console.log('⚠️ [APP] ATT solo aplica en iOS, saltando...');
        return;
      }

      try {
        // Esperar 2 segundos para que la app y el sistema estén completamente listos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const status = await trackingService.requestTrackingPermission();
        console.log('✅ [APP] Estado de tracking:', status);
        
      } catch (error: any) {
        // Si hay error, solo logear pero NO crashear la app
        console.warn('⚠️ [APP] No se pudo solicitar tracking (probablemente falta rebuild):', error?.message);
        // La app continúa funcionando sin tracking
      }
    };

    // Variable para controlar si ya se solicitó
    let hasRequested = false;

    // Solicitar al montar la app (solo una vez)
    if (!hasRequested && Platform.OS === 'ios') {
      hasRequested = true;
      requestTracking();
    }

    // También solicitar cuando la app vuelve del background (pero solo la primera vez)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !hasRequested && Platform.OS === 'ios') {
        hasRequested = true;
        requestTracking();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  console.log('🎨 [APP] Renderizando componentes...')
  
  try {
    return (
      <AuthProvider>
        <MenuProvider>
          <ChatProvider>
            <StatusBar style="light" backgroundColor="#887CBC" />
            <AppNavigator />
          </ChatProvider>
        </MenuProvider>
      </AuthProvider>
    );
  } catch (error: any) {
    console.error('❌ [APP] Error en render:', error);
    console.error('❌ [APP] Error stack:', error?.stack);
    // Retornar un componente de error simple
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Error al cargar la aplicación</Text>
        <Text>{error?.message || 'Error desconocido'}</Text>
      </View>
    );
  }
}
