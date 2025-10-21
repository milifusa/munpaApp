import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LikeButtonProps {
  isLiked: boolean;
  likeCount: number;
  onPress: () => void;
  isLoading?: boolean;
  size?: 'small' | 'medium' | 'large';
  showCount?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  isLiked,
  likeCount,
  onPress,
  isLoading = false,
  size = 'medium',
  showCount = true,
}) => {
  const getIconSize = () => {
    switch (size) {
      case 'small': return 16;
      case 'large': return 24;
      default: return 20;
    }
  };

  const getButtonStyle = () => {
    switch (size) {
      case 'small': return styles.smallButton;
      case 'large': return styles.largeButton;
      default: return styles.mediumButton;
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        isLiked && styles.likedButton,
        isLoading && styles.loadingButton
      ]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator 
          size="small" 
          color={isLiked ? "#FF6B6B" : "#666"} 
        />
      ) : (
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={getIconSize()}
          color={isLiked ? "#FF6B6B" : "#666"}
        />
      )}
      {showCount && (
        <Ionicons
          name="heart"
          size={getIconSize() - 2}
          color="#FF6B6B"
          style={styles.countIcon}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  smallButton: {
    padding: 6,
    marginLeft: 3,
  },
  mediumButton: {
    padding: 8,
    marginLeft: 5,
  },
  largeButton: {
    padding: 12,
    marginLeft: 8,
  },
  likedButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 20,
  },
  loadingButton: {
    opacity: 0.7,
  },
  countIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 8,
  },
});

export default LikeButton;
