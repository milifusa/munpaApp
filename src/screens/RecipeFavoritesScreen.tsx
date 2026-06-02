import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import nutritionService, { Recipe } from '../services/nutritionService';

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_ORANGE = '#FF9244';

interface FavoriteItem {
  favoriteId: string;
  recipe: Recipe;
}

const RecipeFavoritesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const response = await nutritionService.getFavorites();
      const raw = (response.data as any[]) || [];
      if (raw.length > 0) {
        console.log('🔍 [FAVORITES] Estructura item[0]:', JSON.stringify(raw[0], null, 2));
      }
      const items: FavoriteItem[] = raw
        .map((item: any) => {
          const recipe = item.recipe || item.recipeData || item.recipeObject || (item.name ? item : null);
          if (!recipe?.mealType) return null;
          return {
            favoriteId: item.favoriteId || item.id,
            recipe,
          };
        })
        .filter(Boolean) as FavoriteItem[];
      setFavorites(items);
    } catch (err: any) {
      console.error('❌ [FAVORITES] Error cargando:', err.response?.data || err.message || err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadFavorites(); }, []));

  const handleRemove = (favoriteId: string, recipeName: string) => {
    Alert.alert(
      'Eliminar favorito',
      `¿Quitar "${recipeName}" de tus recetas guardadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setRemoving(favoriteId);
            try {
              await nutritionService.deleteFavorite(favoriteId);
              setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el favorito.');
            } finally {
              setRemoving(null);
            }
          },
        },
      ]
    );
  };

  const getMealIcon = (mealType: string) => {
    if (mealType === 'breakfast') return '🌅';
    if (mealType === 'lunch') return '☀️';
    return '🌙';
  };

  const getMealLabel = (mealType: string) => {
    if (mealType === 'breakfast') return 'Desayuno';
    if (mealType === 'lunch') return 'Almuerzo';
    return 'Cena';
  };

  const renderItem = ({ item }: { item: FavoriteItem }) => {
    const { recipe, favoriteId } = item;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() => navigation.navigate('RecipeDetail', { recipeId: recipe.id, recipeData: recipe })}
      >
        {recipe.imageUrl ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: recipe.imageUrl }} style={styles.image} resizeMode="cover" />
            <View style={styles.mealBadge}>
              <Text style={styles.mealBadgeText}>{getMealLabel(recipe.mealType)}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.info}>
          {!recipe.imageUrl && (
            <View style={styles.mealBadgeInline}>
              <Text style={styles.mealBadgeText}>{getMealLabel(recipe.mealType)}</Text>
            </View>
          )}
          <Text style={styles.recipeName} numberOfLines={2}>{recipe.name}</Text>
          <Text style={styles.recipeDesc} numberOfLines={2}>{recipe.description}</Text>
          <View style={styles.meta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{(recipe.prepTime || 0) + (recipe.cookTime || 0)}min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="restaurant-outline" size={13} color="#6B7280" />
              <Text style={styles.metaText}>{recipe.servings} porc.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemove(favoriteId, recipe.name)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {removing === favoriteId ? (
            <ActivityIndicator size="small" color="#EF4444" />
          ) : (
            <Ionicons name="heart" size={22} color="#EF4444" />
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recetas guardadas</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
            <Text style={styles.loadingText}>Cargando recetas guardadas...</Text>
          </View>
        ) : favorites.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="heart-outline" size={72} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Sin recetas guardadas</Text>
            <Text style={styles.emptyText}>
              Toca el corazón en cualquier receta para guardarla aquí.
            </Text>
          </View>
        ) : (
          <FlatList
            data={favorites}
            keyExtractor={(item) => item.favoriteId}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            numColumns={2}
            columnWrapperStyle={styles.row}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: MUNPA_PRIMARY,
  },
  body: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    paddingBottom: 32,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 130,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  mealBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  mealBadgeInline: {
    alignSelf: 'flex-start',
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 6,
  },
  mealBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'uppercase',
  },
  info: {
    padding: 10,
    paddingBottom: 6,
  },
  recipeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },
  recipeDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  meta: {
    flexDirection: 'row',
    gap: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RecipeFavoritesScreen;
