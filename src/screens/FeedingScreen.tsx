import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService } from '../services/api';
import analyticsService from '../services/analyticsService';
import BannerCarousel from '../components/BannerCarousel';
import nutritionService, { Recipe } from '../services/nutritionService';
import RecipeCard from '../components/RecipeCard';

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
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ingredientsText, setIngredientsText] = useState('');
  const [loadingFromIngredients, setLoadingFromIngredients] = useState(false);
  const [showingFromIngredients, setShowingFromIngredients] = useState(false);
  
  // Determinar el tipo de comida según la hora actual
  const getMealTypeByHour = (): 'breakfast' | 'lunch' | 'dinner' => {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 11) {
      return 'breakfast'; // 6:00 AM - 10:59 AM
    } else if (hour >= 11 && hour < 17) {
      return 'lunch'; // 11:00 AM - 4:59 PM
    } else {
      return 'dinner'; // 5:00 PM - 5:59 AM
    }
  };

  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner'>(getMealTypeByHour());

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
    
    // Log de la selección automática
    const initialMealType = getMealTypeByHour();
    console.log('🍽️ [NUTRITION] Tipo de comida automático según hora:', {
      hour: new Date().getHours(),
      mealType: initialMealType,
    });
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadRecipes();
    }
  }, [selectedChild, selectedMealType]);

  const loadRecipes = async (regenerate: boolean = false) => {
    if (!selectedChild) return;

    try {
      setShowingFromIngredients(false);
      setLoadingRecipes(true);
      console.log('🍽️ [NUTRITION] Cargando recetas para:', selectedChild.name);
      
      const response = await nutritionService.getRecipes(
        selectedChild.id,
        selectedMealType,
        regenerate
      );

      setRecipes(response.data);
      
      // ✅ Analytics: Recetas cargadas
      analyticsService.logEvent('nutrition_recipes_loaded', {
        child_id: selectedChild.id,
        child_name: selectedChild.name,
        meal_type: selectedMealType,
        total_recipes: response.data.length,
        cached: response.metadata.cached,
        regenerated: regenerate,
      });

      console.log('✅ [NUTRITION] Recetas cargadas:', response.data.length);
    } catch (error: any) {
      console.error('❌ [NUTRITION] Error cargando recetas:', error);
      Alert.alert(
        'Error',
        error.message || 'No se pudieron cargar las recetas',
        [{ text: 'OK' }]
      );
    } finally {
      setLoadingRecipes(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setShowingFromIngredients(false);
    await loadRecipes(true); // Regenerar recetas
    setRefreshing(false);
  };

  const handleSearchByIngredients = async () => {
    if (!selectedChild || !ingredientsText.trim()) return;
    try {
      setLoadingFromIngredients(true);
      setShowingFromIngredients(true);
      const { data } = await nutritionService.getRecipesFromIngredients(
        ingredientsText.trim(),
        selectedChild.id
      );
      setRecipes(data);
      analyticsService.logEvent('nutrition_recipes_from_ingredients', {
        child_id: selectedChild.id,
        ingredients_count: ingredientsText.split(/[,;]/).length,
        recipes_count: data.length,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudieron obtener recetas');
    } finally {
      setLoadingFromIngredients(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      analyticsService.logScreenView('Nutrition');
    }, [selectedChild])
  );

  const screenTitle = 'Nutrición';
  const screenIcon = 'restaurant';

  if (loadingChild) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, Platform.OS === 'android' && { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
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

        {/* Content */}
        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[MUNPA_PRIMARY]}
              tintColor={MUNPA_PRIMARY}
            />
          }
        >
          {selectedChild ? (
            <View style={styles.contentContainer}>
              {/* Banner */}
              <BannerCarousel 
                section="nutricion" 
                bannerHeight={180} 
                style={{ marginLeft: -15, marginTop: -10 }} 
              />

              {/* Filtros de tipo de comida */}
              <View style={styles.filtersContainer}>
                <TouchableOpacity
                  style={[styles.filterButton, selectedMealType === 'breakfast' && styles.filterButtonActive]}
                  onPress={() => setSelectedMealType('breakfast')}
                >
                  <Text style={[styles.filterButtonText, selectedMealType === 'breakfast' && styles.filterButtonTextActive]}>
                    🌅 Desayuno
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, selectedMealType === 'lunch' && styles.filterButtonActive]}
                  onPress={() => setSelectedMealType('lunch')}
                >
                  <Text style={[styles.filterButtonText, selectedMealType === 'lunch' && styles.filterButtonTextActive]}>
                    ☀️ Almuerzo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterButton, selectedMealType === 'dinner' && styles.filterButtonActive]}
                  onPress={() => setSelectedMealType('dinner')}
                >
                  <Text style={[styles.filterButtonText, selectedMealType === 'dinner' && styles.filterButtonTextActive]}>
                    🌙 Cena
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Buscar por ingredientes */}
              <View style={styles.ingredientsSection}>
                <Text style={styles.ingredientsPrompt}>
                  ¿No sabes qué preparar? Ingresa los ingredientes de tu casa aquí y te recomendaremos una receta para {selectedChild.name} acorde a su edad.
                </Text>
                <TextInput
                  style={styles.ingredientsInput}
                  placeholder="Ej: leche, huevos, pan, queso, tomate, pollo"
                  placeholderTextColor="#9CA3AF"
                  value={ingredientsText}
                  onChangeText={setIngredientsText}
                  multiline
                  numberOfLines={2}
                  editable={!loadingFromIngredients}
                />
                <TouchableOpacity
                  style={[
                    styles.ingredientsButton,
                    (!ingredientsText.trim() || loadingFromIngredients) && styles.ingredientsButtonDisabled,
                  ]}
                  onPress={handleSearchByIngredients}
                  disabled={!ingredientsText.trim() || loadingFromIngredients}
                >
                  {loadingFromIngredients ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="search" size={20} color="#FFFFFF" />
                  )}
                  <Text style={styles.ingredientsButtonText}>
                    {loadingFromIngredients ? 'Buscando recetas...' : 'Buscar recetas'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Lista de recetas */}
              {(loadingRecipes || loadingFromIngredients) ? (
                <View style={styles.loadingRecipes}>
                  <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
                  <Text style={styles.loadingText}>
                    {loadingFromIngredients ? 'Buscando recetas con tus ingredientes...' : 'Generando recetas personalizadas...'}
                  </Text>
                  <Text style={styles.loadingSubtext}>Esto puede tomar unos segundos</Text>
                </View>
              ) : recipes.length > 0 ? (
                <View style={styles.recipesContainer}>
                  <View style={styles.recipesHeader}>
                    <Text style={styles.recipesTitle}>
                      {showingFromIngredients
                        ? `🍽️ Recetas con tus ingredientes para ${selectedChild.name}`
                        : `🍽️ Recetas Personalizadas para ${selectedChild.name}`}
                    </Text>
                    <Text style={styles.recipesSubtitle}>
                      {recipes.length} receta{recipes.length !== 1 ? 's' : ''} adaptada{recipes.length !== 1 ? 's' : ''} a su edad
                    </Text>
                  </View>
                  
                  {recipes.map((recipe) => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}

                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => (showingFromIngredients ? handleSearchByIngredients() : loadRecipes(true))}
                  >
                    <Ionicons name="refresh" size={20} color={MUNPA_PRIMARY} />
                    <Text style={styles.refreshButtonText}>
                      {showingFromIngredients ? 'Buscar de nuevo' : 'Generar nuevas recetas'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="restaurant-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyStateTitle}>No hay recetas disponibles</Text>
                  <Text style={styles.emptyStateText}>
                    Intenta actualizar para obtener nuevas recetas
                  </Text>
                </View>
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
  // Filtros
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: MUNPA_PRIMARY,
    borderColor: MUNPA_PRIMARY,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // Ingredientes
  ingredientsSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  ingredientsPrompt: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  ingredientsInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ingredientsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MUNPA_ORANGE,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  ingredientsButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.8,
  },
  ingredientsButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Recetas
  loadingRecipes: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  recipesContainer: {
    paddingTop: 8,
  },
  recipesHeader: {
    marginBottom: 20,
  },
  recipesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  recipesSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: MUNPA_PRIMARY,
    marginTop: 8,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: MUNPA_PRIMARY,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FeedingScreen;
