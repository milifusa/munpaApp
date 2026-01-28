import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import LikeButton from './LikeButton';
import { Post } from '../types/posts';
import AttachedLists from './AttachedLists';
import { useAuth } from '../contexts/AuthContext';

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onComment: (post: Post) => void;
  onShare: (postId: string) => void;
  formatDate: (date: any) => string;
  communityName: string;
  likingPostId?: string | null;
  onViewFull?: (post: Post) => void;
}

const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  onShare,
  formatDate,
  communityName,
  likingPostId,
  onViewFull,
}) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isOwn = post.authorId && user?.id ? post.authorId === user.id : false;
  const MAX_LENGTH = 200;
  const shouldTruncate = post.content.length > MAX_LENGTH;
  const displayContent = shouldTruncate 
    ? post.content.substring(0, MAX_LENGTH) + '...' 
    : post.content;
  const imagePosition = post.imagePosition || 'start';

  return (
    <View style={[styles.postCard, isOwn ? styles.postCardOwn : styles.postCardOther]}>
      {/* Meta */}
      <View style={[styles.metaRow, isOwn && styles.metaRowOwn]}>
        {!isOwn && (
          <View style={styles.authorAvatar}>
            {post.authorPhoto ? (
              <Image source={{ uri: post.authorPhoto }} style={styles.authorAvatarImage} />
            ) : (
              <Ionicons name="person" size={16} color="#666" />
            )}
          </View>
        )}
        <View style={styles.metaText}>
          <Text style={styles.authorName}>{post.authorName}</Text>
          <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
        </View>
      </View>
      
      {/* Burbuja de mensaje */}
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
      
        {post.imageUrl && imagePosition === 'start' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        <Text style={[styles.postText, isOwn && styles.postTextOwn]}>{displayContent}</Text>
        
        {shouldTruncate && onViewFull && (
          <TouchableOpacity onPress={() => onViewFull(post)} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>Ver más</Text>
            <Ionicons name="arrow-forward" size={14} color="#59C6C0" />
          </TouchableOpacity>
        )}
        
        {post.imageUrl && imagePosition === 'end' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        {post.attachedLists && post.attachedLists.length > 0 && (
            <AttachedLists 
              lists={post.attachedLists}
              onListPress={(listId) => {
                navigation.getParent()?.navigate('Recommendations', {
                  screen: 'ListDetail',
                  params: { listId }
                });
              }}
            />
        )}
      </View>

      {/* Acciones */}
      <View style={[styles.postActions, isOwn && styles.postActionsOwn]}>
          <LikeButton
            isLiked={post.isLiked || false}
            likeCount={post.likeCount || 0}
            onPress={() => onLike(post)}
            isLoading={likingPostId === post.id}
          size="small"
            showCount={false}
          />
        <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post)}>
          <Ionicons name="chatbubble-outline" size={18} color="#666" />
          </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post.id)}>
          <Ionicons name="share-outline" size={18} color="#666" />
          </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    marginBottom: 16,
    maxWidth: '88%',
      },
  postCardOwn: {
    alignSelf: 'flex-end',
  },
  postCardOther: {
    alignSelf: 'flex-start',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  metaRowOwn: {
    justifyContent: 'flex-end',
  },
  metaText: {
    flexDirection: 'column',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  postDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
  },
  bubble: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bubbleOwn: {
    backgroundColor: '#59C6C0',
    borderTopRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 6,
  },
  postText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  postTextOwn: {
    color: '#FFFFFF',
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 10,
  },
  expandButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expandButtonText: {
    fontSize: 14,
    color: '#59C6C0',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  postActions: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postActionsOwn: {
    justifyContent: 'flex-end',
  },
  actionButton: {
    padding: 6,
  },
});

export default PostCard;

