import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import LikeButton from './LikeButton';
import { Post } from '../types/posts';
import AttachedLists from './AttachedLists';
import { useAuth } from '../contexts/AuthContext';
import LinkableText from './LinkableText';
import EventCard from './EventCard';

interface PostCardProps {
  post: Post;
  onLike: (post: Post) => void;
  onComment: (post: Post) => void;
  onShare: (postId: string) => void;
  formatDate: (date: any) => string;
  communityName: string;
  likingPostId?: string | null;
  onViewFull?: (post: Post) => void;
  onAttendEvent?: (post: Post) => void;
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
  onAttendEvent,
}) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const MAX_LENGTH = 200;
  const shouldTruncate = post.content.length > MAX_LENGTH;
  const displayContent = shouldTruncate 
    ? post.content.substring(0, MAX_LENGTH) + '...' 
    : post.content;
  const imagePosition = post.imagePosition || 'start';

  // Si es un evento, renderizar EventCard
  if (post.postType === 'event' && post.eventData) {
    return (
      <EventCard
        post={post}
        onViewDetail={onViewFull || (() => {})}
        onAttend={onAttendEvent}
      />
    );
  }

  // Post normal
  return (
    <View style={styles.postCard}>
      {/* Header del Post */}
      <View style={styles.postHeader}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            {post.authorPhoto ? (
              <Image source={{ uri: post.authorPhoto }} style={styles.authorAvatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={24} color="#FFF" />
              </View>
            )}
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.postDate}>{formatDate(post.createdAt)}</Text>
          </View>
        </View>
        
        {/* Badge de pin si está fijado */}
        {post.isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={14} color="#59C6C0" />
          </View>
        )}
      </View>

      {/* Contenido del Post */}
      <View style={styles.postContent}>
        {post.title && <Text style={styles.postTitle}>{post.title}</Text>}
      
        {post.imageUrl && imagePosition === 'start' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        <LinkableText 
          style={styles.postText}
          linkStyle={styles.linkText}
        >
          {displayContent}
        </LinkableText>
        
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

      {/* Barra de Acciones */}
      <View style={styles.postActions}>
        <View style={styles.actionsLeft}>
          <LikeButton
            isLiked={post.isLiked || false}
            likeCount={post.likeCount || 0}
            onPress={() => onLike(post)}
            isLoading={likingPostId === post.id}
            size="small"
            showCount={true}
          />
          <TouchableOpacity style={styles.actionButton} onPress={() => onComment(post)}>
            <Ionicons name="chatbubble-outline" size={20} color="#666" />
            {post.commentCount > 0 && (
              <Text style={styles.actionCount}>{post.commentCount}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={() => onShare(post.id)}>
          <Ionicons name="share-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginRight: 12,
  },
  authorAvatarImage: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  postDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
  },
  pinnedBadge: {
    backgroundColor: '#E0F2F1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postContent: {
    paddingHorizontal: 16,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  postImage: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    fontFamily: 'Montserrat',
  },
  linkText: {
    color: '#59C6C0',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  expandButtonText: {
    color: '#59C6C0',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
  },
  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Montserrat',
  },
});

export default PostCard;
