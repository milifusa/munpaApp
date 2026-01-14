import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import DouliChatBubble from './DouliChatBubble';
import { useDouliChat } from '../hooks/useDouliChat';

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
}

const CustomTabBar: React.FC<CustomTabBarProps> = ({ state, descriptors, navigation }) => {
  console.log('🔍 CustomTabBar: Componente renderizado');
  
  const currentRoute = useRoute();
  console.log('🔍 CustomTabBar: useRoute ejecutado, ruta:', currentRoute.name);
  
  const { isVisible, currentMessage, hideMessage, handleChatPress } = useDouliChat(currentRoute.name);
  
  console.log('🔍 CustomTabBar: Hook ejecutado, valores:', { isVisible, currentMessage: currentMessage?.text });

  const getIconName = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'grid';
      case 'Doula':
        return 'chatbubble';
      case 'Communities':
        return 'people';
      case 'Lists':
        return 'list';
      case 'Recommendations':
        return 'star';
      case 'Profile':
        return 'person';
      default:
        return 'home';
    }
  };

  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'Home':
        return 'Inicio';
      case 'Doula':
        return 'DOULI';
      case 'Communities':
        return 'Comunidades';
      case 'Profile':
        return 'Perfil';
      default:
        return 'Inicio';
    }
  };

  const isActive = (routeName: string) => {
    return currentRoute.name === routeName;
  };

  const handleTabPress = (routeName: string) => {
    if (routeName === 'Doula') {
      // DOULI siempre navega a la pantalla de chat
      navigation.navigate('Doula');
      // Mostrar mensaje de bienvenida después de un pequeño delay
      // setTimeout(() => {
      //   showWelcomeMessage();
      // }, 500);
    } else {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={styles.container}>
      {state.routes.map((route: any, index: number) => {
        const isDoula = route.name === 'Doula';
        const active = isActive(route.name);
        
        return (
          <TouchableOpacity
            key={route.key}
            style={[
              styles.tab,
              isDoula && styles.doulaTab,
              active && styles.activeTab
            ]}
            onPress={() => handleTabPress(route.name)}
            activeOpacity={0.8}
          >
            <View style={[
              styles.iconContainer,
              isDoula && styles.doulaIconContainer,
              active && !isDoula && styles.activeIconContainer
            ]}>
              {isDoula ? (
                <Image
                  source={require('../../assets/douli.png')}
                  style={styles.doulaIconImage}
                />
              ) : (
                <Ionicons
                  name={getIconName(route.name) as any}
                  size={24}
                  color={
                    active 
                      ? '#887CBC' 
                      : 'white'
                  }
                />
              )}
            </View>
            
            {!isDoula && (
              <View style={[
                styles.labelContainer,
                active && styles.activeLabelContainer
              ]}>
                <Text style={[
                  styles.labelText,
                  active && styles.activeLabelText
                ]}>
                  {getTabLabel(route.name)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
      
      {/* Chat flotante de DOULI con mensajes de valor */}
      <DouliChatBubble
        message={currentMessage?.text || ''}
        isVisible={isVisible}
        onClose={hideMessage}
        onChatPress={handleChatPress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#59C6C0',
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 5,
    height: Platform.OS === 'ios' ? 70 : 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  
  doulaTab: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  activeTab: {
    // Estilo para tabs activos
  },
  
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  
  doulaIconContainer: {
    backgroundColor: '#4A90E2',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    position: 'relative',
    top: -18,
    zIndex: 1000,
    borderWidth: 2.5,
    borderColor: 'white',
  },
  
  doulaIconImage: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    resizeMode: 'cover',
  },
  
  activeIconContainer: {
    backgroundColor: 'rgba(136, 124, 188, 0.1)',
  },
  
  labelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  
  activeLabelContainer: {
    // Contenedor para label activo
  },
  
  labelText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'white',
    marginTop: 2,
    marginBottom: Platform.OS === 'ios' ? 6 : 1,
  },
  
  activeLabelText: {
    color: '#887CBC',
    fontWeight: '600',
  },
  
  testButton: {
    position: 'absolute',
    top: -140,
    right: 20,
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 9999,
  },
  
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default CustomTabBar;
