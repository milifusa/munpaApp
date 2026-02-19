import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Recipe } from '../services/nutritionService';
import analyticsService from '../services/analyticsService';

interface RecipeCardProps {
  recipe: Recipe;
}

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_ORANGE = '#FF9244';

const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const [showDetails, setShowDetails] = useState(false);

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

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setShowDetails(true);
          // ✅ Analytics: Receta abierta
          analyticsService.logEvent('nutrition_recipe_viewed', {
            recipe_id: recipe.id,
            recipe_name: recipe.name,
            meal_type: recipe.mealType,
            child_id: recipe.childId,
            age_months: recipe.ageMonths,
          });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <View style={styles.mealTypeContainer}>
            <Text style={styles.mealIcon}>{getMealIcon(recipe.mealType)}</Text>
            <Text style={styles.mealType}>{getMealTypeLabel(recipe.mealType)}</Text>
          </View>
        </View>

        <Text style={styles.name}>{recipe.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {recipe.description}
        </Text>

        <View style={styles.meta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{recipe.prepTime + recipe.cookTime}min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="restaurant-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{recipe.servings} porción{recipe.servings > 1 ? 'es' : ''}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="bar-chart-outline" size={16} color="#6B7280" />
            <Text style={styles.metaText}>{recipe.difficulty}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            setShowDetails(true);
            analyticsService.logEvent('nutrition_recipe_viewed', {
              recipe_id: recipe.id,
              recipe_name: recipe.name,
              meal_type: recipe.mealType,
              child_id: recipe.childId,
              age_months: recipe.ageMonths,
            });
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.viewButtonText}>Ver receta completa</Text>
          <Ionicons name="chevron-forward" size={20} color={MUNPA_PRIMARY} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Modal de detalles */}
      <Modal
        visible={showDetails}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetails(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowDetails(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Receta</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.modalMealType}>
              <Text style={styles.modalMealIcon}>{getMealIcon(recipe.mealType)}</Text>
              <Text style={styles.modalMealLabel}>{getMealTypeLabel(recipe.mealType)}</Text>
            </View>

            <Text style={styles.modalRecipeName}>{recipe.name}</Text>
            <Text style={styles.modalDescription}>{recipe.description}</Text>

            <View style={styles.modalMeta}>
              <View style={styles.modalMetaItem}>
                <Ionicons name="time-outline" size={20} color={MUNPA_ORANGE} />
                <Text style={styles.modalMetaLabel}>Preparación</Text>
                <Text style={styles.modalMetaValue}>{recipe.prepTime}min</Text>
              </View>
              <View style={styles.modalMetaItem}>
                <Ionicons name="flame-outline" size={20} color={MUNPA_ORANGE} />
                <Text style={styles.modalMetaLabel}>Cocción</Text>
                <Text style={styles.modalMetaValue}>{recipe.cookTime}min</Text>
              </View>
              <View style={styles.modalMetaItem}>
                <Ionicons name="restaurant-outline" size={20} color={MUNPA_ORANGE} />
                <Text style={styles.modalMetaLabel}>Porciones</Text>
                <Text style={styles.modalMetaValue}>{recipe.servings}</Text>
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
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mealIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  mealType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: MUNPA_PRIMARY,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalMealType: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalMealIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  modalMealLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  modalRecipeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  modalMetaItem: {
    alignItems: 'center',
  },
  modalMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  modalMetaValue: {
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

export default RecipeCard;
