import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/globalStyles';

interface UpdateRequiredScreenProps {
  currentVersion: string;
  latestVersion: string;
  message?: string;
}

const UpdateRequiredScreen: React.FC<UpdateRequiredScreenProps> = ({
  currentVersion,
  latestVersion,
  message,
}) => {
  console.log('🎨 [UPDATE SCREEN] Renderizando pantalla de actualización');
  console.log('📱 [UPDATE SCREEN] Versión actual:', currentVersion);
  console.log('📱 [UPDATE SCREEN] Versión requerida:', latestVersion);

  const handleUpdate = async () => {
    console.log('🔄 [UPDATE] Botón presionado');
    
    const storeUrl = Platform.select({
      ios: 'https://apps.apple.com/us/app/munpa/id6754290929',
      android: 'https://play.google.com/store/apps/details?id=com.munpaapp',
    });

    console.log('🔗 [UPDATE] URL seleccionada:', storeUrl);

    if (storeUrl) {
      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        console.log('✅ [UPDATE] ¿Puede abrir URL?:', canOpen);
        
        if (canOpen) {
          console.log('🚀 [UPDATE] Abriendo URL...');
          await Linking.openURL(storeUrl);
          console.log('✅ [UPDATE] URL abierta exitosamente');
        } else {
          console.log('⚠️ [UPDATE] No se puede abrir la URL');
          Alert.alert(
            'Error',
            'No se puede abrir la App Store. Por favor, búsca "Munpa" manualmente en la tienda.',
            [{ text: 'OK' }]
          );
        }
      } catch (err) {
        console.error('❌ [UPDATE] Error abriendo tienda:', err);
        Alert.alert(
          'Error',
          'Hubo un problema al abrir la tienda. Por favor, búsca "Munpa" manualmente.',
          [{ text: 'OK' }]
        );
      }
    } else {
      console.error('❌ [UPDATE] No hay URL de tienda configurada');
    }
  };

  return (
    <LinearGradient
      colors={['#887CBC', '#7B68B0']}
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Logo de Munpa */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Título */}
        <Text style={styles.title}>Actualización Requerida</Text>

        {/* Mensaje */}
        <Text style={styles.message}>
          {message ||
            'Hay una nueva versión de Munpa disponible. Por favor, actualiza la aplicación para continuar.'}
        </Text>

        {/* Versiones */}
        <View style={styles.versionContainer}>
          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>Tu versión</Text>
            <Text style={styles.versionNumber}>{currentVersion}</Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>Nueva versión</Text>
            <Text style={styles.versionNumber}>{latestVersion}</Text>
          </View>
        </View>

        {/* Botón de prueba simple */}
        <TouchableOpacity
          onPress={() => {
            console.log('🧪 [TEST] Botón de prueba presionado!');
            Alert.alert('Prueba', '¡El botón funciona!');
          }}
          style={{
            backgroundColor: '#FF6B6B',
            padding: 10,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
            🧪 Botón de Prueba
          </Text>
        </TouchableOpacity>

        {/* Botón de actualización */}
        <Pressable
          style={({ pressed }) => [
            styles.updateButton,
            pressed && styles.updateButtonPressed,
          ]}
          onPress={() => {
            console.log('🔘 [UPDATE] Pressable presionado!');
            handleUpdate();
          }}
          testID="update-button"
        >
          <Ionicons name="download-outline" size={24} color="#887CBC" />
          <Text style={styles.updateButtonText}>Actualizar Ahora</Text>
        </Pressable>

        {/* Información adicional */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle-outline" size={20} color="#FFFFFF" />
          <Text style={styles.infoText}>
            La actualización es necesaria para acceder a las nuevas funciones y mejoras de seguridad.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    paddingHorizontal: 20,
    pointerEvents: 'box-none',
  },
  logoContainer: {
    marginBottom: 40,
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.95,
  },
  versionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 20,
  },
  versionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  versionLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 4,
  },
  versionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  updateButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#887CBC',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 40,
    paddingHorizontal: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 20,
  },
});

export default UpdateRequiredScreen;
