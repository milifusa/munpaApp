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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareChildService, ChildInvitation } from '../services/shareChildService';

const ChildInvitationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [invitations, setInvitations] = useState<ChildInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const data = await shareChildService.getInvitations();
      setInvitations(data);
    } catch (error: any) {
      console.error('Error cargando invitaciones:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleInvitationPress = (invitation: ChildInvitation) => {
    navigation.navigate('AcceptInvitation' as never, { token: invitation.token } as never);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#59C6C0', '#4DB8B3']}
        style={[styles.header, { paddingTop: insets.top + 20 }]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invitaciones</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#59C6C0" style={styles.loader} />
        ) : invitations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="mail-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No hay invitaciones pendientes</Text>
            <Text style={styles.emptySubtext}>
              Cuando alguien comparta un hijo contigo, aparecerá aquí
            </Text>
          </View>
        ) : (
          <View style={styles.invitationsList}>
            {invitations.map((invitation) => (
              <TouchableOpacity
                key={invitation.token}
                style={[
                  styles.invitationCard,
                  isExpired(invitation.expiresAt) && styles.invitationCardExpired,
                ]}
                onPress={() => handleInvitationPress(invitation)}
                disabled={isExpired(invitation.expiresAt)}
              >
                <View style={styles.invitationHeader}>
                  <View style={styles.invitationInfo}>
                    <Ionicons
                      name="person-circle"
                      size={40}
                      color={isExpired(invitation.expiresAt) ? '#CCC' : '#59C6C0'}
                    />
                    <View style={styles.invitationDetails}>
                      <Text style={styles.childName}>{invitation.childName}</Text>
                      <Text style={styles.inviterName}>
                        Invitado por: {invitation.invitedByName || 'Usuario'}
                      </Text>
                      <Text style={styles.roleText}>Rol: {invitation.role}</Text>
                    </View>
                  </View>
                  {isExpired(invitation.expiresAt) ? (
                    <View style={styles.expiredBadge}>
                      <Text style={styles.expiredText}>Expirada</Text>
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={24} color="#999" />
                  )}
                </View>
                <View style={styles.invitationFooter}>
                  <Text style={styles.expiresText}>
                    Expira: {formatDate(invitation.expiresAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loader: {
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  invitationsList: {
    marginTop: 20,
  },
  invitationCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  invitationCardExpired: {
    opacity: 0.6,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invitationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invitationDetails: {
    marginLeft: 12,
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  inviterName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#59C6C0',
    fontWeight: '600',
  },
  expiredBadge: {
    backgroundColor: '#FFE0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  expiredText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  invitationFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  expiresText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ChildInvitationsScreen;

