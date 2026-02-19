import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../services/api';
import analyticsService from '../services/analyticsService';

interface Document {
  url: string;
  name: string;
  type: 'image' | 'pdf';
  uploadedAt?: string;
}

const ManageDocumentsScreen = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    analyticsService.logScreenView('manage_documents');
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/profile/professional');
      const profile = response.data?.data || response.data;
      
      const docs = profile?.documents || [];
      const parsedDocs: Document[] = docs.map((url: string) => ({
        url,
        name: getFileNameFromUrl(url),
        type: url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image',
      }));
      
      setDocuments(parsedDocs);
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error cargando documentos:', error);
      Alert.alert('Error', 'No se pudieron cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    const parts = url.split('/');
    const fileName = parts[parts.length - 1];
    return decodeURIComponent(fileName.split('?')[0]);
  };

  const pickImageFromCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadDocument(result.assets[0].uri, 'image', 'photo-' + Date.now() + '.jpg');
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadDocument(result.assets[0].uri, 'image', result.assets[0].fileName || 'image-' + Date.now() + '.jpg');
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileType = asset.mimeType?.startsWith('image/') ? 'image' : 'pdf';
        await uploadDocument(asset.uri, fileType, asset.name, asset.mimeType);
      }
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error seleccionando archivo:', error);
      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    }
  };

  const showUploadOptions = () => {
    Alert.alert(
      'Subir Documento',
      'Selecciona una opción',
      [
        { text: 'Tomar Foto', onPress: pickImageFromCamera },
        { text: 'Elegir Foto', onPress: pickImageFromGallery },
        { text: 'Seleccionar Archivo (PDF)', onPress: pickFile },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const uploadDocument = async (uri: string, fileType: 'image' | 'pdf', fileName: string, mimeType?: string | null) => {
    try {
      setUploading(true);
      console.log('📤 [DOCUMENTS] Subiendo documento:', fileName);

      const formData = new FormData();
      
      // Inferir MIME type si no se proporciona
      let finalMimeType = mimeType;
      if (!finalMimeType) {
        if (fileType === 'pdf') {
          finalMimeType = 'application/pdf';
        } else {
          finalMimeType = 'image/jpeg';
        }
      }

      formData.append('file', {
        uri,
        type: finalMimeType,
        name: fileName,
      } as any);

      const response = await axiosInstance.post('/api/professionals/requests/upload-document', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('✅ [DOCUMENTS] Documento subido:', response.data);
      
      const uploadedUrl = response.data?.data?.url || response.data?.url;
      
      if (uploadedUrl) {
        // Agregar el documento a la lista actual
        const newDoc: Document = {
          url: uploadedUrl,
          name: fileName,
          type: fileType,
        };
        
        // Actualizar el perfil con el nuevo documento
        await updateProfileDocuments([...documents.map(d => d.url), uploadedUrl]);
        
        setDocuments([...documents, newDoc]);
        
        analyticsService.logEvent('specialist_document_uploaded', {
          file_type: fileType,
        });

        Alert.alert('Éxito', 'Documento subido correctamente');
      }
    } catch (error: any) {
      console.error('❌ [DOCUMENTS] Error subiendo documento:', error);
      Alert.alert('Error', 'No se pudo subir el documento. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const updateProfileDocuments = async (documentUrls: string[]) => {
    try {
      await axiosInstance.put('/api/profile/professional', {
        documents: documentUrls,
      });
    } catch (error) {
      console.error('❌ [DOCUMENTS] Error actualizando documentos en perfil:', error);
    }
  };

  const deleteDocument = (doc: Document) => {
    Alert.alert(
      'Eliminar Documento',
      `¿Estás seguro que deseas eliminar "${doc.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedDocs = documents.filter(d => d.url !== doc.url);
              await updateProfileDocuments(updatedDocs.map(d => d.url));
              setDocuments(updatedDocs);
              
              analyticsService.logEvent('specialist_document_deleted');
              Alert.alert('Éxito', 'Documento eliminado');
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el documento');
            }
          },
        },
      ]
    );
  };

  const openDocument = async (doc: Document) => {
    try {
      const supported = await Linking.canOpenURL(doc.url);
      if (supported) {
        await Linking.openURL(doc.url);
      } else {
        Alert.alert('Error', 'No se puede abrir este documento');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el documento');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando documentos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Sube tus documentos profesionales como título médico, cédula profesional, certificados, etc. Estos documentos ayudan a verificar tu perfil.
          </Text>
        </View>

        {/* Botón subir */}
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={showUploadOptions}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Subir Documento</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Lista de documentos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Mis Documentos ({documents.length})
          </Text>

          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No hay documentos</Text>
              <Text style={styles.emptyStateText}>
                Sube tus documentos profesionales para verificar tu perfil
              </Text>
            </View>
          ) : (
            documents.map((doc, index) => (
              <View key={index} style={styles.documentCard}>
                <View style={styles.documentIcon}>
                  <Ionicons
                    name={doc.type === 'pdf' ? 'document-text' : 'image'}
                    size={28}
                    color={doc.type === 'pdf' ? '#EF4444' : '#3B82F6'}
                  />
                </View>

                <View style={styles.documentInfo}>
                  <Text style={styles.documentName} numberOfLines={2}>
                    {doc.name}
                  </Text>
                  <Text style={styles.documentType}>
                    {doc.type === 'pdf' ? 'PDF' : 'Imagen'}
                  </Text>
                </View>

                <View style={styles.documentActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openDocument(doc)}
                  >
                    <Ionicons name="eye" size={20} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteDocument(doc)}
                  >
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Recomendaciones */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Recomendaciones</Text>
          <Text style={styles.tipItem}>
            • Asegúrate que los documentos sean legibles
          </Text>
          <Text style={styles.tipItem}>
            • Acepta formatos: JPG, PNG, PDF
          </Text>
          <Text style={styles.tipItem}>
            • Tamaño máximo recomendado: 5 MB por archivo
          </Text>
          <Text style={styles.tipItem}>
            • Los documentos ayudan a acelerar tu verificación
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#887CBC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  documentType: {
    fontSize: 12,
    color: '#6B7280',
  },
  documentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  tipsCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
});

export default ManageDocumentsScreen;
