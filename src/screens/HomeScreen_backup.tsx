import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { childrenService, profileService } from '../services/api';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/globalStyles';
import * as Font from 'expo-font';


const { width } = Dimensions.get('window');

interface Child {
  id: string;
  name: string;
  ageInMonths: number;
  isUnborn: boolean;
  gestationWeeks?: number;
  createdAt: string;
}

const HomeScreen: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    loadFonts();
    loadData();
    loadUserProfile();
  }, []);

  const loadFonts = async () => {
    try {
      console.log('🔤 Cargando fuentes...');
      await Font.loadAsync({
        'Baby Face': require('../../assets/Baby Face.otf'),
      });
      console.log('✅ Fuente Baby Face cargada exitosamente');
      setFontsLoaded(true);
    } catch (error) {
      console.error('❌ Error cargando fuente Baby Face:', error);
      setFontsLoaded(true); // Continuar sin la fuente personalizada
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar hijos
      const childrenResponse = await childrenService.getChildren();
      console.log('📊 Respuesta de hijos:', childrenResponse);
      
      if (childrenResponse.success && childrenResponse.data) {
        setChildren(childrenResponse.data);
        // Seleccionar el primer hijo por defecto
        if (childrenResponse.data.length > 0) {
          setSelectedChild(childrenResponse.data[0]);
        }
      } else {
        console.log('ℹ️ No hay hijos registrados o respuesta vacía');
        setChildren([]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      // No mostrar alerta para errores 500, solo log
      if ((error as any)?.response?.status !== 500) {
        Alert.alert('Error', 'No se pudieron cargar los datos de los hijos');
      }
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      console.log('👤 Cargando perfil completo del usuario...');
      const profileResponse = await profileService.getProfile();
      console.log('📊 Perfil completo cargado:', profileResponse);
      
      if (profileResponse.success && profileResponse.data) {
        // Actualizar el usuario en el contexto con la información completa
        setUser(profileResponse.data);
        console.log('✅ Usuario actualizado con perfil completo');
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
    }
  };

  const getGreetingText = () => {
    const userName = user?.displayName || user?.name || 'Usuario';
    return {
      bold: '¡Hola ',
      normal: userName + '!'
    };
  };

  const getSubtitleText = () => {
    if (user?.gender === 'F') {
      return 'ser mamá no es fácil, pero no estás sola...';
    } else {
      return 'ser papá no es fácil, pero no estás solo...';
    }
  };

  const getSubtitleStyle = () => {
    return {
      fontSize: typography.sizes['2xl'],
      color: '#FFFFFF',
      lineHeight: 32,
      fontFamily: fontsLoaded ? 'Baby Face' : Platform.OS === 'ios' ? 'System' : 'sans-serif',
    };
  };

  const getChildInfo = (child: Child) => {
    const info = [];
    
    if (child.isUnborn) {
      info.push(`${child.gestationWeeks} semanas de gestación`);
      info.push('Tu bebé está creciendo dentro de ti...');
      info.push('Recuerda mantener una alimentación saludable.');
    } else {
      info.push(`${child.ageInMonths} meses`);
      info.push(`${child.name} puede estar atravesando por su ${Math.floor(child.ageInMonths / 1.5) + 1}to salto`);
      info.push('Alimentación complementaria activa.');
    }
    
    return info;
  };

  const handleAddChild = () => {
    // @ts-ignore
    navigation.navigate('ChildrenData', {
      childrenCount: 1,
      gender: 'F', // Por defecto, se puede cambiar después
      pregnancyStatus: 'not_pregnant',
      isMultiplePregnancy: false
    });
      {/* Contenido principal */}
      <View style={styles.content}>
        <View style={styles.greetingContainer}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingTextBold}>{getGreetingText().bold}</Text>
            <Text style={styles.greetingTextNormal}>{getGreetingText().normal}</Text>
          </View>
          <Text style={getSubtitleStyle()}>{getSubtitleText()}</Text>
        </View>
        <View style={styles.decorativeShape}>
          <Image 
            source={require("../../assets/caritas 2.png")} 
            style={styles.decorativeFace}
          />
        </View>
      </View>

      {/* Título Mis hijos */}
      <Text style={styles.sectionTitle}>Mis hijos</Text>
      
      {/* Sección Mis hijos */}
      <View style={styles.childrenSection}>
        <View style={styles.childrenContainer}>
          {/* Botón Añadir */}
          <TouchableOpacity style={styles.addChildButton} onPress={handleAddChild}>
            <View style={styles.addChildIcon}>
              <Text style={styles.addIconText}>+</Text>
            </View>
            <Text style={styles.addChildText}>Añadir</Text>
          </TouchableOpacity>

          {/* Lista de hijos */}
          {children.map((child, index) => (
            <TouchableOpacity
              key={child.id}
              style={[
                styles.childButton,
                selectedChild?.id === child.id && styles.selectedChildButton
              ]}
              onPress={() => handleChildPress(child)}
            >
              <View style={styles.childImageContainer}>
                <Image 
                  source={getChildAvatar(index)} 
                  style={styles.childImage}
                />
              </View>
              <Text style={styles.childName}>{child.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Detalles del hijo seleccionado */}
        {selectedChild && (
          <View style={styles.childDetailsCard}>
            <View style={styles.cardPointer} />
            <View style={styles.cardContent}>
              {getChildInfo(selectedChild).map((info, index) => (
                <Text key={index} style={styles.childInfoText}>
                  {info}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );  container: {
    flex: 1,
    backgroundColor: '#59C6C0',
    paddingBottom: 80, // Espacio para el menú inferior
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#59C6C0',
  },
  loadingText: {
    fontSize: typography.sizes.lg,
    color: colors.white,
  },
  content: {
    position: 'relative',
    paddingTop: 60, // Espacio para el status bar
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: '#59C6C0',
  },

  greetingContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  greetingTextContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  greetingTextBold: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: '#000000',
  },
  greetingTextNormal: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.normal,
    color: '#000000',
  },

  decorativeShape: {
    position: 'absolute',
    top: 20,
    right: -30,
    width: 150,
    height: 100,
    backgroundColor: '#B4C14B',
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: spacing.md,
    zIndex: 1,
  },
  decorativeFace: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  childrenSection: {
    backgroundColor: '#E8F5E8',
    borderRadius: borderRadius.lg,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.medium,
    color: colors.primary,
    marginBottom: spacing.md,
    marginLeft: spacing.lg,
    marginTop: spacing.lg,
  },
  childrenContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  addChildButton: {
    alignItems: 'center',
    marginRight: spacing.lg,
    marginBottom: spacing.md,
    minWidth: 80,
  },
  addChildIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#B4C14B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  addIconText: {
    fontSize: 24,
    color: colors.white,
    fontWeight: typography.weights.bold,
  },
  addChildText: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  childButton: {
    alignItems: 'center',
    marginRight: spacing.lg,
    marginBottom: spacing.md,
    minWidth: 80,
  },
  selectedChildButton: {
    // El hijo seleccionado se indica con el puntero de la tarjeta
  },
  childImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: '#E8F5E8',
  },
  childImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  childName: {
    fontSize: typography.sizes.sm,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
    textAlign: 'center',
  },
  childDetailsCard: {
    backgroundColor: colors.white,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.base,
    position: 'relative',
  },
  cardPointer: {
    position: 'absolute',
    top: -10,
    left: 30,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: colors.white,
  },
  cardContent: {
    marginTop: spacing.sm,
  },
  childInfoText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },

});

export default HomeScreen;
