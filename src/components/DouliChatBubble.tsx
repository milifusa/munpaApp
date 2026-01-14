import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  PanResponder,
} from 'react-native';

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
  // Posición inicial: centro inferior (sin icono, centrar el mensaje)
  // Como el contenedor ahora usa alignItems: 'center', solo necesitamos ajustar Y
  const pan = useRef(new Animated.ValueXY({ 
    x: 0, // El contenedor se encarga del centrado horizontal
    y: 0 // El contenedor se encarga del posicionamiento vertical
  })).current;
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
          // Solo cerrar la burbuja al hacer click, no navegar
          onClose();
        }
        
        // Volver al centro después de arrastrar
        Animated.spring(pan.x, {
          toValue: 0, // Volver a x: 0 (centrado por el contenedor)
          useNativeDriver: false,
          friction: 7,
        }).start();
        
        Animated.spring(pan.y, {
          toValue: 0, // Volver a y: 0 (posición original)
          useNativeDriver: false,
          friction: 7,
        }).start();

        // Mantener dentro de los límites verticales
        const currentY = (pan.y as any)._value;
        const bubbleHeight = 100; // Altura aproximada de la burbuja de mensaje
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
      // No auto-ocultar, solo se oculta cuando el usuario hace click
    } else {
      setShowMessage(false);
    }
  }, [isVisible, message]);

  // Solo mostrar si hay un mensaje visible
  if (!isVisible || !message) {
    return null;
  }

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
      <View style={styles.bubbleContainer}>
        {showMessage && message && (
          <View style={styles.messageBubble}>
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
    right: 0,
    bottom: 0,
    zIndex: 10000,
    alignItems: 'center', // Centrar horizontalmente
    justifyContent: 'flex-end', // Alinear al final verticalmente
    paddingBottom: 150, // Espacio desde abajo (reducido para bajar la burbuja)
  },
  bubbleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBubble: {
    position: 'relative',
    backgroundColor: '#887CBC',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: screenWidth * 0.85,
    minWidth: 250,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  messageText: {
    color: 'white',
    fontSize: 13,
    fontFamily: 'Montserrat',
    fontWeight: '500',
    lineHeight: 18,
    flexWrap: 'wrap',
  },
});

export default DouliChatBubble;
