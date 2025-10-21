import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { childrenService, CreateChildData, profileService } from '../services/api';
import MunpaLogo from '../components/MunpaLogo';
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../styles';

interface ChildData {
  name: string;
  years: number;
  months: number;
  isUnborn?: boolean;
  weeksOfPregnancy?: number;
}

interface RouteParams {
  childrenCount: number;
  gender: 'M' | 'F';
  pregnancyStatus?: 'none' | 'pregnant';
  isMultiplePregnancy?: boolean;
  isEditing?: boolean;
  childData?: any;
  childId?: string;
}

const ChildrenDataScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const routeParams = route.params as RouteParams;
  
  // Valores por defecto si no se reciben parámetros
  const childrenCount = routeParams?.childrenCount || 1;
  const gender = routeParams?.gender || 'F';
  const pregnancyStatus = routeParams?.pregnancyStatus || 'not_pregnant';
  const isMultiplePregnancy = routeParams?.isMultiplePregnancy || false;
  const isEditing = routeParams?.isEditing || false;
  const childData = routeParams?.childData;
  const childId = routeParams?.childId;
  
  const { setUser } = useAuth();
  
  // Inicializar con datos del hijo si está en modo edición
  const getInitialChildrenData = () => {
    if (isEditing && childData) {
      const ageInMonths = childData.currentAgeInMonths || childData.ageInMonths || 0;
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      
      return [{
        name: childData.name || '',
        years: years,
        months: months,
        isUnborn: childData.isUnborn || false,
        weeksOfPregnancy: childData.currentGestationWeeks || childData.gestationWeeks || 0,
      }];
    }
    return Array(childrenCount).fill({ name: '', years: 0, months: 0, weeksOfPregnancy: 0 });
  };
  
  const [childrenData, setChildrenData] = useState<ChildData[]>(getInitialChildrenData());
  const [isLoading, setIsLoading] = useState(false);

  const updateChildData = (index: number, field: keyof ChildData, value: any) => {
    const newChildrenData = [...childrenData];
    newChildrenData[index] = { ...newChildrenData[index], [field]: value };
    setChildrenData(newChildrenData);
  };

  const validateData = () => {
    for (let i = 0; i < childrenData.length; i++) {
      const child = childrenData[i];
      if (!child.name.trim()) {
        Alert.alert('Error', `Por favor ingresa el nombre del hijo ${i + 1}`);
        return false;
      }
      
      // Si es un bebé por nacer, no validar edad
      if (child.isUnborn) continue;
      
      // Validar que la edad sea razonable (0-18 años)
      const totalMonths = (child.years * 12) + child.months;
      if (totalMonths > 216) { // 18 años = 216 meses
        Alert.alert('Error', `La edad del hijo ${i + 1} no puede ser mayor a 18 años`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateData()) return;

    setIsLoading(true);
    try {
      console.log('Guardando datos de hijos:', childrenData);
      
      // Si estamos en modo edición, actualizar el hijo existente
      if (isEditing && childId) {
        const child = childrenData[0]; // Solo editamos un hijo a la vez
        const isUnborn = child.isUnborn || false;
        
        const updateData: any = {
          name: child.name,
          isUnborn: isUnborn,
        };
        
        if (isUnborn) {
          updateData.gestationWeeks = child.weeksOfPregnancy || 0;
          updateData.ageInMonths = 0;
        } else {
          const totalMonths = (child.years * 12) + child.months;
          updateData.ageInMonths = totalMonths;
          updateData.gestationWeeks = undefined;
        }
        
        console.log('Actualizando hijo con ID:', childId, 'Datos:', updateData);
        await childrenService.updateChild(childId, updateData);
        
        Alert.alert(
          '¡Éxito!',
          'Datos actualizados correctamente',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ]
        );
        return;
      }
      
      // Modo creación (código original)
      // Preparar los datos en el formato que espera el backend
      const childrenToSave: CreateChildData[] = childrenData.map((child, index) => {
        const isUnborn = isUnbornChild(index);
        
        if (isUnborn) {
          // Para bebé por nacer
          return {
            name: child.name,
            ageInMonths: 0,
            isUnborn: true,
            gestationWeeks: child.weeksOfPregnancy || 0
          };
        } else {
          // Para hijo nacido
          const totalMonths = (child.years * 12) + child.months;
          return {
            name: child.name,
            ageInMonths: totalMonths,
            isUnborn: false,
            gestationWeeks: undefined
          };
        }
      });

      console.log('Datos preparados para enviar:', childrenToSave);
      
      // Enviar cada hijo al backend
      await childrenService.addMultipleChildren(childrenToSave);
      
      // Si está embarazada, actualizar el perfil con el estado de embarazo y las semanas de gestación
      if (pregnancyStatus === 'pregnant') {
        try {
          // Obtener las semanas de gestación del bebé por nacer
          const unbornChild = childrenToSave.find(child => child.isUnborn);
          if (unbornChild && unbornChild.gestationWeeks) {
            console.log('🤰 Actualizando perfil con estado de embarazo y semanas de gestación:', unbornChild.gestationWeeks);
            await profileService.updateProfile({
              isPregnant: true,
              gestationWeeks: unbornChild.gestationWeeks
            });
            console.log('✅ Perfil actualizado con estado de embarazo y semanas de gestación');
            
            // Verificar que la actualización se guardó correctamente
            try {
              const updatedProfile = await profileService.getProfile();
              console.log('🔍 Verificación - Perfil después de actualizar:', updatedProfile);
            } catch (verifyError) {
              console.error('❌ Error verificando perfil actualizado:', verifyError);
            }
          }
        } catch (profileError) {
          console.error('❌ Error actualizando perfil con estado de embarazo:', profileError);
          // No mostrar error al usuario, ya que los hijos se guardaron correctamente
        }
      } else {
        console.log('ℹ️ Usuario no está embarazada, no se actualiza perfil');
      }
      
      Alert.alert(
        '¡Éxito!',
        'Datos de tus hijos guardados correctamente',
        [
          {
            text: 'Continuar',
            onPress: async () => {
              // Establecer el usuario como autenticado
              const userData = await AsyncStorage.getItem('userData');
              if (userData) {
                setUser(JSON.parse(userData));
              }
              // Marcar que el usuario ya tiene hijos
              await AsyncStorage.setItem('hasChildren', 'true');
              console.log('✅ Marcado como usuario con hijos');
              // Resetear la navegación al Home para limpiar el stack
              // @ts-ignore
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error guardando hijos:', error);
      Alert.alert('Error', 'No se pudieron guardar los datos de los hijos. Por favor, intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Omitir',
      '¿Estás seguro de que quieres omitir el registro de datos de tus hijos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Omitir',
          onPress: async () => {
            // Establecer el usuario como autenticado
            const userData = await AsyncStorage.getItem('userData');
            if (userData) {
              setUser(JSON.parse(userData));
            }
            // Marcar que se omitió el registro (se considera como "ya revisado")
            await AsyncStorage.setItem('hasChildren', 'false');
            console.log('⏭️ Usuario omitió el registro de hijos');
            // Resetear la navegación al Home para limpiar el stack
            // @ts-ignore
            navigation.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          },
        },
      ]
    );
  };

  const getChildTitle = (index: number, child: ChildData) => {
    // Si está embarazada, verificar si es bebé por nacer
    if (pregnancyStatus === 'pregnant') {
      const unbornStartIndex = childrenCount - (isMultiplePregnancy ? 2 : 1);
      
      if (index >= unbornStartIndex) {
        // Es un bebé por nacer
        if (isMultiplePregnancy && index === unbornStartIndex) {
          return 'Bebé A por nacer';
        } else if (isMultiplePregnancy && index === unbornStartIndex + 1) {
          return 'Bebé B por nacer';
        } else {
          return 'Bebé por nacer';
        }
      }
    }
    
    // Hijo ya nacido
    return `Hijo ${index + 1}`;
  };

  const isUnbornChild = (index: number) => {
    // Si está embarazada, verificar si es bebé por nacer
    if (pregnancyStatus === 'pregnant') {
      const unbornStartIndex = childrenCount - (isMultiplePregnancy ? 2 : 1);
      return index >= unbornStartIndex;
    }
    return false;
  };

  const getPregnancyInfo = (weeks: number) => {
    if (weeks < 12) return 'Primer trimestre';
    if (weeks < 28) return 'Segundo trimestre';
    if (weeks < 37) return 'Tercer trimestre';
    if (weeks < 40) return 'A término';
    return 'Postérmino';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <MunpaLogo size="large" />
          <Text style={styles.title}>
            {isEditing ? 'Editar información' : 'Datos de tus hijos'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing 
              ? 'Actualiza la información de tu hijo'
              : `${gender === 'F' ? 'Mamá' : 'Papá'}, cuéntanos sobre tus hijos`
            }
          </Text>
          
          {/* Información adicional para quienes esperan bebé(s) */}
          {pregnancyStatus === 'pregnant' && (
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                {isMultiplePregnancy 
                  ? `👶👶 Registraremos 2 bebés por nacer (${gender === 'F' ? 'gemelos, trillizos, etc.' : 'gemelos, trillizos, etc.'})`
                  : `👶 Registraremos 1 bebé por nacer`
                }
              </Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          {childrenData.map((child, index) => (
            <View key={index} style={styles.childCard}>
              <Text style={styles.childTitle}>
                {getChildTitle(index, child)}
              </Text>
              
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={child.name}
                  onChangeText={(value) => updateChildData(index, 'name', value)}
                  placeholder="Nombre del hijo"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              {!isUnbornChild(index) ? (
                <View style={styles.ageContainer}>
                  <Text style={styles.label}>Edad</Text>
                  <View style={styles.ageInputs}>
                    <View style={styles.ageInputGroup}>
                      <Text style={styles.ageLabel}>Años</Text>
                      <View style={styles.ageSelector}>
                        <TouchableOpacity
                          style={styles.ageButton}
                          onPress={() => updateChildData(index, 'years', Math.max(0, child.years - 1))}
                        >
                          <Text style={styles.ageButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.ageValue}>{child.years}</Text>
                        <TouchableOpacity
                          style={styles.ageButton}
                          onPress={() => updateChildData(index, 'years', child.years + 1)}
                        >
                          <Text style={styles.ageButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.ageInputGroup}>
                      <Text style={styles.ageLabel}>Meses</Text>
                      <View style={styles.ageSelector}>
                        <TouchableOpacity
                          style={styles.ageButton}
                          onPress={() => updateChildData(index, 'months', child.months === 0 ? 11 : child.months - 1)}
                        >
                          <Text style={styles.ageButtonText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.ageValue}>{child.months}</Text>
                        <TouchableOpacity
                          style={styles.ageButton}
                          onPress={() => updateChildData(index, 'months', (child.months + 1) % 12)}
                        >
                          <Text style={styles.ageButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.pregnancyContainer}>
                  <Text style={styles.label}>Semanas de gestación</Text>
                  <View style={styles.weeksSelector}>
                    <TouchableOpacity
                      style={styles.weeksButton}
                      onPress={() => updateChildData(index, 'weeksOfPregnancy', Math.max(1, (child.weeksOfPregnancy || 0) - 1))}
                    >
                      <Text style={styles.weeksButtonText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.weeksValue}>{child.weeksOfPregnancy || 0}</Text>
                    <TouchableOpacity
                      style={styles.weeksButton}
                      onPress={() => updateChildData(index, 'weeksOfPregnancy', Math.min(42, (child.weeksOfPregnancy || 0) + 1))}
                    >
                      <Text style={styles.weeksButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.weeksInfo}>
                    {getPregnancyInfo(child.weeksOfPregnancy || 0)}
                  </Text>
                </View>
              )}
            </View>
          ))}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading 
                  ? (isEditing ? 'Actualizando...' : 'Guardando...') 
                  : (isEditing ? 'Actualizar datos' : 'Guardar datos')
                }
              </Text>
            </TouchableOpacity>

            {!isEditing && (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  Omitir por ahora
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#887CBC',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  childCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  childTitle: {
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
    color: '#2c3e50',
  },
  ageContainer: {
    marginBottom: 16,
  },
  ageInputs: {
    flexDirection: 'row',
    gap: 20,
  },
  ageInputGroup: {
    flex: 1,
  },
  ageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  ageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
  },
  ageButton: {
    width: 36,
    height: 36,
    backgroundColor: '#B4C14B',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ageButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ageValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  pregnancyContainer: {
    marginBottom: 16,
  },
  weeksSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
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
  weeksValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginHorizontal: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  weeksInfo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F08EB7',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.9,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#B4C14B',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChildrenDataScreen;
