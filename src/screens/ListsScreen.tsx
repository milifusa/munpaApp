import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { listsService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import { List } from '../types/lists';

const { width } = Dimensions.get('window');

// Función para calcular estadísticas de lista correctamente
const calculateListStats = (list: any) => {
  const items = list.items || [];
  
  // Calcular items completados considerando ambos campos
  const completedItems = items.filter((item: any) => 
    item.isCompleted || item.completed || false
  ).length;
  
  // Calcular estadísticas
  const itemsCount = items.length;
  const completedItemsCount = completedItems;
  const starsCount = list.starsCount || 0;
  const commentsCount = list.commentsCount || 0;
  
  console.log(`📊 [CALCULATE STATS] Lista "${list.title}":`, {
    totalItems: itemsCount,
    completedItems: completedItemsCount,
    rawBackendCompletedCount: list.completedItemsCount,
    rawBackendItemsCount: list.itemsCount
  });
  
  return {
    ...list,
    itemsCount,
    completedItemsCount,
    starsCount,
    commentsCount
  };
};

// Función helper para obtener el ícono de estado según el progreso
const getProgressIcon = (completedItemsCount: number, itemsCount: number) => {
  if (itemsCount === 0) {
    return { name: 'list-outline', color: '#CCC' }; // Lista vacía
  } else if (completedItemsCount === itemsCount) {
    return { name: 'checkmark-circle', color: '#32CD32' }; // ✅ Todos completados
  } else if (completedItemsCount > 0) {
    return { name: 'ellipse-outline', color: '#FFC107' }; // 🟡 Parcialmente completado
  } else {
    return { name: 'ellipse-outline', color: '#CCC' }; // ⚪ Ninguno completado
  }
};

const ListsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated } = useAuth();
  
  // Estados principales
  const [myLists, setMyLists] = useState<List[]>([]);
  const [publicLists, setPublicLists] = useState<List[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'my' | 'public'>('my');
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  // Estados del modal de crear lista
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newList, setNewList] = useState({
    title: '',
    description: '',
    imageUrl: null as string | null,
    isPublic: false,
  });

  // Cargar listas
  const loadMyLists = async () => {
    if (!isAuthenticated) return;
    
    try {
      console.log('📋 [LISTS SCREEN] Cargando mis listas...');
      const response = await listsService.getUserLists();
      
      // Asegurar que isOwner esté correctamente calculado y estadísticas
      const listsWithOwnership = (response.data || []).map((list: any) => {
        const listWithStats = calculateListStats(list);
        return {
          ...listWithStats,
          isOwner: list.isOwner !== undefined 
            ? list.isOwner 
            : (user?.id === list.creatorId)
        };
      });
      
      setMyLists(listsWithOwnership);
      console.log('✅ [LISTS SCREEN] Mis listas cargadas:', listsWithOwnership.length);
      console.log('📊 [LISTS SCREEN] Datos de ejemplo de lista:', listsWithOwnership[0] ? {
        id: listsWithOwnership[0].id,
        title: listsWithOwnership[0].title,
        itemsCount: listsWithOwnership[0].itemsCount,
        completedItemsCount: listsWithOwnership[0].completedItemsCount,
        starsCount: listsWithOwnership[0].starsCount,
        commentsCount: listsWithOwnership[0].commentsCount,
      } : 'No hay listas');
    } catch (error) {
      console.error('❌ [LISTS SCREEN] Error cargando mis listas:', error);
      Alert.alert('Error', 'No se pudieron cargar tus listas');
    }
  };

  const loadPublicLists = async () => {
    try {
      console.log('📋 [LISTS SCREEN] Cargando listas públicas...');
      const response = await listsService.getPublicLists({ limit: 20, sortBy: 'stars' });
      
      // Asegurar que isOwner esté correctamente calculado y estadísticas para listas públicas
      const listsWithOwnership = (response.data || []).map((list: any) => {
        const listWithStats = calculateListStats(list);
        return {
          ...listWithStats,
          isOwner: list.isOwner !== undefined 
            ? list.isOwner 
            : (user?.id === list.creatorId)
        };
      });
      
      setPublicLists(listsWithOwnership);
      console.log('✅ [LISTS SCREEN] Listas públicas cargadas:', listsWithOwnership.length);
      console.log('📊 [LISTS SCREEN] Datos de ejemplo de lista pública:', listsWithOwnership[0] ? {
        id: listsWithOwnership[0].id,
        title: listsWithOwnership[0].title,
        itemsCount: listsWithOwnership[0].itemsCount,
        completedItemsCount: listsWithOwnership[0].completedItemsCount,
        starsCount: listsWithOwnership[0].starsCount,
        commentsCount: listsWithOwnership[0].commentsCount,
      } : 'No hay listas públicas');
    } catch (error) {
      console.error('❌ [LISTS SCREEN] Error cargando listas públicas:', error);
      Alert.alert('Error', 'No se pudieron cargar las listas públicas');
    }
  };

  const loadAllLists = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadMyLists(), loadPublicLists()]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllLists();
    } finally {
      setRefreshing(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadAllLists();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated) {
        loadMyLists();
      }
    }, [isAuthenticated])
  );

  // Limpiar estado al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setMyLists([]);
      setPublicLists([]);
    }
  }, [isAuthenticated]);

  // Cambiar automáticamente a tab de públicas si no hay listas propias (solo en primera carga)
  useEffect(() => {
    if (!isLoading && !hasAutoSwitched && myLists.length === 0 && publicLists.length > 0 && activeTab === 'my') {
      console.log('🔄 [LISTS SCREEN] No hay listas propias, cambiando a tab de públicas');
      setActiveTab('public');
      setHasAutoSwitched(true);
    }
  }, [myLists, publicLists, isLoading, activeTab, hasAutoSwitched]);

  // Funciones del modal
  const handleCreateList = async () => {
    if (!newList.title.trim()) {
      Alert.alert('Error', 'El título de la lista es obligatorio');
      return;
    }

    setIsCreating(true);
    try {
      console.log('📋 [LISTS SCREEN] Creando nueva lista:', newList);
      
      let imageUrl = null;
      
      // Si hay una imagen seleccionada, subirla primero
      if (newList.imageUrl) {
        try {
          console.log('🖼️ [LISTS SCREEN] Subiendo imagen de lista...');
          const uploadResult = await imageUploadService.uploadCommunityImage(newList.imageUrl);
          imageUrl = uploadResult;
          console.log('✅ [LISTS SCREEN] Imagen subida exitosamente:', imageUrl);
        } catch (uploadError) {
          console.error('❌ [LISTS SCREEN] Error subiendo imagen:', uploadError);
          Alert.alert('Advertencia', 'No se pudo subir la imagen, pero la lista se creará sin imagen');
        }
      }
      
      const listData = {
        title: newList.title.trim(),
        description: newList.description.trim() || undefined,
        imageUrl: imageUrl || undefined,
        isPublic: newList.isPublic,
      };

      const result = await listsService.createList(listData);
      console.log('✅ [LISTS SCREEN] Lista creada exitosamente:', result);

      Alert.alert(
        'Éxito',
        'Lista creada exitosamente',
        [
          {
            text: 'Ver Lista',
            onPress: () => {
              resetCreateForm();
              setHasAutoSwitched(false); // Resetear flag al crear lista
              setActiveTab('my'); // Cambiar a mis listas
              loadMyLists(); // Recargar mis listas
              // Navegar a la lista creada
              navigation.navigate('ListDetail', {
                listId: result.data.id,
                listTitle: result.data.title,
              });
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('❌ [LISTS SCREEN] Error creando lista:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear la lista',
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewList({
      title: '',
      description: '',
      imageUrl: null,
      isPublic: false,
    });
    setIsCreateModalVisible(false);
  };

  // Funciones para selección de imagen
  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ [LISTS SCREEN] Imagen seleccionada:', result.assets[0].uri);
        setNewList(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('❌ [LISTS SCREEN] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📸 [LISTS SCREEN] Foto tomada:', result.assets[0].uri);
        setNewList(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('❌ [LISTS SCREEN] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleRemoveImage = () => {
    setNewList(prev => ({ ...prev, imageUrl: null }));
  };

  const handleListPress = (list: List) => {
    console.log('📋 [LISTS SCREEN] Navegando a lista:', list.id, list.title);
    navigation.navigate('ListDetail', {
      listId: list.id,
      listTitle: list.title,
    });
  };

  const handleCopyList = async (list: List) => {
    try {
      console.log('📋 [LISTS SCREEN] Copiando lista pública:', list.id);
      const result = await listsService.copyList(list.id);
      
      Alert.alert(
        'Lista Copiada',
        `"${result.data.title}" ha sido copiada a tus listas privadas`,
        [
          {
            text: 'Ver Lista',
            onPress: () => {
              setHasAutoSwitched(false); // Resetear flag al copiar lista
              setActiveTab('my'); // Cambiar a mis listas
              loadMyLists();
              navigation.navigate('ListDetail', {
                listId: result.data.listId,
                listTitle: result.data.title,
              });
            }
          },
          { 
            text: 'OK',
            onPress: () => {
              setHasAutoSwitched(false); // Resetear flag
              setActiveTab('my'); // Cambiar a mis listas
              loadMyLists();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('❌ [LISTS SCREEN] Error copiando lista:', error);
      Alert.alert('Error', 'No se pudo copiar la lista');
    }
  };

  const handleToggleStar = async (listId: string) => {
    try {
      const result = await listsService.toggleStar(listId);
      
      // Actualizar el estado local
      setPublicLists(prev => prev.map(list => 
        list.id === listId 
          ? { 
              ...list, 
              starsCount: result.data.starsCount,
              isStarred: result.data.isStarred 
            }
          : list
      ));
    } catch (error: any) {
      console.error('❌ [LISTS SCREEN] Error dando estrella:', error);
      Alert.alert('Error', 'No se pudo dar estrella a la lista');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59C6C0" />
        <Text style={styles.loadingText}>Cargando listas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con tabs */}
      <LinearGradient
        colors={['#887CBC', '#59C6C0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="list" size={28} color="white" />
              <Text style={styles.headerTitle}>Mis Listas</Text>
            </View>
            {/* Botón crear lista */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setIsCreateModalVisible(true)}
            >
              <Ionicons name="add-circle" size={32} color="white" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my' && styles.activeTab]}
              onPress={() => setActiveTab('my')}
            >
              <Ionicons 
                name={activeTab === 'my' ? "folder" : "folder-outline"} 
                size={18} 
                color={activeTab === 'my' ? "white" : "rgba(255,255,255,0.7)"} 
              />
              <Text style={[styles.tabText, activeTab === 'my' && styles.activeTabText]}>
                Mis Listas
              </Text>
              <View style={[styles.tabBadge, activeTab === 'my' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'my' && styles.activeTabBadgeText]}>
                  {myLists.length}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'public' && styles.activeTab]}
              onPress={() => setActiveTab('public')}
            >
              <Ionicons 
                name={activeTab === 'public' ? "globe" : "globe-outline"} 
                size={18} 
                color={activeTab === 'public' ? "white" : "rgba(255,255,255,0.7)"} 
              />
              <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>
                Públicas
              </Text>
              <View style={[styles.tabBadge, activeTab === 'public' && styles.activeTabBadge]}>
                <Text style={[styles.tabBadgeText, activeTab === 'public' && styles.activeTabBadgeText]}>
                  {publicLists.length}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Contenido */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'my' ? (
          <MyListsTab 
            lists={myLists}
            onListPress={handleListPress}
            onRefresh={loadMyLists}
          />
        ) : (
          <PublicListsTab
            lists={publicLists}
            onListPress={handleListPress}
            onCopyList={handleCopyList}
            onToggleStar={handleToggleStar}
            onRefresh={loadPublicLists}
          />
        )}
      </ScrollView>

      {/* Modal de crear lista */}
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
            <TouchableOpacity onPress={resetCreateForm} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Crear Nueva Lista</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Formulario */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Título de la Lista *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Lista de Compras para el Bebé"
                value={newList.title}
                onChangeText={(text) => setNewList(prev => ({ ...prev, title: text }))}
                maxLength={100}
              />

              <Text style={styles.inputLabel}>Descripción (Opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Describe el propósito de tu lista..."
                value={newList.description}
                onChangeText={(text) => setNewList(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {/* Sección de imagen */}
              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Imagen de la Lista (Opcional)</Text>
                {newList.imageUrl ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: newList.imageUrl }} style={styles.selectedImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageOptionsContainer}>
                    <TouchableOpacity style={styles.imageOption} onPress={handlePickImage}>
                      <Ionicons name="images" size={24} color="#59C6C0" />
                      <Text style={styles.imageOptionText}>Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageOption} onPress={handleTakePhoto}>
                      <Ionicons name="camera" size={24} color="#59C6C0" />
                      <Text style={styles.imageOptionText}>Cámara</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Configuración de Privacidad */}
              <View style={styles.privacySection}>
                <Text style={styles.inputLabel}>Configuración de Privacidad</Text>
                <TouchableOpacity
                  style={styles.privacyOption}
                  onPress={() => setNewList(prev => ({ ...prev, isPublic: !prev.isPublic }))}
                >
                  <View style={styles.radioButton}>
                    {newList.isPublic && <View style={styles.radioButtonSelected} />}
                  </View>
                  <View style={styles.privacyInfo}>
                    <Text style={styles.privacyTitle}>
                      {newList.isPublic ? 'Lista Pública' : 'Lista Privada'}
                    </Text>
                    <Text style={styles.privacyDescription}>
                      {newList.isPublic 
                        ? 'Otros usuarios pueden ver, copiar y comentar' 
                        : 'Solo tú puedes ver y editar esta lista'
                      }
                    </Text>
                  </View>
                  <Ionicons 
                    name={newList.isPublic ? 'globe' : 'lock-closed'} 
                    size={20} 
                    color={newList.isPublic ? '#32CD32' : '#FF6B6B'} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={resetCreateForm}
              disabled={isCreating}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, isCreating && styles.saveButtonDisabled]} 
              onPress={handleCreateList}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Crear Lista</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

// Componente para el tab de "Mis Listas"
const MyListsTab = ({ lists, onListPress, onRefresh }: {
  lists: List[];
  onListPress: (list: List) => void;
  onRefresh: () => void;
}) => {
  if (lists.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="list-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>No tienes listas aún</Text>
        <Text style={styles.emptySubtitle}>
          Crea tu primera lista para organizar tus tareas
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
          <Text style={styles.emptyButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {lists.map((list) => {
        const progress = list.itemsCount ? (list.completedItemsCount || 0) / list.itemsCount : 0;
        const progressPercent = Math.round(progress * 100);
        
        return (
          <TouchableOpacity
            key={list.id}
            style={styles.listCard}
            onPress={() => onListPress(list)}
          >
            {/* Progress bar superior */}
            {list.itemsCount > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
              </View>
            )}
            
            <View style={styles.cardContent}>
              <View style={styles.listHeader}>
                <View style={styles.listImageContainer}>
                  {list.imageUrl ? (
                    <Image source={{ uri: list.imageUrl }} style={styles.listImage} />
                  ) : (
                    <LinearGradient
                      colors={list.isPublic ? ['#4CAF50', '#8BC34A'] : ['#FF6B6B', '#FF8E8E']}
                      style={styles.listIcon}
                    >
                      <Ionicons 
                        name={list.isPublic ? "globe" : "lock-closed"} 
                        size={24} 
                        color="white" 
                      />
                    </LinearGradient>
                  )}
                </View>
                <View style={styles.listInfo}>
                  <View style={styles.titleRow}>
                    <Text style={styles.listTitle} numberOfLines={1}>
                      {list.title.charAt(0).toUpperCase() + list.title.slice(1).toLowerCase()}
                    </Text>
                    {progressPercent === 100 && list.itemsCount > 0 && (
                      <View style={styles.completedBadge}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                      </View>
                    )}
                  </View>
                  {list.description && (
                    <Text style={styles.listDescription} numberOfLines={2}>
                      {list.description}
                    </Text>
                  )}
                  <View style={styles.listMetadata}>
                    <View style={[styles.privacyBadge, list.isPublic ? styles.publicBadge : styles.privateBadge]}>
                      <Ionicons 
                        name={list.isPublic ? "globe" : "lock-closed"} 
                        size={10} 
                        color="white" 
                      />
                      <Text style={styles.privacyText}>
                        {list.isPublic ? "Pública" : "Privada"}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color="#CCC" />
              </View>
              
              <View style={styles.listStats}>
                <View style={styles.stat}>
                  <View style={styles.statIconContainer}>
                    {(() => {
                      const icon = getProgressIcon(list.completedItemsCount || 0, list.itemsCount || 0);
                      return <Ionicons name={icon.name as any} size={18} color={icon.color} />;
                    })()}
                  </View>
                  <Text style={styles.statText}>
                    {list.completedItemsCount || 0}/{list.itemsCount || 0}
                  </Text>
                  {list.itemsCount > 0 && (
                    <Text style={styles.statPercent}>({progressPercent}%)</Text>
                  )}
                </View>
                {list.isPublic && (
                  <View style={styles.stat}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="star" size={18} color="#FFD700" />
                    </View>
                    <Text style={styles.statText}>{list.starsCount || 0}</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Componente para el tab de "Listas Públicas"
const PublicListsTab = ({ lists, onListPress, onCopyList, onToggleStar, onRefresh }: {
  lists: List[];
  onListPress: (list: List) => void;
  onCopyList: (list: List) => void;
  onToggleStar: (listId: string) => void;
  onRefresh: () => void;
}) => {
  if (lists.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="globe-outline" size={64} color="#CCC" />
        <Text style={styles.emptyTitle}>No hay listas públicas</Text>
        <Text style={styles.emptySubtitle}>
          Sé el primero en compartir una lista con la comunidad
        </Text>
        <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
          <Text style={styles.emptyButtonText}>Actualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.tabContent}>
      {lists.map((list) => {
        const progress = list.itemsCount ? (list.completedItemsCount || 0) / list.itemsCount : 0;
        const progressPercent = Math.round(progress * 100);
        
        return (
          <View key={list.id} style={styles.publicListCard}>
            {/* Progress bar superior */}
            {list.itemsCount > 0 && (
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progressPercent}%`, backgroundColor: '#4CAF50' }]} />
              </View>
            )}
            
            <TouchableOpacity
              style={styles.listCardContent}
              onPress={() => onListPress(list)}
            >
              <View style={styles.cardContent}>
                <View style={styles.listHeader}>
                  <View style={styles.listImageContainer}>
                    {list.imageUrl ? (
                      <Image source={{ uri: list.imageUrl }} style={styles.listImage} />
                    ) : (
                      <LinearGradient
                        colors={['#4CAF50', '#8BC34A']}
                        style={styles.listIcon}
                      >
                        <Ionicons name="globe" size={24} color="white" />
                      </LinearGradient>
                    )}
                  </View>
                  <View style={styles.listInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.listTitle} numberOfLines={1}>
                        {list.title.charAt(0).toUpperCase() + list.title.slice(1).toLowerCase()}
                      </Text>
                      {progressPercent === 100 && list.itemsCount > 0 && (
                        <View style={styles.completedBadge}>
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.listAuthor}>
                      <Ionicons name="person" size={12} color="#59C6C0" /> {list.creatorName}
                    </Text>
                    {list.description && (
                      <Text style={styles.listDescription} numberOfLines={2}>
                        {list.description}
                      </Text>
                    )}
                    <View style={styles.listMetadata}>
                      <View style={[styles.privacyBadge, styles.publicBadge]}>
                        <Ionicons name="globe" size={10} color="white" />
                        <Text style={styles.privacyText}>Pública</Text>
                      </View>
                    </View>
                  </View>
                </View>
                
                <View style={styles.listStats}>
                  <View style={styles.stat}>
                    <View style={styles.statIconContainer}>
                      {(() => {
                        const icon = getProgressIcon(list.completedItemsCount || 0, list.itemsCount || 0);
                        return <Ionicons name={icon.name as any} size={18} color={icon.color} />;
                      })()}
                    </View>
                    <Text style={styles.statText}>
                      {list.completedItemsCount || 0}/{list.itemsCount || 0}
                    </Text>
                    {list.itemsCount > 0 && (
                      <Text style={styles.statPercent}>({progressPercent}%)</Text>
                    )}
                  </View>
                  <View style={styles.stat}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="star" size={18} color="#FFD700" />
                    </View>
                    <Text style={styles.statText}>{list.starsCount || 0}</Text>
                  </View>
                  <View style={styles.stat}>
                    <View style={styles.statIconContainer}>
                      <Ionicons name="chatbubble" size={18} color="#59C6C0" />
                    </View>
                    <Text style={styles.statText}>{list.commentsCount || 0}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            {/* Botones de acción */}
            <View style={styles.publicListActions}>
              <TouchableOpacity
                style={[styles.actionButton, list.isStarred && styles.starredButton]}
                onPress={() => onToggleStar(list.id)}
              >
                <Ionicons 
                  name={list.isStarred ? "star" : "star-outline"} 
                  size={20} 
                  color={list.isStarred ? "#FFD700" : "#999"} 
                />
                <Text style={[styles.actionButtonText, list.isStarred && styles.starredText]}>
                  {list.isStarred ? 'Destacada' : 'Destacar'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.addListButton}
                onPress={() => onCopyList(list)}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.addListButtonText}>Agregar Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
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
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },

  // Header con tabs
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    gap: 8,
  },
  activeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: '#887CBC',
  },
  tabBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  activeTabBadge: {
    backgroundColor: '#887CBC',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  activeTabBadgeText: {
    color: 'white',
  },
  createButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },

  // Contenido de tabs
  tabContent: {
    padding: 20,
    backgroundColor: '#F5F7FA',
  },
  
  // Lista cards
  listCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 20,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#887CBC',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  publicListCard: {
    backgroundColor: 'white',
    borderRadius: 18,
    marginBottom: 20,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#E8ECEF',
    shadowColor: '#59C6C0',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#F0F0F0',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#59C6C0',
  },
  cardContent: {
    padding: 20,
    paddingBottom: 18,
  },
  listCardContent: {
    padding: 0,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  listIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  publicListIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  listInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
  },
  completedBadge: {
    marginLeft: 8,
  },
  listAuthor: {
    fontSize: 12,
    color: '#59C6C0',
    fontWeight: '500',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },

  // Contenedor de imagen de lista
  listImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  listImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },

  // Metadata de la lista
  listMetadata: {
    marginTop: 8,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  publicBadge: {
    backgroundColor: '#32CD32',
  },
  privateBadge: {
    backgroundColor: '#FF6B6B',
  },
  privacyText: {
    fontSize: 10,
    fontWeight: '500',
    color: 'white',
    marginLeft: 4,
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  statIconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '600',
  },
  statPercent: {
    fontSize: 11,
    color: '#59C6C0',
    fontWeight: '600',
  },

  // Listas públicas - acciones
  publicListActions: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  starredButton: {
    backgroundColor: '#FFF8DC',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  starredText: {
    color: '#FFB800',
  },
  addListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#59C6C0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#59C6C0',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    gap: 8,
  },
  addListButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Estados vacíos
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#59C6C0',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#59C6C0',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal estilos
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
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Formulario
  formSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Sección de imagen
  imageSection: {
    marginTop: 20,
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 10,
  },
  selectedImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  imageOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  imageOption: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 0.45,
  },
  imageOptionText: {
    fontSize: 14,
    color: '#59C6C0',
    marginTop: 8,
    fontWeight: '500',
  },

  // Sección de privacidad
  privacySection: {
    marginTop: 20,
  },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#59C6C0',
  },
  privacyInfo: {
    flex: 1,
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
    lineHeight: 20,
  },

  // Acciones del modal
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#59C6C0',
    borderRadius: 12,
    marginLeft: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0A0A0',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
});

export default ListsScreen;
