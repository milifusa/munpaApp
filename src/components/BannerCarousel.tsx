import React, { useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ActivityIndicator,
  Text,
  ImageResizeMode,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import bannerService, { Banner, BannerSection } from '../services/bannerService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40;
const BANNER_HEIGHT = 100; // Altura horizontal (aspect ratio ~4:1)

interface BannerCarouselProps {
  style?: any;
  section?: BannerSection; // NUEVO: Sección para filtrar banners
  fallbackToHome?: boolean; // Si no hay banners de la sección, mostrar banners de home
  customBanner?: ReactNode; // Banner personalizado adicional (ej: economía circular)
  imageResizeMode?: ImageResizeMode;
  bannerRadius?: number;
  scrollEnabled?: boolean;
  bannerBackgroundColor?: string;
  bannerHeight?: number;
  bannerWidth?: number; // NUEVO: Ancho personalizado del banner
  autoScroll?: boolean; // NUEVO: Controlar auto-scroll
  showIndicators?: boolean; // NUEVO: Mostrar/ocultar indicadores
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  style,
  section,
  fallbackToHome = true,
  customBanner,
  imageResizeMode = 'cover',
  bannerRadius = 12,
  scrollEnabled = true,
  bannerBackgroundColor = 'transparent',
  bannerHeight,
  bannerWidth,
  autoScroll = true,
  showIndicators = true,
}) => {
  const resolvedBannerHeight = bannerHeight ?? BANNER_HEIGHT;
  const resolvedBannerWidth = bannerWidth ?? BANNER_WIDTH;
  const navigation = useNavigation<any>();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Calcular el índice del banner personalizado
  const customBannerIndex = customBanner ? banners.length : -1;
  const totalItems = banners.length + (customBanner ? 1 : 0);
  const viewedBannersRef = useRef<Set<string>>(new Set());

  // Si solo hay 1 banner en home1, hacerlo más grande
  const shouldEnlargeSingleBanner = (section === 'home1') && banners.length === 1;
  const finalBannerWidth = shouldEnlargeSingleBanner ? SCREEN_WIDTH - 40 : resolvedBannerWidth;
  const finalBannerHeight = shouldEnlargeSingleBanner ? (resolvedBannerHeight * 1.3) : resolvedBannerHeight;

  const lastReloadAtRef = useRef(0);

  // Recargar banners cada vez que la pantalla reciba el foco
  // Esto permite verificar si se activaron o desactivaron banners
  useFocusEffect(
    useCallback(() => {
      
      // Función para recargar banners
      const reloadBanners = async () => {
        const now = Date.now();
        if (now - lastReloadAtRef.current < 5000) return;
        lastReloadAtRef.current = now;
        try {
          setLoading(true);
          let fetchedBanners = await bannerService.getActiveBanners(section);
          
          // Si no hay banners y hay fallback a home, intentar cargar banners de home
          if (fetchedBanners.length === 0 && fallbackToHome && section && section !== 'home') {
            const homeBanners = await bannerService.getActiveBanners('home');
            if (homeBanners.length > 0) {
              fetchedBanners = homeBanners;
            }
          } else if (fetchedBanners.length === 0 && !fallbackToHome) {
            console.log('⚠️ [BANNER CAROUSEL] No hay banners para', section, 'y fallbackToHome está desactivado, no se mostrará nada');
          }
          
          setBanners(fetchedBanners);
          
          // Registrar vista del primer banner
          if (fetchedBanners.length > 0) {
            viewedBannersRef.current.clear(); // Limpiar vistas previas para registrar de nuevo
            // Registrar vista del primer banner
            const firstBannerId = fetchedBanners[0].id;
            if (!viewedBannersRef.current.has(firstBannerId)) {
              viewedBannersRef.current.add(firstBannerId);
              bannerService.registerView(firstBannerId);
            }
          } else {
            console.log('⚠️ [BANNER CAROUSEL] No hay banners para mostrar en la sección:', section || 'todas');
          }
        } catch (error) {
          console.error('❌ [BANNER CAROUSEL] Error cargando banners:', error);
        } finally {
          setLoading(false);
        }
      };
      
      reloadBanners();

      return () => {
        // Limpiar timer cuando la pantalla pierda el foco
        if (autoScrollTimerRef.current) {
          clearInterval(autoScrollTimerRef.current);
        }
      };
    }, [section, fallbackToHome])
  );

  useEffect(() => {
    if (totalItems > 0 && autoScroll) {
      startAutoRotation();
    }

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [banners, customBanner, totalItems, autoScroll]);

  const startAutoRotation = () => {
    // Solo auto-rotar si autoScroll está activado y hay más de un item
    if (!autoScroll) return;
    if (totalItems <= 1) return;
    if (currentIndex >= banners.length) return; // No auto-rotar si estamos en el banner personalizado

    // Limpiar timer anterior
    if (autoScrollTimerRef.current) {
      clearInterval(autoScrollTimerRef.current);
    }

    // Obtener duración del banner actual
    const getCurrentBannerDuration = () => {
      const banner = banners[currentIndex];
      return (banner?.duration || 5) * 1000; // Convertir a milisegundos
    };

    // Función para avanzar al siguiente banner
    const nextBanner = () => {
      const nextIndex = (currentIndex + 1) % totalItems;
      setCurrentIndex(nextIndex);
      
      scrollViewRef.current?.scrollTo({
        x: nextIndex * resolvedBannerWidth,
        animated: true,
      });

      // Registrar vista solo si es un banner real
      if (nextIndex < banners.length) {
        const banner = banners[nextIndex];
        if (banner) {
          registerView(banner.id);
        }
      }
    };

    // Iniciar auto-rotación
    autoScrollTimerRef.current = setInterval(() => {
      nextBanner();
    }, getCurrentBannerDuration());
  };

  const registerView = (bannerId: string) => {
    // Solo registrar una vez por banner
    if (!viewedBannersRef.current.has(bannerId)) {
      viewedBannersRef.current.add(bannerId);
      bannerService.registerView(bannerId);
    }
  };

  const handleBannerPress = async (banner: Banner) => {
    console.log('🎯 [BANNER] Click en banner:', JSON.stringify(banner, null, 2));
    
    // Registrar click
    await bannerService.registerClick(banner.id);

    // Mostrar alerta para el banner específico de "Consulta a un Pediatra"
    if (banner.id === 'AyXkG5GFtrvt6U5WanvI') {
      Alert.alert(
        'Próximamente',
        'Consulta un doctor a través de Munpa',
        [{ text: 'OK' }]
      );
      return;
    }

    // Manejar banners de tipo "event"
    if (banner.type === 'event') {
      console.log('🎉 [BANNER] Banner de tipo evento detectado');
      // Usar eventId si existe, si no, usar el id del banner como postId
      const postId = banner.eventId || banner.id;
      console.log('🎉 [BANNER] Navegando a evento con postId:', postId);
      
      // EventDetail está en el HomeStackNavigator
      // Navegar directamente - React Navigation manejará la navegación anidada
      try {
        (navigation as any).navigate('Home', {
          screen: 'EventDetail',
          params: { postId }
        });
      } catch (error) {
        console.error('❌ [BANNER] Error navegando a evento:', error);
      }
      return;
    }

    // Manejar linkType para navegación a pantallas específicas
    if (banner.linkType) {
      switch (banner.linkType) {
        case 'denticion':
          navigation.navigate('TeethingTracker');
          return;
        case 'crecimiento':
          navigation.navigate('Growth');
          return;
        case 'hitos':
          navigation.navigate('Development');
          return;
        case 'medicacion':
          navigation.navigate('Medications');
          return;
        case 'vacunas':
          // Navegar a ChildProfile que contiene las vacunas
          // Nota: Necesitarás pasar el childId apropiado
          navigation.navigate('ChildProfile');
          return;
        case 'solicitud-servicio':
          navigation.navigate('ServiceRequest');
          return;
        case 'recommendation-category':
          // Ya manejado abajo con recommendationCategoryId
          break;
        default:
          console.warn('⚠️ [BANNER] linkType no reconocido:', banner.linkType);
      }
    }

    // Si tiene articleId, navegar a la pantalla de detalle del artículo
    if (banner.articleId) {
      navigation.navigate('ArticleDetail', {
        articleId: banner.articleId,
      });
      return;
    }

    // Si tiene articleCategoryId, navegar a la pantalla de artículos
    if (banner.articleCategoryId) {
      navigation.navigate('Articles', {
        categoryId: banner.articleCategoryId,
        categoryName: banner.title || 'Artículos',
      });
      return;
    }

    // Si tiene recommendationCategoryId o linkType es "recommendation-category", navegar a categoría de recomendaciones
    if (banner.recommendationCategoryId || banner.linkType === 'recommendation-category') {
      const categoryId = banner.recommendationCategoryId;
      if (categoryId) {
        // Navegar al tab de Recommendations a través de MainTabs
        try {
          // Intentar obtener el navegador raíz que tiene acceso a MainTabs
          let currentNav: any = navigation;
          let rootNav = navigation;
          
          // Subir hasta encontrar el navegador que puede acceder a 'MainTabs'
          while (currentNav) {
            const state = currentNav.getState();
            if (state?.routeNames?.includes('MainTabs')) {
              rootNav = currentNav;
              break;
            }
            currentNav = currentNav.getParent();
            if (!currentNav) {
              // Si no hay más padres, usar el último navegador encontrado
              rootNav = navigation.getParent() || navigation;
              break;
            }
          }
          
          // Navegar a MainTabs -> Recommendations -> CategoryRecommendations
          rootNav.navigate('MainTabs', {
            screen: 'Recommendations',
            params: {
              screen: 'CategoryRecommendations',
              params: { 
                categoryId: categoryId,
                categoryName: banner.title || 'Recomendaciones',
              },
            },
          });
        } catch (error) {
          console.error('❌ [BANNER] Error navegando a categoría de recomendaciones:', error);
        }
        return;
      }
    }

    // Navegar si tiene link
    if (banner.link) {
      try {
        // Parsear el link (ej: "/marketplace/category/carriolas")
        const linkParts = banner.link.split('/').filter(Boolean);
        
        if (linkParts.length > 0) {
          const route = linkParts[0]; // "marketplace", "communities", "lists", "recommendations", etc.
          
          // Navegar según el tipo de link
          if (route === 'marketplace') {
            if (linkParts[1] === 'product' && linkParts[2]) {
              // Navegar a detalle de producto (usando ruta anidada)
              navigation.navigate('ProductDetail', { productId: linkParts[2] });
            } else if (linkParts[1] === 'create') {
              // Navegar a crear producto (usando ruta anidada)
              navigation.navigate('CreateProduct');
            } else if (linkParts[1] === 'category' && linkParts[2]) {
              // Navegar a marketplace con categoría
              navigation.navigate('MunpaMarket', { category: linkParts[2] });
            } else {
              navigation.navigate('MunpaMarket');
            }
          } else if (route === 'communities') {
            if (linkParts[1] === 'posts' && linkParts[2]) {
              // Navegar a posts de comunidad específica (usando ruta anidada)
              navigation.navigate('Communities', {
                screen: 'CommunityPosts',
                params: { communityId: linkParts[2] },
              });
            } else if (linkParts[1] === 'create-post' && linkParts[2]) {
              // Navegar a crear post en comunidad (usando ruta anidada)
              navigation.navigate('Communities', {
                screen: 'CreatePost',
                params: { communityId: linkParts[2] },
              });
            } else {
              // Navegar a la pantalla principal de comunidades
              navigation.navigate('Communities');
            }
          } else if (route === 'lists') {
            // Encontrar el navegador que tiene acceso a MainTabs
            let currentNav: any = navigation;
            let rootNav = navigation;
            
            while (currentNav) {
              const state = currentNav.getState();
              if (state?.routeNames?.includes('MainTabs')) {
                rootNav = currentNav;
                break;
              }
              currentNav = currentNav.getParent();
              if (!currentNav) {
                rootNav = navigation.getParent() || navigation;
                break;
              }
            }
            
            if (linkParts[1]) {
              // Navegar a detalle de lista (ahora dentro de Recommendations)
              rootNav.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'ListDetail',
                  params: { listId: linkParts[1] },
                },
              });
            } else {
              // Navegar a listas dentro de Recommendations
              rootNav.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'ListsMain',
                },
              });
            }
          } else if (route === 'recommendations') {
            // Encontrar el navegador que tiene acceso a MainTabs
            let currentNav: any = navigation;
            let rootNav = navigation;
            
            while (currentNav) {
              const state = currentNav.getState();
              if (state?.routeNames?.includes('MainTabs')) {
                rootNav = currentNav;
                break;
              }
              currentNav = currentNav.getParent();
              if (!currentNav) {
                rootNav = navigation.getParent() || navigation;
                break;
              }
            }
            
            if (linkParts[1] === 'category' && linkParts[2]) {
              // Navegar a recomendaciones por categoría (usando ruta anidada)
              rootNav.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'CategoryRecommendations',
                  params: { category: linkParts[2] },
                },
              });
            } else if (linkParts[1]) {
              // Navegar a detalle de recomendación específica (usando ruta anidada)
              rootNav.navigate('MainTabs', {
                screen: 'Recommendations',
                params: {
                  screen: 'RecommendationDetail',
                  params: { recommendationId: linkParts[1] },
                },
              });
            } else {
              // Navegar a la pantalla principal de recomendaciones
              rootNav.navigate('MainTabs', {
                screen: 'Recommendations',
              });
            }
          } else {
            // Intentar navegar directamente
            navigation.navigate(banner.link);
          }
        }
      } catch (error) {
        console.error('❌ [BANNER CAROUSEL] Error navegando:', error);
      }
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / finalBannerWidth);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalItems) {
      setCurrentIndex(newIndex);
      
      // Registrar vista del nuevo banner solo si no es el banner personalizado
      if (newIndex < banners.length) {
        const banner = banners[newIndex];
        if (banner) {
          registerView(banner.id);
        }
      }

      // Reiniciar auto-rotación con la nueva duración (solo para banners reales y si autoScroll está activado)
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
      
      // Solo auto-rotar si autoScroll está activado, hay más de un item y no estamos en el banner personalizado
      if (autoScroll && totalItems > 1 && newIndex < banners.length) {
        const banner = banners[newIndex];
        const duration = (banner?.duration || 5) * 1000;
        autoScrollTimerRef.current = setInterval(() => {
          const nextIndex = (newIndex + 1) % totalItems;
          setCurrentIndex(nextIndex);
          scrollViewRef.current?.scrollTo({
            x: nextIndex * finalBannerWidth,
            animated: true,
          });
          // Registrar vista si es un banner real
          if (nextIndex < banners.length) {
            const nextBanner = banners[nextIndex];
            if (nextBanner) {
              registerView(nextBanner.id);
            }
          }
        }, duration);
      }
    }
  };

  if (loading && banners.length === 0 && !customBanner) {
    return null;
  }

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={[styles.loadingContainer, { height: resolvedBannerHeight }]}>
          <ActivityIndicator size="large" color="#59C6C0" />
        </View>
      </View>
    );
  }

  // Si no hay banners ni banner personalizado, no mostrar nada
  if (banners.length === 0 && !customBanner) {
    console.log('⚠️ [BANNER CAROUSEL] No hay banners para mostrar, retornando null');
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={finalBannerWidth}
        snapToAlignment="center"
        contentContainerStyle={[
          styles.scrollContent,
          shouldEnlargeSingleBanner && { paddingLeft: 20, paddingRight: 20, paddingVertical: 12 }
        ]}
        scrollEnabled={scrollEnabled}
      >
        {/* Banners del backend */}
        {banners.map((banner, index) => {
          const wrapperMarginLeft = shouldEnlargeSingleBanner ? 0 : (index === 0 ? 20 : 0);
          
          return (
            <View 
              key={banner.id} 
              style={[
                styles.bannerWrapper,
                { marginLeft: wrapperMarginLeft }
              ]}
            >
              {/* Línea decorativa morada detrás - Solo si hay más de 1 banner */}
              {banners.length > 1 && <View style={styles.decorativeLine} />}
            
            <TouchableOpacity
              style={[
                styles.bannerContainer,
                {
                  width: finalBannerWidth,
                  height: finalBannerHeight,
                  borderRadius: bannerRadius,
                  backgroundColor: bannerBackgroundColor === 'transparent' ? '#FFFFFF' : bannerBackgroundColor,
                  overflow: 'hidden',
                },
              ]}
              onPress={() => handleBannerPress(banner)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: banner.imageUrl }}
                style={styles.bannerImage}
                resizeMode={imageResizeMode}
              />
            </TouchableOpacity>
          </View>
          );
        })}
        
        {/* Banner personalizado (ej: economía circular) */}
        {customBanner && (
          <View style={[styles.customBannerContainer, { width: finalBannerWidth }]}>
            {customBanner}
          </View>
        )}
      </ScrollView>

      {/* Indicadores de página */}
      {showIndicators && totalItems > 1 && (
        <View style={styles.indicators}>
          {Array.from({ length: totalItems }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentIndex && styles.indicatorActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical:10,
  },
  loadingContainer: {
    height: BANNER_HEIGHT,
  },
  scrollContent: {
    paddingLeft: 0,
    paddingRight: 20,
    paddingVertical: 12,
    gap: 16, 
  },
  bannerWrapper: {
    position: 'relative',
    marginRight: 0,
    // Sombra para iOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    // Sombra para Android
    elevation: 8,
  },
  decorativeLine: {
    position: 'absolute',
    top: '50%',
    left: -10,
    right: -10,
    height: 25,
    zIndex: -1,
    transform: [{ translateY: -4 }],
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  customBannerContainer: {
    width: BANNER_WIDTH,
    marginRight: 0,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#59C6C0',
    width: 20,
  },
});

export default BannerCarousel;

