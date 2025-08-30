import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'mega';
  showBackground?: boolean;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium',
  showBackground = false 
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: 80, height: 40 };
      case 'large':
        return { width: 250, height: 125 };
      case 'xlarge':
        return { width: 400, height: 200 };
      case 'mega':
        return { width: 500, height: 250 };
      default: // medium
        return { width: 120, height: 60 };
    }
  };

  const { width, height } = getSize();

  return (
    <View style={[styles.container, showBackground && styles.background]}>
      <Image 
        source={require('../../assets/logo.png')}
        style={[styles.logo, { width, height }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  background: {
    backgroundColor: 'transparent',
  },
  logo: {
    // El logo se ajustará automáticamente según el tamaño especificado
  },
});

export default Logo;
