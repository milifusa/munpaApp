import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  DeviceEventEmitter,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shareChildService, InvitationDetails } from '../services/shareChildService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface RouteParams {
  token: string;
}

const AcceptInvitationScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { token } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitationDetails();
  }, []);

  const loadInvitationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const details = await shareChildService.getInvitationDetails(token);
      setInvitationDetails(details);
    } catch (error: any) {
      console.error('Error cargando detalles:', error);
      setError(error.response?.data?.message || 'No se pudo cargar la invitación');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    const childName = invitationDetails?.data.childName || invitationDetails?.data.child?.name || 'el hijo';
    Alert.alert(
      'Aceptar invitación',
      `¿Aceptas compartir la información de ${childName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            setAccepting(true);
            try {
              await shareChildService.acceptInvitation(token);
              
              // Limpiar el flag de hasChildren para forzar recarga de hijos
              await AsyncStorage.removeItem('hasChildren');
              
              // Emitir evento para que el ChildrenHeaderTitle recargue los hijos
              DeviceEventEmitter.emit('childrenUpdated');
              
              // Cerrar esta pantalla y navegar a Home
              navigation.navigate('Home' as never);
              
              // Mostrar mensaje de éxito después de navegar
              setTimeout(() => {
                Alert.alert(
                  '¡Éxito!',
                  `Ahora puedes ver la información de ${childName}`
                );
              }, 500);
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo aceptar la invitación'
              );
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    Alert.alert(
      'Rechazar invitación',
      '¿Estás seguro de que quieres rechazar esta invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            setRejecting(true);
            try {
              await shareChildService.rejectInvitation(token);
              Alert.alert('Invitación rechazada', '', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.goBack();
                  },
                },
              ]);
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo rechazar la invitación'
              );
            } finally {
              setRejecting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#59C6C0" style={styles.loader} />
      </View>
    );
  }

  if (error || !invitationDetails) {
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
          <Text style={styles.headerTitle}>Invitación</Text>
          <View style={styles.placeholder} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>
            {error || 'No se pudo cargar la invitación'}
          </Text>
        </View>
      </View>
    );
  }

  // Extraer datos de la respuesta del backend
  const data = invitationDetails.data;
  const childName = data.childName || data.child?.name || 'Hijo';
  const childPhotoUrl = data.childPhotoUrl || data.child?.photoUrl;
  const inviterName = data.inviterName || data.inviter?.name || 'Usuario';
  const inviterPhoto = data.inviterPhoto || data.inviter?.photoUrl;
  const role = data.role || data.invitation?.role || 'padre';

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
        <Text style={styles.headerTitle}>Invitación</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.title}>Te invitaron a compartir</Text>
          <Text style={styles.subtitle}>
            {inviterName} quiere compartir la información de un hijo contigo
          </Text>

          {/* Información del hijo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del hijo</Text>
            <View style={styles.childInfo}>
              {childPhotoUrl ? (
                <Image source={{ uri: childPhotoUrl }} style={styles.childPhoto} />
              ) : (
                <View style={styles.childPhotoPlaceholder}>
                  <Ionicons name="person" size={40} color="#59C6C0" />
                </View>
              )}
              <Text style={styles.childName}>{childName}</Text>
            </View>
          </View>

          {/* Información del invitador */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quien te invita</Text>
            <View style={styles.inviterInfo}>
              {inviterPhoto ? (
                <Image source={{ uri: inviterPhoto }} style={styles.inviterPhoto} />
              ) : (
                <View style={styles.inviterPhotoPlaceholder}>
                  <Ionicons name="person" size={30} color="#59C6C0" />
                </View>
              )}
              <Text style={styles.inviterName}>{inviterName}</Text>
            </View>
          </View>

          {/* Rol */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu rol será</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="person" size={20} color="#59C6C0" />
              <Text style={styles.roleText}>{role}</Text>
            </View>
          </View>

          {/* Botones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={handleReject}
              disabled={rejecting}
            >
              {rejecting ? (
                <ActivityIndicator size="small" color="#FF6B6B" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Aceptar</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    marginTop: 100,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
  card: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  childInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
  },
  childPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  childPhotoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F8F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  childName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  inviterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
  },
  inviterPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  inviterPhotoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F8F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  inviterName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#E8F8F7',
    borderRadius: 12,
    gap: 12,
  },
  roleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#59C6C0',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#96d2d3',
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rejectButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  rejectButtonText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AcceptInvitationScreen;

