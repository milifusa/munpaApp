import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { activitiesService } from '../services/api';
import BannerCarousel from '../components/BannerCarousel';
import analyticsService from '../services/analyticsService';

interface Activity {
  id: string;
  title: string;
  description: string;
  duration: number;
  ageRange?: {
    min: number;
    max: number;
  };
  category?: string;
}

const DevelopmentScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    loadSelectedChild();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Development screen focused, reloading...');
      if (selectedChild) {
        loadActivitiesForChild(selectedChild);
      }
    }, [selectedChild])
  );

  const loadSelectedChild = async () => {
    try {
      const savedChildId = await AsyncStorage.getItem('selectedChildId');
      if (savedChildId) {
        const childrenResponse = await fetch('https://api.munpa.online/api/auth/children', {
          headers: {
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await childrenResponse.json();
        const childrenData = Array.isArray(data) ? data : data?.data || [];
        const child = childrenData.find((c: any) => c.id === savedChildId);
        if (child) {
          setSelectedChild(child);
          // Cargar actividades inmediatamente después de cargar el hijo
          loadActivitiesForChild(child);
        }
      }
    } catch (error) {
      console.error('Error cargando hijo seleccionado:', error);
    }
  };

  const loadActivitiesForChild = async (child: any) => {
    if (!child) return;
    
    try {
      setLoading(true);
      console.log('🔄 Cargando actividades para:', child.id, child.name);
      
      const response = await activitiesService.getActivitySuggestions(child.id);
      
      console.log('📊 Respuesta de actividades:', response);
      
      if (response.success) {
        // La respuesta tiene una estructura anidada: response.suggestions.activities
        const activitiesList = response.suggestions?.activities || response.data || [];
        setActivities(activitiesList);
        console.log('✅ Actividades cargadas:', activitiesList.length);
      } else {
        setActivities([]);
        console.log('⚠️ No hay actividades en la respuesta');
      }
    } catch (error) {
      console.error('❌ Error cargando actividades:', error);
      Alert.alert('Error', 'No se pudieron cargar las actividades');
    } finally {
      setLoading(false);
    }
  };

  const handleActivityPress = async (activity: Activity) => {
    await analyticsService.logEvent('development_activity_view', {
      activityId: activity.id,
      activityTitle: activity.title,
      childId: selectedChild?.id,
    });
    
    setSelectedActivity(activity);
    setShowActivityModal(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#59C6C0" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Desarrollo</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          <BannerCarousel 
            section="desarrollo" 
            fallbackToHome={false}
            imageResizeMode="cover"
          />
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={24} color="#59C6C0" />
            <Text style={styles.sectionTitle}>Ejercicios y Actividades</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Actividades recomendadas para el desarrollo de {selectedChild?.name || 'tu bebé'}
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando actividades...</Text>
            </View>
          ) : activities.length > 0 ? (
            <View style={styles.activitiesList}>
              {activities.map((activity) => (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityIconContainer}>
                    <Ionicons name="extension-puzzle" size={28} color="#6B5CA5" />
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activityDescription} numberOfLines={2}>
                      {activity.description}
                    </Text>
                    <View style={styles.activityMeta}>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.activityDuration}>Duración: {activity.duration} min</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#CBD5E0" />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="alert-circle-outline" size={48} color="#CBD5E0" />
              <Text style={styles.emptyText}>No hay actividades disponibles</Text>
              <Text style={styles.emptySubtext}>
                Vuelve más tarde para ver nuevas sugerencias
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de Detalle de Actividad */}
      <Modal
        visible={showActivityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActivityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalle de Actividad</Text>
              <TouchableOpacity onPress={() => setShowActivityModal(false)}>
                <Ionicons name="close" size={28} color="#4A5568" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedActivity && (
                <>
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="extension-puzzle" size={24} color="#6B5CA5" />
                      <Text style={styles.modalSectionTitle}>Título</Text>
                    </View>
                    <Text style={styles.modalText}>{selectedActivity.title}</Text>
                  </View>

                  {selectedActivity.description && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="document-text" size={24} color="#59C6C0" />
                        <Text style={styles.modalSectionTitle}>Descripción</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedActivity.description}</Text>
                    </View>
                  )}

                  {selectedActivity.duration && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="time" size={24} color="#F6AD55" />
                        <Text style={styles.modalSectionTitle}>Duración</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedActivity.duration} minutos</Text>
                    </View>
                  )}

                  {selectedActivity.ageRange && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="people" size={24} color="#FC8181" />
                        <Text style={styles.modalSectionTitle}>Rango de Edad</Text>
                      </View>
                      <Text style={styles.modalText}>
                        {selectedActivity.ageRange.min} - {selectedActivity.ageRange.max} meses
                      </Text>
                    </View>
                  )}

                  {selectedActivity.category && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="folder" size={24} color="#9F7AEA" />
                        <Text style={styles.modalSectionTitle}>Categoría</Text>
                      </View>
                      <Text style={styles.modalText}>{selectedActivity.category}</Text>
                    </View>
                  )}

                  {(selectedActivity as any).benefits && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="star" size={24} color="#F6AD55" />
                        <Text style={styles.modalSectionTitle}>Beneficios</Text>
                      </View>
                      <Text style={styles.modalText}>
                        {Array.isArray((selectedActivity as any).benefits)
                          ? (selectedActivity as any).benefits.join(', ')
                          : (selectedActivity as any).benefits}
                      </Text>
                    </View>
                  )}

                  {(selectedActivity as any).materials && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="construct" size={24} color="#48BB78" />
                        <Text style={styles.modalSectionTitle}>Materiales</Text>
                      </View>
                      <Text style={styles.modalText}>
                        {Array.isArray((selectedActivity as any).materials)
                          ? (selectedActivity as any).materials.join(', ')
                          : (selectedActivity as any).materials}
                      </Text>
                    </View>
                  )}

                  {(selectedActivity as any).instructions && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="list" size={24} color="#59C6C0" />
                        <Text style={styles.modalSectionTitle}>Instrucciones</Text>
                      </View>
                      <Text style={styles.modalText}>{(selectedActivity as any).instructions}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowActivityModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#59C6C0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#59C6C0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  bannerContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
  },
  contentCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  activitiesList: {
    gap: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E6F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  activityDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 18,
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityDuration: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginLeft: 8,
  },
  modalText: {
    fontSize: 15,
    color: '#4A5568',
    lineHeight: 22,
  },
  modalCloseButton: {
    backgroundColor: '#59C6C0',
    paddingVertical: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DevelopmentScreen;
