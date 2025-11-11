import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import bannerService, { Banner } from '../services/bannerService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_WIDTH = SCREEN_WIDTH - 40;
const BANNER_HEIGHT = 100; // Altura horizontal (aspect ratio ~4:1)

interface BannerCarouselProps {
  style?: any;
}

const BannerCarousel: React.FC<BannerCarouselProps> = ({ style }) => {
  const navigation = useNavigation<any>();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const viewedBannersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadBanners();

    return () => {
      // Limpiar timer al desmontar
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (banners.length > 0) {
      startAutoRotation();
    }

    return () => {
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
    };
  }, [banners]);

  const loadBanners = async () => {
    try {
      setLoading(true);
      const fetchedBanners = await bannerService.getActiveBanners();
      setBanners(fetchedBanners);
      
      // Registrar vista del primer banner
      if (fetchedBanners.length > 0) {
        registerView(fetchedBanners[0].id);
      }
    } catch (error) {
      console.error('❌ [BANNER CAROUSEL] Error cargando banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAutoRotation = () => {
    if (banners.length <= 1) return;

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
      const nextIndex = (currentIndex + 1) % banners.length;
      setCurrentIndex(nextIndex);
      
      scrollViewRef.current?.scrollTo({
        x: nextIndex * BANNER_WIDTH,
        animated: true,
      });

      // Registrar vista del nuevo banner
      const banner = banners[nextIndex];
      if (banner) {
        registerView(banner.id);
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
              // Navegar a detalle de lista específica (usando ruta anidada)
              navigation.navigate('Lists', {
                screen: 'ListDetail',
                params: { listId: linkParts[1] },
              });
            } else {
              // Navegar a la pantalla principal de listas
              navigation.navigate('Lists');
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
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < banners.length) {
      setCurrentIndex(newIndex);
      
      // Registrar vista del nuevo banner
      const banner = banners[newIndex];
      if (banner) {
        registerView(banner.id);
      }

      // Reiniciar auto-rotación con la nueva duración
      if (autoScrollTimerRef.current) {
        clearInterval(autoScrollTimerRef.current);
      }
      
      const duration = (banner?.duration || 5) * 1000;
      autoScrollTimerRef.current = setInterval(() => {
        const nextIndex = (newIndex + 1) % banners.length;
        setCurrentIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * BANNER_WIDTH,
          animated: true,
        });
        const nextBanner = banners[nextIndex];
        if (nextBanner) {
          registerView(nextBanner.id);
        }
      }, duration);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color="#59C6C0" />
      </View>
    );
  }

  if (banners.length === 0) {
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
      >
        {banners.map((banner, index) => (
          <TouchableOpacity
            key={banner.id}
            style={styles.bannerContainer}
            onPress={() => handleBannerPress(banner)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: banner.imageUrl }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Indicadores de página */}
      {banners.length > 1 && (
        <View style={styles.indicators}>
          {banners.map((_, index) => (
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
    marginVertical: 8,
  },
  loadingContainer: {
    height: BANNER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
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

