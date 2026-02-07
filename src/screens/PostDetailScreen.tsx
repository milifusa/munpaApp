import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LikeButton from '../components/LikeButton';
import { shareContentHelper } from '../utils/shareContentHelper';
import { Post } from '../types/posts';
import { Comment } from '../types/comments';
import AttachedLists from '../components/AttachedLists';
import LinkableText from '../components/LinkableText';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import analyticsService from '../services/analyticsService';

const PostDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { post, onLike, formatDate, communityName, likingPostId } = route.params || {};

  const isOwner = user?.id === post?.authorId;

  // Estados para comentarios
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (post?.id) {
      loadComments();
      
      // ✅ Analytics: Post detalle visto
      analyticsService.logEvent('post_detail_viewed', {
        post_id: post.id,
        post_type: post.postType || 'normal',
        community_id: post.communityId,
        is_owner: user?.id === post.authorId,
        has_image: !!post.imageUrl,
        has_attached_lists: post.attachedLists && post.attachedLists.length > 0,
      });
    }
  }, [post?.id]);

  const loadComments = async () => {
    try {
      setIsLoadingComments(true);
      const result = await communitiesService.getPostComments(post.id);
      
      if (result.success) {
        const commentsData = result.data || [];
        setComments(Array.isArray(commentsData) ? commentsData : []);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error('❌ Error cargando comentarios:', error);
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Por favor, escribe un comentario');
      return;
    }

    try {
      setIsCreatingComment(true);
      const result = await communitiesService.createComment(post.id, newComment.trim());
      
      if (result.success) {
        const newCommentData = result.data as Comment;
        setComments(prevComments => [newCommentData, ...prevComments]);
        setNewComment('');
        
        // ✅ Analytics: Comentario creado
        analyticsService.logEvent('comment_created', {
          post_id: post.id,
          post_type: post.postType || 'normal',
          community_id: post.communityId,
          comment_length: newComment.trim().length,
        });
      }
    } catch (error: any) {
      console.error('❌ Error creando comentario:', error);
      Alert.alert('Error', 'No se pudo crear el comentario');
    } finally {
      setIsCreatingComment(false);
    }
  };

  const handleLikeComment = async (comment: Comment) => {
    try {
      setLikingCommentId(comment.id);
      const result = await communitiesService.likeComment(comment.id);
      
      if (result.success) {
        setComments(prevComments =>
          prevComments.map(c =>
            c.id === comment.id
              ? { ...c, isLiked: !c.isLiked, likeCount: result.data.likeCount }
              : c
          )
        );
      }
    } catch (error) {
      console.error('❌ Error con like:', error);
    } finally {
      setLikingCommentId(null);
    }
  };

  if (!post) {
    return (
      <View style={styles.container}>
        <Text>Post no encontrado</Text>
      </View>
    );
  }

  const imagePosition = post.imagePosition || 'start';

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Post',
      '¿Estás seguro de que quieres eliminar este post?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await communitiesService.deletePost(post.id);
              Alert.alert('Éxito', 'Post eliminado correctamente');
              navigation.goBack();
            } catch (error: any) {
              console.error('Error eliminando post:', error);
              Alert.alert('Error', error.response?.data?.message || 'No se pudo eliminar el post');
            }
          },
        },
      ]
    );
  };

  const formatDateSafe = (date: any) => {
    if (!date) return 'Fecha no disponible';
    if (formatDate) return formatDate(date);
    
    try {
      if (date._seconds) {
        return new Date(date._seconds * 1000).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return new Date(date).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  return (
    <View style={styles.wrapper}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Completo</Text>
        <View style={styles.headerActions}>
          {isOwner && (
            <TouchableOpacity onPress={handleDelete} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => shareContentHelper.sharePost(post.id)} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Badge de pinned */}
        {post.isPinned && (
          <View style={styles.pinnedBadge}>
            <Ionicons name="pin" size={16} color="#59C6C0" />
            <Text style={styles.pinnedText}>Fijado</Text>
          </View>
        )}

        {/* Título del post si existe */}
        {post.title && (
          <Text style={styles.postTitle}>{post.title}</Text>
        )}

        {/* Imagen al inicio si imagePosition es 'start' */}
        {post.imageUrl && imagePosition === 'start' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}

        {/* Contenido del post */}
        <LinkableText style={styles.postContent}>
          {post.content}
        </LinkableText>

        {/* Imagen al final si imagePosition es 'end' */}
        {post.imageUrl && imagePosition === 'end' && (
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
        )}

        {/* Listas adjuntas */}
        {post.attachedLists && post.attachedLists.length > 0 && (
          <AttachedLists 
            lists={post.attachedLists}
            onListPress={(listId) => {
              // Navegar a la lista cuando se presione
              // ListDetail está en RecommendationsStackNavigator dentro del tab Recommendations
              console.log('📋 [POST DETAIL] Navegando a lista:', listId);
              // Navegar al tab de Recommendations y luego a ListDetail
              navigation.getParent()?.navigate('Recommendations', {
                screen: 'ListDetail',
                params: { listId }
              });
            }}
          />
        )}

        {/* Información del autor */}
        <View style={styles.authorSection}>
          <View style={styles.authorInfo}>
            <View style={styles.authorAvatar}>
              {post.authorPhoto ? (
                <Image source={{ uri: post.authorPhoto }} style={styles.authorAvatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#666" />
              )}
            </View>
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>{post.authorName}</Text>
              <Text style={styles.postDate}>{formatDateSafe(post.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Footer con acciones */}
        <View style={styles.footer}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={20} color="#FF6B6B" />
              <Text style={styles.statText}>{post.likeCount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="chatbubble" size={20} color="#59C6C0" />
              <Text style={styles.statText}>{comments.length || 0}</Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <LikeButton
              isLiked={post.isLiked || false}
              likeCount={post.likeCount || 0}
              onPress={() => onLike && onLike(post)}
              isLoading={likingPostId === post.id}
              size="medium"
              showCount={false}
            />
            <TouchableOpacity
              style={styles.actionButton}
            >
              <Ionicons
                name={comments.length > 0 ? "chatbubble" : "chatbubble-outline"}
                size={24}
                color={comments.length > 0 ? "#59C6C0" : "#666"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => shareContentHelper.sharePost(post.id)}
            >
              <Ionicons name="share-outline" size={24} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sección de Comentarios */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsSectionTitle}>
            Comentarios {comments.length > 0 && `(${comments.length})`}
          </Text>

          {isLoadingComments ? (
            <ActivityIndicator size="large" color="#59C6C0" style={{ marginVertical: 20 }} />
          ) : comments.length === 0 ? (
            <Text style={styles.noCommentsText}>No hay comentarios aún. ¡Sé el primero en comentar!</Text>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAuthorInfo}>
                      <View style={styles.commentAvatar}>
                        {comment.authorPhoto ? (
                          <Image source={{ uri: comment.authorPhoto }} style={styles.commentAvatarImage} />
                        ) : (
                          <View style={styles.commentAvatarPlaceholder}>
                            <Ionicons name="person" size={16} color="#FFF" />
                          </View>
                        )}
                      </View>
                      <View style={styles.commentDetails}>
                        <Text style={styles.commentAuthorName}>{comment.authorName}</Text>
                        <Text style={styles.commentDate}>{formatDateSafe(comment.createdAt)}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={styles.commentText}>{comment.content}</Text>
                  <View style={styles.commentActions}>
                    <TouchableOpacity
                      style={styles.commentLikeButton}
                      onPress={() => handleLikeComment(comment)}
                      disabled={likingCommentId === comment.id}
                    >
                      <Ionicons
                        name={comment.isLiked ? "heart" : "heart-outline"}
                        size={18}
                        color={comment.isLiked ? "#FF6B6B" : "#666"}
                      />
                      {comment.likeCount > 0 && (
                        <Text style={styles.commentLikeCount}>{comment.likeCount}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Input para nuevo comentario */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.commentInputContainer}>
          <View style={styles.commentInputWrapper}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
              editable={!isCreatingComment}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!newComment.trim() || isCreatingComment) && styles.sendButtonDisabled]}
              onPress={handleCreateComment}
              disabled={!newComment.trim() || isCreatingComment}
            >
              {isCreatingComment ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Ionicons name="send" size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#59C6C0',
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 15,
    backgroundColor: '#59C6C0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  scrollView: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    margin: 20,
    marginBottom: 10,
    gap: 6,
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#59C6C0',
    fontFamily: 'Montserrat',
  },
  postTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 16,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    fontFamily: 'Montserrat',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  authorSection: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  authorDetails: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  postDate: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  footer: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 24,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  actionButton: {
    padding: 8,
  },
  commentsSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  commentsSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 16,
  },
  noCommentsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginVertical: 24,
    fontStyle: 'italic',
  },
  commentsList: {
    gap: 16,
  },
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
    overflow: 'hidden',
  },
  commentAvatarImage: {
    width: 32,
    height: 32,
  },
  commentAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentDetails: {
    flex: 1,
  },
  commentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  commentDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentLikeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  commentLikeCount: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  commentInputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1F2937',
    fontFamily: 'Montserrat',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendButton: {
    backgroundColor: '#59C6C0',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
});

export default PostDetailScreen;

