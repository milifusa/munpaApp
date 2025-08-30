import React, { useState, useEffect } from 'react';
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
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/api';


const ProfileScreen: React.FC = () => {
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
      <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.displayName?.charAt(0) || user?.name?.charAt(0) || 'U'}
          </Text>
        </View>
        <Text style={styles.name}>
          {profile?.displayName || user?.name || 'Usuario'}
        </Text>
        <Text style={styles.email}>
          {profile?.email || user?.email || 'usuario@email.com'}
        </Text>
      </View>

      {/* Información del perfil */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información Personal</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre:</Text>
            <Text style={styles.infoValue}>
              {profile?.displayName || user?.name || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>
              {profile?.email || user?.email || 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Género:</Text>
            <Text style={styles.infoValue}>
              {profile?.gender === 'M' ? 'Papá' : 
               profile?.gender === 'F' ? 'Mamá' : 'No especificado'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Número de hijos:</Text>
            <Text style={styles.infoValue}>
              {profile?.childrenCount || 0}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Text style={styles.infoValue}>
              {profile?.isPregnant ? 
                (profile?.gender === 'F' ? 'Embarazada' : 'Esperando bebé(s)') : 
                'No embarazado'}
            </Text>
          </View>
          
          {profile?.isPregnant && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Semanas de gestación:</Text>
              <Text style={styles.infoValue}>
                {profile?.gestationWeeks || 0} semanas
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Acciones</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowEditModal(true)}
        >
          <Text style={styles.actionButtonText}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowPasswordModal(true)}
        >
          <Text style={styles.actionButtonText}>Cambiar Contraseña</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={loadProfile}
        >
          <Text style={styles.actionButtonText}>Actualizar Datos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.logoutButton]}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleDeleteAccount}
        >
          <Text style={styles.dangerButtonText}>Eliminar Cuenta</Text>
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
    backgroundColor: '#887CBC',
  },
  container: {
    flex: 1,
    backgroundColor: '#887CBC',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
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
