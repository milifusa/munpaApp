import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import LikeButton from '../components/LikeButton';

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  communityId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  imageUrl?: string;
  tags?: string[];
}

interface CommunityPostsScreenProps {
  route: {
    params: {
      communityId: string;
      communityName: string;
    };
  };
}

const CommunityPostsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { communityId, communityName } = route.params;
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  // Cargar posts al montar el componente
  useEffect(() => {
    loadPosts();
  }, [communityId]);

  // Listener para cuando se regrese de la pantalla de comentarios
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 [POSTS] Pantalla enfocada, recargando posts...');
      loadPosts();
    });

    return unsubscribe;
  }, [navigation]);

  // Limpiar estado cuando el usuario se desconecta
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 [POSTS] Usuario desconectado, limpiando estado...');
      setPosts([]);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Debug: Log cuando cambia el estado de posts
  useEffect(() => {
    console.log('🎨 [POSTS] Estado de posts cambiado:', posts);
    console.log('🎨 [POSTS] Longitud de posts:', posts.length);
  }, [posts]);

  // Función para cargar los posts
  const loadPosts = async () => {
    // Verificar que el usuario esté autenticado antes de cargar datos
    if (!isAuthenticated) {
      console.log('🚫 [POSTS] Usuario no autenticado, no cargando posts');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await communitiesService.getCommunityPosts(communityId);
      
      console.log('📋 [POSTS] Respuesta completa del backend:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        const postsData = result.data || [];
        console.log('📝 [POSTS] Datos de posts extraídos:', postsData);
        console.log('📊 [POSTS] Tipo de datos:', typeof postsData);
        console.log('📊 [POSTS] Es array?', Array.isArray(postsData));
        console.log('📊 [POSTS] Longitud:', postsData?.length);
        
        const finalPosts = Array.isArray(postsData) ? postsData : [];
        console.log('✅ [POSTS] Posts finales a mostrar:', finalPosts);
        setPosts(finalPosts);
      } else {
        console.log('❌ [POSTS] Backend no devolvió success: true');
        setPosts([]);
      }
    } catch (error: any) {
      console.error('❌ [POSTS] Error cargando posts:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los posts de la comunidad',
        [{ text: 'OK' }]
      );
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar los posts
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  // Función para actualizar el contador de comentarios de un post
  const updatePostCommentCount = (postId: string, newCount: number) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, commentCount: newCount }
          : post
      )
    );
  };

  // Función para convertir timestamp de Firestore a fecha válida
  const parseFirestoreTimestamp = (timestamp: any): Date => {
    console.log('🕐 [POSTS] Parseando timestamp:', timestamp);
    
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      // Es un timestamp de Firestore
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds || 0;
      const date = new Date(seconds * 1000 + nanoseconds / 1000000);
      console.log('✅ [POSTS] Timestamp convertido a fecha:', date);
      return date;
    } else if (typeof timestamp === 'string') {
      // Es un string de fecha normal
      const date = new Date(timestamp);
      console.log('✅ [POSTS] String convertido a fecha:', date);
      return date;
    } else if (timestamp instanceof Date) {
      // Ya es una fecha
      console.log('✅ [POSTS] Ya es una fecha válida:', timestamp);
      return timestamp;
    } else {
      // Fallback a fecha actual
      console.warn('⚠️ [POSTS] Timestamp no reconocido:', timestamp);
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
      console.error('❌ [POSTS] Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Función para crear un nuevo post
  const handleCreatePost = () => {
    console.log('📝 [POSTS] Navegando a crear post');
    (navigation as any).navigate('CreatePost', {
      communityId: communityId,
      communityName: communityName
    });
  };

  // Función para salir de la comunidad
  const handleLeaveCommunity = () => {
    Alert.alert(
      'Salir de Comunidad',
      `¿Estás seguro de que quieres salir de "${communityName}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 [POSTS] Saliendo de la comunidad:', communityId);
              setIsLoading(true);
              
              const response = await communitiesService.leaveCommunity(communityId);
              
              if (response.success) {
                Alert.alert(
                  'Éxito',
                  'Has salido de la comunidad exitosamente',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navegar de vuelta a la pantalla anterior
                        navigation.goBack();
                      }
                    }
                  ]
                );
              }
            } catch (error: any) {
              console.error('❌ [POSTS] Error saliendo de la comunidad:', error);
              
              const errorMessage = 
                error.response?.data?.message || 
                error.message ||
                'No se pudo salir de la comunidad. Por favor intenta nuevamente.';
              
              Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Función para manejar likes en posts
  const handleLikePost = async (post: Post) => {
    if (!isAuthenticated) {
      Alert.alert('Error', 'Debes iniciar sesión para dar like', [{ text: 'OK' }]);
      return;
    }

    try {
      setLikingPostId(post.id);
      console.log('❤️ [POSTS] Procesando like para post:', post.id);
      
      const result = await communitiesService.likePost(post.id);
      
      if (result.success) {
        // Actualizar el estado local del post
        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === post.id 
              ? {
                  ...p,
                  isLiked: !p.isLiked,
                  likeCount: p.isLiked ? p.likeCount - 1 : p.likeCount + 1
                }
              : p
          )
        );
        
        console.log('✅ [POSTS] Like procesado exitosamente para post:', post.id);
      } else {
        throw new Error(result.message || 'No se pudo procesar el like');
      }
    } catch (error: any) {
      console.error('❌ [POSTS] Error procesando like:', error);
      Alert.alert(
        'Error',
        'No se pudo procesar el like',
        [{ text: 'OK' }]
      );
    } finally {
      setLikingPostId(null);
    }
  };

  // Si el usuario no está autenticado, mostrar mensaje
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 15 : 10) }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts de la Comunidad</Text>
        <View style={styles.placeholder} />
      </View>
      <View style={styles.emptyState}>
        <Ionicons name="lock-closed" size={64} color="#CCC" />
        <Text style={styles.emptyStateTitle}>Sesión Expirada</Text>
        <Text style={styles.emptyStateText}>
          Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
        </Text>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      <View style={styles.contentWrapper}>
        {/* Header */}
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={[styles.header, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 15 : 10) }]}
        >
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts de la Comunidad</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.createPostButton}
            onPress={handleCreatePost}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Menú desplegable */}
      {showMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleLeaveCommunity();
              }}
            >
              <Ionicons name="exit-outline" size={20} color="#F44336" />
              <Text style={styles.menuItemTextDanger}>Salir de la Comunidad</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Información de la comunidad */}
      <View style={styles.communityInfo}>
        <Ionicons name="people" size={24} color="#59C6C0" />
        <Text style={styles.communityName}>{communityName}</Text>
      </View>

      {/* Contenido principal */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando posts...</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No hay posts aún</Text>
            <Text style={styles.emptyStateText}>
              Sé el primero en compartir algo en esta comunidad
            </Text>
            <TouchableOpacity 
              style={styles.createFirstPostButton}
              onPress={handleCreatePost}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createFirstPostButtonText}>Crear Primer Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.postsContainer}>
            <Text style={styles.sectionTitle}>
              {posts.length} post{posts.length !== 1 ? 's' : ''} en la comunidad
            </Text>
            
            {posts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                {/* Contenido del post */}
                <View style={styles.postContent}>
                  <Text style={styles.postText}>{post.content}</Text>
                  
                  {/* Imagen del post si existe */}
                  {post.imageUrl && (
                    <Image source={{ uri: post.imageUrl }} style={styles.postImage} />
                  )}
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
                      onPress={() => handleLikePost(post)}
                      isLoading={likingPostId === post.id}
                      size="medium"
                      showCount={false}
                    />
                    <TouchableOpacity 
                      style={[
                        styles.actionButton,
                        post.commentCount > 0 && styles.actionButtonWithComments
                      ]}
                      onPress={() => {
                        console.log('💬 [POSTS] Navegando a comentarios del post:', post.id);
                        (navigation as any).navigate('Comments', {
                          postId: post.id,
                          postContent: post.content,
                          postAuthorName: post.authorName,
                          communityName: communityName
                        });
                      }}
                    >
                      <Ionicons 
                        name={post.commentCount > 0 ? "chatbubble" : "chatbubble-outline"} 
                        size={20} 
                        color={post.commentCount > 0 ? "#59C6C0" : "#666"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton}>
                      <Ionicons name="share-outline" size={20} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#59C6C0',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.3)',
  },
  backButton: {
    padding: 10,
    marginLeft: -5,
    marginTop: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 34,
  },
  createPostButton: {
    padding: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 5,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  menuContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 55,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 200,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemTextDanger: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  content: {
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
    marginBottom: 20,
  },
  createFirstPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#59C6C0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  createFirstPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  postsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
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
  },
  postDate: {
    fontSize: 12,
    color: '#999',
  },
  postContent: {
    marginBottom: 15,
  },
  postAuthorInfo: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 15,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 15,
  },

  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
  },
  commentIndicator: {
    backgroundColor: '#59C6C0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  commentIndicatorText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionButtonWithComments: {
    backgroundColor: '#F0F9F8',
    borderRadius: 20,
  },
});

export default CommunityPostsScreen;
