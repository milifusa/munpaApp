import React, { useState, useEffect, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import LikeButton from '../components/LikeButton';
import { shareContentHelper } from '../utils/shareContentHelper';
import PostCard from '../components/PostCard';
import analyticsService from '../services/analyticsService';

interface Post {
  id: string;
  title?: string;
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
  imagePosition?: 'start' | 'end';
  isPinned?: boolean;
  tags?: string[];
  postType?: 'normal' | 'event'; // Nuevo
  eventData?: any; // Nuevo: datos del evento
  attachedLists?: Array<{
    id: string;
    title: string;
    description?: string;
    imageUrl?: string;
    isPublic: boolean;
    totalItems: number;
    completedItems: number;
  }>;
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
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likingPostId, setLikingPostId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'posts' | 'events'>('all');
  const loadInFlightRef = useRef(false);
  const lastLoadAtRef = useRef(0);

  // Cargar posts al montar el componente
  useEffect(() => {
    loadPosts();
  }, [communityId]);

  // Listener para cuando se regrese de la pantalla de comentarios
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
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


  // Función para cargar los posts
  const loadPosts = async (force: boolean = false) => {
    // Verificar que el usuario esté autenticado antes de cargar datos
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      if (loadInFlightRef.current) return;
      if (!force && Date.now() - lastLoadAtRef.current < 3000) return;
      loadInFlightRef.current = true;
      setIsLoading(true);
      const result = await communitiesService.getCommunityPosts(communityId);
      
      if (result.success) {
        const postsData = result.data || [];
        
        const finalPosts = Array.isArray(postsData) ? postsData : [];
        
        // DEBUG: Verificar tipos de posts
        console.log('🔍 [POSTS DEBUG] Total posts:', finalPosts.length);
        finalPosts.forEach((post: any, index: number) => {
          console.log(`  Post ${index + 1}:`, {
            postType: post.postType,
            hasEventData: !!post.eventData,
            title: post.eventData?.title || post.content?.substring(0, 30)
          });
        });
        
        setPosts(finalPosts);
        
        // ✅ Analytics: Posts cargados
        if (!force) {
          analyticsService.logEvent('community_posts_viewed', {
            community_id: communityId,
            community_name: communityName,
            total_posts: finalPosts.length,
            event_posts: finalPosts.filter((p: any) => p.postType === 'event').length,
            normal_posts: finalPosts.filter((p: any) => p.postType !== 'event').length,
          });
        }
      } else {
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
      lastLoadAtRef.current = Date.now();
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  // Función para refrescar los posts
  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts(true);
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
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      // Es un timestamp de Firestore
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds || 0;
      const date = new Date(seconds * 1000 + nanoseconds / 1000000);
      return date;
    } else if (typeof timestamp === 'string') {
      // Es un string de fecha normal
      const date = new Date(timestamp);
      return date;
    } else if (timestamp instanceof Date) {
      // Ya es una fecha
      return timestamp;
    } else {
      // Fallback a fecha actual
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
    setShowCreateMenu(false);
    (navigation as any).navigate('CreatePost', {
      communityId: communityId,
      communityName: communityName
    });
  };

  // Función para crear un nuevo evento
  const handleCreateEvent = () => {
    setShowCreateMenu(false);
    (navigation as any).navigate('CreateEvent', {
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
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.header}>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
        {/* Header */}
      <SafeAreaView style={styles.headerSafeArea} edges={['top']}>
        <LinearGradient
          colors={['#96d2d3', '#96d2d3']}
          style={styles.header}
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
            onPress={() => setShowCreateMenu(!showCreateMenu)}
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
      </SafeAreaView>

      {/* Menú de crear (Post o Evento) */}
      {showCreateMenu && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity 
            style={styles.menuBackdrop}
            onPress={() => setShowCreateMenu(false)}
          />
          <View style={[styles.menuContainer, styles.createMenuContainer]}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleCreatePost}
            >
              <Ionicons name="document-text" size={20} color="#59C6C0" />
              <Text style={styles.menuItemText}>Crear Post</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleCreateEvent}
            >
              <Ionicons name="calendar" size={20} color="#887CBC" />
              <Text style={styles.menuItemText}>Crear Evento</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
        <Ionicons name="people" size={18} color="#59C6C0" />
        <Text style={styles.communityName}>{communityName}</Text>
      </View>

      {/* Filtros de contenido */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, filterType === 'all' && styles.filterTabActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterTabText, filterType === 'all' && styles.filterTabTextActive]}>
            Todos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, filterType === 'posts' && styles.filterTabActive]}
          onPress={() => setFilterType('posts')}
        >
          <Ionicons 
            name="document-text" 
            size={16} 
            color={filterType === 'posts' ? '#59C6C0' : '#999'} 
          />
          <Text style={[styles.filterTabText, filterType === 'posts' && styles.filterTabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[
            styles.filterTab, 
            filterType === 'events' && styles.filterTabActive,
            filterType === 'events' && styles.filterTabActiveEvents
          ]}
          onPress={() => setFilterType('events')}
        >
          <Ionicons 
            name="calendar" 
            size={16} 
            color={filterType === 'events' ? '#887CBC' : '#999'} 
          />
          <Text style={[
            styles.filterTabText, 
            filterType === 'events' && styles.filterTabTextActiveEvents
          ]}>
            Eventos
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido principal */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
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
            <View style={styles.emptyStateButtons}>
              <TouchableOpacity 
                style={styles.createFirstPostButton}
                onPress={handleCreatePost}
              >
                <Ionicons name="document-text" size={20} color="white" />
                <Text style={styles.createFirstPostButtonText}>Crear Post</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.createFirstPostButton, styles.createEventButton]}
                onPress={handleCreateEvent}
              >
                <Ionicons name="calendar" size={20} color="white" />
                <Text style={styles.createFirstPostButtonText}>Crear Evento</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          (() => {
            const filteredPosts = posts.filter(post => {
              if (filterType === 'all') return true;
              if (filterType === 'events') return post.postType === 'event';
              if (filterType === 'posts') return !post.postType || post.postType === 'normal';
              return true;
            });

            if (filteredPosts.length === 0) {
              return (
                <View style={styles.emptyFilterState}>
                  <Ionicons 
                    name={filterType === 'events' ? 'calendar-outline' : 'document-text-outline'} 
                    size={64} 
                    color="#CCC" 
                  />
                  <Text style={styles.emptyStateTitle}>
                    {filterType === 'events' ? 'No hay eventos' : 'No hay posts normales'}
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {filterType === 'events' 
                      ? 'Aún no se han creado eventos en esta comunidad' 
                      : 'Aún no hay posts normales en esta comunidad'}
                  </Text>
                </View>
              );
            }

            return (
              <View style={styles.postsContainer}>
                {filteredPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onLike={handleLikePost}
                    onComment={(post) => {
                      (navigation as any).navigate('Comments', {
                        postId: post.id,
                        postContent: post.content,
                        postAuthorName: post.authorName,
                        communityName: communityName
                      });
                    }}
                    onShare={(postId) => {
                      shareContentHelper.sharePost(postId).catch((error) => {
                        console.error('❌ [POSTS] Error compartiendo post:', error);
                      });
                    }}
                    formatDate={formatDate}
                    communityName={communityName}
                    likingPostId={likingPostId}
                    onViewFull={(post) => {
                      // Si es evento, navegar a EventDetail
                      if (post.postType === 'event' && post.eventData) {
                        (navigation as any).navigate('EventDetail', {
                          event: post,
                          communityName,
                        });
                      } else {
                        // Post normal, navegar a PostDetail
                        (navigation as any).navigate('PostDetail', {
                          post,
                          communityName,
                          formatDate,
                          onLike: handleLikePost,
                          likingPostId
                        });
                      }
                    }}
                    onAttendEvent={(post) => {
                      // Navegar directo a EventDetail cuando se intenta confirmar asistencia desde card
                      (navigation as any).navigate('EventDetail', {
                        event: post,
                        communityName,
                      });
                    }}
                  />
                ))}
              </View>
            );
          })()
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  headerSafeArea: {
    backgroundColor: '#96d2d3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
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
  createMenuContainer: {
    right: 60, // Posicionar junto al botón de crear
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuItemTextDanger: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#EEF2F7',
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#E0F2F1',
    borderWidth: 1,
    borderColor: '#59C6C0',
  },
  filterTabActiveEvents: {
    backgroundColor: '#F3E8FF',
    borderColor: '#887CBC',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#59C6C0',
    fontWeight: '600',
  },
  filterTabTextActiveEvents: {
    color: '#887CBC',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    backgroundColor: '#EEF2F7',
  },
  contentContainer: {
    paddingVertical: 16,
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
  emptyFilterState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  emptyStateButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  createFirstPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  createEventButton: {
    backgroundColor: '#887CBC',
  },
  createFirstPostButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  postsContainer: {
    paddingBottom: 16,
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
    backgroundColor: '#96d2d3',
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
