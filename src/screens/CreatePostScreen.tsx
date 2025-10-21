import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { communitiesService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';

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
  
  // Log de prueba para verificar que imageUploadService esté disponible
  console.log('🔍 [CREATE POST] imageUploadService disponible:', !!imageUploadService);
  console.log('🔍 [CREATE POST] imageUploadService.uploadCommunityImage disponible:', !!imageUploadService.uploadCommunityImage);
  
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    const postData = {
      content: content.trim(),
      ...(imageUrl && { imageUrl }),
    };

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
      {/* Header */}
      <View style={styles.header}>
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

          {/* Información adicional */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={16} color="#666" />
            <Text style={styles.infoText}>
              Tu post será visible para todos los miembros de la comunidad
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 15 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#59C6C0',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#FFFFFF',
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
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    backgroundColor: '#F8F9FA',
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
});

export default CreatePostScreen;
