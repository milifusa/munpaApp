import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('window');

interface GlobalMenuProps {
  visible: boolean;
  onClose: () => void;
}

const GlobalMenu: React.FC<GlobalMenuProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const { user, logout } = useAuth();

  const menuItems = [
    {
      id: 'home',
      title: 'Inicio',
      icon: 'home',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('MainTabs', { screen: 'Home' });
      },
    },
    {
      id: 'doula',
      title: 'DOULI Chat',
      icon: 'heart',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('MainTabs', { screen: 'Doula' });
      },
    },
    {
      id: 'children',
      title: 'Datos de Hijos',
      icon: 'people',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('ChildrenData');
      },
    },
    {
      id: 'profile',
      title: 'Mi Perfil',
      icon: 'person',
      onPress: () => {
        onClose();
        // @ts-ignore
        navigation.navigate('Profile');
      },
    },
    {
      id: 'settings',
      title: 'Configuración',
      icon: 'settings',
      onPress: () => {
        onClose();
        // Aquí puedes agregar navegación a configuración
      },
    },
    {
      id: 'logout',
      title: 'Cerrar Sesión',
      icon: 'log-out',
      onPress: () => {
        onClose();
        logout();
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} />
        <View style={styles.menuContainer}>
          {/* Header del menú */}
          <View style={styles.menuHeader}>
            <View style={styles.userInfo}>
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatar}>
                  <Ionicons name="person" size={40} color="#887CBC" />
                </View>
              )}
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  ¡Hola {user?.displayName || 'Mishuuu'}!
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Lista de opciones del menú */}
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuItemContent}>
                  <Ionicons name={item.icon as any} size={24} color="#887CBC" />
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer del menú */}
          <View style={styles.menuFooter}>
            <Text style={styles.versionText}>Munpa App v1.0.0</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width * 0.85,
    height: height,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 8,
  },
  menuList: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  menuFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});

export default GlobalMenu;
