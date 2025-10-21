import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import DouliChatBubble from './DouliChatBubble';
import { useDouliChat } from '../hooks/useDouliChat';

const DouliChatOverlay: React.FC = () => {
  const route = useRoute();
  const currentRouteName = route.name;
  const { isVisible, currentMessage, hideMessage, handleChatPress } = useDouliChat(currentRouteName);

  return (
    <View style={styles.container}>
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
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
});

export default DouliChatOverlay;
