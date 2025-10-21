import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/contexts/AuthContext';
import { MenuProvider } from './src/contexts/MenuContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <AuthProvider>
      <MenuProvider>
        <StatusBar style="light" backgroundColor="#887CBC" />
        <AppNavigator />
      </MenuProvider>
    </AuthProvider>
  );
}
