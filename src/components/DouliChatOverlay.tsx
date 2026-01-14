import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DouliChatBubble from './DouliChatBubble';
import { useDouliChat } from '../hooks/useDouliChat';

const DouliChatOverlay: React.FC = () => {
  const navigation = useNavigation<any>();
  const [currentRouteName, setCurrentRouteName] = useState<string>('');

  // Usar listener de navegación para obtener la ruta actual
  useEffect(() => {
    const unsubscribe = navigation.addListener('state', (e) => {
      // Obtener la ruta activa del estado de navegación
      const state = e.data.state;
      if (state) {
        const findActiveRoute = (navState: any): any => {
          if (!navState) return null;
          
          if (navState.index !== undefined && navState.routes) {
            const activeRoute = navState.routes[navState.index];
            if (activeRoute.state) {
              return findActiveRoute(activeRoute.state);
            }
            return activeRoute;
          }
          
          return navState;
        };
        
        const activeRoute = findActiveRoute(state);
        if (activeRoute?.name) {
          setCurrentRouteName(activeRoute.name);
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Si no hay ruta aún, usar un valor por defecto
  const { isVisible, currentMessage, hideMessage } = useDouliChat(currentRouteName || 'Home');

  const handleChatPress = () => {
    // Navegar a la pantalla de chat con Douli
    navigation.navigate('Doula');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
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
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
  },
});

export default DouliChatOverlay;
