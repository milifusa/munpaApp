import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService } from '../services/api';
import analyticsService from '../services/analyticsService';
import BannerCarousel from '../components/BannerCarousel';
import milestonesService, { CategoryProgress, Milestone } from '../services/milestonesService';

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
const MUNPA_PINK = '#F08EB7';

const MilestonesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>('1');
  const [categories, setCategories] = useState<CategoryProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState({ total: 0, completed: 0, completionRate: 0 });
  const [childAge, setChildAge] = useState('');
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [categoriesMap, setCategoriesMap] = useState<Map<string, any>>(new Map());
  const [allMilestones, setAllMilestones] = useState<Milestone[]>([]);
  const ageScrollViewRef = useRef<ScrollView>(null); // ✅ Ref para el scroll horizontal
  
  // Rangos de edad disponibles (en meses)
  const ageRanges = [
    // Meses (0-12)
    { label: '1 mes', value: 1 },
    { label: '2 meses', value: 2 },
    { label: '3 meses', value: 3 },
    { label: '4 meses', value: 4 },
    { label: '6 meses', value: 6 },
    { label: '9 meses', value: 9 },
    { label: '12 meses', value: 12 },
    // Años (1-18)
    { label: '18 meses', value: 18 },
    { label: '2 años', value: 24 },
    { label: '3 años', value: 36 },
    { label: '4 años', value: 48 },
    { label: '5 años', value: 60 },
    { label: '6 años', value: 72 },
    { label: '9 años', value: 108 },
    { label: '12 años', value: 144 },
    { label: '15 años', value: 180 },
    { label: '18 años', value: 216 },
  ];

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
        
        if (childToSelect) {
          setSelectedChild(childToSelect);
          
          // ✅ Calcular edad del niño y establecer el mes inicial
          const childAgeInMonths = calculateChildAge(childToSelect);
          console.log('👶 [MILESTONES] Edad del niño:', childAgeInMonths, 'meses');
          
          // Establecer el mes más cercano disponible
          const closestAgeRange = findClosestAgeRange(childAgeInMonths);
          console.log('🎯 [MILESTONES] Estableciendo rango de edad inicial:', closestAgeRange);
          setSelectedAgeRange(closestAgeRange.toString());
          
          // ✅ Hacer scroll al botón seleccionado después de un pequeño delay
          setTimeout(() => {
            scrollToSelectedAge(closestAgeRange);
          }, 300);
        }
      }
    } catch (error) {
      console.error('Error cargando hijos:', error);
    } finally {
      setLoadingChild(false);
    }
  };

  const scrollToSelectedAge = (ageValue: number) => {
    if (!ageScrollViewRef.current) return;
    
    // Encontrar el índice del botón seleccionado
    const index = ageRanges.findIndex(r => r.value === ageValue);
    if (index === -1) return;
    
    // Cada botón tiene aproximadamente 110px de ancho + 12px de margen
    const buttonWidth = 122;
    const scrollPosition = Math.max(0, (index * buttonWidth) - 50); // -50 para centrar mejor
    
    console.log('📜 [MILESTONES] Haciendo scroll a posición:', scrollPosition, 'para índice:', index);
    
    ageScrollViewRef.current.scrollTo({
      x: scrollPosition,
      animated: true,
    });
  };

  const calculateChildAge = (child: Child): number => {
    console.log('📅 [MILESTONES] Calculando edad del niño:', {
      name: child.name,
      birthDate: child.birthDate,
      ageInMonths: child.ageInMonths,
      currentAgeInMonths: child.currentAgeInMonths,
    });
    
    // Intentar obtener la edad de diferentes fuentes
    if (child.currentAgeInMonths !== undefined && child.currentAgeInMonths !== null) {
      console.log('✅ [MILESTONES] Usando currentAgeInMonths:', child.currentAgeInMonths);
      return Math.max(1, child.currentAgeInMonths); // Mínimo 1 mes
    }
    
    if (child.ageInMonths !== undefined && child.ageInMonths !== null) {
      console.log('✅ [MILESTONES] Usando ageInMonths:', child.ageInMonths);
      return Math.max(1, child.ageInMonths); // Mínimo 1 mes
    }
    
    if (!child.birthDate) {
      console.warn('⚠️ [MILESTONES] No hay fecha de nacimiento, usando 1 mes por defecto');
      return 1;
    }
    
    try {
      const birthDate = new Date(child.birthDate);
      const today = new Date();
      
      console.log('📅 [MILESTONES] Fechas:', {
        birthDate: birthDate.toISOString(),
        today: today.toISOString(),
      });
      
      const years = today.getFullYear() - birthDate.getFullYear();
      const months = today.getMonth() - birthDate.getMonth();
      const totalMonths = years * 12 + months;
      
      console.log('📊 [MILESTONES] Cálculo:', {
        years,
        months,
        totalMonths,
        final: Math.max(1, totalMonths),
      });
      
      return Math.max(1, totalMonths); // Mínimo 1 mes
    } catch (error) {
      console.error('❌ [MILESTONES] Error calculando edad:', error);
      return 1;
    }
  };

  const findClosestAgeRange = (ageInMonths: number): number => {
    console.log('🔍 [MILESTONES] Buscando rango más cercano para edad:', ageInMonths);
    
    // Encontrar el rango de edad más cercano disponible
    const availableRanges = ageRanges.map(r => r.value);
    console.log('📋 [MILESTONES] Rangos disponibles:', availableRanges);
    
    // Si la edad es menor o igual que el primer rango, usar el primer rango
    if (ageInMonths <= availableRanges[0]) {
      console.log('✅ [MILESTONES] Edad menor al primer rango, usando:', availableRanges[0]);
      return availableRanges[0];
    }
    
    // Si la edad es mayor o igual que el último rango, usar el último rango
    if (ageInMonths >= availableRanges[availableRanges.length - 1]) {
      console.log('✅ [MILESTONES] Edad mayor al último rango, usando:', availableRanges[availableRanges.length - 1]);
      return availableRanges[availableRanges.length - 1];
    }
    
    // ✅ NUEVA LÓGICA: Buscar el mes anterior más cercano (el mayor que sea <= a la edad actual)
    let bestMatch = availableRanges[0];
    
    for (const range of availableRanges) {
      console.log(`  Comparando: edad ${ageInMonths} vs rango ${range}`);
      
      // Si el rango es menor o igual a la edad, y es mayor que el mejor match actual
      if (range <= ageInMonths && range > bestMatch) {
        bestMatch = range;
        console.log(`    ✓ Nuevo mejor match (anterior): ${bestMatch}`);
      }
      
      // Si encontramos un rango exacto, usarlo
      if (range === ageInMonths) {
        console.log(`    ✓✓ Match exacto: ${range}`);
        bestMatch = range;
        break;
      }
    }
    
    console.log('✅ [MILESTONES] Rango seleccionado (mes anterior/igual):', bestMatch);
    return bestMatch;
  };

  const loadCategories = async () => {
    try {
      console.log('📚 [MILESTONES] Cargando categorías...');
      const categoriesData = await milestonesService.getCategories();
      console.log('✅ [MILESTONES] Categorías cargadas:', categoriesData.length);
      
      // ✅ Colores del tema de Munpa
      const categoryColors: { [key: string]: string } = {
        'Social': '#F08EB7',        // Rosa Munpa
        'Motriz': '#96d2d3',        // Turquesa Munpa (color principal)
        'Cognitiva': '#887CBC',     // Morado Munpa (eventos)
        'Comunicación': '#B4C14B',  // Verde lima Munpa
      };
      
      // Crear mapa de categorías para acceso rápido
      const map = new Map();
      categoriesData.forEach(cat => {
        // Asignar color específico según el nombre de la categoría
        const customColor = categoryColors[cat.name] || cat.color;
        
        map.set(cat.id, {
          ...cat,
          color: customColor, // ✅ Usar color personalizado del tema Munpa
        });
        
        console.log(`  - ${cat.name} (${cat.icon}) - ${customColor}`);
      });
      setCategoriesMap(map);
    } catch (error) {
      console.error('❌ [MILESTONES] Error cargando categorías:', error);
    }
  };

  const loadMilestones = async () => {
    if (!selectedChild) return;

    try {
      setLoadingMilestones(true);
      console.log('🎯 [MILESTONES] Cargando TODOS los hitos para:', selectedChild.id);
      console.log('🔑 [MILESTONES] categoriesMap size:', categoriesMap.size);
      
      // Obtener TODOS los hitos del niño (includeAll=true para obtener los 480 hitos)
      const data = await milestonesService.getMilestonesByChild(selectedChild.id, {
        includeAll: true, // ✅ Parámetro correcto para obtener todos los hitos
      });
      
      console.log('📊 [MILESTONES] Datos recibidos completos:', {
        hasData: !!data,
        hasMilestones: !!data?.milestones,
        milestonesLength: data?.milestones?.length || 0,
        childAge: data?.childAge,
      });
      
      if (data && data.milestones) {
        console.log('✅ [MILESTONES] Total hitos obtenidos:', data.milestones.length);
        
        // Mostrar algunos ejemplos de hitos
        if (data.milestones.length > 0) {
          console.log('📝 [MILESTONES] Primer hito ejemplo:', {
            title: data.milestones[0].title,
            ageMin: data.milestones[0].ageMonthsMin,
            ageMax: data.milestones[0].ageMonthsMax,
            categoryId: data.milestones[0].categoryId,
          });
        }
        
        // ✅ Guardar TODOS los hitos en cache
        setAllMilestones(data.milestones);
        setChildAge(data.childAge?.displayAge || 'Cargando...');
        
        // ✅ Filtrar y agrupar según el mes seleccionado
        console.log('🔄 [MILESTONES] Filtrando para mes inicial:', selectedAgeRange);
        filterAndGroupMilestones(data.milestones, parseInt(selectedAgeRange));
      } else {
        console.warn('⚠️ [MILESTONES] No hay datos de hitos');
        setAllMilestones([]);
        setCategories([]);
        setOverallProgress({ total: 0, completed: 0, completionRate: 0 });
      }
    } catch (error) {
      console.error('❌ [MILESTONES] Error cargando hitos:', error);
      setAllMilestones([]);
      setCategories([]);
      setOverallProgress({ total: 0, completed: 0, completionRate: 0 });
    } finally {
      setLoadingMilestones(false);
    }
  };

  const filterAndGroupMilestones = (milestones: Milestone[], ageMonths: number) => {
    console.log('🔍 [MILESTONES] Filtrando hitos para mes:', ageMonths);
    
    // Filtrar hitos por el rango de edad seleccionado
    // Un hito se incluye si el mes seleccionado está dentro de su rango (ageMonthsMin - ageMonthsMax)
    const filteredMilestones = milestones.filter(milestone => {
      const isInRange = milestone.ageMonthsMin <= ageMonths && milestone.ageMonthsMax >= ageMonths;
      if (isInRange) {
        console.log(`  ✅ "${milestone.title}" (${milestone.ageMonthsMin}-${milestone.ageMonthsMax} meses)`);
      }
      return isInRange;
    });
    
    console.log('🎯 [MILESTONES] Hitos filtrados:', filteredMilestones.length, 'de', milestones.length, 'totales');
    
    if (filteredMilestones.length === 0) {
      console.warn('⚠️ [MILESTONES] No hay hitos para el mes', ageMonths);
      setCategories([]);
      setOverallProgress({ total: 0, completed: 0, completionRate: 0 });
      return;
    }
    
    // Agrupar hitos por categoría
    const categoriesGrouped = new Map<string, any>();
    
    filteredMilestones.forEach(milestone => {
      const categoryId = milestone.categoryId;
      
      if (!categoriesGrouped.has(categoryId)) {
        const categoryInfo = categoriesMap.get(categoryId);
        categoriesGrouped.set(categoryId, {
          categoryId,
          categoryName: categoryInfo?.name || milestone.categoryName || 'Sin categoría',
          icon: categoryInfo?.icon || milestone.categoryIcon || '📋',
          color: categoryInfo?.color || milestone.categoryColor || '#6B7280',
          milestones: [],
          total: 0,
          completed: 0,
          completionRate: 0,
        });
      }
      
      const category = categoriesGrouped.get(categoryId);
      category.milestones.push(milestone);
      category.total++;
      if (milestone.completed) {
        category.completed++;
      }
    });
    
    // Calcular porcentajes
    const enrichedCategories: CategoryProgress[] = Array.from(categoriesGrouped.values()).map(cat => ({
      ...cat,
      completionRate: cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0,
    }));
    
    console.log('🎨 [MILESTONES] Categorías con hitos:', enrichedCategories.length);
    enrichedCategories.forEach(cat => {
      console.log(`  - ${cat.icon} ${cat.categoryName}: ${cat.total} hitos (${cat.completionRate}% completo)`);
    });
    
    // Calcular progreso general
    const totalMilestones = filteredMilestones.length;
    const completedMilestones = filteredMilestones.filter(m => m.completed).length;
    
    setCategories(enrichedCategories);
    setOverallProgress({
      total: totalMilestones,
      completed: completedMilestones,
      completionRate: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,
    });
  };

  useEffect(() => {
    loadChildren();
    loadCategories();
  }, []);

  useEffect(() => {
    // ✅ Cargar todos los hitos solo cuando cambie el niño o las categorías
    if (selectedChild && categoriesMap.size > 0) {
      loadMilestones();
    }
  }, [selectedChild, categoriesMap]);

  useEffect(() => {
    // ✅ Filtrar hitos localmente cuando cambie el mes seleccionado
    if (allMilestones.length > 0) {
      console.log('🔄 [MILESTONES] Filtrando para mes:', selectedAgeRange);
      filterAndGroupMilestones(allMilestones, parseInt(selectedAgeRange));
      
      // ✅ Analytics: Cambio de rango de edad
      analyticsService.logEvent('milestones_age_range_changed', {
        age_range: selectedAgeRange,
        age_range_label: ageRanges.find(r => r.value === parseInt(selectedAgeRange))?.label || selectedAgeRange,
      });
    }
  }, [selectedAgeRange]); // Solo cuando cambie el mes

  useFocusEffect(
    useCallback(() => {
      analyticsService.logScreenView('Milestones');
      
      // ✅ Analytics adicional con contexto
      if (selectedChild) {
        analyticsService.logEvent('milestones_screen_viewed', {
          child_id: selectedChild.id,
          child_name: selectedChild.name,
          child_age_months: calculateChildAge(selectedChild),
        });
      }
    }, [selectedChild])
  );

  const handleToggleMilestone = async (milestone: Milestone, categoryId: string) => {
    if (!selectedChild) return;

    try {
      if (milestone.completed) {
        // Desmarcar
        const success = await milestonesService.uncompleteMilestone(selectedChild.id, milestone.id);
        if (success) {
          // ✅ Analytics: Hito desmarcado
          analyticsService.logEvent('milestone_uncompleted', {
            milestone_id: milestone.id,
            milestone_title: milestone.title,
            category_id: categoryId,
            child_id: selectedChild.id,
            age_range: selectedAgeRange,
          });
          
          // Actualizar localmente
          setCategories(prev => prev.map(cat => {
            if (cat.categoryId === categoryId) {
              return {
                ...cat,
                completed: cat.completed - 1,
                completionRate: Math.round(((cat.completed - 1) / cat.total) * 100),
                milestones: cat.milestones.map(m => 
                  m.id === milestone.id ? { ...m, completed: false, completedAt: undefined, notes: undefined } : m
                ),
              };
            }
            return cat;
          }));
          
          // Actualizar progreso general
          setOverallProgress(prev => ({
            total: prev.total,
            completed: prev.completed - 1,
            completionRate: Math.round(((prev.completed - 1) / prev.total) * 100),
          }));
        }
      } else {
        // Marcar como completado
        const success = await milestonesService.completeMilestone(selectedChild.id, milestone.id);
        if (success) {
          // ✅ Analytics: Hito completado
          analyticsService.logEvent('milestone_completed', {
            milestone_id: milestone.id,
            milestone_title: milestone.title,
            category_id: categoryId,
            child_id: selectedChild.id,
            child_age_months: calculateChildAge(selectedChild),
            age_range: selectedAgeRange,
          });
          
          // Actualizar localmente
          setCategories(prev => prev.map(cat => {
            if (cat.categoryId === categoryId) {
              return {
                ...cat,
                completed: cat.completed + 1,
                completionRate: Math.round(((cat.completed + 1) / cat.total) * 100),
                milestones: cat.milestones.map(m => 
                  m.id === milestone.id ? { ...m, completed: true, completedAt: new Date().toISOString() } : m
                ),
              };
            }
            return cat;
          }));
          
          // Actualizar progreso general
          setOverallProgress(prev => ({
            total: prev.total,
            completed: prev.completed + 1,
            completionRate: Math.round(((prev.completed + 1) / prev.total) * 100),
          }));
        }
      }
    } catch (error) {
      console.error('Error actualizando hito:', error);
      Alert.alert('Error', 'No se pudo actualizar el hito');
    }
  };

  const handleMilestonePress = (milestone: Milestone) => {
    // ✅ Analytics: Ver detalles de hito
    analyticsService.logEvent('milestone_details_viewed', {
      milestone_id: milestone.id,
      milestone_title: milestone.title,
      milestone_completed: milestone.completed,
      age_range: selectedAgeRange,
    });
    
    setSelectedMilestone(milestone);
    setShowDetailsModal(true);
  };

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
            <Text style={styles.headerTitle}>Hitos del Desarrollo</Text>
            {selectedChild && (
              <Text style={styles.headerSubtitle}>
                {selectedChild.name} - {calculateChildAge(selectedChild)} meses
              </Text>
            )}
          </View>
          <View style={styles.headerIconContainer}>
            <Ionicons name="trophy" size={32} color="#FFFFFF" />
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {selectedChild ? (
            <View style={styles.contentContainer}>
              {/* Mostrar mensaje si no hay categorías */}
              {!loadingMilestones && categoriesMap.size === 0 ? (
                <View style={styles.noCategoriesCard}>
                  <View style={styles.noCategoriesIcon}>
                    <Ionicons name="construct-outline" size={64} color="#F59E0B" />
                  </View>
                  <Text style={styles.noCategoriesTitle}>
                    ⚠️ Configuración en proceso
                  </Text>
                  <Text style={styles.noCategoriesText}>
                    Las categorías de hitos están siendo configuradas por el equipo de Munpa.
                  </Text>
                  <Text style={styles.noCategoriesSubtext}>
                    Esta funcionalidad estará disponible próximamente para seguir el desarrollo de {selectedChild.name}.
                  </Text>
                  
                  {/* Banner */}
                  <View style={styles.noCategoriesBannerWrapper}>
                    <BannerCarousel
                      section="hitos"
                      bannerHeight={180}
                      style={{ marginTop: 20 }}
                    />
                  </View>
                </View>
              ) : (
                <>
                  {/* Age Range Selector */}
                  <ScrollView 
                    ref={ageScrollViewRef}
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.ageRangeContainer}
                  >
                    {ageRanges.map((range) => (
                      <TouchableOpacity
                        key={range.value}
                        style={[
                          styles.ageRangeButton,
                          selectedAgeRange === range.value.toString() && styles.ageRangeButtonActive,
                        ]}
                        onPress={() => setSelectedAgeRange(range.value.toString())}
                      >
                        <Text
                          style={[
                            styles.ageRangeButtonText,
                            selectedAgeRange === range.value.toString() && styles.ageRangeButtonTextActive,
                          ]}
                        >
                          {range.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

              {/* Overall Progress Card */}
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressTitle}>Progreso General</Text>
                  <View style={styles.progressCircle}>
                    <Text style={styles.progressCircleText}>{overallProgress.completionRate}%</Text>
                  </View>
                </View>

                {/* Categories Progress */}
                {loadingMilestones ? (
                  <ActivityIndicator size="small" color={MUNPA_PRIMARY} style={{ marginTop: 20 }} />
                ) : (
                  <View style={styles.categoriesProgress}>
                    {categories.map((category) => (
                      <View key={category.categoryId} style={styles.categoryProgressRow}>
                        <View style={styles.categoryProgressLeft}>
                          <Text style={styles.categoryIcon}>{category.icon}</Text>
                          <Text style={styles.categoryName}>{category.categoryName}</Text>
                        </View>
                        <View style={styles.categoryProgressRight}>
                          <Text style={[styles.categoryPercentage, { color: category.color }]}>
                            {category.completionRate}%
                          </Text>
                          <View style={styles.categoryProgressBar}>
                            <View
                              style={[
                                styles.categoryProgressFill,
                                {
                                  width: `${category.completionRate}%`,
                                  backgroundColor: category.color,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                  )}
                </View>

              {/* Banner Carousel */}
              <BannerCarousel
                section="hitos"
                bannerHeight={180}
                style={{ marginTop: -10, marginHorizontal: -20 }}
              />

              {/* Categories with Milestones */}
              {loadingMilestones ? (
                <ActivityIndicator size="large" color={MUNPA_PRIMARY} style={{ marginTop: 40 }} />
              ) : categories.length === 0 ? (
                <View style={styles.noMilestonesCard}>
                  <Ionicons name="information-circle-outline" size={64} color="#9CA3AF" />
                  <Text style={styles.noMilestonesTitle}>
                    No hay hitos para esta edad
                  </Text>
                  <Text style={styles.noMilestonesText}>
                    Selecciona otro rango de edad para ver los hitos de desarrollo correspondientes.
                  </Text>
                </View>
              ) : (
                categories.map((category) => (
                  <View key={category.categoryId} style={styles.categoryCard}>
                    <View style={[styles.categoryHeader, { backgroundColor: category.color + '30' }]}>
                      <View style={styles.categoryHeaderLeft}>
                        <Text style={styles.categoryHeaderIcon}>{category.icon}</Text>
                        <Text style={styles.categoryHeaderTitle}>{category.categoryName}</Text>
                      </View>
                      <View style={styles.categoryHeaderRight}>
                        <Text style={styles.categoryHeaderPercentage}>{category.completionRate}%</Text>
                      </View>
                    </View>
                    <Text style={styles.categoryMilestoneCount}>
                      {category.completed}/{category.total} Hitos Alcanzados
                    </Text>

                    {/* Milestones List */}
                    {category.milestones.map((milestone) => (
                      <TouchableOpacity
                        key={milestone.id}
                        style={styles.milestoneRow}
                        onPress={() => handleMilestonePress(milestone)}
                      >
                        <TouchableOpacity
                          style={[
                            styles.milestoneCheckbox,
                            milestone.completed && styles.milestoneCheckboxActive,
                          ]}
                          onPress={() => handleToggleMilestone(milestone, category.categoryId)}
                        >
                          {milestone.completed && (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                        <Text
                          style={[
                            styles.milestoneText,
                            milestone.completed && styles.milestoneTextCompleted,
                          ]}
                        >
                          {milestone.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))
              )}

              
                </>
              )}
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

        {/* Milestone Details Modal */}
        <Modal
          visible={showDetailsModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowDetailsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowDetailsModal(false)}
              >
                <Ionicons name="close" size={28} color="#1F2937" />
              </TouchableOpacity>

              {selectedMilestone && (
                <>
                  <Text style={styles.modalTitle}>{selectedMilestone.title}</Text>
                  {selectedMilestone.description && (
                    <Text style={styles.modalDescription}>{selectedMilestone.description}</Text>
                  )}
                  {selectedMilestone.tips && (
                    <View style={styles.modalTipsSection}>
                      <Text style={styles.modalTipsTitle}>💡 Consejos</Text>
                      <Text style={styles.modalTipsText}>{selectedMilestone.tips}</Text>
                    </View>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      selectedMilestone.completed && styles.modalButtonCompleted,
                    ]}
                    onPress={() => {
                      const categoryId = categories.find(cat =>
                        cat.milestones.some(m => m.id === selectedMilestone.id)
                      )?.categoryId;
                      if (categoryId) {
                        handleToggleMilestone(selectedMilestone, categoryId);
                      }
                      setShowDetailsModal(false);
                    }}
                  >
                    <Ionicons
                      name={selectedMilestone.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                      size={24}
                      color="#FFFFFF"
                    />
                    <Text style={styles.modalButtonText}>
                      {selectedMilestone.completed ? 'Marcar como no completado' : 'Marcar como completado'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>
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
  ageRangeContainer: {
    marginBottom: 20,
  },
  ageRangeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  ageRangeButtonActive: {
    backgroundColor: '#887CBC',
    borderColor: '#887CBC',
  },
  ageRangeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  ageRangeButtonTextActive: {
    color: '#FFFFFF',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
  },
  categoriesProgress: {
    gap: 12,
  },
  categoryProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryProgressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryIcon: {
    fontSize: 20,
  },
  categoryName: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  categoryProgressRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  categoryPercentage: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
  },
  categoryProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  bannerCard: {
    backgroundColor: '#FEF3F8',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    marginTop: 20,
  },
  bannerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  bannerText: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  bannerIllustration: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  babyEmoji: {
    fontSize: 48,
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryHeaderIcon: {
    fontSize: 24,
  },
  categoryHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryHeaderRight: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryHeaderPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  categoryMilestoneCount: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  milestoneCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneCheckboxActive: {
    backgroundColor: '#887CBC',
    borderColor: '#887CBC',
  },
  milestoneText: {
    fontSize: 16,
    color: '#1F2937',
    flex: 1,
  },
  milestoneTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalCloseButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalTipsSection: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalTipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalTipsText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#887CBC',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonCompleted: {
    backgroundColor: '#10B981',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noCategoriesCard: {
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
  noCategoriesIcon: {
    marginBottom: 24,
  },
  noCategoriesTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  noCategoriesText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  noCategoriesSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  noCategoriesBannerWrapper: {
    width: '100%',
    marginTop: 20,
  },
  noMilestonesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noMilestonesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noMilestonesText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default MilestonesScreen;
