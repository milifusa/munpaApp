import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface SocialLoginButtonProps {
  type: 'google' | 'facebook';
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
}

const SocialLoginButton: React.FC<SocialLoginButtonProps> = ({ 
  type, 
  onPress, 
  size = 'medium' 
}) => {
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { width: 40, height: 40, fontSize: 16 };
      case 'large':
        return { width: 60, height: 60, fontSize: 24 };
      default:
        return { width: 50, height: 50, fontSize: 20 };
    }
  };

  const { width, height, fontSize } = getSizeStyles();

  const getButtonStyles = () => {
    if (type === 'google') {
      return {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E0E0E0',
      };
    } else {
      return {
        backgroundColor: '#1877F2', // Facebook blue
      };
    }
  };

  const getTextStyles = () => {
    if (type === 'google') {
      return {
        color: '#000000',
        fontWeight: '700',
      };
    } else {
      return {
        color: '#FFFFFF',
        fontWeight: '700',
      };
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getButtonStyles(),
        { width, height }
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, getTextStyles(), { fontSize }]}>
        {type === 'google' ? 'G' : 'f'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 25, // Circular
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  text: {
    fontWeight: '700',
  },
});

export default SocialLoginButton;
