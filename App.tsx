import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, AppState, ErrorUtils, View, Text, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { MenuProvider } from './src/contexts/MenuContext';
import { ChatProvider } from './src/contexts/ChatContext';
import AppNavigator from './src/navigation/AppNavigator';
import { trackingService } from './src/services/trackingService';
import sentryService from './src/services/sentryService';
import { ensureFirebaseApp } from './src/services/firebaseApp';
import analyticsService from './src/services/analyticsService';
import { useVersionCheck } from './src/hooks/useVersionCheck';
import UpdateRequiredScreen from './src/screens/UpdateRequiredScreen';
import { colors } from './src/styles/globalStyles';

// Evita error de tipado en RN 0.81+
(Text as any).defaultProps = {
  allowFontScaling: false,
};

// Evita error de tipado en RN 0.81+
(TextInput as any).defaultProps = {
  allowFontScaling: false,
};

// Componente interno que usa el hook
function AppContent() {
  const versionCheck = useVersionCheck();

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
        console.warn('⚠️ [APP] No se pudo solicitar tracking:', error?.message);
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

  // Mostrar loading mientras verifica la versión
  if (versionCheck.loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>Verificando versión...</Text>
      </View>
    );
  }

  // Mostrar pantalla de actualización si es necesario
  if (versionCheck.forceUpdate) {
    return (
      <UpdateRequiredScreen
        currentVersion={versionCheck.currentVersion}
        latestVersion={versionCheck.latestVersion || versionCheck.minVersion || 'N/A'}
        message={versionCheck.message || undefined}
      />
    );
  }

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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Error al cargar la aplicación</Text>
        <Text>{error?.message || 'Error desconocido'}</Text>
      </View>
    );
  }
}

export default function App() {
  return <AppContent />;
}
