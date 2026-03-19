import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import nutritionService, { Recipe } from '../services/nutritionService';
import analyticsService from '../services/analyticsService';

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_ORANGE = '#FF9244';

const RecipeDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recipeId = route.params?.recipeId;

  useEffect(() => {
    if (recipeId) {
      loadRecipe();
    } else {
      setError('No se proporcionó un ID de receta');
      setLoading(false);
    }
  }, [recipeId]);

  const loadRecipe = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🍽️ [RECIPE DETAIL] Cargando receta:', recipeId);
      
      const recipeData = await nutritionService.getRecipeById(recipeId);
      
      if (recipeData) {
        setRecipe(recipeData);
        
        // Analytics
        analyticsService.logEvent('recipe_detail_viewed', {
          recipe_id: recipeId,
          recipe_name: recipeData.name,
          meal_type: recipeData.mealType,
        });
      } else {
        setError('No se encontró la receta');
      }
    } catch (err: any) {
      console.error('❌ [RECIPE DETAIL] Error cargando receta:', err);
      setError(err.message || 'Error al cargar la receta');
    } finally {
      setLoading(false);
    }
  };

  const getMealIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return '🌅';
      case 'lunch':
        return '☀️';
      case 'dinner':
        return '🌙';
      default:
        return '🍽️';
    }
  };

  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return 'Desayuno';
      case 'lunch':
        return 'Almuerzo';
      case 'dinner':
        return 'Cena';
      default:
        return 'Comida';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receta</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
          <Text style={styles.loadingText}>Cargando receta...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !recipe) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Receta</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>{error || 'Receta no encontrada'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadRecipe}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receta</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mealType}>
          <Text style={styles.mealIcon}>{getMealIcon(recipe.mealType)}</Text>
          <Text style={styles.mealLabel}>{getMealTypeLabel(recipe.mealType)}</Text>
        </View>

        <Text style={styles.recipeName}>{recipe.name}</Text>
        <Text style={styles.description}>{recipe.description}</Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={20} color={MUNPA_ORANGE} />
            <Text style={styles.metaLabel}>Preparación</Text>
            <Text style={styles.metaValue}>{recipe.prepTime}min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="flame-outline" size={20} color={MUNPA_ORANGE} />
            <Text style={styles.metaLabel}>Cocción</Text>
            <Text style={styles.metaValue}>{recipe.cookTime}min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="restaurant-outline" size={20} color={MUNPA_ORANGE} />
            <Text style={styles.metaLabel}>Porciones</Text>
            <Text style={styles.metaValue}>{recipe.servings}</Text>
          </View>
        </View>

        {/* Ingredientes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🛒 Ingredientes</Text>
          {recipe.ingredients && recipe.ingredients.length > 0 ? (
            recipe.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientItem}>
                <View style={styles.bullet} />
                <Text style={styles.ingredientText}>
                  <Text style={styles.ingredientQuantity}>{ingredient.quantity}</Text> de{' '}
                  {ingredient.item}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay ingredientes disponibles</Text>
          )}
        </View>

        {/* Instrucciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👨‍🍳 Preparación</Text>
          {recipe.instructions && recipe.instructions.length > 0 ? (
            recipe.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No hay instrucciones disponibles</Text>
          )}
        </View>

        {/* Información Nutricional */}
        {recipe.nutritionalInfo && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📊 Información Nutricional</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Calorías</Text>
                <Text style={styles.nutritionValue}>{recipe.nutritionalInfo.calories || 'N/A'}</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Proteínas</Text>
                <Text style={styles.nutritionValue}>{recipe.nutritionalInfo.protein || 'N/A'}</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Carbohidratos</Text>
                <Text style={styles.nutritionValue}>{recipe.nutritionalInfo.carbs || 'N/A'}</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionLabel}>Grasas</Text>
                <Text style={styles.nutritionValue}>{recipe.nutritionalInfo.fat || 'N/A'}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>💡 Tips</Text>
            {recipe.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={styles.bullet} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Alérgenos */}
        {recipe.allergens && recipe.allergens.length > 0 && (
          <View style={[styles.section, styles.allergensSection]}>
            <Text style={styles.allergensTitle}>⚠️ Alérgenos</Text>
            <Text style={styles.allergensText}>{recipe.allergens.join(', ')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: MUNPA_PRIMARY,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  mealType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  mealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  recipeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MUNPA_ORANGE,
    marginRight: 12,
    marginTop: 7,
  },
  ingredientText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  ingredientQuantity: {
    fontWeight: '600',
    color: '#1F2937',
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  instructionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  allergensSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  allergensTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 8,
  },
  allergensText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});

export default RecipeDetailScreen;
