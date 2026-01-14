import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import LikeButton from './LikeButton';
import { Post } from '../types/posts';
import AttachedLists from './AttachedLists';

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
  const MAX_LENGTH = 200;
  const shouldTruncate = post.content.length > MAX_LENGTH;
  const displayContent = shouldTruncate 
    ? post.content.substring(0, MAX_LENGTH) + '...' 
    : post.content;
  const imagePosition = post.imagePosition || 'start';

  return (
    <View style={[styles.postCard, post.isPinned && styles.pinnedPostCard]}>
      {/* Badge de pinned */}
      {post.isPinned && (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={14} color="#59C6C0" />
          <Text style={styles.pinnedText}>Fijado</Text>
        </View>
      )}
      
      {/* Título del post si existe */}
      {post.title && (
        <Text style={styles.postTitle}>{post.title}</Text>
      )}
      
      {/* Contenido del post */}
      <View style={styles.postContent}>
        {/* Imagen al inicio si imagePosition es 'start' */}
        {post.imageUrl && imagePosition === 'start' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        {/* Texto del post */}
        <Text style={styles.postText}>{displayContent}</Text>
        
        {/* Botón ver más */}
        {shouldTruncate && onViewFull && (
          <TouchableOpacity 
            onPress={() => onViewFull(post)}
            style={styles.expandButton}
          >
            <Text style={styles.expandButtonText}>Ver más</Text>
            <Ionicons name="arrow-forward" size={14} color="#59C6C0" />
          </TouchableOpacity>
        )}
        
        {/* Imagen al final si imagePosition es 'end' */}
        {post.imageUrl && imagePosition === 'end' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}
        
        {/* Listas adjuntas */}
        {(() => {
          // Debug: verificar si hay listas adjuntas
          if (post.attachedLists) {
            console.log('📋 [POST CARD] Post tiene attachedLists:', {
              postId: post.id,
              listsCount: post.attachedLists.length,
              lists: post.attachedLists
            });
          }
          
          return post.attachedLists && post.attachedLists.length > 0 ? (
            <AttachedLists 
              lists={post.attachedLists}
              onListPress={(listId) => {
                // Navegar a la lista cuando se presione
                // ListDetail está en RecommendationsStackNavigator dentro del tab Recommendations
                console.log('📋 [POST CARD] Navegando a lista:', listId);
                // Navegar al tab de Recommendations y luego a ListDetail
                navigation.getParent()?.navigate('Recommendations', {
                  screen: 'ListDetail',
                  params: { listId }
                });
              }}
            />
          ) : null;
        })()}
      </View>
      
      {/* Información del autor abajo */}
      <View style={styles.postAuthorInfo}>
        <View style={styles.authorInfo}>
          <View style={styles.authorAvatar}>
            {post.authorPhoto ? (
              <Image source={{ uri: post.authorPhoto }} style={styles.authorAvatarImage} />
            ) : (
              <Ionicons name="person" size={16} color="#666" />
            )}
          </View>
          <View style={styles.authorDetails}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.postDate}>
              {formatDate(post.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Footer del post con estadísticas */}
      <View style={styles.postFooter}>
        <View style={styles.postStats}>
          <View style={styles.statItem}>
            <Ionicons name="heart" size={16} color="#FF6B6B" />
            <Text style={styles.statText}>{post.likeCount || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="chatbubble" size={16} color="#59C6C0" />
            <Text style={styles.statText}>{post.commentCount || 0}</Text>
            {post.commentCount > 0 && (
              <View style={styles.commentIndicator}>
                <Text style={styles.commentIndicatorText}>
                  {post.commentCount > 99 ? '99+' : post.commentCount}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Botones de acción */}
        <View style={styles.postActions}>
          <LikeButton
            isLiked={post.isLiked || false}
            likeCount={post.likeCount || 0}
            onPress={() => onLike(post)}
            isLoading={likingPostId === post.id}
            size="medium"
            showCount={false}
          />
          <TouchableOpacity 
            style={[
              styles.actionButton,
              post.commentCount > 0 && styles.actionButtonWithComments
            ]}
            onPress={() => onComment(post)}
          >
            <Ionicons 
              name={post.commentCount > 0 ? "chatbubble" : "chatbubble-outline"} 
              size={20} 
              color={post.commentCount > 0 ? "#59C6C0" : "#666"} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => onShare(post.id)}
          >
            <Ionicons name="share-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  pinnedPostCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#59C6C0',
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
    gap: 4,
  },
  pinnedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#59C6C0',
    fontFamily: 'Montserrat',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginBottom: 10,
  },
  postContent: {
    marginBottom: 12,
  },
  postText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 12,
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
  postAuthorInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  authorAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  postDate: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  postFooter: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  commentIndicator: {
    backgroundColor: '#59C6C0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  commentIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  actionButton: {
    padding: 8,
  },
  actionButtonWithComments: {
    // Estilo adicional si hay comentarios
  },
});

export default PostCard;

