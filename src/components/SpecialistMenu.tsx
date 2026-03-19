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
import Constants from 'expo-constants';
import BannerCarousel from './BannerCarousel';
import analyticsService from '../services/analyticsService';
import { locationsService, authService } from '../services/api';

const { width, height } = Dimensions.get('window');

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  badge?: string;
  onPress: () => void;
}

interface SpecialistMenuProps {
  visible: boolean;
  onClose: () => void;
  onSwitchToMunpa: () => void;
}

const SpecialistMenu: React.FC<SpecialistMenuProps> = ({ visible, onClose, onSwitchToMunpa }) => {
  const navigation = useNavigation();
  const { user, logout, setUser } = useAuth();
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Determinar el tipo de perfil profesional
  const accountType = user?.professionalProfile?.accountType || 'specialist';
  const isServiceProfile = accountType === 'service';
  const isMedicalProfile = !isServiceProfile; // Todos los demás son médicos

  // Obtener versión y build number
  const appVersion = Constants.expoConfig?.version || '0.0.0';
  const buildNumber = Platform.OS === 'ios' 
    ? Constants.expoConfig?.ios?.buildNumber || '1.0.0'
    : Constants.expoConfig?.android?.versionCode?.toString() || '1';

  const handleProfilePress = () => {
    onClose();
    // @ts-ignore
    navigation.navigate('Profile');
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

  // Menú para perfil MÉDICO (consultas)
  const medicalMenuItems: MenuItem[] = [
    {
      id: 'pending-consultations',
      title: 'Consultas Pendientes',
      icon: 'time',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_pending_consultations');
        // @ts-ignore - TODO: Filtrar por pendientes
        navigation.navigate('MyConsultations');
      },
    },
    {
      id: 'active-consultations',
      title: 'Consultas Activas',
      icon: 'chatbubbles',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_active_consultations');
        // @ts-ignore - TODO: Filtrar por activas
        navigation.navigate('MyConsultations');
      },
    },
    {
      id: 'history',
      title: 'Historial de Consultas',
      icon: 'document-text',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_history');
        // @ts-ignore
        navigation.navigate('MyConsultations');
      },
    },
    {
      id: 'earnings',
      title: 'Ganancias',
      icon: 'cash',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_earnings');
        // @ts-ignore - TODO: Crear pantalla de ganancias
        // navigation.navigate('SpecialistEarnings');
      },
    },
    {
      id: 'schedule',
      title: 'Mi Horario',
      icon: 'calendar',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_schedule');
        // @ts-ignore - TODO: Crear pantalla de horario
        // navigation.navigate('SpecialistSchedule');
      },
    },
    {
      id: 'profile',
      title: 'Mi Perfil Profesional',
      icon: 'person-circle',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_professional_profile');
        // @ts-ignore - TODO: Crear pantalla de perfil profesional
        // navigation.navigate('SpecialistProfile');
      },
    },
    {
      id: 'banners',
      title: 'Mis Banners',
      icon: 'images',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_banners');
        // @ts-ignore
        navigation.navigate('ManageBanners');
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
    {
      id: 'settings',
      title: 'Configuración',
      icon: 'settings',
      onPress: () => {
        onClose();
        analyticsService.logEvent('specialist_menu_settings');
        // Aquí puedes agregar navegación a configuración
      },
    },
    {
      id: 'logout',
      title: 'Cerrar Sesión',
      icon: 'log-out',
      onPress: () => {
        onClose();
        logout();
      },
    },
  ];

  // Menú para perfil de SERVICIO (productos/vendedor)
  const serviceMenuItems: MenuItem[] = [
    {
      id: 'profile',
      title: 'Mi Negocio',
      icon: 'storefront',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_business_profile');
        // @ts-ignore
        navigation.navigate('EditRecommendation');
      },
    },
    {
      id: 'banners',
      title: 'Mis Banners',
      icon: 'images',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_banners');
        // @ts-ignore
        navigation.navigate('ManageBanners');
      },
    },
    {
      id: 'create-product',
      title: 'Publicar Producto',
      icon: 'add-circle',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_create_product');
        // @ts-ignore
        navigation.navigate('VendorCreateProduct');
      },
    },
    {
      id: 'my-products',
      title: 'Mis Productos',
      icon: 'cube',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_my_products');
        // @ts-ignore
        navigation.navigate('MainTabs', { screen: 'Products' });
      },
    },
    {
      id: 'categories',
      title: 'Mis Categorías',
      icon: 'folder',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_categories');
        // @ts-ignore
        navigation.navigate('VendorCategories');
      },
    },
    {
      id: 'discounts',
      title: 'Mis Descuentos',
      icon: 'pricetag',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_discounts');
        // @ts-ignore
        navigation.navigate('VendorDiscounts');
      },
    },
    {
      id: 'promotions',
      title: 'Promociones',
      icon: 'gift',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_promotions');
        // @ts-ignore
        navigation.navigate('VendorPromotions');
      },
    },
    {
      id: 'sales',
      title: 'Mis Ventas',
      icon: 'cash',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_sales');
        // @ts-ignore - TODO: Navegar a historial de ventas
        // navigation.navigate('MySales');
      },
    },
    {
      id: 'messages',
      title: 'Mensajes',
      icon: 'chatbubbles',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_messages');
        // @ts-ignore - TODO: Navegar a mensajes
        // navigation.navigate('Messages');
      },
    },
    {
      id: 'business-hours',
      title: 'Horario de Apertura',
      icon: 'time',
      onPress: () => {
        onClose();
        analyticsService.logEvent('service_menu_hours');
        // @ts-ignore - TODO: Navegar a horario de apertura
        // navigation.navigate('BusinessHours');
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
    {
      id: 'logout',
      title: 'Cerrar Sesión',
      icon: 'log-out',
      onPress: () => {
        onClose();
        logout();
      },
    },
  ];

  // Seleccionar menú según el tipo de perfil
  const menuItems = isMedicalProfile ? medicalMenuItems : serviceMenuItems;

  return (
    <>
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.menuContainer}>
          {/* Header del menú - MORADO */}
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
                  {user?.displayName || 'Profesional'}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
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
                <View style={styles.specialistBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#887CBC" />
                  <Text style={styles.specialistBadgeText}>
                    {isMedicalProfile ? 'Profesional Médico' : 'Negocio Verificado'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" style={styles.userChevron} />
            </TouchableOpacity>
            
            {/* Botón para volver a Modo Munpa */}
            <TouchableOpacity
              style={styles.modeSwitcher}
              onPress={onSwitchToMunpa}
              activeOpacity={0.8}
            >
              <Ionicons name="home" size={20} color="#FFFFFF" />
              <Text style={styles.modeSwitcherText}>
                Volver a Modo Padre
              </Text>
            </TouchableOpacity>
            
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
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon as any} size={22} color="#887CBC" />
                  </View>
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
                section="menu-lateral-specialist"
                fallbackToHome={true}
                bannerHeight={120}
                bannerWidth={width * 0.75}
                autoScroll={true}
                showIndicators={false}
              />
            </View>
          </ScrollView>

          {/* Footer del menú */}
          <View style={styles.menuFooter}>
            <View style={styles.specialistModeIndicator}>
              <Ionicons name={isMedicalProfile ? "medical" : "storefront"} size={16} color="#887CBC" />
              <Text style={styles.specialistModeText}>
                {isMedicalProfile ? 'Modo Profesional Médico' : 'Modo Negocio'}
              </Text>
            </View>
            <Text style={styles.versionText}>
              Munpa Professional v{appVersion}
            </Text>
            <Text style={styles.buildText}>
              Build {buildNumber} • {Platform.OS === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>

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
  </>
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
    backgroundColor: '#F5F3FF', // Morado muy claro
    borderBottomWidth: 2,
    borderBottomColor: '#887CBC',
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#887CBC',
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
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  locationText: {
    fontSize: 13,
    color: '#887CBC',
    flex: 1,
  },
  specialistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  specialistBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#887CBC',
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
    backgroundColor: '#887CBC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeSwitcherText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
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
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
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
    borderTopWidth: 2,
    borderTopColor: '#887CBC',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
  },
  specialistModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
    gap: 6,
  },
  specialistModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#887CBC',
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

export default SpecialistMenu;
