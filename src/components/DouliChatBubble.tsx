import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  PanResponder,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DouliChatBubbleProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  onChatPress: () => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const DouliChatBubble: React.FC<DouliChatBubbleProps> = ({
  message,
  isVisible,
  onClose,
  onChatPress,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: 10, y: screenHeight - 350 })).current;
  const [showMessage, setShowMessage] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        
        // Si el movimiento fue muy pequeño, considerar como tap
        if (Math.abs(gesture.dx) < 10 && Math.abs(gesture.dy) < 10) {
          onChatPress();
        }
        
        // Animar a los bordes de la pantalla
        const bubbleWidth = 90; // Ancho de la burbuja más grande
        const toValue = gesture.moveX > screenWidth / 2 
          ? screenWidth - bubbleWidth - 10 
          : 10;
        
        Animated.spring(pan.x, {
          toValue,
          useNativeDriver: false,
          friction: 7,
        }).start();

        // Mantener dentro de los límites verticales
        const currentY = (pan.y as any)._value;
        const bubbleHeight = 90; // Altura de la burbuja más grande
        if (currentY < 100) {
          Animated.spring(pan.y, {
            toValue: 100,
            useNativeDriver: false,
            friction: 7,
          }).start();
        } else if (currentY > screenHeight - bubbleHeight - 20) {
          Animated.spring(pan.y, {
            toValue: screenHeight - bubbleHeight - 20,
            useNativeDriver: false,
            friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // Mostrar mensaje automáticamente cuando isVisible cambia
  useEffect(() => {
    if (isVisible && message) {
      setShowMessage(true);
      // Ocultar el mensaje después de 5 segundos
      const timer = setTimeout(() => {
        setShowMessage(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, message]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      {/* Burbuja flotante con imagen de Douli */}
      <View style={styles.bubbleContainer}>
        <Image 
          source={require('../../assets/douli.png')} 
          style={styles.douliImage}
          resizeMode="contain"
        />
        
        {/* Burbuja de mensaje (si hay mensaje) */}
        {showMessage && message && (
          <View style={styles.messageBubble}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMessage(false)}
            >
              <Ionicons name="close" size={16} color="white" />
            </TouchableOpacity>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10000,
  },
  bubbleContainer: {
    alignItems: 'center',
  },
  douliImage: {
    width: 90,
    height: 90,
    backgroundColor: '#59C6C0',
    borderRadius: 45,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  messageBubble: {
    position: 'absolute',
    top: 0,
    left: 100,
    backgroundColor: '#887CBC',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxWidth: screenWidth * 0.75,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '500',
    lineHeight: 18,
    paddingRight: 20,
    flexWrap: 'wrap',
  },
});

export default DouliChatBubble;
