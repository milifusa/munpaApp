import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import api from '../services/api';
import { colors } from '../styles/globalStyles';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface Category {
  id: string;
  name: string;
  description: string;
  icon?: string;
}

const AddRecommendationScreen = ({ navigation }: any) => {
  const route = useRoute<any>();
  const preselectedCategoryId = route.params?.categoryId as string | undefined;
  const insets = useSafeAreaInsets();
  // Estados del formulario
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  
  // Estados de control
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (preselectedCategoryId) {
      setCategoryId(preselectedCategoryId);
    }
  }, [preselectedCategoryId]);

  const loadCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
      Alert.alert('Error', 'No se pudieron cargar las categorías');
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!categoryId) {
      Alert.alert('Error', 'Por favor selecciona una categoría');
      return;
    }
    
    if (!name.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del lugar');
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedCategory = categories.find((category) => category.id === categoryId);
      const response = await api.createRecommendation({
        categoryId,
        name: name.trim(),
        description: description.trim(),
        address: address.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        facebook: facebook.trim(),
        instagram: instagram.trim(),
        twitter: twitter.trim(),
        whatsapp: whatsapp.trim(),
      });

      if (response.success) {
        Alert.alert(
          '¡Éxito!',
          'Tu recomendación ha sido enviada para revisión. Te notificaremos cuando sea aprobada.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.message || 'No se pudo crear la recomendación');
      }
    } catch (error: any) {
      console.error('Error creando recomendación:', error);
      Alert.alert('Error', error.message || 'No se pudo crear la recomendación');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agregar Recomendación</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Descripción */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#59C6C0" />
            <Text style={styles.infoText}>
              Tu recomendación será revisada por nuestro equipo antes de ser publicada.
            </Text>
          </View>

          {/* Categoría */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Categoría <Text style={styles.required}>*</Text>
            </Text>
            {isLoadingCategories ? (
              <ActivityIndicator size="small" color="#59C6C0" />
            ) : (
              <View style={styles.categoryGrid}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      categoryId === category.id && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategoryId(category.id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        categoryId === category.id && styles.categoryChipTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Nombre */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Nombre del lugar <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Restaurante La Casa de María"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Cuéntanos sobre este lugar..."
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Dirección */}
          <View style={styles.section}>
            <Text style={styles.label}>Dirección</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Av. Principal #123, Col. Centro"
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#999"
            />
          </View>

          {/* Contacto */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="call-outline" size={18} color="#2C3E50" /> Contacto
            </Text>

            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +52 123 456 7890"
              value={phone}
              onChangeText={setPhone}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: contacto@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>WhatsApp</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: +52 123 456 7890"
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Redes Sociales y Web */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              <Ionicons name="globe-outline" size={18} color="#2C3E50" /> Web y Redes Sociales
            </Text>

            <Text style={styles.label}>Sitio Web</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: https://www.ejemplo.com"
              value={website}
              onChangeText={setWebsite}
              placeholderTextColor="#999"
              keyboardType="url"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Facebook</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={facebook}
              onChangeText={setFacebook}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Instagram</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={instagram}
              onChangeText={setInstagram}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Twitter</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: @nombredellugar"
              value={twitter}
              onChangeText={setTwitter}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />
          </View>

          {/* Botón de enviar */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.submitButtonText}>Enviar Recomendación</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Espacio adicional */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 12,
    backgroundColor: colors.primary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F7F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 18,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#2C3E50',
    marginBottom: 12,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  categoryChipSelected: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: 'white',
  },
  submitButton: {
    backgroundColor: '#59C6C0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddRecommendationScreen;
