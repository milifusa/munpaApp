import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import { Comment } from '../types/comments';
import LikeButton from '../components/LikeButton';

interface CommentsScreenProps {
  route: {
    params: {
      postId: string;
      postContent: string;
      postAuthorName: string;
      communityName: string;
    };
  };
}

const CommentsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { postId, postContent, postAuthorName, communityName } = route.params;
  const navigation = useNavigation();
  const { isAuthenticated, user } = useAuth();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [likingCommentId, setLikingCommentId] = useState<string | null>(null);

  // Cargar comentarios al montar el componente
  useEffect(() => {
    loadComments();
  }, [postId]);

  // Limpiar estado cuando el usuario se desconecta
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 [COMMENTS] Usuario desconectado, limpiando estado...');
      setComments([]);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Debug: Log cuando cambia el estado de comentarios
  useEffect(() => {
    console.log('💬 [COMMENTS] Estado de comentarios cambiado:', comments);
    console.log('💬 [COMMENTS] Longitud de comentarios:', comments.length);
  }, [comments]);

  // Función para cargar los comentarios
  const loadComments = async () => {
    if (!isAuthenticated) {
      console.log('🚫 [COMMENTS] Usuario no autenticado, no cargando comentarios');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await communitiesService.getPostComments(postId);
      
      console.log('📋 [COMMENTS] Respuesta completa del backend:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const commentsData = result.data || [];
        console.log('💬 [COMMENTS] Datos de comentarios extraídos:', commentsData);
        
        const finalComments = Array.isArray(commentsData) ? commentsData : [];
        console.log('✅ [COMMENTS] Comentarios finales a mostrar:', finalComments);
        setComments(finalComments);
      } else {
        console.log('❌ [COMMENTS] Backend no devolvió success: true');
        setComments([]);
      }
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error cargando comentarios:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los comentarios',
        [{ text: 'OK' }]
      );
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar los comentarios
  const onRefresh = async () => {
    setRefreshing(true);
    await loadComments();
    setRefreshing(false);
  };

  // Función para crear un nuevo comentario
  const handleCreateComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Por favor, escribe un comentario', [{ text: 'OK' }]);
      return;
    }

    if (newComment.trim().length < 2) {
      Alert.alert('Error', 'El comentario debe tener al menos 2 caracteres', [{ text: 'OK' }]);
      return;
    }

    try {
      setIsCreatingComment(true);
      console.log('💬 [COMMENTS] Creando comentario:', newComment.trim());
      
      const result = await communitiesService.createComment(postId, newComment.trim());
      
      if (result.success) {
        // Agregar el nuevo comentario al estado local
        const newCommentData = result.data as Comment;
        setComments(prevComments => [newCommentData, ...prevComments]);
        
        // Limpiar el input
        setNewComment('');
        
        console.log('✅ [COMMENTS] Comentario creado exitosamente');
      } else {
        throw new Error(result.message || 'No se pudo crear el comentario');
      }
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error creando comentario:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear el comentario',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingComment(false);
    }
  };

  // Función para manejar likes en comentarios
  const handleLikeComment = async (comment: Comment) => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Debes iniciar sesión para dar like', [{ text: 'OK' }]);
      return;
    }

    try {
      setLikingCommentId(comment.id);
      console.log('❤️ [COMMENTS] Procesando like para comentario:', comment.id);
      
      const result = await communitiesService.likeComment(comment.id);
      
      if (result.success) {
        // Actualizar el estado local del comentario
        setComments(prevComments => 
          prevComments.map(c => 
            c.id === comment.id 
              ? {
                  ...c,
                  isLiked: !c.isLiked,
                  likeCount: c.isLiked ? c.likeCount - 1 : c.likeCount + 1
                }
              : c
          )
        );
        
        console.log('✅ [COMMENTS] Like procesado exitosamente para comentario:', comment.id);
      } else {
        throw new Error(result.message || 'No se pudo procesar el like');
      }
    } catch (error: any) {
      console.error('❌ [COMMENTS] Error procesando like:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar el like',
        [{ text: 'OK' }]
      );
    } finally {
      setLikingCommentId(null);
    }
  };

  // Función para convertir timestamp de Firestore a fecha válida
  const parseFirestoreTimestamp = (timestamp: any): Date => {
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds || 0;
      return new Date(seconds * 1000 + nanoseconds / 1000000);
    } else if (typeof timestamp === 'string') {
      return new Date(timestamp);
    } else if (timestamp instanceof Date) {
      return timestamp;
    } else {
      return new Date();
    }
  };

  // Función para formatear la fecha
  const formatDate = (timestamp: any) => {
    try {
      const date = parseFirestoreTimestamp(timestamp);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ [COMMENTS] Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Si el usuario no está autenticado, mostrar mensaje
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comentarios</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={64} color="#CCC" />
          <Text style={styles.emptyStateTitle}>Sesión Expiada</Text>
          <Text style={styles.emptyStateText}>
            Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comentarios</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Información del post */}
      <View style={styles.postInfo}>
        <View style={styles.postHeader}>
          <Ionicons name="person" size={16} color="#59C6C0" />
          <Text style={styles.postAuthor}>{postAuthorName}</Text>
        </View>
        <Text style={styles.postContent}>{postContent}</Text>
        <Text style={styles.communityName}>{communityName}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Lista de comentarios */}
        <ScrollView 
          style={styles.commentsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando comentarios...</Text>
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={64} color="#CCC" />
              <Text style={styles.emptyStateTitle}>No hay comentarios aún</Text>
              <Text style={styles.emptyStateText}>
                Sé el primero en comentar en esta publicación
              </Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              <Text style={styles.sectionTitle}>
                {comments.length} comentario{comments.length !== 1 ? 's' : ''}
              </Text>
              
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  {/* Header del comentario */}
                  <View style={styles.commentHeader}>
                    <View style={styles.authorInfo}>
                      <View style={styles.authorAvatar}>
                        {comment.authorPhoto ? (
                          <Image source={{ uri: comment.authorPhoto }} style={styles.authorAvatarImage} />
                        ) : (
                          <Ionicons name="person" size={20} color="#666" />
                        )}
                      </View>
                      <View style={styles.authorDetails}>
                        <Text style={styles.authorName}>{comment.authorName}</Text>
                        <Text style={styles.commentDate}>
                          {formatDate(comment.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Contenido del comentario */}
                  <View style={styles.commentContent}>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>

                  {/* Footer del comentario con estadísticas */}
                  <View style={styles.commentFooter}>
                    <View style={styles.commentStats}>
                      <View style={styles.statItem}>
                        <Ionicons name="heart" size={14} color="#FF6B6B" />
                        <Text style={styles.statText}>{comment.likeCount || 0}</Text>
                      </View>
                    </View>
                    
                    {/* Botones de acción */}
                    <View style={styles.commentActions}>
                      <LikeButton
                        isLiked={comment.isLiked || false}
                        likeCount={comment.likeCount || 0}
                        onPress={() => handleLikeComment(comment)}
                        isLoading={likingCommentId === comment.id}
                        size="small"
                        showCount={false}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Input para crear comentario */}
        <View style={styles.createCommentSection}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Escribe un comentario..."
              placeholderTextColor="#999"
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <Text style={styles.characterCount}>{newComment.length}/500</Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!newComment.trim() || isCreatingComment) && styles.sendButtonDisabled
            ]}
            onPress={handleCreateComment}
            disabled={!newComment.trim() || isCreatingComment}
          >
            {isCreatingComment ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="send" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 15 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 10,
    marginLeft: -5,
    marginTop: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34,
  },
  postInfo: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  postContent: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    marginBottom: 8,
  },
  communityName: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  container: {
    flex: 1,
  },
  commentsContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  commentsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  commentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  commentHeader: {
    marginBottom: 12,
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
    color: '#333',
    marginBottom: 2,
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    marginBottom: 12,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  commentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createCommentSection: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  inputContainer: {
    flex: 1,
    marginRight: 12,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 10,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
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
    backgroundColor: '#CCC',
  },
});

export default CommentsScreen;
