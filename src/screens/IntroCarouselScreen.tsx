import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  ImageSourcePropType,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import analyticsService from '../services/analyticsService';
import { borderRadius, colors, shadows, spacing, typography } from '../styles';

interface IntroCarouselScreenProps {
  navigation: any;
}

interface IntroSlide {
  id: string;
  source: ImageSourcePropType;
  accessibilityLabel: string;
  showLogo?: boolean;
}

const INTRO_SLIDES: IntroSlide[] = [
  {
    id: 'intro_1',
    source: require('../../assets/intro-1.jpg'),
    accessibilityLabel: 'Haz el seguimiento de tu bebé desde el embarazo',
    showLogo: true,
  },
  {
    id: 'intro_2',
    source: require('../../assets/intro-2.jpg'),
    accessibilityLabel: 'Descubre el desarrollo de tu bebé en sus primeros meses de vida',
    showLogo: true,
  },
  {
    id: 'intro_3',
    source: require('../../assets/intro-3.jpg'),
    accessibilityLabel: 'Registra crecimiento, nutrición, vacunas, medicina, dentición e hitos',
  },
];
const INTRO_BACKGROUND = '#F3BDD5';

const IntroCarouselScreen: React.FC<IntroCarouselScreenProps> = ({ navigation }) => {
  const flatListRef = useRef<FlatList<IntroSlide>>(null);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    analyticsService.logScreenView('IntroCarousel');
    analyticsService.logEvent('intro_carousel_viewed', {
      slide_id: INTRO_SLIDES[0].id,
    });
  }, []);

  const handleNavigate = (routeName: 'Login' | 'Signup', action: string) => {
    analyticsService.logEvent('intro_carousel_cta_pressed', {
      action,
      slide_id: INTRO_SLIDES[currentIndex]?.id,
      slide_index: currentIndex,
    });
    navigation.navigate(routeName);
  };

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    if (nextIndex !== currentIndex && INTRO_SLIDES[nextIndex]) {
      setCurrentIndex(nextIndex);
      analyticsService.logEvent('intro_carousel_slide_changed', {
        slide_id: INTRO_SLIDES[nextIndex].id,
        slide_index: nextIndex,
      });
    }
  };

  const handleNext = () => {
    if (currentIndex >= INTRO_SLIDES.length - 1) {
      handleNavigate('Signup', 'last_slide_next');
      return;
    }

    flatListRef.current?.scrollToIndex({
      index: currentIndex + 1,
      animated: true,
    });
  };

  const renderSlide: ListRenderItem<IntroSlide> = ({ item }) => {
    const footerReserve = Math.max(insets.bottom, spacing.md) + 210;
    const imageTopOffset = 76;
    const visualHeight = Math.max(500, height - footerReserve - imageTopOffset);

    return (
      <View style={[styles.slide, { width, height }]}>
        <View style={[styles.imageStage, { width, height: visualHeight, marginTop: imageTopOffset }]}>
          <Image
            source={item.source}
            style={[
              styles.slideImage,
              {
                width,
                height: visualHeight,
              },
            ]}
            resizeMode="contain"
            accessibilityLabel={item.accessibilityLabel}
            onError={(error) => {
              console.warn('No se pudo cargar imagen de intro:', item.id, error.nativeEvent);
            }}
          />
        </View>
        {item.showLogo && (
          <Image
            source={require('../../assets/munpa-logo-trimmed.png')}
            style={[styles.logo, { top: insets.top + 10 }]}
            resizeMode="contain"
            accessibilityLabel="Munpa"
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={INTRO_BACKGROUND} />

      <FlatList
        ref={flatListRef}
        style={styles.carousel}
        data={INTRO_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        removeClippedSubviews={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <TouchableOpacity
        style={[styles.skipButton, { top: insets.top + spacing.sm }]}
        onPress={() => handleNavigate('Login', 'skip')}
        activeOpacity={0.85}
      >
        <Text style={styles.skipButtonText}>Omitir</Text>
      </TouchableOpacity>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <View style={styles.progressRow}>
          <View style={styles.dotsContainer}>
            {INTRO_SLIDES.map((slide, index) => (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityLabel={currentIndex === INTRO_SLIDES.length - 1 ? 'Crear cuenta' : 'Siguiente'}
          >
            <Ionicons
              name={currentIndex === INTRO_SLIDES.length - 1 ? 'checkmark' : 'chevron-forward'}
              size={24}
              color={colors.white}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => handleNavigate('Signup', 'create_account')}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Crear cuenta</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => handleNavigate('Login', 'login')}
          activeOpacity={0.85}
        >
          <Ionicons name="log-in-outline" size={20} color="#7A8B23" />
          <Text style={styles.loginButtonText}>Ya tengo cuenta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: INTRO_BACKGROUND,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    backgroundColor: INTRO_BACKGROUND,
    alignItems: 'center',
  },
  imageStage: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    overflow: 'visible',
  },
  slideImage: {
    backgroundColor: INTRO_BACKGROUND,
  },
  logo: {
    position: 'absolute',
    alignSelf: 'center',
    width: 140,
    height: 86,
  },
  skipButton: {
    position: 'absolute',
    right: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(45, 55, 72, 0.22)',
  },
  skipButtonText: {
    color: colors.white,
    fontFamily: 'Montserrat-SemiBold',
    fontSize: typography.sizes.sm,
  },
  footer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: INTRO_BACKGROUND,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
  },
  dotActive: {
    width: 28,
    backgroundColor: colors.white,
  },
  nextButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: '#B4C14B',
    ...shadows.base,
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: '#B4C14B',
    ...shadows.lg,
  },
  primaryButtonText: {
    color: colors.white,
    fontFamily: 'Montserrat-Bold',
    fontSize: typography.sizes.base,
    textTransform: 'uppercase',
  },
  loginButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: '#B4C14B',
    ...shadows.base,
  },
  loginButtonText: {
    color: '#7A8B23',
    fontFamily: 'Montserrat-Bold',
    fontSize: typography.sizes.base,
    textTransform: 'uppercase',
  },
});

export default IntroCarouselScreen;
