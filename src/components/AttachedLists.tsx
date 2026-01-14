import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AttachedList } from '../types/posts';

interface AttachedListsProps {
  lists: AttachedList[];
  onListPress?: (listId: string) => void;
}

const AttachedLists: React.FC<AttachedListsProps> = ({ lists, onListPress }) => {
  // Debug: verificar qué se está recibiendo
  console.log('📋 [ATTACHED LISTS] Componente renderizado con:', {
    lists: lists,
    listsCount: lists?.length || 0,
    isArray: Array.isArray(lists)
  });
  
  if (!lists || lists.length === 0) {
    console.log('📋 [ATTACHED LISTS] No hay listas para mostrar');
    return null;
  }
  
  console.log('📋 [ATTACHED LISTS] Mostrando', lists.length, 'listas');

  const getProgressPercentage = (completed: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list" size={18} color="#59C6C0" />
        <Text style={styles.headerText}>
          {lists.length} {lists.length === 1 ? 'Lista adjunta' : 'Listas adjuntas'}
        </Text>
      </View>
      
      {lists.map((list) => {
        const progress = getProgressPercentage(list.completedItems, list.totalItems);
        
        return (
          <TouchableOpacity
            key={list.id}
            style={styles.listCard}
            onPress={() => onListPress?.(list.id)}
            activeOpacity={0.7}
          >
            {list.imageUrl && (
              <Image source={{ uri: list.imageUrl }} style={styles.listImage} />
            )}
            
            <View style={styles.listContent}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {list.title}
                </Text>
                {list.isPublic && (
                  <View style={styles.publicBadge}>
                    <Ionicons name="globe" size={12} color="#59C6C0" />
                  </View>
                )}
              </View>
              
              {list.description && (
                <Text style={styles.listDescription} numberOfLines={2}>
                  {list.description}
                </Text>
              )}
              
              <View style={styles.listStats}>
                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                  <Text style={styles.statText}>
                    {list.completedItems}/{list.totalItems} completados
                  </Text>
                </View>
                
                {list.totalItems > 0 && (
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${progress}%` }
                      ]} 
                    />
                  </View>
                )}
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 6,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  listImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#E0E0E0',
  },
  listContent: {
    flex: 1,
    marginRight: 8,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  publicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  listDescription: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'Montserrat',
    marginBottom: 8,
    lineHeight: 18,
  },
  listStats: {
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
});

export default AttachedLists;

