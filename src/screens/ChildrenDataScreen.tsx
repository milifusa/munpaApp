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
  Modal,
  Button,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// @ts-ignore
import DateTimePicker from '@react-native-community/datetimepicker';
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
  // Nuevo sistema de fechas
  birthDate?: Date; // Para hijos nacidos
  dueDate?: Date; // Para bebés no nacidos
  // Sistema antiguo (mantener para retrocompatibilidad)
  years?: number;
  months?: number;
  isUnborn?: boolean;
  gestationWeeks?: number;
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
  
  const { setUser, user } = useAuth();
  
  // Valores por defecto si no se reciben parámetros
  const parsedChildrenCount = Number(routeParams?.childrenCount);
  const profileChildrenCount = Number(user?.childrenCount);
  const childrenCount = Number.isFinite(parsedChildrenCount) && parsedChildrenCount > 0
    ? parsedChildrenCount
    : (Number.isFinite(profileChildrenCount) && profileChildrenCount > 0 ? profileChildrenCount : 1);
  const gender = routeParams?.gender || 'F';
  const pregnancyStatus = (routeParams?.pregnancyStatus === 'pregnant' || user?.isPregnant)
    ? 'pregnant'
    : 'not_pregnant';
  const isMultiplePregnancy = routeParams?.isMultiplePregnancy || false;
  const isEditing = routeParams?.isEditing || false;
  const childData = routeParams?.childData;
  const childId = routeParams?.childId;
  
  // Inicializar con datos del hijo si está en modo edición
  const getInitialChildrenData = () => {
    if (isEditing && childData) {
      const initialData: ChildData = {
        name: childData.name || '',
        isUnborn: childData.isUnborn || false,
      };
      
      if (childData.isUnborn) {
        // Para bebés no nacidos, usar dueDate si existe, si no calcular desde gestationWeeks
        if (childData.dueDate) {
          initialData.dueDate = new Date(childData.dueDate);
        } else {
          // Fallback: calcular fecha de parto desde semanas de gestación
          const weeksRemaining = 40 - (childData.currentGestationWeeks || childData.gestationWeeks || 0);
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (weeksRemaining * 7));
          initialData.dueDate = dueDate;
        }
        initialData.gestationWeeks = childData.currentGestationWeeks || childData.gestationWeeks || undefined;
      } else {
        // Para hijos nacidos, usar birthDate si existe, si no calcular desde ageInMonths
        if (childData.birthDate) {
          initialData.birthDate = new Date(childData.birthDate);
        } else {
          // Fallback: calcular fecha de nacimiento desde edad en meses
          const ageInMonths = childData.currentAgeInMonths || childData.ageInMonths || 0;
          const birthDate = new Date();
          birthDate.setMonth(birthDate.getMonth() - ageInMonths);
          initialData.birthDate = birthDate;
        }
      }
      
      return [initialData];
    }
    return Array(childrenCount).fill(null).map((_, index) => {
      const unborn = pregnancyStatus === 'pregnant'
        ? index >= (childrenCount - (isMultiplePregnancy ? 2 : 1))
        : false;
      return {
      name: '', 
      birthDate: new Date(), 
      dueDate: new Date(),
        isUnborn: unborn,
        gestationWeeks: undefined
      };
    });
  };
  
  const [childrenData, setChildrenData] = useState<ChildData[]>(getInitialChildrenData());
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedChildIndex, setSelectedChildIndex] = useState<number | null>(null);

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
      
      const isUnborn = child.isUnborn ?? isUnbornChild(i);
      if (isUnborn) {
        const weeks = child.gestationWeeks;
        const hasValidWeeks = typeof weeks === 'number' && weeks >= 1 && weeks <= 42;

        if (!hasValidWeeks) {
          Alert.alert('Error', `Por favor ingresa las semanas de gestación para ${child.name}`);
          return false;
        }
        
        if (weeks !== undefined && (weeks < 1 || weeks > 42)) {
          Alert.alert('Error', 'Las semanas de gestación deben estar entre 1 y 42');
          return false;
        }

        const dueDateToValidate = hasValidWeeks ? computeDueDateFromWeeks(weeks as number) : null;
        if (dueDateToValidate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const twoWeeksAgo = new Date(today);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
        
          if (dueDateToValidate < twoWeeksAgo) {
          Alert.alert('Error', `La fecha de parto para ${child.name} no puede ser hace más de 2 semanas`);
          return false;
          }
        }
      } else {
        // Validar fecha de nacimiento
        if (!child.birthDate) {
          Alert.alert('Error', `Por favor selecciona la fecha de nacimiento para ${child.name}`);
          return false;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const birthDate = new Date(child.birthDate);
        birthDate.setHours(0, 0, 0, 0);
        
        if (birthDate > today) {
          Alert.alert('Error', `La fecha de nacimiento de ${child.name} no puede ser en el futuro`);
          return false;
        }
        
        const eighteenYearsAgo = new Date(today);
        eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
        
        if (birthDate < eighteenYearsAgo) {
          Alert.alert('Error', `La fecha de nacimiento de ${child.name} no puede ser hace más de 18 años`);
        return false;
        }
      }
    }
    return true;
  };

  const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSave = async () => {
    if (!validateData()) return;

    setIsLoading(true);
    try {
      console.log('Guardando datos de hijos:', childrenData);
      
      // Si estamos en modo edición, actualizar el hijo existente
      if (isEditing && childId) {
        const child = childrenData[0]; // Solo editamos un hijo a la vez
        const isUnborn = child.isUnborn ?? false;
        
        const updateData: any = {
          name: child.name,
          isUnborn: isUnborn,
        };
        
        const weeks = child.gestationWeeks;
        const hasValidWeeks = typeof weeks === 'number' && weeks >= 1 && weeks <= 42;
        const dueDateFromWeeks = hasValidWeeks ? computeDueDateFromWeeks(weeks as number) : null;
        const dueDateToSave = dueDateFromWeeks;

        if (isUnborn && dueDateToSave) {
          // Usar nuevo sistema de fechas para bebés no nacidos
          updateData.dueDate = formatDateToYYYYMMDD(dueDateToSave);
          if (hasValidWeeks) {
            updateData.gestationWeeks = weeks;
          }
        } else if (!isUnborn && child.birthDate) {
          // Usar nuevo sistema de fechas para hijos nacidos
          updateData.birthDate = formatDateToYYYYMMDD(child.birthDate);
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
      
      // Modo creación
      // Preparar los datos en el formato del nuevo sistema de fechas
      const childrenToSave: CreateChildData[] = childrenData.map((child, index) => {
        const isUnborn = child.isUnborn ?? isUnbornChild(index);
        const weeks = child.gestationWeeks;
        const hasValidWeeks = typeof weeks === 'number' && weeks >= 1 && weeks <= 42;
        const dueDateFromWeeks = hasValidWeeks ? computeDueDateFromWeeks(weeks as number) : null;
        const dueDateToSave = dueDateFromWeeks;
        
        if (isUnborn && dueDateToSave) {
          // Para bebé por nacer - usar nuevo sistema de fechas
          return {
            name: child.name,
            dueDate: formatDateToYYYYMMDD(dueDateToSave),
            gestationWeeks: hasValidWeeks ? weeks : undefined,
            isUnborn: true,
          };
        } else if (!isUnborn && child.birthDate) {
          // Para hijo nacido - usar nuevo sistema de fechas
          return {
            name: child.name,
            birthDate: formatDateToYYYYMMDD(child.birthDate),
            isUnborn: false,
          };
        } else {
          // Fallback por si acaso (no debería llegar aquí si la validación funciona)
          return {
            name: child.name,
            isUnborn: isUnborn,
            gestationWeeks: hasValidWeeks ? weeks : undefined,
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
            // Si está embarazada, actualizar perfil aunque omita los hijos
            if (pregnancyStatus === 'pregnant') {
              try {
                await profileService.updateProfile({ isPregnant: true });
              } catch (error) {
                console.error('❌ Error actualizando estado de embarazo:', error);
              }
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
    const isUnborn = child.isUnborn ?? isUnbornChild(index);
    if (isUnborn) {
      if (pregnancyStatus === 'pregnant' && isMultiplePregnancy) {
        const unbornStartIndex = childrenCount - 2;
        if (index === unbornStartIndex) return 'Bebé A por nacer';
        if (index === unbornStartIndex + 1) return 'Bebé B por nacer';
      }
          return 'Bebé por nacer';
        }
    return `Hijo ${index + 1}`;
  };

  const isUnbornChild = (index: number) => {
    const explicit = childrenData[index]?.isUnborn;
    if (explicit !== undefined) return explicit;
    if (pregnancyStatus === 'pregnant') {
      const unbornStartIndex = childrenCount - (isMultiplePregnancy ? 2 : 1);
      return index >= unbornStartIndex;
    }
    return false;
  };

  const addChildCard = () => {
    setChildrenData(prev => ([
      ...prev,
      {
        name: '',
        birthDate: new Date(),
        dueDate: new Date(),
        isUnborn: false,
        gestationWeeks: undefined
      }
    ]));
  };

  const computeDueDateFromWeeks = (weeks: number) => {
    const weeksRemaining = 40 - weeks;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (weeksRemaining * 7));
    return dueDate;
  };

  const getPregnancyInfo = (dueDate: Date) => {
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    const currentWeeks = 40 - diffWeeks;
    
    if (currentWeeks < 12) return `Semana ${currentWeeks} - Primer trimestre`;
    if (currentWeeks < 28) return `Semana ${currentWeeks} - Segundo trimestre`;
    if (currentWeeks < 37) return `Semana ${currentWeeks} - Tercer trimestre`;
    if (currentWeeks < 40) return `Semana ${currentWeeks} - A término`;
    return `Semana ${currentWeeks} - Postérmino`;
  };

  const calculateAge = (birthDate: Date): string => {
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    
    let totalMonths = (years * 12) + months;
    if (today.getDate() < birthDate.getDate()) {
      totalMonths--;
    }
    
    const ageYears = Math.floor(totalMonths / 12);
    const ageMonths = totalMonths % 12;
    
    if (ageYears > 0) {
      return `${ageYears} ${ageYears === 1 ? 'año' : 'años'}${ageMonths > 0 ? ` y ${ageMonths} ${ageMonths === 1 ? 'mes' : 'meses'}` : ''}`;
    }
    return `${ageMonths} ${ageMonths === 1 ? 'mes' : 'meses'}`;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (selectedDate && selectedChildIndex !== null) {
      const child = childrenData[selectedChildIndex];
      const isUnborn = child.isUnborn ?? isUnbornChild(selectedChildIndex);
      if (isUnborn) {
        updateChildData(selectedChildIndex, 'dueDate', selectedDate);
      } else {
        updateChildData(selectedChildIndex, 'birthDate', selectedDate);
      }
    }
    
    if (Platform.OS === 'ios' && event.type === 'dismissed') {
      setSelectedChildIndex(null);
    }
  };

  const openDatePicker = (index: number) => {
    setSelectedChildIndex(index);
    setShowDatePicker(true);
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
        <LinearGradient
          colors={['#59C6C0', '#4DB8B3']}
          style={styles.headerGradient}
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
                <Ionicons name="heart" size={20} color="#FFFFFF" style={styles.infoIcon} />
              <Text style={styles.infoText}>
                {(() => {
                  const unbornCount = childrenData.filter((c) => c.isUnborn).length;
                  if (unbornCount > 1) return `👶👶 Registraremos ${unbornCount} bebés por nacer`;
                  if (unbornCount === 1) return `👶 Registraremos 1 bebé por nacer`;
                  return `👶 Selecciona si el bebé está en gestación`;
                })()}
              </Text>
            </View>
          )}
        </View>
        </LinearGradient>

        <View style={styles.form}>
          {childrenData.map((child, index) => {
            const isUnborn = child.isUnborn ?? isUnbornChild(index);
            return (
            <View key={index} style={styles.childCard}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons 
                    name={isUnborn ? "heart" : "person"} 
                    size={24} 
                    color="#59C6C0" 
                  />
                </View>
              <Text style={styles.childTitle}>
                {getChildTitle(index, child)}
              </Text>
              </View>
              
              <View style={styles.inputContainer}>
                <View style={styles.labelContainer}>
                  <Ionicons name="person-outline" size={18} color="#59C6C0" />
                <Text style={styles.label}>Nombre</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={child.name}
                  onChangeText={(value) => updateChildData(index, 'name', value)}
                  placeholder="Nombre del hijo"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.birthStatusContainer}>
                <TouchableOpacity
                  style={[styles.birthStatusButton, !isUnborn && styles.birthStatusButtonActive]}
                  onPress={() => updateChildData(index, 'isUnborn', false)}
                >
                  <Text style={[styles.birthStatusText, !isUnborn && styles.birthStatusTextActive]}>
                    Ya nació
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.birthStatusButton, isUnborn && styles.birthStatusButtonActive]}
                  onPress={() => updateChildData(index, 'isUnborn', true)}
                >
                  <Text style={[styles.birthStatusText, isUnborn && styles.birthStatusTextActive]}>
                    En gestación
                  </Text>
                </TouchableOpacity>
              </View>

              {!isUnborn ? (
                <View style={styles.dateContainer}>
                  <View style={styles.labelContainer}>
                    <Ionicons name="calendar-outline" size={18} color="#59C6C0" />
                    <Text style={styles.label}>Fecha de nacimiento</Text>
                  </View>
                        <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => openDatePicker(index)}
                  >
                    <Ionicons name="calendar" size={20} color="#59C6C0" style={styles.dateIconLeft} />
                    <Text style={styles.dateButtonText}>
                      {child.birthDate 
                        ? child.birthDate.toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : 'Seleccionar fecha'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                        </TouchableOpacity>
                  
                  {child.birthDate && (
                    <View style={styles.calculatedAgeContainer}>
                      <Ionicons name="time-outline" size={18} color="#4CAF50" />
                      <View style={styles.ageTextContainer}>
                        <Text style={styles.calculatedAgeLabel}>Edad actual:</Text>
                        <Text style={styles.calculatedAgeValue}>
                          {calculateAge(child.birthDate)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.dateContainer}>
                  <View style={styles.gestationContainer}>
                  <View style={styles.labelContainer}>
                      <Ionicons name="time-outline" size={18} color="#F57C00" />
                      <Text style={styles.label}>Semanas de gestación</Text>
                  </View>
                    <TextInput
                      style={styles.input}
                      value={child.gestationWeeks !== undefined && child.gestationWeeks !== null ? String(child.gestationWeeks) : ''}
                      onChangeText={(value) => {
                        const numeric = value.replace(/[^0-9]/g, '');
                        updateChildData(index, 'gestationWeeks', numeric ? parseInt(numeric, 10) : undefined);
                      }}
                      placeholder="Ej: 20"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                    <Text style={styles.helperText}>Debe estar entre 1 y 42 semanas</Text>
                    </View>
                </View>
              )}
            </View>
          )})}

          <TouchableOpacity
            style={styles.addAnotherChildButton}
            onPress={addChildCard}
          >
            <Ionicons name="add-circle" size={20} color="#FFFFFF" />
            <Text style={styles.addAnotherChildText}>Agregar otro hijo</Text>
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              )}
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
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.secondaryButtonText}>
                  Omitir por ahora
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && selectedChildIndex !== null && (
        Platform.OS === 'ios' ? (
          <Modal
            transparent={true}
            animationType="slide"
            visible={showDatePicker}
            onRequestClose={() => {
              setShowDatePicker(false);
              setSelectedChildIndex(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.datePickerContainer}>
                <View style={styles.datePickerHeader}>
                  <Text style={styles.datePickerTitle}>
                    {childrenData[selectedChildIndex]?.isUnborn 
                      ? 'Selecciona la fecha de parto' 
                      : 'Selecciona la fecha de nacimiento'}
                  </Text>
                </View>
                <DateTimePicker
                  value={
                    childrenData[selectedChildIndex]?.isUnborn 
                      ? (childrenData[selectedChildIndex]?.dueDate || new Date())
                      : (childrenData[selectedChildIndex]?.birthDate || new Date())
                  }
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={
                    (childrenData[selectedChildIndex]?.isUnborn ?? isUnbornChild(selectedChildIndex))
                      ? undefined 
                      : new Date()
                  }
                  minimumDate={
                    (childrenData[selectedChildIndex]?.isUnborn ?? isUnbornChild(selectedChildIndex))
                      ? new Date()
                      : (() => {
                          const minDate = new Date();
                          minDate.setFullYear(minDate.getFullYear() - 18);
                          return minDate;
                        })()
                  }
                  locale="es-ES"
                />
                <View style={styles.datePickerButtons}>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.cancelButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setSelectedChildIndex(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.datePickerButton, styles.confirmButton]}
                    onPress={() => {
                      setShowDatePicker(false);
                      setSelectedChildIndex(null);
                    }}
                  >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={
              childrenData[selectedChildIndex]?.isUnborn 
                ? (childrenData[selectedChildIndex]?.dueDate || new Date())
                : (childrenData[selectedChildIndex]?.birthDate || new Date())
            }
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={
              (childrenData[selectedChildIndex]?.isUnborn ?? isUnbornChild(selectedChildIndex))
                ? undefined 
                : new Date()
            }
            minimumDate={
              (childrenData[selectedChildIndex]?.isUnborn ?? isUnbornChild(selectedChildIndex))
                ? new Date()
                : (() => {
                    const minDate = new Date();
                    minDate.setFullYear(minDate.getFullYear() - 18);
                    return minDate;
                  })()
            }
          />
        )
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
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
    fontFamily: 'Montserrat',
  },
  subtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    opacity: 0.95,
    fontFamily: 'Montserrat',
  },
  form: {
    flex: 1,
    paddingHorizontal: 20,
  },
  childCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    fontFamily: 'Montserrat',
  },
  inputContainer: {
    marginBottom: 20,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: 'Montserrat',
  },
  input: {
    borderWidth: 2,
    borderColor: '#E8F8F7',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
    color: '#2c3e50',
    fontFamily: 'Montserrat',
  },
  // Nuevos estilos para el sistema de fechas
  dateContainer: {
    marginBottom: 20,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8F8F7',
    padding: 16,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    flex: 1,
    fontFamily: 'Montserrat',
  },
  dateIconLeft: {
    marginRight: 0,
  },
  calculatedAgeContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  ageTextContainer: {
    flex: 1,
  },
  calculatedAgeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    fontFamily: 'Montserrat',
    marginBottom: 2,
  },
  calculatedAgeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'Montserrat',
  },
  pregnancyInfoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pregnancyInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    flex: 1,
    fontFamily: 'Montserrat',
  },
  birthStatusContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  birthStatusButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  birthStatusButtonActive: {
    backgroundColor: '#59C6C0',
    borderColor: '#59C6C0',
  },
  birthStatusText: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Montserrat',
  },
  birthStatusTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontFamily: 'Montserrat-Bold',
  },
  addAnotherChildButton: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#59C6C0',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addAnotherChildText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat-Bold',
  },
  gestationContainer: {
    marginTop: 12,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  // Estilos para el modal del date picker
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: '#F7FAFC',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#B4C14B',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  infoIcon: {
    marginRight: 0,
  },
  infoText: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
    fontFamily: 'Montserrat',
    fontWeight: '500',
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  button: {
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButton: {
    backgroundColor: '#96d2d3',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#59C6C0',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
  },
  secondaryButtonText: {
    color: '#59C6C0',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
});

export default ChildrenDataScreen;
