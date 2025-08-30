import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Importar pantallas
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChildrenDataScreen from '../screens/ChildrenDataScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegador para usuarios autenticados
const AuthenticatedNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#887CBC',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ChildrenData"
        component={ChildrenDataScreen}
        options={{
          title: 'Datos de hijos',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Navegador de tabs principal
const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#887CBC',
          borderTopWidth: 0,
          paddingTop: 5,
          height: 60,
        },
        headerStyle: {
          backgroundColor: '#887CBC',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          tabBarLabel: 'Inicio',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Perfil',
          tabBarLabel: 'Perfil',
        }}
      />
    </Tab.Navigator>
  );
};

// Navegador para usuarios no autenticados
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#887CBC',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: 'Iniciar Sesión',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: 'Crear Cuenta',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: 'Olvidé mi contraseña',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: 'Restablecer contraseña',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ChildrenData"
        component={ChildrenDataScreen}
        options={{
          title: 'Datos de hijos',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

// Pantalla de carga
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#B4C14B" />
  </View>
);

// Navegador principal
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      theme={{
        dark: false,
        colors: {
          background: '#887CBC',
          primary: '#B4C14B',
          card: '#887CBC',
          text: '#FFFFFF',
          border: '#A99DD9',
          notification: '#B4C14B',
        },
        fonts: {
          regular: {
            fontFamily: 'Montserrat',
            fontWeight: 'normal',
          },
          medium: {
            fontFamily: 'Montserrat',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'Montserrat',
            fontWeight: 'bold',
          },
          heavy: {
            fontFamily: 'Montserrat',
            fontWeight: 'bold',
          },
        },
      }}
    >
      {isAuthenticated ? <AuthenticatedNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#887CBC', // Fondo púrpura consistente
  },
});

export default AppNavigator;
