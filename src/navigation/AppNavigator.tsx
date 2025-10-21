import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useNavigation } from '@react-navigation/native';
import GlobalMenu from '../components/GlobalMenu';
import DouliChatOverlay from '../components/DouliChatOverlay';

// Importar pantallas
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChildrenDataScreen from '../screens/ChildrenDataScreen';
import ChildProfileScreen from '../screens/ChildProfileScreen';
import DoulaChatScreen from '../screens/DoulaChatScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import CommunityRequestsScreen from '../screens/CommunityRequestsScreen';
import CommunityPostsScreen from '../screens/CommunityPostsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CommentsScreen from '../screens/CommentsScreen';
import ListsScreen from '../screens/ListsScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import ItemCommentsScreen from '../screens/ItemCommentsScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Componente del botón de menú para usar en headers
const MenuButton = () => {
  const { openMenu } = useMenu();
  
  return (
    <TouchableOpacity
      style={styles.menuButton}
      onPress={openMenu}
    >
      <Ionicons name="menu" size={24} color="white" />
    </TouchableOpacity>
  );
};

// Componente del botón de perfil para usar en headers
const ProfileButton = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  
  return (
    <TouchableOpacity
      style={styles.profileButton}
      onPress={() => {
        // Navegar al Profile desde el stack navigator principal
        navigation.navigate('Profile');
      }}
    >
      <View style={styles.profilePlaceholder}>
        <Ionicons name="person" size={20} color="white" />
      </View>
    </TouchableOpacity>
  );
};

// Navegador para usuarios autenticados
const AuthenticatedNavigator = () => {
  const [initialRoute, setInitialRoute] = React.useState<string | null>(null);
  const { user } = useAuth();
  const userIdRef = React.useRef<string | null>(null);

  // Verificar si el usuario tiene hijos al montar el componente o cuando cambia el usuario
  React.useEffect(() => {
    const checkChildren = async () => {
      // Si es el mismo usuario, no verificar de nuevo
      if (user && userIdRef.current === user.id && initialRoute) {
        console.log('✅ Mismo usuario, usando ruta guardada:', initialRoute);
        return;
      }
      
      // Si cambió el usuario, limpiar el flag para volver a verificar
      if (user && userIdRef.current !== null && userIdRef.current !== user.id) {
        console.log('🔄 Usuario cambió, limpiando flag hasChildren');
        await AsyncStorage.removeItem('hasChildren');
      }
      
      // Actualizar el ID del usuario actual
      if (user) {
        userIdRef.current = user.id;
      }
      
      try {
        const hasChildrenStored = await AsyncStorage.getItem('hasChildren');
        console.log('🔍 Verificando si tiene hijos guardados:', hasChildrenStored);
        
        // Siempre verificar con el backend si es null o false (para asegurar que esté actualizado)
        if (hasChildrenStored === null || hasChildrenStored === 'false') {
          // Primera vez que el usuario inicia sesión, verificar perfil y luego hijos
          try {
            const authToken = await AsyncStorage.getItem('authToken');
            console.log('🔑 Token para verificar datos:', authToken ? authToken.substring(0, 20) + '...' : 'null');
            
            if (!authToken) {
              console.log('⚠️ No hay token, ir a MainTabs por defecto');
              setInitialRoute('MainTabs');
              await AsyncStorage.setItem('hasChildren', 'true');
              return;
            }
            
            // Primero verificar si el usuario tiene género configurado
            const profileResponse = await fetch('https://api.munpa.online/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            const profileData = await profileResponse.json();
            console.log('👤 Perfil del usuario:', profileData);
            
            const userGender = profileData?.data?.gender;
            
            // Si no tiene género, ir a pantalla especial para completar perfil
            if (!userGender) {
              console.log('⚠️ Usuario sin género, debe completar datos básicos primero');
              // Marcar que necesita completar perfil
              await AsyncStorage.setItem('needsProfileCompletion', 'true');
              setInitialRoute('Signup'); // Irá a SignupScreen en modo "completar perfil"
              return;
            }
            
            // Si tiene género, verificar hijos
            const response = await fetch('https://api.munpa.online/api/auth/children', {
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('📡 Response status:', response.status);
            const data = await response.json();
            console.log('📦 Response completa del backend:', JSON.stringify(data, null, 2));
            
            // Intentar diferentes formatos de respuesta del backend
            let childrenCount = 0;
            if (Array.isArray(data)) {
              childrenCount = data.length;
            } else if (data?.children && Array.isArray(data.children)) {
              childrenCount = data.children.length;
            } else if (data?.data?.children && Array.isArray(data.data.children)) {
              childrenCount = data.data.children.length;
            } else if (data?.data && Array.isArray(data.data)) {
              childrenCount = data.data.length;
            }
            
            console.log('📊 Hijos encontrados en backend:', childrenCount);
            
            const hasKids = childrenCount > 0;
            await AsyncStorage.setItem('hasChildren', hasKids ? 'true' : 'false');
            setInitialRoute(hasKids ? 'MainTabs' : 'ChildrenData');
          } catch (error) {
            console.error('❌ Error verificando datos:', error);
            // En caso de error, ir a MainTabs para que el usuario pueda navegar manualmente
            setInitialRoute('MainTabs');
            await AsyncStorage.setItem('hasChildren', 'true');
          }
        } else {
          // Si ya existe el flag, usarlo
          const hasKids = hasChildrenStored === 'true';
          setInitialRoute(hasKids ? 'MainTabs' : 'ChildrenData');
          console.log(`✅ Usuario ${hasKids ? 'tiene' : 'no tiene'} hijos → ${hasKids ? 'MainTabs' : 'ChildrenData'}`);
        }
      } catch (error) {
        console.error('❌ Error en checkChildren:', error);
        setInitialRoute('MainTabs');
        await AsyncStorage.setItem('hasChildren', 'true');
      }
    };

    if (user) {
      checkChildren();
    } else {
      // Si no hay usuario (logout), resetear inmediatamente
      console.log('🚪 Usuario hizo logout, reseteando estado');
      userIdRef.current = null;
      setInitialRoute(null);
    }
  }, [user]);

  // Mostrar indicador de carga mientras verifica
  if (!initialRoute) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#B4C14B" />
      </View>
    );
  }

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
        headerLeft: () => <MenuButton />,
      }}
      initialRouteName={initialRoute}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabNavigator}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Signup"
        component={SignupScreen}
        options={{
          title: 'Completa tu perfil',
          headerShown: true,
          headerLeft: () => null, // Evitar que puedan volver atrás
        }}
      />
      <Stack.Screen
        name="ChildrenData"
        component={ChildrenDataScreen}
        options={{
          title: 'Datos de hijos',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ChildProfile"
        component={ChildProfileScreen}
        options={{
          title: 'Perfil del hijo',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Mi Perfil',
          headerShown: true,
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Home con sus sub-pantallas
const HomeStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#59C6C0',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => <MenuButton />,
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: 'Inicio',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="CommunityPosts"
        component={CommunityPostsScreen}
        options={{
          title: 'Posts de la Comunidad',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Crear Post',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comentarios',
          headerShown: false, // Usamos header personalizado
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Communities con sus sub-pantallas
const CommunitiesStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#59C6C0',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => <MenuButton />,
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="CommunitiesMain"
        component={CommunitiesScreen}
        options={{
          title: 'Comunidades',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="CommunityRequests"
        component={CommunityRequestsScreen}
        options={{
          title: 'Solicitudes Pendientes',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="CommunityPosts"
        component={CommunityPostsScreen}
        options={{
          title: 'Posts de la Comunidad',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          title: 'Crear Post',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="Comments"
        component={CommentsScreen}
        options={{
          title: 'Comentarios',
          headerShown: false, // Usamos header personalizado
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Lists con sus sub-pantallas
const ListsStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#59C6C0',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => <MenuButton />,
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="ListsMain"
        component={ListsScreen}
        options={{
          title: 'Listas',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="ListDetail"
        component={ListDetailScreen}
        options={{
          title: 'Detalle de Lista',
          headerShown: false, // Usamos header personalizado
        }}
      />
      <Stack.Screen
        name="ItemComments"
        component={ItemCommentsScreen}
        options={{
          title: 'Comentarios del Item',
          headerShown: false, // Usamos header personalizado
        }}
      />
    </Stack.Navigator>
  );
};

// Navegador de tabs principal
const MainTabNavigator = () => {
  const { user } = useAuth();
  
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#887CBC',
            borderTopWidth: 0,
            paddingTop: Platform.OS === 'ios' ? 8 : 12,
            paddingBottom: Platform.OS === 'ios' ? 30 : 22,
            height: Platform.OS === 'ios' ? 95 : 105,
          },
          headerShown: false, // Los headers los manejan los Stack Navigators anidados
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: 'white',
          tabBarLabelStyle: {
            fontSize: Platform.OS === 'ios' ? 10 : 11,
            fontWeight: '500',
            marginTop: Platform.OS === 'ios' ? -3 : -2,
            marginBottom: 0,
          },
        }}
      >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Hijos',
          tabBarIcon: ({ color, size, focused }) => (
            <Image 
              source={require('../../assets/inicio.png')} 
              style={{ 
                width: 55, 
                height: 55,
              }} 
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Communities"
        component={CommunitiesStackNavigator}
        options={{
          tabBarLabel: 'Comunidades',
          tabBarIcon: ({ color, size, focused }) => (
            <Image 
              source={require('../../assets/comunidades.png')} 
              style={{ 
                width: 55, 
                height: 55,
              }} 
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Doula"
        component={DoulaChatScreen}
        options={{
          tabBarLabel: () => null,
          headerShown: true,
          headerTitle: 'DOULI',
          headerStyle: {
            backgroundColor: '#59C6C0',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => <MenuButton />,
          headerRight: () => <ProfileButton />,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.doulaIconContainer,
              focused && styles.doulaIconActive
            ]}>
              <Image 
                source={require('../../assets/douli.png')} 
                style={styles.doulaIconImage} 
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Lists"
        component={ListsStackNavigator}
        options={{
          tabBarLabel: 'Listas',
          tabBarIcon: ({ color, size, focused }) => (
            <Image 
              source={require('../../assets/listas.png')} 
              style={{ 
                width: 55, 
                height: 55,
              }} 
              resizeMode="contain"
            />
          ),
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Resetear el stack al presionar el tab
            navigation.reset({
              index: 0,
              routes: [{ name: 'Lists', state: { routes: [{ name: 'ListsMain' }] } }],
            });
          },
        })}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          tabBarLabel: 'Recomendaciones',
          headerShown: true,
          headerTitle: 'Recomendaciones',
          headerStyle: {
            backgroundColor: '#59C6C0',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerLeft: () => <MenuButton />,
          headerRight: () => <ProfileButton />,
          tabBarIcon: ({ color, size, focused }) => (
            <Image 
              source={require('../../assets/recomendaciones.png')} 
              style={{ 
                width: 55, 
                height: 55,
              }} 
              resizeMode="contain"
            />
          ),
        }}
      />
      </Tab.Navigator>
      
      {/* Chat flotante de DOULI sobre el tab bar */}
      <DouliChatOverlay />
    </View>
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

// Navegador principal con menú global
const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isMenuOpen, closeMenu } = useMenu();

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
      
      {/* Menú Global */}
      <GlobalMenu visible={isMenuOpen} onClose={closeMenu} />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#887CBC',
  },
  menuButton: {
    padding: 8,
    marginLeft: 8,
  },
  doulaIconContainer: {
    backgroundColor: '#887CBC',
    borderRadius: 50,
    padding: 0,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    elevation: 12,
    overflow: 'hidden',
    position: 'relative',
    top: -10,
  },
  doulaIconActive: {
    backgroundColor: '#887CBC',
    transform: [{ scale: 1.05 }],
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  doulaIconImage: {
    width: 90,
    height: 90,
    resizeMode: 'cover',
    borderRadius: 0,
  },
  profileButton: {
    padding: 8,
    marginRight: 8,
  },
  profileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'white',
  },
  profilePlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
});

export default AppNavigator;
