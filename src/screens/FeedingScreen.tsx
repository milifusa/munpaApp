import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService } from '../services/api';
import analyticsService from '../services/analyticsService';
import BannerCarousel from '../components/BannerCarousel';

interface Child {
  id: string;
  name: string;
  birthDate?: string | null;
  ageInMonths?: number | null;
  currentAgeInMonths?: number | null;
  gender?: 'M' | 'F' | string | null;
  sex?: 'M' | 'F' | string | null;
  isUnborn?: boolean;
  dueDate?: string | null;
  photoUrl?: string | null;
}

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_ORANGE = '#FF9244';

const FeedingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);

  const loadChildren = async () => {
    try {
      setLoadingChild(true);
      const response = await childrenService.getChildren();
      const data =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.children) && response.data.children) ||
        (Array.isArray(response?.children) && response.children) ||
        (Array.isArray(response) && response) ||
        [];
      if (data.length > 0) {
        setChildren(data);
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect: Child | null = null;
        if (savedChildId) {
          childToSelect = data.find((c: Child) => c.id === savedChildId) || null;
        }
        if (!childToSelect && data.length > 0) {
          childToSelect = data[0];
          if (childToSelect) {
            await AsyncStorage.setItem('selectedChildId', childToSelect.id);
          }
        }
        setSelectedChild(childToSelect);
      }
    } catch (error) {
      console.error('Error cargando hijos:', error);
    } finally {
      setLoadingChild(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useFocusEffect(
    useCallback(() => {
      analyticsService.logScreenView('Nutrition');
    }, [selectedChild])
  );

  const handleChildChange = async (child: Child) => {
    setSelectedChild(child);
    await AsyncStorage.setItem('selectedChildId', child.id);
    analyticsService.logEvent('feeding_child_changed', { child_id: child.id });
  };

  const renderChildSelector = () => {
    if (children.length <= 1) return null;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.childSelector}
        contentContainerStyle={styles.childSelectorContent}
      >
        {children.map((child) => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childButton,
              selectedChild?.id === child.id && styles.childButtonActive,
            ]}
            onPress={() => handleChildChange(child)}
          >
            <Text
              style={[
                styles.childButtonText,
                selectedChild?.id === child.id && styles.childButtonTextActive,
              ]}
            >
              {child.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const screenTitle = 'Nutrición';
  const screenIcon = 'restaurant';

  if (loadingChild) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top > 0 ? 0 : 10 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{screenTitle}</Text>
            {selectedChild && (
              <Text style={styles.headerSubtitle}>
                Seguimiento de {selectedChild.name}
              </Text>
            )}
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name={screenIcon} size={32} color="#FFFFFF" />
          </View>
        </View>

        {/* Child selector */}
        {renderChildSelector()}

        {/* Content */}
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedChild ? (
            <View style={styles.contentContainer}>
              {/* Banner */}
              <BannerCarousel 
                section="nutricion" 
                bannerHeight={180} 
                style={{ marginLeft: -15, marginTop: -10 }} 
              />

              {/* Coming soon message */}
              <View style={styles.comingSoonCard}>
                <View style={styles.comingSoonIcon}>
                  <Ionicons name={screenIcon} size={64} color={MUNPA_ORANGE} />
                </View>
                <Text style={styles.comingSoonTitle}>
                  ¡Nutrición en camino!
                </Text>
                <Text style={styles.comingSoonText}>
                  Estamos trabajando en esta funcionalidad para ayudarte a llevar un registro completo de la nutrición de {selectedChild.name}.
                </Text>
                <Text style={styles.comingSoonFeatures}>
                  Próximamente podrás:
                </Text>
                <View style={styles.featuresList}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={MUNPA_ORANGE} />
                    <Text style={styles.featureText}>Registrar comidas y porciones</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={MUNPA_ORANGE} />
                    <Text style={styles.featureText}>Crear menú semanal</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={MUNPA_ORANGE} />
                    <Text style={styles.featureText}>Recetas apropiadas por edad</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={MUNPA_ORANGE} />
                    <Text style={styles.featureText}>Control de alergias</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark-circle" size={20} color={MUNPA_ORANGE} />
                    <Text style={styles.featureText}>Seguimiento nutricional</Text>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="person-add-outline" size={48} color={MUNPA_PRIMARY} />
              <Text style={styles.emptyTitle}>No hay bebés registrados</Text>
              <Text style={styles.emptyMessage}>
                Agrega un bebé para comenzar a usar esta funcionalidad
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MUNPA_PRIMARY,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  headerIconContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  childSelector: {
    backgroundColor: MUNPA_PRIMARY,
    paddingBottom: 12,
  },
  childSelectorContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  childButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  childButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  childButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  childButtonTextActive: {
    color: MUNPA_PRIMARY,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    padding: 20,
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 20,
  },
  comingSoonIcon: {
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  comingSoonFeatures: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  featuresList: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#4B5563',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default FeedingScreen;
