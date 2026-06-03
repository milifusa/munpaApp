import { useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { communitiesService } from '../services/api';
import { shareContentService } from '../services/shareContentService';
import { axiosInstance as api } from '../services/api';

// Variable global para el navigationRef (se establece desde AppNavigator)
let globalNavigationRef: NavigationContainerRef<any> | null = null;
let pendingDeepLink: string | null = null;

// Variable para rastrear el estado de autenticación
let currentIsAuthenticated = false;

export const setNavigationRef = (ref: NavigationContainerRef<any> | null) => {
  globalNavigationRef = ref;
  
  // Si hay un deep link pendiente y ahora tenemos el ref, procesarlo
  if (ref && pendingDeepLink) {
    handleDeepLinkInternal(pendingDeepLink, currentIsAuthenticated);
    pendingDeepLink = null;
  }
};

const handleDeepLinkInternal = async (url: string, isAuthenticated: boolean) => {

    if (!globalNavigationRef) {
      console.warn('⚠️ [DEEP LINK] NavigationRef no disponible aún');
      return;
    }

    try {
      // Ignorar URLs de desarrollo de Expo
      if (url.includes('expo-development-client')) {
        return;
      }

      // Normalizar URL: quitar protocolo y obtener la ruta
      let route = url.replace(/.*?:\/\//g, ''); // Quitar munpa:// o https://
      let queryString = '';
      
      // Si es una URL web, extraer solo la ruta después del dominio
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        route = urlObj.pathname.replace(/^\//, ''); // Quitar el / inicial
        queryString = urlObj.search.replace(/^\?/, '');
      } else {
        const [pathOnly, qs] = route.split('?');
        route = pathOnly;
        queryString = qs || '';
      }
      
      const parts = route.split('/').filter(part => part.length > 0);
      const queryParams = Object.fromEntries(new URLSearchParams(queryString));

      // munpa://home
      if (parts[0] === 'home') {
        if (isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', { screen: 'Home' });
        }
        return;
      }

      // munpa://recommendations
      if (parts[0] === 'recommendations' && parts.length === 1) {
        if (isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', { screen: 'Recommendations' });
        }
        return;
      }

      // munpa://communities
      if (parts[0] === 'communities' && parts.length === 1) {
        if (isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', { screen: 'Communities' });
        }
        return;
      }

      // munpa://children
      if (parts[0] === 'children') {
        if (isAuthenticated) {
          globalNavigationRef.navigate('ChildrenList');
        }
        return;
      }

      // munpa://marketplace
      if (parts[0] === 'marketplace' && parts.length === 1) {
        if (isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', { screen: 'MunpaMarket' });
        }
        return;
      }

      // munpa://recommendations/detail?recommendationId=RECOMMENDATION_ID
      if (parts[0] === 'recommendations' && parts[1] === 'detail') {
        const recommendationId = parts[2] || (queryParams as any).recommendationId;
        if (recommendationId && isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', {
            screen: 'Recommendations',
            params: {
              screen: 'RecommendationDetail',
              params: { recommendationId },
            },
          });
        }
        return;
      }

      // munpa://communities/detail?communityId=COMMUNITY_ID
      if (parts[0] === 'communities' && parts[1] === 'detail') {
        const communityId = parts[2] || (queryParams as any).communityId;
        if (communityId && isAuthenticated) {
          globalNavigationRef.navigate('MainTabs', {
            screen: 'Communities',
            params: {
              screen: 'CommunityPosts',
              params: { communityId },
            },
          });
        }
        return;
      }

      // munpa://share-child/{token} o https://munpa.online/share-child/{token}
      if (parts[0] === 'share-child' && parts[1]) {
        const token = parts[1];
        
        if (isAuthenticated) {
          try {
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('AcceptInvitation', { token });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('AcceptInvitation', { token });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error navegando a AcceptInvitation:', error);
          }
        } else {
          // Guardar token para cuando el usuario se autentique
          await AsyncStorage.setItem('pendingShareToken', token);
        }
        return;
      }

      // munpa://post/{postId} o https://munpa.online/post/{postId}
      if (parts[0] === 'post' && parts[1]) {
        const postId = parts[1];
        
        if (isAuthenticated) {
          
          try {
            // Intentar obtener el post usando el endpoint de share que puede tener metadata
            const shareResponse = await shareContentService.sharePost(postId);
            const metadata = shareResponse.data?.metadata;
            const communityId = metadata?.communityId;
            
            
            if (communityId) {
              // Si tenemos el communityId, obtener los posts de esa comunidad y encontrar el post
              const postsResponse = await communitiesService.getCommunityPosts(communityId);
              const posts = postsResponse?.data || postsResponse || [];
              const post = Array.isArray(posts) ? posts.find((p: any) => p.id === postId) : null;
              
            if (post) {
              
              const formatDate = (date: any) => {
                if (!date) return 'Fecha no disponible';
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
                } catch {
                  return 'Fecha inválida';
                }
              };
              
              if (globalNavigationRef.isReady()) {
                globalNavigationRef.navigate('PostDetail', {
                  post,
                  communityName: metadata?.communityName || 'Comunidad',
                  formatDate,
                  onLike: () => {}, // función vacía, se puede mejorar después
                  likingPostId: null,
                });
                return;
              } else {
                setTimeout(() => {
                  if (globalNavigationRef && globalNavigationRef.isReady()) {
                    globalNavigationRef.navigate('PostDetail', {
                      post,
                      communityName: metadata?.communityName || 'Comunidad',
                      formatDate,
                      onLike: () => {},
                      likingPostId: null,
                    });
                  }
                }, 500);
                return;
              }
            } else {
                console.warn('⚠️ [DEEP LINK] Post no encontrado en la comunidad');
              }
            }
            
            // Si no tenemos communityId o no encontramos el post, navegar a la comunidad si tenemos el ID
            if (communityId) {
              if (globalNavigationRef.isReady()) {
                globalNavigationRef.navigate('MainTabs', {
                  screen: 'Communities',
                  params: {
                    screen: 'CommunityPosts',
                    params: {
                      communityId,
                      communityName: metadata?.communityName || 'Comunidad'
                    }
                  }
                });
                return;
              }
            }
            
            // Fallback: navegar a Home
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('MainTabs', {
                screen: 'Home'
              });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('MainTabs', {
                    screen: 'Home'
                  });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error obteniendo post:', error);
            console.error('❌ [DEEP LINK] Error message:', error?.message);
            // Fallback: navegar a Home
            if (globalNavigationRef && globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('MainTabs', {
                screen: 'Home'
              });
            }
          }
        }
        return;
      }

      // munpa://recommendation/{recommendationId} o https://munpa.online/recommendation/{recommendationId}
      if (parts[0] === 'recommendation' && parts[1]) {
        const recommendationId = parts[1];
        
        if (isAuthenticated) {
          // RecommendationDetail está en RecommendationsStackNavigator
          try {
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'RecommendationDetail',
                  params: { recommendationId }
                }
              });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('MainTabs', {
                    screen: 'Recommendations',
                    params: {
                      screen: 'RecommendationDetail',
                      params: { recommendationId }
                    }
                  });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error navegando a RecommendationDetail:', error);
          }
        }
        return;
      }

      // munpa://marketplace/product/{productId} o munpa://marketplace/product?productId=PRODUCT_ID
      if (parts[0] === 'marketplace' && parts[1] === 'product') {
        const productId = parts[2] || (queryParams as any).productId;
        
        if (productId && isAuthenticated) {
          try {
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('ProductDetail', { productId });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('ProductDetail', { productId });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error navegando a ProductDetail:', error);
          }
        }
        return;
      }

      // munpa://marketplace/favorites/{userId} o https://munpa.online/marketplace/favorites/{userId}
      if (parts[0] === 'marketplace' && parts[1] === 'favorites' && parts[2]) {
        const userId = parts[2];
        
        if (isAuthenticated) {
          try {
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('MarketplaceFavorites', { userId });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('MarketplaceFavorites', { userId });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error navegando a MarketplaceFavorites:', error);
          }
        }
        return;
      }

      // munpa://recommendations/favorites/{userId} o https://munpa.online/recommendations/favorites/{userId}
      if (parts[0] === 'recommendations' && parts[1] === 'favorites' && parts[2]) {
        const userId = parts[2];
        
        if (isAuthenticated) {
          try {
            if (globalNavigationRef.isReady()) {
              globalNavigationRef.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'FavoritesMap',
                  params: { userId }
                }
              });
            } else {
              setTimeout(() => {
                if (globalNavigationRef && globalNavigationRef.isReady()) {
                  globalNavigationRef.navigate('MainTabs', {
                    screen: 'Recommendations',
                    params: {
                      screen: 'FavoritesMap',
                      params: { userId }
                    }
                  });
                }
              }, 500);
            }
          } catch (error: any) {
            console.error('❌ [DEEP LINK] Error navegando a FavoritesMap:', error);
          }
        }
        return;
      }

      console.warn('⚠️ [DEEP LINK] URL no reconocida:', url);
    } catch (error) {
      console.error('❌ [DEEP LINK] Error procesando deep link:', error);
    }
};

export const useDeepLinking = () => {
  const { isAuthenticated } = useAuth();

  // Actualizar el estado de autenticación global
  useEffect(() => {
    currentIsAuthenticated = isAuthenticated;
  }, [isAuthenticated]);

  const handleDeepLink = useCallback(async (url: string) => {
    
    // Si no tenemos el navigationRef aún, guardar el deep link para procesarlo después
    if (!globalNavigationRef) {
      pendingDeepLink = url;
      return;
    }
    
    // Si el usuario no está autenticado, guardar el deep link (excepto para share-child que puede funcionar sin auth)
    if (!isAuthenticated && !url.includes('share-child')) {
      pendingDeepLink = url;
      return;
    }
    
    handleDeepLinkInternal(url, isAuthenticated);
  }, [isAuthenticated]);

  useEffect(() => {
    
    // Manejar deep link cuando la app ya está abierta
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleDeepLink(url);
    });

    // Manejar deep link cuando la app se abre desde cerrada
    Linking.getInitialURL().then((url) => {
      if (url) {
        // Esperar un poco para que el navigationRef esté listo
        setTimeout(() => {
          handleDeepLink(url);
        }, 500);
      } 
    }).catch((error) => {
      console.error('❌ [DEEP LINK] Error obteniendo URL inicial:', error);
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, handleDeepLink]);
};

