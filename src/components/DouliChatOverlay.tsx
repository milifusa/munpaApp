import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import DouliChatBubble from './DouliChatBubble';
import { useDouliChat } from '../hooks/useDouliChat';

const DouliChatOverlay: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const currentRouteName = route.name;
  const { isVisible, currentMessage, hideMessage } = useDouliChat(currentRouteName);

  const handleChatPress = () => {
    // Navegar a la pantalla de chat con Douli
    navigation.navigate('Doula');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Burbuja de Douli siempre visible */}
      <DouliChatBubble
        message={currentMessage?.text || ''}
        isVisible={true}
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
