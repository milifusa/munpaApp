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
  StatusBar,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { communitiesService } from '../services/api';
import { imageUploadService } from '../services/imageUploadService';
import { CreatePostData } from '../types/posts';
import analyticsService from '../services/analyticsService';

const CreateEventScreen: React.FC = () => {
  const route = useRoute<any>();
  const { communityId, communityName } = route.params;
  const navigation = useNavigation();

  // Estados del formulario
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Ubicación
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Configuración
  const [maxAttendees, setMaxAttendees] = useState('');
  const [hasMaxAttendees, setHasMaxAttendees] = useState(false);
  
  // Imagen
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // Estados de carga
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  // Función para obtener ubicación actual
  const getCurrentLocation = async () => {
    try {
      setIsLoadingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Denegado', 'Necesitamos acceso a tu ubicación');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoordinates({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Obtener dirección legible
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addresses[0]) {
        const addr = addresses[0];
        const addressStr = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`.trim();
        setLocationAddress(addressStr);
        if (!locationName) {
          setLocationName(addr.name || addr.street || 'Mi ubicación');
        }
      }

      Alert.alert('Ubicación Obtenida', 'Ubicación agregada al evento');
    } catch (error) {
      console.error('Error obteniendo ubicación:', error);
      Alert.alert('Error', 'No se pudo obtener tu ubicación');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Función para seleccionar imagen
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Función para crear el evento
  const handleCreateEvent = async () => {
    // Validaciones
    if (!title.trim()) {
      Alert.alert('Error', 'El título del evento es obligatorio');
      return;
    }

    if (title.trim().length < 5) {
      Alert.alert('Error', 'El título debe tener al menos 5 caracteres');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'La descripción del evento es obligatoria');
      return;
    }

    if (eventDate < new Date()) {
      Alert.alert('Error', 'La fecha del evento debe ser futura');
      return;
    }

    if (hasMaxAttendees && (!maxAttendees || parseInt(maxAttendees) < 1)) {
      Alert.alert('Error', 'El número máximo de asistentes debe ser mayor a 0');
      return;
    }

    try {
      setIsLoading(true);

      // Subir imagen si existe
      let imageUrl: string | undefined;
      if (selectedImage) {
        setIsUploadingImage(true);
        imageUrl = await imageUploadService.uploadCommunityImage(selectedImage);
        setIsUploadingImage(false);
      }

      // Preparar datos del evento
      const postData: CreatePostData = {
        content: description.trim(),
        imageUrl,
        postType: 'event',
        eventData: {
          title: title.trim(),
          description: description.trim(),
          eventDate: eventDate.toISOString(),
          maxAttendees: hasMaxAttendees ? parseInt(maxAttendees) : undefined,
          requiresConfirmation: false,
        },
      };

      // Agregar ubicación si se proporcionó
      if (locationName.trim()) {
        postData.eventData!.location = {
          name: locationName.trim(),
          address: locationAddress.trim() || undefined,
          latitude: coordinates?.latitude,
          longitude: coordinates?.longitude,
        };
      }

      console.log('📅 [CREATE EVENT] Creando evento:', postData);

      // Crear el post/evento
      await communitiesService.createCommunityPost(communityId, postData);

      // ✅ Analytics: Evento creado
      analyticsService.logEvent('event_created', {
        community_id: communityId,
        community_name: communityName,
        event_title: title.trim(),
        has_image: !!imageUrl,
        has_location: !!locationName.trim(),
        has_max_attendees: hasMaxAttendees,
        max_attendees: hasMaxAttendees ? parseInt(maxAttendees) : undefined,
      });

      Alert.alert(
        '¡Evento Creado!',
        'Tu evento ha sido publicado en la comunidad',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ [CREATE EVENT] Error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo crear el evento'
      );
    } finally {
      setIsLoading(false);
      setIsUploadingImage(false);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(eventDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setEventDate(newDate);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(eventDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setEventDate(newDate);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#887CBC" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Evento</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Título del evento */}
        <View style={styles.section}>
          <Text style={styles.label}>Título del evento *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: Reunión de mamás en el parque"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text style={styles.helperText}>{title.length}/100</Text>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.label}>Descripción *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe los detalles del evento..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={styles.helperText}>{description.length}/500</Text>
        </View>

        {/* Fecha y hora */}
        <View style={styles.section}>
          <Text style={styles.label}>Fecha y hora *</Text>
          <View style={styles.dateTimeContainer}>
            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#887CBC" />
              <Text style={styles.dateTimeText}>
                {eventDate.toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateTimeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#887CBC" />
              <Text style={styles.dateTimeText}>
                {eventDate.toLocaleTimeString('es-ES', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ubicación */}
        <View style={styles.section}>
          <Text style={styles.label}>Ubicación (opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Nombre del lugar"
            value={locationName}
            onChangeText={setLocationName}
          />
          <TextInput
            style={[styles.input, styles.marginTop]}
            placeholder="Dirección"
            value={locationAddress}
            onChangeText={setLocationAddress}
          />
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={isLoadingLocation}
          >
            {isLoadingLocation ? (
              <ActivityIndicator size="small" color="#887CBC" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#887CBC" />
                <Text style={styles.locationButtonText}>
                  {coordinates ? 'Ubicación agregada ✓' : 'Usar mi ubicación actual'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Número máximo de asistentes */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setHasMaxAttendees(!hasMaxAttendees)}
          >
            <View style={[styles.checkbox, hasMaxAttendees && styles.checkboxActive]}>
              {hasMaxAttendees && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkboxLabel}>Limitar número de asistentes</Text>
          </TouchableOpacity>

          {hasMaxAttendees && (
            <TextInput
              style={[styles.input, styles.marginTop]}
              placeholder="Máximo de asistentes"
              value={maxAttendees}
              onChangeText={setMaxAttendees}
              keyboardType="number-pad"
            />
          )}
        </View>

        {/* Imagen */}
        <View style={styles.section}>
          <Text style={styles.label}>Imagen (opcional)</Text>
          {selectedImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={28} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
              <Ionicons name="image-outline" size={24} color="#887CBC" />
              <Text style={styles.imageButtonText}>Agregar imagen</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botón crear */}
        <TouchableOpacity
          style={[styles.createButton, isLoading && styles.createButtonDisabled]}
          onPress={handleCreateEvent}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.createButtonText}>
              {isUploadingImage ? 'Subiendo imagen...' : 'Crear Evento'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date/Time Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={eventDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={eventDate}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#887CBC',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Montserrat',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Montserrat',
    color: '#1F2937',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Montserrat',
    marginTop: 4,
    textAlign: 'right',
  },
  marginTop: {
    marginTop: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#887CBC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  locationButtonText: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#887CBC',
    borderColor: '#887CBC',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#887CBC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
  },
  imageButtonText: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  createButton: {
    backgroundColor: '#887CBC',
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
});

export default CreateEventScreen;
