import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import BannerCarousel from '../components/BannerCarousel';
import analyticsService from '../services/analyticsService';

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  category: string;
  isPrivate: boolean;
  imageUrl?: string; // URL de la imagen de la comunidad (opcional)
  isPublic?: boolean; // Campo del backend
  lastActivity?: string; // Última actividad (fecha)
  postCount?: number; // Número de posts
  activeMembers?: number; // Miembros activos en la última semana
  createdAt?: any; // Fecha de creación
}

const CommunitiesScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [userCommunities, setUserCommunities] = useState<Community[]>([]);
  const [publicCommunities, setPublicCommunities] = useState<Community[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [searchResults, setSearchResults] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'my' | 'explore'>('my');
  
  // Estado para el modal de creación
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]); // IDs de comunidades con solicitudes pendientes
  const loadInFlightRef = useRef(false);
  const lastLoadAtRef = useRef(0);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    keywords: '',
    description: '',
    isPrivate: false,
    image: null as string | null,
    imageMimeType: undefined as string | undefined,
  });

  // Cargar comunidades al montar el componente
  useEffect(() => {
    loadCommunities();
    // TODO: Cargar solicitudes pendientes desde el backend
    // loadPendingRequests();
  }, []);

  // Recargar comunidades cuando la pantalla recibe el foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCommunities();
    });

    return unsubscribe;
  }, [navigation]);

  // Limpiar estado cuando el usuario se desconecta
  useEffect(() => {
    if (!isAuthenticated) {
      setCommunities([]);
      setUserCommunities([]);
      setPublicCommunities([]);
      setFilteredCommunities([]);
      setSearchQuery('');
      setSearchResults([]);
      setShowSearchResults(false);
      setPendingRequests([]);
    }
  }, [isAuthenticated]);

  // Función para pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunities(true);
    setRefreshing(false);
  };

  // Función para obtener comunidades recomendadas basadas en el perfil
  const getRecommendedCommunities = (allCommunities: Community[]) => {
    // Filtrar comunidades a las que el usuario no pertenece
    const userCommunityIds = userCommunities.map(c => c.id);
    const availableCommunities = allCommunities.filter(c => !userCommunityIds.includes(c.id));
    
    // Sistema de puntuación simple basado en diferentes factores
    const scored = availableCommunities.map(community => {
      let score = 0;
      
      // Puntos por popularidad (más miembros)
      if (community.memberCount > 100) score += 3;
      else if (community.memberCount > 50) score += 2;
      else if (community.memberCount > 10) score += 1;
      
      // Puntos por actividad reciente
      if (community.lastActivity) {
        const daysSinceActivity = (new Date().getTime() - new Date(community.lastActivity).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity < 1) score += 5;
        else if (daysSinceActivity < 7) score += 3;
        else if (daysSinceActivity < 30) score += 1;
      }
      
      // Puntos por comunidades públicas (más accesibles)
      if (community.isPublic) score += 2;
      
      // Puntos por número de posts
      if (community.postCount) {
        if (community.postCount > 50) score += 3;
        else if (community.postCount > 20) score += 2;
        else if (community.postCount > 5) score += 1;
      }
      
      return { community, score };
    });
    
    // Ordenar por puntuación y devolver las top 5
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.community);
  };

  // Función para calcular tiempo relativo
  const getTimeAgo = (date: any) => {
    if (!date) return 'Sin actividad reciente';
    
    let activityDate: Date;
    if (typeof date === 'object' && date._seconds) {
      activityDate = new Date(date._seconds * 1000);
    } else if (typeof date === 'string') {
      activityDate = new Date(date);
    } else {
      return 'Sin actividad reciente';
    }
    
    const now = new Date();
    const diffMs = now.getTime() - activityDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)}sem`;
    return `Hace ${Math.floor(diffDays / 30)}mes`;
  };

  const getActivityTimestamp = (date: any) => {
    if (!date) return 0;
    if (typeof date === 'object' && date._seconds) return date._seconds * 1000;
    if (typeof date === 'string') {
      const time = new Date(date).getTime();
      return Number.isNaN(time) ? 0 : time;
    }
    return 0;
  };

  const sortCommunitiesByActivity = (items: Community[]) =>
    [...items].sort((a, b) => {
      const activityDiff = getActivityTimestamp(b.lastActivity) - getActivityTimestamp(a.lastActivity);
      if (activityDiff !== 0) return activityDiff;
      return (b.postCount || 0) - (a.postCount || 0);
    });

  // Función para aplicar filtros
  const applyFilter = (filter: 'my' | 'explore') => {
    setActiveFilter(filter);
    if (filter === 'my') {
      setFilteredCommunities(userCommunities);
    } else {
      setFilteredCommunities(publicCommunities);
    }
  };

  // Función para cargar todas las comunidades
  const loadCommunities = async (force: boolean = false) => {
    // Verificar que el usuario esté autenticado antes de cargar datos
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    if (loadInFlightRef.current) return;
    if (!force && Date.now() - lastLoadAtRef.current < 3000) return;

    if (!refreshing) {
      setIsLoading(true);
    }
    try {
      loadInFlightRef.current = true;
      // Cargar comunidades del usuario primero
      const userComms = await communitiesService.getUserCommunities();
      const userCommunitiesData = userComms?.data || userComms || [];
      setUserCommunities(Array.isArray(userCommunitiesData) ? userCommunitiesData : []);
      
      // Cargar comunidades públicas
      const publicComms = await communitiesService.getPublicCommunities();
      const publicCommunitiesData = publicComms?.data || publicComms || [];
      setPublicCommunities(Array.isArray(publicCommunitiesData) ? publicCommunitiesData : []);
      
      // Combinar ambas listas (usuario primero, luego públicas)
      const allCommunities = [...userCommunitiesData, ...publicCommunitiesData];
      setCommunities(allCommunities);
      if (Array.isArray(userCommunitiesData) && userCommunitiesData.length > 0) {
        setFilteredCommunities(userCommunitiesData);
        setActiveFilter((current) => current || 'my');
      } else {
        setFilteredCommunities(Array.isArray(publicCommunitiesData) ? publicCommunitiesData : []);
        setActiveFilter('explore');
      }
    } catch (error) {
      console.error('Error cargando comunidades:', error);
      // En caso de error, usar datos de ejemplo
      const fallbackCommunities = [
        {
          id: '1',
          name: 'Mamás Primerizas',
          description: 'Comunidad para madres que están experimentando la maternidad por primera vez',
          memberCount: 1250,
          category: 'Maternidad',
          isPrivate: false,
        },
        {
          id: '2',
          name: 'Papás Activos',
          description: 'Grupo para padres que quieren estar más involucrados en la crianza',
          memberCount: 890,
          category: 'Paternidad',
          isPrivate: false,
        }
      ];
      setCommunities(fallbackCommunities);
      setFilteredCommunities(fallbackCommunities);
    } finally {
      lastLoadAtRef.current = Date.now();
      loadInFlightRef.current = false;
      setIsLoading(false);
    }
  };

  // Búsqueda inteligente con debounce
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCommunities(activeFilter === 'my' ? userCommunities : publicCommunities);
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Filtro local como fallback inmediato
    const sourceCommunities = activeFilter === 'my' ? userCommunities : publicCommunities;
    const localFiltered = sourceCommunities.filter(community =>
      (community.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (community.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (community.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    );
    setFilteredCommunities(localFiltered);

    // Debounce para búsqueda del backend
    const timeoutId = setTimeout(() => {
      performIntelligentSearch(searchQuery.trim());
    }, 500); // 500ms de debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, activeFilter, userCommunities, publicCommunities]);

  // Función para realizar búsqueda inteligente en el backend
  const performIntelligentSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      
      const result = await communitiesService.searchCommunities(query, 20);
      
      
      if (result.success) {
        // El backend devuelve la estructura: { data: { results: [...] } }
        const searchData = result.data?.results || [];
        
        // Asegurar que searchData sea un array
        const validResults = Array.isArray(searchData) ? searchData : [];
        setSearchResults(validResults);
        setShowSearchResults(true);
      } else {
        setSearchResults([]);
        setShowSearchResults(true);
      }
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error en búsqueda inteligente:', error);
      // En caso de error, mantener solo filtro local
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCommunity = () => {
    setIsCreateModalVisible(true);
  };

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim() || !newCommunity.description.trim()) {
      Alert.alert('Error', 'El nombre y la descripción son obligatorios');
      return;
    }

    setIsCreating(true);
    try {
      
      
      let imageUrl = null;
      
      // 1. Si hay imagen, subirla primero para obtener la URL
      if (newCommunity.image) {
        try {
          imageUrl = await imageUploadService.uploadCommunityImage(newCommunity.image, newCommunity.imageMimeType);

        } catch (imageError) {
          console.error('❌ [COMMUNITIES] Error subiendo imagen a /api/communities/upload-photo:', imageError);
          Alert.alert('Error', 'No se pudo subir la imagen. La comunidad se creará sin imagen.');
        }
      }
      
      // 2. Preparar datos para el API con la URL de la imagen
      const communityData = {
        name: newCommunity.name.trim(),
        keywords: newCommunity.keywords.trim(),
        description: newCommunity.description.trim(),
        isPrivate: newCommunity.isPrivate,
        isPublic: !newCommunity.isPrivate, // Convertir a isPublic para el backend
        image: imageUrl, // Usar la URL obtenida del upload (se enviará como imageUrl)
      };
      
      
      // 3. Crear la comunidad con la URL de la imagen
      const response = await communitiesService.createCommunity(communityData);
      
      // 4. Recargar todas las comunidades para mostrar la nueva
      await loadCommunities();
      
      // 5. Limpiar el formulario y cerrar el modal
      setNewCommunity({
        name: '',
        keywords: '',
        description: '',
        isPrivate: false,
        image: null,
        imageMimeType: undefined,
      });
      setIsCreateModalVisible(false);
      
      Alert.alert('¡Éxito!', 'Comunidad creada correctamente');
    } catch (error) {
      console.error('❌ [COMMUNITIES] Error creando comunidad:', error);
      Alert.alert('Error', 'No se pudo crear la comunidad. Intenta de nuevo.');
    } finally {
      setIsCreating(false);
    }
  };

  const handlePickImage = async () => {
    try {
      
      // Solicitar permisos primero
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para seleccionar una imagen.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        setNewCommunity(prev => ({
          ...prev,
          image: selectedImage.uri,
          imageMimeType: selectedImage.mimeType || undefined // Guardar el tipo MIME real
        }));
        
      } else {
      }
    } catch (error) {
      console.error('❌ [IMAGE PICKER] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      
      // Solicitar permisos de cámara
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a la cámara para tomar una foto.');
        return;
      }
      
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        setNewCommunity(prev => ({
          ...prev,
          image: selectedImage.uri,
          imageMimeType: selectedImage.mimeType || undefined // Guardar el tipo MIME real
        }));
        
      } else {
      }
    } catch (error) {
      console.error('❌ [CAMERA] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const resetForm = () => {
    setNewCommunity({
      name: '',
      keywords: '',
      description: '',
      isPrivate: false,
      image: null,
      imageMimeType: undefined,
    });
    setIsCreateModalVisible(false);
  };

  // Función para verificar si una comunidad es del usuario
  const isUserCommunity = (community: Community) => {
    return userCommunities.some(userComm => userComm.id === community.id);
  };

  // Función para manejar la unión a una comunidad
  const handleJoinCommunity = async (community: Community) => {
    try {
      if (isUserCommunity(community)) {
        // Si es mi comunidad, navegar a los posts
        analyticsService.logEvent('community_open', {
          community_id: community.id,
          name: community.name,
          is_public: community.isPublic ?? !community.isPrivate,
          member_count: community.memberCount,
          category: community.category,
        });
        navigation.navigate('CommunityPosts', {
          communityId: community.id,
          communityName: community.name
        });
        return;
      }

      // Verificar si la comunidad es privada
      if (!community.isPublic) {
        analyticsService.logEvent('community_join_request', {
          community_id: community.id,
          name: community.name,
          is_public: false,
          member_count: community.memberCount,
          category: community.category,
        });
        // Para comunidades privadas, mostrar confirmación de solicitud
        Alert.alert(
          '🔒 Comunidad Privada',
          `"${community.name}" es una comunidad privada. ¿Te gustaría enviar una solicitud para unirte?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Enviar Solicitud', 
              onPress: () => handleJoinPrivateCommunity(community)
            }
          ]
        );
        return;
      }

      // Si es comunidad pública, unirse directamente
      analyticsService.logEvent('community_join', {
        community_id: community.id,
        name: community.name,
        is_public: true,
        member_count: community.memberCount,
        category: community.category,
      });
      setJoiningCommunityId(community.id);
      
      const result = await communitiesService.joinCommunity(community.id);
      
      if (result.success) {
        Alert.alert(
          '¡Bienvenido! 🎉',
          `Te has unido exitosamente a "${community.name}"`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Recargar comunidades para actualizar la lista
                loadCommunities();
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error uniéndose a comunidad:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo unir a la comunidad',
        [{ text: 'OK' }]
      );
    } finally {
      setJoiningCommunityId(null);
    }
  };

  // Función para manejar solicitudes a comunidades privadas
  const handleJoinPrivateCommunity = async (community: Community) => {
    try {
      setJoiningCommunityId(community.id);
      
      const result = await communitiesService.joinCommunity(community.id);
      
      if (result.success) {
        // Agregar a la lista de solicitudes pendientes
        setPendingRequests(prev => [...prev, community.id]);
        
        Alert.alert(
          '📨 Solicitud Enviada',
          `Tu solicitud para unirte a "${community.name}" ha sido enviada. El administrador de la comunidad la revisará y te notificará la decisión.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Recargar comunidades para actualizar la lista
                loadCommunities();
              }
            }
          ]
        );
      }
    } catch (error: any) {
      console.error('❌ [COMMUNITIES] Error enviando solicitud a comunidad privada:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo enviar la solicitud',
        [{ text: 'OK' }]
      );
    } finally {
      setJoiningCommunityId(null);
    }
  }

  const getCategoryIcon = (category: string) => {
    if (!category) return 'people';
    
    switch (category.toLowerCase()) {
      case 'maternidad':
        return 'female';
      case 'paternidad':
        return 'male';
      case 'embarazo':
        return 'heart';
      case 'crianza':
        return 'people';
      default:
        return 'people';
    }
  };

  const getCategoryColor = (category: string) => {
    if (!category) return '#887CBC';
    
    switch (category.toLowerCase()) {
      case 'maternidad':
        return '#FF69B4';
      case 'paternidad':
        return '#4169E1';
      case 'embarazo':
        return '#FF6B6B';
      case 'crianza':
        return '#32CD32';
      default:
        return '#887CBC';
    }
  };

  // Componente para el icono de la comunidad (imagen o icono por defecto)
  const CommunityIcon = ({ community }: { community: Community }) => {
    if (community.imageUrl) {
      return (
        <Image 
          source={{ uri: community.imageUrl }} 
          style={styles.communityImage}
          resizeMode="cover"
        />
      );
    }
    
    return (
      <View style={[styles.categoryIcon, { backgroundColor: getCategoryColor(community.category || 'general') }]}>
        <Ionicons name={getCategoryIcon(community.category || 'general') as any} size={26} color="white" />
      </View>
    );
  };

  // Componente para el botón de acción (Unirse o Ver Comunidad)
  const CommunityActionButton = ({ community }: { community: Community }) => {
    const isMyCommunity = isUserCommunity(community);
    const isJoining = joiningCommunityId === community.id;
    
    // Determinar el texto del botón según el tipo de comunidad
    const getButtonText = () => {
      if (isMyCommunity) return 'Entrar';
      if (!community.isPublic) return 'Solicitar';
      return 'Unirse';
    };

    // Determinar el icono según el tipo de comunidad
    const getButtonIcon = () => {
      if (isMyCommunity) return 'arrow-forward';
      if (!community.isPublic) return 'mail';
      return 'add';
    };
    
    return (
      <TouchableOpacity 
        style={[
          styles.joinButton, 
          isMyCommunity && styles.myCommunityButton,
          !community.isPublic && !isMyCommunity && styles.privateRequestButton,
          isJoining && styles.joinButtonDisabled
        ]}
        onPress={() => handleJoinCommunity(community)}
        disabled={isJoining}
      >
        {isJoining ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Text style={styles.joinButtonText}>
              {getButtonText()}
            </Text>
            <Ionicons 
              name={getButtonIcon() as any} 
              size={16} 
              color="white" 
            />
          </>
        )}
      </TouchableOpacity>
    );
  };

  const CommunityMetric = ({
    icon,
    text,
    color = '#6B7280',
  }: {
    icon: string;
    text: string;
    color?: string;
  }) => (
    <View style={styles.metricPill}>
      <Ionicons name={icon as any} size={13} color={color} />
      <Text style={styles.metricText}>{text}</Text>
    </View>
  );

  const CommunityCard = ({
    community,
    featured = false,
  }: {
    community: Community;
    featured?: boolean;
  }) => {
    const isMyCommunity = isUserCommunity(community);
    const hasPendingRequest = !isMyCommunity && !community.isPublic && pendingRequests.includes(community.id);

    return (
      <TouchableOpacity
        key={community.id || Math.random().toString()}
        style={[
          styles.communityCard,
          featured && styles.featuredCommunityCard,
          isMyCommunity && styles.myCommunityCard,
        ]}
        onPress={() => handleJoinCommunity(community)}
        activeOpacity={0.88}
      >
        <View style={styles.communityCardTop}>
          <CommunityIcon community={community} />
          <View style={styles.communityMainInfo}>
            <View style={styles.communityNameRow}>
              <Text
                style={styles.communityName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {community.name || 'Sin nombre'}
              </Text>
              {!community.isPublic && (
                <Ionicons name="lock-closed" size={14} color="#6B7280" />
              )}
            </View>
            <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
          </View>
        </View>

        <Text numberOfLines={2} style={styles.communityDescription}>
          {community.description || 'Sin descripción disponible'}
        </Text>

        <View style={styles.metricsRow}>
          <CommunityMetric icon="people-outline" text={`${community.memberCount || 0} miembros`} />
          {community.postCount !== undefined && (
            <CommunityMetric icon="chatbubbles-outline" text={`${community.postCount} posts`} color="#59C6C0" />
          )}
          <CommunityMetric icon="time-outline" text={getTimeAgo(community.lastActivity)} />
        </View>

        <View style={styles.communityCardFooter}>
          <View style={styles.statusBadgesRow}>
            {isMyCommunity && (
              <View style={styles.memberBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#178A84" />
                <Text style={styles.memberBadgeText}>Miembro</Text>
              </View>
            )}
            {hasPendingRequest && (
              <View style={styles.pendingRequestBadge}>
                <Ionicons name="time" size={13} color="#B7791F" />
                <Text style={styles.pendingRequestBadgeText}>Pendiente</Text>
              </View>
            )}
            {!isMyCommunity && community.isPublic && (
              <View style={styles.publicBadge}>
                <Ionicons name="globe-outline" size={13} color="#526170" />
                <Text style={styles.publicBadgeText}>Pública</Text>
              </View>
            )}
          </View>
          <CommunityActionButton community={community} />
        </View>

        {isMyCommunity && !community.isPublic && (
          <TouchableOpacity
            style={styles.requestsButton}
            onPress={() => navigation.navigate('CommunityRequests', {
              communityId: community.id,
              communityName: community.name
            })}
            activeOpacity={0.84}
          >
            <Ionicons name="mail-outline" size={15} color="#178A84" />
            <Text style={styles.requestsButtonText}>Solicitudes</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  // Componente de Skeleton para carga
  const CommunityCardSkeleton = () => (
    <View style={styles.communityCard}>
      <View style={styles.communityHeader}>
        <View style={styles.skeletonCircle} />
        <View style={{flex: 1, marginLeft: 12}}>
          <View style={[styles.skeletonLine, {width: '60%', marginBottom: 8}]} />
          <View style={[styles.skeletonLine, {width: '40%'}]} />
        </View>
      </View>
      <View style={[styles.skeletonLine, {width: '100%', marginTop: 12}]} />
      <View style={[styles.skeletonLine, {width: '80%', marginTop: 8}]} />
      <View style={[styles.skeletonButton, {marginTop: 12}]} />
    </View>
  );

  const myCommunitiesSorted = sortCommunitiesByActivity(userCommunities);
  const exploreCommunities = sortCommunitiesByActivity(
    publicCommunities.filter((community) => !isUserCommunity(community))
  );
  const recommendedCommunities = getRecommendedCommunities(communities).filter(
    (community) => !isUserCommunity(community)
  );
  const hasSearchQuery = searchQuery.trim().length > 0;
  const communitiesToShow = hasSearchQuery
    ? (showSearchResults ? searchResults : filteredCommunities)
    : activeFilter === 'my'
      ? myCommunitiesSorted
      : exploreCommunities;
  const emptyStateTitle = activeFilter === 'my'
    ? 'Aún no estás en ninguna comunidad'
    : 'No hay comunidades para explorar';
  const emptyStateText = activeFilter === 'my'
    ? 'Explora grupos de mamás, embarazo, sueño o alimentación.'
    : 'Sé la primera en crear un espacio para otras familias.';

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#59C6C0']}
            tintColor="#59C6C0"
          />
        }
      >
        <View style={styles.heroSection}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Comunidades</Text>
            <Text style={styles.heroSubtitle}>Encuentra apoyo real según tu etapa.</Text>
          </View>
          <TouchableOpacity style={styles.headerCreateButton} onPress={handleAddCommunity} activeOpacity={0.86}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <BannerCarousel section="comunidades" fallbackToHome={false} />

        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por etapa, tema o ciudad"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#59C6C0" style={styles.searchSpinner} />
            )}
            {searchQuery.length > 0 && !isSearching && (
              <TouchableOpacity onPress={() => {
                setSearchQuery('');
                setSearchResults([]);
                setShowSearchResults(false);
              }}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!hasSearchQuery && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeFilter === 'my' && styles.tabButtonActive]}
              onPress={() => applyFilter('my')}
              activeOpacity={0.86}
            >
              <Text style={[styles.tabButtonText, activeFilter === 'my' && styles.tabButtonTextActive]}>
                Mis comunidades
              </Text>
              <Text style={[styles.tabButtonCount, activeFilter === 'my' && styles.tabButtonTextActive]}>
                {userCommunities.length}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeFilter === 'explore' && styles.tabButtonActive]}
              onPress={() => applyFilter('explore')}
              activeOpacity={0.86}
            >
              <Text style={[styles.tabButtonText, activeFilter === 'explore' && styles.tabButtonTextActive]}>
                Explorar
              </Text>
              <Text style={[styles.tabButtonCount, activeFilter === 'explore' && styles.tabButtonTextActive]}>
                {exploreCommunities.length}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading ? (
          <View style={styles.communitiesSection}>
            <Text style={styles.sectionTitle}>Cargando comunidades</Text>
            <CommunityCardSkeleton />
            <CommunityCardSkeleton />
            <CommunityCardSkeleton />
          </View>
        ) : hasSearchQuery ? (
          <View style={styles.communitiesSection}>
            <View style={styles.searchResultsHeader}>
              <View>
                <Text style={styles.sectionTitle}>Resultados</Text>
                <Text style={styles.sectionSubtitle}>Búsqueda: "{searchQuery}"</Text>
              </View>
              {isSearching && <ActivityIndicator size="small" color="#59C6C0" />}
            </View>

            {(!Array.isArray(communitiesToShow) || communitiesToShow.length === 0) && !isSearching ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={44} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No encontramos comunidades</Text>
                <Text style={styles.emptyStateSubtext}>
                  Prueba con lactancia, sueño, embarazo o el nombre de tu ciudad.
                </Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={handleAddCommunity}>
                  <Text style={styles.emptyStateButtonText}>Crear comunidad</Text>
                </TouchableOpacity>
              </View>
            ) : (
              communitiesToShow.map((community) => (
                <CommunityCard key={community.id || Math.random().toString()} community={community} />
              ))
            )}
          </View>
        ) : activeFilter === 'my' ? (
          <View style={styles.communitiesSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Mis comunidades activas</Text>
                <Text style={styles.sectionSubtitle}>Entra rápido a donde ya participas.</Text>
              </View>
            </View>

            {myCommunitiesSorted.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="people-outline" size={44} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>{emptyStateTitle}</Text>
                <Text style={styles.emptyStateSubtext}>{emptyStateText}</Text>
                <TouchableOpacity style={styles.emptyStateButton} onPress={() => applyFilter('explore')}>
                  <Text style={styles.emptyStateButtonText}>Explorar comunidades</Text>
                </TouchableOpacity>
              </View>
            ) : (
              myCommunitiesSorted.map((community) => (
                <CommunityCard key={community.id || Math.random().toString()} community={community} />
              ))
            )}
          </View>
        ) : (
          <>
            {recommendedCommunities.length > 0 && (
              <View style={styles.communitiesSection}>
                <View style={styles.sectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Para ti</Text>
                    <Text style={styles.sectionSubtitle}>Grupos con más actividad o afinidad.</Text>
                  </View>
                </View>
                {recommendedCommunities.slice(0, 3).map((community) => (
                  <CommunityCard
                    key={community.id || Math.random().toString()}
                    community={community}
                    featured
                  />
                ))}
              </View>
            )}

            <View style={styles.communitiesSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Explorar comunidades</Text>
                  <Text style={styles.sectionSubtitle}>Encuentra conversaciones útiles para tu etapa.</Text>
                </View>
              </View>

              {exploreCommunities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="compass-outline" size={44} color="#9CA3AF" />
                  <Text style={styles.emptyStateText}>{emptyStateTitle}</Text>
                  <Text style={styles.emptyStateSubtext}>{emptyStateText}</Text>
                </View>
              ) : (
                exploreCommunities.map((community) => (
                  <CommunityCard key={community.id || Math.random().toString()} community={community} />
                ))
              )}
            </View>
          </>
        )}

        {!isLoading && !hasSearchQuery && (
          <View style={styles.createPrompt}>
            <View style={styles.createPromptIcon}>
              <Ionicons name="sparkles-outline" size={20} color="#178A84" />
            </View>
            <View style={styles.createPromptCopy}>
              <Text style={styles.createPromptTitle}>¿No encuentras tu grupo?</Text>
              <Text style={styles.createPromptText}>Crea una comunidad para otras familias como la tuya.</Text>
            </View>
            <TouchableOpacity style={styles.createPromptButton} onPress={handleAddCommunity} activeOpacity={0.86}>
              <Text style={styles.createPromptButtonText}>Crear</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modal de Creación de Comunidad */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={resetForm} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Nueva Comunidad</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Selección de Imagen */}
            <View style={styles.imageSection}>
              <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
                {newCommunity.image ? (
                  <View style={styles.imageSelectedContainer}>
                    <Image source={{ uri: newCommunity.image }} style={styles.selectedImage} />
                    <View style={styles.imageSelectedOverlay}>
                      <Ionicons name="checkmark-circle" size={24} color="#32CD32" />
                      <Text style={styles.imageSelectedText}>Imagen Seleccionada</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={32} color="#999" />
                    <Text style={styles.imagePlaceholderText}>Agregar Imagen (Opcional)</Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {/* Botones de selección de imagen */}
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
                  <Ionicons name="images" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Galería</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.imageButton} onPress={handleTakePhoto}>
                  <Ionicons name="camera" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Cámara</Text>
                </TouchableOpacity>
              </View>
              
              {/* Información de la imagen seleccionada */}
              {newCommunity.image && (
                <View style={styles.imageInfo}>
                  <Text style={styles.imageInfoText}>✓ URL de imagen lista para enviar</Text>
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => setNewCommunity(prev => ({ ...prev, image: null }))}
                  >
                    <Ionicons name="close-circle" size={16} color="#FF6B6B" />
                    <Text style={styles.removeImageText}>Remover</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Formulario */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Nombre de la Comunidad *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Mamás Primerizas"
                value={newCommunity.name}
                onChangeText={(text) => setNewCommunity(prev => ({ ...prev, name: text }))}
                maxLength={50}
              />

              <Text style={styles.inputLabel}>Palabras Clave</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: maternidad, primerizas, apoyo"
                value={newCommunity.keywords}
                onChangeText={(text) => setNewCommunity(prev => ({ ...prev, keywords: text }))}
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Descripción *</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe tu comunidad..."
                value={newCommunity.description}
                onChangeText={(text) => setNewCommunity(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                maxLength={300}
              />

              {/* Configuración de Privacidad */}
              <View style={styles.privacySection}>
                <Text style={styles.inputLabel}>Configuración de Privacidad</Text>
                <TouchableOpacity
                  style={styles.privacyOption}
                  onPress={() => setNewCommunity(prev => ({ ...prev, isPrivate: !prev.isPrivate }))}
                >
                  <View style={styles.radioButton}>
                    {newCommunity.isPrivate && <View style={styles.radioButtonSelected} />}
                  </View>
                  <View style={styles.privacyInfo}>
                    <Text style={styles.privacyTitle}>
                      {newCommunity.isPrivate ? 'Comunidad Privada' : 'Comunidad Pública'}
                    </Text>
                    <Text style={styles.privacyDescription}>
                      {newCommunity.isPrivate 
                        ? 'Solo tú aceptas quién entra. La comunidad no aparece en búsquedas públicas.' 
                        : 'Cualquiera puede unirse sin aprobación. Aparece en búsquedas.'
                      }
                    </Text>
                  </View>
                  <Ionicons 
                    name={newCommunity.isPrivate ? 'lock-closed' : 'globe'} 
                    size={20} 
                    color={newCommunity.isPrivate ? '#FF6B6B' : '#32CD32'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={resetForm}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.createButton, isCreating && styles.createButtonDisabled]} 
              onPress={handleCreateCommunity}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="white" />
                  <Text style={styles.createButtonText}>Crear Comunidad</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  heroCopy: {
    flex: 1,
    paddingRight: 14,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3748',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  headerCreateButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#59C6C0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59C6C0',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },

  // Sección de búsqueda
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#887CBC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#2C3E50',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#EAF0F4',
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#178A84',
  },
  tabButtonCount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
  },

  // Sección de añadir
  addSection: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'transparent',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 28,
    shadowColor: '#59C6C0',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
  },

  // Sección de comunidades
  communitiesSection: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },

  // Tarjeta de comunidad
  communityCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#887CBC',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 7,
    elevation: 3,
  },
  featuredCommunityCard: {
    borderColor: '#BFEDEA',
    backgroundColor: '#FBFFFF',
  },
  communityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  communityMainInfo: {
    flex: 1,
    minWidth: 0,
  },
  communityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    width: '100%',
  },
  communityTitleContainer: {
    width: '100%',
    marginBottom: 8,
    marginTop: 4,
    paddingLeft: 0,
  },
  categoryIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  communityImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    flexShrink: 0,
  },
  communityName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
    lineHeight: 21,
    textAlign: 'left',
  },
  communityCategory: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'capitalize',
    fontWeight: '700',
    marginTop: 3,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexShrink: 0,
  },
  memberCount: {
    fontSize: 13,
    color: '#2C3E50',
    marginLeft: 5,
    marginRight: 10,
    fontWeight: '600',
  },
  privateIcon: {
    marginLeft: 5,
  },
  communityDescription: {
    fontSize: 13,
    color: '#526170',
    lineHeight: 19,
    marginBottom: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 12,
  },
  metricPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 14,
    backgroundColor: '#F5F7FA',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#526170',
  },
  communityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusBadgesRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#96d2d3',
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignSelf: 'flex-start',
    shadowColor: '#887CBC',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  joinButtonDisabled: {
    backgroundColor: '#CCC',
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },

  // Estado vacío
  emptyState: {
    alignItems: 'center',
    paddingVertical: 38,
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  emptyStateText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyStateButton: {
    marginTop: 16,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#59C6C0',
  },
  emptyStateButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  createPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 30,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F1FBFA',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  createPromptIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  createPromptCopy: {
    flex: 1,
    minWidth: 0,
  },
  createPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D3748',
  },
  createPromptText: {
    fontSize: 12,
    color: '#526170',
    lineHeight: 17,
    marginTop: 2,
  },
  createPromptButton: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#59C6C0',
  },
  createPromptButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Estilos del Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 34, // Mismo ancho que el botón de cerrar para centrar el título
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  
  // Sección de imagen
  imageSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  imagePicker: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },

  // Formulario
  formSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F7FAFC',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },

  // Configuración de privacidad
  privacySection: {
    marginTop: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    marginTop: 10,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#887CBC',
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#96d2d3',
  },
  privacyInfo: {
    flex: 1,
    marginRight: 15,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },

  // Botones de acción
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  createButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#96d2d3',
    gap: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#B0B0B0',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Estilos para comunidades del usuario
  myCommunityCard: {
    borderColor: '#BFEDEA',
    backgroundColor: '#FBFFFF',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ownerText: {
    fontSize: 12,
    color: '#59C6C0',
    fontWeight: '600',
    marginLeft: 4,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9FBFA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7F0ED',
  },
  memberBadgeText: {
    fontSize: 11,
    color: '#178A84',
    fontWeight: '800',
    marginLeft: 4,
  },
  pendingRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F6D58B',
  },
  pendingRequestBadgeText: {
    fontSize: 11,
    color: '#B7791F',
    fontWeight: '800',
    marginLeft: 4,
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  publicBadgeText: {
    fontSize: 11,
    color: '#526170',
    fontWeight: '800',
    marginLeft: 4,
  },
  myCommunityButton: {
    backgroundColor: '#96d2d3',
  },
  privateRequestButton: {
    backgroundColor: '#FF6B6B',
  },

  // Estilos para indicador de carga
  loadingSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },

  // Estilos para imagen seleccionada
  imageSelectedContainer: {
    position: 'relative',
  },
  imageSelectedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  imageSelectedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  imageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 20,
  },
  imageInfoText: {
    fontSize: 14,
    color: '#32CD32',
    fontWeight: '600',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  removeImageText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginLeft: 4,
    fontWeight: '600',
  },

  // Estilos para botones de imagen
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingHorizontal: 20,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  imageButtonText: {
    fontSize: 14,
    color: '#59C6C0',
    fontWeight: '600',
    marginLeft: 8,
  },
  requestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FFFE',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#59C6C0',
    marginTop: 10,
    alignSelf: 'center',
  },
  requestsButtonText: {
    color: '#59C6C0',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },

  // Estilos para búsqueda inteligente
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  searchResultCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#59C6C0',
    backgroundColor: '#F8FCFC',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  noResultsSubtext: {
    fontSize: 12,
    color: '#BBB',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  searchSpinner: {
    marginRight: 8,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
  },
  filterChip: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  skeletonCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonButton: {
    height: 40,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  activityStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },

});

export default CommunitiesScreen;
