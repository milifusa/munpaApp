import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  Image,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useViewMode } from '../contexts/ViewModeContext';
import Constants from 'expo-constants';
import BannerCarousel from './BannerCarousel';
import analyticsService from '../services/analyticsService';
import SpecialistMenu from './SpecialistMenu';
import { locationsService, authService } from '../services/api';

const { width, height } = Dimensions.get('window');

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  onPress: () => void;
}

interface GlobalMenuProps {
  visible: boolean;
  onClose: () => void;
}

const GlobalMenu: React.FC<GlobalMenuProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user, logout, setUser } = useAuth();
  const { viewMode, setViewMode, isSpecialistMode } = useViewMode();
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Si es especialista, mostrar el menú de especialista
  if (isSpecialistMode && user?.professionalProfile?.isActive) {
    return (
      <SpecialistMenu
        visible={visible}
        onClose={onClose}
        onSwitchToMunpa={async () => {
          try {
            console.log('🔄 [MENU] Iniciando cambio a modo Munpa...');
            
            // Cambiar el modo
            await setViewMode('munpa');
            
            // Cerrar el menú
            onClose();
            
            console.log('✅ [MENU] Modo cambiado, navegando al Home...');
            
            // Navegar al Home con parámetro para forzar recarga
            // @ts-ignore
            navigation.navigate('MainTabs', { 
              screen: 'Home',
              params: {
                screen: 'HomeMain',
                params: { 
                  refresh: Date.now(),
                  mode: 'munpa'
                }
              }
            });
            
          } catch (error) {
            console.error('❌ [MENU] Error cambiando modo:', error);
          }
        }}
      />
    );
  }

  // Obtener versión y build number
  const appVersion = Constants.expoConfig?.version || '0.0.0';
  const buildNumber = Platform.OS === 'ios' 
    ? Constants.expoConfig?.ios?.buildNumber || '1.0.0'
    : Constants.expoConfig?.android?.versionCode?.toString() || '1';

  // Verificar si el usuario tiene perfil profesional activo
  const hasProfessionalProfile = user?.professionalProfile?.isActive === true;
  
  console.log('👤 [MENU] Usuario:', {
    name: user?.displayName,
    hasProfessionalProfile,
    professionalProfile: user?.professionalProfile,
    viewMode,
  });

  const handleProfilePress = () => {
    onClose();
    // @ts-ignore
    navigation.navigate('Profile');
  };

  const toggleViewMode = async () => {
    try {
      console.log('🔄 [MENU] Iniciando cambio a modo especialista...');
      
      // Cambiar el modo
      await setViewMode('specialist');
      
      // Cerrar el menú
      onClose();
      
      console.log('✅ [MENU] Modo cambiado, navegando al Home...');
      
      // Navegar al Home con parámetro para forzar recarga
      // @ts-ignore
      navigation.navigate('MainTabs', { 
        screen: 'Home',
        params: {
          screen: 'HomeMain',
          params: { 
            refresh: Date.now(),
            mode: 'specialist'
          }
        }
      });
      
    } catch (error) {
      console.error('❌ [MENU] Error cambiando modo:', error);
    }
  };

  const handleLocationPress = () => {
    setShowLocationModal(true);
    loadCountries();
  };

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const response = await locationsService.getCountries();
      let countriesData: any[] = [];
      if (response?.success && Array.isArray(response?.data)) {
        countriesData = response.data;
      } else if (Array.isArray(response?.data?.countries)) {
        countriesData = response.data.countries;
      } else if (Array.isArray(response?.data)) {
        countriesData = response.data;
      }
      setCountries(countriesData);
    } catch (error) {
      console.error('Error cargando países:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  const loadCities = async (countryId: string) => {
    try {
      setLoadingCities(true);
      const response = await locationsService.getCities(countryId);
      let citiesData: any[] = [];
      if (response?.success && Array.isArray(response?.data)) {
        citiesData = response.data;
      } else if (Array.isArray(response?.data?.cities)) {
        citiesData = response.data.cities;
      } else if (Array.isArray(response?.data)) {
        citiesData = response.data;
      }
      setCities(citiesData);
    } catch (error) {
      console.error('Error cargando ciudades:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  const handleCountrySelect = (countryId: string) => {
    setSelectedCountryId(countryId);
    setSelectedCityId(null);
    setCities([]);
    loadCities(countryId);
  };

  const handleSaveLocation = async () => {
    if (!selectedCountryId || !selectedCityId) {
      Alert.alert('Error', 'Por favor selecciona país y ciudad');
      return;
    }
    try {
      setLoadingLocation(true);
      const selectedCountry = countries.find(c => c.id === selectedCountryId);
      const selectedCity = cities.find(c => c.id === selectedCityId);
      const response = await authService.updateLocation({
        latitude: 0,
        longitude: 0,
        countryId: selectedCountryId,
        cityId: selectedCityId,
      });
      if (response?.success && user) {
        setUser({
          ...user,
          countryId: selectedCountryId,
          cityId: selectedCityId,
          countryName: selectedCountry?.name,
          cityName: selectedCity?.name,
        });
        setShowLocationModal(false);
        onClose();
        Alert.alert('Éxito', 'Ubicación actualizada correctamente');
        (navigation as any).reset({
          index: 0,
          routes: [{ name: 'MainTabs', state: { routes: [{ name: 'Home' }], index: 0 } }],
        });
      } else {
        Alert.alert('Error', 'No se pudo actualizar la ubicación');
      }
    } catch (error) {
      console.error('Error guardando ubicación:', error);
      Alert.alert('Error', 'No se pudo actualizar la ubicación');
    } finally {
      setLoadingLocation(false);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: 'specialists',
      title: 'Consultar Especialista',
      icon: 'medical',
      onPress: () => {
        onClose();
        try {
          // @ts-ignore - Intentar navegación directa primero
          navigation.navigate('SpecialistsList');
        } catch (e) {
          // Si falla, intentar navegación desde el root
          // @ts-ignore
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('SpecialistsList');
          }
        }
      },
    },
    {
      id: 'my-consultations',
      title: 'Mis Consultas',
      icon: 'chatbubbles',
      onPress: () => {
        onClose();
        try {
          // @ts-ignore
          navigation.navigate('MyConsultations');
        } catch (e) {
          // @ts-ignore
          const parent = navigation.getParent();
          if (parent) {
            parent.navigate('MyConsultations');
          }
        }
      },
    },
    {
      id: 'market',
      title: 'Munpa Market',
      icon: 'cart',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('MainTabs', { screen: 'MunpaMarket' });
      },
    },
    {
      id: 'children',
      title: 'Mis Hijos',
      icon: 'people',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('ChildrenList');
      },
    },
    {
      id: 'notifications',
      title: 'Notificaciones',
      icon: 'notifications',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('Notifications');
      },
    },
  ];

  // Agregar "Ofrecer Servicio" solo si NO tiene perfil profesional
  if (!hasProfessionalProfile) {
    menuItems.push({
      id: 'service-request',
      title: 'Ofrecer Servicio',
      icon: 'briefcase',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('ServiceRequest');
      },
    });
  }

  // Agregar opciones finales
  menuItems.push(
    // TODO: Descomentar cuando se implemente la pantalla de configuración
    // {
    //   id: 'settings',
    //   title: 'Configuración',
    //   icon: 'settings',
    //   onPress: () => {
    //     onClose();
    //     // Aquí puedes agregar navegación a configuración
    //   },
    // },
    {
      id: 'logout',
      title: 'Cerrar Sesión',
      icon: 'log-out',
      onPress: () => {
        onClose();
        logout();
      },
    }
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.menuContainer}>
          {/* Header del menú */}
          <View style={styles.menuHeader}>
            <TouchableOpacity 
              style={styles.userInfo}
              onPress={handleProfilePress}
              activeOpacity={0.7}
            >
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={40} color="#887CBC" />
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  ¡Hola {user?.displayName || 'Mishuuu'}!
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {/* Ciudad y país debajo del perfil */}
                <TouchableOpacity
                  style={styles.locationRow}
                  onPress={handleLocationPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={16} color="#887CBC" />
                  <Text style={styles.locationText} numberOfLines={1}>
                    {(user?.cityName || user?.countryName)
                      ? `${user?.cityName || ''}${user?.cityName && user?.countryName ? ', ' : ''}${user?.countryName || ''}`
                      : 'Seleccionar ubicación'}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="#999" />
                </TouchableOpacity>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" style={styles.userChevron} />
            </TouchableOpacity>
            
            {/* Botón para cambiar de modo si es profesional */}
            {hasProfessionalProfile && (
              <TouchableOpacity
                style={styles.modeSwitcher}
                onPress={toggleViewMode}
                activeOpacity={0.8}
              >
                <Ionicons name="medical" size={20} color="#887CBC" />
                <Text style={styles.modeSwitcherText}>
                  Cambiar a Modo Profesional
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Lista de opciones del menú */}
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name={item.icon as any} size={24} color="#887CBC" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                  {item.badge && (
                    <Text style={styles.menuBadge}>{item.badge}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            ))}

            {/* Banner del menú lateral */}
            <View style={styles.bannerContainer}>
              <BannerCarousel 
                section="menu-lateral"
                fallbackToHome={false}
                bannerHeight={120}
                bannerWidth={width * 0.75}
                autoScroll={true}
                showIndicators={false}
              />
            </View>
          </ScrollView>

          {/* Footer del menú */}
          <View style={styles.menuFooter}>
            <Text style={styles.versionText}>
              Munpa App v{appVersion}
            </Text>
            <Text style={styles.buildText}>
              Build {buildNumber} • {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
        </View>
      </View>

      {/* Modal para cambiar ubicación */}
      <Modal
        visible={showLocationModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalCard}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>Cambiar ubicación</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#4A5568" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.locationModalContent}>
              <Text style={styles.locationModalLabel}>País</Text>
              <View style={styles.locationPickerContainer}>
                {loadingCountries ? (
                  <ActivityIndicator color="#59C6C0" style={{ marginVertical: 20 }} />
                ) : countries.length > 0 ? (
                  countries.map((country) => (
                    <TouchableOpacity
                      key={country.id}
                      style={[
                        styles.locationPickerItem,
                        selectedCountryId === country.id && styles.locationPickerItemSelected
                      ]}
                      onPress={() => handleCountrySelect(country.id)}
                    >
                      <Text style={[
                        styles.locationPickerItemText,
                        selectedCountryId === country.id && styles.locationPickerItemTextSelected
                      ]}>
                        {country.name}
                      </Text>
                      {selectedCountryId === country.id && (
                        <Ionicons name="checkmark-circle" size={18} color="#59C6C0" />
                      )}
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={styles.locationEmptyText}>No hay países disponibles</Text>
                )}
              </View>
              {selectedCountryId && (
                <>
                  <Text style={styles.locationModalLabel}>Ciudad</Text>
                  <View style={styles.locationPickerContainer}>
                    {loadingCities ? (
                      <ActivityIndicator color="#59C6C0" style={{ marginVertical: 20 }} />
                    ) : cities.length > 0 ? (
                      cities.map((city) => (
                        <TouchableOpacity
                          key={city.id}
                          style={[
                            styles.locationPickerItem,
                            selectedCityId === city.id && styles.locationPickerItemSelected
                          ]}
                          onPress={() => setSelectedCityId(city.id)}
                        >
                          <Text style={[
                            styles.locationPickerItemText,
                            selectedCityId === city.id && styles.locationPickerItemTextSelected
                          ]}>
                            {city.name}
                          </Text>
                          {selectedCityId === city.id && (
                            <Ionicons name="checkmark-circle" size={18} color="#59C6C0" />
                          )}
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.locationEmptyText}>No hay ciudades disponibles</Text>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.locationModalSaveButton,
                (!selectedCountryId || !selectedCityId) && styles.locationModalSaveButtonDisabled
              ]}
              onPress={handleSaveLocation}
              disabled={!selectedCountryId || !selectedCityId || loadingLocation}
            >
              {loadingLocation ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.locationModalSaveButtonText}>Guardar cambios</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.85,
    height: height,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 40,
  },
  userChevron: {
    marginLeft: 'auto',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#887CBC',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
  },
  modeSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
  },
  modeSwitcherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
    flex: 1,
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  menuBadge: {
    fontSize: 16,
    marginLeft: 8,
  },
  bannerContainer: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
    marginBottom: 4,
  },
  buildText: {
    fontSize: 11,
    color: '#999',
  },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  locationModalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  locationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationModalContent: {
    padding: 20,
    maxHeight: 400,
  },
  locationModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
    marginBottom: 10,
    marginTop: 16,
  },
  locationPickerContainer: {
    gap: 8,
  },
  locationPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F7FAFC',
    marginBottom: 6,
  },
  locationPickerItemSelected: {
    backgroundColor: '#E6FFFA',
    borderWidth: 1,
    borderColor: '#59C6C0',
  },
  locationPickerItemText: {
    fontSize: 15,
    color: '#4A5568',
  },
  locationPickerItemTextSelected: {
    color: '#2C7A7B',
    fontWeight: '600',
  },
  locationEmptyText: {
    fontSize: 14,
    color: '#999',
    paddingVertical: 20,
  },
  locationModalSaveButton: {
    backgroundColor: '#59C6C0',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  locationModalSaveButtonDisabled: {
    backgroundColor: '#B2DFDB',
    opacity: 0.7,
  },
  locationModalSaveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default GlobalMenu;
