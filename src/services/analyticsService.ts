import analytics from '@react-native-firebase/analytics';
import { ensureFirebaseApp } from './firebaseApp';

const analyticsService = {
  setEnabled: async (enabled: boolean) => {
    try {
      ensureFirebaseApp();
      await analytics().setAnalyticsCollectionEnabled(enabled);
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error setEnabled:', error);
    }
  },

  logScreenView: async (screenName: string, screenClass?: string) => {
    try {
      ensureFirebaseApp();
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error logScreenView:', error);
    }
  },

  logEvent: async (name: string, params?: Record<string, any>) => {
    try {
      ensureFirebaseApp();
      await analytics().logEvent(name, params);
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error logEvent:', error);
    }
  },

  setUser: async (userId: string | null, properties?: Record<string, any>) => {
    try {
      ensureFirebaseApp();
      await analytics().setUserId(userId);
      if (properties) {
        await analytics().setUserProperties(properties);
      }
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error setUser:', error);
    }
  },
};

export default analyticsService;
