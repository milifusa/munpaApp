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
  AlertButton,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Button,
} from 'react-native';
// @ts-ignore
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/globalStyles';
import * as Font from 'expo-font';
import { childrenPhotoService } from '../services/childrenPhotoService';
import { childrenService } from '../services/api';
import childProfileService, { vaccinesService } from '../services/childProfileService';

const { width } = Dimensions.get('window');

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  photoUrl?: string | null;
  createdAt: any; // Puede ser string o objeto de Firestore
  // Campos calculados por el backend
  currentAgeInMonths?: number | null;
  currentGestationWeeks?: number | null;
  registeredAgeInMonths?: number | null;
  registeredGestationWeeks?: number | null;
  daysSinceCreation?: number;
  isOverdue?: boolean;
}

interface RouteParams {
  childId: string;
  child: Child;
}

const ChildProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { childId, child: initialChild } = route.params as RouteParams;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [child, setChild] = useState(initialChild);
  const [profileImage, setProfileImage] = useState<string | null>(initialChild.photoUrl || null);
  const [loading, setLoading] = useState(false);
  const [developmentInfo, setDevelopmentInfo] = useState<any>(null);
  const [developmentLoading, setDevelopmentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'development' | 'health' | 'measurements' | 'milestones' | 'photos'>('info');
  const [refreshing, setRefreshing] = useState(false);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [vaccines, setVaccines] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [measurementsLoading, setMeasurementsLoading] = useState(false);
  const [milestonesLoading, setMilestonesLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pendingVaccine, setPendingVaccine] = useState<{name: string, id?: string} | null>(null);

  useEffect(() => {
    loadFonts();
    loadDevelopmentInfo();
  }, []);

  // Recargar datos del hijo cuando la pantalla recibe el foco
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 [CHILD PROFILE] Pantalla recibió foco, recargando datos...');
      loadChildData();
    });

    return unsubscribe;
  }, [navigation, childId]);

  const loadFonts = async () => {
    try {
      await Font.loadAsync({
        'Baby Face': require('../../assets/BabyFace.otf'),
      });
      setFontsLoaded(true);
    } catch (error) {
      console.error('❌ Error cargando fuente Baby Face:', error);
      setFontsLoaded(true); // Continuar sin la fuente personalizada
    }
  };

  const calculateCurrentAge = (): number => {
    if (child.isUnborn) {
      return 0; // Para bebés en gestación, no calculamos edad en meses
    }
    
    // Usar el campo calculado por el backend si está disponible
    if (child.currentAgeInMonths !== null && child.currentAgeInMonths !== undefined) {
      console.log('📅 Usando edad calculada por backend:', child.currentAgeInMonths);
      return child.currentAgeInMonths;
    }
    
    // Fallback al cálculo manual si no está disponible
    if (child.ageInMonths === null) {
      return 0;
    }
    
    // Obtener fecha de registro
    let registrationDate: Date;
    if (typeof child.createdAt === 'object' && child.createdAt._seconds) {
      registrationDate = new Date(child.createdAt._seconds * 1000);
    } else if (typeof child.createdAt === 'string') {
      registrationDate = new Date(child.createdAt);
    } else {
      return child.ageInMonths; // Fallback al valor original
    }
    
    // Calcular meses transcurridos desde el registro
    const now = new Date();
    const monthsDiff = (now.getFullYear() - registrationDate.getFullYear()) * 12 + 
                      (now.getMonth() - registrationDate.getMonth());
    
    // Sumar la edad registrada más los meses transcurridos
    const currentAge = (child.ageInMonths || 0) + monthsDiff;
    
    console.log('📅 Cálculo manual de edad actual:', {
      edadRegistrada: child.ageInMonths || 0,
      fechaRegistro: registrationDate.toLocaleDateString('es-ES'),
      mesesTranscurridos: monthsDiff,
      edadActual: currentAge
    });
    
    return currentAge;
  };

  const handleEditChild = () => {
    // Navegar a la pantalla de edición de datos del hijo
    (navigation as any).navigate('ChildrenData', {
      isEditing: true,
      childData: child,
      childId: child.id,
    });
  };

  // Función para pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadChildData(),
      loadDevelopmentInfo(),
      loadMeasurements(),
      loadHealthData(),
      loadMilestones(),
    ]);
    setRefreshing(false);
  };

  // Cargar mediciones
  const loadMeasurements = async () => {
    if (!childId) return;
    setMeasurementsLoading(true);
    try {
      const response = await childProfileService.measurements.getMeasurements(childId);
      if (response.success && response.data) {
        setMeasurements(response.data);
      }
    } catch (error) {
      console.error('Error cargando mediciones:', error);
    } finally {
      setMeasurementsLoading(false);
    }
  };

  // Cargar datos de salud (vacunas y citas)
  const loadHealthData = async () => {
    if (!childId) return;
    setHealthLoading(true);
    try {
      const [vaccinesRes, appointmentsRes] = await Promise.all([
        childProfileService.vaccines.getVaccines(childId),
        childProfileService.appointments.getAppointments(childId),
      ]);
      
      if (vaccinesRes.success && vaccinesRes.data) {
        // Filtrar duplicados: si hay vacuna aplicada y pendiente con mismo nombre,
        // solo mostrar la aplicada
        const vaccineMap = new Map();
        vaccinesRes.data.forEach((vaccine: any) => {
          const existing = vaccineMap.get(vaccine.name);
          if (!existing) {
            vaccineMap.set(vaccine.name, vaccine);
          } else {
            // Si la existente es pendiente y la nueva es aplicada, reemplazar
            if (existing.status === 'pending' && vaccine.status === 'applied') {
              vaccineMap.set(vaccine.name, vaccine);
            }
            // Si ambas son aplicadas, mantener la más reciente
            else if (existing.status === 'applied' && vaccine.status === 'applied') {
              const existingDate = new Date(existing.appliedDate?._seconds * 1000 || 0);
              const newDate = new Date(vaccine.appliedDate?._seconds * 1000 || 0);
              if (newDate > existingDate) {
                vaccineMap.set(vaccine.name, vaccine);
              }
            }
          }
        });
        setVaccines(Array.from(vaccineMap.values()));
      }
      if (appointmentsRes.success && appointmentsRes.data) {
        setAppointments(appointmentsRes.data);
      }
    } catch (error) {
      console.error('Error cargando datos de salud:', error);
    } finally {
      setHealthLoading(false);
    }
  };

  // Cargar hitos del desarrollo
  const loadMilestones = async () => {
    if (!childId) return;
    setMilestonesLoading(true);
    try {
      const response = await childProfileService.milestones.getMilestones(childId);
      if (response.success && response.data) {
        setMilestones(response.data);
      }
    } catch (error) {
      console.error('Error cargando hitos:', error);
    } finally {
      setMilestonesLoading(false);
    }
  };

  // Función para manejar cambio de fecha
  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (date && pendingVaccine) {
      setSelectedDate(date);
      
      if (Platform.OS === 'android' || event.type === 'set') {
        // Guardar la vacuna con la fecha seleccionada
        saveVaccineWithDate(pendingVaccine.name, date);
      }
    }
  };

  // Función para guardar vacuna con fecha específica
  const saveVaccineWithDate = async (vaccineName: string, date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Si tiene ID, es una vacuna existente que se está actualizando
      if (pendingVaccine?.id) {
        await vaccinesService.updateVaccine(childId, pendingVaccine.id, {
          appliedDate: dateStr,
          status: 'applied',
        });
        Alert.alert('Éxito', `Vacuna "${vaccineName}" marcada como aplicada`);
      } else {
        // Si no tiene ID, es una vacuna nueva
        await childProfileService.vaccines.addVaccine(childId, {
          name: vaccineName,
          scheduledDate: dateStr,
          appliedDate: dateStr,
          status: 'applied',
        });
        Alert.alert('Éxito', `Vacuna "${vaccineName}" registrada como aplicada`);
      }
      
      loadHealthData();
      setPendingVaccine(null);
      setShowDatePicker(false);
    } catch (error) {
      console.error('Error guardando vacuna:', error);
      Alert.alert('Error', 'No se pudo guardar la vacuna.');
    }
  };

  // Función para manejar clic en una vacuna
  const handleVaccinePress = (vaccine: any) => {
    const options: AlertButton[] = [];

    // Si está pendiente, permitir marcar como aplicada
    if (vaccine.status === 'pending') {
      options.push({
        text: '✓ Marcar como aplicada',
        onPress: () => {
          setPendingVaccine({ ...vaccine });
          setSelectedDate(new Date());
          setShowDatePicker(true);
        },
      });
    }

    // Si está aplicada, permitir cambiar a pendiente
    if (vaccine.status === 'applied') {
      options.push({
        text: '↩️ Cambiar a pendiente',
        onPress: async () => {
          Alert.alert(
            'Confirmar',
            '¿Deseas cambiar esta vacuna a pendiente?',
            [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Sí, cambiar',
                onPress: async () => {
                  try {
                    await vaccinesService.updateVaccine(childId, vaccine.id, {
                      status: 'pending',
                      appliedDate: undefined,
                    });
                    Alert.alert('Éxito', 'Vacuna cambiada a pendiente');
                    loadHealthData();
                  } catch (error) {
                    console.error('Error actualizando vacuna:', error);
                    Alert.alert('Error', 'No se pudo actualizar la vacuna.');
                  }
                },
              },
            ]
          );
        },
      });
    }

    // Opción de agregar/editar notas
    options.push({
      text: '📝 ' + (vaccine.notes ? 'Editar notas' : 'Agregar notas'),
      onPress: () => {
        if (Platform.OS === 'ios') {
          Alert.prompt(
            'Notas de la vacuna',
            `Notas para ${vaccine.name}:`,
            [
              {
                text: 'Cancelar',
                style: 'cancel',
              },
              {
                text: 'Guardar',
                onPress: async (notes) => {
                  try {
                    await vaccinesService.updateVaccine(childId, vaccine.id, {
                      notes: notes || '',
                    });
                    Alert.alert('Éxito', 'Notas actualizadas');
                    loadHealthData();
                  } catch (error) {
                    console.error('Error actualizando notas:', error);
                    Alert.alert('Error', 'No se pudieron actualizar las notas.');
                  }
                },
              },
            ],
            'plain-text',
            vaccine.notes || ''
          );
        } else {
          // Para Android, usar un Alert simple
          Alert.alert(
            'Notas de la vacuna',
            `Notas actuales: ${vaccine.notes || 'Sin notas'}`,
            [
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
        }
      },
    });

    // Opción de eliminar
    options.push({
      text: '🗑️ Eliminar',
      onPress: async () => {
        Alert.alert(
          'Confirmar eliminación',
          `¿Estás seguro de eliminar la vacuna "${vaccine.name}"? Esta acción no se puede deshacer.`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Eliminar',
              style: 'destructive',
              onPress: async () => {
                try {
                  await vaccinesService.deleteVaccine(childId, vaccine.id);
                  Alert.alert('Éxito', 'Vacuna eliminada correctamente');
                  loadHealthData();
                } catch (error) {
                  console.error('Error eliminando vacuna:', error);
                  Alert.alert('Error', 'No se pudo eliminar la vacuna.');
                }
              },
            },
          ]
        );
      },
    });

    options.push({
      text: 'Cancelar',
      style: 'cancel',
    });

    Alert.alert('Opciones de vacuna', `${vaccine.name}`, options);
  };

  // Función para agregar vacuna personalizada
  const handleAddCustomVaccine = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Vacuna Personalizada',
        'Ingresa el nombre de la vacuna:',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Continuar',
            onPress: (vaccineName) => {
              if (vaccineName && vaccineName.trim()) {
                // Preguntar si ya fue aplicada
                Alert.alert(
                  `Vacuna: ${vaccineName.trim()}`,
                  '¿Esta vacuna ya fue aplicada?',
                  [
                    {
                      text: 'No, programar',
                      onPress: async () => {
                        try {
                          const today = new Date().toISOString().split('T')[0];
                          await childProfileService.vaccines.addVaccine(childId, {
                            name: vaccineName.trim(),
                            scheduledDate: today,
                            status: 'pending',
                          });
                          Alert.alert('Éxito', `Vacuna "${vaccineName.trim()}" programada correctamente`);
                          loadHealthData();
                        } catch (error) {
                          console.error('Error agregando vacuna:', error);
                          Alert.alert('Error', 'No se pudo agregar la vacuna.');
                        }
                      },
                    },
                    {
                      text: 'Sí, aplicada',
                      onPress: () => {
                        setPendingVaccine({ name: vaccineName.trim() });
                        setSelectedDate(new Date());
                        setShowDatePicker(true);
                      },
                    },
                    {
                      text: 'Cancelar',
                      style: 'cancel',
                    },
                  ]
                );
              }
            },
          },
        ],
        'plain-text'
      );
    } else {
      // Para Android, mostrar una alerta simple
      Alert.alert(
        'Vacuna Personalizada',
        'Por favor, contacta al soporte para agregar vacunas personalizadas en Android. Próximamente estará disponible un formulario completo.',
        [
          { text: 'Entendido' }
        ]
      );
    }
  };

  // Función para agregar vacuna
  const handleAddVaccine = () => {
    const vaccineOptions = [
      { name: 'BCG', label: 'BCG' },
      { name: 'Hepatitis B', label: 'Hepatitis B' },
      { name: 'DTP', label: 'DTP (Difteria, Tétanos, Pertussis)' },
      { name: 'Polio', label: 'Polio' },
      { name: 'Rotavirus', label: 'Rotavirus' },
      { name: 'Neumococo', label: 'Neumococo' },
      { name: 'Influenza', label: 'Influenza' },
      { name: 'Hepatitis A', label: 'Hepatitis A' },
      { name: 'Triple Viral (SRP)', label: 'Triple Viral (SRP)' },
      { name: 'Varicela', label: 'Varicela' },
    ];

    // Filtrar vacunas que ya están registradas
    const existingVaccineNames = vaccines.map(v => v.name);
    const availableVaccines = vaccineOptions.filter(
      vaccine => !existingVaccineNames.includes(vaccine.name)
    );

    const buttons = availableVaccines.map(vaccine => ({
      text: vaccine.label,
      onPress: () => {
        // Preguntar si ya fue aplicada
        Alert.alert(
          `Vacuna: ${vaccine.name}`,
          '¿Esta vacuna ya fue aplicada?',
          [
            {
              text: 'No, programar',
              onPress: async () => {
                try {
                  const today = new Date().toISOString().split('T')[0];
                  await childProfileService.vaccines.addVaccine(childId, {
                    name: vaccine.name,
                    scheduledDate: today,
                    status: 'pending',
                  });
                  Alert.alert('Éxito', `Vacuna "${vaccine.name}" programada correctamente`);
                  loadHealthData();
                } catch (error) {
                  console.error('Error agregando vacuna:', error);
                  Alert.alert('Error', 'No se pudo agregar la vacuna. Verifica que el backend esté funcionando.');
                }
              },
            },
            {
              text: 'Sí, aplicada',
              onPress: () => {
                // Abrir selector de fecha
                setPendingVaccine({ name: vaccine.name });
                setSelectedDate(new Date());
                setShowDatePicker(true);
              },
            },
            {
              text: 'Cancelar',
              style: 'cancel',
            },
          ]
        );
      },
    }));

    // Agregar opción para vacuna personalizada
    buttons.push({
      text: '➕ Otra vacuna...',
      onPress: handleAddCustomVaccine,
    });

    buttons.push({ text: 'Cancelar', onPress: async () => {} });

    Alert.alert('Selecciona la vacuna', 'Elige una vacuna del listado:', buttons);
  };

  // Función para agregar cita médica
  const handleAddAppointment = () => {
    const appointmentTypes = [
      { type: 'checkup', label: '🔍 Chequeo general' },
      { type: 'specialist', label: '👨‍⚕️ Especialista' },
      { type: 'vaccine', label: '💉 Vacunación' },
      { type: 'emergency', label: '🚨 Emergencia' },
    ];

    const buttons = appointmentTypes.map(apt => ({
      text: apt.label,
      onPress: async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          await childProfileService.appointments.addAppointment(childId, {
            type: apt.type as any,
            date: today,
            doctor: 'Por definir',
            reason: apt.label,
            status: 'scheduled',
          });
          Alert.alert('Éxito', 'Cita médica agregada correctamente');
          loadHealthData();
        } catch (error) {
          console.error('Error agregando cita:', error);
          Alert.alert('Error', 'No se pudo agregar la cita. Verifica que el backend esté funcionando.');
        }
      },
    }));

    buttons.push({ text: 'Cancelar', onPress: async () => {} });

    Alert.alert('Tipo de cita', 'Selecciona el tipo de cita médica:', buttons);
  };

  // Función para agregar medición
  const handleAddMeasurement = () => {
    // Por ahora agregar una medición de ejemplo
    // En producción, esto debería abrir un modal o navegar a una pantalla de formulario
    Alert.alert(
      'Agregar Medición',
      '¿Deseas agregar una medición de ejemplo?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Agregar',
          onPress: async () => {
            try {
              const today = new Date().toISOString().split('T')[0];
              // Valores de ejemplo basados en la edad
              const ageMonths = child.ageInMonths || 12;
              const weight = 3.5 + (ageMonths * 0.5); // Aproximación
              const height = 50 + (ageMonths * 2); // Aproximación
              
              await childProfileService.measurements.addMeasurement(childId, {
                date: today,
                weight: parseFloat(weight.toFixed(1)),
                height: parseFloat(height.toFixed(0)),
                notes: 'Medición de ejemplo',
              });
              Alert.alert('Éxito', 'Medición agregada correctamente');
              loadMeasurements();
            } catch (error) {
              console.error('Error agregando medición:', error);
              Alert.alert('Error', 'No se pudo agregar la medición. Verifica que el backend esté funcionando.');
            }
          },
        },
      ]
    );
  };

  // Función para agregar hito
  const handleAddMilestone = () => {
    const milestoneTypes = [
      { type: 'first_smile', title: 'Primera sonrisa', emoji: '😊' },
      { type: 'first_word', title: 'Primera palabra', emoji: '💬' },
      { type: 'first_step', title: 'Primeros pasos', emoji: '🚶' },
      { type: 'first_tooth', title: 'Primer diente', emoji: '🦷' },
      { type: 'custom', title: 'Otro hito especial', emoji: '🎉' },
    ];

    const buttons = milestoneTypes.map(milestone => ({
      text: `${milestone.emoji} ${milestone.title}`,
      onPress: async () => {
        try {
          const today = new Date().toISOString().split('T')[0];
          await childProfileService.milestones.addMilestone(childId, {
            type: milestone.type as any,
            title: milestone.title,
            date: today,
            description: `¡${child.name} logró ${milestone.title.toLowerCase()}!`,
            celebrationEmoji: milestone.emoji,
          });
          Alert.alert('¡Felicidades! 🎉', `Hito "${milestone.title}" agregado correctamente`);
          loadMilestones();
        } catch (error) {
          console.error('Error agregando hito:', error);
          Alert.alert('Error', 'No se pudo agregar el hito. Verifica que el backend esté funcionando.');
        }
      },
    }));

    buttons.push({ text: 'Cancelar', onPress: async () => {} });

    Alert.alert('Tipo de hito', 'Selecciona el tipo de hito del desarrollo:', buttons);
  };

  // Función para formatear fechas de Firestore
  const formatFirestoreTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Sin fecha';
    
    // Si es un objeto Timestamp de Firestore
    if (timestamp._seconds !== undefined) {
      const date = new Date(timestamp._seconds * 1000);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    // Si es una fecha ISO string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    return timestamp.toString();
  };

  // Función para calcular edad detallada (años, meses, semanas, días)
  const getDetailedAge = () => {
    const currentAge = calculateCurrentAge();
    
    if (child.isUnborn) {
      const weeks = child.currentGestationWeeks || child.gestationWeeks || 0;
      const days = (weeks % 1) * 7;
      return {
        primary: `${Math.floor(weeks)} semanas`,
        secondary: days > 0 ? `${Math.floor(days)} días` : '',
        emoji: '🤰',
      };
    }
    
    const years = Math.floor(currentAge / 12);
    const months = currentAge % 12;
    
    let primary = '';
    let secondary = '';
    
    if (years > 0) {
      primary = `${years} ${years === 1 ? 'año' : 'años'}`;
      if (months > 0) {
        secondary = `${months} ${months === 1 ? 'mes' : 'meses'}`;
      }
    } else {
      primary = `${months} ${months === 1 ? 'mes' : 'meses'}`;
      // Calcular semanas aproximadas para bebés menores de 3 meses
      if (months < 3) {
        const weeks = Math.floor(months * 4.33);
        secondary = `≈${weeks} semanas`;
      }
    }
    
    return {
      primary,
      secondary,
      emoji: years >= 2 ? '👧' : (months >= 12 ? '👶' : '🍼'),
    };
  };

  const loadChildData = async () => {
    try {
      console.log('🔄 [CHILD PROFILE] Recargando datos del hijo:', childId);
      const response = await childrenService.getChildren();
      
      if (response.success && response.data) {
        const children = Array.isArray(response.data) ? response.data : [];
        const updatedChild = children.find((c: Child) => c.id === childId);
        
        if (updatedChild) {
          console.log('✅ [CHILD PROFILE] Datos actualizados recibidos:', updatedChild);
          setChild(updatedChild);
          setProfileImage(updatedChild.photoUrl || null);
          
          // Recargar también la información de desarrollo con los nuevos datos
          loadDevelopmentInfoForChild(updatedChild);
        } else {
          console.error('❌ [CHILD PROFILE] No se encontró el hijo con ID:', childId);
        }
      } else {
        console.error('❌ [CHILD PROFILE] Error al obtener datos del hijo');
      }
    } catch (error) {
      console.error('❌ [CHILD PROFILE] Error recargando datos del hijo:', error);
    }
  };

  const loadDevelopmentInfo = async () => {
    loadDevelopmentInfoForChild(child);
  };

  const loadDevelopmentInfoForChild = async (childData: Child) => {
    try {
      setDevelopmentLoading(true);
      
      // Usar campos calculados por el backend
      const currentAge = childData.currentAgeInMonths || calculateCurrentAge();
      const currentWeeks = childData.currentGestationWeeks || childData.gestationWeeks;
      
      console.log('👶 [DEVELOPMENT] Cargando info para:', {
        nombre: childData.name,
        edadActual: currentAge,
        semanasActuales: currentWeeks,
        esNoNacido: childData.isUnborn
      });
      
      const info = await childrenService.getChildDevelopmentInfo(
        childData.name,
        currentAge,
        childData.isUnborn,
        currentWeeks
      );
      setDevelopmentInfo(info);
    } catch (error) {
      console.error('❌ Error cargando información de desarrollo:', error);
      // No mostrar alerta, solo log del error
    } finally {
      setDevelopmentLoading(false);
    }
  };

  const formatFirestoreDate = (dateObj: any): string => {
    if (!dateObj) return 'Fecha no disponible';
    
    if (typeof dateObj === 'object' && dateObj._seconds) {
      return new Date(dateObj._seconds * 1000).toLocaleDateString('es-ES');
    } else if (typeof dateObj === 'string') {
      return new Date(dateObj).toLocaleDateString('es-ES');
    }
    
    return 'Fecha no disponible';
  };

  const getChildAvatar = (index: number) => {
    // Usar las tres caritas disponibles sin repetir
    const caritas = [
      require('../../assets/caritas 1.png'),
      require('../../assets/caritas 2.png'),
      require('../../assets/caritas 3.png'),
    ];
    return caritas[index % 3];
  };

  const getChildInfo = (child: Child) => {
    const info = [];
    
    if (child.isUnborn) {
      const currentWeeks = child.currentGestationWeeks || child.gestationWeeks;
      info.push(`${currentWeeks} semanas de gestación`);
      info.push('Tu bebé está creciendo dentro de ti...');
      info.push('Recuerda mantener una alimentación saludable.');
    } else {
      const currentAge = child.currentAgeInMonths || child.ageInMonths;
      if (currentAge) {
        info.push(`${currentAge} meses`);
        info.push(`${child.name} puede estar atravesando por su ${Math.floor(currentAge / 1.5) + 1}to salto`);
        info.push('Alimentación complementaria activa.');
      }
    }
    
    return info;
  };

  const getSubtitleStyle = () => {
    return {
      fontSize: typography.sizes['2xl'],
      color: '#FFFFFF',
      lineHeight: 32,
      fontFamily: fontsLoaded ? 'Baby Face' : Platform.OS === 'ios' ? 'System' : 'sans-serif',
    };
  };

  const pickImage = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a tu galería para seleccionar una imagen.');
        return;
      }

      // Abrir selector de imagen
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndUpdatePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error seleccionando imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen. Inténtalo de nuevo.');
    }
  };

  const takePhoto = async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos requeridos', 'Necesitamos acceso a la cámara para tomar una foto.');
        return;
      }

      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadAndUpdatePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error tomando foto:', error);
      Alert.alert('Error', 'No se pudo tomar la foto. Inténtalo de nuevo.');
    }
  };

  const uploadAndUpdatePhoto = async (uri: string) => {
    try {
      setLoading(true);
      
      // Subir foto a Firebase Storage
      const uploadedPhotoUrl = await childrenPhotoService.uploadPhoto(uri, childId);
      
      // Actualizar estado local
      setProfileImage(uploadedPhotoUrl);
      
      // Actualizar el objeto child con la nueva información
      setChild(prevChild => ({
        ...prevChild,
        photoUrl: uploadedPhotoUrl,
        updatedAt: new Date().toISOString()
      }));
      
      Alert.alert('Éxito', 'Foto subida correctamente a Firebase Storage');
    } catch (error) {
      console.error('Error subiendo foto:', error);
      Alert.alert('Error', 'No se pudo subir la foto. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = async () => {
    try {
      setLoading(true);
      
      await childrenPhotoService.removeChildPhoto(childId);
      setProfileImage(null);
      
      // Actualizar el objeto child
      setChild(prevChild => ({
        ...prevChild,
        photoUrl: null,
        updatedAt: new Date().toISOString()
      }));
      
      Alert.alert('Éxito', 'Foto eliminada correctamente de Firebase Storage');
    } catch (error) {
      console.error('Error eliminando foto:', error);
      Alert.alert('Error', 'No se pudo eliminar la foto. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const ageInfo = getDetailedAge();

  return (
    <View style={styles.container}>
    <ScrollView 
      style={styles.scrollView}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#59C6C0']}
          tintColor="#59C6C0"
        />
      }
    >
      {/* Header con imagen de fondo */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          
          <View style={styles.childInfoHeader}>
            <View style={styles.avatarContainer}>
              <Image 
                source={profileImage ? { uri: profileImage } : getChildAvatar(0)} 
                style={styles.childAvatar}
                key={profileImage || 'default'}
              />
              {loading && (
                <View style={styles.loadingOverlay}>
                  <Text style={styles.loadingText}>📤</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.changePhotoButton, loading && styles.disabledButton]}
                onPress={pickImage}
                disabled={loading}
              >
                <Text style={styles.changePhotoText}>📷</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.childName}>{child.name}</Text>
            
            {/* Widget de edad mejorado */}
            <View style={styles.ageWidget}>
              <Text style={styles.ageEmoji}>{ageInfo.emoji}</Text>
              <View style={styles.ageTextContainer}>
                <Text style={styles.agePrimary}>{ageInfo.primary}</Text>
                {ageInfo.secondary && (
                  <Text style={styles.ageSecondary}>{ageInfo.secondary}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs de navegación */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContentContainer}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'info' && styles.activeTab]}
          onPress={() => setActiveTab('info')}
        >
          <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
            ℹ️ Info
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'development' && styles.activeTab]}
          onPress={() => setActiveTab('development')}
        >
          <Text style={[styles.tabText, activeTab === 'development' && styles.activeTabText]}>
            🧠 Desarrollo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'health' && styles.activeTab]}
          onPress={() => {
            setActiveTab('health');
            loadHealthData();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'health' && styles.activeTabText]}>
            💉 Salud
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'measurements' && styles.activeTab]}
          onPress={() => {
            setActiveTab('measurements');
            loadMeasurements();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'measurements' && styles.activeTabText]}>
            📏 Mediciones
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'milestones' && styles.activeTab]}
          onPress={() => {
            setActiveTab('milestones');
            loadMilestones();
          }}
        >
          <Text style={[styles.tabText, activeTab === 'milestones' && styles.activeTabText]}>
            🎉 Hitos
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
          onPress={() => setActiveTab('photos')}
        >
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
            📸 Fotos
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* TAB: Información básica */}
        {activeTab === 'info' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información básica</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nombre:</Text>
              <Text style={styles.infoValue}>{child.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Estado:</Text>
              <Text style={styles.infoValue}>
                {child.isUnborn ? 'En gestación' : 'Nacido'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Edad:</Text>
              <Text style={styles.infoValue}>
                {child.isUnborn 
                  ? `${child.currentGestationWeeks || child.gestationWeeks} semanas`
                  : `${child.currentAgeInMonths || calculateCurrentAge()} meses`
                }
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha de registro:</Text>
              <Text style={styles.infoValue}>
                {formatFirestoreDate(child.createdAt)}
              </Text>
            </View>
          </View>
          
          {/* Botón de editar información */}
          <TouchableOpacity style={styles.actionButton} onPress={handleEditChild}>
            <Text style={styles.actionButtonText}>Editar información</Text>
          </TouchableOpacity>
        </View>
        )}

        {/* TAB: Desarrollo y cuidados */}
        {activeTab === 'development' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Desarrollo y cuidados</Text>
          <View style={styles.infoCard}>
            {developmentLoading ? (
              <View style={styles.skeletonContainer}>
                <View style={styles.skeletonHeader}>
                  <View style={styles.skeletonCircle} />
                  <View style={[styles.skeletonLine, { width: '70%' }]} />
                </View>
                <View style={[styles.skeletonLine, { width: '100%', marginTop: 16 }]} />
                <View style={[styles.skeletonLine, { width: '90%', marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '95%', marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '85%', marginTop: 8 }]} />
                <View style={[styles.skeletonHeader, { marginTop: 24 }]}>
                  <View style={styles.skeletonCircle} />
                  <View style={[styles.skeletonLine, { width: '60%' }]} />
                </View>
                <View style={[styles.skeletonLine, { width: '100%', marginTop: 16 }]} />
                <View style={[styles.skeletonLine, { width: '95%', marginTop: 8 }]} />
                <View style={[styles.skeletonLine, { width: '80%', marginTop: 8 }]} />
              </View>
            ) : developmentInfo ? (
              <>
                {developmentInfo.data && developmentInfo.data.developmentInfo && developmentInfo.data.developmentInfo.length > 0 && (
                  <View style={styles.developmentSection}>
                    <View style={styles.developmentHeader}>
                      <Text style={styles.developmentHeaderIcon}>🎯</Text>
                      <Text style={styles.developmentSubtitle}>Información de desarrollo</Text>
                    </View>
                    {developmentInfo.data.developmentInfo.map((info: string, index: number) => (
                      <View key={index} style={styles.developmentItem}>
                        <View style={styles.developmentBullet}>
                          <Text style={styles.developmentBulletText}>•</Text>
                        </View>
                        <Text style={styles.developmentText}>
                        {info}
                      </Text>
                      </View>
                    ))}
                  </View>
                )}
                
                {/* Indicadores de progreso */}
                <View style={styles.developmentProgressSection}>
                  <View style={styles.developmentHeader}>
                    <Text style={styles.developmentHeaderIcon}>📊</Text>
                    <Text style={styles.developmentSubtitle}>Áreas de desarrollo</Text>
                  </View>
                  
                  <View style={styles.progressIndicator}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressIcon}>🚶</Text>
                      <Text style={styles.progressLabel}>Motor</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: '85%', backgroundColor: '#4CAF50' }]} />
                    </View>
                    <Text style={styles.progressPercentage}>85%</Text>
                  </View>

                  <View style={styles.progressIndicator}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressIcon}>💬</Text>
                      <Text style={styles.progressLabel}>Lenguaje</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: '75%', backgroundColor: '#2196F3' }]} />
                    </View>
                    <Text style={styles.progressPercentage}>75%</Text>
                  </View>

                  <View style={styles.progressIndicator}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressIcon}>🧠</Text>
                      <Text style={styles.progressLabel}>Cognitivo</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: '80%', backgroundColor: '#FF9800' }]} />
                    </View>
                    <Text style={styles.progressPercentage}>80%</Text>
                  </View>

                  <View style={styles.progressIndicator}>
                    <View style={styles.progressLabelContainer}>
                      <Text style={styles.progressIcon}>👥</Text>
                      <Text style={styles.progressLabel}>Social</Text>
                    </View>
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: '70%', backgroundColor: '#9C27B0' }]} />
                    </View>
                    <Text style={styles.progressPercentage}>70%</Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.fallbackContainer}>
                <Text style={styles.fallbackText}>Información de desarrollo no disponible</Text>
                <TouchableOpacity 
                  style={styles.retryButton}
                  onPress={loadDevelopmentInfo}
                >
                  <Text style={styles.retryButtonText}>🔄 Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
        )}

        {/* TAB: Salud (Vacunas y Citas) */}
        {activeTab === 'health' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💉 Salud</Text>
          
          {healthLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando información de salud...</Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              {/* Cartilla de Vacunación */}
              <View style={styles.vaccineCardContainer}>
                <View style={styles.vaccineCardHeader}>
                  <View style={styles.vaccineCardTitleContainer}>
                    <Text style={styles.vaccineCardIcon}>💉</Text>
                    <View>
                      <Text style={styles.vaccineCardTitle}>Cartilla de Vacunación</Text>
                      <Text style={styles.vaccineCardSubtitle}>
                        {vaccines.filter(v => v.status === 'applied').length} de {vaccines.length} aplicadas
                      </Text>
                    </View>
                  </View>
                </View>

                {vaccines.length > 0 ? (
                  <View style={styles.vaccineList}>
                    {vaccines.map((vaccine: any, index: number) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.vaccineCard}
                        onPress={() => handleVaccinePress(vaccine)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.vaccineCardLeft}>
                          <View style={[
                            styles.vaccineStatusCircle,
                            vaccine.status === 'applied' && styles.vaccineApplied,
                            vaccine.status === 'pending' && styles.vaccinePending,
                            vaccine.status === 'skipped' && styles.vaccineSkipped,
                          ]}>
                            <Text style={styles.vaccineStatusIcon}>
                              {vaccine.status === 'applied' ? '✓' : 
                               vaccine.status === 'pending' ? '○' : '✕'}
                            </Text>
                          </View>
                          <View style={styles.vaccineCardInfo}>
                            <Text style={styles.vaccineCardName}>{vaccine.name}</Text>
                            <Text style={styles.vaccineCardDate}>
                              {vaccine.status === 'applied' 
                                ? `Aplicada: ${formatFirestoreTimestamp(vaccine.appliedDate)}`
                                : `Programada: ${formatFirestoreTimestamp(vaccine.scheduledDate)}`}
                            </Text>
                            {vaccine.location && (
                              <Text style={styles.vaccineCardLocation}>📍 {vaccine.location}</Text>
                            )}
                          </View>
                        </View>
                        <View style={[
                          styles.vaccineCardBadge,
                          vaccine.status === 'applied' && styles.badgeApplied,
                          vaccine.status === 'pending' && styles.badgePending,
                          vaccine.status === 'skipped' && styles.badgeSkipped,
                        ]}>
                          <Text style={[
                            styles.vaccineCardBadgeText,
                            vaccine.status === 'applied' && styles.badgeTextApplied,
                            vaccine.status === 'pending' && styles.badgeTextPending,
                          ]}>
                            {vaccine.status === 'applied' ? 'APLICADA' : 
                             vaccine.status === 'pending' ? 'PENDIENTE' : 'OMITIDA'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.vaccineEmptyState}>
                    <Text style={styles.vaccineEmptyIcon}>💉</Text>
                    <Text style={styles.vaccineEmptyText}>No hay vacunas registradas</Text>
                    <Text style={styles.vaccineEmptySubtext}>Agrega la primera vacuna usando el botón de abajo</Text>
                  </View>
                )}
              </View>

              {/* Citas médicas */}
              <View style={styles.healthSubsection}>
                <View style={styles.developmentHeader}>
                  <Text style={styles.developmentHeaderIcon}>🏥</Text>
                  <Text style={styles.developmentSubtitle}>Citas médicas</Text>
                </View>
                {appointments.length > 0 ? (
                  appointments.map((appointment: any, index: number) => (
                    <View key={index} style={styles.healthItem}>
                      <View style={styles.healthItemHeader}>
                        <Text style={styles.healthItemTitle}>
                          {appointment.type === 'checkup' ? '🔍 Chequeo' :
                           appointment.type === 'specialist' ? '👨‍⚕️ Especialista' :
                           appointment.type === 'vaccine' ? '💉 Vacunación' : '🚨 Emergencia'}
                        </Text>
                        <View style={[
                          styles.healthStatusBadge,
                          appointment.status === 'completed' && styles.statusApplied,
                          appointment.status === 'scheduled' && styles.statusPending,
                          appointment.status === 'cancelled' && styles.statusSkipped,
                        ]}>
                          <Text style={styles.healthStatusText}>
                            {appointment.status === 'completed' ? '✓ Completada' :
                             appointment.status === 'scheduled' ? '📅 Programada' : '✕ Cancelada'}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.healthItemDetail}>
                        📅 {formatFirestoreTimestamp(appointment.date)}
                      </Text>
                      {appointment.doctor && (
                        <Text style={styles.healthItemDetail}>
                          👨‍⚕️ {appointment.doctor}
                        </Text>
                      )}
                      {appointment.reason && (
                        <Text style={styles.healthItemNotes}>{appointment.reason}</Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyState}>No hay citas registradas</Text>
                )}
              </View>

              {/* Botones para agregar */}
              <View style={styles.addButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.addButton, { flex: 1, marginRight: 8 }]}
                  onPress={handleAddVaccine}
                >
                  <Text style={styles.addButtonText}>+ Vacuna</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.addButton, { flex: 1, marginLeft: 8 }]}
                  onPress={handleAddAppointment}
                >
                  <Text style={styles.addButtonText}>+ Cita</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        )}

        {/* TAB: Mediciones */}
        {activeTab === 'measurements' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📏 Mediciones</Text>
          
          {measurementsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando mediciones...</Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              {/* Gráfico simple de mediciones */}
              <View style={styles.measurementsChart}>
                <Text style={styles.chartTitle}>Evolución del crecimiento</Text>
                <Text style={styles.chartSubtitle}>
                  {measurements.length} mediciones registradas
                </Text>
                
                {measurements.length > 0 ? (
                  <View style={styles.measurementsTimeline}>
                    {measurements.slice(0, 5).map((measurement: any, index: number) => (
                      <View key={index} style={styles.measurementCard}>
                        <Text style={styles.measurementDate}>{formatFirestoreTimestamp(measurement.date)}</Text>
                        <View style={styles.measurementStats}>
                          {measurement.weight && (
                            <View style={styles.measurementStat}>
                              <Text style={styles.measurementIcon}>⚖️</Text>
                              <Text style={styles.measurementValue}>{measurement.weight} kg</Text>
                            </View>
                          )}
                          {measurement.height && (
                            <View style={styles.measurementStat}>
                              <Text style={styles.measurementIcon}>📏</Text>
                              <Text style={styles.measurementValue}>{measurement.height} cm</Text>
                            </View>
                          )}
                          {measurement.headCircumference && (
                            <View style={styles.measurementStat}>
                              <Text style={styles.measurementIcon}>⭕</Text>
                              <Text style={styles.measurementValue}>{measurement.headCircumference} cm</Text>
                            </View>
                          )}
                        </View>
                        {measurement.notes && (
                          <Text style={styles.measurementNotes}>{measurement.notes}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyState}>No hay mediciones registradas</Text>
                )}
              </View>

              {/* Botón para agregar medición */}
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddMeasurement}
              >
                <Text style={styles.addButtonText}>+ Agregar medición</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* TAB: Hitos del desarrollo */}
        {activeTab === 'milestones' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎉 Hitos del desarrollo</Text>
          
          {milestonesLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#59C6C0" />
              <Text style={styles.loadingText}>Cargando hitos...</Text>
            </View>
          ) : (
            <View style={styles.infoCard}>
              {milestones.length > 0 ? (
                milestones.map((milestone: any, index: number) => (
                  <View key={index} style={styles.milestoneCard}>
                    <View style={styles.milestoneHeader}>
                      <Text style={styles.milestoneCelebration}>
                        {milestone.celebrationEmoji || '🎉'}
                      </Text>
                      <View style={styles.milestoneInfo}>
                        <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                        <Text style={styles.milestoneDate}>{formatFirestoreTimestamp(milestone.date)}</Text>
                      </View>
                    </View>
                    {milestone.description && (
                      <Text style={styles.milestoneDescription}>{milestone.description}</Text>
                    )}
                    {milestone.type && (
                      <View style={styles.milestoneTypeBadge}>
                        <Text style={styles.milestoneTypeText}>
                          {milestone.type === 'first_smile' ? '😊 Primera sonrisa' :
                           milestone.type === 'first_word' ? '💬 Primera palabra' :
                           milestone.type === 'first_step' ? '🚶 Primeros pasos' :
                           milestone.type === 'first_tooth' ? '🦷 Primer diente' : '✨ Personalizado'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyState}>No hay hitos registrados</Text>
              )}

              {/* Botón para agregar hito */}
              <TouchableOpacity 
                style={styles.addButton}
                onPress={handleAddMilestone}
              >
                <Text style={styles.addButtonText}>+ Agregar hito</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        )}

        {/* TAB: Gestión de fotos */}
        {activeTab === 'photos' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Galería de fotos</Text>
          
          {/* Botones de acción */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.photoActionButton, loading && styles.disabledActionButton]}
              onPress={takePhoto}
              disabled={loading}
            >
              <Text style={styles.photoActionIcon}>📸</Text>
              <Text style={styles.photoActionText}>Tomar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.photoActionButton, loading && styles.disabledActionButton]}
              onPress={pickImage}
              disabled={loading}
            >
              <Text style={styles.photoActionIcon}>🖼️</Text>
              <Text style={styles.photoActionText}>Galería</Text>
            </TouchableOpacity>
            {profileImage && (
              <TouchableOpacity 
                style={[styles.photoActionButton, styles.removePhotoButton, loading && styles.disabledActionButton]}
                onPress={removePhoto}
                disabled={loading}
              >
                <Text style={styles.photoActionIcon}>🗑️</Text>
                <Text style={styles.photoActionText}>
                  {loading ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Vista previa de foto actual */}
          {profileImage && (
            <View style={styles.photoPreviewSection}>
              <Text style={styles.photoPreviewTitle}>Foto de perfil actual:</Text>
              <View style={styles.photoPreviewContainer}>
                <Image 
                  source={{ uri: profileImage }} 
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
        </View>
            </View>
          )}

          {/* Sección de álbumes (placeholder para futura implementación) */}
          <View style={styles.albumsSection}>
            <Text style={styles.albumsTitle}>📚 Álbumes</Text>
            <Text style={styles.albumsPlaceholder}>
              Próximamente: Organiza las fotos de {child?.name} en álbumes temáticos
            </Text>
            <View style={styles.albumsGrid}>
              <View style={styles.albumPlaceholder}>
                <Text style={styles.albumIcon}>🎂</Text>
                <Text style={styles.albumName}>Cumpleaños</Text>
              </View>
              <View style={styles.albumPlaceholder}>
                <Text style={styles.albumIcon}>👶</Text>
                <Text style={styles.albumName}>Primer año</Text>
              </View>
              <View style={styles.albumPlaceholder}>
                <Text style={styles.albumIcon}>🎉</Text>
                <Text style={styles.albumName}>Hitos</Text>
              </View>
            </View>
          </View>
        </View>
        )}
      </View>
    </ScrollView>

    {/* Botones flotantes de acciones rápidas */}
    <View style={styles.fabContainer}>
      <TouchableOpacity 
        style={[styles.fab, styles.fabSecondary]}
        onPress={() => Alert.alert('Próximamente', 'Función de compartir próximamente')}
      >
        <Text style={styles.fabIcon}>📤</Text>
            </TouchableOpacity>
      <TouchableOpacity 
        style={styles.fab}
        onPress={handleEditChild}
      >
        <Text style={styles.fabIcon}>✏️</Text>
            </TouchableOpacity>
    </View>

    {/* Date Picker Modal para vacunas */}
    {showDatePicker && (
      Platform.OS === 'ios' ? (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={() => {
            setShowDatePicker(false);
            setPendingVaccine(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Selecciona la fecha</Text>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                maximumDate={new Date()}
                locale="es-ES"
              />
              <View style={styles.datePickerButtons}>
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.cancelButton]}
                  onPress={() => {
                    setShowDatePicker(false);
                    setPendingVaccine(null);
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.confirmButton]}
                  onPress={() => {
                    if (pendingVaccine) {
                      saveVaccineWithDate(pendingVaccine.name, selectedDate);
                    }
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
          value={selectedDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )
    )}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#8fd8d3',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fcde9d',
    paddingTop: 60,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.lg,
  },
  backButtonText: {
    fontSize: typography.sizes.lg,
    color: colors.white,
    fontWeight: typography.weights.medium,
  },
  childInfoHeader: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  childAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fcde9d',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    ...shadows.base,
  },
  changePhotoText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  removeButton: {
    backgroundColor: '#FF3B30',
  },
  removeButtonText: {
    color: colors.white,
  },
  // Estilos para galería de fotos
  photoActionButton: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.base,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    ...shadows.sm,
  },
  photoActionIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  photoActionText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  removePhotoButton: {
    backgroundColor: '#FFE5E5',
  },
  photoPreviewSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.base,
  },
  photoPreviewTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  photoPreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.xl,
    ...shadows.base,
  },
  albumsSection: {
    marginTop: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.base,
  },
  albumsTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  albumsPlaceholder: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
  },
  albumsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  albumPlaceholder: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.base,
    padding: spacing.lg,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  albumIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  albumName: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  // Skeleton screens
  skeletonContainer: {
    padding: spacing.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  skeletonLine: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  // Indicadores de desarrollo
  developmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  developmentHeaderIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  developmentItem: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  developmentBullet: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  developmentBulletText: {
    fontSize: typography.sizes.lg,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  developmentProgressSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 110,
  },
  progressIcon: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  progressLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    width: 45,
    textAlign: 'right',
  },
  // FAB (Floating Action Buttons)
  fabContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#59C6C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.lg,
    elevation: 8,
  },
  fabSecondary: {
    backgroundColor: '#fcde9d',
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  fabIcon: {
    fontSize: 24,
  },
  childName: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: spacing.sm,
  },
  ageWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  ageEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  ageTextContainer: {
    flexDirection: 'column',
  },
  agePrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  ageSecondary: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 2,
  },
  tabsContainer: {
    backgroundColor: colors.white,
    borderRadius: 15,
    padding: 8,
    marginHorizontal: 20,
    marginTop: -30,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabsContentContainer: {
    paddingHorizontal: 2,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: '#59C6C0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: colors.white,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.base,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  infoValue: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
  },
  developmentText: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  developmentSection: {
    marginBottom: spacing.lg,
  },
  developmentSubtitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    minHeight: 120,
  },
  fallbackContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  fallbackText: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.white,
  },
  actionsContainer: {
    gap: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.base,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.base,
  },
  actionButtonText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    color: colors.primary,
  },
  // Estilos para cartilla de vacunación
  vaccineCardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E8F5E9',
  },
  vaccineCardHeader: {
    backgroundColor: '#4CAF50',
    padding: spacing.lg,
  },
  vaccineCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vaccineCardIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  vaccineCardTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    color: colors.white,
    marginBottom: 4,
  },
  vaccineCardSubtitle: {
    fontSize: typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  vaccineList: {
    padding: spacing.md,
  },
  vaccineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  vaccineCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vaccineStatusCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: colors.white,
  },
  vaccineApplied: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  vaccinePending: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
  },
  vaccineSkipped: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  vaccineStatusIcon: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
  },
  vaccineCardInfo: {
    flex: 1,
  },
  vaccineCardName: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  vaccineCardDate: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  vaccineCardLocation: {
    fontSize: typography.sizes.xs,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  vaccineCardBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: '#E0E0E0',
  },
  badgeApplied: {
    backgroundColor: '#4CAF50',
  },
  badgePending: {
    backgroundColor: '#FF9800',
  },
  badgeSkipped: {
    backgroundColor: '#F44336',
  },
  vaccineCardBadgeText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.bold,
    color: colors.white,
    letterSpacing: 0.5,
  },
  badgeTextApplied: {
    color: colors.white,
  },
  badgeTextPending: {
    color: colors.white,
  },
  vaccineEmptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
  },
  vaccineEmptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
    opacity: 0.3,
  },
  vaccineEmptyText: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  vaccineEmptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  // Estilos para salud
  healthSubsection: {
    marginBottom: spacing.xl,
  },
  healthItem: {
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  healthItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  healthItemTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  healthStatusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: '#E0E0E0',
  },
  statusApplied: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusSkipped: {
    backgroundColor: '#FFEBEE',
  },
  healthStatusText: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  healthItemDetail: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  healthItemNotes: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  emptyState: {
    fontSize: typography.sizes.base,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontStyle: 'italic',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  addButton: {
    backgroundColor: '#59C6C0',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  addButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
  // Estilos para mediciones
  measurementsChart: {
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  measurementsTimeline: {
    marginTop: spacing.md,
  },
  measurementCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.base,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: '#59C6C0',
  },
  measurementDate: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  measurementStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.sm,
  },
  measurementStat: {
    alignItems: 'center',
  },
  measurementIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  measurementValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  measurementNotes: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  // Estilos para hitos
  milestoneCard: {
    backgroundColor: '#F8F8F8',
    borderRadius: borderRadius.base,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#fcde9d',
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  milestoneCelebration: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  milestoneDate: {
    fontSize: typography.sizes.sm,
    color: colors.text.secondary,
  },
  milestoneDescription: {
    fontSize: typography.sizes.base,
    color: colors.text.primary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  milestoneTypeBadge: {
    backgroundColor: '#fcde9d',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  milestoneTypeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  // Estilos para Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  datePickerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  datePickerTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  datePickerButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.base,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
  },
  confirmButton: {
    backgroundColor: '#59C6C0',
  },
  cancelButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  confirmButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.white,
  },
});

export default ChildProfileScreen;
