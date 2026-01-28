import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from '@react-native-firebase/app';

type FirebaseConfig = {
  apiKey: string;
  appId: string;
  projectId: string;
  messagingSenderId: string;
  storageBucket?: string;
  databaseURL?: string;
};

const androidConfig: FirebaseConfig = {
  apiKey: 'AIzaSyDDX0_GPvfxwnmC4H0Rs1cUEyz44IAY1S4',
  appId: '1:975014449237:android:46c06caf478b53489dc4dc',
  projectId: 'mumpabackend',
  messagingSenderId: '975014449237',
  storageBucket: 'mumpabackend.firebasestorage.app',
  databaseURL: 'https://mumpabackend.firebaseio.com',
};

const iosConfig: FirebaseConfig = {
  apiKey: 'AIzaSyDOR0D2ZvAjwYvAjwgYZ5HGGyxo8zLZzF0',
  appId: '1:975014449237:ios:2d54adfc178e18629dc4dc',
  projectId: 'mumpabackend',
  messagingSenderId: '975014449237',
  storageBucket: 'mumpabackend.firebasestorage.app',
  databaseURL: 'https://mumpabackend.firebaseio.com',
};

export const ensureFirebaseApp = () => {
  if (getApps().length > 0) {
    return getApp();
  }

  const config = Platform.OS === 'ios' ? iosConfig : androidConfig;
  return initializeApp(config);
};
