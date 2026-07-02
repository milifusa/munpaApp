import React, { useMemo, useState, useEffect } from 'react';
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
  TextInput,
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
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredSpecialists = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return specialists;

    return specialists.filter((specialist) => {
      const searchable = [
        specialist.displayName,
        specialist.bio,
        specialist.university,
        specialist.licenseNumber,
        ...specialist.specialties,
        ...(specialist.certifications || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [searchQuery, specialists]);

  const featuredSpecialists = useMemo(() => {
    return [...filteredSpecialists]
      .sort((a, b) => {
        const bScore = (b.stats?.averageRating || 0) * 10 + (b.stats?.totalConsultations || 0);
        const aScore = (a.stats?.averageRating || 0) * 10 + (a.stats?.totalConsultations || 0);
        return bScore - aScore;
      })
      .slice(0, 4);
  }, [filteredSpecialists]);

  const getInitials = (name: string = 'Especialista') => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part[0]).join('');
    return initials.toUpperCase() || 'DR';
  };

  const getAvailabilityLabel = (specialist: Specialist) => {
    if (specialist.availability?.maxConsultationsPerDay) return 'Disponible hoy';
    return 'Consulta online';
  };

  const getResponseLabel = (specialist: Specialist) => {
    const responseTime = specialist.stats?.responseTime;
    if (!responseTime || responseTime <= 0) return null;
    if (responseTime < 60) return `Responde en ${responseTime} min`;
    const hours = Math.round(responseTime / 60);
    return `Responde en ${hours} h`;
  };

  const hasRating = (specialist: Specialist) => Boolean(specialist.stats?.averageRating && specialist.stats.averageRating > 0);
  const hasConsultations = (specialist: Specialist) => Boolean(specialist.stats?.totalConsultations && specialist.stats.totalConsultations > 0);

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

  const renderAvatar = (specialist: Specialist, size: 'small' | 'regular' = 'regular') => {
    const avatarStyle = size === 'small' ? styles.featuredAvatar : styles.specialistPhoto;
    const initialsStyle = size === 'small' ? styles.featuredAvatarInitials : styles.specialistInitialsText;

    if (specialist.photoUrl) {
      return <Image source={{ uri: specialist.photoUrl }} style={avatarStyle} />;
    }

    return (
      <View style={[avatarStyle, styles.specialistInitials]}>
        <Text style={initialsStyle}>{getInitials(specialist.displayName)}</Text>
      </View>
    );
  };

  const renderFeaturedSpecialist = (specialist: Specialist) => (
    <TouchableOpacity
      key={specialist.id}
      style={styles.featuredCard}
      onPress={() => handleSpecialistPress(specialist)}
      activeOpacity={0.86}
    >
      {renderAvatar(specialist, 'small')}
      <Text style={styles.featuredName} numberOfLines={1}>{specialist.displayName}</Text>
      <Text style={styles.featuredSpecialty} numberOfLines={1}>
        {specialist.specialties[0] || 'Especialista'}
      </Text>
      <View style={styles.featuredAvailability}>
        <View style={styles.availabilityDot} />
        <Text style={styles.featuredAvailabilityText}>{getAvailabilityLabel(specialist)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSpecialist = (specialist: Specialist) => {
    const responseLabel = getResponseLabel(specialist);

    return (
      <TouchableOpacity
        key={specialist.id}
        style={styles.specialistCard}
        onPress={() => handleSpecialistPress(specialist)}
        activeOpacity={0.88}
      >
        <View style={styles.specialistHeader}>
          {renderAvatar(specialist)}
          <View style={styles.specialistInfo}>
            <View style={styles.specialistNameRow}>
              <Text style={styles.specialistName} numberOfLines={2}>{specialist.displayName}</Text>
              <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
            </View>
            <View style={styles.specialtiesContainer}>
              {specialist.specialties.slice(0, 2).map((specialty, index) => (
                <View key={index} style={styles.specialtyTag}>
                  <Text style={styles.specialtyTagText}>{specialty}</Text>
                </View>
              ))}
            </View>
            <View style={styles.statsRow}>
              {hasRating(specialist) && (
                <View style={styles.statItem}>
                  <Ionicons name="star" size={14} color="#FFB800" />
                  <Text style={styles.statText}>{specialist.stats?.averageRating.toFixed(1)}</Text>
                </View>
              )}
              {hasConsultations(specialist) && (
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={14} color={MUNPA_PRIMARY} />
                  <Text style={styles.statText}>{specialist.stats?.totalConsultations} consultas</Text>
                </View>
              )}
              <View style={styles.availabilityPill}>
                <View style={styles.availabilityDot} />
                <Text style={styles.availabilityPillText}>{getAvailabilityLabel(specialist)}</Text>
              </View>
            </View>
          </View>
        </View>

        {specialist.bio && (
          <Text style={styles.specialistBio} numberOfLines={2}>
            {specialist.bio}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.pricePills}>
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
          </View>

          <TouchableOpacity
            style={styles.consultButton}
            onPress={() => handleSpecialistPress(specialist)}
            activeOpacity={0.84}
          >
            <Text style={styles.consultButtonText}>Consultar</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {(responseLabel || specialist.pricing.acceptsFreeConsultations) && (
          <View style={styles.cardSignals}>
            {responseLabel && (
              <View style={styles.signalPill}>
                <Ionicons name="flash-outline" size={13} color="#178A84" />
                <Text style={styles.signalPillText}>{responseLabel}</Text>
              </View>
            )}
            {specialist.pricing.acceptsFreeConsultations && (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Primera orientación gratis</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[MUNPA_PRIMARY]} />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <Ionicons name="medical-outline" size={22} color="#178A84" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Encuentra ayuda profesional</Text>
              <Text style={styles.heroDescription}>
                Pediatría, lactancia, sueño, psicología y más.
              </Text>
            </View>
          </View>

          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Buscar fiebre, lactancia, sueño..."
              placeholderTextColor="#9CA3AF"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
                <Ionicons name="close-circle" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Specialty Filters */}
        {renderSpecialtyFilter()}

        {featuredSpecialists.length > 0 && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Disponibles para ti</Text>
                <Text style={styles.sectionSubtitle}>Elige rápido según tu necesidad.</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            >
              {featuredSpecialists.map(renderFeaturedSpecialist)}
            </ScrollView>
          </View>
        )}

        {/* Lista de especialistas */}
        <View style={styles.specialistsList}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                {selectedSpecialty || searchQuery ? 'Resultados' : 'Especialistas'}
              </Text>
              <Text style={styles.sectionSubtitle}>
                {filteredSpecialists.length} {filteredSpecialists.length === 1 ? 'opción disponible' : 'opciones disponibles'}
              </Text>
            </View>
          </View>

          {filteredSpecialists.length > 0 ? (
            filteredSpecialists.map(renderSpecialist)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyStateTitle}>No encontramos especialistas</Text>
              <Text style={styles.emptyStateText}>
                Prueba con otra palabra o cambia la categoría.
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
    backgroundColor: '#F6F8FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6F8FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: '#E9FAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#24323F',
  },
  heroDescription: {
    fontSize: 13,
    color: '#718096',
    lineHeight: 18,
    marginTop: 3,
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#F6F8FA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    gap: 9,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#24323F',
    paddingVertical: 10,
    fontWeight: '600',
  },
  clearSearchButton: {
    padding: 4,
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
    marginTop: 14,
  },
  specialtyFiltersContent: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 7,
  },
  specialtyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 5,
  },
  specialtyButtonActive: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  specialtyIcon: {
    fontSize: 14,
  },
  specialtyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  specialtyButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  featuredSection: {
    marginTop: 16,
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#24323F',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
    fontWeight: '600',
  },
  featuredList: {
    paddingHorizontal: 16,
    paddingRight: 24,
    gap: 10,
  },
  featuredCard: {
    width: 152,
    minHeight: 150,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  featuredAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#E9FAF8',
  },
  featuredAvatarInitials: {
    fontSize: 15,
    color: '#178A84',
    fontWeight: '900',
  },
  featuredName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#24323F',
    marginTop: 9,
  },
  featuredSpecialty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#718096',
    marginTop: 3,
  },
  featuredAvailability: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
  },
  featuredAvailabilityText: {
    fontSize: 11,
    color: '#178A84',
    fontWeight: '800',
  },
  specialistsList: {
    paddingTop: 18,
    paddingBottom: 24,
  },
  specialistCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E9EEF2',
    shadowColor: '#2D3748',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  specialistHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  specialistPhoto: {
    width: 62,
    height: 62,
    borderRadius: 18,
    backgroundColor: '#E9FAF8',
  },
  specialistInitials: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D8F1EF',
  },
  specialistInitialsText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#178A84',
  },
  specialistInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  specialistNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  specialistName: {
    flex: 1,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '800',
    color: '#24323F',
    marginBottom: 6,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 7,
  },
  specialtyTag: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  specialtyTagText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  availabilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1FBFA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availabilityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  availabilityPillText: {
    fontSize: 11,
    color: '#178A84',
    fontWeight: '800',
  },
  specialistBio: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 19,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pricePills: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '700',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1F2937',
  },
  freeBadge: {
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  freeBadgeText: {
    fontSize: 11,
    color: '#9A3412',
    fontWeight: '800',
  },
  consultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#59C6C0',
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 6,
  },
  consultButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardSignals: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1FBFA',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 12,
  },
  signalPillText: {
    fontSize: 11,
    color: '#178A84',
    fontWeight: '800',
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
