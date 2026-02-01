import { getAnalytics, logEvent as firebaseLogEvent, setAnalyticsCollectionEnabled, logScreenView as firebaseLogScreenView, setUserId, setUserProperties } from '@react-native-firebase/analytics';
import { ensureFirebaseApp } from './firebaseApp';

const analyticsService = {
  setEnabled: async (enabled: boolean) => {
    try {
      const app = ensureFirebaseApp();
      const analytics = getAnalytics(app);
      await setAnalyticsCollectionEnabled(analytics, enabled);
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error setEnabled:', error);
    }
  },

  logScreenView: async (screenName: string, screenClass?: string) => {
    try {
      const app = ensureFirebaseApp();
      const analytics = getAnalytics(app);
      await firebaseLogScreenView(analytics, {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error logScreenView:', error);
    }
  },

  logEvent: async (name: string, params?: Record<string, any>) => {
    try {
      const app = ensureFirebaseApp();
      const analytics = getAnalytics(app);
      await firebaseLogEvent(analytics, name, params);
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error logEvent:', error);
    }
  },

  setUser: async (userId: string | null, properties?: Record<string, any>) => {
    try {
      const app = ensureFirebaseApp();
      const analytics = getAnalytics(app);
      await setUserId(analytics, userId);
      if (properties) {
        await setUserProperties(analytics, properties);
      }
    } catch (error) {
      console.warn('⚠️ [ANALYTICS] Error setUser:', error);
    }
  },
};

export default analyticsService;
