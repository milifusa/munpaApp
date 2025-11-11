import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';

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
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'public'>('all');
  
  // Estado para el modal de creación
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [joiningCommunityId, setJoiningCommunityId] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<string[]>([]); // IDs de comunidades con solicitudes pendientes
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    keywords: '',
    description: '',
    isPrivate: false,
    image: null as string | null,
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
      console.log('🔄 [COMMUNITIES] Pantalla recibió foco, recargando comunidades...');
      loadCommunities();
    });

    return unsubscribe;
  }, [navigation]);

  // Limpiar estado cuando el usuario se desconecta
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('🧹 [COMMUNITIES] Usuario desconectado, limpiando estado...');
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
    await loadCommunities();
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

  // Función para aplicar filtros
  const applyFilter = (filter: 'all' | 'my' | 'public') => {
    setActiveFilter(filter);
    if (filter === 'my') {
      setFilteredCommunities(userCommunities);
    } else if (filter === 'public') {
      setFilteredCommunities(publicCommunities);
    } else {
      setFilteredCommunities(communities);
    }
  };

  // Función para cargar todas las comunidades
  const loadCommunities = async () => {
    // Verificar que el usuario esté autenticado antes de cargar datos
    if (!isAuthenticated) {
      console.log('🚫 [COMMUNITIES] Usuario no autenticado, no cargando comunidades');
      setIsLoading(false);
      return;
    }

    if (!refreshing) {
      setIsLoading(true);
    }
    try {
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
      setFilteredCommunities(allCommunities);
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
      setIsLoading(false);
    }
  };

  // Búsqueda inteligente con debounce
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCommunities(communities);
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Filtro local como fallback inmediato
    const localFiltered = communities.filter(community =>
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
  }, [searchQuery, communities]);

  // Función para realizar búsqueda inteligente en el backend
  const performIntelligentSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setShowSearchResults(false);
      return;
    }

    try {
      setIsSearching(true);
      console.log('🔍 [COMMUNITIES] Iniciando búsqueda inteligente:', query);
      
      const result = await communitiesService.searchCommunities(query, 20);
      
      console.log('🔍 [COMMUNITIES] Estructura completa de respuesta:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        // El backend devuelve la estructura: { data: { results: [...] } }
        const searchData = result.data?.results || [];
        console.log('✅ [COMMUNITIES] Resultados de búsqueda:', searchData.length);
        console.log('✅ [COMMUNITIES] Total encontrados:', result.data?.totalFound || 0);
        console.log('✅ [COMMUNITIES] Datos extraídos:', searchData);
        
        // Asegurar que searchData sea un array
        const validResults = Array.isArray(searchData) ? searchData : [];
        setSearchResults(validResults);
        setShowSearchResults(true);
      } else {
        console.log('❌ [COMMUNITIES] Búsqueda sin resultados');
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
      console.log('🏗️ [COMMUNITIES] Creando comunidad con datos:', newCommunity);
      console.log('🔄 [COMMUNITIES] Conversión de campos:', {
        isPrivate: newCommunity.isPrivate,
        isPublic: !newCommunity.isPrivate
      });
      
      let imageUrl = null;
      
      // 1. Si hay imagen, subirla primero para obtener la URL
      if (newCommunity.image) {
        console.log('🖼️ [COMMUNITIES] Subiendo imagen a /api/communities/upload-photo...');
        try {
          imageUrl = await imageUploadService.uploadCommunityImage(newCommunity.image);
          console.log('✅ [COMMUNITIES] Imagen subida exitosamente, URL obtenida:', imageUrl);
          console.log('🔍 [COMMUNITIES] Verificando URL obtenida:', {
            imageUrl,
            isString: typeof imageUrl === 'string',
            length: imageUrl?.length,
            startsWithHttp: imageUrl?.startsWith('http')
          });
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
      
      console.log('🏗️ [COMMUNITIES] Datos preparados:', communityData);
      
      // 3. Crear la comunidad con la URL de la imagen
      const response = await communitiesService.createCommunity(communityData);
      console.log('✅ [COMMUNITIES] Comunidad creada:', response);
      
      // 4. Recargar todas las comunidades para mostrar la nueva
      await loadCommunities();
      
      // 5. Limpiar el formulario y cerrar el modal
      setNewCommunity({
        name: '',
        keywords: '',
        description: '',
        isPrivate: false,
        image: null,
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
      console.log('🖼️ [IMAGE PICKER] Iniciando selección de imagen...');
      
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
        console.log('🖼️ [IMAGE PICKER] Imagen seleccionada:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize
        });
        
        setNewCommunity(prev => ({
          ...prev,
          image: selectedImage.uri
        }));
        
        console.log('✅ [IMAGE PICKER] Imagen asignada al estado');
      } else {
        console.log('🖼️ [IMAGE PICKER] Selección cancelada por el usuario');
      }
    } catch (error) {
      console.error('❌ [IMAGE PICKER] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      console.log('📸 [CAMERA] Iniciando captura de foto...');
      
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
        console.log('📸 [CAMERA] Foto tomada:', {
          uri: selectedImage.uri,
          width: selectedImage.width,
          height: selectedImage.height,
          fileSize: selectedImage.fileSize
        });
        
        setNewCommunity(prev => ({
          ...prev,
          image: selectedImage.uri
        }));
        
        console.log('✅ [CAMERA] Foto asignada al estado');
      } else {
        console.log('📸 [CAMERA] Captura cancelada por el usuario');
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
        console.log('🏠 [COMMUNITIES] Es mi comunidad, navegando a posts:', community.name);
        navigation.navigate('CommunityPosts', {
          communityId: community.id,
          communityName: community.name
        });
        return;
      }

      // Verificar si la comunidad es privada
      if (!community.isPublic) {
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
      console.log('🤝 [COMMUNITIES] Uniéndose a comunidad pública:', community.name);
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
      console.log('🔒 [COMMUNITIES] Enviando solicitud a comunidad privada:', community.name);
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
        <Ionicons name={getCategoryIcon(community.category || 'general') as any} size={40} color="white" />
      </View>
    );
  };

  // Componente para el botón de acción (Unirse o Ver Comunidad)
  const CommunityActionButton = ({ community }: { community: Community }) => {
    const isMyCommunity = isUserCommunity(community);
    const isJoining = joiningCommunityId === community.id;
    
    // Determinar el texto del botón según el tipo de comunidad
    const getButtonText = () => {
      if (isMyCommunity) return 'Ver Comunidad';
      if (!community.isPublic) return 'Solicitar Unión';
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
        {/* Sección de Búsqueda */}
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar comunidades..."
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

        {/* Filtros de Comunidades */}
        {!showSearchResults && (
          <View style={styles.filtersContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
                onPress={() => applyFilter('all')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
                  Todas
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'my' && styles.filterChipActive]}
                onPress={() => applyFilter('my')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'my' && styles.filterChipTextActive]}>
                  Mis Comunidades ({userCommunities.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, activeFilter === 'public' && styles.filterChipActive]}
                onPress={() => applyFilter('public')}
              >
                <Text style={[styles.filterChipText, activeFilter === 'public' && styles.filterChipTextActive]}>
                  Públicas ({publicCommunities.length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Botón de Añadir Nueva Comunidad */}
        <View style={styles.addSection}>
          <TouchableOpacity style={styles.addButton} onPress={handleAddCommunity}>
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.addButtonText}>Crear Nueva Comunidad</Text>
          </TouchableOpacity>
        </View>


        {/* Skeleton Screens durante carga */}
        {isLoading && (
          <View style={styles.communitiesSection}>
            <Text style={styles.sectionTitle}>Cargando comunidades...</Text>
            <CommunityCardSkeleton />
            <CommunityCardSkeleton />
            <CommunityCardSkeleton />
          </View>
        )}

        {/* Resultados de Búsqueda Inteligente */}
        {showSearchResults && (
          <View style={styles.communitiesSection}>
            <View style={styles.searchResultsHeader}>
              <Text style={styles.sectionTitle}>
                Resultados de Búsqueda {isSearching && '🔍'}
              </Text>
              {isSearching && (
                <ActivityIndicator size="small" color="#59C6C0" />
              )}
            </View>
            
            {(!Array.isArray(searchResults) || searchResults.length === 0) && !isSearching ? (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search" size={48} color="#CCC" />
                <Text style={styles.noResultsTitle}>No se encontraron comunidades</Text>
                <Text style={styles.noResultsText}>
                  Intenta con términos como "maternidad", "bebés" o "lactancia"
                </Text>
                <Text style={styles.noResultsSubtext}>
                  Búsqueda: "{searchQuery}"
                </Text>
              </View>
            ) : (
              Array.isArray(searchResults) && searchResults.map((community) => (
                <TouchableOpacity
                  key={community.id || Math.random().toString()}
                  style={[styles.communityCard, styles.searchResultCard]}
                  onPress={() => handleJoinCommunity(community)}
                >
                  <View style={styles.communityHeader}>
                    <CommunityIcon community={community} />
                    <View style={styles.communityInfo}>
                      <Text style={styles.communityName}>{community.name || 'Sin nombre'}</Text>
                      <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
                      <Text numberOfLines={2} style={styles.communityDescription}>
                        {community.description || 'Sin descripción'}
                      </Text>
                    </View>
                    <View style={styles.communityStats}>
                      <Ionicons name="people" size={16} color="#666" />
                      <Text style={styles.memberCount}>{community.memberCount || 0}</Text>
                      {!community.isPublic && (
                        <Ionicons name="lock-closed" size={16} color="#666" style={styles.privateIcon} />
                      )}
                    </View>
                  </View>
                  <Text style={styles.communityDescription}>
                    {community.description || 'Sin descripción disponible'}
                  </Text>
                  <CommunityActionButton community={community} />
                </TouchableOpacity>
              )) || null
            )}
          </View>
        )}

        {/* Comunidades Filtradas */}
        {!showSearchResults && activeFilter !== 'all' && filteredCommunities.length > 0 && (
          <View style={styles.communitiesSection}>
            <Text style={styles.sectionTitle}>
              {activeFilter === 'my' ? 'Mis Comunidades' : 'Comunidades Públicas'}
            </Text>
            {filteredCommunities.map((community) => (
              <TouchableOpacity
                key={community.id || Math.random().toString()}
                style={styles.communityCard}
                onPress={() => handleJoinCommunity(community)}
              >
                <View style={styles.communityHeader}>
                  <CommunityIcon community={community} />
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityName}>{community.name || 'Sin nombre'}</Text>
                    <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
                  </View>
                  <View style={styles.communityStats}>
                    <Ionicons name="people" size={16} color="#666" />
                    <Text style={styles.memberCount}>{community.memberCount || 0}</Text>
                    {!community.isPublic && (
                      <Ionicons name="lock-closed" size={16} color="#666" style={styles.privateIcon} />
                    )}
                  </View>
                </View>
                <Text style={styles.communityDescription}>
                  {community.description || 'Sin descripción disponible'}
                </Text>
                
                {/* Estadísticas de actividad */}
                <View style={styles.activityStats}>
                  {community.postCount !== undefined && (
                    <View style={styles.activityItem}>
                      <Ionicons name="chatbubbles" size={14} color="#59C6C0" />
                      <Text style={styles.activityText}>{community.postCount} posts</Text>
                    </View>
                  )}
                  {community.lastActivity && (
                    <View style={styles.activityItem}>
                      <Ionicons name="time" size={14} color="#999" />
                      <Text style={styles.activityText}>{getTimeAgo(community.lastActivity)}</Text>
                    </View>
                  )}
                  {community.activeMembers !== undefined && community.activeMembers > 0 && (
                    <View style={styles.activityItem}>
                      <Ionicons name="pulse" size={14} color="#32CD32" />
                      <Text style={styles.activityText}>{community.activeMembers} activos</Text>
                    </View>
                  )}
                </View>
                
                <CommunityActionButton community={community} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Mis Comunidades (solo cuando filtro está en "all") */}
        {!showSearchResults && activeFilter === 'all' && userCommunities.length > 0 && (
          <View style={styles.communitiesSection}>
            <Text style={styles.sectionTitle}>Mis Comunidades</Text>
            {userCommunities.map((community) => (
              <TouchableOpacity
                key={community.id || Math.random().toString()}
                style={[styles.communityCard, styles.myCommunityCard]}
                onPress={() => handleJoinCommunity(community)}
              >
                <View style={styles.communityHeader}>
                  <CommunityIcon community={community} />
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityName}>{community.name || 'Sin nombre'}</Text>
                    <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
                    <View style={styles.ownerBadge}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={styles.ownerText}>Mi Comunidad</Text>
                    </View>
                  </View>
                  <View style={styles.communityStats}>
                    <Ionicons name="people" size={16} color="#666" />
                    <Text style={styles.memberCount}>{community.memberCount || 0}</Text>
                    {!community.isPublic && (
                      <Ionicons name="lock-closed" size={16} color="#666" style={styles.privateIcon} />
                    )}
                    {isUserCommunity(community) && (
                      <View style={styles.memberBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#32CD32" />
                        <Text style={styles.memberBadgeText}>Miembro</Text>
                      </View>
                    )}
                    {!isUserCommunity(community) && !community.isPublic && pendingRequests.includes(community.id) && (
                      <View style={styles.pendingRequestBadge}>
                        <Ionicons name="time" size={16} color="#FFA500" />
                        <Text style={styles.pendingRequestBadgeText}>Pendiente</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.communityDescription}>{community.description || 'Sin descripción'}</Text>
                
                <CommunityActionButton community={community} />
                
                {/* Botón para ver solicitudes pendientes (solo para comunidades privadas del usuario) */}
                              {isUserCommunity(community) && !community.isPublic && (
                <TouchableOpacity
                  style={styles.requestsButton}
                  onPress={() => navigation.navigate('CommunityRequests', {
                    communityId: community.id,
                    communityName: community.name
                  })}
                >
                  <Ionicons name="mail" size={16} color="#59C6C0" />
                  <Text style={styles.requestsButtonText}>Ver Solicitudes</Text>
                </TouchableOpacity>
              )}
              

              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Comunidades Públicas (solo cuando filtro está en "all") */}
        {!showSearchResults && activeFilter === 'all' && (
        <View style={styles.communitiesSection}>
          <Text style={styles.sectionTitle}>
            {userCommunities.length > 0 ? 'Otras Comunidades' : 'Comunidades Disponibles'}
          </Text>
          
          {publicCommunities.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color="#999" />
              <Text style={styles.emptyStateText}>No hay comunidades públicas disponibles</Text>
              <Text style={styles.emptyStateSubtext}>¡Sé el primero en crear una!</Text>
            </View>
          ) : (
            publicCommunities.map((community) => (
              <TouchableOpacity
                key={community.id || Math.random().toString()}
                style={styles.communityCard}
                onPress={() => handleJoinCommunity(community)}
              >
                <View style={styles.communityHeader}>
                  <CommunityIcon community={community} />
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityName}>{community.name || 'Sin nombre'}</Text>
                    <Text style={styles.communityCategory}>{community.category || 'General'}</Text>
                  </View>
                  <View style={styles.communityStats}>
                    <Ionicons name="people" size={16} color="#666" />
                    <Text style={styles.memberCount}>{community.memberCount || 0}</Text>
                    {!community.isPublic && (
                      <Ionicons name="lock-closed" size={16} color="#666" style={styles.privateIcon} />
                    )}
                    {isUserCommunity(community) && (
                      <View style={styles.memberBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#32CD32" />
                        <Text style={styles.memberBadgeText}>Miembro</Text>
                      </View>
                    )}
                    {!isUserCommunity(community) && !community.isPublic && pendingRequests.includes(community.id) && (
                      <View style={styles.pendingRequestBadge}>
                        <Ionicons name="time" size={16} color="#FFA500" />
                        <Text style={styles.pendingRequestBadgeText}>Pendiente</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <Text style={styles.communityDescription}>{community.description || 'Sin descripción'}</Text>
                
                <CommunityActionButton community={community} />
              </TouchableOpacity>
            ))
          )}
        </View>
        )}
      </ScrollView>

      {/* Modal de Creación de Comunidad */}
      <Modal
        visible={isCreateModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
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
                        ? 'Solo miembros invitados pueden unirse' 
                        : 'Cualquier persona puede unirse'
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

  // Sección de búsqueda
  searchSection: {
    padding: 20,
    paddingTop: 60,
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
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
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
    backgroundColor: '#59C6C0',
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
    padding: 20,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 20,
  },

  // Tarjeta de comunidad
  communityCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#887CBC',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  communityImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  communityCategory: {
    fontSize: 13,
    color: '#7F8C8D',
    textTransform: 'capitalize',
    fontWeight: '500',
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 6,
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
    fontSize: 15,
    color: '#7F8C8D',
    lineHeight: 22,
    marginBottom: 16,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#887CBC',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
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
    fontSize: 15,
    fontWeight: '700',
    marginRight: 8,
  },

  // Estado vacío
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Estilos del Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#887CBC',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#59C6C0',
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
    borderWidth: 2,
    borderColor: '#59C6C0',
    backgroundColor: '#F0FFFE',
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
    marginLeft: 10,
    backgroundColor: '#F0FFF0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#32CD32',
  },
  memberBadgeText: {
    fontSize: 10,
    color: '#32CD32',
    fontWeight: '600',
    marginLeft: 4,
  },
  pendingRequestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  pendingRequestBadgeText: {
    fontSize: 10,
    color: '#FFA500',
    fontWeight: '600',
    marginLeft: 4,
  },
  myCommunityButton: {
    backgroundColor: '#59C6C0',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#59C6C0',
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
