import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService, vaccineService } from '../services/api';
import analyticsService from '../services/analyticsService';
import BannerCarousel from '../components/BannerCarousel';

interface Child {
  id: string;
  name: string;
  birthDate?: string | null;
  ageInMonths?: number | null;
  currentAgeInMonths?: number | null;
  gender?: 'M' | 'F' | string | null;
  sex?: 'M' | 'F' | string | null;
  isUnborn?: boolean;
  dueDate?: string | null;
  vaccinationCountryId?: string;
}

interface Vaccine {
  id: string;
  name: string;
  scheduledDate?: string;
  appliedDate?: string;
  status: 'pending' | 'applied' | 'overdue';
  location?: string;
  batch?: string;
  notes?: string;
  createdBy?: { uid?: string; name?: string };
}

const MUNPA_PRIMARY = '#96d2d3';
const MUNPA_PURPLE = '#887CBC';

const VaccineTrackerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [loading, setLoading] = useState(true);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [needsVaccinationCountry, setNeedsVaccinationCountry] = useState(false);
  const [countries, setCountries] = useState<any[]>([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showVaccineListModal, setShowVaccineListModal] = useState(false);
  const [vaccineScheduleItems, setVaccineScheduleItems] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [isCustomVaccine, setIsCustomVaccine] = useState(false);
  const [vaccineNameInput, setVaccineNameInput] = useState('');
  const [scheduledDateInput, setScheduledDateInput] = useState('');
  const [appliedDateInput, setAppliedDateInput] = useState('');
  const [statusInput, setStatusInput] = useState<'pending' | 'applied'>('applied');
  const [locationInput, setLocationInput] = useState('');
  const [batchInput, setBatchInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  const loadChildren = async () => {
    try {
      setLoadingChild(true);
      const response = await childrenService.getChildren();
      const data =
        (Array.isArray(response?.data) && response.data) ||
        (Array.isArray(response?.data?.children) && response.data.children) ||
        (Array.isArray(response?.children) && response.children) ||
        (Array.isArray(response) && response) ||
        [];
      if (data.length > 0) {
        setChildren(data);
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect: Child | null = null;
        if (savedChildId) {
          childToSelect = data.find((c: Child) => c.id === savedChildId) || null;
        }
        if (!childToSelect && data.length > 0) {
          childToSelect = data[0];
          if (childToSelect) {
            await AsyncStorage.setItem('selectedChildId', childToSelect.id);
          }
        }
        setSelectedChild(childToSelect);
      } else {
        setChildren([]);
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('❌ [VACCINES] Error cargando hijos:', error);
      setChildren([]);
      setSelectedChild(null);
    } finally {
      setLoadingChild(false);
    }
  };

  const loadVaccines = async (child: Child) => {
    try {
      setLoading(true);
      const response = await vaccineService.getVaccines(child.id);
      
      // Verificar si necesita asignar país para calendario de vacunación
      if (response?.needsVaccinationCountry === true) {
        console.log('⚠️ [VACCINES] Necesita asignar país de vacunación');
        setNeedsVaccinationCountry(true);
        setVaccines([]);
        // Recargar países antes de mostrar el modal
        await loadCountries();
        setShowCountryModal(true);
      } else {
        const items = Array.isArray(response?.data) ? response.data : [];
        console.log('💉 [VACCINES] Vacunas recibidas (cantidad):', items.length);
        
        // Log detallado de las fechas y conversión
        items.forEach((vaccine: any, index: number) => {
          console.log(`\n💉 [VACCINES] Vacuna ${index + 1} (${vaccine.name}):`);
          console.log('  📅 scheduledDate (crudo):', vaccine.scheduledDate);
          console.log('  📅 scheduledDate (tipo):', typeof vaccine.scheduledDate);
          if (vaccine.scheduledDate) {
            const parsed = parseDate(vaccine.scheduledDate);
            console.log('  📅 scheduledDate (parseada):', parsed?.toISOString());
            console.log('  📅 scheduledDate (formateada):', formatDate(vaccine.scheduledDate));
          }
          
          console.log('  ✅ appliedDate (crudo):', vaccine.appliedDate);
          console.log('  ✅ appliedDate (tipo):', typeof vaccine.appliedDate);
          if (vaccine.appliedDate) {
            const parsed = parseDate(vaccine.appliedDate);
            console.log('  ✅ appliedDate (parseada):', parsed?.toISOString());
            console.log('  ✅ appliedDate (formateada):', formatDate(vaccine.appliedDate));
          }
          
          console.log('  🏷️ status:', vaccine.status);
        });
        
        setVaccines(items);
        setNeedsVaccinationCountry(false);
        
        // Cargar el calendario de vacunación si está asignado
        if (child?.vaccinationCountryId) {
          console.log('📅 [VACCINES] Cargando calendario automáticamente...');
          const scheduleItems = await loadVaccineSchedule();
          if (scheduleItems.length > 0) {
            setVaccineScheduleItems(scheduleItems);
            console.log('✅ [VACCINES] Calendario cargado automáticamente:', scheduleItems.length, 'items');
          }
        }
      }
    } catch (error) {
      console.error('❌ [VACCINES] Error cargando vacunas:', error);
      setVaccines([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      console.log('🌍 [VACCINES] Iniciando carga de calendarios...');
      const response = await vaccineService.getSchedules();
      console.log('🌍 [VACCINES] Respuesta completa de getSchedules:', JSON.stringify(response, null, 2));
      
      // Intentar diferentes estructuras de respuesta
      let schedules = [];
      if (Array.isArray(response)) {
        schedules = response;
      } else if (Array.isArray(response?.data)) {
        schedules = response.data;
      } else if (Array.isArray(response?.schedules)) {
        schedules = response.schedules;
      }
      
      console.log('🌍 [VACCINES] Calendarios extraídos:', JSON.stringify(schedules, null, 2));
      
      // Extraer países únicos de los calendarios
      const uniqueCountries = schedules.reduce((acc: any[], schedule: any) => {
        if (schedule.countryId && schedule.countryName) {
          const exists = acc.find(c => c.id === schedule.countryId);
          if (!exists) {
            acc.push({
              id: schedule.countryId,
              name: schedule.countryName,
            });
          }
        }
        return acc;
      }, []);
      
      setCountries(uniqueCountries);
      console.log('🌍 [VACCINES] Países únicos con calendarios:', JSON.stringify(uniqueCountries, null, 2));
      
      if (uniqueCountries.length === 0) {
        console.warn('⚠️ [VACCINES] No se encontraron países con calendarios');
      }
    } catch (error: any) {
      console.error('❌ [VACCINES] Error cargando países:', error);
      console.error('❌ [VACCINES] Error details:', error?.response?.data || error?.message);
    }
  };

  useEffect(() => {
    loadChildren();
    loadCountries();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadVaccines(selectedChild);
    }
  }, [selectedChild]);


  useFocusEffect(
    useCallback(() => {
      analyticsService.logScreenView('VaccineTracker');
      if (selectedChild) {
        loadVaccines(selectedChild);
      }
    }, [selectedChild])
  );

  const handleChildChange = async (child: Child) => {
    setSelectedChild(child);
    await AsyncStorage.setItem('selectedChildId', child.id);
    analyticsService.logEvent('vaccine_child_changed', { child_id: child.id });
  };

  const loadVaccineSchedule = async () => {
    if (!selectedChild?.vaccinationCountryId) {
      console.log('⚠️ [VACCINES] No hay país de vacunación asignado');
      return [];
    }

    try {
      setLoadingSchedule(true);
      const response = await vaccineService.getScheduleByCountry(selectedChild.vaccinationCountryId);
      console.log('📋 [VACCINES] Calendario recibido:', JSON.stringify(response, null, 2));
      
      // Extraer items del calendario
      let items = [];
      if (Array.isArray(response?.data?.items)) {
        items = response.data.items;
      } else if (Array.isArray(response?.items)) {
        items = response.items;
      }
      
      console.log('📋 [VACCINES] Items del calendario:', JSON.stringify(items, null, 2));
      return items;
    } catch (error) {
      console.error('❌ [VACCINES] Error cargando calendario:', error);
      return [];
    } finally {
      setLoadingSchedule(false);
    }
  };

  const openAddModal = async () => {
    analyticsService.logEvent('vaccine_add_opened', {
      child_id: selectedChild?.id,
    });
    
    // Limpiar campos
    setEditingVaccine(null);
    setVaccineNameInput('');
    setScheduledDateInput(dateToString(new Date()));
    setAppliedDateInput(dateToString(new Date()));
    setStatusInput('applied');
    setLocationInput('');
    setBatchInput('');
    setNotesInput('');
    
    // Intentar cargar el calendario de vacunas
    const scheduleItems = await loadVaccineSchedule();
    
    if (scheduleItems.length > 0) {
      // Mostrar modal de selección de vacunas del calendario
      setVaccineScheduleItems(scheduleItems);
      setShowVaccineListModal(true);
    } else {
      // No hay calendario, abrir modal de agregar vacuna personalizada
      setIsCustomVaccine(true);
      setShowAddModal(true);
    }
  };

  const openEditModal = (vaccine: Vaccine) => {
    analyticsService.logEvent('vaccine_edit_opened', {
      child_id: selectedChild?.id,
      vaccine_id: vaccine.id,
    });
    
    setEditingVaccine(vaccine);
    setIsCustomVaccine(false);
    setVaccineNameInput(vaccine.name);
    
    // Parsear fecha programada
    if (vaccine.scheduledDate) {
      const scheduledDate = parseDate(vaccine.scheduledDate);
      if (scheduledDate && !isNaN(scheduledDate.getTime())) {
        setScheduledDateInput(dateToString(scheduledDate));
      } else {
        setScheduledDateInput('');
      }
    } else {
      setScheduledDateInput('');
    }
    
    // Parsear fecha de aplicación
    if (vaccine.appliedDate) {
      const appliedDate = parseDate(vaccine.appliedDate);
      if (appliedDate && !isNaN(appliedDate.getTime())) {
        setAppliedDateInput(dateToString(appliedDate));
      } else {
        setAppliedDateInput('');
      }
    } else {
      setAppliedDateInput('');
    }
    
    setStatusInput(vaccine.status === 'applied' ? 'applied' : 'pending');
    setLocationInput(vaccine.location || '');
    setBatchInput(vaccine.batch || '');
    setNotesInput(vaccine.notes || '');
    setShowAddModal(true);
  };

  const handleAssignSchedule = async (countryId: string) => {
    if (!selectedChild) return;

    // Verificar si ya hay vacunas registradas
    if (vaccines.length > 0) {
      Alert.alert(
        'No se puede cambiar el calendario',
        'Ya tienes vacunas registradas. No es posible cambiar el calendario de vacunación.',
        [{ text: 'Entendido', style: 'default' }]
      );
      setShowCountryModal(false);
      return;
    }

    try {
      console.log('📋 [VACCINES] Asignando calendario del país:', countryId);
      await vaccineService.assignSchedule(selectedChild.id, countryId);
      
      analyticsService.logEvent('vaccine_schedule_assigned', {
        child_id: selectedChild.id,
        country_id: countryId,
      });

      setShowCountryModal(false);
      setNeedsVaccinationCountry(false);
      
      // Actualizar selectedChild con el nuevo vaccinationCountryId
      if (selectedChild) {
        const updatedChild = { ...selectedChild, vaccinationCountryId: countryId };
        setSelectedChild(updatedChild);
        loadVaccines(updatedChild);
      }
      
      Alert.alert(
        'Calendario asignado',
        'El calendario de vacunación ha sido asignado correctamente. Las vacunas programadas aparecerán en tu lista.'
      );
    } catch (error: any) {
      console.error('❌ [VACCINES] Error asignando calendario:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo asignar el calendario de vacunación');
    }
  };

  const handleSaveVaccine = async () => {
    if (!selectedChild) return;

    if (!vaccineNameInput.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de la vacuna');
      return;
    }

    try {
      const data: any = {
        name: vaccineNameInput.trim(),
        status: statusInput,
      };

      // Si está marcada como aplicada, requerir fecha de aplicación
      if (statusInput === 'applied') {
        if (!appliedDateInput || appliedDateInput.trim() === '') {
          Alert.alert('Error', 'Por favor ingresa la fecha de aplicación');
          return;
        }
        
        const appliedDate = stringToDate(appliedDateInput);
        if (!appliedDate) {
          Alert.alert('Error', 'La fecha de aplicación no es válida. Usa el formato DD/MM/YYYY');
          return;
        }
        data.appliedDate = appliedDate.toISOString();
      }

      // Fecha programada (opcional)
      if (scheduledDateInput && scheduledDateInput.trim() !== '') {
        const scheduledDate = stringToDate(scheduledDateInput);
        if (!scheduledDate) {
          Alert.alert('Error', 'La fecha programada no es válida. Usa el formato DD/MM/YYYY');
          return;
        }
        data.scheduledDate = scheduledDate.toISOString();
      }

      // Campos opcionales
      if (locationInput.trim()) {
        data.location = locationInput.trim();
      }

      if (batchInput.trim()) {
        data.batch = batchInput.trim();
      }

      if (notesInput.trim()) {
        data.notes = notesInput.trim();
      }

      console.log('💉 [VACCINES] Guardando vacuna:', JSON.stringify(data, null, 2));
      console.log('💉 [VACCINES] scheduledDate ISO:', data.scheduledDate);
      console.log('💉 [VACCINES] appliedDate ISO:', data.appliedDate);
      console.log('💉 [VACCINES] Modo:', editingVaccine ? 'EDITAR' : 'CREAR');
      
      let result;
      if (editingVaccine) {
        // Actualizar vacuna existente
        result = await vaccineService.updateVaccine(selectedChild.id, editingVaccine.id, data);
        console.log('💉 [VACCINES] Vacuna actualizada:', JSON.stringify(result, null, 2));
        
        analyticsService.logEvent('vaccine_updated', {
          child_id: selectedChild.id,
          vaccine_id: editingVaccine.id,
          vaccine_name: vaccineNameInput,
        });
        
        Alert.alert('Éxito', 'Vacuna actualizada correctamente');
      } else {
        // Crear nueva vacuna
        result = await vaccineService.createVaccine(selectedChild.id, data);
        console.log('💉 [VACCINES] Vacuna creada:', JSON.stringify(result, null, 2));
        
        analyticsService.logEvent('vaccine_added', {
          child_id: selectedChild.id,
          vaccine_name: vaccineNameInput,
          status: statusInput,
        });
        
        Alert.alert('Éxito', 'Vacuna registrada correctamente');
      }

      setShowAddModal(false);
      setEditingVaccine(null);
      setIsCustomVaccine(false);
      loadVaccines(selectedChild);
    } catch (error: any) {
      console.error('❌ [VACCINES] Error guardando vacuna:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar la vacuna');
    }
  };

  const handleDeleteVaccine = (vaccine: Vaccine) => {
    Alert.alert(
      'Eliminar vacuna',
      `¿Estás seguro de que deseas eliminar ${vaccine.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!selectedChild) return;
              await vaccineService.deleteVaccine(selectedChild.id, vaccine.id);
              analyticsService.logEvent('vaccine_deleted', {
                child_id: selectedChild.id,
                vaccine_id: vaccine.id,
              });
              loadVaccines(selectedChild);
              Alert.alert('Éxito', 'Vacuna eliminada correctamente');
            } catch (error: any) {
              console.error('❌ [VACCINES] Error eliminando vacuna:', error);
              Alert.alert('Error', 'No se pudo eliminar la vacuna');
            }
          },
        },
      ]
    );
  };

  const parseDate = (dateInput: any): Date | null => {
    if (!dateInput) {
      return null;
    }
    
    try {
      // Si es un Timestamp de Firestore (formato: { seconds: number, nanoseconds: number })
      if (typeof dateInput === 'object' && dateInput !== null && !Array.isArray(dateInput)) {
        // Verificar si tiene _seconds o seconds
        if (dateInput._seconds !== undefined || dateInput.seconds !== undefined) {
          const seconds = dateInput._seconds || dateInput.seconds;
          const nanoseconds = dateInput._nanoseconds || dateInput.nanoseconds || 0;
          return new Date(seconds * 1000 + nanoseconds / 1000000);
        }
        // Si tiene toDate (es un Timestamp de Firestore)
        if (typeof dateInput.toDate === 'function') {
          return dateInput.toDate();
        }
      }
      
      // Si es una fecha ISO string
      if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Si ya es un objeto Date
      if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
        return dateInput;
      }
      
      // Si es un timestamp numérico
      if (typeof dateInput === 'number' && !isNaN(dateInput)) {
        return new Date(dateInput);
      }
      
      console.warn('⚠️ [VACCINES] No se pudo parsear fecha:', dateInput);
      return null;
    } catch (error) {
      console.error('❌ [VACCINES] Error parseando fecha:', dateInput, error);
      return null;
    }
  };

  const formatDate = (dateInput: any) => {
    const date = parseDate(dateInput);
    
    if (!date) {
      console.warn('⚠️ [VACCINES] formatDate recibió fecha nula o inválida:', dateInput);
      return 'Sin fecha';
    }
    
    try {
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      console.error('❌ [VACCINES] Error formateando fecha:', error);
      return 'Error en fecha';
    }
  };

  // Formatear Date a DD/MM/YYYY
  const dateToString = (date: Date): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convertir DD/MM/YYYY a Date
  const stringToDate = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length < 8) return null;
    
    // Remover cualquier carácter que no sea número o /
    const cleaned = dateStr.replace(/[^\d/]/g, '');
    const parts = cleaned.split('/');
    
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Los meses en JS son 0-indexed
    const year = parseInt(parts[2], 10);
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1900 || year > 2100) return null;
    
    const date = new Date(year, month, day);
    
    // Verificar que la fecha sea válida
    if (isNaN(date.getTime())) return null;
    
    return date;
  };

  // Formatear mientras el usuario escribe
  const formatDateInput = (text: string): string => {
    // Remover todo lo que no sea número
    const numbers = text.replace(/\D/g, '');
    
    if (numbers.length === 0) return '';
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
  };

  // Obtener meses únicos del calendario de vacunación
  const getVaccineMonths = () => {
    const monthsSet = new Set<number>();
    
    // Siempre agregar todos los meses del calendario de vacunación
    vaccineScheduleItems.forEach((item) => {
      if (item.ageMonths !== undefined) {
        monthsSet.add(item.ageMonths);
      }
    });

    return Array.from(monthsSet).sort((a, b) => a - b);
  };

  const getMonthLabel = (months: number) => {
    if (months === 0) return 'Nacimiento';
    if (months === 1) return '1 mes';
    if (months < 12) return `${months} meses`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) {
      return years === 1 ? '1 año' : `${years} años`;
    }
    return `${years}a ${remainingMonths}m`;
  };

  const getVaccinesForMonth = (month: number | null) => {
    // Si no hay mes seleccionado, mostrar todas las vacunas registradas
    if (month === null) {
      console.log('📋 [FILTER] Mostrando todas las vacunas:', vaccines.length);
      return vaccines;
    }
    
    console.log('📋 [FILTER] Filtrando por mes:', month);
    
    // Si no hay calendario asignado, filtrar por fecha calculada
    if (vaccineScheduleItems.length === 0) {
      if (!selectedChild?.birthDate) return [];
      
      return vaccines.filter((vaccine) => {
        const date = vaccine.appliedDate || vaccine.scheduledDate;
        if (!date) return false;
        
        const birthDate = parseDate(selectedChild.birthDate!);
        const vaccineDate = parseDate(date);
        
        if (!birthDate || isNaN(birthDate.getTime())) return false;
        if (!vaccineDate || isNaN(vaccineDate.getTime())) return false;
        
        const monthsDiff = Math.floor(
          (vaccineDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
        );
        
        return Math.abs(monthsDiff - month) <= 1;
      });
    }
    
    // Obtener las vacunas del calendario para este mes
    const scheduleVaccinesForMonth = vaccineScheduleItems.filter(
      (item) => item.ageMonths === month
    );

    // Crear un mapa de vacunas registradas por nombre
    const registeredVaccinesByName = new Map<string, any[]>();
    vaccines.forEach((v) => {
      const key = v.name.toLowerCase();
      if (!registeredVaccinesByName.has(key)) {
        registeredVaccinesByName.set(key, []);
      }
      registeredVaccinesByName.get(key)!.push(v);
    });

    // Crear una lista de vacunas a mostrar
    const result: any[] = [];
    const usedVaccineIds = new Set<string>();

    scheduleVaccinesForMonth.forEach((scheduleItem) => {
      const vaccineName = scheduleItem.name.toLowerCase();
      const registeredVaccines = registeredVaccinesByName.get(vaccineName) || [];
      
      // Buscar una vacuna registrada que coincida con este mes
      let matchedVaccine = null;
      
      // Buscar una vacuna registrada que coincida con este ítem del calendario
      // La coincidencia es por NOMBRE y FECHA PROGRAMADA (scheduledDate)
      // La vacuna aparece en la burbuja según cuándo DEBÍA aplicarse (scheduledDate), no cuándo se aplicó
      if (selectedChild?.birthDate && registeredVaccines.length > 0) {
        const targetMonth = month;
        
        console.log(`🔍 [MATCH] Buscando "${scheduleItem.name}" para mes ${targetMonth} (calendario)`);
        console.log(`🔍 [MATCH] Vacunas registradas con este nombre:`, registeredVaccines.length);
        
        matchedVaccine = registeredVaccines.find((v) => {
          // Si ya fue usada para otra entrada del calendario, saltar
          if (usedVaccineIds.has(v.id)) {
            console.log(`   ⏭️ [MATCH] Vacuna ${v.id} ya usada, saltando`);
            return false;
          }
          
          // Usar la fecha PROGRAMADA (scheduledDate) para determinar a qué mes pertenece
          const scheduledDate = v.scheduledDate;
          if (!scheduledDate) {
            console.log(`   ❌ [MATCH] Vacuna ${v.id} sin scheduledDate`);
            return false;
          }
          
          const birthDate = parseDate(selectedChild.birthDate!);
          const vaccineDate = parseDate(scheduledDate);
          
          if (!vaccineDate || isNaN(vaccineDate.getTime())) {
            console.log(`   ❌ [MATCH] Fecha programada inválida para vacuna ${v.id}:`, scheduledDate);
            return false;
          }
          
          if (!birthDate || isNaN(birthDate.getTime())) {
            console.log(`   ❌ [MATCH] Fecha de nacimiento inválida:`, selectedChild.birthDate);
            return false;
          }
          
          const monthsDiff = Math.round(
            (vaccineDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          );
          
          // Considerar que es la misma dosis si la fecha programada está dentro de ±1 mes
          const isMatch = Math.abs(monthsDiff - targetMonth) <= 1;
          console.log(`   ${isMatch ? '✅' : '❌'} [MATCH] ${v.name} (${v.status}): mes calculado=${monthsDiff}, target=${targetMonth} - ${isMatch ? 'COINCIDE' : 'NO COINCIDE'}`);
          return isMatch;
        });
        
        if (matchedVaccine) {
          console.log(`✅ [MATCH] Encontrada vacuna registrada: ${matchedVaccine.name} (${matchedVaccine.id})`);
        } else {
          console.log(`⚠️ [MATCH] No se encontró vacuna registrada, creando pendiente`);
        }
      }

      if (matchedVaccine) {
        // Si esta dosis ya está registrada, mostrarla
        usedVaccineIds.add(matchedVaccine.id);
        result.push(matchedVaccine);
      } else {
        // Si esta dosis no está registrada, crear una entrada "pendiente"
        const dosisInfo = scheduleItem.notes ? ` - ${scheduleItem.notes}` : '';
        result.push({
          id: `schedule-${scheduleItem.id || scheduleItem.name}-${month}`,
          name: scheduleItem.name,
          status: 'pending' as const,
          scheduledDate: null,
          appliedDate: null,
          notes: `Programada para ${getMonthLabel(month)}${dosisInfo}`,
          isFromSchedule: true,
          scheduleMonth: month,
        });
      }
    });

    console.log(`📋 [FILTER] Resultado para mes ${month}:`, result.length, 'vacunas');
    console.log('📋 [FILTER] Detalles:', result.map(v => `${v.name} (${v.status})`));
    return result;
  };

  const renderMonthBubbles = () => {
    const months = getVaccineMonths();
    
    if (months.length === 0) {
      return null;
    }

    return (
      <View style={styles.monthBubblesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthBubblesContent}
        >
          <TouchableOpacity
            style={[
              styles.monthBubble,
              selectedMonth === null && styles.monthBubbleActive,
            ]}
            onPress={() => {
              setSelectedMonth(null);
              analyticsService.logEvent('vaccine_filter_changed', {
                child_id: selectedChild?.id,
                filter: 'all',
              });
            }}
          >
            <Text
              style={[
                styles.monthBubbleText,
                selectedMonth === null && styles.monthBubbleTextActive,
              ]}
            >
              Todas
            </Text>
          </TouchableOpacity>

          {months.map((month) => {
            // Contar vacunas del calendario para este mes
            const scheduleVaccinesForMonth = vaccineScheduleItems.filter(
              (item) => item.ageMonths === month
            );
            
            // Contar cuántas vacunas ya están aplicadas según scheduledDate
            // Se cuentan por nombre + fecha programada corresponde al mes del calendario
            const appliedCount = scheduleVaccinesForMonth.filter((scheduleItem) => {
              if (!selectedChild?.birthDate) return false;
              
              const targetMonth = month;
              
              // Buscar una vacuna aplicada con este nombre Y scheduledDate en el mes correcto
              const hasApplied = vaccines.some((v) => {
                if (v.name.toLowerCase() !== scheduleItem.name.toLowerCase()) {
                  return false;
                }
                if (v.status !== 'applied') {
                  return false;
                }
                
                // Verificar que la fecha PROGRAMADA corresponda a este mes
                const scheduledDate = v.scheduledDate;
                if (!scheduledDate) return false;
                
                const birthDate = parseDate(selectedChild.birthDate!);
                const vaccineDate = parseDate(scheduledDate);
                
                if (!vaccineDate || isNaN(vaccineDate.getTime())) {
                  return false;
                }
                
                if (!birthDate || isNaN(birthDate.getTime())) {
                  return false;
                }
                
                const monthsDiff = Math.round(
                  (vaccineDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
                );
                
                // Es la misma dosis si scheduledDate está dentro de ±1 mes
                return Math.abs(monthsDiff - targetMonth) <= 1;
              });
              
              return hasApplied;
            }).length;
            
            console.log(`🔢 [BADGE] Mes ${month}: ${appliedCount}/${scheduleVaccinesForMonth.length} aplicadas`);

            return (
              <TouchableOpacity
                key={month}
                style={[
                  styles.monthBubble,
                  selectedMonth === month && styles.monthBubbleActive,
                ]}
                onPress={() => {
                  setSelectedMonth(month);
                  analyticsService.logEvent('vaccine_filter_changed', {
                    child_id: selectedChild?.id,
                    filter: `month_${month}`,
                    month: month,
                  });
                }}
              >
                <Text
                  style={[
                    styles.monthBubbleText,
                    selectedMonth === month && styles.monthBubbleTextActive,
                  ]}
                >
                  {getMonthLabel(month)}
                </Text>
                <View style={styles.vaccineBadge}>
                  <Text style={styles.vaccineBadgeText}>
                    {appliedCount}/{scheduleVaccinesForMonth.length}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderVaccineCard = (vaccine: any) => {
    const isFromSchedule = vaccine.isFromSchedule === true;
    
    const getStatusColor = () => {
      if (vaccine.status === 'applied') return '#10B981';
      if (vaccine.status === 'overdue') return '#EF4444';
      return '#F59E0B';
    };

    const getStatusText = () => {
      if (vaccine.status === 'applied') return 'Aplicada';
      if (vaccine.status === 'overdue') return 'Vencida';
      return 'Pendiente';
    };

    const getStatusIcon = () => {
      if (vaccine.status === 'applied') return 'checkmark-circle';
      if (vaccine.status === 'overdue') return 'alert-circle';
      return 'time';
    };

    const handleCardPress = () => {
      if (isFromSchedule) {
        // Es una vacuna del calendario que no está registrada, abrir modal para agregarla
        setVaccineNameInput(vaccine.name);
        
        // Calcular la fecha programada basándose en el mes del calendario
        let calculatedDate = '';
        if (selectedChild?.birthDate && typeof vaccine.scheduleMonth === 'number') {
          try {
            const birthDate = parseDate(selectedChild.birthDate);
            if (birthDate && !isNaN(birthDate.getTime())) {
              const scheduledDate = new Date(birthDate);
              scheduledDate.setMonth(scheduledDate.getMonth() + vaccine.scheduleMonth);
              
              // Verificar que la fecha es válida
              if (!isNaN(scheduledDate.getTime())) {
                calculatedDate = dateToString(scheduledDate);
              }
            }
          } catch (error) {
            console.error('Error calculando fecha programada:', error);
          }
        }
        
        setScheduledDateInput(calculatedDate);
        setAppliedDateInput('');
        setStatusInput('pending');
        setLocationInput('');
        setBatchInput('');
        setNotesInput(vaccine.notes || '');
        setEditingVaccine(null);
        setIsCustomVaccine(false);
        setShowAddModal(true);
      } else {
        // Es una vacuna ya registrada, abrir para editar
        openEditModal(vaccine);
      }
    };

    return (
      <TouchableOpacity 
        key={vaccine.id} 
        style={[
          styles.vaccineCard,
          isFromSchedule && styles.vaccineCardPending,
        ]}
        onPress={handleCardPress}
        activeOpacity={0.7}
      >
        <View style={styles.vaccineIconContainer}>
          <Ionicons name="shield-checkmark-outline" size={24} color={MUNPA_PRIMARY} />
        </View>
        <View style={styles.vaccineInfo}>
          <View style={styles.vaccineHeader}>
            <Text style={styles.vaccineName}>{vaccine.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
              <Ionicons name={getStatusIcon()} size={12} color={getStatusColor()} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          {/* Fecha programada */}
          {vaccine.scheduledDate && (
            <View style={styles.vaccineDetails}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.vaccineDate}>
                Programada: {formatDate(vaccine.scheduledDate)}
              </Text>
            </View>
          )}

          {/* Fecha de aplicación */}
          {vaccine.appliedDate && (
            <View style={styles.vaccineDetails}>
              <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" />
              <Text style={[styles.vaccineDate, { color: '#10B981' }]}>
                Aplicada: {formatDate(vaccine.appliedDate)}
              </Text>
            </View>
          )}

          {/* Ubicación */}
          {vaccine.location && (
            <View style={styles.vaccineDetails}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.vaccineDate}>{vaccine.location}</Text>
            </View>
          )}

          {/* Lote */}
          {vaccine.batch && (
            <Text style={styles.vaccineBatch}>Lote: {vaccine.batch}</Text>
          )}

          {/* Notas */}
          {vaccine.notes && (
            <Text style={styles.vaccineNotes}>{vaccine.notes}</Text>
          )}
          
          {/* Indicador si es del calendario */}
          {isFromSchedule && (
            <View style={styles.addVaccineIndicator}>
              <Ionicons name="add-circle-outline" size={16} color={MUNPA_PRIMARY} />
              <Text style={styles.addVaccineText}>Toca para registrar</Text>
            </View>
          )}
        </View>
        {!isFromSchedule && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteVaccine(vaccine);
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  if (loadingChild) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.contentWrapper}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header interno */}
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Vacunas</Text>
                <Text style={styles.headerSubtitle}>
                  Seguimiento de vacunas de {selectedChild?.name || 'tu bebé'}
                </Text>
                {selectedChild?.vaccinationCountryId && countries.length > 0 && (
                  <View style={styles.calendarBadge}>
                    <Ionicons name="globe-outline" size={12} color="#6B7280" />
                    <Text style={styles.calendarBadgeText}>
                      {countries.find(c => c.id === selectedChild.vaccinationCountryId)?.name || 'Calendario asignado'}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={async () => {
                  if (vaccines.length > 0) {
                    Alert.alert(
                      'No se puede cambiar el calendario',
                      'Ya tienes vacunas registradas. No es posible cambiar el calendario de vacunación una vez que has comenzado a registrar vacunas.',
                      [{ text: 'Entendido', style: 'default' }]
                    );
                    return;
                  }
                  await loadCountries();
                  setShowCountryModal(true);
                }}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="settings-outline" 
                  size={20} 
                  color={vaccines.length > 0 ? '#D1D5DB' : '#9CA3AF'} 
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
              </View>
            ) : vaccines.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="shield-checkmark-outline" size={48} color={MUNPA_PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>No hay vacunas registradas</Text>
                <Text style={styles.emptyMessage}>
                  Agrega las vacunas de {selectedChild?.name || 'tu bebé'} para llevar un control
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={openAddModal}>
                  <Text style={styles.primaryButtonText}>Agregar primera vacuna</Text>
                </TouchableOpacity>
              </View>
              ) : (
                <View style={styles.vaccinesListContainer}>
                  <BannerCarousel section="vacunas" bannerHeight={180} style={{ marginLeft: -15, marginTop: -10 }} />
                  <Text style={styles.sectionTitle}>Historial de vacunas</Text>
                  {renderMonthBubbles()}
                {getVaccinesForMonth(selectedMonth).length === 0 ? (
                  <View style={styles.emptyFilterState}>
                    <Ionicons name="calendar-outline" size={32} color="#9CA3AF" />
                    <Text style={styles.emptyFilterText}>
                      No hay vacunas programadas para este período
                    </Text>
                  </View>
                ) : (
                  getVaccinesForMonth(selectedMonth).map((vaccine) => renderVaccineCard(vaccine))
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Botón flotante */}
      {vaccines.length > 0 && (
        <TouchableOpacity 
          style={[styles.fab, { bottom: 30 + insets.bottom }]} 
          onPress={openAddModal}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Modal para agregar vacuna */}
      <Modal 
        visible={showAddModal} 
        transparent 
        animationType="slide" 
        onRequestClose={() => {
          setShowAddModal(false);
          setIsCustomVaccine(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCard}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => {
                  setShowAddModal(false);
                  setEditingVaccine(null);
                  setIsCustomVaccine(false);
                }}>
                  <Ionicons name="close" size={24} color="#2D3748" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingVaccine ? 'Editar vacuna' : 'Registrar vacuna'}
                </Text>
                <View style={{ width: 24 }} />
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Nombre de la vacuna *</Text>
                  {isCustomVaccine ? (
                    // Vacuna personalizada - editable
                    <TextInput
                      style={styles.modalInput}
                      value={vaccineNameInput}
                      onChangeText={setVaccineNameInput}
                      placeholder="Ej: BCG, Hepatitis B, Pentavalente"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="words"
                    />
                  ) : (
                    // Nombre pre-rellenado del calendario o editando - solo lectura
                    <View style={[styles.modalInput, styles.modalInputDisabled]}>
                      <Text style={styles.modalInputText}>
                        {vaccineNameInput || 'Nombre de la vacuna'}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Estado *</Text>
                  <View style={styles.statusSelector}>
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        statusInput === 'applied' && styles.statusOptionActive,
                      ]}
                      onPress={() => {
                        setStatusInput('applied');
                        // Si no hay fecha de aplicación, inicializarla con la fecha programada o hoy
                        if (!appliedDateInput) {
                          setAppliedDateInput(scheduledDateInput || dateToString(new Date()));
                        }
                      }}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={statusInput === 'applied' ? '#10B981' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          statusInput === 'applied' && styles.statusOptionTextActive,
                        ]}
                      >
                        Aplicada
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusOption,
                        statusInput === 'pending' && styles.statusOptionActive,
                      ]}
                      onPress={() => setStatusInput('pending')}
                    >
                      <Ionicons
                        name="time"
                        size={20}
                        color={statusInput === 'pending' ? '#F59E0B' : '#9CA3AF'}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          statusInput === 'pending' && styles.statusOptionTextActive,
                        ]}
                      >
                        Pendiente
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {statusInput === 'applied' && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalLabel}>Fecha de aplicación * (DD/MM/YYYY)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={appliedDateInput}
                      onChangeText={(text) => setAppliedDateInput(formatDateInput(text))}
                      placeholder="15/02/2027"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Fecha programada (opcional, DD/MM/YYYY)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={scheduledDateInput}
                    onChangeText={(text) => setScheduledDateInput(formatDateInput(text))}
                    placeholder="15/02/2027"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Lugar de aplicación (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={locationInput}
                    onChangeText={setLocationInput}
                    placeholder="Ej: Centro de salud, Clínica..."
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Lote (opcional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={batchInput}
                    onChangeText={setBatchInput}
                    placeholder="Ej: Lote-123"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalNotes]}
                    value={notesInput}
                    onChangeText={setNotesInput}
                    placeholder="Ej: Reacción, efectos secundarios..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={3}
                  />
                </View>


              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.modalSaveFull} onPress={handleSaveVaccine}>
                  <Text style={styles.modalSaveText}>Guardar vacuna</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </View>

        </View>
      </Modal>


      {/* Modal para seleccionar vacuna del calendario */}
      <Modal
        visible={showVaccineListModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVaccineListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vaccineListModalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowVaccineListModal(false)}>
                <Ionicons name="close" size={24} color="#2D3748" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Selecciona una vacuna</Text>
              <View style={{ width: 24 }} />
            </View>

            {loadingSchedule ? (
              <View style={styles.countryLoadingContainer}>
                <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
                <Text style={styles.countryLoadingText}>Cargando vacunas...</Text>
              </View>
            ) : (
              <>
                <ScrollView 
                  style={styles.vaccineListScroll} 
                  showsVerticalScrollIndicator={false}
                >
                  {vaccineScheduleItems.map((item, index) => (
                    <TouchableOpacity
                      key={item.id || index}
                      style={styles.vaccineListItem}
                      onPress={() => {
                        // Pre-rellenar datos del calendario
                        setIsCustomVaccine(false);
                        setVaccineNameInput(item.name);
                        
                        // Calcular fecha programada basada en edad del bebé
                        let scheduledDate = new Date();
                        let shouldBeApplied = false;
                        
                        if (selectedChild?.birthDate && (item.ageMonths !== undefined || item.ageWeeks !== undefined)) {
                          const birthDate = parseDate(selectedChild.birthDate);
                          if (birthDate && !isNaN(birthDate.getTime())) {
                            scheduledDate = new Date(birthDate);
                            
                            if (item.ageMonths !== undefined) {
                              scheduledDate.setMonth(birthDate.getMonth() + item.ageMonths);
                            } else if (item.ageWeeks !== undefined) {
                              scheduledDate.setDate(birthDate.getDate() + (item.ageWeeks * 7));
                            }
                          }
                          
                          // Si la fecha programada es anterior a hoy, marcar como aplicada
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          scheduledDate.setHours(0, 0, 0, 0);
                          
                          if (scheduledDate < today) {
                            shouldBeApplied = true;
                          }
                        }
                        
                        setScheduledDateInput(dateToString(scheduledDate));
                        
                        if (shouldBeApplied) {
                          setStatusInput('applied');
                          setAppliedDateInput(dateToString(scheduledDate));
                        } else {
                          setStatusInput('pending');
                          setAppliedDateInput('');
                        }
                        
                        setNotesInput(item.notes || '');
                        setLocationInput('');
                        setBatchInput('');
                        
                        // Cerrar modal de lista y abrir modal de agregar
                        setShowVaccineListModal(false);
                        setTimeout(() => setShowAddModal(true), 100);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.vaccineListItemIcon}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={MUNPA_PRIMARY} />
                      </View>
                      <View style={styles.vaccineListItemInfo}>
                        <Text style={styles.vaccineListItemName}>{item.name}</Text>
                        {item.notes && (
                          <Text style={styles.vaccineListItemNotes}>{item.notes}</Text>
                        )}
                        {(item.ageMonths !== undefined || item.ageWeeks !== undefined) && (
                          <Text style={styles.vaccineListItemAge}>
                            {item.ageMonths !== undefined 
                              ? `A los ${item.ageMonths} ${item.ageMonths === 1 ? 'mes' : 'meses'}`
                              : `A las ${item.ageWeeks} ${item.ageWeeks === 1 ? 'semana' : 'semanas'}`
                            }
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Opción para agregar vacuna personalizada */}
                <TouchableOpacity
                  style={styles.customVaccineButton}
                  onPress={() => {
                    // Limpiar el nombre para que sea editable
                    setIsCustomVaccine(true);
                    setVaccineNameInput('');
                    setShowVaccineListModal(false);
                    setTimeout(() => setShowAddModal(true), 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle-outline" size={20} color={MUNPA_PURPLE} />
                  <Text style={styles.customVaccineButtonText}>
                    Agregar vacuna personalizada
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para seleccionar país de calendario */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <View style={styles.countryModalOverlay}>
          <View style={styles.countryModalContainer}>
            <View style={styles.countryModalHeader}>
              <Text style={styles.countryModalTitle}>Calendario de Vacunación</Text>
              <Text style={styles.countryModalSubtitle}>
                Selecciona el país para cargar el calendario oficial de vacunas
              </Text>
            </View>

            {loadingChild || loading ? (
              <View style={styles.countryLoadingContainer}>
                <ActivityIndicator size="large" color={MUNPA_PRIMARY} />
                <Text style={styles.countryLoadingText}>Cargando países...</Text>
              </View>
            ) : countries.length === 0 ? (
              <View style={styles.countryEmptyContainer}>
                <Ionicons name="globe-outline" size={48} color="#9CA3AF" />
                <Text style={styles.countryEmptyText}>
                  No hay calendarios de vacunación disponibles en este momento
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
                {countries.map((country) => (
                  <TouchableOpacity
                    key={country.id}
                    style={styles.countryItem}
                    onPress={() => handleAssignSchedule(country.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.countryName}>{country.name}</Text>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.countryModalClose}
              onPress={() => {
                setShowCountryModal(false);
                if (needsVaccinationCountry) {
                  navigation.goBack();
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.countryModalCloseText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#96d2d3',
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  calendarBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: MUNPA_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  vaccinesListContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  vaccineCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vaccineCardPending: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  vaccineIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0F2F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vaccineInfo: {
    flex: 1,
  },
  vaccineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vaccineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  vaccineDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vaccineDate: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  nextDoseText: {
    fontSize: 13,
    color: '#F59E0B',
    marginLeft: 6,
    fontWeight: '600',
  },
  vaccineNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  vaccineBatch: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MUNPA_PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalCard: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  modalInputDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  modalInputText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalNotes: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalRowLabel: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  modalRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalRowValueText: {
    fontSize: 15,
    color: '#6B7280',
    marginRight: 4,
  },
  clearButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  modalSaveFull: {
    backgroundColor: MUNPA_PRIMARY,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: MUNPA_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  statusOptionActive: {
    borderColor: MUNPA_PRIMARY,
    backgroundColor: '#E0F2F1',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  statusOptionTextActive: {
    color: '#1F2937',
  },
  countryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countryModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    alignSelf: 'center',
  },
  countryModalHeader: {
    marginBottom: 20,
  },
  countryModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  countryModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  countryList: {
    maxHeight: 300,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countryName: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  countryModalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  countryModalCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  countryLoadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  countryEmptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countryEmptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  vaccineListModalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    width: '100%',
  },
  vaccineListScroll: {
    maxHeight: '70%',
  },
  vaccineListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  vaccineListItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${MUNPA_PRIMARY}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vaccineListItemInfo: {
    flex: 1,
  },
  vaccineListItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  vaccineListItemNotes: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  vaccineListItemAge: {
    fontSize: 12,
    color: MUNPA_PURPLE,
    fontWeight: '500',
  },
  customVaccineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    backgroundColor: `${MUNPA_PURPLE}15`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${MUNPA_PURPLE}40`,
  },
  customVaccineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: MUNPA_PURPLE,
    marginLeft: 8,
  },
  monthBubblesContainer: {
    marginVertical: 16,
  },
  monthBubblesContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  monthBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  monthBubbleActive: {
    backgroundColor: MUNPA_PRIMARY,
    borderColor: MUNPA_PRIMARY,
  },
  monthBubbleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthBubbleTextActive: {
    color: '#FFFFFF',
  },
  vaccineBadge: {
    marginLeft: 8,
    backgroundColor: MUNPA_PURPLE,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  vaccineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyFilterState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyFilterText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  addVaccineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  addVaccineText: {
    fontSize: 13,
    color: MUNPA_PRIMARY,
    fontWeight: '500',
  },
});

export default VaccineTrackerScreen;
