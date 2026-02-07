import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { locationsService, authService } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationModalProps {
  visible: boolean;
  onComplete: () => void;
}

interface Country {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  countryId: string;
}

const RequiredLocationModal: React.FC<LocationModalProps> = ({ visible, onComplete }) => {
  const { user, setUser } = useAuth();
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCountries();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCountryId) {
      loadCities(selectedCountryId);
    } else {
      setCities([]);
      setSelectedCityId(null);
    }
  }, [selectedCountryId]);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      
      console.log('🌍 [LOCATION MODAL] Cargando países...');
      
      const response = await locationsService.getCountries();
      
      console.log('🌍 [LOCATION MODAL] Respuesta países:', response);
      
      // Intentar diferentes estructuras de respuesta
      let countriesData = [];
      if (response.success && Array.isArray(response.data)) {
        countriesData = response.data;
      } else if (Array.isArray(response.data?.countries)) {
        countriesData = response.data.countries;
      } else if (Array.isArray(response.countries)) {
        countriesData = response.countries;
      } else if (Array.isArray(response)) {
        countriesData = response;
      } else if (Array.isArray(response.data)) {
        countriesData = response.data;
      }
      
      console.log('🌍 [LOCATION MODAL] Países procesados:', countriesData.length);
      setCountries(countriesData);
      
      if (countriesData.length === 0) {
        Alert.alert('Aviso', 'No se pudieron cargar los países. Por favor intenta de nuevo.');
      }
    } catch (error: any) {
      console.error('❌ [LOCATION MODAL] Error cargando países:', error);
      console.error('❌ [LOCATION MODAL] Error details:', error.response?.data);
      Alert.alert('Error', 'No se pudieron cargar los países. Verifica tu conexión.');
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async (countryId: string) => {
    try {
      setLoadingCities(true);
      
      console.log('🏙️ [LOCATION MODAL] Cargando ciudades para país:', countryId);
      
      const response = await locationsService.getCities(countryId);
      
      console.log('🏙️ [LOCATION MODAL] Respuesta ciudades:', response);
      
      // Intentar diferentes estructuras de respuesta
      let citiesData = [];
      if (response.success && Array.isArray(response.data)) {
        citiesData = response.data;
      } else if (Array.isArray(response.data?.cities)) {
        citiesData = response.data.cities;
      } else if (Array.isArray(response.cities)) {
        citiesData = response.cities;
      } else if (Array.isArray(response)) {
        citiesData = response;
      } else if (Array.isArray(response.data)) {
        citiesData = response.data;
      }
      
      console.log('🏙️ [LOCATION MODAL] Ciudades procesadas:', citiesData.length);
      setCities(citiesData);
      
      if (citiesData.length === 0) {
        Alert.alert('Aviso', 'No se encontraron ciudades para este país.');
      }
    } catch (error: any) {
      console.error('❌ [LOCATION MODAL] Error cargando ciudades:', error);
      console.error('❌ [LOCATION MODAL] Error details:', error.response?.data);
      Alert.alert('Error', 'No se pudieron cargar las ciudades. Verifica tu conexión.');
    } finally {
      setLoadingCities(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCountryId || !selectedCityId) {
      Alert.alert('Campos requeridos', 'Por favor selecciona país y ciudad');
      return;
    }

    try {
      setSaving(true);
      const selectedCountry = countries.find(c => c.id === selectedCountryId);
      const selectedCity = cities.find(c => c.id === selectedCityId);

      console.log('💾 [LOCATION MODAL] Guardando ubicación:', {
        countryId: selectedCountryId,
        cityId: selectedCityId,
        countryName: selectedCountry?.name,
        cityName: selectedCity?.name,
      });

      const response = await authService.updateLocation({
        countryId: selectedCountryId,
        cityId: selectedCityId,
      });

      console.log('✅ [LOCATION MODAL] Ubicación guardada:', response);

      if (response.success) {
        // Actualizar el usuario en el contexto
        if (setUser && user) {
          setUser({
            ...user,
            countryId: selectedCountryId,
            cityId: selectedCityId,
            countryName: selectedCountry?.name,
            cityName: selectedCity?.name,
          });
        }
        
        Alert.alert('Éxito', 'Ubicación guardada correctamente');
        onComplete();
      } else {
        Alert.alert('Error', 'No se pudo guardar la ubicación');
      }
    } catch (error: any) {
      console.error('❌ [LOCATION MODAL] Error guardando ubicación:', error);
      console.error('❌ [LOCATION MODAL] Error details:', error.response?.data);
      Alert.alert('Error', 'No se pudo guardar la ubicación');
    } finally {
      setSaving(false);
    }
  };

  const selectedCountry = countries.find(c => c.id === selectedCountryId);
  const selectedCity = cities.find(c => c.id === selectedCityId);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="location" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Selecciona tu ubicación</Text>
          <Text style={styles.headerSubtitle}>
            Necesitamos saber tu ubicación para mostrarte contenido relevante
          </Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* País */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              País <Text style={styles.required}>*</Text>
            </Text>
            <TouchableOpacity 
              style={styles.selector}
              onPress={() => {}}
              disabled={loadingCountries}
            >
              <Text style={[styles.selectorText, !selectedCountry && styles.placeholderText]}>
                {loadingCountries ? 'Cargando...' : selectedCountry?.name || 'Selecciona un país'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Lista de países */}
            {loadingCountries && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#96d2d3" />
                <Text style={styles.loadingText}>Cargando países...</Text>
              </View>
            )}
            
            {!loadingCountries && !selectedCountryId && countries.length > 0 && (
              <ScrollView style={styles.optionsList} nestedScrollEnabled>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.id}
                    style={styles.optionItem}
                    onPress={() => setSelectedCountryId(country.id)}
                  >
                    <Text style={styles.optionText}>{country.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            {!loadingCountries && countries.length === 0 && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={24} color="#EF4444" />
                <Text style={styles.errorText}>No se pudieron cargar los países</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadCountries}
                >
                  <Ionicons name="refresh" size={16} color="#96d2d3" />
                  <Text style={styles.retryText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Ciudad */}
          {selectedCountryId && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>
                Ciudad <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity 
                style={styles.selector}
                onPress={() => {}}
                disabled={loadingCities}
              >
                <Text style={[styles.selectorText, !selectedCity && styles.placeholderText]}>
                  {loadingCities ? 'Cargando...' : selectedCity?.name || 'Selecciona una ciudad'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Lista de ciudades */}
              {!selectedCityId && cities.length > 0 && (
                <ScrollView style={styles.optionsList} nestedScrollEnabled>
                  {cities.map((city) => (
                    <TouchableOpacity
                      key={city.id}
                      style={styles.optionItem}
                      onPress={() => setSelectedCityId(city.id)}
                    >
                      <Text style={styles.optionText}>{city.name}</Text>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              Esta información nos ayuda a mostrarte contenido, productos y servicios relevantes para tu ubicación.
            </Text>
          </View>
        </ScrollView>

        {/* Footer con botón */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!selectedCountryId || !selectedCityId || saving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!selectedCountryId || !selectedCityId || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Guardar ubicación</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  header: {
    backgroundColor: '#96d2d3',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectorText: {
    fontSize: 15,
    color: '#1F2937',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  optionsList: {
    maxHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 15,
    color: '#1F2937',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Montserrat',
    lineHeight: 20,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  errorBox: {
    alignItems: 'center',
    padding: 20,
    gap: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 4,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#96d2d3',
    fontFamily: 'Montserrat',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#96d2d3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
});

export default RequiredLocationModal;
