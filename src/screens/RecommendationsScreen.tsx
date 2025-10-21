import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Datos de categorías
const categories = [
  {
    id: 'places',
    title: 'Lugares Family-Friendly',
    subtitle: 'Restaurantes, parques y entretenimiento',
    icon: 'location',
    color: '#FF6B6B',
    gradient: ['#FF6B6B', '#FF8E8E'],
  },
  {
    id: 'doctors',
    title: 'Médicos Pediatras',
    subtitle: 'Doctores especializados en niños',
    icon: 'medical',
    color: '#4ECDC4',
    gradient: ['#4ECDC4', '#6DD5DB'],
  },
  {
    id: 'babysitters',
    title: 'Niñeras Confiables',
    subtitle: 'Cuidadores recomendados por la comunidad',
    icon: 'people',
    color: '#45B7D1',
    gradient: ['#45B7D1', '#6BC5E8'],
  },
  {
    id: 'daycare',
    title: 'Guarderías y Jardines',
    subtitle: 'Centros de cuidado infantil',
    icon: 'school',
    color: '#96CEB4',
    gradient: ['#96CEB4', '#A8D5C4'],
  },
];

const RecommendationsScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simular carga de datos
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    console.log(`📍 [RECOMMENDATIONS] Categoría seleccionada: ${categoryId}`);
    // Aquí se navegaría a la pantalla específica de la categoría
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#887CBC' }]}>
            <Ionicons name="add" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Agregar Lugar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#59C6C0' }]}>
            <Ionicons name="star" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Mis Favoritos</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.quickAction}>
          <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B6B' }]}>
            <Ionicons name="map" size={20} color="white" />
          </View>
          <Text style={styles.quickActionText}>Ver Mapa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRecentRecommendations = () => (
    <View style={styles.recentContainer}>
      <Text style={styles.sectionTitle}>Últimas Recomendaciones</Text>
      <View style={styles.recentItems}>
        {[
          { title: 'Parque Central Kids Zone', category: 'Lugares', rating: 4.8, reviews: 124 },
          { title: 'Dr. María González', category: 'Pediatra', rating: 4.9, reviews: 89 },
          { title: 'Guardería Pequeños Exploradores', category: 'Guardería', rating: 4.7, reviews: 56 },
        ].map((item, index) => (
          <TouchableOpacity key={index} style={styles.recentItem}>
            <View style={styles.recentItemIcon}>
              <Ionicons 
                name={index === 0 ? 'location' : index === 1 ? 'medical' : 'school'} 
                size={20} 
                color="#59C6C0" 
              />
            </View>
            <View style={styles.recentItemInfo}>
              <Text style={styles.recentItemTitle}>{item.title}</Text>
              <Text style={styles.recentItemCategory}>{item.category}</Text>
              <View style={styles.recentItemRating}>
                <Ionicons name="star" size={12} color="#FFD700" />
                <Text style={styles.ratingText}>{item.rating}</Text>
                <Text style={styles.reviewsText}>({item.reviews} reseñas)</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#CCC" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Recomendaciones</Text>
          <Text style={styles.subtitle}>Para Familias 👨‍👩‍👧‍👦</Text>
          
          {/* Barra de búsqueda */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar lugares, médicos, niñeras..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Categorías principales */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>¿Qué estás buscando?</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryCard,
                  selectedCategory === category.id && styles.selectedCategory
                ]}
                onPress={() => handleCategoryPress(category.id)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                  <Ionicons name={category.icon as any} size={28} color="white" />
                </View>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categorySubtitle}>{category.subtitle}</Text>
                <View style={styles.categoryArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#666" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Acciones rápidas */}
        {renderQuickActions()}

        {/* Recomendaciones recientes */}
        {renderRecentRecommendations()}

        {/* Espacio final */}
        <View style={styles.finalSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  
  // Header
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  
  // Búsqueda
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  
  // Secciones
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  
  // Categorías
  categoriesContainer: {
    padding: 20,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    minHeight: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCategory: {
    borderColor: '#59C6C0',
    backgroundColor: '#F0FDFC',
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 10,
  },
  categoryArrow: {
    position: 'absolute',
    top: 15,
    right: 15,
  },
  
  // Acciones rápidas
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Recomendaciones recientes
  recentContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  recentItems: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recentItemCategory: {
    fontSize: 12,
    color: '#59C6C0',
    marginBottom: 4,
    fontWeight: '500',
  },
  recentItemRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#333',
    marginLeft: 4,
    fontWeight: '600',
  },
  reviewsText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  
  // Espaciado
  finalSpacing: {
    height: 30,
  },
});

export default RecommendationsScreen;
