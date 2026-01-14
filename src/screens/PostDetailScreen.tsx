import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LikeButton from '../components/LikeButton';
import { shareContentHelper } from '../utils/shareContentHelper';
import { Post } from '../types/posts';
import AttachedLists from '../components/AttachedLists';

const PostDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { post, onLike, formatDate, communityName, likingPostId } = route.params || {};

  // Debug: verificar que el post tenga attachedLists
  useEffect(() => {
    if (post) {
      console.log('📋 [POST DETAIL] Post recibido:', {
        id: post.id,
        hasAttachedLists: !!post.attachedLists,
        attachedListsType: typeof post.attachedLists,
        attachedListsIsArray: Array.isArray(post.attachedLists),
        attachedListsLength: post.attachedLists?.length || 0,
        attachedLists: post.attachedLists
      });
    }
  }, [post]);

  if (!post) {
    return (
      <View style={styles.container}>
        <Text>Post no encontrado</Text>
      </View>
    );
  }

  const imagePosition = post.imagePosition || 'start';

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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Completo</Text>
        <TouchableOpacity onPress={() => shareContentHelper.sharePost(post.id)}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
        <Text style={styles.postContent}>{post.content}</Text>

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
              <Text style={styles.statText}>{post.commentCount || 0}</Text>
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
              onPress={() => {
                navigation.navigate('Comments', {
                  postId: post.id,
                  postContent: post.content,
                  postAuthorName: post.authorName,
                  communityName: communityName,
                });
              }}
            >
              <Ionicons
                name={post.commentCount > 0 ? "chatbubble" : "chatbubble-outline"}
                size={24}
                color={post.commentCount > 0 ? "#59C6C0" : "#666"}
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#96d2d3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  scrollView: {
    flex: 1,
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
});

export default PostDetailScreen;

