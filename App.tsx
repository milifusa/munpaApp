import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { Platform, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { MenuProvider } from './src/contexts/MenuContext';
import { ChatProvider } from './src/contexts/ChatContext';
import AppNavigator from './src/navigation/AppNavigator';
import { trackingService } from './src/services/trackingService';

export default function App() {
  useEffect(() => {
    // Solicitar permiso de tracking cuando la app se vuelve activa
    const requestTracking = async () => {
      // Solo en iOS
      if (Platform.OS !== 'ios') {
        console.log('⚠️ [APP] ATT solo aplica en iOS, saltando...');
        return;
      }

      try {
        console.log('🔒 [APP] Preparando solicitud de tracking...');
        
        // Esperar 2 segundos para que la app y el sistema estén completamente listos
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🔒 [APP] Solicitando permiso de tracking...');
        const status = await trackingService.requestTrackingPermission();
        
        console.log('📊 [APP] Estado de tracking:', status);
        console.log('📝 [APP] Descripción:', trackingService.getStatusDescription(status));
      } catch (error: any) {
        console.error('❌ [APP] Error solicitando tracking:', error);
        console.error('❌ [APP] Error detallado:', {
          message: error?.message,
          code: error?.code,
          name: error?.name
        });
        // No hacer nada más, la app debe funcionar sin tracking
      }
    };

    // Variable para controlar si ya se solicitó
    let hasRequested = false;

    // Solicitar al montar la app (solo una vez)
    if (!hasRequested) {
      hasRequested = true;
      requestTracking();
    }

    // También solicitar cuando la app vuelve del background (pero solo la primera vez)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !hasRequested) {
        hasRequested = true;
        requestTracking();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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
}
