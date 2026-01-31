import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
  StatusBar,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, DrawerActions, useFocusEffect } from "@react-navigation/native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "../contexts/AuthContext";
import {
  childrenService,
  profileService,
  activitiesService,
  recommendationsService,
  marketplaceService,
  communitiesService,
  guideService,
  faqService,
  categoriesService,
  locationsService,
  authService,
} from "../services/api";
import { imageUploadService } from "../services/imageUploadService";
import notificationService from "../services/notificationService";
import analyticsService from "../services/analyticsService";
import learningService from "../services/learning-service";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles/globalStyles";
import { useFonts } from "../hooks/useFonts";
import { useLocation } from "../hooks/useLocation";
import BannerCarousel from "../components/BannerCarousel";
import { LinearGradient } from "expo-linear-gradient";

const WHITE_NOISE_LOCAL = require("../../assets/whitenoise.mp3");
const WHITE_NOISE_URLS = [
  "https://cdn.pixabay.com/audio/2022/03/15/audio_0c3a1a9ea6.mp3",
  "https://cdn.pixabay.com/audio/2022/02/23/audio_5d01c5d8b1.mp3",
];
const WHITE_NOISE_LOAD_TIMEOUT_MS = 20000;
const POPULAR_POST_CARD_WIDTH = Dimensions.get('window').width * 0.8;

// Función helper para formatear duración en minutos
const formatDuration = (totalMinutes: number, showSeconds: boolean = false): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  
  if (showSeconds) {
    // Para mostrar tiempo con segundos (tiempo transcurrido en tiempo real)
    const totalSeconds = Math.floor(totalMinutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    } else {
      return `${m}m ${s.toString().padStart(2, '0')}s`;
    }
  }
  
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

const formatTimeAgo = (dateValue?: string): string => {
  if (!dateValue) return '';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return 'hace unos segundos';
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `hace ${diffDays} días`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `hace ${diffWeeks} semanas`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `hace ${diffMonths} meses`;
  const diffYears = Math.floor(diffDays / 365);
  return `hace ${diffYears} años`;
};

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  birthDate?: string | null;
  dueDate?: string | null;
  photoUrl?: string | null;
  createdAt: any;
  // Campos calculados por el backend
  currentAgeInMonths?: number | null;
  currentGestationWeeks?: number | null;
  registeredAgeInMonths?: number | null;
  registeredGestationWeeks?: number | null;
  daysSinceCreation?: number;
  isOverdue?: boolean;
}

interface TodayRecommendation {
  id: string;
  name: string;
  imageUrl?: string;
  distance?: number;
  cityName?: string;
  countryName?: string;
  city?: string;
  country?: string;
  averageRating?: number;
  rating?: number;
  stats?: {
    averageRating?: number;
  };
}

interface TodayProduct {
  id: string;
  title?: string;
  name?: string;
  images?: string[];
  imageUrl?: string;
  distance?: number;
}

interface TodayCommunityPost {
  id: string;
  content?: string;
  imageUrl?: string;
  authorName?: string;
  communityId?: string;
  likeCount?: number;
  commentCount?: number;
  createdAt?: string;
}

interface TodayGuide {
  title?: string;
  subtitle?: string;
  description?: string;
  tip?: string;
  weeks?: number;
  isPregnant?: boolean;
  source?: string;
}


// Constantes para las caritas por defecto (fuera del componente para mejor rendimiento)
const CARITA_1 = require("../../assets/caritas1.png");
const CARITA_2 = require("../../assets/caritas2.png");
const CARITA_3 = require("../../assets/caritas3.png");
const CARITAS = [CARITA_1, CARITA_2, CARITA_3];

const HomeScreen: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Cargar fuentes personalizadas
  const fontsLoaded = useFonts();



  const [activitySuggestions, setActivitySuggestions] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);

  // Recomendaciones cercanas para pestaña Hoy
  const [todayRecommendations, setTodayRecommendations] = useState<TodayRecommendation[]>([]);
  const [loadingTodayRecommendations, setLoadingTodayRecommendations] = useState(false);
  const [todayRecommendationsError, setTodayRecommendationsError] = useState<string | null>(null);

  const [todayMarketProducts, setTodayMarketProducts] = useState<TodayProduct[]>([]);
  const [loadingTodayMarket, setLoadingTodayMarket] = useState(false);
  const [todayMarketError, setTodayMarketError] = useState<string | null>(null);

  const [todayCommunityPosts, setTodayCommunityPosts] = useState<TodayCommunityPost[]>([]);
  const [loadingTodayCommunityPosts, setLoadingTodayCommunityPosts] = useState(false);
  const [todayCommunityError, setTodayCommunityError] = useState<string | null>(null);

  const [todayGuide, setTodayGuide] = useState<TodayGuide | null>(null);
  const [loadingTodayGuide, setLoadingTodayGuide] = useState(false);
  const [todayGuideError, setTodayGuideError] = useState<string | null>(null);
  const [todayFaqQuestions, setTodayFaqQuestions] = useState<string[]>([]);
  const [loadingTodayFaq, setLoadingTodayFaq] = useState(false);

  const [showActivityDetailModal, setShowActivityDetailModal] = useState(false);
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<any>(null);

  const {
    latitude: todayLat,
    longitude: todayLon,
    loading: todayLocationLoading,
    error: todayLocationError,
    permissionGranted: todayLocationGranted,
    getCurrentLocation,
  } = useLocation();

  const formatActivityFieldLabel = (key: string) => {
    const normalized = key.replace(/_/g, ' ').toLowerCase();
    const map: Record<string, string> = {
      description: 'Descripcion',
      duration: 'Duracion',
      durationmin: 'Duracion',
      materials: 'Materiales',
      steps: 'Pasos',
      tips: 'Consejos',
      benefits: 'Beneficios',
      age: 'Edad recomendada',
      agerange: 'Edad recomendada',
      category: 'Categoria',
      location: 'Lugar',
      time: 'Tiempo',
    };
    if (map[normalized]) return map[normalized];
    return normalized.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatActivityFieldValue = (value: any) => {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };
  
  // Refs para scroll
  const scrollViewRef = useRef<ScrollView>(null);
  const activitiesSectionRef = useRef<View>(null);
  const todayActivitiesRef = useRef<View>(null);
  const [now, setNow] = useState(new Date());
  const [showWhiteNoiseModal, setShowWhiteNoiseModal] = useState(false);
  const [whiteNoiseSound, setWhiteNoiseSound] = useState<Audio.Sound | null>(null);
  const [whiteNoisePlaying, setWhiteNoisePlaying] = useState(false);
  const [whiteNoiseLoading, setWhiteNoiseLoading] = useState(false);
  const [whiteNoiseDurationMinutes, setWhiteNoiseDurationMinutes] = useState<number | null>(30);
  const [whiteNoiseTimer, setWhiteNoiseTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [whiteNoiseError, setWhiteNoiseError] = useState<string | null>(null);
  const lastLocationSyncRef = useRef<string | null>(null);
  const [isLocationReady, setIsLocationReady] = useState(false);
  const lastTodayLoadKeyRef = useRef<string | null>(null);
  const todayLoadInFlightRef = useRef(false);
  const activitySuggestionsInFlightRef = useRef(false);
  const lastActivitySuggestionsChildRef = useRef<string | null>(null);
  const loadDataInFlightRef = useRef(false);
  const lastLoadDataAtRef = useRef(0);

  useEffect(() => {
    loadData();
    loadUserProfile();
    
    // Configurar handler de respuestas a notificaciones
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {});
    
    return () => {
      subscription.remove();
    };
  }, []);

  // Recargar datos cuando la pantalla reciba foco (ej: después de cambiar ubicación)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Home screen focused, reloading data...');
      loadData();
      loadUserProfile();
    }, [])
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Refrescar datos cuando se regrese a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      console.log('🏠 [HOME] Pantalla enfocada, recargando datos...');
      loadData();
      
      // Registrar token de notificaciones cada vez que se regrese al home
      console.log('🔔 [HOME] Registrando token de notificaciones...');
      notificationService.registerToken().catch((error) => {
        console.error('❌ [HOME] Error registrando token:', error);
      });
    });

    return unsubscribe;
  }, [navigation]);

  // Escuchar cambios del hijo seleccionado desde el header
  useEffect(() => {
    const checkSelectedChild = async () => {
      const savedChildId = await AsyncStorage.getItem('selectedChildId');
      if (savedChildId && savedChildId !== selectedChild?.id && children.length > 0) {
        const child = children.find((c: Child) => c.id === savedChildId);
        if (child) {
          console.log('🔄 [HOME] Cambiando hijo seleccionado desde header:', child.name);
          setSelectedChild(child);
        }
      }
    };

    checkSelectedChild();
    // No usar setInterval, solo verificar cuando cambian las dependencias
  }, [children]);

  useEffect(() => {
    const handleHeaderSelection = async () => {
      const savedChildId = await AsyncStorage.getItem('selectedChildId');
      if (savedChildId && savedChildId !== selectedChild?.id && children.length > 0) {
        const child = children.find((c: Child) => c.id === savedChildId);
        if (child) {
          console.log('🔄 [HOME] Hijo seleccionado desde header:', child.name);
          setSelectedChild(child);
        }
      }
    };

    if (route?.params?.refresh || route?.params?.selectedChildId) {
      handleHeaderSelection();
    }
  }, [route?.params?.refresh, route?.params?.selectedChildId, children, selectedChild?.id]);

  // 🔔 Iniciar verificaciones periódicas de notificaciones cuando hay hijo seleccionado
  useEffect(() => {
    if (selectedChild?.id) {
      console.log('🔄 [HOME] Hijo seleccionado:', selectedChild.name);
      // Ya no se programan notificaciones de sueño
    }
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!selectedChild) return;
    setIsLocationReady(false);
  }, [selectedChild?.id]);

  useEffect(() => {
    if (!selectedChild) return;
    if (!todayLat || !todayLon) {
      if (todayLocationLoading) return;
      if (!todayLocationGranted || todayLocationError) {
        setIsLocationReady(true);
        return;
      }
      getCurrentLocation();
      return;
    }
    const run = async () => {
      if (todayLocationGranted) {
        const locationKey = `${todayLat.toFixed(4)}|${todayLon.toFixed(4)}`;
        if (lastLocationSyncRef.current !== locationKey) {
          lastLocationSyncRef.current = locationKey;
          
          // Solo actualizar la ubicación automáticamente si el usuario NO tiene ciudad ni país
          // Si ya tiene ubicación configurada, debe cambiarla manualmente desde el header
          if (!profile?.cityName && !profile?.countryName) {
            console.log('📍 Usuario sin ubicación, sincronizando automáticamente...');
            await syncUserLocation(todayLat, todayLon);
            // Recargar el perfil después de sincronizar
            await loadUserProfile();
          } else {
            console.log('📍 Usuario ya tiene ubicación configurada:', {
              city: profile?.cityName,
              country: profile?.countryName
            });
          }
        }
      }
      setIsLocationReady(true);
    };
    run();
  }, [selectedChild, todayLat, todayLon, todayLocationLoading, todayLocationGranted, todayLocationError]);

  useEffect(() => {
    if (!selectedChild || !isLocationReady) return;
    const loadKey = `${selectedChild.id}|${todayLat?.toFixed(4) || 'na'}|${todayLon?.toFixed(4) || 'na'}`;
    if (todayLoadInFlightRef.current) return;
    if (lastTodayLoadKeyRef.current === loadKey) return;

    const loadAll = async () => {
      try {
        todayLoadInFlightRef.current = true;
        lastTodayLoadKeyRef.current = loadKey;
        await Promise.allSettled([
          loadTodayRecommendations(),
          loadTodayMarket(),
          loadTodayCommunityPosts(),
          loadActivitySuggestions(selectedChild.id),
          loadTodayGuide(selectedChild),
          loadTodayFaq(selectedChild.id),
        ]);
      } finally {
        todayLoadInFlightRef.current = false;
      }
    };
    loadAll();
  }, [selectedChild, todayLat, todayLon, todayLocationLoading, isLocationReady]);

  const loadData = async () => {
    if (loadDataInFlightRef.current) return;
    const nowTs = Date.now();
    if (nowTs - lastLoadDataAtRef.current < 5000) return;
    loadDataInFlightRef.current = true;
    lastLoadDataAtRef.current = nowTs;
    try {
      setLoading(true);

      // Cargar hijos
      const childrenResponse = await childrenService.getChildren();

      if (childrenResponse.success && childrenResponse.data) {
        setChildren(childrenResponse.data);
        
        // Cargar el hijo seleccionado desde AsyncStorage
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect = null;
        
        if (savedChildId) {
          childToSelect = childrenResponse.data.find((c: Child) => c.id === savedChildId);
        }
        
        // Si no hay hijo guardado o no se encuentra, seleccionar el primero
        if (!childToSelect && childrenResponse.data.length > 0) {
          childToSelect = childrenResponse.data[0];
          await AsyncStorage.setItem('selectedChildId', childToSelect.id);
        }
        
        if (childToSelect) {
          setSelectedChild(childToSelect);
        }
      } else {
        console.log("ℹ️ No hay hijos registrados o respuesta vacía");
        setChildren([]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      // No mostrar alerta para errores 500, solo log
      if ((error as any)?.response?.status !== 500) {
        Alert.alert("Error", "No se pudieron cargar los datos de los hijos");
      }
      setChildren([]);
    } finally {
      setLoading(false);
      loadDataInFlightRef.current = false;
    }
  };

  const loadUserProfile = async () => {
    try {
      if (user?.id) {
        const profileResponse = await profileService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          console.log('📍 Perfil cargado en Home:', {
            city: profileResponse.data.cityName,
            country: profileResponse.data.countryName,
          });
          // Actualizar el contexto de usuario
          // @ts-ignore
          setUser((prevUser: any) => ({
            ...prevUser!,
            ...profileResponse.data,
          }));
          // Actualizar el estado local del perfil
          setProfile(profileResponse.data);
        }
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  // Función para cargar sugerencias de actividades
  const loadActivitySuggestions = async (childId: string) => {
    if (activitySuggestionsInFlightRef.current) return;
    if (lastActivitySuggestionsChildRef.current === childId && activitySuggestions) return;
    try {
      activitySuggestionsInFlightRef.current = true;
      setLoadingActivities(true);
      
      const response = await activitiesService.getActivitySuggestions(childId);
      
      if (response.success) {
        setActivitySuggestions(response);
        lastActivitySuggestionsChildRef.current = childId;
      }
    } catch (error) {
      console.error('❌ [ACTIVITIES] Error cargando sugerencias:', error);
      setActivitySuggestions(null);
    } finally {
      activitySuggestionsInFlightRef.current = false;
      setLoadingActivities(false);
    }
  };

  const loadTodayRecommendations = async () => {
    if (!todayLat || !todayLon) return;

    try {
      setLoadingTodayRecommendations(true);
      setTodayRecommendationsError(null);

      const response = await recommendationsService.getNearbyTop({
        latitude: todayLat,
        longitude: todayLon,
        radius: 1000000,
        limit: 3,
      });

      const items =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        (Array.isArray(response?.data?.recommendations) && response.data.recommendations) ||
        (Array.isArray(response?.recommendations) && response.recommendations) ||
        [];
      setTodayRecommendations(items);
    } catch (error: any) {
      console.error('❌ [TODAY] Error cargando recomendaciones cercanas:', error);
      setTodayRecommendations([]);
      setTodayRecommendationsError('No se pudieron cargar las recomendaciones cercanas');
    } finally {
      setLoadingTodayRecommendations(false);
    }
  };

  const loadTodayMarket = async () => {
    if (!todayLat || !todayLon) return;

    try {
      setLoadingTodayMarket(true);
      setTodayMarketError(null);

      const response = await marketplaceService.getNearbyTop({
        latitude: todayLat,
        longitude: todayLon,
        radius: 1000000,
        limit: 3,
      });

      const items =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        (Array.isArray(response?.data?.products) && response.data.products) ||
        (Array.isArray(response?.products) && response.products) ||
        [];
      setTodayMarketProducts(items);
    } catch (error: any) {
      console.error('❌ [TODAY] Error cargando productos cercanos:', error);
      setTodayMarketProducts([]);
      setTodayMarketError('No se pudieron cargar productos cercanos');
    } finally {
      setLoadingTodayMarket(false);
    }
  };

  const loadTodayCommunityPosts = async () => {
    try {
      setLoadingTodayCommunityPosts(true);
      setTodayCommunityError(null);
      const response = await communitiesService.getTopPosts(3);
      console.log('🔍 [TOP POSTS] Respuesta completa del backend:', JSON.stringify(response, null, 2));
      const items =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        (Array.isArray(response?.data?.posts) && response.data.posts) ||
        (Array.isArray(response?.posts) && response.posts) ||
        (Array.isArray(response) && response) ||
        [];
      console.log('🔍 [TOP POSTS] Posts procesados:', JSON.stringify(items, null, 2));
      setTodayCommunityPosts(items);
    } catch (error: any) {
      console.error('❌ [TODAY] Error cargando top posts:', error);
      setTodayCommunityPosts([]);
      setTodayCommunityError('No se pudieron cargar los posts');
    } finally {
      setLoadingTodayCommunityPosts(false);
    }
  };

  const loadTodayGuide = async (child: Child) => {
    try {
      setLoadingTodayGuide(true);
      setTodayGuideError(null);

      if (!child.id) {
        setTodayGuide(null);
        setTodayGuideError('No se pudo determinar el niño para la guía');
        return;
      }

      console.log('📘 [HOME GUIDE] Cargando guía para el niño:', {
        childId: child.id,
        name: child.name,
        birthDate: child.birthDate,
        isUnborn: child.isUnborn,
      });
      console.log('📘 [HOME GUIDE] Payload enviado a learningService:', { childId: child.id });
      
      const response = await learningService.getTodayGuide({ childId: child.id });
      
      console.log('📘 [HOME GUIDE] Respuesta recibida:', response);
      
      if (response?.success && response?.data) {
        setTodayGuide(response.data);
      } else {
        setTodayGuide(null);
      }
    } catch (error: any) {
      console.error('❌ [GUIDE] Error cargando guía de hoy:', error);
      setTodayGuide(null);
      setTodayGuideError('No se pudo cargar la guía de hoy');
    } finally {
      setLoadingTodayGuide(false);
    }
  };

  const loadTodayFaq = async (childId: string) => {
    try {
      setLoadingTodayFaq(true);
      const response = await faqService.getMomsFaq(childId);
      const questions =
        (Array.isArray(response?.data?.questions) && response.data.questions) ||
        (Array.isArray(response?.questions) && response.questions) ||
        [];
      setTodayFaqQuestions(questions);
    } catch (error) {
      console.error('❌ [FAQ] Error cargando preguntas frecuentes:', error);
      setTodayFaqQuestions([]);
    } finally {
      setLoadingTodayFaq(false);
    }
  };

  // Helpers para actividades
  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      motor: '🏃',
      sensorial: '👐',
      cognitivo: '🧠',
      social: '👥',
      lenguaje: '💬',
      calma: '😴'
    };
    return icons[category] || '🎨';
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      motor: '#10B981',
      sensorial: '#F59E0B',
      cognitivo: '#8B5CF6',
      social: '#EC4899',
      lenguaje: '#3B82F6',
      calma: '#6366F1'
    };
    return colors[category] || '#887CBC';
  };

  const getIntensityColor = (intensity: string): string => {
    const colors: { [key: string]: string } = {
      baja: '#10B981',
      media: '#F59E0B',
      alta: '#EF4444'
    };
    return colors[intensity] || '#888';
  };


  const handleChildPress = (child: Child) => {
    // Navegar directamente al perfil completo
    // @ts-ignore
    navigation.navigate("ChildProfile", {
      childId: child.id,
      child: child,
    });
  };

  const openHealthProfile = () => {
    // Navegar a la pantalla de Desarrollo
    analyticsService.logEvent('development_section_open', {
      source: 'home_tools',
    });
    
    // @ts-ignore
    navigation.navigate('Development');
  };

  const openAdvisories = async () => {
    try {
      // Navegar directamente al artículo de Primeros Auxilios
      const articleId = 'FBB5VZEVSairFBWblAre';
      
      // Log analytics
      await analyticsService.logEvent('first_aid_guide_open', {
        articleId,
        source: 'home_tools',
      });
      
      // @ts-ignore
      navigation.navigate('ArticleDetail', {
        articleId,
        articleTitle: 'Primeros Auxilios: Una guía rápida',
      });
    } catch (error) {
      console.error('❌ [HOME] Error abriendo primeros auxilios:', error);
    }
  };

  const getGreeting = () => {
    const hour = now.getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getGreetingEmoji = () => {
    const hour = now.getHours();
    if (hour < 12) return '☀️';
    if (hour < 19) return '🌤️';
    return '🌙';
  };

  const normalizeLocationName = (value: string) =>
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

  const syncUserLocation = async (latitude: number, longitude: number) => {
    try {
      const reverse = await locationsService.reverseGeocode(latitude, longitude);
      const data = reverse?.data || reverse?.data?.data || reverse?.result || reverse?.data?.result;
      const cityName = data?.city || '';
      const countryName = data?.country || '';

      const defaultCountryId = "8vxktoVnUFO89rOx5RGJ";
      const defaultCityId = "m9Xvkq7Bf9Q2aUgi5yn7";

      if (!countryName) {
        await authService.updateLocation({
          latitude,
          longitude,
          countryId: defaultCountryId,
          cityId: defaultCityId,
        });
        return;
      }

      const countriesResponse = await locationsService.getCountries();
      const countries =
        countriesResponse?.data ||
        countriesResponse?.countries ||
        countriesResponse?.data?.data ||
        [];
      const normalizedCountry = normalizeLocationName(countryName);
      const country = countries.find(
        (item: any) => normalizeLocationName(item?.name || '') === normalizedCountry
      );

      let cityId: string | undefined;
      let countryId: string | undefined;

      if (country?.id) {
        countryId = country.id;
        if (cityName) {
          const citiesResponse = await locationsService.getCities(country.id);
          const cities =
            citiesResponse?.data ||
            citiesResponse?.cities ||
            citiesResponse?.data?.data ||
            [];
          const normalizedCity = normalizeLocationName(cityName);
          const city = cities.find(
            (item: any) => normalizeLocationName(item?.name || '') === normalizedCity
          );
          if (city?.id) {
            cityId = city.id;
          }
        }
      }

      await authService.updateLocation({
        latitude,
        longitude,
        countryId: countryId || defaultCountryId,
        cityId: cityId || defaultCityId,
      });
    } catch (error) {
      console.error('❌ [HOME] Error sincronizando ubicación:', error);
    }
  };

  const navigateToDouli = (question: string) => {
    (navigation as any).navigate('Doula', {
      screen: 'DoulaMain',
      params: { question },
    });
  };

  const applyWhiteNoiseDuration = (minutes: number | null) => {
    setWhiteNoiseDurationMinutes(minutes);
    if (whiteNoiseTimer) {
      clearTimeout(whiteNoiseTimer);
      setWhiteNoiseTimer(null);
    }
    if (whiteNoisePlaying && whiteNoiseSound && minutes) {
      const ms = minutes * 60 * 1000;
      const timer = setTimeout(async () => {
        try {
          await whiteNoiseSound.stopAsync();
        } catch (error) {
          console.warn('⚠️ [WHITE NOISE] Error deteniendo por duración:', error);
        } finally {
          setWhiteNoisePlaying(false);
          setWhiteNoiseTimer(null);
        }
      }, ms);
      setWhiteNoiseTimer(timer);
    }
  };

  const openWhiteNoiseModal = async () => {
    setShowWhiteNoiseModal(true);
    analyticsService.logEvent('white_noise_open', {
      child_id: selectedChild?.id || null,
    });
    setWhiteNoiseError(null);
  };

  const loadWhiteNoiseSound = async (): Promise<Audio.Sound | null> => {
    if (whiteNoiseSound) return whiteNoiseSound;
    if (whiteNoiseLoading) return null;

    try {
      setWhiteNoiseLoading(true);
      setWhiteNoiseError(null);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
      });

      // Primero intenta con audio local para evitar bloqueos de red
      try {
        const { sound } = await Audio.Sound.createAsync(
          WHITE_NOISE_LOCAL,
          { shouldPlay: false, isLooping: true, volume: 0.6 }
        );
        setWhiteNoiseSound(sound);
        return sound;
      } catch (error) {
        console.warn('⚠️ [WHITE NOISE] Error cargando audio local, intentando remoto:', error);
      }

      let lastError: unknown = null;
      for (const url of WHITE_NOISE_URLS) {
        let timeoutId: ReturnType<typeof setTimeout> | null = null;
        try {
          const timeoutPromise = new Promise<never>((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error("Timeout cargando audio"));
            }, WHITE_NOISE_LOAD_TIMEOUT_MS);
          });

          const { sound } = await Promise.race([
            Audio.Sound.createAsync(
              { uri: url },
              { shouldPlay: false, isLooping: true, volume: 0.6 }
            ),
            timeoutPromise,
          ]);

          if (timeoutId) clearTimeout(timeoutId);
          setWhiteNoiseSound(sound);
          return sound;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          lastError = error;
        }
      }

      throw lastError || new Error("No se pudo cargar el audio");
    } catch (error) {
      console.error('❌ [WHITE NOISE] Error cargando sonido:', error);
      setWhiteNoiseError("No se pudo cargar el audio. Toca reintentar.");
      return null;
    } finally {
      setWhiteNoiseLoading(false);
    }
  };

  const toggleWhiteNoise = async () => {
    const sound = whiteNoiseSound || (await loadWhiteNoiseSound());
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await sound.pauseAsync();
      setWhiteNoisePlaying(false);
      if (whiteNoiseTimer) {
        clearTimeout(whiteNoiseTimer);
        setWhiteNoiseTimer(null);
      }
      analyticsService.logEvent('white_noise_pause', {
        child_id: selectedChild?.id || null,
      });
    } else {
      await sound.playAsync();
      setWhiteNoisePlaying(true);
      if (whiteNoiseDurationMinutes) {
        const ms = whiteNoiseDurationMinutes * 60 * 1000;
        const timer = setTimeout(async () => {
          try {
            await sound.stopAsync();
          } catch (error) {
            console.warn('⚠️ [WHITE NOISE] Error deteniendo por duración:', error);
          } finally {
            setWhiteNoisePlaying(false);
            setWhiteNoiseTimer(null);
          }
        }, ms);
        setWhiteNoiseTimer(timer);
      }
      analyticsService.logEvent('white_noise_play', {
        child_id: selectedChild?.id || null,
      });
    }
  };

  const closeWhiteNoiseModal = async () => {
    setShowWhiteNoiseModal(false);
    analyticsService.logEvent('white_noise_close', {
      child_id: selectedChild?.id || null,
    });
    setWhiteNoiseError(null);
    if (whiteNoiseTimer) {
      clearTimeout(whiteNoiseTimer);
      setWhiteNoiseTimer(null);
    }
    if (whiteNoiseSound) {
      try {
        await whiteNoiseSound.stopAsync();
        await whiteNoiseSound.unloadAsync();
      } catch (error) {
        console.warn('⚠️ [WHITE NOISE] Error cerrando sonido:', error);
      }
      setWhiteNoiseSound(null);
      setWhiteNoisePlaying(false);
    }
  };

  const getProfileImage = () => {
    // Icono de perfil amarillo con cara sonriente
    return require("../../assets/caritas1.png");
  };

  const getChildAvatar = (child: Child, index: number) => {
    // Si el hijo tiene foto válida del backend y no ha fallado, usarla
    if (child.photoUrl && typeof child.photoUrl === 'string' && child.photoUrl.trim() !== '' && !imageErrors.has(child.id)) {
      return { uri: child.photoUrl };
    }

    // Si no tiene foto o la imagen falló, usar las caritas por defecto
    const caritaIndex = index % 3;
    
    // Retornar directamente el require según el índice
    switch (caritaIndex) {
      case 0:
        return CARITA_1;
      case 1:
        return CARITA_2;
      case 2:
        return CARITA_3;
      default:
        return CARITA_1;
    }
  };

  const handleImageError = (childId: string) => {
    console.log("❌ [IMAGE] Error cargando imagen para hijo:", childId);
    setImageErrors((prev) => new Set(prev).add(childId));
  };


  const handleDouliPress = () => {
    // Navegar al tab Doula
    (navigation as any).navigate("MainTabs", {
      screen: "Doula",
    });
  };

  const userFirstName = user?.displayName?.split(' ')[0] || 'Mamá';
  const childFirstName = selectedChild?.name?.split(' ')[0] || 'Tu bebé';
  const selectedChildIndex = selectedChild
    ? Math.max(0, children.findIndex((child) => child.id === selectedChild.id))
    : 0;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        )}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingTitle}>
            {getGreeting()}, {userFirstName}! {getGreetingEmoji()}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickActionsContainer}
        >
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionTeal]}
            onPress={() => {
              analyticsService.logEvent('quick_action_clicked', {
                action: 'crecimiento',
                child_id: selectedChild?.id,
              });
              (navigation as any).navigate('Growth');
            }}
          >
            <Ionicons name="scale-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionLabel}>Crecimiento</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.quickActionGreen]} 
            onPress={() => {
              analyticsService.logEvent('quick_action_clicked', {
                action: 'vacunas',
                child_id: selectedChild?.id,
              });
              Alert.alert('Próximamente', 'Esta funcionalidad estará disponible pronto');
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionLabel}>Vacunas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionButton, styles.quickActionYellow]}
            onPress={() => {
              analyticsService.logEvent('quick_action_clicked', {
                action: 'medicacion',
                child_id: selectedChild?.id,
              });
              (navigation as any).navigate('Medications');
            }}
          >
            <FontAwesome5 name="briefcase-medical" size={22} color="#FFFFFF" />
            <Text style={styles.quickActionLabel}>Medicación</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.quickActionPurple]} 
            onPress={() => {
              analyticsService.logEvent('quick_action_clicked', {
                action: 'denticion',
                child_id: selectedChild?.id,
              });
              Alert.alert('Próximamente', 'Esta funcionalidad estará disponible pronto');
            }}
          >
            <FontAwesome5 name="tooth" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionLabel}>Dentición</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.quickActionButton, styles.quickActionPink]} 
            onPress={() => {
              analyticsService.logEvent('quick_action_clicked', {
                action: 'hitos',
                child_id: selectedChild?.id,
              });
              Alert.alert('Próximamente', 'Esta funcionalidad estará disponible pronto');
            }}
          >
            <Ionicons name="trophy-outline" size={20} color="#FFFFFF" />
            <Text style={styles.quickActionLabel}>Hitos</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Contenido principal */}
        {selectedChild && (
          <View style={styles.todaySection}>
            {/* Banner Home 1 - Debajo de los botones de acción rápida */}
            <View style={styles.bannerHome1Container}>
              <BannerCarousel 
                section="home1" 
                fallbackToHome={false}
                imageResizeMode="cover"
                bannerHeight={140}
                bannerWidth={290}
                autoScroll={false}
                showIndicators={false}
              />
            </View>

            <Text style={styles.todaySubtitle}></Text>
            <View style={styles.todayGuideCard}>
              <Text style={styles.todayGuideLabel}>Tu guía de hoy</Text>
              {loadingTodayGuide ? (
                <View style={styles.todayGuideLoading}>
                  <ActivityIndicator color="#6B5CA5" />
                  <Text style={styles.todayGuideLoadingText}>
                    Douli está aprendiendo de {childFirstName}...
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.todayGuideWeek}>
                    {todayGuide?.title ||
                      `🌱 Semana ${selectedChild?.ageInMonths ? Math.max(1, Math.round(selectedChild.ageInMonths * 4.345)) : 1}: El descubrimiento`}
                  </Text>
                  {todayGuide?.subtitle ? (
                    <Text style={styles.todayGuideSubtitle}>{todayGuide.subtitle}</Text>
                  ) : null}
                  <Text style={styles.todayGuideText}>
                    {todayGuide?.description ||
                      `A esta edad, ${childFirstName} descubre nuevas texturas, sonidos y movimientos. Unos minutos de juego guiado pueden marcar la diferencia.`}
                  </Text>
                  <View style={styles.todayGuideTipCard}>
                    <View style={styles.todayGuideTipIcon}>
                      <Ionicons name="bulb" size={16} color="#6B5CA5" />
                    </View>
                    <Text style={styles.todayGuideTipText}>
                      {todayGuide?.tip ||
                        activitySuggestions?.suggestions?.generalTip ||
                        activitySuggestions?.suggestions?.warningIfTired ||
                        `${childFirstName} parece aburrido. El juego con un espejo ayuda a su autoconocimiento.`}
                    </Text>
                  </View>
                </>
              )}
            </View>

            <Text style={styles.todaySectionTitle}>Herramientas</Text>

            {/* Banner Home 2 - Debajo del título Herramientas */}
            <View style={styles.bannerHome2Container}>
              <BannerCarousel 
                section="home2" 
                fallbackToHome={false}
              />
            </View>

            <View style={styles.todayToolsRow}>
              <TouchableOpacity style={[styles.todayToolCard, styles.todayToolCardSounds]} onPress={openWhiteNoiseModal}>
                <Ionicons name="musical-notes" size={22} color="#FFF" />
                <Text style={styles.todayToolTitle}>Sonidos</Text>
                <Text style={styles.todayToolSubtitle}>Ruido Blanco</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.todayToolCard, styles.todayToolCardAdvisories]} onPress={openAdvisories}>
                <Ionicons name="medical" size={22} color="#FFF" />
                <Text style={styles.todayToolTitle}>Primeros Auxilios</Text>
                <Text style={styles.todayToolSubtitle}>Una guía rápida</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.todayToolCard, styles.todayToolCardHealth]} onPress={openHealthProfile}>
                <Ionicons name="fitness" size={22} color="#FFF" />
                <Text style={styles.todayToolTitle}>Desarrollo</Text>
                <Text style={styles.todayToolSubtitle}>Ejercicios</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.todayBannerContainer}>
              <BannerCarousel
                section="home"
                style={styles.todayBanner}
                imageResizeMode="cover"
                bannerRadius={16}
                bannerBackgroundColor="transparent"
                scrollEnabled={false}
              />
            </View>

            <View style={styles.todayDouliSection}>
              <Text style={styles.todaySectionTitle}>Douli te ayuda</Text>
              <Text style={styles.todayDouliSubtitle}>
                Preguntas frecuentes de {childFirstName}
              </Text>
              {(loadingTodayFaq ? ['Cargando preguntas...'] : todayFaqQuestions).slice(0, 4).map((q) => (
                <TouchableOpacity
                  key={q}
                  style={styles.todayDouliQuestion}
                  onPress={() => navigateToDouli(q)}
                >
                  <Ionicons name="help-circle-outline" size={18} color="#6B5CA5" />
                  <Text style={styles.todayDouliQuestionText}>{q}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.todayDouliInputRow}
                onPress={() => navigateToDouli('')}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-ellipses" size={18} color="#6B5CA5" />
                <Text style={styles.todayDouliInput}>
                  Escribe tu propia pregunta a Douli...
                </Text>
              </TouchableOpacity>
            </View>


            <Text style={styles.todaySectionTitle}>Explora Munpa</Text>

            {todayRecommendations.length > 0 && (
              <View style={styles.todayNearbySection}>
                <View style={styles.todayNearbyHeader}>
                  <Text style={styles.todayNearbyTitle}>Recomendaciones cerca de ti</Text>
                  <TouchableOpacity onPress={() => (navigation as any).navigate('Recommendations')}>
                    <Text style={styles.todayNearbyLink}>Ver todas</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {todayRecommendations.map((rec) => (
                    <TouchableOpacity
                      key={rec.id}
                      style={styles.todayNearbyCard}
                      onPress={() =>
                        (navigation as any).navigate('Recommendations', {
                          screen: 'RecommendationDetail',
                          params: { recommendationId: rec.id },
                        })
                      }
                    >
                      {rec.imageUrl ? (
                        <Image source={{ uri: rec.imageUrl }} style={styles.todayNearbyImage} />
                      ) : (
                        <View style={styles.todayNearbyImagePlaceholder}>
                          <Ionicons name="sparkles" size={20} color="#FFF" />
                        </View>
                      )}
                      <Text style={styles.todayNearbyName} numberOfLines={2}>
                        {rec.name}
                      </Text>
                      <View style={styles.todayNearbyMeta}>
                        <Ionicons name="location" size={12} color="#59C6C0" />
                        <Text style={styles.todayNearbyDistance}>
                          {rec.distance != null ? `${Number(rec.distance).toFixed(2)} km` : 'Cerca de ti'}
                        </Text>
                        <Text style={styles.todayNearbyRating}>
                          {rec.stats?.averageRating
                            ? `⭐ ${rec.stats.averageRating.toFixed(1)}`
                            : rec.averageRating
                            ? `⭐ ${Number(rec.averageRating).toFixed(1)}`
                            : rec.rating
                            ? `⭐ ${Number(rec.rating).toFixed(1)}`
                            : '⭐ N/A'}
                        </Text>
                      </View>
                      {(rec.cityName || rec.city || rec.countryName || rec.country) && (
                        <Text style={styles.todayNearbyLocation} numberOfLines={1}>
                          {(rec.cityName || rec.city || 'Ciudad')} · {rec.countryName || rec.country || 'País'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.todayNearbySection}>
              <View style={styles.todayNearbyHeader}>
                <Text style={styles.todayNearbyTitle}>Munpa Market cerca de ti</Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('MunpaMarket')}>
                  <Text style={styles.todayNearbyLink}>Ver todo</Text>
                </TouchableOpacity>
              </View>

              {todayLocationLoading && (
                <ActivityIndicator color="#FFF" />
              )}

              {!todayLocationLoading && !todayLocationGranted && (
                <Text style={styles.todayNearbyEmpty}>Activa tu ubicación para ver productos cercanos.</Text>
              )}

              {todayLocationGranted && loadingTodayMarket && (
                <ActivityIndicator color="#FFF" />
              )}

              {todayLocationGranted && !loadingTodayMarket && todayMarketProducts.length === 0 && (
                <Text style={styles.todayNearbyEmpty}>
                  {todayMarketError || 'No hay productos cercanos por ahora.'}
                </Text>
              )}

              {todayMarketProducts.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {todayMarketProducts.map((product) => {
                    const image =
                      product.images?.[0] ||
                      (product as any)?.photos?.[0] ||
                      product.imageUrl ||
                      (product as any)?.image ||
                      (product as any)?.photoUrl;
                    const title = product.title || product.name || 'Producto';
                    return (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.todayNearbyCard}
                        onPress={() => {
                          analyticsService.logEvent('market_product_view', {
                            product_id: product.id,
                            title,
                            type: (product as any)?.type || null,
                            price: (product as any)?.price ?? null,
                            category: (product as any)?.category || null,
                            city: (product as any)?.location?.city || null,
                            country: (product as any)?.location?.country || null,
                          });
                          (navigation as any).navigate('ProductDetail', { productId: product.id });
                        }}
                      >
                        {image ? (
                          <Image source={{ uri: image }} style={styles.todayNearbyImage} />
                        ) : (
                          <View style={styles.todayNearbyImagePlaceholder}>
                            <Ionicons name="bag-handle" size={20} color="#FFF" />
                          </View>
                        )}
                        <Text style={styles.todayNearbyName} numberOfLines={2}>
                          {title}
                        </Text>
                        <View style={styles.todayNearbyMeta}>
                          <Ionicons name="location" size={12} color="#59C6C0" />
                          <Text style={styles.todayNearbyDistance}>
                          {product.distance != null ? `${Number(product.distance).toFixed(2)} km` : 'Cerca de ti'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            {/* Banner Home 3 - Sobre Popular en la comunidad */}
            <View style={styles.bannerHome3Container}>
            <BannerCarousel 
                section="home3" 
                fallbackToHome={false}
                imageResizeMode="cover"
                bannerHeight={140}
                bannerWidth={290}
                autoScroll={false}
                showIndicators={false}
              />
            </View>

            <View style={styles.todayNearbySection}>
              <View style={styles.todayNearbyHeader}>
                <Text style={styles.todayNearbyTitle}>Popular en la comunidad</Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('Communities')}>
                  <Text style={styles.todayNearbyLink}>Ver todo</Text>
                </TouchableOpacity>
              </View>

              {loadingTodayCommunityPosts && (
                <ActivityIndicator color="#6B7280" />
              )}

              {!loadingTodayCommunityPosts && todayCommunityPosts.length === 0 && (
                <Text style={styles.todayNearbyEmpty}>
                  {todayCommunityError || 'No hay posts populares por ahora.'}
                </Text>
              )}

              {todayCommunityPosts.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularPostList}
                >
                  {todayCommunityPosts.map((post) => (
                    <TouchableOpacity
                      key={post.id}
                      style={[styles.popularPostCard, { width: POPULAR_POST_CARD_WIDTH }]}
                      onPress={() => (navigation as any).navigate('PostDetail', { post })}
                    >
                      <View style={styles.popularPostHeader}>
                        <View style={styles.popularPostAvatar}>
                          <Ionicons name="person" size={20} color="#6B7280" />
                        </View>
                        <View style={styles.popularPostHeaderInfo}>
                          <View style={styles.popularPostHeaderRow}>
                            <Text style={styles.popularPostAuthor}>
                              {post.authorName || 'Usuario Munpa'}
                            </Text>
                            {post.createdAt ? (
                              <>
                                <Text style={styles.popularPostMetaDot}>·</Text>
                                <Text style={styles.popularPostTime}>
                                  {formatTimeAgo(post.createdAt)}
                                </Text>
                              </>
                            ) : null}
                          </View>
                          <Text style={styles.popularPostCommunity}>
                            {post.communityName || 'Comunidad Munpa'}
                          </Text>
                        </View>
                      </View>

                      {post.title ? (
                        <>
                          <Text style={styles.popularPostTitle} numberOfLines={2}>
                            {post.title}
                          </Text>
                          <Text style={styles.popularPostExcerpt} numberOfLines={3}>
                            {post.content || ''}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.popularPostTitle} numberOfLines={5}>
                          {post.content || 'Publicación destacada'}
                        </Text>
                      )}

                      <View style={styles.popularPostActions}>
                        <View style={styles.popularPostActionItem}>
                          <Ionicons name="heart-outline" size={18} color="#4A5568" />
                          <Text style={styles.popularPostActionText}>
                            {post.likeCount ?? 0}
                          </Text>
                        </View>
                        <View style={styles.popularPostActionItem}>
                          <Ionicons name="share-social-outline" size={18} color="#4A5568" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

          </View>
        )}

        {/* Espacio final - con padding extra para el botón fijo */}
        <View style={[styles.finalSpacing, { height: 100 }]} />
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },


  // Scroll principal
  scrollView: {
    flex: 1,
  },

  // Header principal Home
  homeHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: "#96d2d3",
  },
  homeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  childSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FBFA",
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#59C6C0",
  },
  childAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  childAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  childAvatarEmoji: {
    fontSize: 16,
  },
  childSelectorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
    marginRight: 6,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  profilePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#B4C14B",
    alignItems: "center",
    justifyContent: "center",
  },
  homeHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIconButton: {
    marginLeft: 10,
    backgroundColor: "#F3E9FB",
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#887CBC",
  },
  greetingBlock: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 6,
  },

  // Sección de saludo
  greetingSection: {
    padding: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTextContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    zIndex: 2,
    justifyContent: "center",
  },
  greetingHello: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#2D3748",
    lineHeight: 36,
    fontFamily: "Montserrat",
  },
  greetingName: {
    fontSize: 36,
    fontWeight: "normal",
    color: "#2D3748",
    lineHeight: 36,
    fontFamily: "Montserrat",
  },
  greetingSupport: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    opacity: 0.85,
    fontWeight: "500",
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    gap: 18,
    paddingBottom: 10,
    flexGrow: 1,
    justifyContent: "center",
  },
  quickActionButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 58,
    height: 58,
    borderRadius: 10,
  },
  quickActionLabel: {
    marginTop: 2,
    fontSize: 9,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quickActionTeal: {
    backgroundColor: "#59C6C0",
  },
  quickActionGreen: {
    backgroundColor: "#B4C14B",
  },
  quickActionYellow: {
    backgroundColor: "#FFC211",
  },
  quickActionPurple: {
    backgroundColor: "#887CBC",
  },
  quickActionPink: {
    backgroundColor: "#F08EB7",
  },
  bannerHome1Container: {
    marginTop: -15,
    marginBottom: -28,
  },
  bannerHome2Container: {
    marginVertical: 12,
  },
  bannerHome3Container: {
    marginTop: -15,
    marginVertical: 12,
  },
  childSelectorModal: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    width: "88%",
    maxHeight: "70%",
  },
  childSelectorOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  childSelectorTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 12,
  },
  childSelectorList: {
    marginBottom: 12,
  },
  childSelectorItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  childSelectorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  childSelectorInfo: {
    flex: 1,
  },
  childSelectorItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D3748",
  },
  childSelectorItemMeta: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  childSelectorAdd: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    justifyContent: "center",
  },
  childSelectorAddText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B5CA5",
  },
  sleepTitleContainer: {
    marginTop: 15,
    marginBottom: 0,
  },
  sleepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  greenShape: {
    position: "absolute",
    top: 20,
    right: -5,
    width: 170,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  greenShapeFace: {
    width: 170,
    height: 170,
    resizeMode: "contain",
  },

  // Sección motivacional
  motivationalSection: {
    marginBottom: 5,
    alignItems: "center",
  },
  motivationalText: {
    fontSize: 16,
    color: "#59C6C0",
    textAlign: "center",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },

  // Sección de hijos
  childrenSection: {
    paddingLeft: 0,
    paddingRight: 20,
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 14,
    marginLeft: 20,
    fontFamily: "Montserrat",
  },
  sectionTitle2: {
    fontSize: 22,
    marginBottom: 14,
    marginRight: 20,
    fontFamily: "Montserrat",
  },

  childrenWrapper: {
    backgroundColor: "#8fd8d3",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },
  listWrapper: {
    backgroundColor: "#fcde9d",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },

  childrenContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },

  addChildButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addChildIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addChildText: {},
  childButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  childImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  childName: {
    textAlign: "center",
    fontFamily: "Montserrat",
  },
  listIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Sección de comunidades
  communitiesSection: {
    paddingHorizontal: 20,
    paddingLeft: 20,
    paddingRight: 0,
    marginBottom: 35,
  },
  communitiesWrapper: {
    backgroundColor: "#F4b8d3",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 25,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    minHeight: 100,
    alignSelf: "flex-end",
    width: "90%",
  },
  communitiesScrollView: {
    flex: 1,
  },
  communitiesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },
  addCommunityButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addCommunityIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addIconText: {
    fontSize: 40,
    color: "#F4b8d3",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addIconText2: {
    fontSize: 40,
    color: "#8fd8d3",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addListIconText: {
    fontSize: 40,
    color: "#fcde9d",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addCommunityText: {
    textAlign: "center",
  },
  communityButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  communityIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  communityIconText: {
    fontSize: 32,
    fontFamily: "Montserrat",
  },
  communityName: {
    textAlign: "center",
    fontFamily: "Montserrat",
  },

  // Estilos nuevos para comunidades dinámicas
  communitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollHint: {
    fontSize: 12,
    color: "#999",
    marginRight: 10,
    fontStyle: "italic",
    fontFamily: "Montserrat",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
    marginRight: 4,
    fontFamily: "Montserrat",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },
  emptyCommunitiesContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyMessageOutside: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyMessageOutsideText: {
    fontSize: 14,
    color: "#666",
    textAlign: "left",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },
  emptyMessageInline: {
    backgroundColor: "#F0F9F8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#59C6C0",
  },
  emptyMessageText: {
    fontSize: 15,
    color: "#59C6C0",
    textAlign: "left",
    fontWeight: "600",
    fontFamily: "Montserrat",
  },
  emptyCommunitiesMessageWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyCommunitiesMessage: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    minWidth: 200,
  },
  emptyCommunitiesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  joinCommunitiesButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinCommunitiesText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  communityImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Banner de DOULI
  douliBanner: {
    backgroundColor: "#96d2d3",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingRight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  douliTextContainer: {
    flex: 1,
    marginRight: 25,
  },
  douliTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  douliSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  douliAvatar: {
    position: "absolute",
    right: -10,
    top: -35,
    padding: 8,
    zIndex: 1001,
  },
  douliAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 30,
    resizeMode: "contain",
  },

  // Espaciado final
  finalSpacing: {
    height: 100,
  },

  // Estilos del modal de crear comunidad
  modalContainer: {
    flex: 1,
    backgroundColor: "#33737d",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#33737d',
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Sección de imagen
  imageSection: {
    marginBottom: 25,
  },
  imagePicker: {
    marginBottom: 15,
  },
  imagePlaceholder: {
    height: 140,
    backgroundColor: '#33737d',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  imageSelectedContainer: {
    position: "relative",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageSelectedOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  imageSelectedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#33737d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
  },
  imageInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#2E7D2E",
    fontWeight: "500",
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  removeImageText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // Sección de formulario
  formSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#33737d',
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  // Sección de privacidad
  privacySection: {
    marginTop: 20,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#33737d',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#59C6C0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#96d2d3',
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Acciones del modal
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#33737d',
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  createButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: '#96d2d3',
    borderRadius: 12,
    marginLeft: 10,
  },
  createButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },

  // Estilos de Sleep Card
  sleepSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  wakeTimeCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wakeTimeGradient: {
    padding: 20,
  },
  wakeTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  wakeTimeInfo: {
    flex: 1,
  },
  wakeTimeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  wakeTimeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },
  wakeTimeHint: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sleepHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  sleepDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepDetailsText: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '600',
    marginRight: 4,
    fontFamily: 'Montserrat',
  },
  sleepLoadingCard: {
    backgroundColor: '#33737d',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },

  // Card de sueño activo
  activeSleepCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeSleepGradient: {
    padding: 20,
  },
  activeSleepMainContent: {
    gap: 16,
  },
  activeSleepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activeSleepBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeSleepBadgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSleepIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activeSleepEmoji: {
    fontSize: 32,
  },
  activeSleepProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  sleepStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sleepStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  sleepStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  sleepStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  sleepStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sleepProgressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sleepProgressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sleepProgressBarFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 12,
  },
  sleepProgressPercentage: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  sleepProgressPercentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  activeSleepSimpleProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  simpleProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeSleepElapsed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  sleepProgressInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  sleepProgressInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
  },
  sleepControlButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sleepControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sleepPauseButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
  },
  sleepResumeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  sleepStopButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  sleepControlButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },

  // Badge compacto de hora de despertar
  wakeTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  wakeTimeBadgeText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  
  // Timeline del horario del día - Rediseñado
  dailyProgressCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyProgressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  progressBadge: {
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
  napsList: {
    gap: 0,
  },
  napItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  napIndicatorContainer: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  napIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  napIndicatorCompleted: {
    backgroundColor: '#2ECC71',
  },
  napIndicatorInProgress: {
    backgroundColor: '#8B5CF6', // Morado para en progreso
  },
  napIndicatorNext: {
    backgroundColor: '#96d2d3',
    borderWidth: 3,
    borderColor: '#F0E6FF',
  },
  napIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napConnectorLine: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  napConnectorLineCompleted: {
    backgroundColor: '#2ECC71',
  },
  napContent: {
    flex: 1,
    backgroundColor: '#33737d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  napContentNext: {
    backgroundColor: '#F0E6FF',
    borderWidth: 2,
    borderColor: '#887CBC',
  },
  napContentPassed: {
    backgroundColor: '#F0FFF4',
    opacity: 0.7,
  },
  napMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  napTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  napTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napTimePassed: {
    color: '#FFF',
  },
  napType: {
    fontSize: 13,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napTypePassed: {
    color: '#FFF',
  },
  napMetadata: {
    flexDirection: 'row',
    gap: 8,
  },
  napDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  napDurationText: {
    fontSize: 11,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  napConfidenceText: {
    fontSize: 9,
    color: '#B8860B',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  napCountdownBadge: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  napCountdownText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napNowBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  napNowText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  bedtimeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bedtimeContent: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bedtimeTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    fontFamily: 'Montserrat',
  },
  bedtimeLabel: {
    fontSize: 13,
    color: '#667eea',
    fontFamily: 'Montserrat',
  },

  // Card de presión de sueño
  sleepPressureCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sleepPressureGradient: {
    padding: 20,
  },
  sleepPressureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepPressureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sleepPressureEmoji: {
    fontSize: 32,
  },
  sleepPressureInfo: {
    flex: 1,
  },
  sleepPressureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  sleepPressureSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },

  // Contenedor de predicciones
  predictionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  predictionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  predictionLabel: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  predictionTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  predictionDetails: {
    gap: 8,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#33737d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  predictionBadgeText: {
    fontSize: 11,
    color: '#FFF',
    marginLeft: 4,
    fontFamily: 'Montserrat',
  },

  // Card esperando predicciones
  waitingPredictionsCard: {
    backgroundColor: '#F8F4FF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E6D9FF',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  waitingPredictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  waitingPredictionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  waitingPredictionsText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  waitingPredictionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  waitingPredictionsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  bedtimePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6D9FF',
  },
  bedtimePreviewInfo: {
    flex: 1,
  },
  bedtimePreviewLabel: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  bedtimePreviewTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  criticalAlertText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  
  // Card vacío
  emptySleepCard: {
    backgroundColor: '#33737d',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptySleepEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptySleepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  emptySleepText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  emptySleepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#887CBC',
  },
  emptySleepButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  
  // Estilos del modal de hora de despertar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  wakeModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  napModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  napModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  napModalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  wakeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  wakeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  wakeNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA726',
    fontFamily: 'Montserrat',
  },
  modalTimeSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  wakeTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA726',
    gap: 12,
  },
  wakeTimeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  dateTimePicker: {
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  wakeModalConfirmButton: {
    backgroundColor: '#FFA726',
  },
  napModalConfirmButton: {
    backgroundColor: '#887CBC',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  
  // Estilos para el planeta animado de presión de sueño
  sleepPlanetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    alignSelf: 'center',
  },
  sleepPlanetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 16,
  },
  planetImageSimple: {
    width: 120,
    height: 120,
  },
  // Estilos compactos para info de siesta activa (al lado de la carita)
  activeSleepInfoCompact: {
    justifyContent: 'center',
    flex: 1,
    paddingLeft: 8,
  },
  activeSleepTitleCompact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  activeSleepTimeCompact: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  activeSleepSubtitleCompact: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
  },

  // Estilos para card de recordatorio de actividades (compacto, al lado del planeta)
  activityReminderCardCompact: {
    width: 160, // Ancho fijo más pequeño
    backgroundColor: 'rgba(245, 158, 11, 0.95)', // Default amarillo (energía alta)
    borderRadius: 16,
    padding: 12,
    marginLeft: 16,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    justifyContent: 'space-between',
    height: 140, // Altura fija
  },
  activityReminderCardHigh: {
    // Energía ALTA (low sleep pressure) - Amarillo vibrante
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    shadowColor: '#F59E0B',
  },
  activityReminderCardMedium: {
    // Energía MEDIA (medium sleep pressure) - Azul suave
    backgroundColor: 'rgba(59, 130, 246, 0.95)',
    shadowColor: '#3B82F6',
  },
  activityReminderCardLow: {
    // Energía BAJA (high sleep pressure) - Púrpura oscuro
    backgroundColor: 'rgba(139, 92, 246, 0.95)',
    shadowColor: '#8B5CF6',
  },
  activityReminderHeaderCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  activityReminderIconCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityReminderLabelCompact: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activityReminderContentCompact: {
    flex: 1,
  },
  activityReminderTitleCompact: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'Montserrat',
    lineHeight: 20,
    marginBottom: 'auto',
  },
  activityReminderFooterCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  activityReminderButtonTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  // Estilos antiguos (por si acaso)
  activeSleepInfo: {
    marginTop: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  activeSleepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  activeSleepTime: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  activeSleepSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },

  // Estilos para la vista de agenda/horarios
  scheduleAgenda: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
  },
  scheduleAgendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scheduleAgendaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  scheduleViewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  scheduleViewMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  scheduleTimeline: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  scheduleTimeContainer: {
    width: 100, // Más ancho para "07:55 - 08:33"
    paddingTop: 4,
  },
  scheduleTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  scheduleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
    marginHorizontal: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
  },
  scheduleCardCompleted: {
    opacity: 0.7,
    padding: 10,
  },
  scheduleCardActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderLeftWidth: 5,
  },
  scheduleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleCardTitleCompleted: {
    fontSize: 14,
  },
  scheduleTimeCompleted: {
    fontSize: 13,
    opacity: 0.8,
  },
  scheduleDotActive: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  scheduleCardDurationActive: {
    fontWeight: '700',
    color: '#FFF',
  },
  scheduleCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  scheduleCardDuration: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    marginLeft: 28,
    fontFamily: 'Montserrat',
  },

  // Estilos para card de recordatorio de actividades
  activityReminderCard: {
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  activityReminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityReminderContent: {
    flex: 1,
  },
  activityReminderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  activityReminderButton: {
    backgroundColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  activityReminderButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  
  // Estilos para modal de detalles de órbita
  orbitDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDetailContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  orbitDetailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  orbitDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  orbitDetailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
  },
  orbitDetailTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667EEA',
  },
  orbitDetailList: {
    width: '100%',
    marginBottom: 20,
  },
  orbitDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  orbitDetailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667EEA',
    marginTop: 6,
    marginRight: 12,
  },
  orbitDetailText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  orbitDetailCloseButton: {
    width: '100%',
    backgroundColor: '#667EEA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  orbitDetailCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  addRecordButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  addRecordText: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
    fontWeight: '600',
  },
  // Estilos para los recuadros de información
  sleepInfoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 8, // Reducido de 20 a 8
    marginBottom: 10,
    gap: 12,
  },
  sleepInfoCard: {
    width: '48%', // Ancho fijo para que quepan 2 por fila
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  sleepInfoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepInfoContent: {
    flex: 1,
  },
  sleepInfoValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 2,
  },
  sleepInfoLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  // Estilos para información en el centro del planeta
  planetCenterInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    top: 110,
  },
  // Estilos para controles de siesta activa (debajo del planeta)
  activeSleepControls: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  activeSleepControlsInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeSleepTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeSleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(103, 126, 234, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeSleepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepSinceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  activeSleepControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeSleepPauseBtn: {
    backgroundColor: '#FFA726',
  },
  activeSleepResumeBtn: {
    backgroundColor: '#66BB6A',
  },
  activeSleepStopBtn: {
    backgroundColor: '#EF5350',
  },
  activeSleepButtonControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Estilos para sección de actividades
  activitiesSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  activitiesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  activitiesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  activityBabyState: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  activityBabyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  activityBabyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  activityWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  activitiesScrollView: {
    marginBottom: 16,
  },
  activitiesScrollContent: {
    gap: 16,
    paddingRight: 20,
  },
  activityCard: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  activityCategoryBadge: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activityCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  activityIntensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activityIntensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  activityCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  activityCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  activityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  activityCardDuration: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activityCardBenefit: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 8,
  },
  activityCardMaterials: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activityGeneralTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  activityGeneralTipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  // Botón fijo inferior
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  fixedAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#887CBC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fixedAddButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'lowercase',
  },
  // Barra fija de siesta activa en el FOOTER
  fixedSleepBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(44, 62, 80, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1000,
  },
  fixedSleepBarInner: {
    width: '100%',
  },
  fixedSleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fixedSleepTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  fixedSleepTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fixedSleepProgressBar: {
    flex: 2,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  fixedSleepProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  fixedSleepRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
  },
  fixedSleepRemainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fixedSleepButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  fixedSleepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // ============= ESTILOS DE PESTAÑAS =============
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(136, 124, 188, 0.35)',
    borderRadius: 25,
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FFC211',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#4A5568',
    fontWeight: '700',
  },
  tabBadge: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ============= ESTILOS DE HOY =============
  todaySection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  todayGuideCard: {
    backgroundColor: "#FFF7D6",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFC211",
  },
  todayGuideLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  todayGuideWeek: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginTop: 6,
  },
  todayGuideText: {
    fontSize: 13,
    color: "#4A5568",
    marginTop: 6,
    lineHeight: 18,
  },
  todayGuideSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  todayGuideTipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#EAF6E5",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  todayGuideTipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  todayGuideTipText: {
    flex: 1,
    fontSize: 12,
    color: "#4A5568",
    lineHeight: 16,
  },
  todayGuideLoading: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F5FB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  todayGuideLoadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
  },
  todayGuideButton: {
    alignSelf: "center",
    backgroundColor: "#6B5CA5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
  },
  todayGuideButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFF",
  },
  todayGuideActivities: {
    marginTop: 12,
    backgroundColor: "#F3ECFF",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  todayGuideActivitiesTitle: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 2,
  },
  todayGuideActivitiesSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  todayGuideActivityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginRight: 10,
    width: 220,
    borderWidth: 1,
    borderColor: "#C9B7E8",
  },
  todayGuideActivityHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  todayGuideActivityText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: "600",
    color: "#2D3748",
    flex: 1,
  },
  todayGuideActivityDesc: {
    marginLeft: 24,
    marginTop: 4,
    fontSize: 12,
    color: "#6B7280",
  },
  todayGuideActivityMeta: {
    marginLeft: 24,
    marginTop: 2,
    fontSize: 10,
    color: "#9CA3AF",
  },
  todaySectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
    marginBottom: 10,
  },
  todayToolsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    columnGap: 10,
  },
  todayToolCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    borderWidth: 0,
  },
  todayToolCardSounds: {
    backgroundColor: "#FFC211",
  },
  todayToolCardAdvisories: {
    backgroundColor: "#887CBC",
  },
  todayToolCardHealth: {
    backgroundColor: "#F08EB7",
  },
  todayToolTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
    marginTop: 6,
  },
  todayToolSubtitle: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 2,
  },
  todayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 6,
  },
  todaySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    opacity: 0.8,
    marginBottom: 14,
  },
  todayBannerContainer: {
    marginBottom: 16,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  todayBanner: {
    width: '110%',
    
  },
  todayDouliSection: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F08EB7",
  },
  todayDouliSubtitle: {
    fontSize: 13,
    color: "#4A5568",
    marginBottom: 10,
  },
  todayDouliQuestion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7ECF5",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  todayDouliQuestionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#2D3748",
  },
  todayDouliInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  todayDouliInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 13,
    color: "#2D3748",
  },
  whiteNoiseModal: {
    backgroundColor: "#FFF",
    borderRadius: 18,
    padding: 18,
    width: "88%",
  },
  whiteNoiseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  whiteNoiseTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D3748",
  },
  whiteNoiseSubtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#6B7280",
  },
  whiteNoiseOptions: {
    marginTop: 12,
  },
  whiteNoiseOptionLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "600",
  },
  whiteNoiseOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  whiteNoiseOptionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
  },
  whiteNoiseOptionChipActive: {
    backgroundColor: "#6B5CA5",
  },
  whiteNoiseOptionText: {
    fontSize: 12,
    color: "#4A5568",
    fontWeight: "600",
  },
  whiteNoiseOptionTextActive: {
    color: "#FFF",
  },
  whiteNoiseError: {
    marginTop: 8,
    fontSize: 12,
    color: "#B91C1C",
    textAlign: "center",
  },
  whiteNoiseButton: {
    marginTop: 14,
    backgroundColor: "#6B5CA5",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  whiteNoiseButtonText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  whiteNoiseClose: {
    marginTop: 10,
    alignItems: "center",
  },
  whiteNoiseCloseText: {
    color: "#6B5CA5",
    fontWeight: "600",
  },
  todayActivityBanner: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  todayActivityBannerText: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 10,
  },
  todayActivityBannerButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFEAF9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  todayActivityBannerButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5CA5',
  },
  todayActivityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
  },
  todayActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  todayActivityDesc: {
    fontSize: 12,
    color: '#4A5568',
  },
  todayActivityCard: {
    backgroundColor: '#F5F3FF',
    borderColor: '#D7D1F2',
    borderWidth: 1,
  },
  activityModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  activityModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  activityModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  activityModalScroll: {
    marginBottom: 16,
  },
  activityModalRow: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
  },
  activityModalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  activityModalValue: {
    fontSize: 13,
    color: '#2D3748',
  },
  activityModalCloseButton: {
    alignSelf: 'center',
    backgroundColor: '#6B5CA5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activityModalCloseText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  todayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  todayCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  todayCardText: {
    fontSize: 13,
    color: '#4A5568',
    marginBottom: 6,
  },
  todayCardCta: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B5CA5',
  },
  todayChecklist: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  todayChecklistTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  todayChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  todayChecklistText: {
    fontSize: 13,
    color: '#FFF',
  },

  todayNearbySection: {
    marginBottom: 14,
  },
  todayNearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayNearbyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  todayNearbyLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    opacity: 0.9,
  },
  todayNearbyEmpty: {
    fontSize: 12,
    color: '#6B7280',
    opacity: 0.85,
    marginBottom: 8,
  },
  todayNearbyCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#59C6C0',
  },
  todayNearbyImage: {
    width: '100%',
    height: 70,
    borderRadius: 8,
    marginBottom: 6,
  },
  todayNearbyImagePlaceholder: {
    width: '100%',
    height: 70,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayNearbyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4,
  },
  todayNearbyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  todayNearbyDistance: {
    fontSize: 11,
    color: '#4A5568',
  },
  todayNearbyRating: {
    fontSize: 11,
    color: '#4A5568',
    marginLeft: 6,
  },
  todayNearbyLocation: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  popularPostList: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  popularPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginRight: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  popularPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularPostAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  popularPostHeaderInfo: {
    flex: 1,
  },
  popularPostHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  popularPostAuthor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  popularPostMetaDot: {
    marginHorizontal: 6,
    fontSize: 16,
    color: '#9CA3AF',
  },
  popularPostTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  popularPostCommunity: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B5CA5',
    fontWeight: '600',
  },
  popularPostTitle: {
    fontSize: 15,
    fontWeight: '400',
    color: '#1F2937',
    marginBottom: 6,
  },
  popularPostExcerpt: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 16,
  },
  popularPostActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 10,
  },
  popularPostActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  popularPostActionText: {
    fontSize: 12,
    color: '#4A5568',
    fontWeight: '600',
  },

});

export default HomeScreen;

