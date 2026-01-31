import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';
import ProfilePhoto from '../components/ProfilePhoto';


const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user, logout, updateProfile, changePassword, deleteAccount } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Estados para editar perfil
  const [editName, setEditName] = useState(user?.name || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editGender, setEditGender] = useState<'M' | 'F' | ''>('');
  const [editChildrenCount, setEditChildrenCount] = useState(0);
  const [editIsPregnant, setEditIsPregnant] = useState(false);
  const [editGestationWeeks, setEditGestationWeeks] = useState(0);

  // Estados para cambiar contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Cargar perfil completo al iniciar
  useEffect(() => {
    loadProfile();
  }, []);

  // Recargar perfil cuando la pantalla reciba foco (ej: después de cambiar ubicación)
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Profile screen focused, reloading profile...');
      loadProfile();
    }, [])
  );

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const response = await authService.getProfile();
      const userData = response.data;
      
      setProfile(userData);
      setEditName(userData.displayName || userData.name || '');
      setEditEmail(userData.email || '');
      setEditGender(userData.gender || '');
      setEditChildrenCount(userData.childrenCount || 0);
      setEditIsPregnant(userData.isPregnant || false);
      setEditGestationWeeks(userData.gestationWeeks || 0);
      
      console.log('📊 Perfil cargado:', userData);
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      Alert.alert('Error', 'No se pudo cargar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() && !editEmail.trim() && !editGender) {
      Alert.alert('Error', 'Por favor ingresa al menos un campo para actualizar');
      return;
    }

    setIsLoading(true);
    try {
      const profileData: any = {};
      if (editName.trim()) profileData.displayName = editName.trim();
      if (editEmail.trim()) profileData.email = editEmail.trim();
      if (editGender) profileData.gender = editGender;
      profileData.childrenCount = editChildrenCount;
      profileData.isPregnant = editIsPregnant;
      if (editIsPregnant) {
        profileData.gestationWeeks = editGestationWeeks;
      }

      console.log('📤 Actualizando perfil con datos:', profileData);
      await updateProfile(profileData);
      
      setShowEditModal(false);
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
      
      // Recargar perfil para obtener datos actualizados
      await loadProfile();
    } catch (error: any) {
      console.error('❌ Error actualizando perfil:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al actualizar el perfil'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Éxito', 'Contraseña cambiada correctamente');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al cambiar la contraseña'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Eliminar cuenta',
      '¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await deleteAccount();
              Alert.alert('Cuenta eliminada', 'Tu cuenta ha sido eliminada correctamente');
            } catch (error: any) {
              Alert.alert(
                'Error',
                error.response?.data?.message || 'Error al eliminar la cuenta'
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.mainContainer}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.photoContainer}>
          <ProfilePhoto
            photoURL={profile?.photoURL || user?.photoURL}
            onPhotoUpdated={async (newPhotoURL) => {
              setProfile({ ...profile, photoURL: newPhotoURL });
              // Actualizar el contexto de autenticación
              await updateProfile({ photoURL: newPhotoURL || '' });
              // Recargar perfil después de actualizar foto
              loadProfile();
            }}
            size={110}
            editable={true}
          />
          <View style={styles.editPhotoIndicator}>
            <Ionicons name="camera" size={18} color="white" />
          </View>
        </View>
        <Text style={styles.name}>
          {profile?.displayName || user?.name || 'Usuario'}
        </Text>
        <Text style={styles.email}>
          {profile?.email || user?.email || 'usuario@email.com'}
        </Text>
        {profile?.isPregnant && (
          <View style={styles.pregnantBadge}>
            <Ionicons name="heart" size={16} color="#E91E63" />
            <Text style={styles.pregnantBadgeText}>
              {profile?.gender === 'F' ? 'Embarazada' : 'Esperando bebé'}
            </Text>
          </View>
        )}
      </View>

      {/* Información del perfil */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="person-circle" size={24} color="#887CBC" />
          <Text style={styles.sectionTitle}>Información Personal</Text>
        </View>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="person-outline" size={20} color="#887CBC" />
              <Text style={styles.infoLabel}>Nombre</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile?.displayName || user?.name || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="mail-outline" size={20} color="#887CBC" />
              <Text style={styles.infoLabel}>Email</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile?.email || user?.email || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name={profile?.gender === 'M' ? 'male' : profile?.gender === 'F' ? 'female' : 'male-female'} size={20} color="#887CBC" />
              <Text style={styles.infoLabel}>Género</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile?.gender === 'M' ? 'Papá' : 
               profile?.gender === 'F' ? 'Mamá' : 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="people-outline" size={20} color="#887CBC" />
              <Text style={styles.infoLabel}>Hijos</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile?.childrenCount || 0}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name={profile?.isPregnant ? 'heart' : 'heart-outline'} size={20} color={profile?.isPregnant ? '#E91E63' : '#887CBC'} />
              <Text style={styles.infoLabel}>Estado</Text>
            </View>
            <Text style={[styles.infoValue, profile?.isPregnant && styles.pregnantText]}>
              {profile?.isPregnant ? 
                (profile?.gender === 'F' ? '🤰 Embarazada' : '👶 Esperando bebé') : 
                'Sin embarazo'}
            </Text>
          </View>

          <View style={[styles.infoRow, styles.lastInfoRow]}>
            <View style={styles.infoLeft}>
              <Ionicons name="location-outline" size={20} color="#887CBC" />
              <Text style={styles.infoLabel}>Ubicación</Text>
            </View>
            <Text style={styles.infoValue}>
              {profile?.cityName || profile?.city || profile?.countryName || profile?.country
                ? `${profile?.cityName || profile?.city || 'Ciudad no disponible'}, ${profile?.countryName || profile?.country || 'País no disponible'}`
                : 'No disponible'}
            </Text>
          </View>
          
          {profile?.isPregnant && (
            <View style={[styles.infoRow, styles.lastInfoRow]}>
              <View style={styles.infoLeft}>
                <Ionicons name="calendar-outline" size={20} color="#E91E63" />
                <Text style={styles.infoLabel}>Gestación</Text>
              </View>
              <Text style={[styles.infoValue, styles.pregnantText]}>
                {profile?.gestationWeeks || 0} semanas
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings" size={24} color="#887CBC" />
          <Text style={styles.sectionTitle}>Configuración</Text>
        </View>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowEditModal(true)}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="create-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Editar Perfil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPasswordModal(true)}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="key-outline" size={22} color="white" />
            <Text style={styles.actionButtonText}>Cambiar Contraseña</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={logout}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="log-out-outline" size={22} color="white" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleDeleteAccount}
        >
          <View style={styles.actionButtonContent}>
            <Ionicons name="trash-outline" size={22} color="white" />
            <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>

      {/* Modal para editar perfil */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre completo</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Tu nombre completo"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Soy:</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editGender === 'M' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditGender('M')}
                >
                  <Text style={[
                    styles.genderButtonText,
                    editGender === 'M' && styles.genderButtonTextActive
                  ]}>
                    Papá
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.genderButton,
                    editGender === 'F' && styles.genderButtonActive
                  ]}
                  onPress={() => setEditGender('F')}
                >
                  <Text style={[
                    styles.genderButtonText,
                    editGender === 'F' && styles.genderButtonTextActive
                  ]}>
                    Mamá
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Número de hijos:</Text>
              <View style={styles.childrenCountContainer}>
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => setEditChildrenCount(Math.max(0, editChildrenCount - 1))}
                >
                  <Text style={styles.countButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.childrenCountText}>{editChildrenCount}</Text>
                <TouchableOpacity
                  style={styles.countButton}
                  onPress={() => setEditChildrenCount(editChildrenCount + 1)}
                >
                  <Text style={styles.countButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {editGender === 'F' ? '¿Estás embarazada?' : '¿Estás esperando bebé(s)?'}
              </Text>
              <View style={styles.pregnancyContainer}>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    editIsPregnant && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setEditIsPregnant(true)}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    editIsPregnant && styles.pregnancyButtonTextActive
                  ]}>
                    Sí
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pregnancyButton,
                    !editIsPregnant && styles.pregnancyButtonActive
                  ]}
                  onPress={() => setEditIsPregnant(false)}
                >
                  <Text style={[
                    styles.pregnancyButtonText,
                    !editIsPregnant && styles.pregnancyButtonTextActive
                  ]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {editIsPregnant && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Semanas de gestación:</Text>
                <View style={styles.weeksContainer}>
                  <TouchableOpacity
                    style={styles.weeksButton}
                    onPress={() => setEditGestationWeeks(Math.max(1, editGestationWeeks - 1))}
                  >
                    <Text style={styles.weeksButtonText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.weeksText}>{editGestationWeeks}</Text>
                  <TouchableOpacity
                    style={styles.weeksButton}
                    onPress={() => setEditGestationWeeks(Math.min(42, editGestationWeeks + 1))}
                  >
                    <Text style={styles.weeksButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleUpdateProfile}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Guardando...' : 'Guardar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para cambiar contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cambiar Contraseña</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña actual</Text>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Tu contraseña actual"
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Nueva contraseña"
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirmar nueva contraseña</Text>
              <TextInput
                style={styles.input}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Confirma la nueva contraseña"
                secureTextEntry
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleChangePassword}
                disabled={isLoading}
              >
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Cambiando...' : 'Cambiar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  photoContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  editPhotoIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#96d2d3',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#7A6BB1',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#B4C14B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    marginTop: 8,
  },
  email: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.95,
    marginBottom: 8,
  },
  pregnantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
    gap: 6,
  },
  pregnantBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  lastInfoRow: {
    borderBottomWidth: 0,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  pregnantText: {
    color: '#E91E63',
    fontWeight: 'bold',
  },
  actionButton: {
    backgroundColor: '#96d2d3',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#c0392b',
  },
  dangerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e8ed',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  genderButtonActive: {
    backgroundColor: '#B4C14B',
    borderColor: '#B4C14B',
  },
  genderButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  genderButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#B4C14B',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  childrenCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  countButton: {
    width: 36,
    height: 36,
    backgroundColor: '#FFC211',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  childrenCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  pregnancyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  pregnancyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    alignItems: 'center',
  },
  pregnancyButtonActive: {
    backgroundColor: '#B4C14B',
    borderColor: '#B4C14B',
  },
  pregnancyButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  pregnancyButtonTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  weeksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  weeksButton: {
    width: 36,
    height: 36,
    backgroundColor: '#F08EB7',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weeksButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weeksText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
});

export default ProfileScreen;
