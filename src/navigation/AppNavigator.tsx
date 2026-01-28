import React, { useEffect, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, ActivityIndicator, StyleSheet, TouchableOpacity, Platform, Image, Linking, Text, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useNavigation } from '@react-navigation/native';
import GlobalMenu from '../components/GlobalMenu';
import DouliChatOverlay from '../components/DouliChatOverlay';
import { useDeepLinking, setNavigationRef } from '../hooks/useDeepLinking';
import { axiosInstance as api } from '../services/api';
import analyticsService from '../services/analyticsService';

// Importar pantallas
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import ChildrenDataScreen from '../screens/ChildrenDataScreen';
import ChildProfileScreen from '../screens/ChildProfileScreen';
import ShareChildScreen from '../screens/ShareChildScreen';
import ChildInvitationsScreen from '../screens/ChildInvitationsScreen';
import AcceptInvitationScreen from '../screens/AcceptInvitationScreen';
import DoulaChatScreen from '../screens/DoulaChatScreen';
import MunpaMarketScreen from '../screens/MunpaMarketScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CreateProductScreen from '../screens/CreateProductScreen';
import MyProductsScreen from '../screens/MyProductsScreen';
import MarketplaceFavoritesScreen from '../screens/MarketplaceFavoritesScreen';
import MarketplaceMessagesScreen from '../screens/MarketplaceMessagesScreen';
import ProductConversationsScreen from '../screens/ProductConversationsScreen';
import CommunitiesScreen from '../screens/CommunitiesScreen';
import CommunityRequestsScreen from '../screens/CommunityRequestsScreen';
import CommunityPostsScreen from '../screens/CommunityPostsScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CommentsScreen from '../screens/CommentsScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import ListsScreen from '../screens/ListsScreen';
import ListDetailScreen from '../screens/ListDetailScreen';
import ItemCommentsScreen from '../screens/ItemCommentsScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import CategoryRecommendationsScreen from '../screens/CategoryRecommendationsScreen';
import RecommendationDetailScreen from '../screens/RecommendationDetailScreen';
import AddRecommendationScreen from '../screens/AddRecommendationScreen';
import FavoritesScreen from '../screens/FavoritesScreen';
import FavoritesMapScreen from '../screens/FavoritesMapScreen';
import WishlistScreen from '../screens/WishlistScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SleepTrackerScreen from '../screens/SleepTrackerScreen';
import EditSleepEventScreen from '../screens/EditSleepEventScreen';
import ChildrenListScreen from '../screens/ChildrenListScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Componente del botón de perfil (ahora abre el menú)
const ProfileButton = () => {
  const { user } = useAuth();
  const { openMenu } = useMenu();
  const navigation = useNavigation<any>();
  const [unreadCount, setUnreadCount] = React.useState(0);

  useEffect(() => {
    let mounted = true;

    const loadUnread = async () => {
      try {
        const response = await api.get('/api/notifications');
        if (!mounted) return;
        if (response.data?.success) {
          const notifs = response.data.data || response.data.notifications || [];
          const unread = Array.isArray(notifs)
            ? notifs.filter((n: any) => !n.read).length
            : 0;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
        }
      } catch (error) {
        if (mounted) setUnreadCount(0);
      }
    };

    loadUnread();
    const interval = setInterval(loadUnread, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);
  
  return (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={() => navigation.navigate('Notifications')}
      >
        <Ionicons name="notifications-outline" size={20} color="white" />
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profileButton}
        onPress={openMenu}
      >
        {user?.photoURL ? (
          <Image
            source={{ uri: user.photoURL }}
            style={styles.profileImage}
          />
        ) : (
          <View style={styles.profilePlaceholder}>
            <Ionicons name="person" size={20} color="white" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// Componente para mostrar las caritas de los hijos en el header
const ChildrenHeaderTitle = () => {
  const [children, setChildren] = React.useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [showSelector, setShowSelector] = React.useState(false);
  const navigation = useNavigation<any>();

  React.useEffect(() => {
    const loadChildren = async () => {
      try {
        const authToken = await AsyncStorage.getItem('authToken');
        if (!authToken) return;

        const response = await fetch('https://api.munpa.online/api/auth/children', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        let childrenData = [];
        if (Array.isArray(data)) {
          childrenData = data;
        } else if (data?.children && Array.isArray(data.children)) {
          childrenData = data.children;
        } else if (data?.data?.children && Array.isArray(data.data.children)) {
          childrenData = data.data.children;
        } else if (data?.data && Array.isArray(data.data)) {
          childrenData = data.data;
        }
        
        // Filtrar hijos válidos
        const validChildren = childrenData.filter((c: any) => c && c.id && c.name);
        setChildren(validChildren);
        
        // Cargar el hijo seleccionado guardado o seleccionar el primero
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        if (savedChildId && validChildren.find((c: any) => c.id === savedChildId)) {
          setSelectedChildId(savedChildId);
        } else if (validChildren.length > 0 && validChildren[0].id) {
          setSelectedChildId(validChildren[0].id);
          await AsyncStorage.setItem('selectedChildId', validChildren[0].id);
        }
      } catch (error) {
        console.error('Error cargando hijos para header:', error);
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, []);

  const handleSelectChild = async (child: any) => {
    setSelectedChildId(child.id);
    await AsyncStorage.setItem('selectedChildId', child.id);
    setShowSelector(false);
    
    // Notificar al HomeScreen sobre el cambio
    navigation.setParams({ selectedChildId: child.id, refresh: Date.now() });
  };

  const handleAddChild = () => {
    setShowSelector(false);
    navigation.navigate('ChildrenData', {
      childrenCount: 1,
      gender: 'F',
    });
  };

  if (loading) {
    return null;
  }

  // Filtrar hijos válidos antes de renderizar
  const validChildren = Array.isArray(children) 
    ? children.filter(child => child && child.id && child.name)
    : [];

  const selectedChild = validChildren.find((child) => child.id === selectedChildId) || validChildren[0];

  return (
    <>
      <TouchableOpacity
        style={styles.childHeaderPill}
        onPress={() => setShowSelector(true)}
        activeOpacity={0.8}
      >
        {selectedChild?.photoUrl ? (
          <Image source={{ uri: selectedChild.photoUrl }} style={styles.childHeaderPillAvatar} />
        ) : (
          <View style={styles.childHeaderPillPlaceholder}>
            <Text style={styles.childHeaderEmoji}>{selectedChild?.isUnborn ? '🤰' : '👶'}</Text>
          </View>
        )}
        <Text style={styles.childHeaderPillName} numberOfLines={1}>
          {selectedChild?.name || 'Tu bebé'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#4A5568" />
      </TouchableOpacity>

      <Modal
        visible={showSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelector(false)}
      >
        <TouchableOpacity
          style={styles.childHeaderModalOverlay}
          activeOpacity={1}
          onPressOut={() => setShowSelector(false)}
        >
          <TouchableOpacity
            style={styles.childHeaderModalCard}
            activeOpacity={1}
          >
            <Text style={styles.childHeaderModalTitle}>Selecciona a tu bebé</Text>
            <ScrollView style={styles.childHeaderModalList} showsVerticalScrollIndicator={false}>
              {validChildren.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={styles.childHeaderModalItem}
                  onPress={() => handleSelectChild(child)}
                >
                  {child.photoUrl ? (
                    <Image source={{ uri: child.photoUrl }} style={styles.childHeaderModalAvatar} />
                  ) : (
                    <View style={styles.childHeaderModalAvatar}>
                      <Text style={styles.childHeaderEmoji}>{child.isUnborn ? '🤰' : '👶'}</Text>
                    </View>
                  )}
                  <View style={styles.childHeaderModalInfo}>
                    <Text style={styles.childHeaderModalName}>{child.name}</Text>
                    {child.ageInMonths != null && (
                      <Text style={styles.childHeaderModalMeta}>{child.ageInMonths} meses</Text>
                    )}
                  </View>
                  {selectedChildId === child.id && (
                    <Ionicons name="checkmark-circle" size={18} color="#59C6C0" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.childHeaderModalAdd} onPress={handleAddChild}>
              <Ionicons name="add-circle" size={18} color="#6B5CA5" />
              <Text style={styles.childHeaderModalAddText}>Agregar bebé</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
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
        
        // Siempre verificar con el backend si es null o false (para asegurar que esté actualizado)
        if (hasChildrenStored === null || hasChildrenStored === 'false') {
          // Primera vez que el usuario inicia sesión, verificar perfil y luego hijos
          try {
            const authToken = await AsyncStorage.getItem('authToken');
            
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
          backgroundColor: '#96d2d3',
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <ProfileButton />,
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
          headerBackTitleVisible: false,
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="ChildrenList"
        component={ChildrenListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ShareChild"
        component={ShareChildScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ChildInvitations"
        component={ChildInvitationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="AcceptInvitation"
        component={AcceptInvitationScreen}
        options={{
          headerShown: false,
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
      <Stack.Screen
        name="SleepTracker"
        component={SleepTrackerScreen}
        options={{
          title: 'Seguimiento de Sueño',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditSleepEvent"
        component={EditSleepEventScreen}
        options={{
          title: 'Editar Siesta',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Doula"
        component={DoulaChatScreen}
        options={({ navigation }) => ({
          title: 'DOULI',
          headerShown: true,
          headerStyle: {
            backgroundColor: '#96d2d3',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => <ProfileButton />,
        })}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="CreateProduct"
        component={CreateProductScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MyProducts"
        component={MyProductsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MarketplaceFavorites"
        component={MarketplaceFavoritesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ProductConversations"
        component={ProductConversationsScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="MarketplaceMessages"
        component={MarketplaceMessagesScreen}
        options={{
          headerShown: false,
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
          backgroundColor: '#96d2d3',
          height: 100, // Altura moderada // Altura reducida
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          headerTitle: () => <ChildrenHeaderTitle />,
          headerShown: true,
          headerTitleAlign: 'left', // Alineado a la izquierda en iOS
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
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          title: 'Post Completo',
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
          backgroundColor: '#96d2d3',
          height: 100, // Altura moderada
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="CommunitiesMain"
        component={CommunitiesScreen}
        options={{
          headerTitle: () => <ChildrenHeaderTitle />,
          headerShown: true,
          headerTitleAlign: 'left',
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
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          title: 'Post Completo',
          headerShown: false, // Usamos header personalizado
        }}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Doula Chat
const DoulaStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#96d2d3',
          height: 100, // Altura moderada
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="DoulaMain"
        component={DoulaChatScreen}
        options={({ navigation }) => ({
          headerTitle: () => <ChildrenHeaderTitle />,
          headerShown: true,
          headerTitleAlign: 'left',
          headerRight: () => <ProfileButton />,
        })}
      />
    </Stack.Navigator>
  );
};

// Stack Navigator para Recommendations con sus sub-pantallas
const RecommendationsStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#96d2d3',
          height: 100, // Altura moderada
        },
        headerTintColor: 'white',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerRight: () => <ProfileButton />,
      }}
    >
      <Stack.Screen
        name="RecommendationsMain"
        component={RecommendationsScreen}
        options={{
          headerTitle: () => <ChildrenHeaderTitle />,
          headerShown: true,
          headerTitleAlign: 'left',
        }}
      />
      <Stack.Screen
        name="CategoryRecommendations"
        component={CategoryRecommendationsScreen}
        options={{
          title: 'Recomendaciones',
          headerShown: false, // Usamos header personalizado en la pantalla
        }}
      />
      <Stack.Screen
        name="RecommendationDetail"
        component={RecommendationDetailScreen}
        options={{
          title: 'Detalle',
          headerShown: false, // Usamos header personalizado en la pantalla
        }}
      />
      <Stack.Screen
        name="AddRecommendation"
        component={AddRecommendationScreen}
        options={{
          title: 'Agregar Recomendación',
          headerShown: false, // Usamos header personalizado en la pantalla
        }}
      />
      <Stack.Screen
        name="ListsMain"
        component={ListsScreen}
        options={{
          title: 'Listas',
          headerShown: false, // Usamos header personalizado
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
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          title: 'Favoritos',
          headerShown: false, // Usamos header personalizado en la pantalla
        }}
      />
      <Stack.Screen
        name="FavoritesMap"
        component={FavoritesMapScreen}
        options={{
          title: 'Mapa de Favoritos',
          headerShown: false, // Usamos header personalizado en la pantalla
        }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          title: 'Lista de Deseos',
          headerShown: false, // Usamos header personalizado en la pantalla
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
            backgroundColor: '#96d2d3',
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
            marginTop: Platform.OS === 'ios' ? 4 : 6,
            marginBottom: 0,
          },
        }}
      >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Inicio',
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
        component={DoulaStackNavigator}
        options={{
          tabBarLabel: () => null,
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[
              styles.doulaIconContainer,
              focused && styles.doulaIconActive
            ]}>
              <Image 
                source={require('../../assets/douli.png')} 
                style={{ 
                  width: 90, 
                  height: 100, // Altura moderada
                }} 
                resizeMode="contain"
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="MunpaMarket"
        component={MunpaMarketScreen}
        options={{
          tabBarLabel: 'Market',
          headerShown: true,
          headerTitle: () => <ChildrenHeaderTitle />,
          headerTitleAlign: 'left',
          headerStyle: {
            backgroundColor: '#96d2d3',
          },
          headerTintColor: 'white',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => <ProfileButton />,
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
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsStackNavigator}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Resetear el stack a RecommendationsMain cuando se presiona el tab
            const state = navigation.getState();
            const recommendationsTab = state.routes.find((r: any) => r.name === 'Recommendations');
            
            if (recommendationsTab) {
              const recommendationsState = recommendationsTab.state as any;
              const currentRoute =
                recommendationsState?.routes?.[recommendationsState.index || 0]?.name;

              // Si no estamos en el listado principal, resetear al main
              if (currentRoute && currentRoute !== 'RecommendationsMain') {
                e.preventDefault();
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Recommendations',
                      state: {
                        routes: [{ name: 'RecommendationsMain' }],
                        index: 0,
                      },
                    },
                  ],
                });
              }
            }
          },
        })}
        options={{
          tabBarLabel: 'Recomendaciones',
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
    </View>
  );
};

// Navegador para usuarios no autenticados
const AuthNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#96d2d3',
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
  const navigationRef = useRef<NavigationContainerRef<any>>(null);
  const routeNameRef = useRef<string | undefined>();

  // Activar deep linking
  useDeepLinking();

  // Establecer navigationRef global para deep linking
  React.useEffect(() => {
    // Establecer inmediatamente si ya está disponible
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current);
    }
    
    // También establecer después de un pequeño delay para asegurar que esté listo
    const timer = setTimeout(() => {
      if (navigationRef.current) {
        setNavigationRef(navigationRef.current);
      }
    }, 200);
    
    return () => {
      clearTimeout(timer);
      setNavigationRef(null);
    };
  }, [isAuthenticated, navigationRef.current]);

  // Configurar función global para navegación desde notificaciones
  React.useEffect(() => {
    (global as any).handleNotificationNavigation = ({ type, screen, data }: any) => {
      if (!navigationRef.current) {
        console.warn('⚠️ [NAV] Navigation ref no está disponible');
        return;
      }

      console.log('🧭 [NAV] Navegando desde notificación:', { type, screen, data });

      try {
        switch (type) {
          case 'new_message':
            // Navegar a MarketplaceMessagesScreen
            navigationRef.current.navigate('MarketplaceMessages', {
              productId: data?.productId,
              otherUserId: data?.senderId,
            });
            break;

          case 'purchase':
          case 'reservation':
          case 'interest':
            // Navegar a MyProductsScreen
            navigationRef.current.navigate('MyProducts');
            break;

          case 'admin_notification':
          case 'broadcast':
            // Navegar a la pantalla especificada
            if (screen) {
              let screenName = screen.replace('Screen', '');
              
              // Mapear pantallas conocidas a sus rutas correctas
              if (screenName === 'Home' || screenName === 'HomeMain') {
                // Home está dentro de MainTabs
                navigationRef.current.navigate('MainTabs');
                return;
              }
              
              // Intentar navegación directa primero (para pantallas en AuthenticatedNavigator)
              const directScreens = ['MyProducts', 'MarketplaceMessages', 'ProductDetail', 'CreateProduct', 'MarketplaceFavorites', 'Notifications', 'Profile', 'Doula'];
              if (directScreens.includes(screenName)) {
                try {
                  navigationRef.current.navigate(screenName as any);
                  return;
                } catch (err) {
                  console.warn(`⚠️ [NAV] No se pudo navegar directamente a ${screenName}, intentando navegación anidada...`);
                }
              }
              
              // Para otras pantallas, intentar navegación anidada a través de MainTabs
              try {
                navigationRef.current.navigate('MainTabs', {
                  screen: screenName as any,
                });
              } catch (err) {
                console.warn(`⚠️ [NAV] No se pudo navegar a ${screenName}, navegando a MainTabs por defecto`);
                navigationRef.current.navigate('MainTabs');
              }
            } else {
              // Navegar a MainTabs (que tiene Home como tab por defecto)
              navigationRef.current.navigate('MainTabs');
            }
            break;

          default:
            // Navegar a MainTabs por defecto (que tiene Home como tab por defecto)
            navigationRef.current.navigate('MainTabs');
        }
      } catch (error) {
        console.error('❌ [NAV] Error navegando desde notificación:', error);
      }
    };

    return () => {
      delete (global as any).handleNotificationNavigation;
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        const initialRoute = navigationRef.current?.getCurrentRoute();
        routeNameRef.current = initialRoute?.name;
        if (initialRoute?.name) {
          analyticsService.logScreenView(initialRoute.name);
        }
      }}
      onStateChange={() => {
        const currentRoute = navigationRef.current?.getCurrentRoute();
        const currentName = currentRoute?.name;
        if (currentName && routeNameRef.current !== currentName) {
          routeNameRef.current = currentName;
          analyticsService.logScreenView(currentName);
        }
      }}
      theme={{
        dark: false,
        colors: {
          background: '#96d2d3',
          primary: '#B4C14B',
          card: '##96d2d3',
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
      
      {/* Burbuja de Douli con mensajes de valor */}
      {isAuthenticated && <DouliChatOverlay />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
  },
  doulaIconContainer: {
    backgroundColor: '#96d2d3',
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
    backgroundColor: '#96d2d3',
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
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#96d2d3',
  },
  notificationBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
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
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  childrenHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingLeft: 16,
    paddingRight: 8,
    paddingBottom: 8,
    paddingTop: 20, // Aumentado para bajar los avatares
    height: '100%',
  },
  childHeaderItem: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  childHeaderItemOverlap: {
    marginLeft: -10,
  },
  childHeaderAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#96d2d3',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childHeaderAvatarSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 4,
    shadowColor: '#FFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  childHeaderName: {
    fontSize: 8,
    color: '#FFF',
    marginTop: 1,
    fontWeight: '600',
    maxWidth: 70,
    textAlign: 'center',
  },
  childHeaderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  childHeaderPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  childHeaderEmoji: {
    fontSize: 24,
  },
  childHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F5FB',
    borderRadius: 18,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginLeft: 8,
    height: 36,
    alignSelf: 'center',
  },
  childHeaderPillAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  childHeaderPillPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  childHeaderPillName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 6,
    maxWidth: 140,
  },
  childHeaderModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childHeaderModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    width: '88%',
    maxHeight: '70%',
  },
  childHeaderModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 12,
  },
  childHeaderModalList: {
    marginBottom: 12,
  },
  childHeaderModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  childHeaderModalAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childHeaderModalInfo: {
    flex: 1,
  },
  childHeaderModalName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  childHeaderModalMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  childHeaderModalAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    justifyContent: 'center',
  },
  childHeaderModalAddText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B5CA5',
  },
  childHeaderMoreBadge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF',
    borderWidth: 3,
    borderColor: '#96d2d3',
    marginLeft: -15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  childHeaderMoreText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#96d2d3',
  },
  addChildHeaderButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AppNavigator;
