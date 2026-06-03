import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { communitiesService } from '../services/api';

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  userPhoto?: string | null;
  communityId: string;
  communityName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  requestDate?: any; // Firestore Timestamp (opcional)
  message?: string;
}

const CommunityRequestsScreen: React.FC = () => {
  const route = useRoute<any>();
  const { communityId, communityName } = route.params;
  const navigation = useNavigation();
  const { isAuthenticated } = useAuth();
  
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

  // Cargar solicitudes al montar el componente
  useEffect(() => {
    loadRequests();
  }, [communityId]);

  // Limpiar estado cuando el usuario se desconecta
  useEffect(() => {
    if (!isAuthenticated) {
      setRequests([]);
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Debug: Log cuando cambia el estado de requests
  useEffect(() => {
  }, [requests]);

  // Función para cargar las solicitudes
  const loadRequests = async () => {
    // Verificar que el usuario esté autenticado antes de cargar datos
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await communitiesService.getJoinRequests(communityId);
      
      
      if (result.success) {
        // El backend devuelve data directamente, no data.requests
        const requestsData = result.data || [];
        
        const finalRequests = Array.isArray(requestsData) ? requestsData : [];
        setRequests(finalRequests);
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error('❌ [REQUESTS] Error cargando solicitudes:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar las solicitudes pendientes',
        [{ text: 'OK' }]
      );
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para refrescar las solicitudes
  const onRefresh = async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  };

  // Función para aprobar una solicitud
  const handleApproveRequest = async (request: JoinRequest) => {
    Alert.alert(
      'Aprobar Solicitud',
      `¿Estás seguro de que quieres aprobar la solicitud de ${request.userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aprobar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingRequestId(request.id);
              
              // Llamar al endpoint para aprobar la solicitud
              const result = await communitiesService.updateJoinRequest(
                communityId, 
                request.id, 
                'approve'
              );
              
              if (result.success) {
                // Recargar solicitudes para mostrar el estado actualizado
                await loadRequests();
                
                Alert.alert(
                  'Solicitud Aprobada',
                  `${request.userName} ahora es miembro de la comunidad`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(result.message || 'No se pudo aprobar la solicitud');
              }
            } catch (error: any) {
              console.error('❌ [REQUESTS] Error aprobando solicitud:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo aprobar la solicitud',
                [{ text: 'OK' }]
              );
            } finally {
              setProcessingRequestId(null);
            }
          }
        }
      ]
    );
  };

  // Función para rechazar una solicitud
  const handleRejectRequest = async (request: JoinRequest) => {
    Alert.alert(
      'Rechazar Solicitud',
      `¿Estás seguro de que quieres rechazar la solicitud de ${request.userName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingRequestId(request.id);
              
              // Llamar al endpoint para rechazar la solicitud
              const result = await communitiesService.updateJoinRequest(
                communityId, 
                request.id, 
                'reject'
              );
              
              if (result.success) {
                // Recargar solicitudes para mostrar el estado actualizado
                await loadRequests();
                
                Alert.alert(
                  'Solicitud Rechazada',
                  `La solicitud de ${request.userName} ha sido rechazada`,
                  [{ text: 'OK' }]
                );
              } else {
                throw new Error(result.message || 'No se pudo rechazar la solicitud');
              }
            } catch (error: any) {
              console.error('❌ [REQUESTS] Error rechazando solicitud:', error);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo rechazar la solicitud',
                [{ text: 'OK' }]
              );
            } finally {
              setProcessingRequestId(null);
            }
          }
        }
      ]
    );
    };

  // Función para convertir timestamp de Firestore a fecha válida
  const parseFirestoreTimestamp = (timestamp: any): Date => {
    
    if (timestamp && typeof timestamp === 'object' && timestamp._seconds) {
      // Es un timestamp de Firestore
      const seconds = timestamp._seconds;
      const nanoseconds = timestamp._nanoseconds || 0;
      const date = new Date(seconds * 1000 + nanoseconds / 1000000);
      return date;
    } else if (typeof timestamp === 'string') {
      // Es un string de fecha normal
      const date = new Date(timestamp);
      return date;
    } else if (timestamp instanceof Date) {
      // Ya es una fecha
      return timestamp;
    } else {
      // Fallback a fecha actual
      console.warn('⚠️ [REQUESTS] Timestamp no reconocido:', timestamp);
      return new Date();
    }
  };

  // Función para formatear la fecha
  const formatDate = (timestamp: any) => {
    try {
      const date = parseFirestoreTimestamp(timestamp);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('❌ [REQUESTS] Error formateando fecha:', error);
      return 'Fecha inválida';
    }
  };

  // Función para obtener el color del estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'approved':
        return '#32CD32';
      case 'rejected':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return 'Desconocido';
    }
  };

  // Si el usuario no está autenticado, mostrar mensaje
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => (navigation as any).navigate('Communities')}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Solicitudes Pendientes</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="lock-closed" size={64} color="#CCC" />
          <Text style={styles.emptyStateTitle}>Sesión Expirada</Text>
          <Text style={styles.emptyStateText}>
            Tu sesión ha expirado. Por favor, inicia sesión nuevamente.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            (navigation as any).navigate('Communities');
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitudes Pendientes</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Información de la comunidad */}
      <View style={styles.communityInfo}>
        <Ionicons name="people" size={24} color="#59C6C0" />
        <Text style={styles.communityName}>{communityName}</Text>
      </View>

      {/* Contenido principal */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C6C0" />
            <Text style={styles.loadingText}>Cargando solicitudes...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={64} color="#CCC" />
            <Text style={styles.emptyStateTitle}>No hay solicitudes pendientes</Text>
            <Text style={styles.emptyStateText}>
              Cuando alguien solicite unirse a tu comunidad, aparecerá aquí
            </Text>
          </View>
        ) : (
          <View style={styles.requestsContainer}>
            <Text style={styles.sectionTitle}>
              {requests.length} solicitud{requests.length !== 1 ? 'es' : ''} pendiente{requests.length !== 1 ? 's' : ''}
            </Text>
            
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                                 {/* Información del usuario */}
                 <View style={styles.userInfo}>
                   <View style={styles.userAvatar}>
                     {request.userPhoto ? (
                       <Image source={{ uri: request.userPhoto }} style={styles.userAvatarImage} />
                     ) : (
                       <Ionicons name="person" size={24} color="#666" />
                     )}
                   </View>
                   <View style={styles.userDetails}>
                     <Text style={styles.userName}>{request.userName || 'Usuario'}</Text>
                     {request.userEmail && (
                       <Text style={styles.userEmail}>{request.userEmail}</Text>
                     )}
                     <Text style={styles.requestDate}>
                       Solicitó unirse el {formatDate(request.createdAt)}
                     </Text>
                   </View>
                 </View>

                {/* Estado de la solicitud */}
                <View style={styles.requestStatus}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(request.status)}</Text>
                  </View>
                </View>

                {/* Mensaje opcional */}
                {request.message && (
                  <View style={styles.messageContainer}>
                    <Text style={styles.messageLabel}>Mensaje:</Text>
                    <Text style={styles.messageText}>{request.message}</Text>
                  </View>
                )}

                                 {/* Acciones (solo para solicitudes pendientes) */}
                 {request.status === 'pending' && (
                   <View style={styles.actionsContainer}>
                     <TouchableOpacity
                       style={[
                         styles.actionButton, 
                         styles.approveButton,
                         processingRequestId === request.id && styles.actionButtonDisabled
                       ]}
                       onPress={() => handleApproveRequest(request)}
                       disabled={processingRequestId === request.id}
                     >
                       {processingRequestId === request.id ? (
                         <ActivityIndicator size="small" color="white" />
                       ) : (
                         <>
                           <Ionicons name="checkmark" size={16} color="white" />
                           <Text style={styles.actionButtonText}>Aprobar</Text>
                         </>
                       )}
                     </TouchableOpacity>
                     
                     <TouchableOpacity
                       style={[
                         styles.actionButton, 
                         styles.rejectButton,
                         processingRequestId === request.id && styles.actionButtonDisabled
                       ]}
                       onPress={() => handleRejectRequest(request)}
                       disabled={processingRequestId === request.id}
                     >
                       {processingRequestId === request.id ? (
                         <ActivityIndicator size="small" color="white" />
                       ) : (
                         <>
                           <Ionicons name="close" size={16} color="white" />
                           <Text style={styles.actionButtonText}>Rechazar</Text>
                         </>
                       )}
                     </TouchableOpacity>
                   </View>
                 )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFC',
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 10 : 10,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#F7FAFC',
  },
  
  backButton: {
    padding: 12,
    marginLeft: -5,
    marginTop: 5,
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  
  placeholder: {
    width: 34,
  },
  
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#F7FAFC',
  },
  
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  
  content: {
    flex: 1,
  },
  
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
  
  requestsContainer: {
    padding: 20,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  
  userDetails: {
    flex: 1,
  },
  
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  
  requestStatus: {
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  
  messageContainer: {
    backgroundColor: '#F7FAFC',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  
  approveButton: {
    backgroundColor: '#32CD32',
  },
  
  rejectButton: {
    backgroundColor: '#FF6B6B',
  },
  
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  debugText: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 2,
  },

});

export default CommunityRequestsScreen;
