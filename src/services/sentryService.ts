import * as Sentry from '@sentry/react-native';

// Configuración de Sentry
const SENTRY_DSN = 'https://27eddef66b953d4007e86249d859cb49@o4510364517072896.ingest.us.sentry.io/4510364531556352';

let isInitialized = false;

export const sentryService = {
  /**
   * Inicializar Sentry
   * Debes obtener tu DSN desde https://sentry.io
   */
  initialize: async (dsn?: string) => {
    if (isInitialized) {
      console.log('⚠️ [SENTRY] Ya está inicializado');
      return;
    }

    try {
      const sentryDsn = dsn || SENTRY_DSN;
      
      // Solo inicializar si el DSN es válido
      if (!sentryDsn || sentryDsn.includes('YOUR_DSN_HERE')) {
        console.warn('⚠️ [SENTRY] DSN no configurado. Configura tu DSN en src/services/sentryService.ts');
        return;
      }

      Sentry.init({
        dsn: sentryDsn,
        debug: __DEV__, // Activar modo debug en desarrollo
        environment: __DEV__ ? 'development' : 'production',
        enableAutoSessionTracking: true,
        sessionTrackingIntervalMillis: 30000, // 30 segundos
        // Configuración adicional
        beforeSend(event, hint) {
          // Filtrar errores en desarrollo si es necesario
          if (__DEV__) {
            console.log('📊 [SENTRY] Evento capturado:', event);
          }
          return event;
        },
        // Ignorar ciertos errores si es necesario
        ignoreErrors: [
          'Network request failed',
          'NetworkError',
          'AbortError',
        ],
      });

      isInitialized = true;
    } catch (error) {
      console.error('❌ [SENTRY] Error inicializando Sentry:', error);
    }
  },

  /**
   * Capturar una excepción manualmente
   */
  captureException: (error: Error, context?: Record<string, any>) => {
    if (!isInitialized) {
      console.warn('⚠️ [SENTRY] No está inicializado, no se puede capturar error');
      return;
    }

    try {
      if (context) {
        Sentry.setContext('error_context', context);
      }
      Sentry.captureException(error);
      console.log('📊 [SENTRY] Excepción capturada:', error.message);
    } catch (err) {
      console.error('❌ [SENTRY] Error capturando excepción:', err);
    }
  },

  /**
   * Capturar un mensaje
   */
  captureMessage: (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
    if (!isInitialized) {
      console.warn('⚠️ [SENTRY] No está inicializado, no se puede capturar mensaje');
      return;
    }

    try {
      Sentry.captureMessage(message, level);
      console.log(`📊 [SENTRY] Mensaje capturado (${level}):`, message);
    } catch (error) {
      console.error('❌ [SENTRY] Error capturando mensaje:', error);
    }
  },

  /**
   * Agregar contexto adicional al usuario
   */
  setUser: (user: { id: string; email?: string; username?: string; [key: string]: any }) => {
    if (!isInitialized) return;

    try {
      Sentry.setUser(user);
      console.log('👤 [SENTRY] Usuario configurado:', user.id);
    } catch (error) {
      console.error('❌ [SENTRY] Error configurando usuario:', error);
    }
  },

  /**
   * Limpiar información del usuario (logout)
   */
  clearUser: () => {
    if (!isInitialized) return;

    try {
      Sentry.setUser(null);
      console.log('👤 [SENTRY] Usuario limpiado');
    } catch (error) {
      console.error('❌ [SENTRY] Error limpiando usuario:', error);
    }
  },

  /**
   * Agregar contexto adicional
   */
  setContext: (key: string, context: Record<string, any>) => {
    if (!isInitialized) return;

    try {
      Sentry.setContext(key, context);
    } catch (error) {
      console.error('❌ [SENTRY] Error configurando contexto:', error);
    }
  },

  /**
   * Agregar breadcrumb (rastro de navegación)
   */
  addBreadcrumb: (breadcrumb: {
    message?: string;
    category?: string;
    level?: 'info' | 'warning' | 'error';
    data?: Record<string, any>;
  }) => {
    if (!isInitialized) return;

    try {
      Sentry.addBreadcrumb(breadcrumb);
    } catch (error) {
      console.error('❌ [SENTRY] Error agregando breadcrumb:', error);
    }
  },
};

export default sentryService;

