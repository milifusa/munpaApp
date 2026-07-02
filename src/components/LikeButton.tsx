import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Text,
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
        <Text style={styles.countText}>{likeCount}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    marginLeft: 3,
  },
  mediumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    marginLeft: 5,
  },
  largeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
  countText: {
    minWidth: 10,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default LikeButton;
