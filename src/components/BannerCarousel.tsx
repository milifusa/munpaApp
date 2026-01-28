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
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({
  style,
  section,
  fallbackToHome = true,
  customBanner,
  imageResizeMode = 'cover',
  bannerRadius = 12,
  scrollEnabled = true,
  bannerBackgroundColor = '#f0f0f0',
}) => {
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

  // Cargar banners cuando cambie la sección o el fallback
  useEffect(() => {
    loadBanners();

    return () => {
      // Limpiar timer al desmontar
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [section, fallbackToHome]); // Recargar cuando cambie la sección o el fallback

  // Recargar banners cada vez que la pantalla reciba el foco
  // Esto permite verificar si se activaron o desactivaron banners
  useFocusEffect(
    useCallback(() => {
      
      // Función para recargar banners
      const reloadBanners = async () => {
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
    if (totalItems > 0) {
      startAutoRotation();
    }

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [banners, customBanner, totalItems]);

  const loadBanners = async () => {
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
        registerView(fetchedBanners[0].id);
      } else {
        console.log('⚠️ [BANNER CAROUSEL] No hay banners para mostrar en la sección:', section || 'todas');
      }
    } catch (error) {
      console.error('❌ [BANNER CAROUSEL] Error cargando banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAutoRotation = () => {
    // Solo auto-rotar si hay más de un item y no estamos en el banner personalizado
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
        x: nextIndex * BANNER_WIDTH,
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
    // Registrar click
    await bannerService.registerClick(banner.id);

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
            if (linkParts[1]) {
              // Navegar a detalle de lista (ahora dentro de Recommendations)
              navigation.navigate('Recommendations', {
                screen: 'ListDetail',
                params: { listId: linkParts[1] },
              });
            } else {
              // Navegar a listas dentro de Recommendations
              navigation.navigate('Recommendations', {
                screen: 'ListsMain',
              });
            }
          } else if (route === 'recommendations') {
            if (linkParts[1] === 'category' && linkParts[2]) {
              // Navegar a recomendaciones por categoría (usando ruta anidada)
              navigation.navigate('Recommendations', {
                screen: 'CategoryRecommendations',
                params: { category: linkParts[2] },
              });
            } else if (linkParts[1]) {
              // Navegar a detalle de recomendación específica (usando ruta anidada)
              navigation.navigate('Recommendations', {
                screen: 'RecommendationDetail',
                params: { recommendationId: linkParts[1] },
              });
            } else {
              // Navegar a la pantalla principal de recomendaciones
              navigation.navigate('Recommendations');
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
    const newIndex = Math.round(offsetX / BANNER_WIDTH);
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < totalItems) {
      setCurrentIndex(newIndex);
      
      // Registrar vista del nuevo banner solo si no es el banner personalizado
      if (newIndex < banners.length) {
        const banner = banners[newIndex];
        if (banner) {
          registerView(banner.id);
        }
      }

      // Reiniciar auto-rotación con la nueva duración (solo para banners reales)
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
      
      // Solo auto-rotar si hay más de un item y no estamos en el banner personalizado
      if (totalItems > 1 && newIndex < banners.length) {
        const banner = banners[newIndex];
        const duration = (banner?.duration || 5) * 1000;
        autoScrollTimerRef.current = setInterval(() => {
          const nextIndex = (newIndex + 1) % totalItems;
          setCurrentIndex(nextIndex);
          scrollViewRef.current?.scrollTo({
            x: nextIndex * BANNER_WIDTH,
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
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#59C6C0" />
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
        snapToInterval={BANNER_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={scrollEnabled}
      >
        {/* Banners del backend */}
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            style={[
              styles.bannerContainer,
              {
                borderRadius: bannerRadius,
                overflow: bannerRadius ? 'hidden' : 'visible',
                backgroundColor: bannerBackgroundColor,
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
        ))}
        
        {/* Banner personalizado (ej: economía circular) */}
        {customBanner && (
          <View style={styles.customBannerContainer}>
            {customBanner}
          </View>
        )}
      </ScrollView>

      {/* Indicadores de página */}
      {totalItems > 1 && (
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
    marginVertical: 4,
  },
  loadingContainer: {
    height: BANNER_HEIGHT,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  bannerContainer: {
    width: BANNER_WIDTH,
    height: BANNER_HEIGHT,
    marginRight: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
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

