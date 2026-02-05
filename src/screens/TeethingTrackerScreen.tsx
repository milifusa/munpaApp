import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import teethingService, { ToothEvent, ToothState, TeethingSummaryResponse } from '../services/teething-service';
import analyticsService from '../services/analyticsService';
import { childrenService } from '../services/api';
import BannerCarousel from '../components/BannerCarousel';

// Tipos de dientes
type ToothType = 'incisor1' | 'incisor2' | 'canino' | 'premolar' | 'muela';
type ToothPosition = 
  | 'upper-central-incisor-left' | 'upper-central-incisor-right'
  | 'upper-lateral-incisor-left' | 'upper-lateral-incisor-right'
  | 'upper-canine-left' | 'upper-canine-right'
  | 'upper-first-molar-left' | 'upper-first-molar-right'
  | 'upper-second-molar-left' | 'upper-second-molar-right'
  | 'lower-central-incisor-left' | 'lower-central-incisor-right'
  | 'lower-lateral-incisor-left' | 'lower-lateral-incisor-right'
  | 'lower-canine-left' | 'lower-canine-right'
  | 'lower-first-molar-left' | 'lower-first-molar-right'
  | 'lower-second-molar-left' | 'lower-second-molar-right';

interface Tooth {
  id: ToothPosition;
  type: ToothType;
  position: 'upper' | 'lower';
  side: 'left' | 'right';
  hasErupted: boolean;
  hasShed: boolean;
  eruptionDate?: string;
  shedDate?: string;
}

const SYMPTOMS_OPTIONS = [
  { id: 'tooth_ache', label: 'Dolor de diente' },
  { id: 'drooling', label: 'Babeo excesivo' },
  { id: 'irritability', label: 'Irritabilidad' },
  { id: 'sleep_issues', label: 'Problemas para dormir' },
  { id: 'gum_swelling', label: 'Encías hinchadas' },
  { id: 'loss_of_appetite', label: 'Pérdida de apetito' },
  { id: 'fever', label: 'Fiebre leve' },
];

const TeethingTrackerScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [selectedChild, setSelectedChild] = useState<any>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [teeth, setTeeth] = useState<Tooth[]>([]);
  const [timeline, setTimeline] = useState<ToothEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [ageMonths, setAgeMonths] = useState(0);
  
  // Modal para agregar/editar evento
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<Tooth | null>(null);
  const [eventType, setEventType] = useState<'erupt' | 'shed'>('erupt');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [mouthDimensions, setMouthDimensions] = useState({ width: 0, height: 0 });
  const [eventDate, setEventDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Cargar niño seleccionado
  useEffect(() => {
    loadSelectedChild();
  }, []);

  const loadSelectedChild = async () => {
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
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect = null;
        if (savedChildId) {
          childToSelect = data.find((c: any) => c.id === savedChildId) || null;
        }
        if (!childToSelect && data.length > 0) {
          childToSelect = data[0];
          await AsyncStorage.setItem('selectedChildId', childToSelect.id);
        }
        console.log('🦷 [TEETHING] Child cargado:', childToSelect?.name, childToSelect?.id);
        setSelectedChild(childToSelect);
      }
    } catch (error) {
      console.error('🦷 [TEETHING] Error cargando child:', error);
    } finally {
      setLoadingChild(false);
    }
  };

  useEffect(() => {
    console.log('🦷 [TEETHING] useEffect - selectedChild:', selectedChild?.id);
    if (selectedChild?.id) {
      loadTeethingData();
      analyticsService.logEvent('teething_tracker_viewed', {
        childId: selectedChild.id,
      });
    } else {
      console.log('🦷 [TEETHING] No hay selectedChild, inicializando con datos vacíos');
      setTeeth(initializeTeethStructure());
      setAgeMonths(0);
      setLoading(false);
    }
  }, [selectedChild?.id]);

  const loadTeethingData = async () => {
    if (!selectedChild?.id) {
      console.log('🦷 [TEETHING] loadTeethingData - No hay childId');
      setLoading(false);
      return;
    }
    
    console.log('🦷 [TEETHING] Cargando datos para child:', selectedChild.id);
    
    try {
      setLoading(true);
      const summary = await teethingService.getSummary(selectedChild.id);
      
      console.log('🦷 [TEETHING] Datos recibidos:', summary);
      console.log('🦷 [TEETHING] Teeth completo:', JSON.stringify(summary.data.teeth, null, 2));
      console.log('🦷 [TEETHING] Timeline completo:', JSON.stringify(summary.data.timeline, null, 2));
      
      // Extraer data del wrapper
      const teethingData = summary.data;
      
      setAgeMonths(teethingData.ageMonths);
      setTimeline(teethingData.timeline || []);
      
      // Inicializar dientes con estado del backend
      const initialTeeth = initializeTeethStructure();
      const timelineEvents = teethingData.timeline || [];
      
      const teethWithState = initialTeeth.map(tooth => {
        const backendTooth: ToothState | undefined = teethingData.teeth?.find((t: ToothState) => t.id === tooth.id);
        
        // Buscar eventos en el timeline para este diente (puede usar IDs antiguos)
        const toothEvents = timelineEvents.filter((event: ToothEvent) => {
          // Mapear IDs antiguos a nuevos
          const normalizedEventToothId = event.toothId
            .replace('incisor1', 'central-incisor')
            .replace('incisor2', 'lateral-incisor');
          
          return normalizedEventToothId === tooth.id || event.toothId === tooth.id;
        });
        
        // Encontrar el evento más reciente
        const latestEvent = toothEvents.sort((a, b) => 
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
        )[0];
        
        if (backendTooth) {
          console.log(`🦷 [TEETHING] Diente ${tooth.id} encontrado en backend:`, backendTooth);
        }
        
        if (latestEvent) {
          console.log(`🦷 [TEETHING] Diente ${tooth.id} tiene evento en timeline:`, latestEvent);
        }
        
        // Priorizar datos del timeline sobre el backend
        const hasErupted = latestEvent?.type === 'erupt' || 
                          backendTooth?.status === 'erupted' || 
                          backendTooth?.lastEvent?.type === 'erupt';
        
        const hasShed = latestEvent?.type === 'shed' || 
                       backendTooth?.status === 'shed' || 
                       backendTooth?.lastEvent?.type === 'shed';
        
        const eruptionDate = latestEvent?.type === 'erupt' 
          ? latestEvent.occurredAt 
          : (backendTooth?.lastEvent?.type === 'erupt' ? backendTooth.lastEvent.occurredAt : undefined);
        
        const shedDate = latestEvent?.type === 'shed' 
          ? latestEvent.occurredAt 
          : (backendTooth?.lastEvent?.type === 'shed' ? backendTooth.lastEvent.occurredAt : undefined);
        
        return {
          ...tooth,
          hasErupted,
          hasShed,
          eruptionDate,
          shedDate,
        };
      });
      
      console.log('🦷 [TEETHING] Dientes con estado aplicado:', teethWithState.filter(t => t.hasErupted).length, 'erupcionados');
      setTeeth(teethWithState);
      console.log('🦷 [TEETHING] Dientes inicializados:', teethWithState.length);
    } catch (error: any) {
      console.error('🦷 [TEETHING] Error cargando datos:', error);
      console.error('🦷 [TEETHING] Error response:', error.response);
      console.error('🦷 [TEETHING] Error status:', error.response?.status);
      
      // Si el error es 404, inicializar con datos vacíos
      if (error.response?.status === 404) {
        console.log('🦷 [TEETHING] 404 - Inicializando con datos vacíos');
        setTeeth(initializeTeethStructure());
        setTimeline([]);
        setAgeMonths(calculateAgeInMonths());
      } else {
        console.log('🦷 [TEETHING] Error diferente a 404, mostrando alerta e inicializando');
        // Inicializar con datos vacíos de todas formas
        setTeeth(initializeTeethStructure());
        setTimeline([]);
        setAgeMonths(calculateAgeInMonths());
        Alert.alert('Error', 'No se pudieron cargar los datos de dentición. Se mostrarán datos vacíos.');
      }
    } finally {
      setLoading(false);
    }
  };

  const calculateAgeInMonths = () => {
    if (!selectedChild?.birthDate) return 0;
    const birth = new Date(selectedChild.birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                   (now.getMonth() - birth.getMonth());
    return Math.max(0, months);
  };

  const initializeTeethStructure = (): Tooth[] => {
    return [
      // Upper teeth (10) - usando IDs del backend
      { id: 'upper-central-incisor-left', type: 'incisor1', position: 'upper', side: 'left', hasErupted: false, hasShed: false },
      { id: 'upper-central-incisor-right', type: 'incisor1', position: 'upper', side: 'right', hasErupted: false, hasShed: false },
      { id: 'upper-lateral-incisor-left', type: 'incisor2', position: 'upper', side: 'left', hasErupted: false, hasShed: false },
      { id: 'upper-lateral-incisor-right', type: 'incisor2', position: 'upper', side: 'right', hasErupted: false, hasShed: false },
      { id: 'upper-canine-left', type: 'canino', position: 'upper', side: 'left', hasErupted: false, hasShed: false },
      { id: 'upper-canine-right', type: 'canino', position: 'upper', side: 'right', hasErupted: false, hasShed: false },
      { id: 'upper-first-molar-left', type: 'premolar', position: 'upper', side: 'left', hasErupted: false, hasShed: false },
      { id: 'upper-first-molar-right', type: 'premolar', position: 'upper', side: 'right', hasErupted: false, hasShed: false },
      { id: 'upper-second-molar-left', type: 'muela', position: 'upper', side: 'left', hasErupted: false, hasShed: false },
      { id: 'upper-second-molar-right', type: 'muela', position: 'upper', side: 'right', hasErupted: false, hasShed: false },
      
      // Lower teeth (10) - usando IDs del backend
      { id: 'lower-central-incisor-left', type: 'incisor1', position: 'lower', side: 'left', hasErupted: false, hasShed: false },
      { id: 'lower-central-incisor-right', type: 'incisor1', position: 'lower', side: 'right', hasErupted: false, hasShed: false },
      { id: 'lower-lateral-incisor-left', type: 'incisor2', position: 'lower', side: 'left', hasErupted: false, hasShed: false },
      { id: 'lower-lateral-incisor-right', type: 'incisor2', position: 'lower', side: 'right', hasErupted: false, hasShed: false },
      { id: 'lower-canine-left', type: 'canino', position: 'lower', side: 'left', hasErupted: false, hasShed: false },
      { id: 'lower-canine-right', type: 'canino', position: 'lower', side: 'right', hasErupted: false, hasShed: false },
      { id: 'lower-first-molar-left', type: 'premolar', position: 'lower', side: 'left', hasErupted: false, hasShed: false },
      { id: 'lower-first-molar-right', type: 'premolar', position: 'lower', side: 'right', hasErupted: false, hasShed: false },
      { id: 'lower-second-molar-left', type: 'muela', position: 'lower', side: 'left', hasErupted: false, hasShed: false },
      { id: 'lower-second-molar-right', type: 'muela', position: 'lower', side: 'right', hasErupted: false, hasShed: false },
    ];
  };

  const handleToothPress = (tooth: Tooth) => {
    // Si el diente se cayó, permitir registrar erupción del diente permanente
    if (tooth.hasShed) {
      Alert.alert(
        'Diente permanente',
        '¿Ya salió el diente permanente en este espacio?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, registrar', 
            style: 'default',
            onPress: () => {
              setSelectedTooth(tooth);
              // Resetear estado para el diente permanente
              setTeeth(prevTeeth => 
                prevTeeth.map(t => 
                  t.id === tooth.id ? { ...t, hasErupted: true, hasShed: false } : t
                )
              );
              setEventType('erupt');
              setSelectedSymptoms([]);
              setNotes('');
              setEventDate(new Date());
              setShowEventModal(true);
            }
          }
        ]
      );
      return;
    }
    
    // Si ya erupcionó, abrir modal para marcar caída
    if (tooth.hasErupted) {
      setSelectedTooth(tooth);
      setEventType('shed');
      setSelectedSymptoms([]);
      setNotes('');
      setEventDate(new Date());
      setShowEventModal(true);
      return;
    }
    
    // Si no ha erupcionado, permitir marcar erupción
    setSelectedTooth(tooth);
    // Marcar el diente como erupcionado inmediatamente (actualización optimista)
    setTeeth(prevTeeth => 
      prevTeeth.map(t => 
        t.id === tooth.id ? { ...t, hasErupted: true } : t
      )
    );
    setEventType('erupt');
    setSelectedSymptoms([]);
    setNotes('');
    setEventDate(new Date());
    setShowEventModal(true);
  };

  const handleCancelEvent = () => {
    // Si estábamos agregando un nuevo diente (erupt), revertir el cambio optimista
    if (selectedTooth && eventType === 'erupt') {
      setTeeth(prevTeeth => 
        prevTeeth.map(t => {
          if (t.id === selectedTooth.id) {
            // Si no tiene fecha de erupción registrada, es un nuevo diente
            if (!t.eruptionDate) {
              return { ...t, hasErupted: false };
            }
            // Si tenía fecha de caída (shed), restaurar ese estado
            if (t.shedDate) {
              return { ...t, hasErupted: false, hasShed: true };
            }
          }
          return t;
        })
      );
    }
    setShowEventModal(false);
    setSelectedTooth(null);
  };

  const handleSaveEvent = async () => {
    if (!selectedChild?.id || !selectedTooth) return;
    
    try {
      setSaving(true);
      
      const payload = {
        toothId: selectedTooth.id,
        type: eventType,
        occurredAt: eventDate.toISOString(),
        symptoms: selectedSymptoms.length > 0 ? selectedSymptoms : undefined,
        notes: notes.trim() || undefined,
      };
      
      const createdEvent = await teethingService.createEvent(selectedChild.id, payload);
      
      analyticsService.logEvent('teething_event_created', {
        childId: selectedChild.id,
        toothId: selectedTooth.id,
        type: eventType,
        ageMonths,
      });
      
      // Recargar datos completos del backend
      await loadTeethingData();
      
      // Si es caída y >= 48 meses, mostrar mensaje del Ratón Pérez
      if (eventType === 'shed') {
        Alert.alert(
          '🦷 ¡El Ratón Pérez viene en camino!',
          'Se ha guardado este evento especial. ¡No olvides poner el diente bajo la almohada!',
          [{ text: 'Entendido', style: 'default' }]
        );
      }
      
      setShowEventModal(false);
      setSelectedTooth(null);
    } catch (error) {
      console.error('Error guardando evento:', error);
      Alert.alert('Error', 'No se pudo guardar el evento');
      
      // Revertir el cambio optimista si hay error
      if (selectedTooth && eventType === 'erupt') {
        setTeeth(prevTeeth => 
          prevTeeth.map(t => 
            t.id === selectedTooth.id 
              ? { ...t, hasErupted: false } 
              : t
          )
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleSymptom = (symptomId: string) => {
    setSelectedSymptoms(prev => 
      prev.includes(symptomId)
        ? prev.filter(s => s !== symptomId)
        : [...prev, symptomId]
    );
  };

  const getToothImage = (tooth: Tooth): any | 'shed' | null => {
    // Si se cayó, devolver 'shed' para mostrar una X
    if (tooth.hasShed) {
      return 'shed';
    }
    
    // Si NO ha erupcionado, no mostrar imagen
    if (!tooth.hasErupted) {
      return null;
    }
    
    // Mostrar diente BLANCO cuando ha erupcionado
    switch (tooth.type) {
      case 'incisor1':
        return require('../../assets/incisivo1-blanco.png');
      case 'incisor2':
        return require('../../assets/incisivo2-blanco.png');
      case 'canino':
        return require('../../assets/canino-blanco.png');
      case 'premolar':
        return require('../../assets/premolar-blanco.png');
      case 'muela':
        return require('../../assets/muelita-blanca.png');
    }
  };

  const getToothName = (tooth: Tooth) => {
    const typeNames: Record<string, string> = {
      'incisor1': 'Inc. Central',
      'incisor2': 'Inc. Lateral',
      'canino': 'Canino',
      'premolar': 'Premolar',
      'muela': 'Muela',
    };
    
    const side = tooth.id.includes('left') ? 'Izq.' : 'Der.';
    return `${typeNames[tooth.type]} ${side}`;
  };

  const getToothPositionStyle = (tooth: Tooth) => {
    if (!mouthDimensions.width || !mouthDimensions.height) {
      return { position: 'absolute' as const, opacity: 0 };
    }

    // Posiciones y tamaños específicos para cada diente
    const normalizedPositions: Record<ToothPosition, { top?: number; bottom?: number; left?: number; size: number }> = {
      // Dientes superiores - centrados en cada óvalo con tamaño específico
      'upper-second-molar-left': { top: 0.40, left: 0.20, size: 0.13 },
      'upper-first-molar-left': { top: 0.31, left: 0.23, size: 0.13},
      'upper-canine-left': { top: 0.24, left: 0.29, size: 0.13},
      'upper-lateral-incisor-left': { top: 0.18, left: 0.38, size: 0.13 },
      'upper-central-incisor-left': { top: 0.16, left: 0.47, size: 0.13 },
      
      'upper-central-incisor-right': { top: 0.16, left: 0.57, size: 0.13 },
      'upper-lateral-incisor-right': { top: 0.18, left: 0.66, size: 0.13 },
      'upper-canine-right': { top: 0.24, left: 0.74, size: 0.13 },
      'upper-first-molar-right': { top: 0.31, left: 0.81, size: 0.13 },
      'upper-second-molar-right': { top: 0.40, left: 0.84, size: 0.13 },
      
      // Dientes inferiores - centrados en cada óvalo con tamaño específico
      'lower-second-molar-left': { bottom: 0.40, left: 0.2, size: 0.13 },
      'lower-first-molar-left': { bottom: 0.31, left: 0.23, size: 0.13 },
      'lower-canine-left': { bottom: 0.22, left: 0.30, size: 0.13 },
      'lower-lateral-incisor-left': { bottom: 0.17, left: 0.38, size: 0.13 },
      'lower-central-incisor-left': { bottom: 0.15, left: 0.47, size: 0.13},
      
      'lower-central-incisor-right': { bottom: 0.15, left: 0.57, size: 0.13 },
      'lower-lateral-incisor-right': { bottom: 0.17, left: 0.66, size: 0.13 },
      'lower-canine-right': { bottom: 0.22, left: 0.74, size: 0.13 },
      'lower-first-molar-right': { bottom: 0.31, left: 0.80, size: 0.13 },
      'lower-second-molar-right': { bottom: 0.40, left: 0.84, size: 0.13 },
    };

    const pos = normalizedPositions[tooth.id];
    const toothSize = mouthDimensions.width * pos.size;
    const halfSize = toothSize / 2;
    
    return {
      position: 'absolute' as const,
      width: toothSize,
      height: toothSize,
      ...(pos.top !== undefined && { top: pos.top * mouthDimensions.height - halfSize }),
      ...(pos.bottom !== undefined && { bottom: pos.bottom * mouthDimensions.height - halfSize }),
      ...(pos.left !== undefined && { left: pos.left * mouthDimensions.width - halfSize }),
    };
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `hace ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    } else if (diffHours < 24) {
      return `hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    } else if (diffDays < 30) {
      return `hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;
    } else {
      return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }
  };

  const translateSymptom = (symptomId: string): string => {
    const symptomMap: Record<string, string> = {
      'tooth_ache': 'Dolor de diente',
      'drooling': 'Babeo excesivo',
      'irritability': 'Irritabilidad',
      'sleep_issues': 'Problemas para dormir',
      'gum_swelling': 'Encías hinchadas',
      'loss_of_appetite': 'Pérdida de apetito',
      'fever': 'Fiebre leve',
    };
    return symptomMap[symptomId] || symptomId;
  };

  const translateToothName = (toothName: string): string => {
    const translations: Record<string, string> = {
      'Central incisor': 'Incisivo central',
      'Lateral incisor': 'Incisivo lateral',
      'Canine (cuspid)': 'Canino',
      'Canine': 'Canino',
      'First molar': 'Primer molar',
      'Second molar': 'Segundo molar',
    };
    return translations[toothName] || toothName;
  };

  const eruptedCount = teeth.filter(t => t.hasErupted && !t.hasShed).length;
  const shedCount = teeth.filter(t => t.hasShed).length;

  console.log('🦷 [TEETHING RENDER] teeth.length:', teeth.length);
  console.log('🦷 [TEETHING RENDER] eruptedCount:', eruptedCount);
  console.log('🦷 [TEETHING RENDER] selectedChild:', selectedChild?.name);

  if (loadingChild || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59C6C0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top }]}>
        <View style={styles.contentWrapper}>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header info */}
            <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="happy-outline" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>Dentición</Text>
              <Text style={styles.headerSubtitle}>
                Dentición de {selectedChild?.name || 'tu bebé'}
              </Text>
            </View>
            <Ionicons name="ellipsis-vertical" size={20} color="#4B5563" />
          </View>

            {/* Último evento */}
            {timeline.length > 0 && (
              <>
                <View style={styles.latestEventCard}>
                  <Text style={styles.latestEventLabel}>ÚLTIMO DIENTE</Text>
                  <Text style={styles.latestEventTitle}>
                    {translateToothName(timeline[0].toothName)}
                  </Text>
                  <Text style={styles.latestEventTime}>
                    {getTimeAgo(timeline[0].occurredAt)}
                  </Text>
                </View>
                
                {/* Icono de información */}
                <TouchableOpacity 
                  style={styles.infoButton}
                  onPress={() => {
                    analyticsService.logEvent('teething_guide_opened', {
                      childId: selectedChild?.id,
                    });
                    navigation.navigate('TeethingGuide');
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#59C6C0" />
                  <Text style={styles.infoButtonText}>Información de Erupción dental</Text>
                </TouchableOpacity>
              </>
            )}

        {/* Boca interactiva */}
        <View style={styles.mouthContainer}>
          <View 
            style={styles.mouthImageWrapper}
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              setMouthDimensions({ width, height });
            }}
          >
            <Image 
              source={require('../../assets/boca-sin-dientes.png')}
              style={styles.mouthImage}
              resizeMode="contain"
            />
            
            {/* Dientes posicionados sobre la boca */}
            {mouthDimensions.width > 0 && teeth.map((tooth) => {
              const toothImage = getToothImage(tooth);
              
              return (
                <TouchableOpacity
                  key={tooth.id}
                  style={[styles.toothButton, getToothPositionStyle(tooth)]}
                  onPress={() => handleToothPress(tooth)}
                  activeOpacity={0.7}
                >
                  {toothImage === 'shed' ? (
                    // Mostrar imagen del ratón cuando el diente se cayó
                    <Image 
                      source={require('../../assets/nodiente.png')}
                      style={styles.toothImage}
                      resizeMode="contain"
                    />
                  ) : toothImage ? (
                    <Image 
                      source={toothImage}
                      style={styles.toothImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.toothPlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Banner Carousel */}
        <BannerCarousel section="denticion" bannerHeight={180} />

        {/* Timeline de eventos */}
        {timeline.length > 0 && (
          <View style={styles.timelineContainer}>
            <Text style={styles.timelineTitle}>
              Cronología de los dientes de {selectedChild?.name || 'tu bebé'}
            </Text>
            {timeline.map((event, index) => {
              const isShed = event.type === 'shed';
              const iconBgColor = isShed ? '#FFE5E5' : '#E8F7F6';
              const iconColor = isShed ? '#FF6B6B' : '#59C6C0';
              
              return (
                <View key={event.id} style={styles.timelineItem}>
                  {/* Línea vertical */}
                  {index < timeline.length - 1 && (
                    <View style={styles.timelineVerticalLine} />
                  )}
                  
                  {/* Icono del diente */}
                  <View style={styles.timelineIconContainer}>
                    <View style={[styles.timelineToothIcon, { backgroundColor: iconBgColor }]}>
                      <Text style={styles.toothEmoji}>🦷</Text>
                    </View>
                  </View>
                  
                  {/* Contenido del evento */}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineToothName}>
                      {translateToothName(event.toothName)}
                    </Text>
                    <Text style={[styles.timelineEventType, { color: iconColor }]}>
                      {isShed ? '✨ Se cayó el diente' : '🦷 Creció el diente'}
                    </Text>
                    {event.createdBy?.name && (
                      <Text style={styles.timelineCreatedBy}>
                        Por {event.createdBy.name}
                      </Text>
                    )}
                    {event.symptoms && event.symptoms.length > 0 && (
                      <Text style={styles.timelineSymptoms}>
                        {event.symptoms.map(s => translateSymptom(s)).join(', ')}
                      </Text>
                    )}
                  </View>
                  
                  {/* Fecha y hora */}
                  <View style={styles.timelineDateContainer}>
                    <Text style={styles.timelineDate}>
                      {new Date(event.occurredAt).toLocaleDateString('es-ES', {
                        month: 'short',
                        day: '2-digit',
                        year: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.timelineTime}>
                      {new Date(event.occurredAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </SafeAreaView>

      {/* Botón flotante */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          Alert.alert(
            'Agregar diente',
            'Para agregar o quitar un nuevo diente tócalo.',
            [{ text: 'Entendido', style: 'default' }]
          );
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.fabEmoji}>🦷</Text>
      </TouchableOpacity>

      {/* Modal para agregar evento */}
      <Modal
        visible={showEventModal}
        transparent
        animationType="slide"
        onRequestClose={handleCancelEvent}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelEvent}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {eventType === 'erupt' ? '🦷 Marcar erupción' : '✨ ¿Se cayó el diente?'}
              </Text>
              <TouchableOpacity onPress={handleCancelEvent}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalToothName}>
                {selectedTooth && getToothName(selectedTooth)}
              </Text>

              {eventType === 'shed' && ageMonths >= 48 && (
                <View style={styles.toothFairyBanner}>
                  <Text style={styles.toothFairyText}>
                    🦷✨ ¡El Ratón Pérez será notificado!
                  </Text>
                </View>
              )}

              {eventType === 'erupt' && (
                <>
                  <Text style={styles.modalLabel}>Síntomas (opcional)</Text>
                  <View style={styles.symptomsGrid}>
                    {SYMPTOMS_OPTIONS.map((symptom) => (
                      <TouchableOpacity
                        key={symptom.id}
                        style={[
                          styles.symptomChip,
                          selectedSymptoms.includes(symptom.id) && styles.symptomChipSelected
                        ]}
                        onPress={() => toggleSymptom(symptom.id)}
                      >
                        <Text style={[
                          styles.symptomChipText,
                          selectedSymptoms.includes(symptom.id) && styles.symptomChipTextSelected
                        ]}>
                          {symptom.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.modalLabel}>
                {eventType === 'shed' ? 'Fecha de caída' : 'Fecha de erupción'}
              </Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#887CBC" />
                <Text style={styles.dateButtonText}>
                  {eventDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={eventDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setEventDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              <Text style={styles.modalLabel}>
                {eventType === 'shed' ? 'Notas sobre la caída (opcional)' : 'Notas (opcional)'}
              </Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={eventType === 'shed' ? '¿Cómo se cayó? ¿Dónde pasó?...' : 'Agrega notas adicionales...'}
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={handleCancelEvent}
              >
                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleSaveEvent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonSaveText}>
                    {eventType === 'shed' ? 'Sí, se cayó' : 'Guardar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </TouchableOpacity>
        </TouchableOpacity>
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
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#59C6C0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  latestEventCard: {
    backgroundColor: '#EDE9FE',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
  },
  latestEventLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 4,
    fontFamily: 'Montserrat',
    letterSpacing: 1,
  },
  latestEventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  latestEventTime: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: 'Montserrat',
  },
  infoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F7F6',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  infoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#59C6C0',
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  mouthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Montserrat',
  },
  mouthContainer: {
    marginHorizontal: 8,
    marginBottom: 24,
  },
  mouthImageWrapper: {
    width: '100%',
    aspectRatio: 0.85,
    position: 'relative',
  },
  mouthImage: {
    width: '100%',
    height: '100%',
  },
  toothButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothImage: {
    width: '100%',
    height: '100%',
  },
  toothPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  shedMarker: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F08EB7',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 12,
    fontFamily: 'Montserrat',
  },
  timelineContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  timelineTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 24,
    fontFamily: 'Montserrat',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    position: 'relative',
  },
  timelineVerticalLine: {
    position: 'absolute',
    left: 30,
    top: 50,
    bottom: -32,
    width: 2,
    backgroundColor: '#E5E5E5',
    zIndex: 0,
  },
  timelineIconContainer: {
    marginRight: 16,
    zIndex: 1,
  },
  timelineToothIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F7F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toothEmoji: {
    fontSize: 28,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 8,
  },
  timelineToothName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  timelineEventType: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  timelineCreatedBy: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  timelineType: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  timelineSymptoms: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  timelineNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
    fontFamily: 'Montserrat',
  },
  timelineDateContainer: {
    alignItems: 'flex-end',
    paddingTop: 8,
  },
  timelineDate: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'Montserrat',
  },
  timelineTime: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#887CBC',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabEmoji: {
    fontSize: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    fontFamily: 'Montserrat',
  },
  modalContent: {
    padding: 20,
  },
  modalToothName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    fontFamily: 'Montserrat',
  },
  toothFairyBanner: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  toothFairyText: {
    fontSize: 14,
    color: '#F57C00',
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f5f5f5',
    marginBottom: 16,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  symptomsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  symptomChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  symptomChipText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  symptomChipTextSelected: {
    color: '#1976D2',
    fontWeight: '600',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    fontFamily: 'Montserrat',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    fontFamily: 'Montserrat',
  },
  modalButtonSave: {
    backgroundColor: '#887CBC',
  },
  modalButtonSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
});

export default TeethingTrackerScreen;
