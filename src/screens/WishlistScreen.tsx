import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

interface Recommendation {
  id: string;
  name: string;
  description: string;
  address?: string;
  phone?: string;
  imageUrl?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  stats?: {
    totalReviews: number;
    averageRating: number;
  };
  wishlistId?: string; // ID del documento en la colección wishlist
  addedAt?: Date;
  notes?: string;
  priority?: 'low' | 'medium' | 'high';
}

const WishlistScreen = ({ navigation }: any) => {
  const [wishlist, setWishlist] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    console.log('💝 [WISHLIST] Cargando lista de deseos...');
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getWishlist();
      
      if (response.success && response.data) {
        console.log('✅ [WISHLIST] Lista cargada:', response.data.length);
        setWishlist(response.data);
      } else {
        console.log('⚠️ [WISHLIST] Respuesta sin datos');
        setError('No se pudo cargar tu lista de deseos');
      }
    } catch (error: any) {
      console.error('❌ [WISHLIST] Error cargando:', error);
      setError('Error al cargar tu lista de deseos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWishlist();
    setRefreshing(false);
  };

  const handleRemoveFromWishlist = async (wishlistId: string, recommendationId: string, name: string) => {
    Alert.alert(
      'Quitar de lista de deseos',
      `¿Quitar "${name}" de tu lista de deseos?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('💔 [WISHLIST] Quitando wishlistId:', wishlistId);
              await api.removeFromWishlist(wishlistId);
              
              // Actualizar lista local
              setWishlist(prev => prev.filter(item => item.id !== recommendationId));
              
              Alert.alert('✓', 'Quitado de tu lista de deseos');
            } catch (error) {
              console.error('❌ Error quitando de wishlist:', error);
              Alert.alert('Error', 'No se pudo quitar de tu lista');
            }
          },
        },
      ]
    );
  };

  const handleRecommendationPress = (recommendation: Recommendation) => {
    navigation.navigate('RecommendationDetail', {
      recommendationId: recommendation.id,
    });
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return '#FF6B6B';
      case 'medium':
        return '#FFB74D';
      case 'low':
        return '#81C784';
      default:
        return '#999';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'Alta';
      case 'medium':
        return 'Media';
      case 'low':
        return 'Baja';
      default:
        return '';
    }
  };

  const renderWishlistItem = (item: Recommendation) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      onPress={() => handleRecommendationPress(item)}
    >
      {/* Imagen */}
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={styles.cardImagePlaceholder}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.defaultIcon}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Botón de quitar */}
      <TouchableOpacity
        style={styles.removeButton}
        onPress={(e) => {
          e.stopPropagation();
          handleRemoveFromWishlist(item.wishlistId || item.id, item.id, item.name);
        }}
      >
        <Ionicons name="close-circle" size={28} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Contenido */}
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          
          {/* Badge de prioridad */}
          {item.priority && (
            <View style={[styles.priorityBadge, { backgroundColor: `${getPriorityColor(item.priority)}20` }]}>
              <Ionicons name="flag" size={12} color={getPriorityColor(item.priority)} />
              <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
                {getPriorityLabel(item.priority)}
              </Text>
            </View>
          )}
        </View>

        {/* Categoría */}
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category.name}</Text>
          </View>
        )}

        {/* Rating */}
        {item.stats && item.stats.totalReviews > 0 && (
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Ionicons
                  key={star}
                  name={star <= Math.round(item.stats?.averageRating || 0) ? 'star' : 'star-outline'}
                  size={14}
                  color="#FFD700"
                />
              ))}
            </View>
            <Text style={styles.ratingText}>
              {(item.stats.averageRating || 0).toFixed(1)} ({item.stats.totalReviews})
            </Text>
          </View>
        )}

        {/* Notas */}
        {item.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={14} color="#666" />
            <Text style={styles.notesText} numberOfLines={2}>
              {item.notes}
            </Text>
          </View>
        )}

        {/* Dirección */}
        {item.address && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color="#59C6C0" />
            <Text style={styles.infoText} numberOfLines={1}>
              {item.address}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <StatusBar barStyle="light-content" backgroundColor="#96d2d3" />
        <LinearGradient colors={['#59C6C0', '#4AB8B3']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <View style={styles.headerTitleRow}>
            <Ionicons name="bookmark" size={24} color="#FFF" />
            <Text style={styles.headerTitle}>Mi Lista de Deseos</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {!isLoading && `Lugares que planeo visitar • ${wishlist.length}`}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Estado de carga */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando tu lista...</Text>
          </View>
        )}

        {/* Estado de error */}
        {!isLoading && error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadWishlist}>
              <Ionicons name="refresh" size={20} color="white" />
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de wishlist */}
        {!isLoading && !error && wishlist.length > 0 && (
          <View style={styles.cardsContainer}>
            {wishlist.map(item => renderWishlistItem(item))}
          </View>
        )}

        {/* Estado vacío */}
        {!isLoading && !error && wishlist.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="bookmark-outline" size={80} color="#CCC" />
            <Text style={styles.emptyTitle}>Tu lista está vacía</Text>
            <Text style={styles.emptySubtext}>
              Planea tus próximas visitas. Guarda lugares que quieras conocer y organízalos por prioridad.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('RecommendationsMain')}
            >
              <Ionicons name="compass-outline" size={20} color="white" />
              <Text style={styles.exploreButtonText}>Explorar Recomendaciones</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.finalSpacing} />
      </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  content: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollView: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerCenter: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },

  // Cards
  cardsContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F0F0',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultIcon: {
    width: 70,
    height: 70,
    opacity: 0.6,
  },
  removeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1,
  },
  cardContent: {
    padding: 15,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },

  // Estados
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#96d2d3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#96d2d3',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  exploreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  finalSpacing: {
    height: 30,
  },
});

export default WishlistScreen;

