import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
  SafeAreaView,
  RefreshControl,
  Image,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { listsService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import { List, ListItem } from '../types/lists';

// Función helper para parsear timestamps de Firestore
const parseFirestoreTimestamp = (timestamp: any): Date => {
  if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
    return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
  }
  return new Date(timestamp);
};

const formatDate = (timestamp: any): string => {
  try {
    const date = parseFirestoreTimestamp(timestamp);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

const ListDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  
  // Parámetros de navegación
  const { listId, listTitle } = route.params as { listId: string; listTitle: string };

  // Función para manejar el botón de atrás
  const handleGoBack = () => {
    // Intentar hacer goBack primero
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Si no puede hacer goBack, navegar a RecommendationsMain
      console.log('⚠️ [LIST DETAIL] No se puede hacer goBack, navegando a RecommendationsMain');
      navigation.navigate('RecommendationsMain');
    }
  };
  
  // Estados principales
  const [list, setList] = useState<List | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());
  
  // Estados para agregar item
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItemData, setNewItemData] = useState({
    text: '',
    imageUrl: null as string | null,
    priority: 'medium' as 'low' | 'medium' | 'high',
    details: '',
    brand: '',
    store: '',
    approximatePrice: '',
  });

  // Cargar detalles de la lista
  const loadListDetails = async () => {
    try {
      console.log('📋 [LIST DETAIL] Cargando detalles de lista:', listId);
      const response = await listsService.getListDetails(listId);
      console.log('📋 [LIST DETAIL] Respuesta completa del backend:', JSON.stringify(response, null, 2));
      console.log('📋 [LIST DETAIL] Datos de la lista:', JSON.stringify(response.data, null, 2));
      
      // Debug de items y sus campos de comentarios/calificaciones
      if (response.data.items) {
        response.data.items.forEach((item: any, index: number) => {
          console.log(`📋 [LIST DETAIL] Item ${index + 1} (${item.text}):`, {
            commentsCount: item.commentsCount,
            commentCount: item.commentCount,
            averageRating: item.averageRating,
            totalRatings: item.totalRatings,
            ratingsCount: item.ratingsCount,
            userRating: item.userRating
          });
        });
      }
      console.log('📋 [LIST DETAIL] ¿Es propietario?:', response.data.isOwner);
      console.log('📋 [LIST DETAIL] ¿Es pública?:', response.data.isPublic);
      console.log('📋 [LIST DETAIL] Usuario actual autenticado?:', isAuthenticated);
      console.log('📋 [LIST DETAIL] Creator ID:', response.data.creatorId);
      console.log('📋 [LIST DETAIL] Usuario actual ID:', user?.id || 'NO DISPONIBLE');
      
      // Calcular estadísticas localmente para asegurar consistencia
      const items = response.data.items || [];
      const completedItems = items.filter((item: any) => item.isCompleted || item.completed).length;
      
      // Si el backend no envía isOwner, calcularlo localmente
      const listData = {
        ...response.data,
        isOwner: response.data.isOwner !== undefined 
          ? response.data.isOwner 
          : (user?.id === response.data.creatorId),
        itemsCount: response.data.itemsCount || items.length,
        completedItemsCount: response.data.completedItemsCount !== undefined 
          ? response.data.completedItemsCount 
          : completedItems
      };
      
      console.log('📋 [LIST DETAIL] ¿Es propietario calculado?:', listData.isOwner);
      setList(listData);
      console.log('✅ [LIST DETAIL] Lista cargada:', response.data.title);
    } catch (error: any) {
      console.error('❌ [LIST DETAIL] Error cargando lista:', error);
      Alert.alert(
        'Error',
        'No se pudo cargar la lista',
        [
          { text: 'Reintentar', onPress: loadListDetails },
          { text: 'Volver', onPress: handleGoBack }
        ]
      );
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      await loadListDetails();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadListDetails();
    } finally {
      setRefreshing(false);
    }
  };

  // Efectos
  useEffect(() => {
    loadData();
  }, [listId]);

  // Recargar datos cuando se enfoque la pantalla (para actualizar comentarios)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [LIST DETAIL] Pantalla enfocada, recargando datos...');
      loadData();
    }, [listId])
  );

  // Limpiar estado al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setList(null);
    }
  }, [isAuthenticated]);

  // Funciones de items
  const handleToggleItem = async (itemId: string) => {
    if (!list || !list.isOwner) return; // Solo el propietario puede marcar/desmarcar items
    
    try {
      setTogglingItems(prev => new Set(prev).add(itemId));
      
      console.log('🔄 [LIST DETAIL] Alternando item:', itemId);
      const result = await listsService.toggleItem(listId, itemId);
      console.log('🔄 [LIST DETAIL] Resultado del toggle:', result.data);
      
      // Determinar el nuevo estado del item
      const newCompletedState = result.data.isCompleted !== undefined 
        ? result.data.isCompleted 
        : result.data.completed;
      
      console.log('🔄 [LIST DETAIL] Nuevo estado completado:', newCompletedState);
      
      // Actualizar el estado local
      setList(prev => {
        if (!prev) return prev;
        
        const currentItem = prev.items.find(item => item.id === itemId);
        const wasCompleted = currentItem ? (currentItem.isCompleted || currentItem.completed) : false;
        
        const updatedItems = prev.items.map(item => 
          item.id === itemId 
            ? { ...item, isCompleted: newCompletedState, completed: newCompletedState }
            : item
        );
        
        // Recalcular estadísticas localmente
        const completedCount = updatedItems.filter(item => item.isCompleted || item.completed).length;
        
        console.log('🔄 [LIST DETAIL] Estadísticas actualizadas:', {
          totalItems: updatedItems.length,
          completedItems: completedCount,
          wasCompleted,
          nowCompleted: newCompletedState
        });
        
        return {
          ...prev,
          items: updatedItems,
          itemsCount: updatedItems.length,
          completedItemsCount: completedCount
        };
      });
      
    } catch (error: any) {
      console.error('❌ [LIST DETAIL] Error alternando item:', error);
      Alert.alert('Error', 'No se pudo actualizar el item');
    } finally {
      setTogglingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItemData.text.trim()) {
      Alert.alert('Error', 'El texto del item es obligatorio');
      return;
    }

    setIsAddingItem(true);
    try {
      console.log('📋 [LIST DETAIL] Agregando item:', newItemData);
      
      let imageUrl = null;
      
      // Si hay una imagen seleccionada, subirla primero
      if (newItemData.imageUrl) {
        try {
          console.log('🖼️ [LIST DETAIL] Subiendo imagen del item...');
          const uploadResult = await imageUploadService.uploadCommunityImage(newItemData.imageUrl);
          imageUrl = uploadResult;
          console.log('✅ [LIST DETAIL] Imagen del item subida exitosamente:', imageUrl);
        } catch (uploadError) {
          console.error('❌ [LIST DETAIL] Error subiendo imagen del item:', uploadError);
          Alert.alert('Advertencia', 'No se pudo subir la imagen, pero el item se creará sin imagen');
        }
      }
      
      const itemData = {
        text: newItemData.text.trim(),
        imageUrl: imageUrl || undefined,
        priority: newItemData.priority,
        details: newItemData.details.trim() || undefined,
        brand: newItemData.brand.trim() || undefined,
        store: newItemData.store.trim() || undefined,
        approximatePrice: newItemData.approximatePrice ? parseFloat(newItemData.approximatePrice) : undefined,
      };
      
      const result = await listsService.addItem(listId, itemData);
      
      // Actualizar el estado local
      setList(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          items: [...prev.items, result.data],
          itemsCount: prev.itemsCount + 1
        };
      });
      
      // Limpiar formulario
      setNewItemData({
        text: '',
        imageUrl: null,
        priority: 'medium',
        details: '',
        brand: '',
        store: '',
        approximatePrice: '',
      });
      setNewItemText('');
      setShowAddItemModal(false);
      
      console.log('✅ [LIST DETAIL] Item agregado exitosamente');
      
    } catch (error: any) {
      console.error('❌ [LIST DETAIL] Error agregando item:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo agregar el item'
      );
    } finally {
      setIsAddingItem(false);
    }
  };

  // Funciones para selección de imagen de items
  const handlePickItemImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para acceder a la galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ [LIST DETAIL] Imagen de item seleccionada:', result.assets[0].uri);
        setNewItemData(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('❌ [LIST DETAIL] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const handleTakeItemPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📸 [LIST DETAIL] Foto de item tomada:', result.assets[0].uri);
        setNewItemData(prev => ({ ...prev, imageUrl: result.assets[0].uri }));
      }
    } catch (error) {
      console.error('❌ [LIST DETAIL] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const handleRemoveItemImage = () => {
    setNewItemData(prev => ({ ...prev, imageUrl: null }));
  };

  // Funciones para interacciones en items de listas públicas
  const handleCommentItem = (itemId: string) => {
    if (!list) return;
    
    const item = list.items.find(i => i.id === itemId);
    if (!item) return;
    
    console.log('💬 [LIST DETAIL] Navegando a comentarios del item:', itemId);
    console.log('💬 [LIST DETAIL] Contador actual de comentarios:', {
      commentsCount: item.commentsCount,
      commentCount: item.commentCount
    });
    
    // Navegar a la pantalla de comentarios
    (navigation as any).navigate('ItemComments', {
      listId,
      itemId,
      itemText: item.text
    });
  };

  const handleToggleItemStar = async (itemId: string) => {
    if (!list) return;
    
    const item = list.items.find(i => i.id === itemId);
    if (!item) return;
    
    // Crear opciones de calificación
    const ratingOptions = [
      { text: 'Cancelar', style: 'cancel' },
      { text: '⭐ 1 estrella', onPress: () => submitRating(itemId, 1) },
      { text: '⭐⭐ 2 estrellas', onPress: () => submitRating(itemId, 2) },
      { text: '⭐⭐⭐ 3 estrellas', onPress: () => submitRating(itemId, 3) },
      { text: '⭐⭐⭐⭐ 4 estrellas', onPress: () => submitRating(itemId, 4) },
      { text: '⭐⭐⭐⭐⭐ 5 estrellas', onPress: () => submitRating(itemId, 5) },
    ];
    
    // Si ya tiene calificación, agregar opción para quitar
    if ((item.userRating || 0) > 0) {
      ratingOptions.splice(1, 0, { 
        text: `❌ Quitar mi calificación (${item.userRating} estrella${item.userRating !== 1 ? 's' : ''})`, 
        onPress: () => submitRating(itemId, 0) 
      });
    }
    
    Alert.alert(
      'Calificar Item',
      `¿Cómo calificarías "${item.text}"?`,
      ratingOptions as any
    );
  };

  const submitRating = async (itemId: string, rating: number) => {
    try {
      console.log('⭐ [LIST DETAIL] Enviando calificación:', itemId, rating);
      const result = await listsService.rateItem(listId, itemId, rating);
      
      // Actualizar el estado local
      setList(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map(item => 
            item.id === itemId 
              ? { 
                  ...item, 
                  averageRating: result.data.averageRating,
                  totalRatings: result.data.totalRatings || result.data.ratingsCount,
                  ratingsCount: result.data.ratingsCount || result.data.totalRatings,
                  userRating: result.data.userRating
                }
              : item
          )
        };
      });
      
      console.log('✅ [LIST DETAIL] Calificación enviada exitosamente');
      
    } catch (error) {
      console.error('❌ [LIST DETAIL] Error enviando calificación:', error);
      Alert.alert('Error', 'No se pudo enviar la calificación');
    }
  };

  const handleDeleteItem = (itemId: string, itemText: string) => {
    Alert.alert(
      'Eliminar Item',
      `¿Estás seguro de que quieres eliminar "${itemText}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: () => deleteItem(itemId)
        }
      ]
    );
  };

  const deleteItem = async (itemId: string) => {
    try {
      await listsService.deleteItem(listId, itemId);
      
      // Actualizar el estado local
      setList(prev => {
        if (!prev) return prev;
        
        const deletedItem = prev.items.find(item => item.id === itemId);
        const wasCompleted = deletedItem?.isCompleted || false;
        
        return {
          ...prev,
          items: prev.items.filter(item => item.id !== itemId),
          itemsCount: prev.itemsCount - 1,
          completedItemsCount: wasCompleted 
            ? prev.completedItemsCount - 1 
            : prev.completedItemsCount
        };
      });
      
    } catch (error: any) {
      console.error('❌ [LIST DETAIL] Error eliminando item:', error);
      Alert.alert('Error', 'No se pudo eliminar el item');
    }
  };

  const handleToggleStar = async () => {
    if (!list || list.isOwner) return;
    
    try {
      const result = await listsService.toggleStar(listId);
      
      setList(prev => prev ? {
        ...prev,
        starsCount: result.data.starsCount,
        isStarred: result.data.isStarred
      } : prev);
      
    } catch (error: any) {
      console.error('❌ [LIST DETAIL] Error dando estrella:', error);
      Alert.alert('Error', 'No se pudo dar estrella a la lista');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59C6C0" />
        <Text style={styles.loadingText}>Cargando lista...</Text>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorTitle}>Lista no encontrada</Text>
        <Text style={styles.errorSubtitle}>
          La lista que buscas no existe o no tienes permisos para verla
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleGoBack}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const itemsCount = list.itemsCount || 0;
  const completedItemsCount = list.completedItemsCount || 0;
  const completionProgress = itemsCount > 0 ? completedItemsCount / itemsCount : 0;

  // Función para ordenar items: pendientes primero, completados al final
  const getSortedItems = (items: ListItem[]) => {
    const sortedItems = [...items].sort((a, b) => {
      const aCompleted = a.isCompleted || a.completed || false;
      const bCompleted = b.isCompleted || b.completed || false;
      
      // Si tienen el mismo estado de completado, mantener orden original
      if (aCompleted === bCompleted) {
        return 0;
      }
      
      // Items no completados van primero (false < true)
      return aCompleted ? 1 : -1;
    });
    
    console.log('📋 [LIST DETAIL] Items ordenados:', {
      total: items.length,
      pendientes: sortedItems.filter(item => !(item.isCompleted || item.completed)).length,
      completados: sortedItems.filter(item => item.isCompleted || item.completed).length
    });
    
    return sortedItems;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <View style={styles.contentWrapper}>
        {/* Header personalizado */}
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={[styles.header, { paddingTop: insets.top + 10 }]}
        >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={handleGoBack}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        
        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText} numberOfLines={1}>
            {list.title.charAt(0).toUpperCase() + list.title.slice(1).toLowerCase()}
          </Text>
          <Text style={styles.headerSubtitle}>
            {list.isPublic ? (
              <>
                <Ionicons name="globe" size={12} color="white" /> 
                {' '}Lista pública por {list.creatorName}
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={12} color="white" /> 
                {' '}Lista privada
              </>
            )}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {!list.isOwner && list.isPublic && (
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleToggleStar}
            >
              <Ionicons 
                name={list.isStarred ? "star" : "star-outline"} 
                size={20} 
                color={list.isStarred ? "#FFD700" : "white"} 
              />
            </TouchableOpacity>
          )}
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
        {/* Información de la lista */}
        <View style={styles.listInfo}>
          {list.description && (
            <Text style={styles.listDescription}>{list.description}</Text>
          )}
          
          {/* Estadísticas */}
          <View style={styles.statsContainer}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{itemsCount}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{completedItemsCount}</Text>
              <Text style={styles.statLabel}>Completados</Text>
            </View>
            {list.isPublic && (
              <>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{list.starsCount}</Text>
                  <Text style={styles.statLabel}>Estrellas</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{list.commentsCount}</Text>
                  <Text style={styles.statLabel}>Comentarios</Text>
                </View>
              </>
            )}
          </View>

          {/* Barra de progreso */}
          {list.itemsCount > 0 && (
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Progreso: {Math.round(completionProgress * 100)}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${completionProgress * 100}%` }
                  ]} 
                />
              </View>
            </View>
          )}
        </View>

        {/* Items de la lista */}
        <View style={styles.itemsContainer}>
          <View style={styles.itemsHeader}>
            <View style={styles.itemsHeaderInfo}>
              <Text style={styles.itemsTitle}>Items de la Lista</Text>
              {!list.isOwner && list.isPublic && (
                <Text style={styles.publicListHint}>
                  Puedes agregar items a esta lista pública
                </Text>
              )}
            </View>
            {(() => {
              const canAddItems = list.isOwner || (list.isPublic && isAuthenticated);
              console.log('🔐 [LIST DETAIL] Permisos agregar items:', {
                isOwner: list.isOwner,
                isPublic: list.isPublic,
                isAuthenticated,
                canAddItems
              });
              
              return canAddItems && (
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => setShowAddItemModal(true)}
                >
                  <Ionicons name="add" size={20} color="white" />
                </TouchableOpacity>
              );
            })()}
          </View>

          {list.items.length === 0 ? (
            <View style={styles.emptyItemsContainer}>
              <Ionicons name="list-outline" size={48} color="#CCC" />
              <Text style={styles.emptyItemsText}>No hay items en esta lista</Text>
              {(() => {
                const canAddFirstItem = list.isOwner || (list.isPublic && isAuthenticated);
                console.log('🔐 [LIST DETAIL] Permisos primer item:', {
                  isOwner: list.isOwner,
                  isPublic: list.isPublic,
                  isAuthenticated,
                  canAddFirstItem
                });
                
                return canAddFirstItem && (
                  <TouchableOpacity
                    style={styles.addFirstItemButton}
                    onPress={() => setShowAddItemModal(true)}
                  >
                    <Text style={styles.addFirstItemText}>Agregar primer item</Text>
                  </TouchableOpacity>
                );
              })()}
            </View>
          ) : (
            <View style={styles.itemsList}>
              {(() => {
                const sortedItems = getSortedItems(list.items);
                const pendingItems = sortedItems.filter(item => !(item.isCompleted || item.completed));
                const completedItems = sortedItems.filter(item => item.isCompleted || item.completed);
                
                return (
                  <>
                    {/* Items pendientes */}
                    {pendingItems.map((item) => (
                      <ListItemComponent
                        key={item.id}
                        item={item}
                        isOwner={list.isOwner || false}
                        isToggling={togglingItems.has(item.id)}
                        onToggle={() => handleToggleItem(item.id)}
                        onDelete={() => handleDeleteItem(item.id, item.text)}
                        isPublicList={list.isPublic}
                        onComment={(itemId) => handleCommentItem(itemId)}
                        onToggleStar={(itemId) => handleToggleItemStar(itemId)}
                      />
                    ))}
                    
                    {/* Separador entre pendientes y completados */}
                    {pendingItems.length > 0 && completedItems.length > 0 && (
                      <View style={styles.itemsSeparator}>
                        <View style={styles.separatorLine} />
                        <Text style={styles.separatorText}>
                          {completedItems.length} completado{completedItems.length !== 1 ? 's' : ''}
                        </Text>
                        <View style={styles.separatorLine} />
                      </View>
                    )}
                    
                    {/* Items completados */}
                    {completedItems.map((item) => (
                      <ListItemComponent
                        key={item.id}
                        item={item}
                        isOwner={list.isOwner || false}
                        isToggling={togglingItems.has(item.id)}
                        onToggle={() => handleToggleItem(item.id)}
                        onDelete={() => handleDeleteItem(item.id, item.text)}
                        isPublicList={list.isPublic}
                        onComment={(itemId) => handleCommentItem(itemId)}
                        onToggleStar={(itemId) => handleToggleItemStar(itemId)}
                      />
                    ))}
                  </>
                );
              })()}
            </View>
          )}
        </View>

        {/* Espacio final */}
        <View style={styles.finalSpacing} />
      </ScrollView>

      {/* Modal para agregar item */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <KeyboardAvoidingView 
            style={styles.modalContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity 
              onPress={() => setShowAddItemModal(false)} 
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Agregar Item</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Texto del item */}
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>Texto del Item *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Comprar pañales talla M"
                value={newItemData.text}
                onChangeText={(text) => setNewItemData(prev => ({ ...prev, text }))}
                maxLength={200}
                multiline
                numberOfLines={2}
              />
              <Text style={styles.characterCount}>
                {newItemData.text.length}/200 caracteres
              </Text>

              {/* Imagen del item */}
              <View style={styles.imageSection}>
                <Text style={styles.inputLabel}>Imagen del Item (Opcional)</Text>
                {newItemData.imageUrl ? (
                  <View style={styles.selectedImageContainer}>
                    <Image source={{ uri: newItemData.imageUrl }} style={styles.selectedItemImage} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={handleRemoveItemImage}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageOptionsContainer}>
                    <TouchableOpacity style={styles.imageOption} onPress={handlePickItemImage}>
                      <Ionicons name="images" size={20} color="#59C6C0" />
                      <Text style={styles.imageOptionText}>Galería</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageOption} onPress={handleTakeItemPhoto}>
                      <Ionicons name="camera" size={20} color="#59C6C0" />
                      <Text style={styles.imageOptionText}>Cámara</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Prioridad */}
              <View style={styles.prioritySection}>
                <Text style={styles.inputLabel}>Prioridad</Text>
                <View style={styles.priorityOptions}>
                  {[
                    { value: 'low', label: 'Baja', color: '#28A745', icon: 'arrow-down' },
                    { value: 'medium', label: 'Media', color: '#FFC107', icon: 'remove' },
                    { value: 'high', label: 'Alta', color: '#DC3545', icon: 'arrow-up' }
                  ].map((priority) => (
                    <TouchableOpacity
                      key={priority.value}
                      style={[
                        styles.priorityOption,
                        newItemData.priority === priority.value && styles.priorityOptionSelected
                      ]}
                      onPress={() => setNewItemData(prev => ({ ...prev, priority: priority.value as 'low' | 'medium' | 'high' }))}
                    >
                      <Ionicons 
                        name={priority.icon as any} 
                        size={16} 
                        color={newItemData.priority === priority.value ? 'white' : priority.color} 
                      />
                      <Text style={[
                        styles.priorityOptionText,
                        newItemData.priority === priority.value && styles.priorityOptionTextSelected
                      ]}>
                        {priority.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Detalles */}
              <Text style={styles.inputLabel}>Detalles (Opcional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Detalles adicionales del item..."
                value={newItemData.details}
                onChangeText={(text) => setNewItemData(prev => ({ ...prev, details: text }))}
                multiline
                numberOfLines={3}
                maxLength={500}
              />

              {/* Marca */}
              <Text style={styles.inputLabel}>Marca (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Pampers, Huggies..."
                value={newItemData.brand}
                onChangeText={(text) => setNewItemData(prev => ({ ...prev, brand: text }))}
                maxLength={100}
              />

              {/* Tienda */}
              <Text style={styles.inputLabel}>Tienda (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: Farmacia del Ahorro, Walmart..."
                value={newItemData.store}
                onChangeText={(text) => setNewItemData(prev => ({ ...prev, store: text }))}
                maxLength={100}
              />

              {/* Precio aproximado */}
              <Text style={styles.inputLabel}>Precio Aproximado (Opcional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ej: 150.00"
                value={newItemData.approximatePrice}
                onChangeText={(text) => setNewItemData(prev => ({ ...prev, approximatePrice: text }))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => setShowAddItemModal(false)}
              disabled={isAddingItem}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.saveButton, isAddingItem && styles.saveButtonDisabled]} 
              onPress={handleAddItem}
              disabled={isAddingItem}
            >
              {isAddingItem ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="white" />
                  <Text style={styles.saveButtonText}>Agregar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
      </View>
    </SafeAreaView>
  );
};

// Función helper para obtener el ícono y color de prioridad
const getPriorityStyle = (priority?: string) => {
  switch (priority) {
    case 'high':
      return { icon: 'arrow-up', color: '#DC3545', label: 'Alta' };
    case 'medium':
      return { icon: 'remove', color: '#FFC107', label: 'Media' };
    case 'low':
      return { icon: 'arrow-down', color: '#28A745', label: 'Baja' };
    default:
      return { icon: 'remove', color: '#CCC', label: 'Sin prioridad' };
  }
};

// Componente individual para cada item de la lista
const ListItemComponent = ({ item, isOwner, isToggling, onToggle, onDelete, isPublicList, onComment, onToggleStar }: {
  item: ListItem;
  isOwner: boolean;
  isToggling: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isPublicList?: boolean;
  onComment?: (itemId: string) => void;
  onToggleStar?: (itemId: string) => void;
}) => {
  const priorityStyle = getPriorityStyle(item.priority);
  
  
  return (
    <View style={[styles.listItem, (item.isCompleted || item.completed) && styles.completedItem]}>
      {/* Checkbox y contenido principal */}
      <View style={styles.itemMainRow}>
                <TouchableOpacity 
          style={styles.itemCheckbox}
          onPress={onToggle}
          disabled={!isOwner || isToggling}
        >
          {isToggling ? (
            <ActivityIndicator size="small" color="#59C6C0" />
          ) : (
            <Ionicons 
              name={(item.isCompleted || item.completed) ? "checkmark-circle" : "ellipse-outline"} 
              size={24} 
              color={(item.isCompleted || item.completed) ? "#32CD32" : "#CCC"} 
            />
          )}
        </TouchableOpacity>

        {/* Imagen del item */}
        {item.imageUrl && (
          <View style={styles.itemImageContainer}>
            <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
          </View>
        )}

        <View style={styles.itemContent}>
          {/* Título y prioridad */}
          <View style={styles.itemHeader}>
            <Text style={[
              styles.itemText, 
              (item.isCompleted || item.completed) && styles.completedItemText
            ]}>
              {item.text}
            </Text>
            
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.color }]}>
              <Ionicons name={priorityStyle.icon as any} size={10} color="white" />
              <Text style={styles.priorityText}>{priorityStyle.label}</Text>
            </View>
          </View>

          {/* Detalles */}
          {item.details && (
            <Text style={styles.itemDetails} numberOfLines={2}>
              {item.details}
            </Text>
          )}

          {/* Información comercial */}
          <View style={styles.itemCommercialInfo}>
            {item.brand && (
              <View style={styles.infoChip}>
                <Ionicons name="pricetag" size={12} color="#666" />
                <Text style={styles.infoChipText}>{item.brand}</Text>
              </View>
            )}
            
            {item.store && (
              <View style={styles.infoChip}>
                <Ionicons name="storefront" size={12} color="#666" />
                <Text style={styles.infoChipText}>{item.store}</Text>
              </View>
            )}
            
            {item.approximatePrice && (
              <View style={styles.infoChip}>
                <Ionicons name="cash" size={12} color="#28A745" />
                <Text style={[styles.infoChipText, styles.priceText]}>
                  ${item.approximatePrice}
                </Text>
              </View>
            )}
          </View>
          
          {/* Footer con fecha y comentarios */}
          <View style={styles.itemFooter}>
            <Text style={styles.itemDate}>
              {formatDate(item.createdAt)}
            </Text>
            <View style={styles.itemStats}>
              <TouchableOpacity 
                style={styles.itemComments}
                onPress={() => onComment?.(item.id)}
              >
                <Ionicons name="chatbubble" size={12} color="#666" />
                <Text style={styles.itemCommentsText}>
                  {item.commentCount || item.commentsCount || 0}
                </Text>
              </TouchableOpacity>
              {(item.averageRating || 0) > 0 && (
                <View style={styles.itemRating}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={styles.itemRatingText}>
                    {item.averageRating?.toFixed(1)} ({item.totalRatings || item.ratingsCount || 0})
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Botones de interacción para listas públicas */}
          {isPublicList && (
            <View style={styles.itemActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onComment?.(item.id)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#59C6C0" />
                <Text style={styles.actionButtonText}>Comentar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, (item.userRating || 0) > 0 && styles.actionButtonRated]}
                onPress={() => onToggleStar?.(item.id)}
              >
                <Ionicons 
                  name="star" 
                  size={16} 
                  color={(item.userRating || 0) > 0 ? "#FFD700" : "#666"} 
                />
                <Text style={[styles.actionButtonText, (item.userRating || 0) > 0 && styles.actionButtonTextRated]}>
                  {(item.userRating || 0) > 0 ? `${item.userRating} estrella${item.userRating !== 1 ? 's' : ''}` : "Calificar"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Botón eliminar */}
        {isOwner && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  
  // Loading y error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#F7FAFC',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Header personalizado
  header: {
    backgroundColor: '#96d2d3',
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActionButton: {
    padding: 8,
    marginLeft: 5,
  },

  // Contenido principal
  scrollView: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  
  // Información de la lista
  listInfo: {
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  listDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 10,
  },
  progressText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#32CD32',
  },

  // Items de la lista
  itemsContainer: {
    padding: 20,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  itemsHeaderInfo: {
    flex: 1,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  publicListHint: {
    fontSize: 12,
    color: '#59C6C0',
    fontStyle: 'italic',
  },
  addItemButton: {
    backgroundColor: '#96d2d3',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Items vacíos
  emptyItemsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyItemsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    marginBottom: 20,
  },
  addFirstItemButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addFirstItemText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },

  // Lista de items
  itemsList: {
    gap: 12,
  },
  listItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  completedItem: {
    backgroundColor: '#F0F8F0',
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemCheckbox: {
    padding: 5,
    marginRight: 12,
  },
  
  // Imagen del item
  itemImageContainer: {
    marginRight: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  
  itemContent: {
    flex: 1,
  },
  
  // Header del item (título + prioridad)
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
    flex: 1,
    marginRight: 8,
  },
  completedItemText: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  
  // Badge de prioridad
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
    color: 'white',
    marginLeft: 2,
  },
  
  // Detalles del item
  itemDetails: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 8,
  },
  
  // Información comercial
  itemCommercialInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoChipText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  priceText: {
    color: '#28A745',
    fontWeight: '600',
  },
  
  // Footer del item
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  itemDate: {
    fontSize: 12,
    color: '#999',
  },
  itemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemComments: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCommentsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  itemRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemRatingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 10,
  },

  // Botones de interacción
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  actionButtonRated: {
    backgroundColor: '#FFF8DC',
  },
  actionButtonTextRated: {
    color: '#B8860B',
  },

  // Modal estilos
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
    backgroundColor: '#F7FAFC',
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
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#F7FAFC',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 5,
  },

  // Sección de formulario
  formSection: {
    gap: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Sección de imagen para items
  imageSection: {
    marginTop: 10,
  },
  selectedImageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginTop: 10,
  },
  selectedItemImage: {
    width: 120,
    height: 120,
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
    backgroundColor: '#F7FAFC',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flex: 0.45,
  },
  imageOptionText: {
    fontSize: 12,
    color: '#59C6C0',
    marginTop: 6,
    fontWeight: '500',
  },

  // Sección de prioridad
  prioritySection: {
    marginTop: 10,
  },
  priorityOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  priorityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F7FAFC',
  },
  priorityOptionSelected: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  priorityOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  priorityOptionTextSelected: {
    color: 'white',
  },

  // Acciones del modal
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F7FAFC',
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
    backgroundColor: '#96d2d3',
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

  // Separador entre items pendientes y completados
  itemsSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    fontSize: 12,
    color: '#999',
    marginHorizontal: 15,
    fontWeight: '500',
    textTransform: 'uppercase',
  },

  // Espaciado final
  finalSpacing: {
    height: 40,
  },
});

export default ListDetailScreen;
