import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { communitiesService, listsService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import { useAuth } from '../contexts/AuthContext';
import { List } from '../types/lists';

interface CreatePostScreenProps {
  route: {
    params: {
      communityId: string;
      communityName: string;
    };
  };
}

const CreatePostScreen: React.FC = () => {
  const route = useRoute<any>();
  const { communityId, communityName } = route.params;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  // Log de prueba para verificar que imageUploadService esté disponible
  console.log('🔍 [CREATE POST] imageUploadService disponible:', !!imageUploadService);
  console.log('🔍 [CREATE POST] imageUploadService.uploadCommunityImage disponible:', !!imageUploadService.uploadCommunityImage);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePosition, setImagePosition] = useState<'start' | 'end'>('start');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { user } = useAuth();
  
  // Estados para listas adjuntas
  const [availableLists, setAvailableLists] = useState<List[]>([]);
  const [selectedLists, setSelectedLists] = useState<string[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);

  // Función para seleccionar imagen desde la galería
  const pickImage = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos Requeridos',
          'Necesitamos acceso a tu galería para seleccionar una imagen.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Abrir selector de imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('🖼️ [CREATE POST] Imagen seleccionada:', result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ [CREATE POST] Error seleccionando imagen:', error);
      Alert.alert(
        'Error',
        'No se pudo seleccionar la imagen',
        [{ text: 'OK' }]
      );
    }
  };

  // Función para tomar foto con la cámara
  const takePhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permisos Requeridos',
          'Necesitamos acceso a tu cámara para tomar una foto.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📸 [CREATE POST] Foto tomada:', result.assets[0].uri);
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ [CREATE POST] Error tomando foto:', error);
      Alert.alert(
        'Error',
        'No se pudo tomar la foto',
        [{ text: 'OK' }]
      );
    }
  };

  // Función para remover imagen seleccionada
  const removeImage = () => {
    setSelectedImage(null);
  };

  // Cargar listas disponibles del usuario y públicas
  useEffect(() => {
    const loadLists = async () => {
      if (!user) return;
      
      try {
        setIsLoadingLists(true);
        console.log('📋 [CREATE POST] Iniciando carga de listas...');
        
        // Cargar listas del usuario y listas públicas
        const [userListsResponse, publicListsResponse] = await Promise.all([
          listsService.getUserLists().catch(err => {
            console.error('❌ [CREATE POST] Error cargando listas del usuario:', err);
            return { success: false, data: [] };
          }),
          listsService.getPublicLists({ limit: 50 }).catch(err => {
            console.error('❌ [CREATE POST] Error cargando listas públicas:', err);
            return { success: false, data: [] };
          })
        ]);
        
        console.log('📋 [CREATE POST] Respuesta listas del usuario:', {
          success: userListsResponse.success,
          hasData: !!userListsResponse.data,
          isArray: Array.isArray(userListsResponse.data),
          length: Array.isArray(userListsResponse.data) ? userListsResponse.data.length : 0
        });
        
        console.log('📋 [CREATE POST] Respuesta listas públicas:', {
          success: publicListsResponse.success,
          hasData: !!publicListsResponse.data,
          isArray: Array.isArray(publicListsResponse.data),
          length: Array.isArray(publicListsResponse.data) ? publicListsResponse.data.length : 0
        });
        
        const allLists: List[] = [];
        
        // Agregar listas del usuario
        if (userListsResponse.success && userListsResponse.data) {
          const userLists = Array.isArray(userListsResponse.data) ? userListsResponse.data : [];
          console.log('📋 [CREATE POST] Agregando', userLists.length, 'listas del usuario');
          allLists.push(...userLists);
        }
        
        // Agregar listas públicas (evitando duplicados)
        if (publicListsResponse.success && publicListsResponse.data) {
          const publicLists = Array.isArray(publicListsResponse.data) ? publicListsResponse.data : [];
          console.log('📋 [CREATE POST] Agregando', publicLists.length, 'listas públicas');
          publicLists.forEach((list: List) => {
            // Solo agregar si no está ya en la lista (por ID)
            if (!allLists.find(l => l.id === list.id)) {
              // Asegurar que las listas públicas tengan isPublic = true
              const listToAdd = { ...list, isPublic: true };
              allLists.push(listToAdd);
            }
          });
        }
        
        // Filtrar: solo listas propias o públicas
        // Las listas públicas ya tienen isPublic = true, y las propias siempre se pueden adjuntar
        const available = allLists.filter((list: List) => {
          const isOwner = list.creatorId === user.id;
          const isPublic = list.isPublic === true;
          return isOwner || isPublic;
        });
        
        console.log('📋 [CREATE POST] Total listas disponibles:', available.length);
        console.log('📋 [CREATE POST] Desglose:', {
          total: allLists.length,
          disponibles: available.length,
          propias: available.filter(l => l.creatorId === user.id).length,
          publicas: available.filter(l => l.isPublic && l.creatorId !== user.id).length
        });
        
        setAvailableLists(available);
      } catch (error) {
        console.error('❌ [CREATE POST] Error cargando listas:', error);
        // En caso de error, intentar cargar solo listas públicas
        try {
          const publicResponse = await listsService.getPublicLists({ limit: 50 });
          if (publicResponse.success && publicResponse.data) {
            const publicLists = Array.isArray(publicResponse.data) ? publicResponse.data : [];
            const listsWithPublic = publicLists.map((list: List) => ({ ...list, isPublic: true }));
            setAvailableLists(listsWithPublic);
            console.log('📋 [CREATE POST] Cargadas', listsWithPublic.length, 'listas públicas como fallback');
          }
        } catch (fallbackError) {
          console.error('❌ [CREATE POST] Error en fallback:', fallbackError);
        }
      } finally {
        setIsLoadingLists(false);
      }
    };

    loadLists();
  }, [user]);

  // Función para toggle de selección de lista
  const toggleListSelection = (listId: string) => {
    setSelectedLists(prev => {
      if (prev.includes(listId)) {
        return prev.filter(id => id !== listId);
      } else {
        return [...prev, listId];
      }
    });
  };

  // Función para remover lista seleccionada
  const removeList = (listId: string) => {
    setSelectedLists(prev => prev.filter(id => id !== listId));
  };

  // Función para crear el post
  const handleCreatePost = async () => {
    // Validaciones
    if (!content.trim()) {
      Alert.alert(
        'Contenido Requerido',
        'Por favor, escribe el contenido de tu post.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert(
        'Contenido Muy Corto',
        'Tu post debe tener al menos 10 caracteres.',
        [{ text: 'OK' }]
      );
      return;
    }

          try {
        setIsLoading(true);

      // Si hay imagen seleccionada, subirla primero
      if (selectedImage) {
        setIsUploadingImage(true);
        console.log('🖼️ [CREATE POST] Subiendo imagen...');
        console.log('🖼️ [CREATE POST] URI de imagen seleccionada:', selectedImage);
        console.log('🖼️ [CREATE POST] Tipo de imagen:', typeof selectedImage);
        
        try {
          console.log('🖼️ [CREATE POST] Llamando a imageUploadService.uploadCommunityImage...');
          const uploadResult = await imageUploadService.uploadCommunityImage(selectedImage);
          console.log('🖼️ [CREATE POST] Resultado de uploadCommunityImage:', uploadResult);
          console.log('🖼️ [CREATE POST] Tipo de resultado:', typeof uploadResult);
          
          const imageUrl = uploadResult;
          console.log('✅ [CREATE POST] Imagen subida exitosamente, URL:', imageUrl);
          console.log('✅ [CREATE POST] imageUrl final:', imageUrl);
          
          // Crear el post con la URL de la imagen
          await createPost(imageUrl);
        } catch (uploadError: any) {
          console.error('❌ [CREATE POST] Error subiendo imagen:', uploadError);
          console.error('❌ [CREATE POST] Tipo de error:', typeof uploadError);
          console.error('❌ [CREATE POST] Mensaje de error:', uploadError.message);
          
          Alert.alert(
            'Error',
            'No se pudo subir la imagen. ¿Quieres continuar sin imagen?',
            [
              { text: 'Cancelar', style: 'cancel' },
              { 
                text: 'Continuar Sin Imagen', 
                onPress: () => createPost(undefined)
              }
            ]
          );
          return;
        } finally {
          setIsLoading(false);
        }
      } else {
        // Crear el post sin imagen
        await createPost(undefined);
      }

    } catch (error: any) {
      console.error('❌ [CREATE POST] Error creando post:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear el post',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Función para crear post sin imagen
  const createPostWithoutImage = async () => {
    try {
      await createPost(undefined);
    } catch (error: any) {
      console.error('❌ [CREATE POST] Error creando post sin imagen:', error);
      Alert.alert(
        'Error',
        'No se pudo crear el post',
        [{ text: 'OK' }]
      );
    }
  };

  // Función auxiliar para crear el post
  const createPost = async (imageUrl?: string) => {
    console.log('📝 [CREATE POST] createPost llamado con imageUrl:', imageUrl);
    console.log('📝 [CREATE POST] Tipo de imageUrl:', typeof imageUrl);
    
    // Preparar datos del post
    const postData: { 
      title?: string;
      content: string; 
      imageUrl?: string;
      imagePosition?: 'start' | 'end';
      attachedLists?: string[];
    } = {
      content: content.trim(),
    };
    
    // Agregar título si existe
    if (title.trim()) {
      postData.title = title.trim();
    }
    
    // Solo agregar imageUrl si tiene un valor válido
    if (imageUrl && imageUrl !== 'undefined' && imageUrl.trim() !== '') {
      postData.imageUrl = imageUrl;
      postData.imagePosition = imagePosition;
    }
    
    // Agregar listas adjuntas si hay alguna seleccionada
    if (selectedLists.length > 0) {
      postData.attachedLists = selectedLists;
      console.log('📋 [CREATE POST] Listas adjuntas:', selectedLists);
    }

    console.log('📝 [CREATE POST] === DEBUG DATOS DEL POST ===');
    console.log('📝 [CREATE POST] Contenido:', content.trim());
    console.log('📝 [CREATE POST] imageUrl:', imageUrl || 'NO');
    console.log('📝 [CREATE POST] Datos del post a enviar:', JSON.stringify(postData, null, 2));
    console.log('📝 [CREATE POST] Campos enviados:', Object.keys(postData));

    // Llamar al servicio para crear el post
    const result = await communitiesService.createCommunityPost(communityId, postData);

    if (result.success) {
      Alert.alert(
        '¡Post Creado! 🎉',
        'Tu post ha sido publicado exitosamente en la comunidad.',
        [
          {
            text: 'Ver Posts',
            onPress: () => {
              // Navegar de vuelta a los posts de la comunidad
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || 'No se pudo crear el post');
    }
  };

  // Función para cancelar
  const handleCancel = () => {
    if (content.trim() || selectedImage) {
      Alert.alert(
        'Cancelar Creación',
        '¿Estás seguro de que quieres cancelar? Se perderán todos los cambios.',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          { 
            text: 'Cancelar', 
            style: 'destructive',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Post</Text>
        <TouchableOpacity 
          style={[
            styles.publishButton,
            (!content.trim() || isLoading) && styles.publishButtonDisabled
          ]}
          onPress={handleCreatePost}
          disabled={!content.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.publishButtonText}>Publicar</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Información de la comunidad */}
      <View style={styles.communityInfo}>
        <Ionicons name="people" size={20} color="#59C6C0" />
        <Text style={styles.communityName}>{communityName}</Text>
      </View>

      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Título del post */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Título (opcional)</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Título de tu post..."
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.characterCount}>{title.length}/100</Text>
          </View>

          {/* Contenido del post */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>¿Qué quieres compartir?</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Comparte algo con tu comunidad..."
              placeholderTextColor="#999"
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
              maxLength={1000}
            />
            <Text style={styles.characterCount}>{content.length}/1000</Text>
          </View>

          {/* Selección de imagen */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Imagen (opcional)</Text>
            
            {selectedImage ? (
              <View>
                <View style={styles.imageSelectedContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={removeImage}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                  </TouchableOpacity>
                  <View style={styles.imageSelectedOverlay}>
                    <Text style={styles.imageSelectedText}>Imagen Seleccionada</Text>
                  </View>
                </View>
                {/* Selector de posición de imagen */}
                <View style={styles.imagePositionContainer}>
                  <Text style={styles.imagePositionLabel}>Posición de la imagen:</Text>
                  <View style={styles.imagePositionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.imagePositionButton,
                        imagePosition === 'start' && styles.imagePositionButtonActive
                      ]}
                      onPress={() => setImagePosition('start')}
                    >
                      <Ionicons 
                        name="arrow-up" 
                        size={16} 
                        color={imagePosition === 'start' ? 'white' : '#666'} 
                      />
                      <Text style={[
                        styles.imagePositionButtonText,
                        imagePosition === 'start' && styles.imagePositionButtonTextActive
                      ]}>
                        Al inicio
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.imagePositionButton,
                        imagePosition === 'end' && styles.imagePositionButtonActive
                      ]}
                      onPress={() => setImagePosition('end')}
                    >
                      <Ionicons 
                        name="arrow-down" 
                        size={16} 
                        color={imagePosition === 'end' ? 'white' : '#666'} 
                      />
                      <Text style={[
                        styles.imagePositionButtonText,
                        imagePosition === 'end' && styles.imagePositionButtonTextActive
                      ]}>
                        Al final
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.imageButtonsContainer}>
                <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                  <Ionicons name="images" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Galería</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.imageButton} onPress={takePhoto}>
                  <Ionicons name="camera" size={20} color="#59C6C0" />
                  <Text style={styles.imageButtonText}>Cámara</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Indicador de carga para imagen */}
          {isUploadingImage && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#59C6C0" />
              <Text style={styles.uploadingText}>Subiendo imagen...</Text>
            </View>
          )}

          {/* Selección de listas adjuntas */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Listas adjuntas (opcional)</Text>
            
            {/* Listas seleccionadas */}
            {selectedLists.length > 0 && (
              <View style={styles.selectedListsContainer}>
                {selectedLists.map(listId => {
                  const list = availableLists.find(l => l.id === listId);
                  if (!list) return null;
                  return (
                    <View key={listId} style={styles.selectedListChip}>
                      <Text style={styles.selectedListText} numberOfLines={1}>
                        {list.title}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeList(listId)}
                        style={styles.removeListButton}
                      >
                        <Ionicons name="close-circle" size={18} color="#FF6B6B" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
            
            {/* Botón para abrir selector de listas */}
            <TouchableOpacity
              style={styles.selectListsButton}
              onPress={() => setShowListSelector(true)}
              disabled={isLoadingLists || availableLists.length === 0}
            >
              <Ionicons name="list" size={20} color="#59C6C0" />
              <Text style={styles.selectListsButtonText}>
                {isLoadingLists 
                  ? 'Cargando listas...' 
                  : availableLists.length === 0
                  ? 'No tienes listas disponibles'
                  : selectedLists.length === 0
                  ? 'Seleccionar listas'
                  : `Agregar más listas (${selectedLists.length} seleccionada${selectedLists.length > 1 ? 's' : ''})`}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.infoText}>
              Tu post será visible para todos los miembros de la comunidad
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal para seleccionar listas */}
      <Modal
        visible={showListSelector}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowListSelector(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setShowListSelector(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Seleccionar Listas</Text>
            <TouchableOpacity onPress={() => setShowListSelector(false)}>
              <Text style={styles.modalDoneText}>Listo</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {isLoadingLists ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color="#59C6C0" />
                <Text style={styles.modalLoadingText}>Cargando listas...</Text>
              </View>
            ) : availableLists.length === 0 ? (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name="list-outline" size={48} color="#CCC" />
                <Text style={styles.modalEmptyText}>
                  No tienes listas disponibles
                </Text>
                <Text style={styles.modalEmptySubtext}>
                  Crea una lista primero para poder adjuntarla a un post
                </Text>
              </View>
            ) : (
              availableLists.map((list) => {
                const isSelected = selectedLists.includes(list.id);
                return (
                  <TouchableOpacity
                    key={list.id}
                    style={[
                      styles.listItem,
                      isSelected && styles.listItemSelected
                    ]}
                    onPress={() => toggleListSelection(list.id)}
                  >
                    {list.imageUrl && (
                      <Image source={{ uri: list.imageUrl }} style={styles.listItemImage} />
                    )}
                    <View style={styles.listItemContent}>
                      <Text style={styles.listItemTitle} numberOfLines={1}>
                        {list.title}
                      </Text>
                      {list.description && (
                        <Text style={styles.listItemDescription} numberOfLines={2}>
                          {list.description}
                        </Text>
                      )}
                      <View style={styles.listItemStats}>
                        <Text style={styles.listItemStatText}>
                          {list.completedItemsCount}/{list.itemsCount} items
                        </Text>
                        {list.isPublic && (
                          <View style={styles.listItemPublicBadge}>
                            <Ionicons name="globe" size={12} color="#59C6C0" />
                            <Text style={styles.listItemPublicText}>Pública</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={styles.listItemCheckbox}>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#59C6C0" />
                      )}
                      {!isSelected && (
                        <Ionicons name="ellipse-outline" size={24} color="#CCC" />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F7FAFC',
  },
  cancelButton: {
    padding: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  publishButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#CCC',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F7FAFC',
  },
  communityName: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  contentInput: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#F7FAFC',
    height: 150,
  },
  characterCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
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
  imageSelectedContainer: {
    position: 'relative',
    marginTop: 10,
  },
  selectedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  imageSelectedOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  imageSelectedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
    fontFamily: 'Montserrat',
    backgroundColor: '#F9F9F9',
    minHeight: 50,
  },
  imagePositionContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  imagePositionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  imagePositionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  imagePositionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 6,
  },
  imagePositionButtonActive: {
    backgroundColor: '#96d2d3',
    borderColor: '#59C6C0',
  },
  imagePositionButtonText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  imagePositionButtonTextActive: {
    color: 'white',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    marginTop: 10,
  },
  uploadingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    marginTop: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    lineHeight: 20,
    flex: 1,
  },
  // Estilos para listas adjuntas
  selectedListsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  selectedListChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#59C6C0',
    gap: 6,
  },
  selectedListText: {
    fontSize: 13,
    color: '#333',
    fontFamily: 'Montserrat',
    maxWidth: 150,
  },
  removeListButton: {
    marginLeft: 4,
  },
  selectListsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 10,
  },
  selectListsButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
  },
  // Estilos para modal de selección de listas
  modalContainer: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F7FAFC',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  modalDoneText: {
    fontSize: 16,
    color: '#59C6C0',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  modalEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    fontFamily: 'Montserrat',
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
    fontFamily: 'Montserrat',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  listItemSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#59C6C0',
    borderWidth: 2,
  },
  listItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  listItemContent: {
    flex: 1,
    marginRight: 12,
  },
  listItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  listItemDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
    fontFamily: 'Montserrat',
  },
  listItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listItemStatText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  listItemPublicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemPublicText: {
    fontSize: 12,
    color: '#59C6C0',
    fontFamily: 'Montserrat',
  },
  listItemCheckbox: {
    marginLeft: 'auto',
  },
});

export default CreatePostScreen;
