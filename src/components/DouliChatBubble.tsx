import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DouliChatBubbleProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  onChatPress: () => void;
}

const { width: screenWidth } = Dimensions.get('window');

const DouliChatBubble: React.FC<DouliChatBubbleProps> = ({
  message,
  isVisible,
  onClose,
  onChatPress,
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [slideAnimation] = useState(new Animated.Value(100));


  useEffect(() => {
    
    if (isVisible) {
      // Animación de entrada
      Animated.parallel([
        Animated.timing(animation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnimation, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
      });
    } else {
      // Animación de salida
      Animated.parallel([
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnimation, {
          toValue: 100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
      });
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: animation,
          transform: [{ translateY: slideAnimation }],
        },
      ]}
    >
      {/* Burbuja de chat */}
      <TouchableOpacity
        style={styles.chatBubble}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
        
        {/* Cola de la burbuja apuntando al tab bar */}
        <View style={styles.tail} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  chatBubble: {
    backgroundColor: '#887CBC',
    borderRadius: 18, // Reducido de 20 a 18 para mejor proporción
    paddingHorizontal: 14, // Reducido de 16 a 14
    paddingVertical: 10, // Reducido de 12 a 10
    maxWidth: screenWidth * 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 12, // Reducido de 14 a 12
    fontFamily: 'Montserrat',
    fontWeight: '500',
    lineHeight: 16, // Reducido de 20 a 16 para mantener proporción
    textAlign: 'center',
  },
  tail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#887CBC',
  },

});

export default DouliChatBubble;
