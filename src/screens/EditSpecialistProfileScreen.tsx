import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { axiosInstance } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import analyticsService from '../services/analyticsService';

const EditSpecialistProfileScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user, setUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Datos del perfil
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  useEffect(() => {
    analyticsService.logScreenView('edit_specialist_profile');
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get('/api/profile/professional');
      const profile = response.data?.data || response.data;

      setDisplayName(profile?.personalInfo?.displayName || profile?.displayName || '');
      setPhone(profile?.personalInfo?.phone || profile?.phone || '');
      setBio(profile?.personalInfo?.bio || profile?.bio || '');
      setSpecialties(profile?.professional?.specialties || []);
      setLicenseNumber(profile?.professional?.licenseNumber || '');
      setUniversity(profile?.professional?.university || '');
      setYearsExperience(profile?.professional?.yearsExperience?.toString() || '');
      setPhotoURL(user?.photoURL || '');
    } catch (error) {
      console.error('❌ [EDIT PROFILE] Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar tu perfil');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería para cambiar tu foto de perfil');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ [EDIT PROFILE] Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu cámara para tomar una foto');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('❌ [EDIT PROFILE] Error taking photo:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      console.log('📤 [EDIT PROFILE] Subiendo foto...');

      const uploadedUrl = await imageUploadService.uploadProfileImage(uri);
      console.log('✅ [EDIT PROFILE] Foto subida:', uploadedUrl);

      setPhotoURL(uploadedUrl);
      
      // Actualizar el usuario en el contexto
      if (user) {
        setUser({ ...user, photoURL: uploadedUrl });
      }

      Alert.alert('Éxito', 'Foto actualizada correctamente');
    } catch (error) {
      console.error('❌ [EDIT PROFILE] Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoOptions = () => {
    Alert.alert(
      'Cambiar Foto de Perfil',
      'Selecciona una opción',
      [
        { text: 'Tomar Foto', onPress: takePhoto },
        { text: 'Elegir de Galería', onPress: pickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const addSpecialty = () => {
    if (specialtyInput.trim()) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput('');
    }
  };

  const removeSpecialty = (index: number) => {
    setSpecialties(specialties.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!displayName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return false;
    }
    if (!phone.trim()) {
      Alert.alert('Error', 'El teléfono es requerido');
      return false;
    }
    if (specialties.length === 0) {
      Alert.alert('Error', 'Debes agregar al menos una especialidad');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      console.log('💾 [EDIT PROFILE] Guardando perfil...');

      const requestData = {
        personalInfo: {
          displayName: displayName.trim(),
          phone: phone.trim(),
          bio: bio.trim(),
        },
        professional: {
          specialties,
          licenseNumber: licenseNumber.trim(),
          university: university.trim(),
          yearsExperience: parseInt(yearsExperience) || 0,
        },
      };

      const response = await axiosInstance.put('/api/profile/professional', requestData);
      console.log('✅ [EDIT PROFILE] Perfil actualizado:', response.data);

      analyticsService.logEvent('specialist_profile_updated', {
        has_bio: !!bio,
        specialties_count: specialties.length,
        years_experience: parseInt(yearsExperience) || 0,
      });

      Alert.alert('Éxito', 'Perfil actualizado correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      console.error('❌ [EDIT PROFILE] Error guardando perfil:', error);
      Alert.alert('Error', 'No se pudo actualizar tu perfil. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Foto de perfil */}
        <View style={styles.photoSection}>
          <TouchableOpacity
            style={styles.photoContainer}
            onPress={handlePhotoOptions}
            disabled={uploadingPhoto}
          >
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={48} color="#887CBC" />
              </View>
            )}
            <View style={styles.photoEditBadge}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="camera" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.photoHint}>Toca para cambiar tu foto</Text>
        </View>

        {/* Información Personal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Personal</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nombre Completo <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Dr. Juan Pérez"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Teléfono <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+593999999999"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Biografía Profesional</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Cuéntanos sobre tu experiencia y enfoque profesional..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              Una buena biografía ayuda a generar confianza con los pacientes
            </Text>
          </View>
        </View>

        {/* Especialidades */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Especialidades <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.tagInputContainer}>
            <TextInput
              style={styles.tagInput}
              value={specialtyInput}
              onChangeText={setSpecialtyInput}
              placeholder="Ej: Pediatría, Neonatología..."
              placeholderTextColor="#9CA3AF"
              onSubmitEditing={addSpecialty}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={addSpecialty}
              disabled={!specialtyInput.trim()}
            >
              <Ionicons name="add-circle" size={28} color="#887CBC" />
            </TouchableOpacity>
          </View>

          {specialties.length > 0 && (
            <View style={styles.tagsContainer}>
              {specialties.map((specialty, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{specialty}</Text>
                  <TouchableOpacity onPress={() => removeSpecialty(index)}>
                    <Ionicons name="close-circle" size={18} color="#887CBC" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Credenciales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credenciales Profesionales</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Universidad</Text>
            <TextInput
              style={styles.input}
              value={university}
              onChangeText={setUniversity}
              placeholder="Universidad Central del Ecuador"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Número de Licencia Médica</Text>
            <TextInput
              style={styles.input}
              value={licenseNumber}
              onChangeText={setLicenseNumber}
              placeholder="MSP-12345-2020"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Años de Experiencia</Text>
            <TextInput
              style={styles.input}
              value={yearsExperience}
              onChangeText={setYearsExperience}
              placeholder="10"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Botón Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Guardar Cambios</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
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
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  photoContainer: {
    position: 'relative',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#887CBC',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#887CBC',
  },
  photoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#887CBC',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  photoHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#1F2937',
  },
  addButton: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  saveButton: {
    flexDirection: 'row',
    backgroundColor: '#887CBC',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default EditSpecialistProfileScreen;
