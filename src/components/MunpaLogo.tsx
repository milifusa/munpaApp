import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Logo from './Logo';

interface MunpaLogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge' | 'mega';
  showTagline?: boolean;
}

const MunpaLogo: React.FC<MunpaLogoProps> = ({ 
  size = 'medium', 
  showTagline = true 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { fontSize: 24, taglineSize: 12 };
      case 'large':
        return { fontSize: 48, taglineSize: 18 };
      case 'xlarge':
        return { fontSize: 64, taglineSize: 20 };
      case 'mega':
        return { fontSize: 80, taglineSize: 24 };
      default:
        return { fontSize: 36, taglineSize: 14 };
    }
  };

  const { fontSize, taglineSize } = getSizeStyles();

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Logo size={size} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    color: '#FFFFFF',
    marginTop: 8,
    // fontFamily: 'Montserrat-Medium' // Temporalmente comentado,
    textAlign: 'center',
  },
});

export default MunpaLogo;
