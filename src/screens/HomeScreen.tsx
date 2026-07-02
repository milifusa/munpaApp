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
  Share,
  ActivityIndicator,
  DeviceEventEmitter,
  TextInput,
} from "react-native";
import { useNavigation, useRoute, DrawerActions } from "@react-navigation/native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
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
import consultationsService from "../services/consultationsService";
import nutritionService from "../services/nutritionService";
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
import RecipeCard from "../components/RecipeCard";

const WHITE_NOISE_LOCAL = require("../../assets/whitenoise.mp3");
const WHITE_NOISE_URLS = [
  "https://cdn.pixabay.com/audio/2022/03/15/audio_0c3a1a9ea6.mp3",
  "https://cdn.pixabay.com/audio/2022/02/23/audio_5d01c5d8b1.mp3",
];
const WHITE_NOISE_LOAD_TIMEOUT_MS = 20000;
const SCREEN_WIDTH = Dimensions.get('window').width;
const POPULAR_POST_CARD_WIDTH = SCREEN_WIDTH * 0.8;
const PREGNANCY_SIZE_IMAGE_HEIGHT = Math.min(SCREEN_WIDTH - 40, 390);
const PREGNANCY_WEEK_CHIP_SIZE = 42;
const PREGNANCY_WEEK_CHIP_GAP = 8;
const PREGNANCY_WEEK_CHIP_STEP = PREGNANCY_WEEK_CHIP_SIZE + PREGNANCY_WEEK_CHIP_GAP;

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

const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
  totalReviews?: number;
  stats?: {
    averageRating?: number;
    totalReviews?: number;
  };
}

// Helper function para calcular recomendaciones (reviews de 4-5 estrellas)
const calculateRecommendations = (totalReviews: number, averageRating: number): number => {
  if (totalReviews === 0) return 0;

  // Estimación: Si el promedio es X, calculamos cuántas son de 4-5 estrellas
  // Por ejemplo: promedio 4.5 con 10 reviews -> ~9 son de 4-5 estrellas
  // Fórmula aproximada: (avgRating - 2.5) / 2.5 * totalReviews
  // Esto da una estimación razonable del % de reviews positivas

  if (averageRating >= 4.5) {
    // Si el promedio es 4.5+, casi todas son positivas (90-100%)
    return Math.round(totalReviews * 0.95);
  } else if (averageRating >= 4.0) {
    // Si es 4.0-4.5, ~70-90% son positivas
    return Math.round(totalReviews * 0.8);
  } else if (averageRating >= 3.5) {
    // Si es 3.5-4.0, ~50-70% son positivas
    return Math.round(totalReviews * 0.6);
  } else if (averageRating >= 3.0) {
    // Si es 3.0-3.5, ~30-50% son positivas
    return Math.round(totalReviews * 0.4);
  } else {
    // Menos de 3.0, muy pocas positivas
    return Math.round(totalReviews * 0.2);
  }
};

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
  title?: string;
  content?: string;
  imageUrl?: string;
  authorName?: string;
  communityName?: string;
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

interface PregnancySizeComparison {
  week: number;
  name: string;
  emoji: string;
  detail: string;
  noComparison?: boolean;
}

interface PregnancyWeekDetail {
  baby: string;
  momBody: string;
  feelings: string;
  prepare: string;
  important: string;
}

interface PregnancyApproxMeasurement {
  length: string;
  weight: string;
  note?: string;
}

interface PregnancyContractionRecord {
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
}

type PregnancyComparisonMode = 'fruits' | 'animals' | 'sweets' | 'human';

const PREGNANCY_COMPARISON_OPTIONS: {
  id: PregnancyComparisonMode;
  label: string;
  icon: string;
}[] = [
  { id: 'human', label: 'Bebé', icon: '👶' },
  { id: 'fruits', label: 'Frutas', icon: '🍓' },
  { id: 'animals', label: 'Animales', icon: '🐾' },
  { id: 'sweets', label: 'Dulces', icon: '🍬' },
];

const PREGNANCY_SIZE_BY_WEEK: PregnancySizeComparison[] = [
  { week: 1, name: 'Sin comparativo', emoji: '✨', detail: 'Aún no hay embrión medible.', noComparison: true },
  { week: 2, name: 'Sin comparativo', emoji: '✨', detail: 'Semana de ovulación o fecundación aproximada.', noComparison: true },
  { week: 3, name: 'una semilla muy pequeña', emoji: '🌱', detail: 'Célula en desarrollo.' },
  { week: 4, name: 'una semilla de amapola', emoji: '🌱', detail: 'Pequeñito, pero creciendo cada día.' },
  { week: 5, name: 'una semilla de sésamo', emoji: '🌱', detail: 'También conocida como ajonjolí.' },
  { week: 6, name: 'una lenteja', emoji: '🫘', detail: 'Su corazón y órganos principales se están formando.' },
  { week: 7, name: 'un arándano', emoji: '🫐', detail: 'Cada semana suma nuevos detalles.' },
  { week: 8, name: 'una frambuesa', emoji: '🍇', detail: 'Sus rasgos empiezan a definirse poco a poco.' },
  { week: 9, name: 'una uva', emoji: '🍇', detail: 'Sus movimientos comienzan aunque aún no los sientas.' },
  { week: 10, name: 'un dátil', emoji: '🟤', detail: 'También se compara con un kumquat.' },
  { week: 11, name: 'una lima pequeña', emoji: '🍋', detail: 'Sus manitos y piecitos siguen tomando forma.' },
  { week: 12, name: 'una ciruela', emoji: '🍑', detail: 'Termina una etapa clave de formación.' },
  { week: 13, name: 'un kiwi', emoji: '🥝', detail: 'Crece con energía al iniciar el segundo trimestre.' },
  { week: 14, name: 'un durazno', emoji: '🍑', detail: 'Su cuerpo empieza a estirarse más.' },
  { week: 15, name: 'una pera', emoji: '🍐', detail: 'Sus sentidos continúan desarrollándose.' },
  { week: 16, name: 'un aguacate', emoji: '🥑', detail: 'Puede empezar una etapa de movimientos sutiles.' },
  { week: 17, name: 'una naranja', emoji: '🍊', detail: 'Sus huesitos se fortalecen.' },
  { week: 18, name: 'una granada', emoji: '🔴', detail: 'Sus movimientos pueden sentirse más cerca.' },
  { week: 19, name: 'una toronja', emoji: '🍊', detail: 'Crece largo y activo dentro de ti.' },
  { week: 20, name: 'un mango', emoji: '🥭', detail: 'Mitad del camino para muchas familias.' },
  { week: 21, name: 'un melón pequeño', emoji: '🍈', detail: 'Sigue practicando movimientos y reflejos.' },
  { week: 22, name: 'una berenjena pequeña', emoji: '🍆', detail: 'Su piel y sentidos maduran semana a semana.' },
  { week: 23, name: 'una berenjena', emoji: '🍆', detail: 'Sus pulmones siguen preparándose.' },
  { week: 24, name: 'una mazorca de maíz', emoji: '🌽', detail: 'Crece con más fuerza y presencia.' },
  { week: 25, name: 'una papaya pequeña', emoji: '🍈', detail: 'Sus rutinas de sueño y actividad se notan más.' },
  { week: 26, name: 'una lechuga', emoji: '🥬', detail: 'Sus sentidos están cada vez más despiertos.' },
  { week: 27, name: 'una coliflor', emoji: '🥦', detail: 'Se acerca el tercer trimestre.' },
  { week: 28, name: 'una berenjena grande', emoji: '🍆', detail: 'Su cerebro sigue creciendo intensamente.' },
  { week: 29, name: 'una calabaza pequeña', emoji: '🎃', detail: 'Gana peso y reserva energía.' },
  { week: 30, name: 'un repollo', emoji: '🥬', detail: 'Cada patadita cuenta una historia.' },
  { week: 31, name: 'un coco', emoji: '🥥', detail: 'Va tomando más espacio dentro de ti.' },
  { week: 32, name: 'una jícama', emoji: '🍠', detail: 'También se compara con una calabaza mediana.' },
  { week: 33, name: 'una piña', emoji: '🍍', detail: 'Está afinando movimientos y reflejos.' },
  { week: 34, name: 'un melón cantalupo', emoji: '🍈', detail: 'Su cuerpo se prepara para el encuentro.' },
  { week: 35, name: 'un melón grande', emoji: '🍈', detail: 'Sigue ganando peso y fuerza.' },
  { week: 36, name: 'una lechuga romana', emoji: '🥬', detail: 'Ya se acerca la recta final.' },
  { week: 37, name: 'un manojo de acelga', emoji: '🥬', detail: 'También se compara con hojas verdes.' },
  { week: 38, name: 'una sandía pequeña', emoji: '🍉', detail: 'Todo se prepara para conocerse.' },
  { week: 39, name: 'una calabaza grande', emoji: '🎃', detail: 'La espera se siente cada vez más real.' },
  { week: 40, name: 'una sandía', emoji: '🍉', detail: 'Tu bebé está listo para el gran encuentro.' },
  { week: 41, name: 'una sandía grande', emoji: '🍉', detail: 'Puede seguir ganando peso mientras esperan el momento.' },
  { week: 42, name: 'una sandía grande', emoji: '🍉', detail: 'Tu equipo médico puede acompañar más de cerca esta etapa.' },
];

const PREGNANCY_WEEKS = Array.from({ length: 42 }, (_, index) => index + 1);
const EARLY_PREGNANCY_IMAGELESS_WEEKS = new Set([1, 2, 3]);
const SHARED_PREGNANCY_IMAGE_WEEKS = new Set([40, 41, 42]);
type PregnancyImageFolder = 'frutas' | 'animales' | 'dulces' | 'bebe';

type PregnancyImageContext = {
  (path: string): any;
  keys: () => string[];
};

const PREGNANCY_IMAGE_FOLDER_BY_MODE: Record<PregnancyComparisonMode, PregnancyImageFolder> = {
  fruits: 'frutas',
  animals: 'animales',
  sweets: 'dulces',
  human: 'bebe',
};

const pregnancySizeImagesContext = (require as any).context(
  "../../assets/pregnancy-sizes",
  true,
  /week-\d{2}\.png$/
) as PregnancyImageContext;

const buildPregnancySizeImages = (folder: PregnancyImageFolder): Record<number, any> =>
  pregnancySizeImagesContext.keys().reduce<Record<number, any>>((images, imagePath) => {
    const match = imagePath.match(new RegExp(`^\\./${folder}/week-(\\d{2})\\.png$`));
    if (match) {
      images[Number(match[1])] = pregnancySizeImagesContext(imagePath);
    }
    return images;
  }, {});

const PREGNANCY_SIZE_IMAGES_BY_MODE = Object.entries(PREGNANCY_IMAGE_FOLDER_BY_MODE).reduce(
  (imagesByMode, [mode, folder]) => ({
    ...imagesByMode,
    [mode]: buildPregnancySizeImages(folder),
  }),
  {} as Record<PregnancyComparisonMode, Record<number, any>>
);

const getPregnancySizeImage = (
  mode: PregnancyComparisonMode,
  week: number | null
) => {
  if (!week) return null;
  if (EARLY_PREGNANCY_IMAGELESS_WEEKS.has(week)) return null;
  const imageMode = SHARED_PREGNANCY_IMAGE_WEEKS.has(week) ? 'fruits' : mode;
  return PREGNANCY_SIZE_IMAGES_BY_MODE[imageMode][week] || null;
};

const PREGNANCY_APPROX_MEASUREMENTS: Record<number, PregnancyApproxMeasurement> = {
  1: { length: 'No medible', weight: 'No medible', note: 'Aún no hay embrión formado.' },
  2: { length: 'No medible', weight: 'No medible', note: 'Semana de ovulación/fecundación aproximada.' },
  3: { length: 'Microscópico', weight: 'No medible', note: 'Está en etapa celular inicial.' },
  4: { length: 'Menos de 1 mm', weight: 'No medible' },
  5: { length: '1 a 2 mm', weight: 'No medible' },
  6: { length: '4 a 7 mm', weight: 'Menos de 1 g' },
  7: { length: '8 a 14 mm', weight: 'Menos de 1 g' },
  8: { length: '1.4 a 2 cm', weight: '1 a 2 g' },
  9: { length: '2 a 3 cm', weight: '2 a 3 g' },
  10: { length: '3 a 4 cm', weight: '3 a 5 g' },
  11: { length: '4 a 5 cm', weight: '6 a 9 g' },
  12: { length: '5 a 6.5 cm', weight: '10 a 18 g' },
  13: { length: '7 a 8 cm', weight: '20 a 30 g' },
  14: { length: '8 a 10 cm', weight: '35 a 50 g' },
  15: { length: '10 a 11 cm', weight: '60 a 80 g' },
  16: { length: '11 a 13 cm', weight: '90 a 120 g' },
  17: { length: '12 a 14 cm', weight: '120 a 160 g' },
  18: { length: '14 a 16 cm', weight: '170 a 220 g' },
  19: { length: '15 a 17 cm', weight: '220 a 280 g' },
  20: { length: '24 a 27 cm', weight: '280 a 340 g', note: 'Desde esta etapa suele estimarse de cabeza a pies.' },
  21: { length: '26 a 28 cm', weight: '330 a 400 g' },
  22: { length: '27 a 30 cm', weight: '400 a 480 g' },
  23: { length: '28 a 31 cm', weight: '470 a 560 g' },
  24: { length: '29 a 32 cm', weight: '550 a 680 g' },
  25: { length: '33 a 36 cm', weight: '620 a 750 g' },
  26: { length: '34 a 37 cm', weight: '700 a 850 g' },
  27: { length: '35 a 38 cm', weight: '800 a 980 g' },
  28: { length: '36 a 39 cm', weight: '900 g a 1.1 kg' },
  29: { length: '37 a 40 cm', weight: '1.0 a 1.3 kg' },
  30: { length: '39 a 41 cm', weight: '1.2 a 1.5 kg' },
  31: { length: '40 a 42 cm', weight: '1.4 a 1.7 kg' },
  32: { length: '41 a 44 cm', weight: '1.6 a 1.9 kg' },
  33: { length: '42 a 45 cm', weight: '1.8 a 2.1 kg' },
  34: { length: '44 a 46 cm', weight: '2.0 a 2.3 kg' },
  35: { length: '45 a 47 cm', weight: '2.2 a 2.6 kg' },
  36: { length: '46 a 48 cm', weight: '2.4 a 2.8 kg' },
  37: { length: '47 a 49 cm', weight: '2.7 a 3.1 kg' },
  38: { length: '48 a 50 cm', weight: '2.9 a 3.3 kg' },
  39: { length: '49 a 51 cm', weight: '3.1 a 3.6 kg' },
  40: { length: '50 a 52 cm', weight: '3.2 a 3.8 kg' },
  41: { length: '50 a 53 cm', weight: '3.3 a 4.0 kg' },
  42: { length: '51 a 54 cm', weight: '3.4 a 4.2 kg', note: 'Si llegas a esta semana, tu equipo médico suele acompañar más de cerca los controles.' },
};

const normalizePregnancyWeek = (weeks?: number | null): number | null => {
  if (!weeks || Number.isNaN(Number(weeks))) return null;
  return Math.max(1, Math.min(42, Math.round(Number(weeks))));
};

const getPregnancySizeComparison = (weeks?: number | null): PregnancySizeComparison | null => {
  const normalizedWeek = normalizePregnancyWeek(weeks);
  if (!normalizedWeek) return null;
  return (
    PREGNANCY_SIZE_BY_WEEK.find((item) => item.week === normalizedWeek) ||
    PREGNANCY_SIZE_BY_WEEK[PREGNANCY_SIZE_BY_WEEK.length - 1]
  );
};

const getPregnancyComparisonByMode = (
  weeks: number | null,
  mode: PregnancyComparisonMode
): PregnancySizeComparison | null => {
  const normalizedWeek = normalizePregnancyWeek(weeks);
  if (!normalizedWeek) return null;

  const fruitComparison = getPregnancySizeComparison(normalizedWeek);
  if (mode === 'fruits') return fruitComparison;

  if (normalizedWeek <= 2) {
    return {
      week: normalizedWeek,
      name: 'Sin comparativo',
      emoji: mode === 'human' ? '✨' : PREGNANCY_COMPARISON_OPTIONS.find((item) => item.id === mode)?.icon || '✨',
      detail: normalizedWeek === 1
        ? 'Aún no hay embrión medible.'
        : 'Semana de ovulación o fecundación aproximada.',
      noComparison: true,
    };
  }

  const byMode: Record<Exclude<PregnancyComparisonMode, 'fruits'>, PregnancySizeComparison[]> = {
    animals: [
      { week: 3, name: 'una pulga diminuta', emoji: '🐜', detail: 'Aún es microscópico, como un puntito vivo en desarrollo.' },
      { week: 5, name: 'una hormiguita', emoji: '🐜', detail: 'Pequeñísimo, pero con cambios muy rápidos.' },
      { week: 7, name: 'una mariquita pequeña', emoji: '🐞', detail: 'Empiezan a definirse estructuras importantes.' },
      { week: 9, name: 'un caracol bebé', emoji: '🐌', detail: 'Cada semana suma forma y movimiento.' },
      { week: 11, name: 'un colibrí pequeñito', emoji: '🐦', detail: 'Sus extremidades siguen tomando proporción.' },
      { week: 13, name: 'un ratoncito bebé', emoji: '🐭', detail: 'Inicia una etapa de crecimiento más visible.' },
      { week: 16, name: 'un hámster bebé', emoji: '🐹', detail: 'Puede comenzar una etapa de movimientos sutiles.' },
      { week: 20, name: 'un conejito pequeño', emoji: '🐰', detail: 'Mitad del camino para muchas familias.' },
      { week: 24, name: 'un gatito recién nacido', emoji: '🐱', detail: 'Crece con más presencia y responde a estímulos.' },
      { week: 28, name: 'un cachorro pequeño', emoji: '🐶', detail: 'El tercer trimestre trae mucha ganancia de peso.' },
      { week: 32, name: 'un conejo mediano', emoji: '🐇', detail: 'Toma más espacio y sus rutinas se sienten más.' },
      { week: 36, name: 'un cachorro grande', emoji: '🐕', detail: 'Ya se acerca la recta final.' },
      { week: 40, name: 'un bebé listo para nacer', emoji: '👶', detail: 'Tu bebé está listo para el gran encuentro.' },
    ],
    sweets: [
      { week: 3, name: 'una chispa de azúcar', emoji: '✨', detail: 'Aún es microscópico, como un granito dulce.' },
      { week: 5, name: 'un sprinkle', emoji: '🍬', detail: 'Muy pequeñito, pero creciendo todos los días.' },
      { week: 7, name: 'un confite pequeño', emoji: '🍬', detail: 'Su corazón y órganos principales siguen formándose.' },
      { week: 9, name: 'una gomita mini', emoji: '🍭', detail: 'Sus movimientos empiezan aunque todavía no los sientas.' },
      { week: 11, name: 'un malvavisco pequeño', emoji: '☁️', detail: 'Manitos y piecitos siguen tomando forma.' },
      { week: 13, name: 'una trufa pequeña', emoji: '🍫', detail: 'Crece con energía al iniciar el segundo trimestre.' },
      { week: 16, name: 'una dona mini', emoji: '🍩', detail: 'Puede iniciar una etapa de movimientos sutiles.' },
      { week: 20, name: 'un cupcake', emoji: '🧁', detail: 'Mitad del camino para muchas familias.' },
      { week: 24, name: 'una barra de chocolate', emoji: '🍫', detail: 'Crece con más fuerza y presencia.' },
      { week: 28, name: 'un pastelito', emoji: '🍰', detail: 'Su cerebro sigue creciendo intensamente.' },
      { week: 32, name: 'un pastel pequeño', emoji: '🎂', detail: 'Va tomando más espacio dentro de ti.' },
      { week: 36, name: 'un pastel familiar', emoji: '🎂', detail: 'Ya se acerca la recta final.' },
      { week: 40, name: 'una sorpresa lista', emoji: '🎁', detail: 'Tu bebé está listo para el gran encuentro.' },
    ],
    human: [
      { week: 3, name: 'células en desarrollo', emoji: '✨', detail: 'Aún no tiene forma de bebé; está iniciando una etapa celular clave.' },
      { week: 5, name: 'un embrión muy pequeño', emoji: '🤍', detail: 'Empiezan estructuras básicas y cambios muy rápidos.' },
      { week: 7, name: 'un embrión con latido', emoji: '💗', detail: 'El corazón y órganos principales se están formando.' },
      { week: 9, name: 'un bebé en miniatura', emoji: '👶', detail: 'Sus movimientos empiezan, aunque aún no los sientas.' },
      { week: 11, name: 'un bebé con manitos formándose', emoji: '🖐️', detail: 'Manos, pies y rasgos continúan definiéndose.' },
      { week: 13, name: 'un bebé iniciando el segundo trimestre', emoji: '👶', detail: 'Termina una etapa clave de formación.' },
      { week: 16, name: 'un bebé más activo', emoji: '🤰', detail: 'Puede empezar una etapa de movimientos sutiles.' },
      { week: 20, name: 'un bebé a mitad del camino', emoji: '👶', detail: 'Muchas familias ya pueden conocer más detalles en ultrasonido.' },
      { week: 24, name: 'un bebé más proporcionado', emoji: '🤍', detail: 'Sus pulmones, piel y sentidos siguen madurando.' },
      { week: 28, name: 'un bebé entrando al tercer trimestre', emoji: '👶', detail: 'Su cerebro y cuerpo crecen con intensidad.' },
      { week: 32, name: 'un bebé con rutinas', emoji: '💫', detail: 'Sus periodos de sueño y actividad pueden sentirse más claros.' },
      { week: 36, name: 'un bebé casi listo', emoji: '🤰', detail: 'El cuerpo se prepara para la recta final.' },
      { week: 40, name: 'un bebé listo para nacer', emoji: '👶', detail: 'Tu bebé está listo para el gran encuentro.' },
    ],
  };

  const options = byMode[mode];
  const matched = [...options].reverse().find((item) => normalizedWeek >= item.week) || options[0];
  return {
    ...matched,
    week: normalizedWeek,
  };
};

const getPregnancyWeekDetail = (
  week: number,
  size?: PregnancySizeComparison | null
): PregnancyWeekDetail => {
  const sizeText = size && !size.noComparison
    ? `Esta semana se compara con ${size.name}.`
    : 'Aún no hay un tamaño de bebé medible para comparar.';

  if (week <= 2) {
    return {
      baby: 'Todavía no hay embrión medible. Estas semanas cuentan desde la fecha de la última menstruación.',
      momBody: 'Tu cuerpo está preparando la ovulación y el revestimiento del útero para una posible implantación.',
      feelings: 'Puede sentirse como un ciclo normal: cólicos leves, cambios de flujo o sensibilidad mamaria.',
      prepare: 'Ten a mano fecha de última menstruación, hábitos actuales y medicamentos que usas. Si estás buscando embarazo, pregunta por prenatal o ácido fólico.',
      important: 'Si hay retraso menstrual, un test de embarazo suele ser más útil cerca o después de la fecha esperada de la regla.',
    };
  }

  if (week <= 4) {
    return {
      baby: `${sizeText} La implantación puede estar ocurriendo y comienza la producción de hCG.`,
      momBody: 'El útero empieza a responder a hormonas del embarazo, aunque externamente casi no hay cambios.',
      feelings: 'Puedes notar cansancio, sueño, sensibilidad en senos, flujo distinto o cólicos muy leves.',
      prepare: 'Confirma el embarazo, agenda la primera consulta y anota síntomas, sangrados, dolor o antecedentes importantes.',
      important: 'Consulta de inmediato si hay sangrado abundante, dolor fuerte de un lado, mareo intenso o desmayo.',
    };
  }

  if (week <= 8) {
    return {
      baby: `${sizeText} Se forman estructuras clave como corazón, tubo neural, brotes de brazos y piernas.`,
      momBody: 'Suben las hormonas, aumenta el volumen sanguíneo y el cuerpo empieza a adaptarse al embarazo.',
      feelings: 'Son frecuentes náuseas, cansancio, sueño, más ganas de orinar, sensibilidad a olores y cambios de apetito.',
      prepare: 'Prepara tu primera cita: lista de medicamentos, suplementos, antecedentes, alergias y fecha de última regla. Ten agua y snacks suaves si hay náuseas.',
      important: 'Entre semanas 6 y 10 algunos profesionales indican ecografía temprana para confirmar ubicación, latido y edad gestacional, según cada caso.',
    };
  }

  if (week <= 13) {
    return {
      baby: `${sizeText} Termina la etapa embrionaria y el bebé pasa a etapa fetal; órganos y rasgos siguen madurando.`,
      momBody: 'El útero crece y algunas molestias digestivas pueden aumentar por cambios hormonales.',
      feelings: 'Puede haber náuseas, cansancio, estreñimiento, acidez, cambios de humor o algo de alivio al acercarse el segundo trimestre.',
      prepare: 'Organiza exámenes iniciales, resultados y opciones de tamizaje. Decide qué información quieres conocer y qué dudas llevarás al control.',
      important: 'Suele hablarse de tamizajes del primer trimestre; la translucencia nucal se realiza aproximadamente entre semanas 11 y 14 si está indicada o disponible.',
    };
  }

  if (week <= 17) {
    return {
      baby: `${sizeText} El bebé crece rápido, sus movimientos se coordinan y sus huesos continúan fortaleciéndose.`,
      momBody: 'La barriga puede empezar a notarse. El volumen de sangre aumenta y la piel puede cambiar.',
      feelings: 'Muchas mamás sienten más energía, aunque pueden aparecer dolor lumbar, congestión nasal o ligamentos tirantes.',
      prepare: 'Busca ropa cómoda, ajusta postura al dormir, cuida hidratación y pregunta qué movimiento o ejercicio es adecuado para ti.',
      important: 'Si aún no lo hiciste, conversa sobre tamizajes del segundo trimestre y la ecografía anatómica que vendrá más adelante.',
    };
  }

  if (week <= 22) {
    return {
      baby: `${sizeText} Sus sentidos y movimientos son más claros; muchas mamás empiezan a sentir pataditas.`,
      momBody: 'El útero sube y puede cambiar tu centro de gravedad. La piel y el abdomen siguen estirándose.',
      feelings: 'Puedes sentir movimientos, tirones en bajo vientre, acidez, dolor de espalda o más apetito.',
      prepare: 'Planifica ecografía anatómica, empieza una lista básica del bebé y conversa con tu red de apoyo sobre cómo podrán ayudarte.',
      important: 'La ecografía anatómica se ofrece generalmente entre semanas 18 y 22 para revisar estructuras principales del bebé.',
    };
  }

  if (week <= 27) {
    return {
      baby: `${sizeText} Gana peso, practica movimientos respiratorios y responde más a sonidos y luz.`,
      momBody: 'El abdomen crece más rápido y puede haber retención de líquidos o molestias en espalda y pelvis.',
      feelings: 'Pueden aparecer calambres, acidez, estreñimiento, sueño interrumpido y patadas más notorias.',
      prepare: 'Revisa prueba de glucosa, descanso, alimentación, curso prenatal y ejercicios de piso pélvico si tu profesional los permite.',
      important: 'Entre semanas 24 y 28 suele realizarse tamizaje de diabetes gestacional; también pueden pedir hemograma u otros controles.',
    };
  }

  if (week <= 31) {
    return {
      baby: `${sizeText} Sigue acumulando grasa, madurando pulmones y organizando ciclos de sueño y actividad.`,
      momBody: 'El útero ocupa más espacio; respirar profundo, dormir y digerir puede sentirse diferente.',
      feelings: 'Es común notar presión pélvica, contracciones de Braxton Hicks leves, cansancio y movimientos fuertes.',
      prepare: 'Ordena documentos, contactos de emergencia, permisos/trabajo, plan de apoyo posparto y compras realmente esenciales.',
      important: 'Desde esta etapa algunos profesionales recomiendan observar patrones de movimiento fetal. Si notas una disminución clara, consulta.',
    };
  }

  if (week <= 35) {
    return {
      baby: `${sizeText} El bebé gana peso y se prepara para la vida fuera del útero; puede empezar a acomodarse cabeza abajo.`,
      momBody: 'La presión en costillas, vejiga y pelvis puede aumentar. El cuerpo empieza a ensayar para el parto.',
      feelings: 'Más cansancio, insomnio, acidez, dolor pélvico, hinchazón leve y contracciones irregulares pueden aparecer.',
      prepare: 'Deja avanzada la maleta, silla de auto, ruta al hospital, contactos, plan de parto y cuidados para los primeros días en casa.',
      important: 'En embarazos con factores de riesgo, el equipo médico puede indicar monitoreos o ecografías adicionales desde semanas 32 a 34.',
    };
  }

  return {
    baby: `${sizeText} En la recta final, el bebé sigue ganando peso y afinando funciones para nacer.`,
    momBody: 'El bebé puede descender, aumentando presión pélvica y ganas de orinar. El cuello uterino puede empezar a cambiar.',
    feelings: 'Puedes sentir presión, contracciones irregulares, cansancio, ansiedad, sueño liviano o más flujo.',
    prepare: 'Ten lista maleta, documentos, transporte y señales de parto/alarma. Define quién te acompaña y cuándo llamar o ir al hospital.',
    important: 'El tamizaje de estreptococo grupo B suele hacerse entre semanas 36 y 38. Consulta por contracciones regulares, pérdida de líquido, sangrado o menos movimientos.',
  };
};

const getPregnancyChecklist = (week: number): string[] => {
  if (week <= 4) {
    return ['Confirmar embarazo', 'Agendar primera cita prenatal', 'Revisar medicamentos con tu profesional'];
  }
  if (week <= 8) {
    return ['Preparar dudas para la cita', 'Registrar náuseas o cansancio', 'Mantener hidratación y comidas pequeñas'];
  }
  if (week <= 13) {
    return ['Preguntar por tamizajes del primer trimestre', 'Guardar resultados de exámenes', 'Revisar fecha probable de parto'];
  }
  if (week <= 17) {
    return ['Elegir ropa cómoda', 'Moverte suave si está permitido', 'Planear la ecografía anatómica'];
  }
  if (week <= 22) {
    return ['Agendar o asistir a ecografía anatómica', 'Anotar primeros movimientos si los sientes', 'Pensar en red de apoyo'];
  }
  if (week <= 27) {
    return ['Consultar por prueba de glucosa', 'Revisar descanso y postura', 'Explorar curso prenatal'];
  }
  if (week <= 31) {
    return ['Observar patrón de movimientos', 'Preparar lista básica del bebé', 'Organizar documentos médicos'];
  }
  if (week <= 35) {
    return ['Avanzar maleta del hospital', 'Revisar ruta y contactos', 'Conversar plan de parto'];
  }
  return ['Tener maleta lista', 'Confirmar señales de parto', 'Preguntar por GBS y últimos controles'];
};

const getUpcomingPregnancyControls = (week: number): string[] => {
  const controls = [
    { start: 6, end: 10, label: 'Ecografía temprana si tu profesional la indica' },
    { start: 10, end: 13, label: 'Opciones de tamizaje genético/prenatal' },
    { start: 11, end: 14, label: 'Translucencia nucal si está indicada o disponible' },
    { start: 18, end: 22, label: 'Ecografía anatómica' },
    { start: 24, end: 28, label: 'Tamizaje de diabetes gestacional' },
    { start: 28, end: 32, label: 'Revisión de crecimiento y bienestar según tu control' },
    { start: 32, end: 36, label: 'Preparación para parto y controles más frecuentes' },
    { start: 36, end: 38, label: 'Cultivo de estreptococo grupo B (GBS)' },
    { start: 40, end: 42, label: 'Seguimiento cercano o planificación de inducción según tu equipo médico' },
  ];

  return controls
    .filter((control) => control.end >= week)
    .slice(0, 3)
    .map((control) => `Semanas ${control.start}-${control.end}: ${control.label}`);
};

const getPregnancySymptomsGuidance = (week: number) => {
  const normal = week <= 13
    ? ['Náuseas', 'Sueño o cansancio', 'Sensibilidad en senos', 'Olores intensos']
    : week <= 27
      ? ['Tirones bajos leves', 'Acidez', 'Dolor de espalda', 'Cambios de apetito']
      : ['Presión pélvica', 'Braxton Hicks leves', 'Insomnio', 'Hinchazón leve'];

  const alerts = [
    'Sangrado abundante',
    'Dolor fuerte o persistente',
    'Dolor de cabeza intenso',
    'Menos movimientos claros',
  ];

  return { normal, alerts };
};

const PREGNANCY_SYMPTOM_OPTIONS = [
  'Náuseas',
  'Cansancio',
  'Acidez',
  'Dolor espalda',
  'Calambres',
  'Sueño liviano',
  'Movimientos',
  'Ánimo sensible',
];

const PREGNANCY_MODULES = [
  { id: 'plan', label: 'Plan', icon: 'checkbox-outline' },
  { id: 'controls', label: 'Controles', icon: 'medical-outline' },
  { id: 'symptoms', label: 'Síntomas', icon: 'pulse-outline' },
  { id: 'questions', label: 'Cita', icon: 'help-circle-outline' },
  { id: 'movements', label: 'Movimientos', icon: 'footsteps-outline' },
  { id: 'contractions', label: 'Contracciones', icon: 'timer-outline' },
  { id: 'prep', label: 'Preparar', icon: 'map-outline' },
  { id: 'notes', label: 'Notas', icon: 'journal-outline' },
  { id: 'family', label: 'Familia', icon: 'people-outline' },
] as const;

type PregnancyModuleId = typeof PREGNANCY_MODULES[number]['id'];

const getPregnancyQuestions = (week: number): string[] => {
  if (week <= 13) {
    return ['¿Qué exámenes necesito ahora?', '¿Qué medicamentos o suplementos son seguros?', '¿Cuándo debería consultar por sangrado o dolor?'];
  }
  if (week <= 22) {
    return ['¿Qué revisarán en la ecografía anatómica?', '¿Qué movimientos puedo esperar?', '¿Qué actividad física es adecuada para mí?'];
  }
  if (week <= 31) {
    return ['¿Cuándo hago la prueba de glucosa?', '¿Cómo reconozco contracciones de práctica?', '¿Cómo debo observar los movimientos del bebé?'];
  }
  return ['¿Cuáles son mis señales para ir al hospital?', '¿Necesito cultivo GBS?', '¿Qué debo tener listo para parto y posparto?'];
};

const getTrimesterPreparation = (week: number): string => {
  if (week <= 13) {
    return 'Primer trimestre: confirma embarazo, agenda controles, guarda exámenes, revisa medicamentos/suplementos y prioriza descanso, hidratación y comidas tolerables.';
  }
  if (week <= 27) {
    return 'Segundo trimestre: planifica ecografía anatómica, arma red de apoyo, define lista básica del bebé y conversa sobre lugar de parto y curso prenatal.';
  }
  if (week <= 36) {
    return 'Tercer trimestre: prepara maleta, documentos, silla de auto, ruta al hospital, plan de parto, apoyo posparto y compras esenciales.';
  }
  return 'Recta final: confirma señales para consultar, contactos, transporte, GBS si aplica, maleta y acompañante. Si llegas a 40+, sigue el plan de controles de tu equipo médico.';
};

const getPartnerSupportTips = (week: number): string[] => {
  if (week <= 13) return ['Acompañar en citas', 'Preparar snacks suaves', 'Ayudar con descanso'];
  if (week <= 27) return ['Escuchar sin minimizar síntomas', 'Ayudar con pendientes', 'Celebrar movimientos y controles'];
  return ['Preparar la casa', 'Revisar transporte', 'Practicar apoyo para parto y posparto'];
};

const getPregnancyCountdown = (dueDate?: string | null, week?: number | null): string => {
  if (dueDate) {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime())) {
      const days = Math.max(0, Math.ceil((due.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const weeks = Math.floor(days / 7);
      const extraDays = days % 7;
      return days === 0
        ? 'La fecha probable es hoy o ya pasó.'
        : `Faltan aprox. ${weeks} sem ${extraDays} días.`;
    }
  }

  if (week) {
    const remainingWeeks = Math.max(0, 40 - week);
    if (week > 40) return 'Tu equipo médico puede acompañar esta espera de cerca.';
    return remainingWeeks === 0 ? 'Estás en la recta final.' : `Faltan aprox. ${remainingWeeks} semanas.`;
  }

  return 'Agrega la fecha probable para ver el contador.';
};

const formatContractionDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatContractionInterval = (
  current: PregnancyContractionRecord,
  previous?: PregnancyContractionRecord
): string => {
  if (!previous) return 'Primera registrada';
  const diffMinutes = Math.max(0, Math.round((current.startedAt - previous.startedAt) / (1000 * 60)));
  if (diffMinutes < 1) return 'Menos de 1 min desde la anterior';
  return `${diffMinutes} min desde la anterior`;
};


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

  const [todayRecipe, setTodayRecipe] = useState<any>(null);
  const [loadingTodayRecipe, setLoadingTodayRecipe] = useState(false);

  const [activeConsultations, setActiveConsultations] = useState<any[]>([]);
  const [loadingConsultations, setLoadingConsultations] = useState(false);
  const [selectedPregnancyWeek, setSelectedPregnancyWeek] = useState<number | null>(null);
  const [pregnancyComparisonMode, setPregnancyComparisonMode] = useState<PregnancyComparisonMode>('human');
  const [showPregnancyDetailModal, setShowPregnancyDetailModal] = useState(false);
  const [showPregnancyImageModal, setShowPregnancyImageModal] = useState(false);
  const [pregnancyChecklistState, setPregnancyChecklistState] = useState<Record<string, boolean>>({});
  const [pregnancySymptoms, setPregnancySymptoms] = useState<string[]>([]);
  const [pregnancyDiaryNote, setPregnancyDiaryNote] = useState('');
  const [pregnancyMovementCount, setPregnancyMovementCount] = useState(0);
  const [activePregnancyModule, setActivePregnancyModule] = useState<PregnancyModuleId>('plan');
  const [showPregnancyModuleModal, setShowPregnancyModuleModal] = useState(false);
  const [pregnancyContractions, setPregnancyContractions] = useState<PregnancyContractionRecord[]>([]);
  const [activeContractionStartedAt, setActiveContractionStartedAt] = useState<number | null>(null);
  const [contractionTick, setContractionTick] = useState(Date.now());
  const [showPregnancyBirthDatePicker, setShowPregnancyBirthDatePicker] = useState(false);
  const [pregnancyBirthDate, setPregnancyBirthDate] = useState(new Date());
  const [updatingPregnancyStatus, setUpdatingPregnancyStatus] = useState(false);

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
  const pregnancyWeekScrollRef = useRef<ScrollView>(null);
  const activitiesSectionRef = useRef<View>(null);
  const todayActivitiesRef = useRef<View>(null);
  const [pregnancyWeekScrollerWidth, setPregnancyWeekScrollerWidth] = useState(0);
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
  const todayLoadInFlightKeyRef = useRef<string | null>(null);
  const activitySuggestionsInFlightRef = useRef(false);
  const activitySuggestionsInFlightChildRef = useRef<string | null>(null);
  const lastActivitySuggestionsChildRef = useRef<string | null>(null);
  const selectedChildIdRef = useRef<string | null>(null);
  const loadDataInFlightRef = useRef(false);
  const lastLoadDataAtRef = useRef(0);
  const loadProfileInFlightRef = useRef(false);
  const lastFocusReloadRef = useRef(0);
  const lastForceReloadRef = useRef<number | null>(null);

  const resetChildScopedTodayData = useCallback(() => {
    setActivitySuggestions(null);
    setTodayGuide(null);
    setTodayGuideError(null);
    setTodayFaqQuestions([]);
    setTodayRecipe(null);
    setSelectedActivityDetail(null);
    setShowActivityDetailModal(false);
    setShowPregnancyDetailModal(false);
    setShowPregnancyImageModal(false);
    setShowPregnancyModuleModal(false);
    setLoadingTodayGuide(true);
    setLoadingTodayFaq(true);
    setLoadingTodayRecipe(false);
    setLoadingActivities(false);
    lastActivitySuggestionsChildRef.current = null;
  }, []);

  useEffect(() => {
    loadData();
    loadUserProfile();

    // Configurar handler de respuestas a notificaciones
    const subscription = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const loadPregnancyComparisonMode = async () => {
      try {
        const savedMode = await AsyncStorage.getItem('pregnancyComparisonMode');
        if (
          savedMode === 'fruits' ||
          savedMode === 'animals' ||
          savedMode === 'sweets' ||
          savedMode === 'human'
        ) {
          setPregnancyComparisonMode(savedMode);
        }
      } catch (error) {
        console.warn('⚠️ [PREGNANCY] Error cargando modo de comparativo:', error);
      }
    };

    loadPregnancyComparisonMode();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeContractionStartedAt) return;
    const interval = setInterval(() => setContractionTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeContractionStartedAt]);

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      'selectedChildChanged',
      ({ childId, child }: { childId?: string; child?: Child }) => {
        if (!childId || selectedChild?.id === childId) return;

        const childToSelect = children.find((item) => item.id === childId) || child;
        if (!childToSelect) return;

        if (selectedChildIdRef.current !== childId) {
          resetChildScopedTodayData();
          lastTodayLoadKeyRef.current = null;
        }
        selectedChildIdRef.current = childId;
        setSelectedChild(childToSelect);
      }
    );

    return () => {
      subscription.remove();
    };
  }, [children, selectedChild?.id, resetChildScopedTodayData]);

  useEffect(() => {
    const currentChildId = selectedChild?.id || null;
    if (selectedChildIdRef.current && selectedChildIdRef.current !== currentChildId) {
      resetChildScopedTodayData();
      lastTodayLoadKeyRef.current = null;
    }
    selectedChildIdRef.current = currentChildId;
  }, [selectedChild?.id, resetChildScopedTodayData]);

  useEffect(() => {
    if (!selectedChild?.isUnborn) {
      setSelectedPregnancyWeek(null);
      return;
    }

    const currentWeek = normalizePregnancyWeek(
      selectedChild.currentGestationWeeks ??
      selectedChild.gestationWeeks ??
      selectedChild.registeredGestationWeeks ??
      null
    );

    setSelectedPregnancyWeek(currentWeek);
  }, [
    selectedChild?.id,
    selectedChild?.isUnborn,
    selectedChild?.currentGestationWeeks,
    selectedChild?.gestationWeeks,
    selectedChild?.registeredGestationWeeks,
  ]);

  useEffect(() => {
    const loadPregnancyWeekState = async () => {
      if (!selectedChild?.isUnborn || !selectedChild.id || !selectedPregnancyWeek) {
        setPregnancyChecklistState({});
        setPregnancySymptoms([]);
        setPregnancyDiaryNote('');
        setPregnancyMovementCount(0);
        setPregnancyContractions([]);
        setActiveContractionStartedAt(null);
        return;
      }

      const storageKey = `pregnancyWeek:${selectedChild.id}:${selectedPregnancyWeek}`;
      try {
        const raw = await AsyncStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        setPregnancyChecklistState(parsed.checklist || {});
        setPregnancySymptoms(Array.isArray(parsed.symptoms) ? parsed.symptoms : []);
        setPregnancyDiaryNote(typeof parsed.diaryNote === 'string' ? parsed.diaryNote : '');
        setPregnancyMovementCount(Number(parsed.movementCount) || 0);
        setPregnancyContractions(Array.isArray(parsed.contractions) ? parsed.contractions : []);
        setActiveContractionStartedAt(null);
      } catch (error) {
        console.warn('⚠️ [PREGNANCY] Error cargando estado semanal:', error);
        setPregnancyChecklistState({});
        setPregnancySymptoms([]);
        setPregnancyDiaryNote('');
        setPregnancyMovementCount(0);
        setPregnancyContractions([]);
        setActiveContractionStartedAt(null);
      }
    };

    loadPregnancyWeekState();
  }, [selectedChild?.id, selectedChild?.isUnborn, selectedPregnancyWeek]);

  // Refrescar datos cuando se regrese a esta pantalla o cuando cambie la ubicación
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const now = Date.now();

      // Evitar múltiples recargas si se ejecuta muy rápido (debounce de 2 segundos)
      if (now - lastFocusReloadRef.current < 2000) {
        return;
      }

      lastFocusReloadRef.current = now;

      // Ejecutar cargas de forma no-bloqueante
      setTimeout(() => {
        loadData();
      }, 0);

      setTimeout(() => {
        loadUserProfile();
      }, 100);

      // Registrar token de notificaciones después de un delay
      setTimeout(() => {
        notificationService.registerToken().catch((error) => {
          console.error('❌ [HOME] Error registrando token:', error);
        });
      }, 500);
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
          setSelectedChild(child);
        }
      }
    };

    // Recargar cuando se reciban parámetros de navegación
    const forceReload = route?.params?.forceReload;
    const locationChanged = route?.params?.locationChanged;

    // Evitar ejecutar múltiples veces con el mismo forceReload
    if (forceReload && lastForceReloadRef.current === forceReload) {
      return;
    }

    if (route?.params?.refresh || route?.params?.selectedChildId || forceReload || locationChanged) {

      // Marcar este forceReload como procesado
      if (forceReload) {
        lastForceReloadRef.current = forceReload;
      }

      if (locationChanged) {
        // Resetear el debounce para permitir recarga inmediata
        lastFocusReloadRef.current = 0;

        // Resetear la clave de carga de "Hoy" para forzar recarga en el próximo ciclo
        lastTodayLoadKeyRef.current = null;
        todayLoadInFlightRef.current = false;
        todayLoadInFlightKeyRef.current = null;

        // Recargar perfil
        setTimeout(() => {
          loadUserProfile();
        }, 100);

        // Recargar datos de hijos
        setTimeout(() => {
          loadData();
        }, 200);
      }

      handleHeaderSelection();
    }
  }, [route?.params?.refresh, route?.params?.selectedChildId, route?.params?.forceReload, route?.params?.locationChanged, children]);

  // 🔔 Iniciar verificaciones periódicas de notificaciones cuando hay hijo seleccionado
  useEffect(() => {
    if (selectedChild?.id) {
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
            await syncUserLocation(todayLat, todayLon);
            // Recargar el perfil después de sincronizar
            await loadUserProfile();
          } else {
          }
        }
      }
      setIsLocationReady(true);
    };
    run();
  }, [selectedChild, todayLat, todayLon, todayLocationLoading, todayLocationGranted, todayLocationError, profile?.cityName, profile?.countryName]);

  useEffect(() => {
    if (!selectedChild || !isLocationReady) return;
    const loadKey = `${selectedChild.id}|${todayLat?.toFixed(4) || 'na'}|${todayLon?.toFixed(4) || 'na'}`;
    if (todayLoadInFlightRef.current && todayLoadInFlightKeyRef.current === loadKey) return;
    if (lastTodayLoadKeyRef.current === loadKey) return;

    const loadAll = async () => {
      const childForLoad = selectedChild;
      try {
        todayLoadInFlightRef.current = true;
        todayLoadInFlightKeyRef.current = loadKey;
        lastTodayLoadKeyRef.current = loadKey;


        // Ejecutar las cargas con un timeout de 15 segundos cada una
        // Esto evita que la app se congele si alguna API no responde
        const timeout = (ms: number) => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), ms)
        );

        const withTimeout = (promise: Promise<any>, name: string) =>
          Promise.race([
            promise,
            timeout(15000)
          ]).catch(error => {
            console.warn(`⚠️ [HOME] ${name} falló o timeout:`, error.message);
            return null;
          });

        await Promise.allSettled([
          withTimeout(loadTodayRecommendations(), 'Recomendaciones'),
          withTimeout(loadTodayMarket(), 'Market'),
          withTimeout(loadTodayCommunityPosts(), 'Posts'),
          withTimeout(loadActivitySuggestions(childForLoad.id), 'Actividades'),
          withTimeout(loadTodayGuide(childForLoad), 'Guía'),
          withTimeout(loadTodayFaq(childForLoad.id), 'FAQ'),
          withTimeout(loadTodayRecipe(childForLoad), 'Receta'),
          withTimeout(loadActiveConsultations(), 'Consultas'),
        ]);

      } catch (error) {
        console.error('❌ [HOME] Error cargando datos:', error);
      } finally {
        if (todayLoadInFlightKeyRef.current === loadKey) {
          todayLoadInFlightRef.current = false;
          todayLoadInFlightKeyRef.current = null;
        }
      }
    };

    // Ejecutar con un pequeño delay para no bloquear el render
    setTimeout(() => {
      loadAll();
    }, 100);
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
    if (loadProfileInFlightRef.current) {
      return;
    }

    try {
      loadProfileInFlightRef.current = true;

      if (user?.id) {
        const profileResponse = await profileService.getProfile();
        if (profileResponse.success && profileResponse.data) {

          // Actualizar el estado local del perfil primero
          setProfile(profileResponse.data);

          // Solo actualizar el contexto de usuario si hay cambios significativos
          // Esto evita loops infinitos
          if (
            profileResponse.data.cityName !== user.cityName ||
            profileResponse.data.countryName !== user.countryName
          ) {
            // @ts-ignore
            setUser((prevUser: any) => ({
              ...prevUser!,
              cityName: profileResponse.data.cityName,
              countryName: profileResponse.data.countryName,
              cityId: profileResponse.data.cityId,
              countryId: profileResponse.data.countryId,
            }));
          }
        }
      }
    } catch (error) {
      console.error("❌ [PROFILE] Error cargando perfil:", error);
    } finally {
      loadProfileInFlightRef.current = false;
    }
  };

  // Función para cargar sugerencias de actividades
  const loadActivitySuggestions = async (childId: string) => {
    if (
      activitySuggestionsInFlightRef.current &&
      activitySuggestionsInFlightChildRef.current === childId
    ) {
      return;
    }
    if (lastActivitySuggestionsChildRef.current === childId && activitySuggestions) return;
    try {
      activitySuggestionsInFlightRef.current = true;
      activitySuggestionsInFlightChildRef.current = childId;
      setLoadingActivities(true);

      const response = await activitiesService.getActivitySuggestions(childId);

      if (selectedChildIdRef.current !== childId) return;

      if (response.success) {
        setActivitySuggestions(response);
        lastActivitySuggestionsChildRef.current = childId;
      }
    } catch (error) {
      console.error('❌ [ACTIVITIES] Error cargando sugerencias:', error);
      if (selectedChildIdRef.current === childId) {
        setActivitySuggestions(null);
      }
    } finally {
      if (activitySuggestionsInFlightChildRef.current === childId) {
        activitySuggestionsInFlightRef.current = false;
        activitySuggestionsInFlightChildRef.current = null;
      }
      if (selectedChildIdRef.current === childId) {
        setLoadingActivities(false);
      }
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
      const items =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.data) && response.data.data) ||
        (Array.isArray(response?.data?.posts) && response.data.posts) ||
        (Array.isArray(response?.posts) && response.posts) ||
        (Array.isArray(response) && response) ||
        [];
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
    const childId = child.id;
    try {
      setLoadingTodayGuide(true);
      setTodayGuideError(null);

      if (!childId) {
        setTodayGuide(null);
        setTodayGuideError('No se pudo determinar el niño para la guía');
        return;
      }


      const response = await learningService.getTodayGuide({ childId });

      if (selectedChildIdRef.current !== childId) return;

      if (response?.success && response?.data) {
        setTodayGuide(response.data);
      } else {
        setTodayGuide(null);
      }
    } catch (error: any) {
      console.error('❌ [GUIDE] Error cargando guía de hoy:', error);
      if (selectedChildIdRef.current === childId) {
        setTodayGuide(null);
        setTodayGuideError('No se pudo cargar la guía de hoy');
      }
    } finally {
      if (selectedChildIdRef.current === childId) {
        setLoadingTodayGuide(false);
      }
    }
  };

  const loadTodayRecipe = async (child: Child) => {
    const childId = child.id;
    try {
      setLoadingTodayRecipe(true);

      if (!childId) {
        setTodayRecipe(null);
        return;
      }

      if (child.isUnborn) {
        if (selectedChildIdRef.current === childId) {
          setTodayRecipe(null);
        }
        return;
      }

      // Determinar qué tipo de comida mostrar basado en la hora
      const currentHour = new Date().getHours();
      let mealType: 'breakfast' | 'lunch' | 'dinner';

      if (currentHour < 11) {
        mealType = 'breakfast';
      } else if (currentHour < 17) {
        mealType = 'lunch';
      } else {
        mealType = 'dinner';
      }


      const recipe = await nutritionService.getTodayRecipe(childId, mealType);

      if (selectedChildIdRef.current !== childId) return;
      setTodayRecipe(recipe);
    } catch (error: any) {
      console.error('❌ [HOME RECIPE] Error cargando receta del día:', error);
      if (selectedChildIdRef.current === childId) {
        setTodayRecipe(null);
      }
    } finally {
      if (selectedChildIdRef.current === childId) {
        setLoadingTodayRecipe(false);
      }
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
      if (selectedChildIdRef.current !== childId) return;
      setTodayFaqQuestions(questions);
    } catch (error) {
      console.error('❌ [FAQ] Error cargando preguntas frecuentes:', error);
      if (selectedChildIdRef.current === childId) {
        setTodayFaqQuestions([]);
      }
    } finally {
      if (selectedChildIdRef.current === childId) {
        setLoadingTodayFaq(false);
      }
    }
  };

  const loadActiveConsultations = async () => {
    try {
      setLoadingConsultations(true);
      const response = await consultationsService.getConsultations();

      // Extraer el array de consultas de la respuesta
      const consultations = response.data || response;

      // Log de cada consulta y su estado
      consultations.forEach((c: any, index: number) => {
      });

      // Filtrar consultas activas (pending, accepted, in_progress) y completadas recientes (últimas 24h)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const relevant = consultations.filter((c: any) => {
        // Incluir todas las pendientes, aceptadas y en progreso
        if (['pending', 'accepted', 'in_progress'].includes(c.status)) {
          return true;
        }

        // Incluir completadas de las últimas 24 horas
        if (c.status === 'completed' && c.schedule?.completedAt) {
          const completedDate = new Date(c.schedule.completedAt);
          const isRecent = completedDate >= oneDayAgo;
          return isRecent;
        }

        return false;
      });


      // Normalizar el campo consultationId (el backend puede devolver 'id' o 'consultationId')
      const normalized = relevant.map((c: any) => ({
        ...c,
        consultationId: c.consultationId || c.id,
      }));

      // Ordenar por fecha: pendientes y en progreso primero, luego por fecha más reciente
      normalized.sort((a: any, b: any) => {
        // Prioridad: in_progress > accepted > pending > completed
        const priorityOrder: any = {
          'in_progress': 1,
          'accepted': 2,
          'pending': 3,
          'completed': 4,
        };

        const priorityA = priorityOrder[a.status] || 5;
        const priorityB = priorityOrder[b.status] || 5;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // Si tienen la misma prioridad, ordenar por fecha más reciente
        const dateA = new Date(a.schedule?.requestedAt || a.createdAt || 0);
        const dateB = new Date(b.schedule?.requestedAt || b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });

      normalized.forEach((c: any, index: number) => {
      });

      setActiveConsultations(normalized);
    } catch (error) {
      console.error('❌ [HOME] Error cargando consultas:', error);
      setActiveConsultations([]);
    } finally {
      setLoadingConsultations(false);
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

  const openSpecialists = (source: string, intent?: string) => {
    analyticsService.logEvent('specialists_promo_clicked', {
      source,
      intent: intent || 'browse',
      child_id: selectedChild?.id,
      is_pregnancy: isPregnancyProfile,
      pregnancy_week: pregnancyWeekToShow,
    });

    (navigation as any).navigate('SpecialistsList', {
      source,
      intent,
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

  const playWhiteNoise = async () => {
    try {
      const sound = whiteNoiseSound || (await loadWhiteNoiseSound());
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;

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
    } catch (error) {
      console.error('❌ [WHITE NOISE] Error reproduciendo:', error);
      setWhiteNoiseError('Error al reproducir. Por favor, intenta de nuevo.');
    }
  };

  const pauseWhiteNoise = async () => {
    try {
      const sound = whiteNoiseSound;
      if (!sound) return;

      const status = await sound.getStatusAsync();
      if (!status.isLoaded || !status.isPlaying) return;

      await sound.pauseAsync();
      setWhiteNoisePlaying(false);

      if (whiteNoiseTimer) {
        clearTimeout(whiteNoiseTimer);
        setWhiteNoiseTimer(null);
      }

      analyticsService.logEvent('white_noise_pause', {
        child_id: selectedChild?.id || null,
      });
    } catch (error) {
      console.error('❌ [WHITE NOISE] Error pausando:', error);
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
    setImageErrors((prev) => new Set(prev).add(childId));
  };

  const updatePregnancyComparisonMode = async (mode: PregnancyComparisonMode) => {
    setPregnancyComparisonMode(mode);
    try {
      await AsyncStorage.setItem('pregnancyComparisonMode', mode);
    } catch (error) {
      console.warn('⚠️ [PREGNANCY] Error guardando modo de comparativo:', error);
    }
  };

  const savePregnancyWeekState = async (updates: {
    checklist?: Record<string, boolean>;
    symptoms?: string[];
    diaryNote?: string;
    movementCount?: number;
    contractions?: PregnancyContractionRecord[];
  }) => {
    if (!selectedChild?.id || !selectedPregnancyWeek) return;

    const nextState = {
      checklist: updates.checklist ?? pregnancyChecklistState,
      symptoms: updates.symptoms ?? pregnancySymptoms,
      diaryNote: updates.diaryNote ?? pregnancyDiaryNote,
      movementCount: updates.movementCount ?? pregnancyMovementCount,
      contractions: updates.contractions ?? pregnancyContractions,
    };

    try {
      await AsyncStorage.setItem(
        `pregnancyWeek:${selectedChild.id}:${selectedPregnancyWeek}`,
        JSON.stringify(nextState)
      );
    } catch (error) {
      console.warn('⚠️ [PREGNANCY] Error guardando estado semanal:', error);
    }
  };

  const togglePregnancyChecklistItem = (item: string) => {
    const nextChecklist = {
      ...pregnancyChecklistState,
      [item]: !pregnancyChecklistState[item],
    };
    setPregnancyChecklistState(nextChecklist);
    savePregnancyWeekState({ checklist: nextChecklist });
  };

  const togglePregnancySymptom = (symptom: string) => {
    const nextSymptoms = pregnancySymptoms.includes(symptom)
      ? pregnancySymptoms.filter((item) => item !== symptom)
      : [...pregnancySymptoms, symptom];
    setPregnancySymptoms(nextSymptoms);
    savePregnancyWeekState({ symptoms: nextSymptoms });
  };

  const updatePregnancyDiaryNote = (note: string) => {
    setPregnancyDiaryNote(note);
    savePregnancyWeekState({ diaryNote: note });
  };

  const addPregnancyMovement = () => {
    const nextCount = pregnancyMovementCount + 1;
    setPregnancyMovementCount(nextCount);
    savePregnancyWeekState({ movementCount: nextCount });
  };

  const resetPregnancyMovements = () => {
    setPregnancyMovementCount(0);
    savePregnancyWeekState({ movementCount: 0 });
  };

  const startPregnancyContraction = () => {
    setActiveContractionStartedAt(Date.now());
    setContractionTick(Date.now());
  };

  const stopPregnancyContraction = () => {
    if (!activeContractionStartedAt) return;
    const endedAt = Date.now();
    const durationSeconds = Math.max(1, Math.round((endedAt - activeContractionStartedAt) / 1000));
    const nextContractions = [
      {
        startedAt: activeContractionStartedAt,
        endedAt,
        durationSeconds,
      },
      ...pregnancyContractions,
    ].slice(0, 10);
    setPregnancyContractions(nextContractions);
    setActiveContractionStartedAt(null);
    savePregnancyWeekState({ contractions: nextContractions });
  };

  const resetPregnancyContractions = () => {
    setPregnancyContractions([]);
    setActiveContractionStartedAt(null);
    savePregnancyWeekState({ contractions: [] });
  };

  const syncPregnancyProfileAfterChildrenChange = async (nextChildren: Child[]) => {
    const unbornChildren = nextChildren.filter((child) => child.isUnborn);
    const isStillPregnant = unbornChildren.length > 0;
    const nextPregnancyWeeks = normalizePregnancyWeek(
      unbornChildren[0]?.currentGestationWeeks ??
      unbornChildren[0]?.gestationWeeks ??
      unbornChildren[0]?.registeredGestationWeeks ??
      null
    );
    const profilePayload: {
      isPregnant: boolean;
      gestationWeeks?: number;
    } = {
      isPregnant: isStillPregnant,
    };

    if (isStillPregnant && nextPregnancyWeeks) {
      profilePayload.gestationWeeks = nextPregnancyWeeks;
    }

    await profileService.updateProfile(profilePayload);

    const storedUser = await AsyncStorage.getItem('userData');
    const storedUserData = storedUser ? JSON.parse(storedUser) : {};
    const updatedUserData = {
      ...storedUserData,
      ...(user || {}),
      isPregnant: isStillPregnant,
      updatedAt: new Date().toISOString(),
    };

    if (isStillPregnant && nextPregnancyWeeks) {
      updatedUserData.gestationWeeks = nextPregnancyWeeks;
    } else {
      delete updatedUserData.gestationWeeks;
    }

    await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
    setProfile((prevProfile: any) => ({
      ...(prevProfile || {}),
      isPregnant: isStillPregnant,
      gestationWeeks: isStillPregnant ? nextPregnancyWeeks ?? prevProfile?.gestationWeeks : undefined,
    }));
  };

  const finishPregnancyStatusUpdate = async (
    nextChildren: Child[],
    nextSelectedChild: Child | null
  ) => {
    setChildren(nextChildren);
    setSelectedChild(nextSelectedChild);

    if (nextSelectedChild?.id) {
      await AsyncStorage.setItem('selectedChildId', nextSelectedChild.id);
      selectedChildIdRef.current = nextSelectedChild.id;
      DeviceEventEmitter.emit('selectedChildChanged', nextSelectedChild.id);
    } else {
      await AsyncStorage.removeItem('selectedChildId');
      selectedChildIdRef.current = null;
      DeviceEventEmitter.emit('selectedChildChanged', null);
    }

    await syncPregnancyProfileAfterChildrenChange(nextChildren);
    DeviceEventEmitter.emit('childrenUpdated');
  };

  const handlePregnancyBorn = async (birthDate: Date) => {
    if (!selectedChild?.id || !selectedChild.isUnborn || updatingPregnancyStatus) return;

    setUpdatingPregnancyStatus(true);
    try {
      const birthDateText = formatDateForApi(birthDate);
      const response = await childrenService.updateChild(selectedChild.id, {
        isUnborn: false,
        birthDate: birthDateText,
        ageInMonths: 0,
      });
      const responseChild = response?.data || response?.child || response || {};
      const bornChild: Child = {
        ...selectedChild,
        ...responseChild,
        isUnborn: false,
        birthDate: responseChild.birthDate || birthDateText,
        ageInMonths: responseChild.ageInMonths ?? responseChild.currentAgeInMonths ?? 0,
        currentAgeInMonths: responseChild.currentAgeInMonths ?? 0,
        gestationWeeks: null,
        currentGestationWeeks: null,
        registeredGestationWeeks: null,
      };
      const nextChildren = children.map((child) =>
        child.id === selectedChild.id ? bornChild : child
      );

      await finishPregnancyStatusUpdate(nextChildren, bornChild);
      setShowPregnancyBirthDatePicker(false);
      setShowPregnancyDetailModal(false);
      setShowPregnancyImageModal(false);
      setShowPregnancyModuleModal(false);
      Alert.alert('Listo', 'Actualizamos el perfil: ahora este bebé aparece como nacido.');
    } catch (error) {
      console.error('❌ [PREGNANCY] Error marcando bebé como nacido:', error);
      Alert.alert('Error', 'No pudimos actualizar el estado. Intenta nuevamente.');
    } finally {
      setUpdatingPregnancyStatus(false);
    }
  };

  const handleEndPregnancy = async () => {
    if (!selectedChild?.id || !selectedChild.isUnborn || updatingPregnancyStatus) return;

    setUpdatingPregnancyStatus(true);
    try {
      await childrenService.deleteChild(selectedChild.id);
      const remainingChildren = children.filter((child) => child.id !== selectedChild.id);
      const nextSelectedChild = remainingChildren[0] || null;

      await finishPregnancyStatusUpdate(remainingChildren, nextSelectedChild);
      setShowPregnancyBirthDatePicker(false);
      setShowPregnancyDetailModal(false);
      setShowPregnancyImageModal(false);
      setShowPregnancyModuleModal(false);
      Alert.alert('Listo', 'Dimos de baja este embarazo de tus bebés activos.');
    } catch (error) {
      console.error('❌ [PREGNANCY] Error dando de baja embarazo:', error);
      Alert.alert('Error', 'No pudimos dar de baja este embarazo. Intenta nuevamente.');
    } finally {
      setUpdatingPregnancyStatus(false);
    }
  };

  const confirmEndPregnancy = () => {
    Alert.alert(
      'Ya no estoy embarazada',
      'Esto quitará este embarazo de tus bebés activos. Úsalo si hubo una pérdida o si necesitas cerrar este registro.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: handleEndPregnancy,
        },
      ]
    );
  };

  const openPregnancyBirthDatePicker = () => {
    setPregnancyBirthDate(new Date());
    setShowPregnancyBirthDatePicker(true);
  };


  const handleDouliPress = () => {
    // Navegar al tab Doula
    (navigation as any).navigate("MainTabs", {
      screen: "Doula",
    });
  };

  const userDisplayName = (
    user?.name ||
    user?.displayName ||
    (user as any)?.fullName ||
    (user as any)?.firstName ||
    ''
  ).trim();
  const userFirstName = userDisplayName ? userDisplayName.split(/\s+/)[0] : 'Mamá';
  const childFirstName = selectedChild?.name?.split(' ')[0] || 'Tu bebé';
  const isPregnancyProfile = Boolean(selectedChild?.isUnborn);
  const selectedChildIndex = selectedChild
    ? Math.max(0, children.findIndex((child) => child.id === selectedChild.id))
    : 0;
  const pregnancyWeeks = selectedChild?.currentGestationWeeks ??
    selectedChild?.gestationWeeks ??
    selectedChild?.registeredGestationWeeks ??
    null;
  const currentPregnancyWeek = normalizePregnancyWeek(pregnancyWeeks);
  const pregnancyWeekToShow = selectedPregnancyWeek ?? currentPregnancyWeek;

  useEffect(() => {
    if (!pregnancyWeekToShow || !pregnancyWeekScrollerWidth) return;

    const selectedIndex = pregnancyWeekToShow - 1;
    const centeredOffset = Math.max(
      0,
      selectedIndex * PREGNANCY_WEEK_CHIP_STEP -
        pregnancyWeekScrollerWidth / 2 +
        PREGNANCY_WEEK_CHIP_SIZE / 2
    );

    const frame = requestAnimationFrame(() => {
      pregnancyWeekScrollRef.current?.scrollTo({
        x: centeredOffset,
        y: 0,
        animated: true,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [pregnancyWeekScrollerWidth, pregnancyWeekToShow]);

  const pregnancySize = selectedChild?.isUnborn
    ? getPregnancyComparisonByMode(pregnancyWeekToShow, pregnancyComparisonMode)
    : null;
  const isEarlyPregnancyWeek = Boolean(
    pregnancyWeekToShow && EARLY_PREGNANCY_IMAGELESS_WEEKS.has(pregnancyWeekToShow)
  );
  const pregnancySizeImage = getPregnancySizeImage(pregnancyComparisonMode, pregnancyWeekToShow);
  const isHumanPregnancyComparison = pregnancyComparisonMode === 'human';
  const pregnancyWeekDetail = pregnancySize && pregnancyWeekToShow
    ? getPregnancyWeekDetail(pregnancyWeekToShow, pregnancySize)
    : null;
  const pregnancyApproxMeasurement = pregnancyWeekToShow
    ? PREGNANCY_APPROX_MEASUREMENTS[pregnancyWeekToShow]
    : null;
  const pregnancyChecklist = pregnancyWeekToShow ? getPregnancyChecklist(pregnancyWeekToShow) : [];
  const pregnancyControls = pregnancyWeekToShow ? getUpcomingPregnancyControls(pregnancyWeekToShow) : [];
  const pregnancySymptomsGuidance = pregnancyWeekToShow
    ? getPregnancySymptomsGuidance(pregnancyWeekToShow)
    : { normal: [], alerts: [] };
  const pregnancyQuestions = pregnancyWeekToShow ? getPregnancyQuestions(pregnancyWeekToShow) : [];
  const pregnancyTrimesterPrep = pregnancyWeekToShow ? getTrimesterPreparation(pregnancyWeekToShow) : '';
  const pregnancySupportTips = pregnancyWeekToShow ? getPartnerSupportTips(pregnancyWeekToShow) : [];
  const pregnancyCountdown = getPregnancyCountdown(selectedChild?.dueDate, pregnancyWeekToShow);
  const pregnancyComparisonLabel = PREGNANCY_COMPARISON_OPTIONS.find(
    (option) => option.id === pregnancyComparisonMode
  )?.label || 'Embarazo';
  const pregnancyImageShareTitle = pregnancyWeekToShow
    ? `Semana ${pregnancyWeekToShow} de embarazo`
    : 'Embarazo';
  const pregnancyImageShareFact = pregnancyWeekToShow
    ? pregnancyWeekToShow < 14
      ? 'esta etapa es clave para la formación de sus órganos y rasgos principales.'
      : pregnancyWeekToShow < 28
        ? 'sus sentidos y movimientos se vuelven cada vez más presentes.'
        : 'está ganando peso, practicando movimientos y preparándose para conocernos.'
    : 'cada semana trae cambios importantes.';
  const pregnancyImageShareMeasurement = pregnancyApproxMeasurement
    ? `Tamaño aproximado: ${pregnancyApproxMeasurement.length}; peso: ${pregnancyApproxMeasurement.weight}.`
    : null;
  const pregnancyImageShareMessage = [
    'Quería compartirte cómo está mi bebé.',
    pregnancyWeekToShow ? `Hoy vamos en la semana ${pregnancyWeekToShow} de embarazo.` : null,
    pregnancyImageShareMeasurement,
    pregnancyImageShareFact,
    `Lo estoy viendo en Munpa con la vista de ${pregnancyComparisonLabel.toLowerCase()}.`,
  ].filter(Boolean).join('\n');
  const openPregnancyImageViewer = () => {
    if (pregnancySizeImage) {
      setShowPregnancyImageModal(true);
      return;
    }

    setShowPregnancyDetailModal(true);
  };
  const openPregnancyImageViewerFromDetail = () => {
    if (!pregnancySizeImage) return;

    setShowPregnancyDetailModal(false);
    setTimeout(() => {
      setShowPregnancyImageModal(true);
    }, 220);
  };
  const sharePregnancyImage = async () => {
    if (!pregnancySizeImage) {
      Alert.alert('Imagen pendiente', 'Todavía no hay imagen para compartir en esta semana.');
      return;
    }

    try {
      const resolvedImage = Image.resolveAssetSource(pregnancySizeImage);
      await Share.share({
        title: pregnancyImageShareTitle,
        message: pregnancyImageShareMessage,
        url: resolvedImage?.uri,
      });
    } catch (error) {
      console.warn('⚠️ [PREGNANCY] Error compartiendo imagen:', error);
      Alert.alert('No se pudo compartir', 'Intenta nuevamente en unos segundos.');
    }
  };
  const completedPregnancyChecklist = pregnancyChecklist.filter((item) => pregnancyChecklistState[item]).length;
  const activeContractionElapsedSeconds = activeContractionStartedAt
    ? Math.max(0, Math.round((contractionTick - activeContractionStartedAt) / 1000))
    : 0;
  const pregnancyModulePreviews: Record<PregnancyModuleId, string> = {
    plan: `${completedPregnancyChecklist}/${pregnancyChecklist.length || 0} listo`,
    controls: pregnancyControls[0]?.replace(/^Semanas /, 'Sem. ') || 'Sin pendientes',
    symptoms: pregnancySymptoms.length ? `${pregnancySymptoms.length} registrados` : 'Registrar hoy',
    questions: `${pregnancyQuestions.length} preguntas`,
    movements: pregnancyWeekToShow && pregnancyWeekToShow >= 20 ? `${pregnancyMovementCount} hoy` : 'Disponible pronto',
    contractions: pregnancyContractions.length ? `${pregnancyContractions.length} registradas` : 'Cronómetro',
    prep: pregnancyWeekToShow && pregnancyWeekToShow <= 13 ? 'Primer trimestre' : pregnancyWeekToShow && pregnancyWeekToShow <= 27 ? 'Segundo trimestre' : 'Tercer trimestre',
    notes: pregnancyDiaryNote ? 'Nota guardada' : 'Escribir nota',
    family: `${pregnancySupportTips.length} ideas`,
  };
  const childAgeLabel = (() => {
    if (!selectedChild) return 'Tu espacio de apoyo diario';
    if (isPregnancyProfile) {
      return pregnancyWeekToShow
        ? `Semana ${pregnancyWeekToShow} de embarazo`
        : 'Embarazo activo';
    }

    const ageInMonths =
      selectedChild.currentAgeInMonths ??
      selectedChild.ageInMonths ??
      null;

    if (ageInMonths == null || Number.isNaN(Number(ageInMonths))) {
      return 'Perfil activo';
    }

    if (ageInMonths < 1) return 'Recién nacido';
    if (ageInMonths < 12) {
      const months = Math.max(1, Math.round(ageInMonths));
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    }

    const years = Math.floor(ageInMonths / 12);
    const months = Math.round(ageInMonths % 12);
    if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
    return `${years} ${years === 1 ? 'año' : 'años'} ${months} m`;
  })();
  const fallbackDouliQuestions = [
    `¿Qué actividad puedo hacer hoy con ${childFirstName}?`,
    `¿Cómo sé si ${childFirstName} está comiendo bien?`,
    `¿Qué señales debo observar esta semana?`,
  ];
  const visibleDouliQuestions = (
    loadingTodayFaq
      ? ['Cargando preguntas...']
      : todayFaqQuestions.length > 0
        ? todayFaqQuestions
        : fallbackDouliQuestions
  ).slice(0, 4);
  const todayPlanTitle =
    todayGuide?.title ||
    (isPregnancyProfile
      ? `Semana ${pregnancyWeekToShow || 1}: conexión y preparación`
      : `Plan de juego para ${childFirstName}`);
  const todayPlanFocus =
    todayGuide?.subtitle ||
    (isPregnancyProfile
      ? 'Un momento breve para observar cómo te sientes y preparar lo esencial.'
      : `${childFirstName} aprende mejor con experiencias simples, repetidas y tranquilas.`);
  const todayPlanAction =
    todayGuide?.tip ||
    activitySuggestions?.suggestions?.generalTip ||
    activitySuggestions?.suggestions?.warningIfTired ||
    (isPregnancyProfile
      ? 'Toma 5 minutos para respirar, hidratarte y anotar una pregunta para tu próxima consulta.'
      : `Prueba 5 minutos de juego con una textura, sonido suave u objeto de contraste.`);
  const todayPlanWhy =
    todayGuide?.description ||
    (isPregnancyProfile
      ? 'Los pequeños registros diarios ayudan a notar cambios y llegar con más claridad a tus controles.'
      : 'Este tipo de interacción fortalece atención, coordinación, curiosidad y vínculo.');
  const todayPlanQuestion = `Sobre ${childFirstName}: ${todayPlanAction}`;
  const specialistPromoTitle = isPregnancyProfile
    ? 'Acompaña tu embarazo con una especialista'
    : `¿Algo te preocupa de ${childFirstName}?`;
  const specialistPromoSubtitle = isPregnancyProfile
    ? 'Nutrición, psicología prenatal y orientación para esta etapa.'
    : 'Pediatría, lactancia, sueño y nutrición cuando necesitas una guía profesional.';
  const specialistPromoChips = isPregnancyProfile
    ? ['Embarazo', 'Nutrición', 'Psicología']
    : ['Pediatría', 'Lactancia', 'Sueño'];
  const specialistDouliQuestion = isPregnancyProfile
    ? '¿Esta duda de embarazo debería verla con un especialista?'
    : `¿Esta duda de ${childFirstName} debería verla con un especialista?`;

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.homeScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Cargando...</Text>
          </View>
        )}
        <View style={styles.homeHero}>
          <View style={styles.homeHeroCard}>
            <View style={styles.homeHeroTopRow}>
              <View style={styles.homeHeroCopy}>
                <Text style={styles.homeHeroEyebrow}>{getGreeting()}</Text>
                <Text style={styles.homeHeroTitle}>Hola, {userFirstName}</Text>
                <Text style={styles.homeHeroSubtitle}>
                  {selectedChild
                    ? `Hoy acompañamos a ${childFirstName}`
                    : 'Todo lo importante para cuidar con calma'}
                </Text>
              </View>

              {selectedChild ? (
                <TouchableOpacity
                  style={styles.homeHeroAvatarButton}
                  onPress={() => handleChildPress(selectedChild)}
                  activeOpacity={0.85}
                >
                  <Image
                    source={getChildAvatar(selectedChild, selectedChildIndex)}
                    style={styles.homeHeroAvatar}
                    onError={() => handleImageError(selectedChild.id)}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.homeHeroAvatarPlaceholder}>
                  <Ionicons name="heart" size={26} color="#E84D8A" />
                </View>
              )}
            </View>

            <View style={styles.homeHeroFooter}>
              <View style={styles.homeHeroBadge}>
                <Ionicons
                  name={isPregnancyProfile ? "leaf-outline" : "sparkles-outline"}
                  size={16}
                  color="#178A84"
                />
                <Text style={styles.homeHeroBadgeText}>{childAgeLabel}</Text>
              </View>
              <TouchableOpacity
                style={styles.homeHeroAskButton}
                onPress={() => navigateToDouli('')}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6B5CA5" />
                <Text style={styles.homeHeroAskText}>Preguntar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {!isPregnancyProfile && (
          <View style={styles.quickActionsShell}>
            <View style={styles.quickActionsHeader}>
              <Text style={styles.quickActionsTitle}>Atajos de cuidado</Text>
              <Text style={styles.quickActionsHint}>{childFirstName}</Text>
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
                <Ionicons name="scale-outline" size={22} color="#FFFFFF" />
                <Text style={styles.quickActionLabel}>Crecimiento</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionGreen]}
                onPress={() => {
                  analyticsService.logEvent('quick_action_clicked', {
                    action: 'vacunas',
                    child_id: selectedChild?.id,
                  });
                  // @ts-ignore
                  navigation.navigate('VaccineTracker');
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
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
                <FontAwesome5 name="briefcase-medical" size={20} color="#FFFFFF" />
                <Text style={styles.quickActionLabel}>Medicación</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionPurple]}
                onPress={() => {
                  analyticsService.logEvent('quick_action_clicked', {
                    action: 'denticion',
                    child_id: selectedChild?.id,
                  });
                  // @ts-ignore
                  navigation.navigate('TeethingTracker');
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
                  // @ts-ignore
                  navigation.navigate('Milestones');
                }}
              >
                <Ionicons name="trophy-outline" size={22} color="#FFFFFF" />
                <Text style={styles.quickActionLabel}>Hitos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickActionButton, styles.quickActionOrange]}
                onPress={() => {
                  // Calcular edad desde birthDate si está disponible
                  let ageInMonths = selectedChild?.ageInMonths ?? 0;

                  if (selectedChild?.birthDate) {
                    let birthDate: Date;

                    // Manejar Firestore Timestamp
                    if (typeof selectedChild.birthDate === 'object' && '_seconds' in selectedChild.birthDate) {
                      birthDate = new Date((selectedChild.birthDate as any)._seconds * 1000);
                    } else if (typeof selectedChild.birthDate === 'string') {
                      birthDate = new Date(selectedChild.birthDate);
                    } else {
                      birthDate = new Date(selectedChild.birthDate as any);
                    }

                    const today = new Date();
                    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    ageInMonths = diffDays / 30.44; // Promedio de días por mes
                  }


                  const ageFloor = Math.floor(ageInMonths);
                  if (ageFloor < 5) {
                    const monthsRemaining = 5 - ageFloor;
                    Alert.alert(
                      '🍎 Nutrición disponible pronto',
                      `Esta funcionalidad estará disponible cuando ${selectedChild?.name || 'tu bebé'} cumpla 5 meses.\n\n¡Solo ${monthsRemaining} ${monthsRemaining === 1 ? 'mes' : 'meses'} más! 💙`,
                      [{ text: 'Entendido', style: 'default' }]
                    );
                    analyticsService.logEvent('nutrition_early_access_attempted', {
                      child_id: selectedChild?.id,
                      age_in_months: ageInMonths,
                    });
                    return;
                  }
                  analyticsService.logEvent('quick_action_clicked', {
                    action: 'nutricion',
                    child_id: selectedChild?.id,
                    age_in_months: ageInMonths,
                  });
                  // @ts-ignore
                  navigation.navigate('Feeding');
                }}
              >
                <Ionicons
                  name="restaurant-outline"
                  size={22}
                  color="#FFFFFF"
                />
                <Text style={styles.quickActionLabel}>Nutrición</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Consultas Activas */}
        {(activeConsultations.length > 0 || loadingConsultations) && (
          <View style={styles.activeConsultationsContainer}>
            <View style={styles.consultationsHeader}>
              <View style={styles.consultationsHeaderLeft}>
                <Ionicons name="medical" size={20} color="#887CBC" />
                <Text style={styles.consultationsTitle}>Mis Consultas</Text>
                {loadingConsultations && (
                  <ActivityIndicator size="small" color="#887CBC" style={{ marginLeft: 8 }} />
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => {
                    loadActiveConsultations();
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="refresh" size={18} color="#887CBC" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    analyticsService.logEvent('view_all_consultations_clicked', {
                      from: 'home',
                    });
                    (navigation as any).navigate('MyConsultations');
                  }}
                >
                  <Text style={styles.consultationsViewAll}>Ver todas</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingConsultations && activeConsultations.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#887CBC" />
                <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>
                  Cargando consultas...
                </Text>
              </View>
            ) : activeConsultations.length === 0 ? (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 14 }}>
                  No hay consultas activas
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.consultationsScroll}
              >
                {activeConsultations.map((consultation) => (
                  <TouchableOpacity
                    key={consultation.consultationId}
                    style={styles.consultationCard}
                    onPress={() => {
                      analyticsService.logEvent('active_consultation_clicked', {
                        consultation_id: consultation.consultationId,
                        status: consultation.status,
                        from: 'home',
                      });
                      (navigation as any).navigate('ConsultationDetail', {
                        consultationId: consultation.consultationId,
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.consultationCardHeader}>
                      <View style={[
                        styles.consultationStatusBadge,
                        consultation.status === 'in_progress' && { backgroundColor: '#DBEAFE' },
                        consultation.status === 'accepted' && { backgroundColor: '#D1FAE5' },
                        consultation.status === 'pending' && { backgroundColor: '#FEF3C7' },
                        consultation.status === 'completed' && { backgroundColor: '#F3F4F6' },
                      ]}>
                        <View style={[
                          styles.consultationStatusDot,
                          consultation.status === 'in_progress' && styles.consultationStatusDotActive,
                          consultation.status === 'accepted' && styles.consultationStatusDotAccepted,
                          consultation.status === 'pending' && styles.consultationStatusDotPending,
                          consultation.status === 'completed' && styles.consultationStatusDotCompleted,
                        ]} />
                        <Text style={[
                          styles.consultationStatusText,
                          consultation.status === 'in_progress' && { color: '#1E40AF' },
                          consultation.status === 'accepted' && { color: '#065F46' },
                          consultation.status === 'pending' && { color: '#78350F' },
                          consultation.status === 'completed' && { color: '#4B5563' },
                        ]}>
                          {consultation.status === 'pending' && '⏳ Pendiente'}
                          {consultation.status === 'accepted' && '✓ Aceptada'}
                          {consultation.status === 'in_progress' && '💬 En curso'}
                          {consultation.status === 'completed' && '✅ Completada'}
                        </Text>
                      </View>
                      <View style={[
                        styles.consultationTypeBadge,
                        consultation.type === 'video' && styles.consultationTypeBadgeVideo,
                      ]}>
                        <Ionicons
                          name={consultation.type === 'chat' ? 'chatbubble' : 'videocam'}
                          size={18}
                          color="#FFF"
                        />
                      </View>
                    </View>

                    <View style={styles.consultationSpecialistInfo}>
                      <Text style={styles.consultationSpecialistName}>
                        {consultation.specialistName || 'Especialista'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="person-outline" size={14} color="#887CBC" />
                        <Text style={styles.consultationChildName}>
                          Para: {consultation.childName}
                        </Text>
                      </View>
                    </View>

                    {consultation.request?.symptoms && consultation.request.symptoms.length > 0 && (
                      <View style={{ marginBottom: 16 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Ionicons name="medkit-outline" size={14} color="#6B7280" />
                          <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginLeft: 4 }}>
                            Síntomas reportados
                          </Text>
                        </View>
                        <View style={styles.consultationSymptoms}>
                          {consultation.request.symptoms.slice(0, 3).map((symptomId: string, idx: number) => (
                            <View key={idx} style={styles.consultationSymptomDot} />
                          ))}
                          {consultation.request.symptoms.length > 3 && (
                            <Text style={styles.consultationSymptomMore}>
                              +{consultation.request.symptoms.length - 3} más
                            </Text>
                          )}
                        </View>
                      </View>
                    )}

                    <View style={styles.consultationFooter}>
                      <Ionicons name="time-outline" size={16} color="#887CBC" />
                      <Text style={styles.consultationTime}>
                        {consultation.status === 'completed'
                          ? `Completada ${formatTimeAgo(consultation.schedule?.completedAt)}`
                          : formatTimeAgo(consultation.schedule?.requestedAt)
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Contenido principal */}
        <View style={styles.todaySection}>
          <View style={styles.bannerSlot}>
            <BannerCarousel
              style={styles.bannerHome1Carousel}
              section="home1"
              fallbackToHome={false}
              imageResizeMode="cover"
              bannerHeight={108}
              bannerWidth={290}
              autoScroll={false}
              showIndicators={false}
            />
          </View>

          {pregnancySize && (
            <View style={styles.pregnancySizeCard}>
              <View style={styles.pregnancyWeekSelectorHeader}>
                <View style={styles.pregnancyWeekHeadline}>
                  <Text style={styles.pregnancyWeekSelectorTitle}>Semana {pregnancySize.week}</Text>
                  <Text style={styles.pregnancySizeTitle}>{pregnancyComparisonLabel}</Text>
                </View>
                <View style={styles.pregnancyWeekActions}>
                  {currentPregnancyWeek && pregnancyWeekToShow !== currentPregnancyWeek && (
                    <TouchableOpacity
                      style={styles.pregnancyWeekCurrentButton}
                      onPress={() => setSelectedPregnancyWeek(currentPregnancyWeek)}
                      activeOpacity={0.82}
                    >
                      <Text style={styles.pregnancyWeekCurrentButtonText}>Hoy</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.pregnancySizeLearnMore}
                    onPress={() => setShowPregnancyDetailModal(true)}
                    activeOpacity={0.84}
                  >
                    <Text style={styles.pregnancySizeLearnMoreText}>Saber más</Text>
                    <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView
                ref={pregnancyWeekScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pregnancyWeekScroller}
                onLayout={(event) => setPregnancyWeekScrollerWidth(event.nativeEvent.layout.width)}
              >
                {PREGNANCY_WEEKS.map((week) => {
                  const isActive = pregnancyWeekToShow === week;
                  const isCurrent = currentPregnancyWeek === week;

                  return (
                    <TouchableOpacity
                      key={week}
                      style={[
                        styles.pregnancyWeekChip,
                        isActive && styles.pregnancyWeekChipActive,
                      ]}
                      onPress={() => setSelectedPregnancyWeek(week)}
                      activeOpacity={0.84}
                    >
                      <Text
                        style={[
                          styles.pregnancyWeekChipText,
                          isActive && styles.pregnancyWeekChipTextActive,
                        ]}
                      >
                        {week}
                      </Text>
                      {isCurrent && <View style={styles.pregnancyWeekChipDot} />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                style={[
                  styles.pregnancySizeImageWrap,
                  isHumanPregnancyComparison && styles.pregnancySizeImageWrapHuman,
                ]}
                onPress={openPregnancyImageViewer}
                activeOpacity={0.92}
              >
                {pregnancySizeImage ? (
                  <>
                    <Image
                      source={pregnancySizeImage}
                      style={[
                        styles.pregnancySizeImage,
                        isHumanPregnancyComparison && styles.pregnancySizeImageHuman,
                      ]}
                      resizeMode="contain"
                    />
                  </>
                ) : (
                  <View style={styles.pregnancySizeImagePlaceholder}>
                    <Text style={styles.pregnancySizeEmoji}>
                      {isEarlyPregnancyWeek ? '🤰' : pregnancySize.emoji}
                    </Text>
                    <Text style={styles.pregnancySizeMissingText}>
                      {isEarlyPregnancyWeek ? 'Embarazo inicial' : 'Imagen pronto'}
                    </Text>
                    {isEarlyPregnancyWeek && (
                      <Text style={styles.pregnancySizeMissingSubtext}>
                        Aún es muy pequeño para compararlo con una imagen.
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pregnancyComparisonModes}
              >
                {PREGNANCY_COMPARISON_OPTIONS.map((option) => {
                  const isActive = pregnancyComparisonMode === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.pregnancyComparisonMode,
                        isActive && styles.pregnancyComparisonModeActive,
                      ]}
                      onPress={() => updatePregnancyComparisonMode(option.id)}
                      activeOpacity={0.84}
                    >
                      <Text style={styles.pregnancyComparisonModeIcon}>{option.icon}</Text>
                      <Text
                        style={[
                          styles.pregnancyComparisonModeText,
                          isActive && styles.pregnancyComparisonModeTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {isPregnancyProfile && pregnancyWeekToShow && (
            <View style={styles.pregnancyHub}>
              <View style={styles.pregnancyHubHeader}>
                <View>
                  <Text style={styles.pregnancyHubTitle}>Embarazo esta semana</Text>
                  <Text style={styles.pregnancyHubSubtitle}>{pregnancyCountdown}</Text>
                </View>
                <View style={styles.pregnancyHubWeekBadge}>
                  <Text style={styles.pregnancyHubWeekText}>{pregnancyWeekToShow}</Text>
                </View>
              </View>

              <View style={styles.pregnancyModuleGrid}>
                {PREGNANCY_MODULES.slice(0, 4).map((module) => (
                  <TouchableOpacity
                    key={module.id}
                    style={styles.pregnancyModuleTile}
                    onPress={() => {
                      setActivePregnancyModule(module.id);
                      setShowPregnancyModuleModal(true);
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.pregnancyModuleTileIcon}>
                      <Ionicons name={module.icon as any} size={18} color="#E84D8A" />
                    </View>
                    <Text style={styles.pregnancyModuleTileTitle}>{module.label}</Text>
                    <Text style={styles.pregnancyModuleTilePreview} numberOfLines={2}>
                      {pregnancyModulePreviews[module.id]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.todayGuideCard}>
            <View style={styles.todayGuideHeader}>
              <View style={styles.todayGuideIcon}>
                <Ionicons name="sparkles-outline" size={18} color="#9A6B00" />
              </View>
              <View style={styles.todayGuideHeaderCopy}>
                <Text style={styles.todayGuideLabel}>Plan de hoy</Text>
                <Text style={styles.todayGuideHeaderSubtitle}>Una acción concreta para {childFirstName}</Text>
              </View>
              <View style={styles.todayGuideMetaPill}>
                <Ionicons name="time-outline" size={13} color="#9A6B00" />
                <Text style={styles.todayGuideMetaText}>5 min</Text>
              </View>
            </View>
            {loadingTodayGuide ? (
              <View style={styles.todayGuideLoading}>
                <ActivityIndicator color="#6B5CA5" />
                <Text style={styles.todayGuideLoadingText}>
                  Preparando recomendaciones...
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.todayGuideWeek}>
                  {todayPlanTitle}
                </Text>
                <Text style={styles.todayGuideSubtitle}>{todayPlanFocus}</Text>

                <View style={styles.todayPlanActionCard}>
                  <View style={styles.todayPlanStepBadge}>
                    <Text style={styles.todayPlanStepText}>1</Text>
                  </View>
                  <View style={styles.todayPlanActionCopy}>
                    <Text style={styles.todayPlanActionLabel}>Haz esto hoy</Text>
                    <Text style={styles.todayPlanActionText}>{todayPlanAction}</Text>
                  </View>
                </View>

                <View style={styles.todayGuideWhyRow}>
                  <Ionicons name="heart-circle-outline" size={20} color="#6B5CA5" />
                  <Text style={styles.todayGuideWhyText} numberOfLines={3}>
                    {todayPlanWhy}
                  </Text>
                </View>

                <View style={styles.todayGuideActions}>
                  <TouchableOpacity
                    style={styles.todayGuidePrimaryButton}
                    onPress={openHealthProfile}
                    activeOpacity={0.86}
                  >
                    <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.todayGuidePrimaryButtonText}>Hacer actividad</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.todayGuideSecondaryButton}
                    onPress={() => navigateToDouli(todayPlanQuestion)}
                    activeOpacity={0.86}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={16} color="#6B5CA5" />
                    <Text style={styles.todayGuideSecondaryButtonText}>Preguntar</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>

          <View style={styles.specialistPromoCard}>
            <View style={styles.specialistPromoTop}>
              <View style={styles.specialistPromoIcon}>
                <Ionicons name="medical-outline" size={22} color="#178A84" />
              </View>
              <View style={styles.specialistPromoCopy}>
                <Text style={styles.specialistPromoEyebrow}>Especialistas verificados</Text>
                <Text style={styles.specialistPromoTitle}>{specialistPromoTitle}</Text>
                <Text style={styles.specialistPromoSubtitle}>{specialistPromoSubtitle}</Text>
              </View>
            </View>

            <View style={styles.specialistPromoBody}>
              <View style={styles.specialistAvatarStack}>
                <View style={[styles.specialistMiniAvatar, styles.specialistMiniAvatarTeal]}>
                  <Ionicons name="chatbubbles-outline" size={17} color="#178A84" />
                </View>
                <View style={[styles.specialistMiniAvatar, styles.specialistMiniAvatarPink]}>
                  <Ionicons name="heart-outline" size={17} color="#C93B78" />
                </View>
                <View style={[styles.specialistMiniAvatar, styles.specialistMiniAvatarPurple]}>
                  <Ionicons name="videocam-outline" size={17} color="#6B5CA5" />
                </View>
              </View>

              <View style={styles.specialistTrustGrid}>
                <View style={styles.specialistTrustPill}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#178A84" />
                  <Text style={styles.specialistTrustText}>Verificados</Text>
                </View>
                <View style={styles.specialistTrustPill}>
                  <Ionicons name="videocam-outline" size={14} color="#178A84" />
                  <Text style={styles.specialistTrustText}>Video disponible</Text>
                </View>
              </View>
            </View>

            <View style={styles.specialistPromoChips}>
              {specialistPromoChips.map((chip) => (
                <View key={chip} style={styles.specialistPromoChip}>
                  <Text style={styles.specialistPromoChipText}>{chip}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.specialistPromoNote}>
              Si algo te inquieta, puedes pedir orientación sin salir de Munpa.
            </Text>

            <View style={styles.specialistPromoActions}>
              <TouchableOpacity
                style={styles.specialistPromoPrimary}
                onPress={() => openSpecialists('home_contextual_card', 'chat')}
                activeOpacity={0.86}
              >
                <Ionicons name="chatbubbles-outline" size={17} color="#FFFFFF" />
                <Text style={styles.specialistPromoPrimaryText}>Chat con especialista</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.specialistPromoSecondary}
                onPress={() => openSpecialists('home_contextual_card', 'browse')}
                activeOpacity={0.86}
              >
                <Text style={styles.specialistPromoSecondaryText}>Ver especialistas</Text>
              </TouchableOpacity>
            </View>
          </View>

          {todayRecipe && (
            <View style={styles.recipeSection}>
              <View style={styles.recipeSectionHeader}>
                <Text style={styles.recipeSectionTitle}>Receta del día</Text>
                <TouchableOpacity onPress={() => {
                  analyticsService.logEvent('nutrition_view_more_clicked', {
                    child_id: selectedChild?.id,
                    recipe_name: todayRecipe.name,
                    from: 'home',
                  });
                  (navigation as any).navigate('Feeding');
                }}>
                  <Text style={styles.recipeSectionLink}>Ver más</Text>
                </TouchableOpacity>
              </View>
              <RecipeCard recipe={todayRecipe} />
            </View>
          )}

          {!isPregnancyProfile && (
            <>
              <View style={styles.homeSectionHeader}>
                <View>
                  <Text style={styles.todaySectionTitle}>Apoyo rápido</Text>
                  <Text style={styles.homeSectionSubtitle}>Herramientas para resolver algo ahora</Text>
                </View>
              </View>

              <View style={styles.todayToolsRow}>
                <TouchableOpacity
                  style={[styles.todayToolCard, styles.todayToolCardSounds]}
                  onPress={openWhiteNoiseModal}
                >
                  <Ionicons name="musical-notes" size={24} color="#9A6B00" />
                  <Text style={styles.todayToolTitle}>Sonidos</Text>
                  <Text style={styles.todayToolSubtitle}>Ruido blanco</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.todayToolCard, styles.todayToolCardAdvisories]} onPress={openAdvisories}>
                  <Ionicons name="medical" size={24} color="#6B5CA5" />
                  <Text style={styles.todayToolTitle}>Primeros auxilios</Text>
                  <Text style={styles.todayToolSubtitle}>Guía rápida</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.todayToolCard, styles.todayToolCardSpecialist]}
                  onPress={() => openSpecialists('home_quick_support', 'quick_help')}
                >
                  <Ionicons name="medkit-outline" size={24} color="#178A84" />
                  <Text style={styles.todayToolTitle}>Especialista</Text>
                  <Text style={styles.todayToolSubtitle}>Chat o video</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.todayToolCard, styles.todayToolCardHealth]} onPress={openHealthProfile}>
                  <Ionicons name="fitness" size={24} color="#C93B78" />
                  <Text style={styles.todayToolTitle}>Desarrollo</Text>
                  <Text style={styles.todayToolSubtitle}>Ejercicios</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <View style={styles.todayDouliSection}>
            <View style={styles.homeSectionHeaderCompact}>
              <View>
                <Text style={styles.todaySectionTitle}>Pregúntale a Douli</Text>
                <Text style={styles.todayDouliSubtitle}>Resuelve dudas sin salir del Home</Text>
              </View>
              <View style={styles.douliBadge}>
                <Ionicons name="sparkles" size={15} color="#6B5CA5" />
              </View>
            </View>
            {visibleDouliQuestions.slice(0, 2).map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.todayDouliQuestion}
                onPress={() => !loadingTodayFaq && navigateToDouli(q)}
              >
                <Ionicons name="help-circle-outline" size={18} color="#6B5CA5" />
                <Text style={styles.todayDouliQuestionText} numberOfLines={2}>{q}</Text>
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.douliSpecialistSuggestion}
              onPress={() => openSpecialists('home_douli_bridge', 'medical_question')}
              activeOpacity={0.84}
            >
              <View style={styles.douliSpecialistIcon}>
                <Ionicons name="medical-outline" size={17} color="#178A84" />
              </View>
              <View style={styles.douliSpecialistCopy}>
                <Text style={styles.douliSpecialistTitle}>¿Prefieres hablar con una especialista?</Text>
                <Text style={styles.douliSpecialistText}>{specialistDouliQuestion}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#178A84" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.todayDouliInputRow}
              onPress={() => navigateToDouli('')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color="#6B5CA5" />
              <Text style={styles.todayDouliInput}>Escribe tu propia pregunta...</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.homeSectionHeader}>
            <View>
              <Text style={styles.todaySectionTitle}>Explora Munpa</Text>
              <Text style={styles.homeSectionSubtitle}>Todo sigue disponible cuando lo necesites</Text>
            </View>
          </View>

          <View style={styles.exploreGrid}>
            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => (navigation as any).navigate('Recommendations')}
              activeOpacity={0.86}
            >
              <View style={[styles.exploreIcon, styles.exploreIconTeal]}>
                <Ionicons name="star-outline" size={22} color="#178A84" />
              </View>
              <Text style={styles.exploreTitle}>Recomendaciones</Text>
              <Text style={styles.exploreSubtitle}>Lugares y servicios</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => (navigation as any).navigate('MunpaMarket')}
              activeOpacity={0.86}
            >
              <View style={[styles.exploreIcon, styles.exploreIconYellow]}>
                <Ionicons name="bag-handle-outline" size={22} color="#9A6B00" />
              </View>
              <Text style={styles.exploreTitle}>Market</Text>
              <Text style={styles.exploreSubtitle}>Compra y vende</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreCard}
              onPress={() => (navigation as any).navigate('Communities')}
              activeOpacity={0.86}
            >
              <View style={[styles.exploreIcon, styles.exploreIconPurple]}>
                <Ionicons name="people-outline" size={22} color="#6B5CA5" />
              </View>
              <Text style={styles.exploreTitle}>Comunidad</Text>
              <Text style={styles.exploreSubtitle}>Posts y grupos</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Espacio final - con padding extra para el botón fijo */}
        <View style={[styles.finalSpacing, { height: 100 }]} />
      </ScrollView>

      {/* Modal de módulos de embarazo */}
      <Modal
        visible={showPregnancyModuleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPregnancyModuleModal(false)}
      >
        <View style={styles.pregnancyDetailOverlay}>
          <View style={styles.pregnancyModuleModalContent}>
            <View style={styles.pregnancyDetailHeader}>
              <View>
                <Text style={styles.pregnancyDetailEyebrow}>Semana {pregnancyWeekToShow}</Text>
                <Text style={styles.pregnancyDetailTitle}>
                  {PREGNANCY_MODULES.find((module) => module.id === activePregnancyModule)?.label || 'Embarazo'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pregnancyDetailClose}
                onPress={() => setShowPregnancyModuleModal(false)}
              >
                <Ionicons name="close" size={24} color="#2D3748" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {activePregnancyModule === 'plan' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="checkbox-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Checklist semanal</Text>
                  </View>
                  {pregnancyChecklist.map((item) => (
                    <TouchableOpacity
                      key={item}
                      style={styles.pregnancyChecklistRow}
                      onPress={() => togglePregnancyChecklistItem(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={pregnancyChecklistState[item] ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={pregnancyChecklistState[item] ? '#59C6C0' : '#A0AEC0'}
                      />
                      <Text
                        style={[
                          styles.pregnancyChecklistText,
                          pregnancyChecklistState[item] && styles.pregnancyChecklistTextDone,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {activePregnancyModule === 'controls' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="medical-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Próximos controles</Text>
                  </View>
                  {pregnancyControls.map((control) => (
                    <Text key={control} style={styles.pregnancyBulletText}>• {control}</Text>
                  ))}
                </View>
              )}

              {activePregnancyModule === 'symptoms' && (
                <>
                  <View style={styles.pregnancyTwoColumn}>
                    <View style={styles.pregnancyColumnCard}>
                      <Text style={styles.pregnancyColumnTitle}>Puede ser normal</Text>
                      {pregnancySymptomsGuidance.normal.map((symptom) => (
                        <Text key={symptom} style={styles.pregnancySmallBullet}>• {symptom}</Text>
                      ))}
                    </View>
                    <View style={styles.pregnancyColumnCardAlert}>
                      <Text style={styles.pregnancyColumnTitle}>Consulta si</Text>
                      {pregnancySymptomsGuidance.alerts.map((alertItem) => (
                        <Text key={alertItem} style={styles.pregnancySmallBullet}>• {alertItem}</Text>
                      ))}
                    </View>
                  </View>
                  <View style={styles.pregnancyInfoCard}>
                    <View style={styles.pregnancyInfoHeader}>
                      <Ionicons name="pulse-outline" size={18} color="#E84D8A" />
                      <Text style={styles.pregnancyInfoTitle}>Registrar síntomas</Text>
                    </View>
                    <View style={styles.pregnancySymptomChips}>
                      {PREGNANCY_SYMPTOM_OPTIONS.map((symptom) => {
                        const isSelected = pregnancySymptoms.includes(symptom);
                        return (
                          <TouchableOpacity
                            key={symptom}
                            style={[
                              styles.pregnancySymptomChip,
                              isSelected && styles.pregnancySymptomChipActive,
                            ]}
                            onPress={() => togglePregnancySymptom(symptom)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.pregnancySymptomChipText,
                                isSelected && styles.pregnancySymptomChipTextActive,
                              ]}
                            >
                              {symptom}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </>
              )}

              {activePregnancyModule === 'questions' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="help-circle-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Preguntas para tu próxima cita</Text>
                  </View>
                  {pregnancyQuestions.map((question) => (
                    <Text key={question} style={styles.pregnancyBulletText}>• {question}</Text>
                  ))}
                </View>
              )}

              {activePregnancyModule === 'movements' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="footsteps-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Movimientos del bebé</Text>
                  </View>
                  <Text style={styles.pregnancyInfoText}>
                    {pregnancyWeekToShow && pregnancyWeekToShow >= 20
                      ? 'Observa su patrón de movimiento. Si notas una disminución clara, consulta.'
                      : 'Más adelante, muchas mamás empiezan a sentir movimientos entre semanas 18 y 22.'}
                  </Text>
                  {pregnancyWeekToShow && pregnancyWeekToShow >= 20 && (
                    <View style={styles.pregnancyMovementRow}>
                      <TouchableOpacity style={styles.pregnancyMovementButton} onPress={addPregnancyMovement}>
                        <Ionicons name="add" size={18} color="#FFFFFF" />
                        <Text style={styles.pregnancyMovementButtonText}>Registrar</Text>
                      </TouchableOpacity>
                      <Text style={styles.pregnancyMovementCount}>{pregnancyMovementCount}</Text>
                      <TouchableOpacity style={styles.pregnancyMovementReset} onPress={resetPregnancyMovements}>
                        <Text style={styles.pregnancyMovementResetText}>Reiniciar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              {activePregnancyModule === 'contractions' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="timer-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Contador de contracciones</Text>
                  </View>
                  <Text style={styles.pregnancyInfoText}>
                    Úsalo cuando sientas que una contracción empieza y detenlo cuando termine. Si son regulares, dolorosas o tienes dudas, consulta a tu equipo médico.
                  </Text>
                  <View style={styles.contractionTimerDisplay}>
                    <Text style={styles.contractionTimerText}>
                      {formatContractionDuration(activeContractionElapsedSeconds)}
                    </Text>
                    <Text style={styles.contractionTimerLabel}>
                      {activeContractionStartedAt ? 'Contracción en curso' : 'Lista para registrar'}
                    </Text>
                  </View>
                  <View style={styles.pregnancyMovementRow}>
                    <TouchableOpacity
                      style={[
                        styles.pregnancyMovementButton,
                        activeContractionStartedAt ? styles.contractionStopButton : null,
                      ]}
                      onPress={activeContractionStartedAt ? stopPregnancyContraction : startPregnancyContraction}
                    >
                      <Ionicons
                        name={activeContractionStartedAt ? 'stop' : 'play'}
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text style={styles.pregnancyMovementButtonText}>
                        {activeContractionStartedAt ? 'Detener' : 'Iniciar'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.pregnancyMovementReset} onPress={resetPregnancyContractions}>
                      <Text style={styles.pregnancyMovementResetText}>Reiniciar</Text>
                    </TouchableOpacity>
                  </View>
                  {pregnancyContractions.length > 0 && (
                    <View style={styles.contractionHistory}>
                      {pregnancyContractions.slice(0, 5).map((record, index) => (
                        <View key={`${record.startedAt}-${index}`} style={styles.contractionHistoryRow}>
                          <Text style={styles.contractionHistoryDuration}>
                            {formatContractionDuration(record.durationSeconds)}
                          </Text>
                          <Text style={styles.contractionHistoryInterval}>
                            {formatContractionInterval(record, pregnancyContractions[index + 1])}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {activePregnancyModule === 'prep' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="map-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Preparación por trimestre</Text>
                  </View>
                  <Text style={styles.pregnancyInfoText}>{pregnancyTrimesterPrep}</Text>
                </View>
              )}

              {activePregnancyModule === 'notes' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="journal-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Notas para mamá</Text>
                  </View>
                  <TextInput
                    value={pregnancyDiaryNote}
                    onChangeText={updatePregnancyDiaryNote}
                    placeholder="¿Cómo te sientes esta semana?"
                    placeholderTextColor="#9CA3AF"
                    style={styles.pregnancyDiaryInput}
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              )}

              {activePregnancyModule === 'family' && (
                <View style={styles.pregnancyInfoCard}>
                  <View style={styles.pregnancyInfoHeader}>
                    <Ionicons name="people-outline" size={18} color="#E84D8A" />
                    <Text style={styles.pregnancyInfoTitle}>Para pareja o familia</Text>
                  </View>
                  {pregnancySupportTips.map((tip) => (
                    <Text key={tip} style={styles.pregnancyBulletText}>• {tip}</Text>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de detalle de embarazo */}
      <Modal
        visible={showPregnancyDetailModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPregnancyDetailModal(false)}
      >
        <View style={styles.pregnancyDetailOverlay}>
          <View style={styles.pregnancyDetailContent}>
            <View style={styles.pregnancyDetailHeader}>
              <View>
                <Text style={styles.pregnancyDetailEyebrow}>Embarazo</Text>
                <Text style={styles.pregnancyDetailTitle}>
                  Semana {pregnancySize?.week || pregnancyWeekToShow}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.pregnancyDetailClose}
                onPress={() => setShowPregnancyDetailModal(false)}
              >
                <Ionicons name="close" size={24} color="#2D3748" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pregnancyDetailScroll}
              showsVerticalScrollIndicator={false}
            >
              {pregnancySizeImage && (
                <TouchableOpacity
                  style={styles.pregnancyDetailImageButton}
                  onPress={openPregnancyImageViewerFromDetail}
                  activeOpacity={0.9}
                >
                  <Image
                    source={pregnancySizeImage}
                    style={styles.pregnancyDetailImage}
                    resizeMode="contain"
                  />
                  <View style={styles.pregnancyDetailImageHint}>
                    <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.pregnancyDetailImageHintText}>Ver grande</Text>
                  </View>
                </TouchableOpacity>
              )}

              {pregnancyWeekDetail && (
                <>
                  {pregnancyApproxMeasurement && (
                    <View style={styles.pregnancyMeasurementCard}>
                      <Text style={styles.pregnancyMeasurementTitle}>
                        Tamaño y peso aproximados
                      </Text>
                      <View style={styles.pregnancyMeasurementRow}>
                        <View style={styles.pregnancyMeasurementItem}>
                          <Ionicons name="resize-outline" size={18} color="#E84D8A" />
                          <Text style={styles.pregnancyMeasurementLabel}>Largo</Text>
                          <Text style={styles.pregnancyMeasurementValue}>
                            {pregnancyApproxMeasurement.length}
                          </Text>
                        </View>
                        <View style={styles.pregnancyMeasurementDivider} />
                        <View style={styles.pregnancyMeasurementItem}>
                          <Ionicons name="scale-outline" size={18} color="#E84D8A" />
                          <Text style={styles.pregnancyMeasurementLabel}>Peso</Text>
                          <Text style={styles.pregnancyMeasurementValue}>
                            {pregnancyApproxMeasurement.weight}
                          </Text>
                        </View>
                      </View>
                      {pregnancyApproxMeasurement.note ? (
                        <Text style={styles.pregnancyMeasurementNote}>
                          {pregnancyApproxMeasurement.note}
                        </Text>
                      ) : null}
                      <Text style={styles.pregnancyMeasurementNote}>
                        Son rangos orientativos; cada bebé crece a su ritmo.
                      </Text>
                    </View>
                  )}

                  <View style={styles.pregnancyDetailSection}>
                    <View style={styles.pregnancyDetailSectionIcon}>
                      <Ionicons name="sparkles" size={16} color="#E84D8A" />
                    </View>
                    <View style={styles.pregnancyDetailSectionBody}>
                      <Text style={styles.pregnancyDetailSectionTitle}>Bebé</Text>
                      <Text style={styles.pregnancyDetailSectionText}>
                        {pregnancyWeekDetail.baby}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pregnancyDetailSection}>
                    <View style={styles.pregnancyDetailSectionIcon}>
                      <Ionicons name="body-outline" size={16} color="#E84D8A" />
                    </View>
                    <View style={styles.pregnancyDetailSectionBody}>
                      <Text style={styles.pregnancyDetailSectionTitle}>Cuerpo de mamá</Text>
                      <Text style={styles.pregnancyDetailSectionText}>
                        {pregnancyWeekDetail.momBody}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pregnancyDetailSection}>
                    <View style={styles.pregnancyDetailSectionIcon}>
                      <Ionicons name="heart-outline" size={16} color="#E84D8A" />
                    </View>
                    <View style={styles.pregnancyDetailSectionBody}>
                      <Text style={styles.pregnancyDetailSectionTitle}>Qué podrías sentir</Text>
                      <Text style={styles.pregnancyDetailSectionText}>
                        {pregnancyWeekDetail.feelings}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pregnancyDetailSection}>
                    <View style={styles.pregnancyDetailSectionIcon}>
                      <Ionicons name="list-outline" size={16} color="#E84D8A" />
                    </View>
                    <View style={styles.pregnancyDetailSectionBody}>
                      <Text style={styles.pregnancyDetailSectionTitle}>Prepararte</Text>
                      <Text style={styles.pregnancyDetailSectionText}>
                        {pregnancyWeekDetail.prepare}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pregnancyDetailImportant}>
                    <View style={styles.pregnancyDetailImportantIcon}>
                      <Ionicons name="medical-outline" size={18} color="#FFFFFF" />
                    </View>
                    <View style={styles.pregnancyDetailSectionBody}>
                      <Text style={styles.pregnancyDetailImportantTitle}>
                        Controles importantes
                      </Text>
                      <Text style={styles.pregnancyDetailImportantText}>
                        {pregnancyWeekDetail.important}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.pregnancyDetailDisclaimer}>
                    Información orientativa. Tu obstetra o matrona puede ajustar controles según tu historia y tu embarazo.
                  </Text>

                  {selectedChild?.isUnborn && (
                    <View style={styles.pregnancyStatusCard}>
                      <Text style={styles.pregnancyStatusTitle}>Actualizar estado</Text>
                      <Text style={styles.pregnancyStatusSubtitle}>
                        Cambia esta etapa solo cuando quieras cerrar el embarazo en la app.
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.pregnancyStatusButton,
                          updatingPregnancyStatus && styles.pregnancyStatusButtonDisabled,
                        ]}
                        onPress={openPregnancyBirthDatePicker}
                        disabled={updatingPregnancyStatus}
                      >
                        {updatingPregnancyStatus ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Ionicons name="happy-outline" size={19} color="#FFFFFF" />
                        )}
                        <Text style={styles.pregnancyStatusButtonText}>Ya nació</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.pregnancyStatusButton,
                          styles.pregnancyStatusButtonDanger,
                          updatingPregnancyStatus && styles.pregnancyStatusButtonDisabled,
                        ]}
                        onPress={confirmEndPregnancy}
                        disabled={updatingPregnancyStatus}
                      >
                        <Ionicons name="heart-dislike-outline" size={19} color="#B42318" />
                        <Text style={styles.pregnancyStatusButtonDangerText}>
                          Ya no estoy embarazada
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Visor de imagen de embarazo */}
      <Modal
        visible={showPregnancyImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPregnancyImageModal(false)}
      >
        <View style={styles.pregnancyImageViewerOverlay}>
          <View style={styles.pregnancyImageViewerHeader}>
            <TouchableOpacity
              style={styles.pregnancyImageViewerIconButton}
              onPress={() => setShowPregnancyImageModal(false)}
              activeOpacity={0.82}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pregnancyImageViewerShareButton}
              onPress={sharePregnancyImage}
              activeOpacity={0.86}
            >
              <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
              <Text style={styles.pregnancyImageViewerShareText}>Compartir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pregnancyImageViewerTitleWrap}>
            <Text style={styles.pregnancyImageViewerEyebrow}>
              {pregnancyComparisonLabel}
            </Text>
            <Text style={styles.pregnancyImageViewerTitle}>
              {pregnancyImageShareTitle}
            </Text>
            <Text style={styles.pregnancyImageViewerInsight}>
              {pregnancyImageShareMeasurement
                ? `${pregnancyImageShareMeasurement} ${pregnancyImageShareFact}`
                : pregnancyImageShareFact}
            </Text>
          </View>

          {pregnancySizeImage ? (
            <Image
              source={pregnancySizeImage}
              style={styles.pregnancyImageViewerImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.pregnancyImageViewerFallback}>
              <Text style={styles.pregnancySizeEmoji}>{pregnancySize?.emoji || '✨'}</Text>
              <Text style={styles.pregnancyImageViewerFallbackText}>Imagen pronto</Text>
            </View>
          )}

          <View style={styles.pregnancyImageViewerFooter}>
            <TouchableOpacity
              style={styles.pregnancyImageViewerPrimaryAction}
              onPress={sharePregnancyImage}
              activeOpacity={0.86}
            >
              <Ionicons name="send-outline" size={18} color="#FFFFFF" />
              <Text style={styles.pregnancyImageViewerPrimaryText}>
                Compartir imagen
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {showPregnancyBirthDatePicker && Platform.OS === 'ios' && (
        <Modal
          visible={showPregnancyBirthDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPregnancyBirthDatePicker(false)}
        >
          <View style={styles.pregnancyDatePickerOverlay}>
            <View style={styles.pregnancyDatePickerContent}>
              <Text style={styles.pregnancyDatePickerTitle}>Fecha de nacimiento</Text>
              <DateTimePicker
                value={pregnancyBirthDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                locale="es-ES"
                onChange={(_, selectedDate) => {
                  if (selectedDate) setPregnancyBirthDate(selectedDate);
                }}
              />
              <View style={styles.pregnancyDatePickerActions}>
                <TouchableOpacity
                  style={styles.pregnancyDatePickerCancel}
                  onPress={() => setShowPregnancyBirthDatePicker(false)}
                  disabled={updatingPregnancyStatus}
                >
                  <Text style={styles.pregnancyDatePickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pregnancyDatePickerConfirm}
                  onPress={() => handlePregnancyBorn(pregnancyBirthDate)}
                  disabled={updatingPregnancyStatus}
                >
                  {updatingPregnancyStatus ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.pregnancyDatePickerConfirmText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showPregnancyBirthDatePicker && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={pregnancyBirthDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            setShowPregnancyBirthDatePicker(false);
            if (event.type === 'dismissed') return;
            const nextDate = selectedDate || pregnancyBirthDate;
            setPregnancyBirthDate(nextDate);
            handlePregnancyBorn(nextDate);
          }}
        />
      )}

      {/* Modal de Ruido Blanco */}
      <Modal
        visible={showWhiteNoiseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeWhiteNoiseModal}
      >
        <View style={styles.whiteNoiseModalOverlay}>
          <View style={styles.whiteNoiseModalContent}>
            <View style={styles.whiteNoiseModalHeader}>
              <Text style={styles.whiteNoiseModalTitle}>Ruido Blanco</Text>
              <TouchableOpacity onPress={closeWhiteNoiseModal}>
                <Ionicons name="close" size={28} color="#2D3748" />
              </TouchableOpacity>
            </View>

            {whiteNoiseError && (
              <View style={styles.whiteNoiseErrorContainer}>
                <Text style={styles.whiteNoiseErrorText}>{whiteNoiseError}</Text>
                <TouchableOpacity
                  style={styles.whiteNoiseRetryButton}
                  onPress={() => {
                    setWhiteNoiseError(null);
                    playWhiteNoise();
                  }}
                >
                  <Text style={styles.whiteNoiseRetryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.whiteNoiseDurationSection}>
              <Text style={styles.whiteNoiseDurationLabel}>Duración:</Text>
              <View style={styles.whiteNoiseDurationButtons}>
                {[15, 30, 60, null].map((duration) => (
                  <TouchableOpacity
                    key={duration || 'unlimited'}
                    style={[
                      styles.whiteNoiseDurationButton,
                      whiteNoiseDurationMinutes === duration &&
                        styles.whiteNoiseDurationButtonActive,
                    ]}
                    onPress={() => setWhiteNoiseDurationMinutes(duration)}
                  >
                    <Text
                      style={[
                        styles.whiteNoiseDurationButtonText,
                        whiteNoiseDurationMinutes === duration &&
                          styles.whiteNoiseDurationButtonTextActive,
                      ]}
                    >
                      {duration ? `${duration} min` : 'Ilimitado'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.whiteNoiseControlsContainer}>
              {whiteNoiseLoading ? (
                <ActivityIndicator size="large" color="#887CBC" />
              ) : (
                <TouchableOpacity
                  style={[
                    styles.whiteNoisePlayButton,
                    whiteNoisePlaying && styles.whiteNoisePlayButtonActive,
                  ]}
                  onPress={whiteNoisePlaying ? pauseWhiteNoise : playWhiteNoise}
                >
                  <Ionicons
                    name={whiteNoisePlaying ? 'pause' : 'play'}
                    size={48}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>

            {whiteNoisePlaying && whiteNoiseDurationMinutes && (
              <Text style={styles.whiteNoiseTimerText}>
                Deteniéndose en {whiteNoiseDurationMinutes} minutos
              </Text>
            )}
          </View>
        </View>
      </Modal>

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
  homeScrollContent: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 24,
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
  homeHero: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  homeHeroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D8F1EF",
    shadowColor: "#178A84",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 2,
  },
  homeHeroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  homeHeroCopy: {
    flex: 1,
  },
  homeHeroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#178A84",
    textTransform: "uppercase",
  },
  homeHeroTitle: {
    fontSize: 23,
    fontWeight: "700",
    color: "#24323F",
    marginTop: 4,
    lineHeight: 30,
  },
  homeHeroSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#526170",
    marginTop: 6,
    lineHeight: 20,
  },
  homeHeroAvatarButton: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  homeHeroAvatar: {
    width: "100%",
    height: "100%",
  },
  homeHeroAvatarPlaceholder: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#FFF0F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  homeHeroFooter: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  homeHeroBadge: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F4FBFA",
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  homeHeroBadgeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#2D3748",
  },
  homeHeroAskButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: "#E5E1F2",
  },
  homeHeroAskText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5CA5",
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
    gap: 9,
    paddingBottom: 4,
    flexGrow: 1,
  },
  quickActionsShell: {
    paddingBottom: 14,
  },
  quickActionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#24323F",
  },
  quickActionsHint: {
    fontSize: 12,
    fontWeight: "600",
    color: "#718096",
  },
  quickActionButton: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 88,
    height: 78,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionLabel: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
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
  quickActionOrange: {
    backgroundColor: "#FF9244",
  },

  // Consultas Activas
  activeConsultationsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  consultationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  consultationsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  consultationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    fontFamily: 'Montserrat',
  },
  consultationsViewAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  consultationsScroll: {
    paddingRight: 20,
  },
  consultationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginRight: 16,
    width: 300,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  consultationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  consultationStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  consultationStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9CA3AF',
  },
  consultationStatusDotPending: {
    backgroundColor: '#F59E0B',
  },
  consultationStatusDotAccepted: {
    backgroundColor: '#10B981',
  },
  consultationStatusDotActive: {
    backgroundColor: '#3B82F6',
  },
  consultationStatusDotCompleted: {
    backgroundColor: '#6B7280',
  },
  consultationStatusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78350F',
  },
  consultationTypeBadge: {
    backgroundColor: '#887CBC',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  consultationTypeBadgeVideo: {
    backgroundColor: '#EC4899',
  },
  consultationSpecialistInfo: {
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 14,
  },
  consultationSpecialistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    fontFamily: 'Montserrat',
  },
  consultationChildName: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  consultationSymptoms: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  consultationSymptomDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#887CBC',
  },
  consultationSymptomMore: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  consultationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#F3F4F6',
  },
  consultationTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },

  bannerHome1Container: {
    marginTop: 0,
    marginBottom: 12,
    alignItems: 'center',
  },
  bannerSlot: {
    marginTop: 0,
    marginBottom: 14,
    alignItems: 'center',
  },
  bannerHome1Carousel: {
    height: 144,
    maxHeight: 144,
    overflow: 'hidden',
  },
  bannerSlotCompact: {
    marginTop: -4,
    marginBottom: 10,
    alignItems: 'center',
  },
  bannerSlotWide: {
    height: 112,
    maxHeight: 112,
    marginBottom: 16,
    alignItems: 'center',
    overflow: 'hidden',
  },
  bannerCompactCarousel: {
    height: 118,
    maxHeight: 118,
    overflow: 'hidden',
  },
  bannerHome2Container: {
    marginTop: 2,
    marginBottom: 14,
    alignItems: 'center',
  },
  bannerHome3Container: {
    marginTop: 4,
    marginBottom: 16,
    alignItems: 'center',
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
  pregnancySizeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  pregnancyComparisonModes: {
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
    paddingRight: 14,
  },
  pregnancyComparisonMode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E9EEF2',
    marginRight: 8,
  },
  pregnancyComparisonModeActive: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  pregnancyComparisonModeIcon: {
    fontSize: 15,
  },
  pregnancyComparisonModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#526170',
  },
  pregnancyComparisonModeTextActive: {
    color: '#FFFFFF',
  },
  pregnancySizeImageWrap: {
    width: '100%',
    height: Math.min(PREGNANCY_SIZE_IMAGE_HEIGHT, 260),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 18,
    marginBottom: 2,
    overflow: 'hidden',
  },
  pregnancySizeImageWrapHuman: {
    height: Math.min(PREGNANCY_SIZE_IMAGE_HEIGHT, 302),
    marginTop: 4,
    marginHorizontal: 0,
    alignSelf: 'stretch',
    borderRadius: 18,
    overflow: 'hidden',
  },
  pregnancySizeImage: {
    width: '100%',
    height: '100%',
  },
  pregnancySizeImageHuman: {
    borderRadius: 18,
  },
  pregnancySizeLearnMore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E84D8A',
    borderRadius: 17,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  pregnancySizeLearnMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 2,
  },
  pregnancySizeImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  pregnancySizeEmoji: {
    fontSize: 72,
  },
  pregnancySizeMissingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 18,
  },
  pregnancySizeMissingSubtext: {
    maxWidth: 250,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 6,
    textAlign: 'center',
  },
  pregnancySizeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 18,
    textAlign: 'left',
  },
  pregnancyWeekSelectorHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  pregnancyWeekHeadline: {
    flex: 1,
    minWidth: 0,
  },
  pregnancyWeekSelectorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D3748',
    lineHeight: 26,
  },
  pregnancyWeekActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pregnancyWeekCurrentButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  pregnancyWeekCurrentButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#178A84',
  },
  pregnancyWeekScroller: {
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 2,
    gap: 8,
  },
  pregnancyWeekChip: {
    width: PREGNANCY_WEEK_CHIP_SIZE,
    height: PREGNANCY_WEEK_CHIP_SIZE,
    borderRadius: PREGNANCY_WEEK_CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  pregnancyWeekChipActive: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  pregnancyWeekChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
  },
  pregnancyWeekChipTextActive: {
    color: '#FFFFFF',
  },
  pregnancyWeekChipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#FFC211',
    position: 'absolute',
    bottom: 6,
  },
  pregnancyHub: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  pregnancyHubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pregnancyHubTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  pregnancyHubSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 2,
  },
  pregnancyHubWeekBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E84D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyHubWeekText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pregnancyModuleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pregnancyModuleTile: {
    width: '48%',
    minHeight: 112,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EEF0F3',
    justifyContent: 'space-between',
  },
  pregnancyModuleTileIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  pregnancyModuleTileTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
  },
  pregnancyModuleTilePreview: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    lineHeight: 15,
    marginTop: 4,
  },
  pregnancyModuleTabs: {
    paddingBottom: 10,
    gap: 8,
  },
  pregnancyModuleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#F3C2D7',
    gap: 5,
    marginRight: 8,
  },
  pregnancyModuleTabActive: {
    backgroundColor: '#E84D8A',
    borderColor: '#E84D8A',
  },
  pregnancyModuleTabText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E84D8A',
  },
  pregnancyModuleTabTextActive: {
    color: '#FFFFFF',
  },
  pregnancyInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  pregnancyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  pregnancyInfoTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
  },
  pregnancyInfoText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
  },
  pregnancyBulletText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
    marginTop: 3,
  },
  pregnancyChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  pregnancyChecklistText: {
    flex: 1,
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 18,
  },
  pregnancyChecklistTextDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  pregnancyTwoColumn: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pregnancyColumnCard: {
    flex: 1,
    backgroundColor: '#F0FBFA',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BDEBE7',
  },
  pregnancyColumnCardAlert: {
    flex: 1,
    backgroundColor: '#FFF7D6',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE08A',
  },
  pregnancyColumnTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#2D3748',
    marginBottom: 6,
  },
  pregnancySmallBullet: {
    fontSize: 12,
    color: '#4A5568',
    lineHeight: 17,
    marginTop: 2,
  },
  pregnancySymptomChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pregnancySymptomChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pregnancySymptomChipActive: {
    backgroundColor: '#E84D8A',
    borderColor: '#E84D8A',
  },
  pregnancySymptomChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4A5568',
  },
  pregnancySymptomChipTextActive: {
    color: '#FFFFFF',
  },
  pregnancyMovementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  pregnancyMovementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E84D8A',
    borderRadius: 18,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 4,
  },
  pregnancyMovementButtonText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pregnancyMovementCount: {
    minWidth: 34,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '900',
    color: '#2D3748',
  },
  pregnancyMovementReset: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pregnancyMovementResetText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },
  contractionTimerDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F6',
    borderRadius: 18,
    paddingVertical: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FFD6E8',
  },
  contractionTimerText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#E84D8A',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  contractionTimerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    marginTop: 4,
  },
  contractionStopButton: {
    backgroundColor: '#EF4444',
  },
  contractionHistory: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF0F3',
    paddingTop: 8,
  },
  contractionHistoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  contractionHistoryDuration: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  contractionHistoryInterval: {
    flex: 1,
    textAlign: 'right',
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 10,
  },
  pregnancyDiaryInput: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    padding: 12,
    fontSize: 13,
    color: '#2D3748',
    lineHeight: 18,
  },
  pregnancyDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.45)',
    justifyContent: 'flex-end',
  },
  pregnancyDetailContent: {
    maxHeight: '88%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  pregnancyModuleModalContent: {
    maxHeight: '78%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  pregnancyDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  pregnancyDetailEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E84D8A',
    textTransform: 'uppercase',
  },
  pregnancyDetailTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#2D3748',
    marginTop: 2,
  },
  pregnancyDetailClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyDetailScroll: {
    marginHorizontal: -2,
    paddingHorizontal: 2,
  },
  pregnancyDetailImageButton: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
  },
  pregnancyDetailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  pregnancyDetailImageHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(45, 55, 72, 0.82)',
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  pregnancyDetailImageHintText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pregnancyImageViewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12, 16, 24, 0.96)',
    paddingTop: Platform.OS === 'ios' ? 58 : 34,
    paddingHorizontal: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
  },
  pregnancyImageViewerHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pregnancyImageViewerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  pregnancyImageViewerShareButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 21,
    backgroundColor: '#E84D8A',
  },
  pregnancyImageViewerShareText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pregnancyImageViewerTitleWrap: {
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  pregnancyImageViewerEyebrow: {
    fontSize: 12,
    fontWeight: '900',
    color: '#F9A8D4',
    textTransform: 'uppercase',
  },
  pregnancyImageViewerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    marginTop: 4,
  },
  pregnancyImageViewerInsight: {
    maxWidth: 320,
    fontSize: 13,
    fontWeight: '600',
    color: '#E5E7EB',
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 8,
  },
  pregnancyImageViewerImage: {
    flex: 1,
    width: '100%',
    maxHeight: '74%',
    alignSelf: 'center',
  },
  pregnancyImageViewerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyImageViewerFallbackText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  pregnancyImageViewerFooter: {
    marginTop: 16,
    alignItems: 'center',
  },
  pregnancyImageViewerPrimaryAction: {
    minHeight: 50,
    width: '100%',
    maxWidth: 320,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E84D8A',
  },
  pregnancyImageViewerPrimaryText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pregnancyMeasurementCard: {
    backgroundColor: '#FFF0F6',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFD6E8',
  },
  pregnancyMeasurementTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 12,
  },
  pregnancyMeasurementRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  pregnancyMeasurementItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pregnancyMeasurementDivider: {
    width: 1,
    backgroundColor: '#FFD6E8',
    marginHorizontal: 10,
  },
  pregnancyMeasurementLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  pregnancyMeasurementValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#E84D8A',
    textAlign: 'center',
  },
  pregnancyMeasurementNote: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
  },
  pregnancyDetailSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  pregnancyDetailSectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFF0F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pregnancyDetailSectionBody: {
    flex: 1,
  },
  pregnancyDetailSectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
    marginBottom: 4,
  },
  pregnancyDetailSectionText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
  },
  pregnancyDetailImportant: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF7D6',
    borderRadius: 16,
    padding: 14,
    marginTop: 2,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FFC211',
  },
  pregnancyDetailImportantIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E84D8A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  pregnancyDetailImportantTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2D3748',
    marginBottom: 4,
  },
  pregnancyDetailImportantText: {
    fontSize: 13,
    color: '#4A5568',
    lineHeight: 19,
  },
  pregnancyDetailDisclaimer: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  pregnancyStatusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EEF0F3',
  },
  pregnancyStatusTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#2D3748',
    marginBottom: 4,
  },
  pregnancyStatusSubtitle: {
    fontSize: 12,
    color: '#718096',
    lineHeight: 17,
    marginBottom: 12,
  },
  pregnancyStatusButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#E84D8A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  pregnancyStatusButtonDanger: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 0,
  },
  pregnancyStatusButtonDisabled: {
    opacity: 0.65,
  },
  pregnancyStatusButtonText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pregnancyStatusButtonDangerText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B42318',
  },
  pregnancyDatePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 55, 72, 0.45)',
    justifyContent: 'flex-end',
  },
  pregnancyDatePickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  pregnancyDatePickerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 8,
  },
  pregnancyDatePickerActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  pregnancyDatePickerCancel: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyDatePickerConfirm: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: '#E84D8A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pregnancyDatePickerCancelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4A5568',
  },
  pregnancyDatePickerConfirmText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  todayGuideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3E2A0",
    shadowColor: "#9A6B00",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  todayGuideHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  todayGuideHeaderCopy: {
    flex: 1,
  },
  todayGuideIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#FFF4D1",
    alignItems: "center",
    justifyContent: "center",
  },
  todayGuideLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9A6B00",
    textTransform: "uppercase",
  },
  todayGuideHeaderSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#718096",
    marginTop: 2,
  },
  todayGuideMetaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4D1",
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#FFE08A",
  },
  todayGuideMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9A6B00",
  },
  todayGuideWeek: {
    fontSize: 18,
    fontWeight: "700",
    color: "#24323F",
    marginTop: 8,
    lineHeight: 25,
  },
  todayGuideText: {
    fontSize: 14,
    color: "#4A5568",
    marginTop: 8,
    lineHeight: 21,
  },
  todayGuideSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 18,
  },
  todayPlanActionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F4FBFA",
    borderRadius: 16,
    padding: 13,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#D8F1EF",
    gap: 10,
  },
  todayPlanStepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#59C6C0",
    alignItems: "center",
    justifyContent: "center",
  },
  todayPlanStepText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  todayPlanActionCopy: {
    flex: 1,
  },
  todayPlanActionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#178A84",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  todayPlanActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#24323F",
    lineHeight: 20,
  },
  todayGuideWhyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  todayGuideWhyText: {
    flex: 1,
    fontSize: 12,
    color: "#526170",
    lineHeight: 17,
  },
  todayGuideActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  todayGuidePrimaryButton: {
    flex: 1.2,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#887CBC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  todayGuidePrimaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  todayGuideSecondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: "#F1EEFA",
    borderWidth: 1,
    borderColor: "#DCD6F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  todayGuideSecondaryButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B5CA5",
  },
  todayGuideTipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F4FBFA",
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#D8F1EF",
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
  specialistPromoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#D8F1EF",
    shadowColor: "#178A84",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  specialistPromoTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  specialistPromoIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: "#E9FAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  specialistPromoCopy: {
    flex: 1,
  },
  specialistPromoEyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: "#178A84",
    textTransform: "uppercase",
  },
  specialistPromoTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#24323F",
    lineHeight: 23,
    marginTop: 3,
  },
  specialistPromoSubtitle: {
    fontSize: 13,
    color: "#526170",
    lineHeight: 18,
    marginTop: 5,
  },
  specialistPromoBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  specialistAvatarStack: {
    width: 86,
    height: 38,
    flexDirection: "row",
    alignItems: "center",
  },
  specialistMiniAvatar: {
    width: 38,
    height: 38,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginRight: -10,
  },
  specialistMiniAvatarTeal: {
    backgroundColor: "#E9FAF8",
  },
  specialistMiniAvatarPink: {
    backgroundColor: "#FFF0F6",
  },
  specialistMiniAvatarPurple: {
    backgroundColor: "#F1EEFA",
  },
  specialistTrustGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  specialistTrustPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F4FBFA",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#D8F1EF",
  },
  specialistTrustText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#178A84",
  },
  specialistPromoChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  specialistPromoChip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#E9EEF2",
  },
  specialistPromoChipText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#526170",
  },
  specialistPromoNote: {
    fontSize: 12,
    color: "#718096",
    lineHeight: 17,
    marginTop: 12,
  },
  specialistPromoActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  specialistPromoPrimary: {
    flex: 1.35,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: "#59C6C0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  specialistPromoPrimaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  specialistPromoSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 15,
    backgroundColor: "#F1FBFA",
    borderWidth: 1,
    borderColor: "#D8F1EF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  specialistPromoSecondaryText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#178A84",
  },
  todaySectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#24323F",
    marginBottom: 2,
  },
  homeSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homeSectionHeaderCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  homeSectionSubtitle: {
    fontSize: 12,
    color: "#718096",
    fontWeight: "500",
    marginTop: 3,
  },

  // Estilos para sección de Receta
  recipeSection: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  recipeSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recipeSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#24323F',
  },
  recipeSectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#178A84',
  },
  todayToolsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 10,
  },
  todayToolCard: {
    width: "48%",
    minHeight: 98,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  todayToolCardSounds: {
    backgroundColor: "#FFF4D1",
    borderColor: "#FFE08A",
  },
  todayToolCardAdvisories: {
    backgroundColor: "#F1EEFA",
    borderColor: "#DCD6F0",
  },
  todayToolCardSpecialist: {
    backgroundColor: "#E9FAF8",
    borderColor: "#BFEDEA",
  },
  todayToolCardHealth: {
    backgroundColor: "#FFF0F6",
    borderColor: "#FFD6E8",
  },
  todayToolTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#24323F",
    marginTop: 8,
    textAlign: "center",
  },
  todayToolSubtitle: {
    fontSize: 11,
    color: "#526170",
    marginTop: 3,
    textAlign: "center",
    fontWeight: "700",
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
    height: 124,
    maxHeight: 124,
    marginBottom: 18,
    alignItems: 'center',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  todayBannerCarousel: {
    height: 112,
    maxHeight: 112,
    width: '100%',
    overflow: 'hidden',
  },
  todayDouliSection: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#FFD6E8",
    shadowColor: "#C93B78",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  douliBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F1EEFA",
    alignItems: "center",
    justifyContent: "center",
  },
  todayDouliSubtitle: {
    fontSize: 13,
    color: "#4A5568",
    fontWeight: "500",
    marginTop: 3,
  },
  todayDouliQuestion: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7FB",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F6DCEB",
  },
  todayDouliQuestionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: "#2D3748",
  },
  douliSpecialistSuggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F4FBFA",
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#D8F1EF",
  },
  douliSpecialistIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#E9FAF8",
    alignItems: "center",
    justifyContent: "center",
  },
  douliSpecialistCopy: {
    flex: 1,
  },
  douliSpecialistTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#24323F",
  },
  douliSpecialistText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#718096",
    lineHeight: 15,
    marginTop: 2,
  },
  todayDouliInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DCD6F0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8F6FC",
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
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  todayNearbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  todayNearbyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#24323F',
    flex: 1,
    paddingRight: 10,
  },
  todayNearbyLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#178A84',
  },
  todayNearbyEmpty: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyStateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F4FBFA',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  exploreGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  exploreCard: {
    flex: 1,
    minHeight: 128,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  exploreIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  exploreIconTeal: {
    backgroundColor: '#E9FAF8',
  },
  exploreIconYellow: {
    backgroundColor: '#FFF4D1',
  },
  exploreIconPurple: {
    backgroundColor: '#F1EEFA',
  },
  exploreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#24323F',
    lineHeight: 17,
  },
  exploreSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#718096',
    lineHeight: 15,
    marginTop: 3,
  },
  todayNearbyCard: {
    width: 154,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  todayNearbyImage: {
    width: '100%',
    height: 84,
    borderRadius: 12,
    marginBottom: 8,
  },
  todayNearbyImagePlaceholder: {
    width: '100%',
    height: 84,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayNearbyName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#24323F',
    marginBottom: 6,
    lineHeight: 17,
  },
  todayNearbyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  todayNearbyDistance: {
    fontSize: 11,
    color: '#526170',
    fontWeight: '700',
  },
  todayNearbyRating: {
    fontSize: 11,
    color: '#526170',
    fontWeight: '700',
  },
  todayNearbyLocation: {
    marginTop: 6,
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  popularPostList: {
    paddingRight: 4,
    paddingBottom: 6,
  },
  popularPostCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
  },
  popularPostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  popularPostAvatar: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#EEF2F6',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#24323F',
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
    fontWeight: '600',
    color: '#24323F',
    marginBottom: 6,
    lineHeight: 20,
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

  // Estilos del Modal de Ruido Blanco
  whiteNoiseModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  whiteNoiseModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  whiteNoiseModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  whiteNoiseModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  whiteNoiseErrorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  whiteNoiseErrorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 8,
  },
  whiteNoiseRetryButton: {
    backgroundColor: '#DC2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  whiteNoiseRetryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  whiteNoiseDurationSection: {
    marginBottom: 24,
  },
  whiteNoiseDurationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 12,
  },
  whiteNoiseDurationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  whiteNoiseDurationButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whiteNoiseDurationButtonActive: {
    backgroundColor: '#887CBC',
    borderColor: '#887CBC',
  },
  whiteNoiseDurationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
  },
  whiteNoiseDurationButtonTextActive: {
    color: '#FFFFFF',
  },
  whiteNoiseControlsContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  whiteNoisePlayButton: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#887CBC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  whiteNoisePlayButtonActive: {
    backgroundColor: '#7B68B0',
  },
  whiteNoiseTimerText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
  },

});

export default HomeScreen;
