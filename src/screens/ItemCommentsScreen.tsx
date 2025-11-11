import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Image,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listsService } from '../services/api';
import { ListComment } from '../types/lists';

interface ItemCommentsScreenProps {
  route: {
    params: {
      listId: string;
      itemId: string;
      itemText: string;
    };
  };
}

const ItemCommentsScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { listId, itemId, itemText } = route.params;

  const [comments, setComments] = useState<ListComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  // Cargar comentarios
  const loadComments = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true);
      
      console.log('💬 [ITEM COMMENTS] Cargando comentarios:', { listId, itemId });
      const result = await listsService.getItemComments(listId, itemId);
      
      const commentsData = Array.isArray(result.data) ? result.data : [];
      console.log('✅ [ITEM COMMENTS] Comentarios cargados:', commentsData.length);
      
      // Debug de los nuevos campos
      if (commentsData.length > 0) {
        commentsData.forEach((comment, index) => {
          console.log(`💬 [ITEM COMMENTS] Comentario ${index + 1}:`, {
            userName: comment.userName,
            userPhoto: comment.userPhoto,
            authorName: comment.authorName, // campo anterior
            authorPhoto: comment.authorPhoto, // campo anterior
            content: comment.content?.substring(0, 30) + '...'
          });
        });
      }
      
      setComments(commentsData);
    } catch (error) {
      console.error('❌ [ITEM COMMENTS] Error cargando comentarios:', error);
      Alert.alert('Error', 'No se pudieron cargar los comentarios');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Cargar comentarios al enfocar la pantalla
  useFocusEffect(
    useCallback(() => {
      loadComments();
    }, [listId, itemId])
  );

  // Función para refrescar
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadComments(false);
  };

  // Agregar comentario
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      Alert.alert('Error', 'Por favor escribe un comentario');
      return;
    }

    try {
      setIsAddingComment(true);
      console.log('💬 [ITEM COMMENTS] Agregando comentario:', newComment.trim());
      
      await listsService.addItemComment(listId, itemId, { content: newComment.trim() });
      
      setNewComment('');
      await loadComments(false); // Recargar comentarios
      
      console.log('✅ [ITEM COMMENTS] Comentario agregado exitosamente');
    } catch (error) {
      console.error('❌ [ITEM COMMENTS] Error agregando comentario:', error);
      Alert.alert('Error', 'No se pudo agregar el comentario');
    } finally {
      setIsAddingComment(false);
    }
  };

  // Formatear fecha
  const formatDate = (timestamp: any) => {
    try {
      let date: Date;
      
      if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
        // Firestore Timestamp
        date = new Date(timestamp._seconds * 1000 + (timestamp._nanoseconds || 0) / 1000000);
      } else if (timestamp) {
        date = new Date(timestamp);
      } else {
        return 'Fecha no disponible';
      }
      
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ [ITEM COMMENTS] Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Renderizar comentario individual
  const renderComment = ({ item: comment }: { item: ListComment }) => {
    const displayName = comment.userName || comment.authorName || 'Usuario';
    const photoUrl = comment.userPhoto || comment.authorPhoto;
    
    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.authorInfo}>
            <View style={styles.authorAvatar}>
              {photoUrl ? (
                <Image 
                  source={{ uri: photoUrl }} 
                  style={styles.authorAvatarImage}
                  defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==' }}
                />
              ) : (
                <Ionicons name="person" size={20} color="#59C6C0" />
              )}
            </View>
            <View style={styles.authorDetails}>
              <Text style={styles.authorName}>{displayName}</Text>
              <Text style={styles.commentDate}>{formatDate(comment.createdAt)}</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.commentContent}>{comment.content}</Text>
      </View>
    );
  };

  // Estado de carga
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 15 : 10) }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comentarios</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#59C6C0" />
          <Text style={styles.loadingText}>Cargando comentarios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 15 : 10) }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Comentarios</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Item info */}
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle}>"{itemText}"</Text>
        <Text style={styles.commentsCount}>
          {comments.length} comentario{comments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Lista de comentarios */}
        {comments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubble-outline" size={64} color="#CCC" />
            <Text style={styles.emptyTitle}>Sin comentarios aún</Text>
            <Text style={styles.emptyMessage}>Sé el primero en comentar sobre este item</Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            style={styles.commentsList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#59C6C0"
              />
            }
          />
        )}

        {/* Input para nuevo comentario */}
        <View style={styles.addCommentContainer}>
          <TextInput
            style={styles.commentInput}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Escribe tu comentario..."
            multiline
            maxLength={500}
            editable={!isAddingComment}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newComment.trim() || isAddingComment) && styles.sendButtonDisabled]}
            onPress={handleAddComment}
            disabled={!newComment.trim() || isAddingComment}
          >
            {isAddingComment ? (
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#59C6C0',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  backButton: {
    padding: 12,
    marginLeft: -12,
    marginTop: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 48,
  },

  // Item info
  itemInfo: {
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  commentsCount: {
    fontSize: 14,
    color: '#666',
  },

  // Content
  content: {
    flex: 1,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Comments list
  commentsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Comment card
  commentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  authorAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    color: '#666',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  // Add comment
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 14,
    backgroundColor: '#F8F9FA',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#CCC',
  },
});

export default ItemCommentsScreen;
