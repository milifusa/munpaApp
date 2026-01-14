import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { childrenService } from '../services/api';

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  photoUrl?: string | null;
  createdAt: any;
  currentAgeInMonths?: number | null;
  currentGestationWeeks?: number | null;
  registeredAgeInMonths?: number | null;
  registeredGestationWeeks?: number | null;
  daysSinceCreation?: number;
  isOverdue?: boolean;
  birthDate?: string;
  gender?: string;
}

const ChildrenListScreen: React.FC = () => {
  const navigation = useNavigation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadChildren = async () => {
    try {
      const response = await childrenService.getChildren();
      if (response.success && response.data) {
        setChildren(response.data);
      }
    } catch (error) {
      console.error('Error cargando hijos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadChildren();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadChildren();
  };

  const handleChildPress = (child: Child) => {
    // @ts-ignore
    navigation.navigate('ChildProfile', { childId: child.id, child: child });
  };

  const handleAddChild = () => {
    // @ts-ignore
    navigation.navigate('ChildrenData', {
      childrenCount: 1,
      gender: 'F',
    });
  };

  const getChildAge = (child: Child) => {
    if (child.isUnborn) {
      const weeks = child.currentGestationWeeks || child.gestationWeeks || 0;
      return `${weeks} semanas de gestación`;
    }
    
    const months = child.currentAgeInMonths || child.ageInMonths || 0;
    if (months < 12) {
      return `${months} ${months === 1 ? 'mes' : 'meses'}`;
    }
    
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    if (remainingMonths === 0) {
      return `${years} ${years === 1 ? 'año' : 'años'}`;
    }
    
    return `${years}a ${remainingMonths}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#96d2d3" barStyle="light-content" />
        <ActivityIndicator size="large" color="#FFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar backgroundColor="#96d2d3" barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Hijos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddChild}
        >
          <View style={styles.addButtonCircle}>
            <Ionicons name="add" size={24} color="#FFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Lista de hijos */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>👶</Text>
            <Text style={styles.emptyTitle}>No hay hijos registrados</Text>
            <Text style={styles.emptyText}>
              Agrega a tu primer hijo para comenzar a usar todas las funciones de la app
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={handleAddChild}
            >
              <Ionicons name="add-circle" size={24} color="#FFF" />
              <Text style={styles.emptyButtonText}>Agregar Hijo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          children
            .filter(child => child && child.id && child.name)
            .map((child) => (
              <TouchableOpacity
                key={child.id}
                style={styles.childCard}
                onPress={() => handleChildPress(child)}
              >
                {/* Foto del hijo */}
                <View style={styles.childPhotoContainer}>
                  {child.photoUrl ? (
                    <Image
                      source={{ uri: child.photoUrl }}
                      style={styles.childPhoto}
                    />
                  ) : (
                    <View style={styles.childPhotoPlaceholder}>
                      <Text style={styles.childPhotoEmoji}>
                        {child.isUnborn ? '🤰' : '👶'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Información del hijo */}
                <View style={styles.childInfo}>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childAge}>{getChildAge(child)}</Text>
                  
                  {/* Badges */}
                  <View style={styles.badgesContainer}>
                    {child.isUnborn && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Por nacer</Text>
                      </View>
                    )}
                    {child.gender && (
                      <View style={[styles.badge, styles.genderBadge]}>
                        <Text style={styles.badgeText}>
                          {child.gender === 'M' ? '👦 Niño' : '👧 Niña'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Icono de flecha */}
                <Ionicons name="chevron-forward" size={24} color="#96d2d3" />
              </TouchableOpacity>
            ))
        )}

        {/* Botón agregar al final */}
        {children.length > 0 && (
          <TouchableOpacity
            style={styles.addChildCard}
            onPress={handleAddChild}
          >
            <View style={styles.addChildIcon}>
              <Ionicons name="add" size={40} color="#96d2d3" />
            </View>
            <Text style={styles.addChildText}>Agregar otro hijo</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#96d2d3',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  addButton: {
    padding: 8,
  },
  addButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#96d2d3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    lineHeight: 24,
    fontFamily: 'Montserrat',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  childPhotoContainer: {
    marginRight: 16,
  },
  childPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
  },
  childPhotoPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childPhotoEmoji: {
    fontSize: 36,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  childAge: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    backgroundColor: '#E6F7F5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  genderBadge: {
    backgroundColor: '#F0E6FF',
  },
  badgeText: {
    fontSize: 12,
    color: '#2D3748',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  addChildCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#96d2d3',
    borderStyle: 'dashed',
  },
  addChildIcon: {
    marginRight: 12,
  },
  addChildText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#96d2d3',
    fontFamily: 'Montserrat',
  },
});

export default ChildrenListScreen;

