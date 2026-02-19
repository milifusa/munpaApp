import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import consultationsService, { Specialist, SPECIALTIES } from '../services/consultationsService';
import analyticsService from '../services/analyticsService';

const MUNPA_PRIMARY = '#96d2d3';

const SpecialistsListScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadSpecialists();
    analyticsService.logScreenView('SpecialistsList');
  }, [selectedSpecialty]);

  const loadSpecialists = async (isRefresh: boolean = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await consultationsService.getSpecialists(selectedSpecialty, true);
      const specialistsData = response.data || response;
      
      setSpecialists(Array.isArray(specialistsData) ? specialistsData : []);
      
      analyticsService.logEvent('specialists_list_viewed', {
        specialty: selectedSpecialty || 'all',
        specialists_count: specialistsData.length,
      });
    } catch (error) {
      console.error('❌ [SPECIALISTS] Error cargando especialistas:', error);
      setSpecialists([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSpecialistPress = (specialist: Specialist) => {
    analyticsService.logEvent('specialist_selected', {
      specialist_id: specialist.id,
      specialist_name: specialist.displayName,
      specialties: specialist.specialties.join(', '),
    });
    
    navigation.navigate('ConsultationRequest', { 
      specialistId: specialist.id,
      specialistName: specialist.displayName,
    });
  };

  const handleRefresh = () => {
    loadSpecialists(true);
  };

  const renderSpecialtyFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.specialtyFilters}
      contentContainerStyle={styles.specialtyFiltersContent}
    >
      <TouchableOpacity
        style={[styles.specialtyButton, !selectedSpecialty && styles.specialtyButtonActive]}
        onPress={() => setSelectedSpecialty(undefined)}
      >
        <Text style={[styles.specialtyButtonText, !selectedSpecialty && styles.specialtyButtonTextActive]}>
          Todos
        </Text>
      </TouchableOpacity>
      
      {SPECIALTIES.map((specialty) => (
        <TouchableOpacity
          key={specialty.id}
          style={[styles.specialtyButton, selectedSpecialty === specialty.name && styles.specialtyButtonActive]}
          onPress={() => setSelectedSpecialty(specialty.name)}
        >
          <Text style={styles.specialtyIcon}>{specialty.icon}</Text>
          <Text style={[styles.specialtyButtonText, selectedSpecialty === specialty.name && styles.specialtyButtonTextActive]}>
            {specialty.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSpecialist = (specialist: Specialist) => (
    <View
      key={specialist.id}
      style={styles.specialistCard}
    >
      <View style={styles.specialistHeader}>
        <Image
          source={specialist.photoUrl ? { uri: specialist.photoUrl } : require('../../assets/icon.png')}
          style={styles.specialistPhoto}
        />
        <View style={styles.specialistInfo}>
          <Text style={styles.specialistName}>{specialist.displayName}</Text>
          <View style={styles.specialtiesContainer}>
            {specialist.specialties.slice(0, 2).map((specialty, index) => (
              <View key={index} style={styles.specialtyTag}>
                <Text style={styles.specialtyTagText}>{specialty}</Text>
              </View>
            ))}
          </View>
          {specialist.stats && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.statText}>{specialist.stats.averageRating.toFixed(1)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle" size={14} color={MUNPA_PRIMARY} />
                <Text style={styles.statText}>{specialist.stats.totalConsultations} consultas</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {specialist.bio && (
        <Text style={styles.specialistBio} numberOfLines={2}>
          {specialist.bio}
        </Text>
      )}

      <View style={styles.pricingRow}>
        <View style={styles.priceItem}>
          <Ionicons name="chatbubbles" size={18} color={MUNPA_PRIMARY} />
          <Text style={styles.priceLabel}>Chat</Text>
          <Text style={styles.priceValue}>${specialist.pricing.chatConsultation}</Text>
        </View>
        <View style={styles.priceItem}>
          <Ionicons name="videocam" size={18} color="#887CBC" />
          <Text style={styles.priceLabel}>Video</Text>
          <Text style={styles.priceValue}>${specialist.pricing.videoConsultation}</Text>
        </View>
        {specialist.pricing.acceptsFreeConsultations && (
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>🎁 Acepta consultas gratis</Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.consultButton}
        onPress={() => handleSpecialistPress(specialist)}
        activeOpacity={0.7}
      >
        <Text style={styles.consultButtonText}>Consultar</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
        <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Consultar Especialista</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
          <Text style={styles.loadingText}>Cargando especialistas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={MUNPA_PRIMARY} />
      
      {/* Header */}
      <LinearGradient colors={['#59C6C0', '#4DB8B3']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Consultar Especialista</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[MUNPA_PRIMARY]} />
        }
      >
        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={24} color={MUNPA_PRIMARY} />
          <View style={styles.infoBannerText}>
            <Text style={styles.infoBannerTitle}>Consulta con expertos</Text>
            <Text style={styles.infoBannerDescription}>
              Conecta con pediatras y especialistas certificados
            </Text>
          </View>
        </View>

        {/* Specialty Filters */}
        {renderSpecialtyFilter()}

        {/* Lista de especialistas */}
        <View style={styles.specialistsList}>
          {specialists.length > 0 ? (
            specialists.map(renderSpecialist)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No hay especialistas disponibles</Text>
              <Text style={styles.emptyStateText}>
                {selectedSpecialty 
                  ? `No hay especialistas en ${selectedSpecialty} disponibles en este momento.`
                  : 'No hay especialistas disponibles en este momento.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  infoBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  infoBannerDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  specialtyFilters: {
    marginTop: 16,
  },
  specialtyFiltersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  specialtyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  specialtyButtonActive: {
    backgroundColor: MUNPA_PRIMARY,
    borderColor: MUNPA_PRIMARY,
  },
  specialtyIcon: {
    fontSize: 16,
  },
  specialtyButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  specialtyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  specialistsList: {
    padding: 16,
  },
  specialistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialistHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  specialistPhoto: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
  },
  specialistInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  specialistName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  specialtyTag: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  specialtyTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  specialistBio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
    gap: 16,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  freeBadge: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MUNPA_PRIMARY,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  consultButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default SpecialistsListScreen;
