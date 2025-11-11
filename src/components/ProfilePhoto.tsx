import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  selectAndUploadProfilePhoto,
  deleteProfilePhoto,
} from '../services/profilePhotoService';

interface ProfilePhotoProps {
  photoURL?: string | null;
  onPhotoUpdated?: (newPhotoURL: string | null) => void;
  size?: number;
  editable?: boolean;
}

const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  photoURL,
  onPhotoUpdated,
  size = 120,
  editable = true,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState(photoURL);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  const showPhotoOptions = () => {
    if (!editable) return;
    setShowOptionsModal(true);
  };

  const handleSelectPhoto = async (source: 'gallery' | 'camera') => {
    setShowOptionsModal(false);
    setLoading(true);

    const result = await selectAndUploadProfilePhoto(source);

    setLoading(false);

    if (result.success && result.photoURL) {
      setCurrentPhoto(result.photoURL);
      onPhotoUpdated && onPhotoUpdated(result.photoURL);
      Alert.alert('¡Éxito!', 'Tu foto de perfil ha sido actualizada');
    } else if (!result.cancelled) {
      Alert.alert('Error', result.error || 'No se pudo actualizar la foto');
    }
  };

  const handleDeletePhoto = () => {
    setShowOptionsModal(false);
    Alert.alert(
      'Eliminar Foto',
      '¿Estás segura de que quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const result = await deleteProfilePhoto();
            setLoading(false);

            if (result.success) {
              setCurrentPhoto(null);
              onPhotoUpdated && onPhotoUpdated(null);
              Alert.alert('Éxito', 'Foto eliminada');
            } else {
              Alert.alert('Error', result.error || 'No se pudo eliminar la foto');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.photoWrapper}>
        <TouchableOpacity
          onPress={showPhotoOptions}
          disabled={loading || !editable}
          style={[styles.photoContainer, { width: size, height: size, borderRadius: size / 2 }]}
          activeOpacity={editable ? 0.7 : 1}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#887CBC" />
            </View>
          ) : currentPhoto ? (
            <Image source={{ uri: currentPhoto }} style={styles.photo} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="person" size={size * 0.5} color="#CCC" />
            </View>
          )}
        </TouchableOpacity>

        {/* Badge de edición */}
        {editable && !loading && (
          <View style={[styles.badge, { width: size * 0.3, height: size * 0.3, borderRadius: size * 0.15 }]}>
            <Ionicons name="camera" size={size * 0.15} color="#FFF" />
          </View>
        )}
      </View>

      {editable && (
        <Text style={styles.hint}>Toca para cambiar tu foto</Text>
      )}

      {/* Modal de opciones */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Foto de Perfil</Text>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleSelectPhoto('camera')}
            >
              <Ionicons name="camera" size={24} color="#887CBC" />
              <Text style={styles.optionText}>Tomar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleSelectPhoto('gallery')}
            >
              <Ionicons name="images" size={24} color="#887CBC" />
              <Text style={styles.optionText}>Seleccionar de Galería</Text>
            </TouchableOpacity>

            {currentPhoto && (
              <TouchableOpacity
                style={[styles.optionButton, styles.deleteButton]}
                onPress={handleDeletePhoto}
              >
                <Ionicons name="trash" size={24} color="#E74C3C" />
                <Text style={[styles.optionText, styles.deleteText]}>Eliminar Foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.optionButton, styles.cancelButton]}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  photoWrapper: {
    position: 'relative',
  },
  photoContainer: {
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  badge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#887CBC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    fontFamily: 'Montserrat',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteText: {
    color: '#E74C3C',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginTop: 8,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
});

export default ProfilePhoto;

