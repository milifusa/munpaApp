import React, { useState, useEffect } from "react";
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
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from "../contexts/AuthContext";
import {
  childrenService,
  profileService,
  sleepService,
  activitiesService,
} from "../services/api";
import { medicationsService } from "../services/childProfileService";
import { imageUploadService } from "../services/imageUploadService";
import notificationService from "../services/notificationService";
import sleepNotificationScheduler from "../services/sleepNotificationScheduler";
import sleepTrackingNotification from "../services/sleepTrackingNotification";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "../styles/globalStyles";
import { useFonts } from "../hooks/useFonts";
import BannerCarousel from "../components/BannerCarousel";
import { SleepEntry } from "../types/sleep";
import { LinearGradient } from "expo-linear-gradient";

// Función para formatear hora SIN conversión (para predicciones que ya vienen en hora local)
const formatTimeFromISO = (isoString: string): string => {
  try {
    if (!isoString) return '--:--';
    // Extraer hora directamente del string sin conversión de timezone
    // Formato: "2026-01-09T21:00:00.000Z" → "21:00"
    const timePart = isoString.split('T')[1]; // "21:00:00.000Z"
    if (!timePart) return '--:--';
    const [hours, minutes] = timePart.split(':'); // ["21", "00"]
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formateando hora:', error);
    return '--:--';
  }
};

// Función para formatear hora CON conversión a local (para eventos históricos en UTC)
const formatTimeFromISOToLocal = (isoString: string): string => {
  try {
    if (!isoString) return '--:--';
    // Extraer hora directamente del string sin conversión de timezone
    const timePart = isoString.split('T')[1]; // "21:00:00.000Z"
    if (!timePart) return '--:--';
    const [hours, minutes] = timePart.split(':'); // ["21", "00"]
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formateando hora:', error);
    return '--:--';
  }
};

// Función helper para formatear duración en minutos
const formatDuration = (totalMinutes: number, showSeconds: boolean = false): string => {
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.floor(totalMinutes % 60);
  
  if (showSeconds) {
    // Para mostrar tiempo con segundos (tiempo transcurrido en tiempo real)
    const totalSeconds = Math.floor(totalMinutes * 60);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
    } else {
      return `${m}m ${s.toString().padStart(2, '0')}s`;
    }
  }
  
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

interface Child {
  id: string;
  name: string;
  ageInMonths: number | null;
  isUnborn: boolean;
  gestationWeeks?: number | null;
  photoUrl?: string | null;
  createdAt: any;
  // Campos calculados por el backend
  currentAgeInMonths?: number | null;
  currentGestationWeeks?: number | null;
  registeredAgeInMonths?: number | null;
  registeredGestationWeeks?: number | null;
  daysSinceCreation?: number;
  isOverdue?: boolean;
}


// Constantes para las caritas por defecto (fuera del componente para mejor rendimiento)
const CARITA_1 = require("../../assets/caritas1.png");
const CARITA_2 = require("../../assets/caritas2.png");
const CARITA_3 = require("../../assets/caritas3.png");
const CARITAS = [CARITA_1, CARITA_2, CARITA_3];

const HomeScreen: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  // Cargar fuentes personalizadas
  const fontsLoaded = useFonts();



  // Estados para el seguimiento de sueño
  const [sleepPrediction, setSleepPrediction] = useState<any>(null);
  const [sleepReminders, setSleepReminders] = useState<any>(null);
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null);
  const [loadingSleep, setLoadingSleep] = useState(false);
  const [activitySuggestions, setActivitySuggestions] = useState<any>(null);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [elapsedSleepTime, setElapsedSleepTime] = useState(0); // en segundos
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [currentPauses, setCurrentPauses] = useState<any[]>([]);
  
  // Estados para hora de despertar
  const [showWakeTimeModal, setShowWakeTimeModal] = useState(false);
  const [selectedWakeTime, setSelectedWakeTime] = useState(new Date());
  const [showWakeTimePicker, setShowWakeTimePicker] = useState(false);
  const [wakeTimeToday, setWakeTimeToday] = useState<string | null>(null);

  // Estados para modal de detalles de órbita
  const [showOrbitDetailModal, setShowOrbitDetailModal] = useState(false);
  const [orbitDetailData, setOrbitDetailData] = useState<any>(null);

  // ============= ESTADOS PARA MEDICAMENTOS =============
  const [homeTab, setHomeTab] = useState<'sleep' | 'medications'>('sleep');
  const [medications, setMedications] = useState<any[]>([]);
  const [loadingMedications, setLoadingMedications] = useState(false);
  
  // Modal para agregar/editar medicamento
  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [editingMedication, setEditingMedication] = useState<any | null>(null);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medDoseUnit, setMedDoseUnit] = useState('ml');
  const [medScheduleMode, setMedScheduleMode] = useState<'times' | 'interval'>('interval');
  const [medTimes, setMedTimes] = useState<string[]>(['08:00']);
  const [medEveryHours, setMedEveryHours] = useState('');
  const [medFirstDose, setMedFirstDose] = useState(new Date());
  const [medStartDate, setMedStartDate] = useState(new Date());
  const [medEndDate, setMedEndDate] = useState<Date | null>(null);
  const [medNotes, setMedNotes] = useState('');
  const [medScheduleDays, setMedScheduleDays] = useState('14');
  const [showMedStartDatePicker, setShowMedStartDatePicker] = useState(false);
  const [showMedEndDatePicker, setShowMedEndDatePicker] = useState(false);
  const [showMedFirstDosePicker, setShowMedFirstDosePicker] = useState(false);
  const [showMedTimePicker, setShowMedTimePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);
  
  // Modal de detalle de medicamento
  const [showMedicationDetailModal, setShowMedicationDetailModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any | null>(null);

  useEffect(() => {
    loadData();
    loadUserProfile();
    
    // DETENER cualquier notificación que esté corriendo
    sleepTrackingNotification.stopTracking();
    
    // Configurar categorías de notificaciones para tracking de siestas
    sleepTrackingNotification.setupNotificationCategories();
    
    // Configurar handler de respuestas a notificaciones
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const action = response.actionIdentifier;
      
      if (action === 'pause-nap') {
        await handlePauseSleep();
      } else if (action === 'resume-nap') {
        await handleResumeSleep();
      } else if (action === 'stop-nap') {
        await handleStopSleep();
      }
    });
    
    return () => {
      subscription.remove();
      // También detener notificaciones al desmontar
      sleepTrackingNotification.stopTracking();
    };
  }, []);

  // Refrescar datos cuando se regrese a esta pantalla
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadData();
      // loadSleepData se maneja en otro useEffect cuando selectedChild cambia
    });

    return unsubscribe;
  }, [navigation]);

  // Escuchar cambios del hijo seleccionado desde el header
  useEffect(() => {
    const checkSelectedChild = async () => {
      const savedChildId = await AsyncStorage.getItem('selectedChildId');
      if (savedChildId && savedChildId !== selectedChild?.id && children.length > 0) {
        const child = children.find((c: Child) => c.id === savedChildId);
        if (child) {
          console.log('🔄 [HOME] Cambiando hijo seleccionado desde header:', child.name);
          setSelectedChild(child);
        }
      }
    };

    checkSelectedChild();
    // No usar setInterval, solo verificar cuando cambian las dependencias
  }, [children]);

  // Cargar datos de sueño cuando cambia el hijo seleccionado
  useEffect(() => {
    if (selectedChild) {
      loadSleepData(selectedChild.id);
      loadMedications(selectedChild.id);
    }
  }, [selectedChild]);

  // 🔔 Iniciar verificaciones periódicas de notificaciones cuando hay hijo seleccionado
  useEffect(() => {
    if (selectedChild?.id) {
      console.log('🔄 [HOME] Iniciando verificaciones periódicas de notificaciones para:', selectedChild.name);
      sleepNotificationScheduler.startPeriodicChecks(selectedChild.id);
      
      return () => {
        console.log('🛑 [HOME] Deteniendo verificaciones periódicas');
        sleepNotificationScheduler.stopPeriodicChecks();
      };
    }
  }, [selectedChild?.id]);

  // Contador en tiempo real para sueño activo (con pausas)
  useEffect(() => {
    if (!activeSleep) {
      setElapsedSleepTime(0);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date();
      const start = new Date(activeSleep.startTime);
      let diffMs = now.getTime() - start.getTime();
      
      // Restar tiempo de pausas registradas en el backend
      if (activeSleep.pauses && activeSleep.pauses.length > 0) {
        const totalPausedMs = activeSleep.pauses.reduce((total, pause) => {
          if (!pause.endTime) return total; // Pausa activa, no contar aún
          const pauseStart = new Date(pause.startTime as string);
          const pauseEnd = new Date(pause.endTime as string);
          return total + (pauseEnd.getTime() - pauseStart.getTime());
        }, 0);
        diffMs -= totalPausedMs;
      }
      
      // Restar tiempo de pausas locales no guardadas
      currentPauses.forEach(pause => {
        const pauseStart = pause.startTime;
        const pauseEnd = pause.endTime;
        diffMs -= (pauseEnd.getTime() - pauseStart.getTime());
      });
      
      // Si está pausado actualmente, restar el tiempo desde que empezó la pausa
      if (isPaused && pauseStartTime) {
        diffMs -= (now.getTime() - pauseStartTime.getTime());
      }
      
      const diffSeconds = Math.floor(diffMs / 1000);
      setElapsedSleepTime(diffSeconds);
    };

    // Calcular inmediatamente
    calculateElapsed();

    // Actualizar cada segundo para mostrar contador en tiempo real
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeSleep, isPaused, pauseStartTime, currentPauses]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar hijos
      const childrenResponse = await childrenService.getChildren();

      if (childrenResponse.success && childrenResponse.data) {
        setChildren(childrenResponse.data);
        
        // Cargar el hijo seleccionado desde AsyncStorage
        const savedChildId = await AsyncStorage.getItem('selectedChildId');
        let childToSelect = null;
        
        if (savedChildId) {
          childToSelect = childrenResponse.data.find((c: Child) => c.id === savedChildId);
        }
        
        // Si no hay hijo guardado o no se encuentra, seleccionar el primero
        if (!childToSelect && childrenResponse.data.length > 0) {
          childToSelect = childrenResponse.data[0];
          await AsyncStorage.setItem('selectedChildId', childToSelect.id);
        }
        
        if (childToSelect) {
          setSelectedChild(childToSelect);
        }
      } else {
        console.log("ℹ️ No hay hijos registrados o respuesta vacía");
        setChildren([]);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      // No mostrar alerta para errores 500, solo log
      if ((error as any)?.response?.status !== 500) {
        Alert.alert("Error", "No se pudieron cargar los datos de los hijos");
      }
      setChildren([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      if (user?.id) {
        const profileResponse = await profileService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          // @ts-ignore
          setUser((prevUser: any) => ({
            ...prevUser!,
            ...profileResponse.data,
          }));
        }
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    }
  };

  const loadSleepData = async (childId: string) => {
    try {
      setLoadingSleep(true);

      // Cargar predicciones, recordatorios, historial y hora de despertar en paralelo
      const [predictionRes, remindersRes, historyRes, wakeTimeRes] = await Promise.allSettled([
        sleepService.getSleepPrediction(childId),
        sleepService.getSleepReminders(childId),
        sleepService.getSleepHistory(childId, 1),
        sleepService.getWakeTime(childId),
      ]);

      // Actualizar hora de despertar desde el nuevo endpoint
      if (wakeTimeRes.status === 'fulfilled' && wakeTimeRes.value.success) {
        
        // Solo actualizar wakeTimeToday si realmente hay una registrada HOY
        // USAR wakeTimeLocal que viene en formato "YYYY-MM-DD HH:mm:ss"
        if (wakeTimeRes.value.hasRegisteredToday && wakeTimeRes.value.wakeTimeLocal) {
          // Convertir formato "2026-01-09 08:03:00" a ISO "2026-01-09T08:03:00.000Z"
          const wakeTimeISO = wakeTimeRes.value.wakeTimeLocal.replace(' ', 'T') + '.000Z';
          setWakeTimeToday(wakeTimeISO);
        } else {
          setWakeTimeToday(null);
        }
      } else {
        setWakeTimeToday(null);
      }

      // Actualizar predicciones
      if (predictionRes.status === 'fulfilled' && predictionRes.value.success) {
        console.log('🔍 [DEBUG] allNaps recibidos:', predictionRes.value.prediction?.dailySchedule?.allNaps?.length || 0);
        console.log('🔍 [DEBUG] Primer nap:', predictionRes.value.prediction?.dailySchedule?.allNaps?.[0]);
        
        setSleepPrediction(predictionRes.value);
        
        // Si el nivel de presión es bajo, cargar sugerencias de actividades
        if (predictionRes.value.prediction?.sleepPressure?.level === 'low') {
          loadActivitySuggestions(childId);
        }
        
        // 🔔 REPROGRAMAR notificaciones automáticas cada vez que se actualizan las predicciones
        // Esto es CRÍTICO porque las predicciones cambian después de cada siesta registrada
        
        // 🔍 VALIDAR predicciones antes de enviar al backend
        const hasValidPredictions = predictionRes.value.prediction?.dailySchedule?.allNaps &&
          predictionRes.value.prediction.dailySchedule.allNaps.length > 0;
        
        if (hasValidPredictions) {
          // Contar siestas con tiempo válido (no completed, no in_progress, con time válido)
          const upcomingNaps = predictionRes.value.prediction.dailySchedule.allNaps.filter((nap: any) => {
            const hasValidTime = nap.time && typeof nap.time === 'string' && nap.time.length > 0;
            const isNotCompleted = !nap.completed && nap.status !== 'completed';
            const isNotInProgress = nap.status !== 'in_progress' && !nap.isInProgress;
            return hasValidTime && isNotCompleted && isNotInProgress;
          });
          
          
          predictionRes.value.prediction.dailySchedule.allNaps.forEach((nap: any, i: number) => {
            const hasValidTime = nap.time && typeof nap.time === 'string' && nap.time.length > 0;
            const isNotCompleted = !nap.completed && nap.status !== 'completed';
            const isValid = hasValidTime && isNotCompleted;
          });
          
          // Solo programar si hay al menos 1 siesta válida
          if (upcomingNaps.length > 0) {
            console.log(`✅ [HOME] Programando notificaciones para ${upcomingNaps.length} siesta(s) válida(s)...`);
            sleepNotificationScheduler.scheduleAllNotifications(childId, true).catch(error => {
              console.error('❌ [HOME] Error reprogramando notificaciones:', error);
              // No mostrar error al usuario, es un proceso secundario
            });
          }
        } 
        
        // Log de bedtime RAW (sin conversiones)
        if (predictionRes.value.prediction?.bedtime?.time) {
          
          // Extraer hora directa del string (sin conversión)
          const timePart = predictionRes.value.prediction.bedtime.time.split('T')[1];
          const [hours, minutes] = timePart.split(':');
          console.log('   🔢 Hora extraída directa (sin conversión):', `${hours}:${minutes}`);
          
          // Crear Date CON conversión para comparar
          const bedtimeDate = new Date(predictionRes.value.prediction.bedtime.time);
          console.log('   📅 Date parseado (CON conversión):', bedtimeDate.toString());
          console.log('   📅 Hora local (CON conversión):', bedtimeDate.toLocaleTimeString('es-ES'));
          console.log('   🎯 ¿Cuál debería mostrarse? Direct=', `${hours}:${minutes}`, 'vs Local=', bedtimeDate.toLocaleTimeString('es-ES'));
        } else {
          console.log('\n⚠️ [BEDTIME] NO hay hora de dormir predicha');
        }
        
        // Log de allNaps para debug (para dibujar en órbita)
        if (predictionRes.value.prediction?.dailySchedule?.allNaps) {
          
          predictionRes.value.prediction.dailySchedule.allNaps.forEach((nap: any, index: number) => {
            if (nap.actualDuration) {
              console.log(`   ⌛ Duración real: ${nap.actualDuration} min`);
            }
            if (nap.expectedDuration) {
              console.log(`   ⏳ Duración esperada: ${nap.expectedDuration} min`);
            }
            if (nap.aiReason) {
              console.log(`   💡 AI Reason: ${nap.aiReason}`);
            }
          });
          
          // Resumen de predicciones por source
          const wakeTimeBased = predictionRes.value.prediction.dailySchedule.allNaps.filter((n: any) => n.source === 'wake-time').length;
          const defaults = predictionRes.value.prediction.dailySchedule.allNaps.filter((n: any) => n.source === 'defaults').length;
          const historical = predictionRes.value.prediction.dailySchedule.allNaps.filter((n: any) => n.source === 'historical').length;
          
        } else {
          console.log('\n⚠️ [ÓRBITA] NO hay predicciones para dibujar (allNaps vacío o undefined)');
        }
        
      } else {
        setSleepPrediction(null);
        setWakeTimeToday(null);
        console.log('⚠️ [PREDICCIÓN] No se pudo obtener predicciones del backend');
      }

      // Actualizar recordatorios
      if (remindersRes.status === 'fulfilled' && remindersRes.value.success) {
        setSleepReminders(remindersRes.value);
      } else {
        setSleepReminders(null);
      }

      // Verificar si hay un sueño activo (sin endTime)
      if (historyRes.status === 'fulfilled' && historyRes.value.success) {
        const activeSleepEntry = historyRes.value.sleepHistory.find(
          (entry: SleepEntry) => !entry.endTime
        );
        setActiveSleep(activeSleepEntry || null);
        
        // Iniciar notificación persistente si hay siesta activa
        if (activeSleepEntry && predictionRes.status === 'fulfilled' && predictionRes.value.prediction?.nextNap) {
          await sleepTrackingNotification.startTracking({
            startTime: activeSleepEntry.startTime,
            expectedDuration: predictionRes.value.prediction.nextNap.expectedDuration,
            isPaused: false,
          });
        }
      } else {
        setActiveSleep(null);
      }
    } catch (error) {
      console.error("❌ [HOME] Error cargando datos de sueño:", error);
      setSleepPrediction(null);
      setSleepReminders(null);
      setActiveSleep(null);
    } finally {
      setLoadingSleep(false);
    }
  };

  // Función para cargar sugerencias de actividades
  const loadActivitySuggestions = async (childId: string) => {
    try {
      setLoadingActivities(true);
      
      const response = await activitiesService.getActivitySuggestions(childId);
      
      if (response.success) {
        setActivitySuggestions(response);
      }
    } catch (error) {
      console.error('❌ [ACTIVITIES] Error cargando sugerencias:', error);
      setActivitySuggestions(null);
    } finally {
      setLoadingActivities(false);
    }
  };

  // ============= FUNCIONES DE MEDICAMENTOS =============
  const loadMedications = async (childId: string) => {
    try {
      setLoadingMedications(true);
      const response = await medicationsService.getMedications(childId);
      if (response.success) {
        setMedications(response.data || []);
        // NO hacer auto-switch, dejar que el usuario elija la pestaña
      }
    } catch (error) {
      console.error('❌ Error cargando medicamentos:', error);
      setMedications([]);
    } finally {
      setLoadingMedications(false);
    }
  };

  const openAddMedicationModal = () => {
    setEditingMedication(null);
    setMedName('');
    setMedDose('');
    setMedDoseUnit('ml');
    setMedScheduleMode('interval');
    setMedTimes(['08:00']);
    setMedEveryHours('');
    setMedFirstDose(new Date());
    setMedStartDate(new Date());
    setMedEndDate(null);
    setMedNotes('');
    setMedScheduleDays('14');
    setShowMedicationModal(true);
  };

  const openEditMedicationModal = (medication: any) => {
    setEditingMedication(medication);
    setMedName(medication.name);
    setMedDose(medication.dose.toString());
    setMedDoseUnit(medication.doseUnit);
    
    if (medication.times && medication.times.length > 0) {
      setMedScheduleMode('times');
      setMedTimes(medication.times);
    } else if (medication.repeatEveryMinutes) {
      setMedScheduleMode('interval');
      setMedEveryHours((medication.repeatEveryMinutes / 60).toString());
      if (medication.startTime) {
        const [hours, minutes] = medication.startTime.split(':');
        const firstDose = new Date();
        firstDose.setHours(parseInt(hours), parseInt(minutes));
        setMedFirstDose(firstDose);
      }
    }
    
    if (medication.startDate) {
      setMedStartDate(new Date(medication.startDate));
    }
    if (medication.endDate) {
      setMedEndDate(new Date(medication.endDate));
    }
    setMedNotes(medication.notes || '');
    setMedScheduleDays(medication.scheduleDays?.toString() || '14');
    setShowMedicationModal(true);
  };

  const handleSaveMedication = async () => {
    if (!selectedChild) return;
    
    if (!medName.trim()) {
      Alert.alert('Error', 'El nombre del medicamento es requerido');
      return;
    }
    
    try {
      let times: string[] | undefined;
      let repeatEveryMinutes: number | undefined;
      let startTime: string | undefined;
      let endTime: string | undefined;
      
      if (medScheduleMode === 'times') {
        times = medTimes;
      } else {
        const hours = parseFloat(medEveryHours);
        if (isNaN(hours) || hours <= 0) {
          Alert.alert('Error', 'Ingresa un intervalo válido en horas (ej: 0.1 para 6 minutos, 1 para 1 hora)');
          return;
        }
        repeatEveryMinutes = hours * 60;
        startTime = `${medFirstDose.getHours().toString().padStart(2, '0')}:${medFirstDose.getMinutes().toString().padStart(2, '0')}`;
      }
      
      const scheduleDays = parseInt(medScheduleDays);
      if (isNaN(scheduleDays) || scheduleDays < 1 || scheduleDays > 60) {
        Alert.alert('Error', 'Los días de programación deben estar entre 1 y 60');
        return;
      }
      
      if (editingMedication) {
        await medicationsService.updateMedication(editingMedication.id, {
          name: medName.trim(),
          dose: medDose.trim(),
          doseUnit: medDoseUnit.trim() || "ml",
          times: medScheduleMode === "times" ? times : undefined,
          repeatEveryMinutes,
          startTime,
          endTime,
          startDate: medStartDate.toISOString().split('T')[0],
          endDate: medEndDate ? medEndDate.toISOString().split('T')[0] : undefined,
          notes: medNotes.trim(),
          scheduleDays,
        });
      } else {
        await medicationsService.addMedication(selectedChild.id, {
          name: medName.trim(),
          dose: medDose.trim(),
          doseUnit: medDoseUnit.trim() || "ml",
          times: medScheduleMode === "times" ? times : undefined,
          repeatEveryMinutes,
          startTime,
          endTime,
          startDate: medStartDate.toISOString().split('T')[0],
          endDate: medEndDate ? medEndDate.toISOString().split('T')[0] : undefined,
          notes: medNotes.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          scheduleDays,
        });
      }
      
      setShowMedicationModal(false);
      await loadMedications(selectedChild.id);
      Alert.alert('Éxito', editingMedication ? 'Medicamento actualizado' : 'Medicamento agregado');
    } catch (error: any) {
      console.error('Error guardando medicamento:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo guardar el medicamento');
    }
  };

  const getMedicationTimes = (medication: any): string[] => {
    if (medication.times && medication.times.length > 0) {
      return medication.times;
    }
    return [];
  };

  const getScheduleSummary = (times: string[]): string => {
    if (times.length === 0) return 'Sin horario definido';
    if (times.length === 1) return `1 toma (${times[0]})`;
    return `${times.length} tomas (${times[0]}, ${times[times.length - 1]})`;
  };

  // Funciones para manejar pausas y detención de siesta
  const handlePauseSleep = async () => {
    if (!activeSleep || isPaused) return;
    
    const now = new Date();
    setPauseStartTime(now);
    setIsPaused(true);
    
    // Actualizar notificación a estado pausado
    await sleepTrackingNotification.updatePauseState(true);
    
    Alert.alert('⏸️ Pausado', 'Siesta pausada. El tiempo no se contará hasta que reanudes.');
  };

  const handleResumeSleep = async () => {
    if (!activeSleep || !isPaused || !pauseStartTime) return;
    
    try {
      const now = new Date();
      const pauseDuration = Math.floor((now.getTime() - pauseStartTime.getTime()) / 1000 / 60);
      
      // Registrar la pausa en el backend
      await sleepService.addSleepPause(activeSleep.id, {
        startTime: pauseStartTime.toISOString(),
        endTime: now.toISOString(),
        duration: pauseDuration,
        reason: 'Pausa durante la siesta'
      });
      
      // Agregar pausa a la lista local
      setCurrentPauses([...currentPauses, { startTime: pauseStartTime, endTime: now }]);
      
      // Actualizar activeSleep con las pausas
      if (activeSleep.pauses) {
        activeSleep.pauses.push({
          id: `pause_${Date.now()}`,
          startTime: pauseStartTime.toISOString(),
          endTime: now.toISOString(),
          duration: pauseDuration,
          reason: 'Pausa durante la siesta'
        });
      }
      
      setIsPaused(false);
      setPauseStartTime(null);
      
      // Actualizar notificación a estado activo
      await sleepTrackingNotification.updatePauseState(false);
      
      Alert.alert('▶️ Reanudado', 'Siesta reanudada. El tiempo se sigue contando.');
      
      // Recargar datos
      if (selectedChild) {
        loadSleepData(selectedChild.id);
      }
    } catch (error) {
      console.error('Error reanudando siesta:', error);
      Alert.alert('Error', 'No se pudo reanudar la siesta');
    }
  };

  const handleStopSleep = async () => {
    if (!activeSleep) return;
    
    Alert.alert(
      '¿Detener siesta?',
      '¿Estás seguro de que quieres finalizar esta siesta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Detener',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingSleep(true);
              const endTime = new Date();
              const duration = Math.floor(
                (endTime.getTime() - new Date(activeSleep.startTime).getTime()) / 1000 / 60
              );
              
              await sleepService.updateSleepEvent(activeSleep.id, {
                endTime: endTime.toISOString(),
                duration,
              });
              
              // Detener notificación de tracking
              await sleepTrackingNotification.stopTracking();
              
              setActiveSleep(null);
              setIsPaused(false);
              setPauseStartTime(null);
              setCurrentPauses([]);
              Alert.alert('✓ Completado', 'Seguimiento finalizado');
              
              // Recargar datos
              if (selectedChild) {
                loadSleepData(selectedChild.id);
              }
            } catch (error) {
              console.error('Error finalizando siesta:', error);
              Alert.alert('Error', 'No se pudo finalizar el seguimiento');
            } finally {
              setLoadingSleep(false);
            }
          }
        }
      ]
    );
  };

  const handleRecordWakeTime = async () => {
    if (!selectedChild) return;
    
    try {
      setLoadingSleep(true);
      console.log('🌅 [HOME] Registrando hora de despertar:', selectedWakeTime);
      
      // Construir ISO string que represente la hora seleccionada directamente en UTC
      // Si el usuario selecciona 8:00 AM, queremos "YYYY-MM-DDT08:00:00.000Z"
      const year = selectedWakeTime.getFullYear();
      const month = String(selectedWakeTime.getMonth() + 1).padStart(2, '0');
      const day = String(selectedWakeTime.getDate()).padStart(2, '0');
      const hours = String(selectedWakeTime.getHours()).padStart(2, '0');
      const minutes = String(selectedWakeTime.getMinutes()).padStart(2, '0');
      const wakeTimeISO = `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
      
      console.log('📅 [HOME] Enviando hora al servidor:', {
        horaSeleccionada: `${hours}:${minutes}`,
        horaLocal: selectedWakeTime.toString(),
        horaUTC_INCORRECTA: selectedWakeTime.toISOString(),
        horaUTC_CORRECTA: wakeTimeISO
      });
      
      const response = await sleepService.recordWakeTime({
        childId: selectedChild.id,
        wakeTime: wakeTimeISO,
      });
      
      if (response.success) {
        setWakeTimeToday(wakeTimeISO);
        setShowWakeTimeModal(false);
        Alert.alert('✓ Registrado', 'Hora de despertar registrada exitosamente');
        
        // Recargar predicciones para obtener cálculos actualizados
        loadSleepData(selectedChild.id);
      }
    } catch (error: any) {
      console.error('❌ [HOME] Error registrando hora de despertar:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo registrar la hora de despertar');
    } finally {
      setLoadingSleep(false);
    }
  };


  const handleRecordBedtime = async () => {
    if (!selectedChild) return;
    
    try {
      setLoadingSleep(true);
      const now = new Date();
      
      console.log('🌙 [HOME] Registrando hora de dormir:', now);
      
      // Construir ISO string para la hora de dormir
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const bedtimeISO = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.000Z`;
      console.log('🌙 [HOME] Hora de dormir ISO:', bedtimeISO);
      
      // Registrar en el backend como un evento de sueño nocturno
      const response = await sleepService.recordSleep({
        childId: selectedChild.id,
        type: 'nightsleep',
        startTime: bedtimeISO,
      });
      
      if (response.success) {
        Alert.alert('✓ Registrado', 'Hora de dormir registrada exitosamente');
        
        // Recargar predicciones
        loadSleepData(selectedChild.id);
      }
    } catch (error: any) {
      console.error('❌ [HOME] Error registrando hora de dormir:', error);
      Alert.alert('Error', error.response?.data?.message || 'No se pudo registrar la hora de dormir');
    } finally {
      setLoadingSleep(false);
    }
  };


  const getSleepPressureMessage = () => {
    const childName = selectedChild?.name || 'tu bebé';
    const pressure = sleepPrediction?.prediction?.sleepPressure;
    
    if (!pressure) {
      if (user?.gender === "M") {
        return "Ser papá no es fácil, pero no estás solo...";
      } else if (user?.gender === "F") {
        return "Ser mamá no es fácil, pero no estás sola...";
      } else {
        return "Ser padre no es fácil, pero no estás solo...";
      }
    }
    
    switch (pressure.level) {
      case 'low':
        return `Es momento de jugar y reír para ${childName}`;
      case 'medium':
        return `Es la hora de dormir de ${childName}`;
      case 'high':
        return `Es la hora de dormir de ${childName}`;
      case 'critical':
        return `${childName} debería estar durmiendo ahora`;
      default:
        return pressure.recommendation || "Todo está bien";
    }
  };

  const getSleepPressureImage = () => {
    const pressure = sleepPrediction?.prediction?.sleepPressure;
    
    // Si está durmiendo, siempre mostrar planeta3 (dormido)
    if (activeSleep) {
      return require('../../assets/planeta3.png'); // Planeta dormido
    }
    
    // Priorizar energyLevelDisplay de activitySuggestions si está disponible (más preciso)
    if (activitySuggestions?.currentState?.energyLevelDisplay) {
      const energyText = activitySuggestions.currentState.energyLevelDisplay.toLowerCase();
      
      if (energyText.includes('alta')) {
        return require('../../assets/planeta1.png');
      } else if (energyText.includes('media')) {
        return require('../../assets/planeta2.png');
      } else if (energyText.includes('baja')) {
        return require('../../assets/planeta4.png');
      }
    }
    
    // Fallback: usar sleepPressure si no hay activitySuggestions
    if (!pressure) {
      return require('../../assets/planeta1.png'); // Verde por defecto
    }
    
    switch (pressure.level) {
      case 'low':
        return require('../../assets/planeta1.png'); // Verde - energía alta
      case 'medium':
        return require('../../assets/planeta2.png'); // Gris/turquesa - energía media
      case 'high':
        return require('../../assets/planeta2.png'); // Gris/turquesa - energía media-alta
      case 'critical':
        return require('../../assets/planeta4.png'); // Rosa/roja - energía baja o se pasó de tiempo
      default:
        return require('../../assets/planeta1.png'); // Verde por defecto
    }
  };

  // Helpers para actividades
  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      motor: '🏃',
      sensorial: '👐',
      cognitivo: '🧠',
      social: '👥',
      lenguaje: '💬',
      calma: '😴'
    };
    return icons[category] || '🎨';
  };

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      motor: '#10B981',
      sensorial: '#F59E0B',
      cognitivo: '#8B5CF6',
      social: '#EC4899',
      lenguaje: '#3B82F6',
      calma: '#6366F1'
    };
    return colors[category] || '#887CBC';
  };

  const getIntensityColor = (intensity: string): string => {
    const colors: { [key: string]: string } = {
      baja: '#10B981',
      media: '#F59E0B',
      alta: '#EF4444'
    };
    return colors[intensity] || '#888';
  };

  const handleAddChild = () => {
    // @ts-ignore
    navigation.navigate("ChildrenData", {
      childrenCount: 1,
      gender: "F", // Por defecto, se puede cambiar después
      pregnancyStatus: "not_pregnant",
      isMultiplePregnancy: false,
    });
  };

  const handleChildPress = (child: Child) => {
    // Navegar directamente al perfil completo
    // @ts-ignore
    navigation.navigate("ChildProfile", {
      childId: child.id,
      child: child,
    });
  };

  const getProfileImage = () => {
    // Icono de perfil amarillo con cara sonriente
    return require("../../assets/caritas1.png");
  };

  const getChildAvatar = (child: Child, index: number) => {
    // Si el hijo tiene foto válida del backend y no ha fallado, usarla
    if (child.photoUrl && typeof child.photoUrl === 'string' && child.photoUrl.trim() !== '' && !imageErrors.has(child.id)) {
      return { uri: child.photoUrl };
    }

    // Si no tiene foto o la imagen falló, usar las caritas por defecto
    const caritaIndex = index % 3;
    
    // Retornar directamente el require según el índice
    switch (caritaIndex) {
      case 0:
        return CARITA_1;
      case 1:
        return CARITA_2;
      case 2:
        return CARITA_3;
      default:
        return CARITA_1;
    }
  };

  const handleImageError = (childId: string) => {
    console.log("❌ [IMAGE] Error cargando imagen para hijo:", childId);
    setImageErrors((prev) => new Set(prev).add(childId));
  };


  const handleDouliPress = () => {
    // Navegar al tab Doula
    (navigation as any).navigate("MainTabs", {
      screen: "Doula",
    });
  };

  // Helper para formatear hora sin conversión de timezone, con formato 12h
  const formatTimeWithoutTimezone = (isoString: string, use12Hour: boolean = false) => {
    try {
      if (!isoString) return '--:--';
      const timePart = isoString.split('T')[1]; // "21:00:00.000Z"
      if (!timePart) return '--:--';
      const [hours, minutes] = timePart.split(':').map(Number); // [21, 0]
      
      if (use12Hour) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '--:--';
    }
  };

  // Helper para formatear hora de eventos activos (CON conversión UTC a local)
  const formatActiveEventTime = (isoString: string, use12Hour: boolean = false) => {
    try {
      if (!isoString) return '--:--';
      const date = new Date(isoString);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      
      if (use12Hour) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const hour12 = hours % 12 || 12;
        return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '--:--';
    }
  };

  // Funciones para mostrar detalles de elementos de la órbita
  const showWakeTimeDetail = () => {
    if (!wakeTimeToday) return;
    
    const timeStr = formatTimeWithoutTimezone(wakeTimeToday, true);
    
    // Extraer la fecha del string ISO sin conversión de timezone
    const datePart = wakeTimeToday.split('T')[0]; // "2026-01-09"
    if (!datePart) return;
    
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day); // Crear fecha local sin hora
    
    setOrbitDetailData({
      type: 'wakeTime',
      title: '🌅 Hora de Despertar',
      time: timeStr,
      details: [
        `Registrada: ${date.toLocaleDateString('es-ES', { 
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        })}`
      ]
    });
    setShowOrbitDetailModal(true);
  };

  const showBedtimeDetail = (bedtime: any) => {
    const timeStr = formatTimeWithoutTimezone(bedtime.time, true);
    
    setOrbitDetailData({
      type: 'bedtime',
      title: '🌙 Hora de Dormir Predicha',
      time: timeStr,
      details: [
        `Ventana: ${bedtime.windowStart} - ${bedtime.windowEnd}`,
        `Confianza: ${bedtime.confidence}%`,
        `Razón: ${bedtime.reason || 'Basado en patrones de sueño'}`
      ]
    });
    setShowOrbitDetailModal(true);
  };

  const showNapDetail = (nap: any, index: number) => {
    const startTimeStr = formatTimeWithoutTimezone(nap.time || nap.startTime, true);
    
    // Construir el string de tiempo
    let timeStr = startTimeStr;
    if (nap.endTime) {
      const endTimeStr = formatTimeWithoutTimezone(nap.endTime, true);
      timeStr = `${startTimeStr} - ${endTimeStr}`;
    }
    
    // Estado más detallado
    let status = 'Pendiente 🔵';
    if (nap.completed || nap.status === 'completed') {
      status = 'Completada ✅';
    } else if (nap.status === 'in_progress' || nap.status === 'active') {
      status = 'En progreso ⏳';
    } else if (nap.status === 'upcoming') {
      status = 'Próxima 🔜';
    } else if (nap.status === 'skipped') {
      status = 'Omitida ⏭️';
    }
    
    const details = [
      `Estado: ${status}`,
    ];
    
    // Agregar hora de inicio
    details.push(`Inicio: ${startTimeStr}`);
    
    // Agregar hora de fin si existe
    if (nap.endTime) {
      const endTimeStr = formatTimeWithoutTimezone(nap.endTime, true);
      details.push(`Fin: ${endTimeStr}`);
    }
    
    // Duración
    if (nap.actualDuration) {
      details.push(`Duración real: ${nap.actualDuration} min`);
    } else if (nap.expectedDuration || nap.duration) {
      details.push(`Duración esperada: ${nap.expectedDuration || nap.duration} min`);
    }
    
    // Confianza
    details.push(`Confianza: ${nap.confidence || 0}%`);
    
    // Fuente más detallada
    let fuenteStr = 'Desconocida';
    if (nap.basedOn) {
      switch (nap.basedOn) {
        case 'chatgpt-enhanced':
          fuenteStr = 'IA Avanzada (ChatGPT) 🤖';
          break;
        case 'wake-time':
          fuenteStr = 'Basado en despertar ⏰';
          break;
        case 'historical':
          fuenteStr = 'Histórico 📊';
          break;
        case 'defaults':
          fuenteStr = 'Valores por defecto ⚙️';
          break;
        default:
          fuenteStr = nap.basedOn;
      }
    } else if (nap.source) {
      fuenteStr = nap.source === 'wake-time' ? 'Basado en despertar ⏰' : 'Histórico 📊';
    }
    details.push(`Fuente: ${fuenteStr}`);
    
    // Razón de la IA
    if (nap.aiReason) {
      details.push(`💡 Razón: ${nap.aiReason}`);
    }
    
    // Ventana de tiempo
    if (nap.windowStart && nap.windowEnd) {
      const windowStartStr = formatTimeWithoutTimezone(nap.windowStart, true);
      const windowEndStr = formatTimeWithoutTimezone(nap.windowEnd, true);
      details.push(`Ventana: ${windowStartStr} - ${windowEndStr}`);
    }
    
    // Número de siesta si existe
    if (nap.napNumber) {
      details.push(`Siesta #${nap.napNumber} del día`);
    }
    
    setOrbitDetailData({
      type: 'nap',
      title: `💤 Siesta ${index + 1}`,
      time: timeStr,
      details
    });
    setShowOrbitDetailModal(true);
  };

  // Helper para parsear hora y calcular posición en la órbita
  const parseTimeToPosition = (timeString: string, radius: number = 105, convertTimezone: boolean = false) => {
    let hour = 0;
    let minute = 0;
    
    if (!timeString) {
      // Retornar posición por defecto si no hay tiempo
      return { x: 0, y: -radius, hour: 0, minute: 0, angle: -90, radian: -Math.PI / 2 };
    }
    
    // Parsear la hora
    if (timeString.includes('AM') || timeString.includes('PM')) {
      // Formato: "9:45 AM"
      const [time, period] = timeString.split(' ');
      const [h, m] = time.split(':').map(Number);
      hour = period === 'PM' && h !== 12 ? h + 12 : (period === 'AM' && h === 12 ? 0 : h);
      minute = m;
    } else {
      if (convertTimezone) {
        // CON conversión de timezone (para bedtime y eventos que necesitan mostrar hora local)
        const date = new Date(timeString);
        hour = date.getHours();
        minute = date.getMinutes();
      } else {
        // SIN conversión de timezone (para predicciones, extraer hora directa)
        // Formato: "2026-01-09T21:00:00.000Z" → hora=21, minuto=0
        const timePart = timeString.split('T')[1]; // "21:00:00.000Z"
        if (!timePart) {
          return { x: 0, y: -radius, hour: 0, minute: 0, angle: -90, radian: -Math.PI / 2 };
        }
        const [h, m] = timePart.split(':').map(Number); // [21, 0]
        hour = h;
        minute = m;
      }
    }
    
    // Convertir hora a ángulo (0° = 12:00 AM arriba, avanza en sentido horario)
    const totalMinutes = hour * 60 + minute;
    const angle = (totalMinutes / (24 * 60)) * 360 - 90; // -90 para que 0° sea arriba
    const radian = (angle * Math.PI) / 180;
    
    // Calcular posición x, y
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;
    
    return { x, y, hour, minute, angle, radian };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Saludo Personalizado */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingTextContainer}>
            <Text style={styles.greetingHello}>¡Hola </Text>
            <Text style={styles.greetingName}>{user?.displayName}!</Text>
          </View>
        </View>

        {/* Pestañas de Sueño / Medicamentos */}
        {selectedChild && (
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, homeTab === 'sleep' && styles.activeTab]}
              onPress={() => setHomeTab('sleep')}
            >
              <Ionicons 
                name="moon" 
                size={18} 
                color={homeTab === 'sleep' ? '#4A5568' : '#FFF'} 
              />
              <Text style={[styles.tabText, homeTab === 'sleep' && styles.activeTabText]}>
                Sueño
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.tab, homeTab === 'medications' && styles.activeTab]}
              onPress={() => setHomeTab('medications')}
            >
              <Ionicons 
                name="medkit" 
                size={18} 
                color={homeTab === 'medications' ? '#4A5568' : '#FFF'} 
              />
              <Text style={[styles.tabText, homeTab === 'medications' && styles.activeTabText]}>
                Medicamentos
                {medications.filter(m => m.active).length > 0 && (
                  <Text style={styles.tabBadge}> ({medications.filter(m => m.active).length})</Text>
                )}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Contenido de la pestaña SUEÑO */}
        {homeTab === 'sleep' && selectedChild && (
          <>
          {/* Título de Sueño */}
          <View style={styles.sleepTitleContainer}>
            <Text style={styles.sleepTitle}>Recomendación de sueño</Text>
          </View>
          
          {/* Carita animada de presión de sueño */}
          <View style={styles.sleepPlanetContainer}>
            {/* Planeta/Carita */}
            <View style={styles.sleepPlanet}>
              {/* Imagen del planeta según estado */}
              <Image 
                source={getSleepPressureImage()} 
                style={styles.planetImage}
                resizeMode="contain"
              />
              
              {/* Órbita animada */}
              <View style={styles.orbitContainer}>
                <View style={[styles.orbit, styles.orbitOuter]} />
                <View style={[styles.orbit, styles.orbitInner]} />
                
                {/* Hora actual - Punto blanco */}
                {(() => {
                  const now = new Date();
                  // Usar el ISO string completo de la fecha actual
                  const { x, y } = parseTimeToPosition(now.toISOString(), 140, true); // true = usar hora local
                  
                  
                  return (
                    <View
                      key="current-time"
                      style={[
                        styles.currentTimeIndicator,
                        {
                          left: x + 180 - 8, // Centrar el punto (radio 8px)
                          top: y + 180 - 8,
                        }
                      ]}
                    >
                      <View style={styles.currentTimeGlow} />
                      <View style={styles.currentTimeDot} />
                    </View>
                  );
                })()}
                
                {/* Hora de despertar (Wake Time) */}
                {wakeTimeToday && (() => {
                  
                  const { x, y, hour, minute } = parseTimeToPosition(wakeTimeToday, 140); // Radio en la órbita
                  
                  
                  return (
                    <TouchableOpacity
                      key="wake-time"
                      style={[
                        styles.orbitCapsule,
                        {
                          left: x + 180 - 32, // Centrar la cápsula
                          top: y + 180 - 20,
                        }
                      ]}
                      onPress={showWakeTimeDetail}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.capsuleGlow, { backgroundColor: '#FFD700' }]} />
                      <View style={[styles.capsuleInner, { backgroundColor: '#FFA500' }]}>
                        <Ionicons name="sunny" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  );
                })()}
                
                {/* Hora de dormir predicha (Bedtime) */}
                {sleepPrediction?.prediction?.bedtime?.time && (() => {
                  const { x, y, hour, minute } = parseTimeToPosition(sleepPrediction.prediction.bedtime.time, 140, false); // false = NO convertir timezone
                  const bedtime = sleepPrediction.prediction.bedtime;
                  
                  return (
                    <TouchableOpacity
                      key="bedtime"
                      style={[
                        styles.orbitCapsule,
                        {
                          left: x + 180 - 32,
                          top: y + 180 - 20,
                        }
                      ]}
                      onPress={() => showBedtimeDetail(bedtime)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.capsuleGlow, { backgroundColor: '#9D9FFF' }]} />
                      <View style={[styles.capsuleInner, { backgroundColor: '#7F7FD5' }]}>
                        <Ionicons name="moon" size={20} color="#FFF" />
                      </View>
                    </TouchableOpacity>
                  );
                })()}
                
                {/* Siestas predichas/completadas */}
                {sleepPrediction?.prediction?.dailySchedule?.allNaps?.map((nap: any, index: number) => {
                  const napStartTime = nap.time || nap.startTime;
                  const { x: xStart, y: yStart, hour: startHour, minute: startMinute } = parseTimeToPosition(napStartTime, 140); // Radio en la órbita
                  
                  // Color según estado
                  const isInProgress = nap.status === 'in_progress' || nap.isInProgress === true;
                  const isCompleted = nap.completed || nap.status === 'completed';
                  const dotColor = isInProgress ? '#8B5CF6' : (isCompleted ? '#4CAF50' : '#56CCF2');
                  
                  // Calcular duración
                  const duration = nap.actualDuration || nap.expectedDuration || nap.duration || 0;
                  
                  // Dibujar múltiples segmentos para crear un arco visual
                  const segments = [];
                  if (duration > 0) {
                    const segmentCount = Math.min(Math.floor(duration / 5), 30); // Un segmento cada 5 minutos, máximo 30
                    for (let i = 0; i < segmentCount; i++) {
                      const segmentTime = (startHour * 60 + startMinute + (duration * i / segmentCount));
                      const segmentMinutes = segmentTime % (24 * 60);
                      const segmentAngle = (segmentMinutes / (24 * 60)) * 360 - 90;
                      const segmentRadian = (segmentAngle * Math.PI) / 180;
                      const xSeg = Math.cos(segmentRadian) * 140;
                      const ySeg = Math.sin(segmentRadian) * 140;
                      
                      // Tamaño del segmento basado en la duración
                      const segmentSize = Math.min(Math.max(8, duration / 15), 16);
                      
                      segments.push(
                    <View
                          key={`segment-${index}-${i}`}
                      style={[
                            styles.napArcSegment,
                            {
                              left: xSeg + 180 - segmentSize / 2,
                              top: ySeg + 180 - segmentSize / 2,
                              width: segmentSize,
                              height: segmentSize,
                          backgroundColor: dotColor,
                              opacity: isCompleted ? 0.5 : 0.3,
                              borderRadius: segmentSize / 2,
                            }
                          ]}
                        />
                      );
                    }
                  }
                  
                  return (
                    <React.Fragment key={`nap-${index}`}>
                      {/* Segmentos de arco para mostrar duración */}
                      {segments}
                      
                      {/* Cápsula marcador en el inicio */}
                      <TouchableOpacity
                        style={[
                          styles.orbitCapsule,
                          {
                            left: xStart + 180 - 32,
                            top: yStart + 180 - 20,
                          }
                        ]}
                        onPress={() => showNapDetail(nap, index)}
                        activeOpacity={0.8}
                      >
                        <View style={[
                          styles.capsuleGlow,
                          { 
                            backgroundColor: isInProgress ? '#A78BFA' : (isCompleted ? '#66BB6A' : '#56CCF2'),
                            opacity: 0.4,
                          }
                        ]} />
                        <View style={[
                          styles.capsuleInner,
                          { backgroundColor: dotColor }
                        ]}>
                          <Ionicons 
                            name={isCompleted ? "checkmark" : (isInProgress ? "hourglass" : "moon")} 
                            size={20} 
                            color="#FFF" 
                          />
                    </View>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </View>
              
              {/* Cara del planeta O información de siesta activa */}
              {activeSleep ? (
                // Mostrar info de siesta activa DENTRO del planeta
                <>
                  {/* Texto "Durmiendo" arriba */}
                  <View style={styles.planetTopText}>
                    <Text style={styles.planetCenterTitle}>
                      {isPaused ? 'Pausada' : 'Durmiendo'}
                    </Text>
                  </View>
                  
                  {/* Tiempo abajo */}
                  <View style={styles.planetBottomText}>
                    <Text style={styles.planetCenterTime}>
                      {formatDuration(elapsedSleepTime / 60, false)}
                    </Text>
                    {sleepPrediction?.prediction?.nextNap?.expectedDuration && (
                      <Text style={styles.planetCenterSubtitle}>
                        de {formatDuration(sleepPrediction.prediction.nextNap.expectedDuration)} min
                      </Text>
                    )}
                  </View>
                </>
              ) : null}
            </View>
            
          {/* Mensaje de presión de sueño - SOLO cuando NO hay siesta activa */}
          {!activeSleep && !activitySuggestions && (
            <View style={styles.motivationalSection}>
              <Text
                style={{
                  fontSize: 14,
                  color: "#FFF",
                  textAlign: "center",
                  fontWeight: "700",
                }}
              >
                {getSleepPressureMessage()}
              </Text>
            </View>
          )}
        </View>
          
        {/* Recuadros de información de siestas + Estado del bebé */}
        {sleepPrediction?.prediction && (
          <View style={styles.sleepInfoCardsContainer}>
            {/* Tiempo hasta la próxima siesta */}
            {sleepPrediction.prediction.nextNap && (() => {
              const now = new Date();
              const nextNapTime = new Date(sleepPrediction.prediction.nextNap.time);
              const minutesUntil = Math.floor((nextNapTime.getTime() - now.getTime()) / 1000 / 60);
              
              if (minutesUntil > 0 && minutesUntil < 480) { // Mostrar solo si falta menos de 8 horas
                const hours = Math.floor(minutesUntil / 60);
                const mins = minutesUntil % 60;
                const timeUntilText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
                
                return (
                  <View style={styles.sleepInfoCard}>
                    <View style={styles.sleepInfoIconContainer}>
                      <Ionicons name="time-outline" size={32} color="#887CBC" />
          </View>
                    <View style={styles.sleepInfoContent}>
                      <Text style={styles.sleepInfoValue}>{timeUntilText}</Text>
                      <Text style={styles.sleepInfoLabel}>Hasta próxima siesta</Text>
        </View>
                  </View>
                );
              }
              return null;
            })()}

            {/* Tiempo total de siestas del día */}
            {sleepPrediction.prediction.dailySchedule && (() => {
              const completedNaps = sleepPrediction.prediction.dailySchedule.allNaps.filter(
                (nap: any) => nap.type === 'completed' || nap.status === 'completed'
              );
              
              const totalMinutes = completedNaps.reduce((total: number, nap: any) => {
                return total + (nap.actualDuration || nap.duration || 0);
              }, 0);
              
              if (totalMinutes > 0) {
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                const totalTimeText = hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
                
                return (
                  <View style={styles.sleepInfoCard}>
                    <View style={styles.sleepInfoIconContainer}>
                      <Ionicons name="moon" size={32} color="#667eea" />
                    </View>
                    <View style={styles.sleepInfoContent}>
                      <Text style={styles.sleepInfoValue}>{totalTimeText}</Text>
                      <Text style={styles.sleepInfoLabel}>Total de siestas hoy</Text>
                    </View>
                  </View>
                );
              }
              return null;
            })()}

            {/* Estado del bebé (energía) - cuando hay actividades Y NO está durmiendo */}
            {!activeSleep && activitySuggestions?.currentState && (
              <View style={styles.sleepInfoCard}>
                <View style={styles.sleepInfoIconContainer}>
                  <Ionicons name="flash" size={32} color="#F59E0B" />
                </View>
                <View style={styles.sleepInfoContent}>
                  <Text style={styles.sleepInfoValue}>
                    {activitySuggestions.currentState.hoursAwake}h
                  </Text>
                  <Text style={styles.sleepInfoLabel}>
                    {activitySuggestions.currentState.energyLevelDisplay.replace('⚡ ', '')}
                  </Text>
                </View>
              </View>
            )}

            {/* Cuando está durmiendo: mostrar tiempo hasta siguiente siesta o bedtime */}
            {activeSleep && sleepPrediction?.prediction?.bedtime?.time && (() => {
              // Buscar la siesta en progreso
              const allNaps = sleepPrediction?.prediction?.dailySchedule?.allNaps || [];
              
              const inProgressNap = allNaps.find(
                (nap: any) => nap.status === 'in_progress' || nap.isInProgress === true
              );
              
              if (!inProgressNap) {
                return null;
              }
              
              const currentNapIndex = allNaps.findIndex(
                (nap: any) => nap.status === 'in_progress' || nap.isInProgress === true
              );
              
              // Buscar la siguiente siesta (después de la actual)
              const nextNap = allNaps.find(
                (nap: any, index: number) => 
                  index > currentNapIndex && 
                  (nap.type === 'prediction' || nap.status === 'upcoming')
              );
              
              const now = new Date();
              let timeText = '';
              let labelText = '';
              let iconName: any = 'time-outline';
              let iconColor = '#887CBC';
              
              // Si hay siguiente siesta, intentar usarla
              if (nextNap) {
                const nextNapTime = new Date(nextNap.time);
                const minutesUntil = Math.floor((nextNapTime.getTime() - now.getTime()) / 1000 / 60);
                
                // Solo usar si es futuro (positivo) Y falta más de 30 minutos
                if (minutesUntil > 30) {
                  timeText = formatDuration(minutesUntil, true);
                  labelText = 'Para próxima siesta';
                  iconName = 'moon-outline';
                  iconColor = '#667eea';
                }
              }
              
              // Si no hay siguiente siesta válida o ya está muy cerca, mostrar bedtime
              if (!timeText) {
                const bedtimeISO = sleepPrediction.prediction.bedtime.time;
                const timePart = bedtimeISO.split('T')[1];
                const [hours, minutes] = timePart.split(':').map(Number);
                
                const bedtime = new Date();
                bedtime.setHours(hours, minutes, 0, 0);
                
                // Si la hora ya pasó hoy, es para mañana
                if (bedtime.getTime() < now.getTime()) {
                  bedtime.setDate(bedtime.getDate() + 1);
                }
                
                const minutesUntil = Math.floor((bedtime.getTime() - now.getTime()) / 1000 / 60);
                
                if (minutesUntil > 0) {
                  timeText = formatDuration(minutesUntil, true);
                  labelText = 'Para dormir';
                  iconName = 'bed-outline';
                  iconColor = '#4B5563';
                }
              }
              
              if (timeText) {
                return (
                  <View style={styles.sleepInfoCard}>
                    <View style={styles.sleepInfoIconContainer}>
                      <Ionicons name={iconName} size={32} color={iconColor} />
                    </View>
                    <View style={styles.sleepInfoContent}>
                      <Text style={styles.sleepInfoValue}>{timeText}</Text>
                      <Text style={styles.sleepInfoLabel}>{labelText}</Text>
                    </View>
                  </View>
                );
              }
              
              return null;
            })()}
          </View>
        )}

        {/* Sugerencias de Actividades - solo cuando el bebé está DESPIERTO y tiene energía (presión baja) */}
        {selectedChild && !activeSleep && activitySuggestions && sleepPrediction?.prediction?.sleepPressure?.level === 'low' && (
          <View style={styles.activitiesSection}>
            <View style={styles.activitiesSectionHeader}>
              <Text style={styles.activitiesSectionTitle}>
                Actividades para {selectedChild.name}
              </Text>
            </View>
            
            {/* Advertencia si está cansado */}
            {activitySuggestions.suggestions.warningIfTired && (
              <View style={styles.activityWarning}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.activityWarningText}>
                  {activitySuggestions.suggestions.warningIfTired}
                </Text>
              </View>
            )}

            {/* Lista de actividades */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.activitiesScrollView}
              contentContainerStyle={styles.activitiesScrollContent}
            >
              {activitySuggestions.suggestions.activities.map((activity: any, index: number) => (
                <View key={index} style={styles.activityCard}>
                  {/* Categoría e intensidad */}
                  <View style={styles.activityCardHeader}>
                    <View style={[
                      styles.activityCategoryBadge,
                      { backgroundColor: getCategoryColor(activity.category) }
                    ]}>
                      <Text style={styles.activityCategoryText}>
                        {getCategoryIcon(activity.category)} {activity.category}
                      </Text>
                    </View>
                    <View style={[
                      styles.activityIntensityBadge,
                      { backgroundColor: getIntensityColor(activity.intensity) }
                    ]}>
                      <Text style={styles.activityIntensityText}>
                        {activity.intensity}
            </Text>
          </View>
        </View>

                  {/* Título */}
                  <Text style={styles.activityCardTitle}>{activity.title}</Text>

                  {/* Descripción */}
                  <Text style={styles.activityCardDescription}>
                    {activity.description}
                  </Text>

                  {/* Duración */}
                  <View style={styles.activityCardFooter}>
                    <Ionicons name="time-outline" size={16} color="#888" />
                    <Text style={styles.activityCardDuration}>
                      {activity.duration} min
                    </Text>
                  </View>

                  {/* Beneficio */}
                  <Text style={styles.activityCardBenefit}>
                    ✨ {activity.developmentBenefit}
                  </Text>

                  {/* Materiales */}
                  {activity.materials && activity.materials.length > 0 && (
                    <Text style={styles.activityCardMaterials}>
                      📦 {activity.materials.join(', ')}
                    </Text>
                  )}
                </View>
              ))}
            </ScrollView>

            {/* Tip general */}
            {activitySuggestions.suggestions.generalTip && (
              <View style={styles.activityGeneralTip}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.activityGeneralTipText}>
                  {activitySuggestions.suggestions.generalTip}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Carrusel de Banners - Solo en pestaña de sueño */}
        <BannerCarousel section="home" />
        </>
        )}

        {/* Sección de Medicamentos */}
        {homeTab === 'medications' && selectedChild && (
          <View style={styles.medicationsSection}>
            {/* Header */}
            <View style={styles.medicationsHeader}>
              <View>
                <Text style={styles.medicationsTitle}>Medicamentos</Text>
                <Text style={styles.medicationsSubtitle}>
                  {medications.filter(m => m.active).length} activos
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addMedicationButton}
                onPress={openAddMedicationModal}
              >
                <Ionicons name="add-circle" size={20} color="#887CBC" />
                <Text style={styles.addMedicationButtonText}>Agregar</Text>
              </TouchableOpacity>
            </View>

            {/* Lista de medicamentos */}
            {loadingMedications ? (
              <View style={styles.medicationsLoadingCard}>
                <ActivityIndicator size="small" color="#887CBC" />
                <Text style={styles.medicationsLoadingText}>Cargando medicamentos...</Text>
              </View>
            ) : medications.length === 0 ? (
              <View style={styles.emptyMedicationsCard}>
                <Ionicons name="medkit-outline" size={48} color="#CCC" />
                <Text style={styles.emptyMedicationsText}>No hay medicamentos registrados</Text>
                <Text style={styles.emptyMedicationsSubtext}>
                  Presiona "Agregar" para registrar un medicamento
                </Text>
              </View>
            ) : (
              medications.map((medication) => (
                <TouchableOpacity
                  key={medication.id}
                  style={styles.medicationCard}
                  onPress={() => {
                    setSelectedMedication(medication);
                    setShowMedicationDetailModal(true);
                  }}
                >
                  <View style={styles.medicationCardHeader}>
                    <Text style={styles.medicationName}>{medication.name}</Text>
                    <View style={[
                      styles.medicationStatus,
                      { backgroundColor: medication.active ? '#4CAF50' : '#999' }
                    ]}>
                      <Text style={styles.medicationStatusText}>
                        {medication.active ? 'Activo' : 'Finalizado'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.medicationCardBody}>
                    <View style={styles.medicationInfoRow}>
                      <Ionicons name="water" size={16} color="#666" />
                      <Text style={styles.medicationInfoText}>
                        {medication.dose} {medication.doseUnit}
                      </Text>
                    </View>
                    
                    {getMedicationTimes(medication).length > 0 && (
                      <View style={styles.medicationInfoRow}>
                        <Ionicons name="time" size={16} color="#666" />
                        <Text style={styles.medicationInfoText}>
                          {getScheduleSummary(getMedicationTimes(medication))}
                        </Text>
                      </View>
                    )}
                    
                    {medication.notes && (
                      <View style={styles.medicationInfoRow}>
                        <Ionicons name="document-text" size={16} color="#666" />
                        <Text style={styles.medicationInfoText} numberOfLines={1}>
                          {medication.notes}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}



        {/* Espacio final - con padding extra para el botón fijo */}
        <View style={[styles.finalSpacing, { height: 100 }]} />
      </ScrollView>

      {/* Botón añadir siesta FIJO - solo cuando NO hay siesta activa Y en pestaña de sueño */}
      {selectedChild && !activeSleep && homeTab === 'sleep' && (() => {
        // Verificar si faltan 30 min o menos para bedtime
        let isBedtimeSoon = false;
        let minutesUntilBedtime = 0;
        
        if (sleepPrediction?.prediction?.bedtime?.time) {
          const now = new Date();
          const bedtimeISO = sleepPrediction.prediction.bedtime.time;
          
          // Extraer hora directamente del string
          const timePart = bedtimeISO.split('T')[1];
          const [hours, minutes] = timePart.split(':').map(Number);
          
          // Crear fecha con la hora local de hoy
          const bedtime = new Date();
          bedtime.setHours(hours, minutes, 0, 0);
          
          // Si la hora ya pasó hoy, es para mañana
          if (bedtime.getTime() < now.getTime()) {
            bedtime.setDate(bedtime.getDate() + 1);
          }
          
          // Calcular minutos hasta bedtime
          minutesUntilBedtime = Math.floor((bedtime.getTime() - now.getTime()) / 1000 / 60);
          isBedtimeSoon = minutesUntilBedtime > 0 && minutesUntilBedtime <= 30;
        }
        
        return (
          <View style={styles.fixedButtonContainer}>
            <TouchableOpacity
              style={styles.fixedAddButton}
              onPress={() => {
                if (isBedtimeSoon) {
                  // Registrar hora de dormir
                  handleRecordBedtime();
                } else if (!wakeTimeToday) {
                  setSelectedWakeTime(new Date());
                  setShowWakeTimeModal(true);
                } else {
                  // @ts-ignore
                  navigation.navigate('SleepTracker', { childId: selectedChild?.id });
                }
              }}
            >
              <Ionicons 
                name={isBedtimeSoon ? "moon" : (wakeTimeToday ? "add-circle" : "sunny")} 
                size={28} 
                color="#FFF" 
              />
              <Text style={styles.fixedAddButtonText}>
                {isBedtimeSoon 
                  ? "registrar hora de dormir" 
                  : (wakeTimeToday ? "añadir siesta" : "agregar hora de despertar")
                }
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

      {/* Botón agregar medicamento - solo en pestaña de medicamentos */}
      {selectedChild && homeTab === 'medications' && (
        <View style={styles.fixedButtonContainer}>
          <TouchableOpacity
            style={styles.fixedAddButton}
            onPress={openAddMedicationModal}
          >
            <Ionicons name="add-circle" size={28} color="#FFF" />
            <Text style={styles.fixedAddButtonText}>agregar medicamento</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Barra FIJA de "Durmiendo siesta" - solo cuando HAY siesta activa */}
      {selectedChild && activeSleep && (
        <View style={styles.fixedSleepBarContainer}>
          <View style={styles.fixedSleepBarInner}>
            {/* Info y controles en una sola línea */}
            <View style={styles.fixedSleepRow}>
              {/* Ícono y tiempo */}
              <View style={styles.fixedSleepTimeDisplay}>
                <Ionicons name="moon" size={24} color="#FFF" />
                <Text style={styles.fixedSleepTime}>
                  {formatDuration(elapsedSleepTime / 60, true)}
                </Text>
              </View>
              
              {/* Barra de progreso compacta */}
              {(() => {
                const inProgressNap = sleepPrediction?.prediction?.dailySchedule?.allNaps?.find(
                  (nap: any) => nap.status === 'in_progress' || nap.isInProgress === true
                );
                
                const expectedDuration = inProgressNap?.expectedDuration || 
                                       sleepPrediction?.prediction?.nextNap?.expectedDuration || 60;
                const elapsedMinutes = elapsedSleepTime / 60;
                const progress = Math.min((elapsedMinutes / expectedDuration) * 100, 100);
                
                return (
                  <View style={styles.fixedSleepProgressBar}>
                    <View 
                      style={[
                        styles.fixedSleepProgressFill, 
                        { width: `${progress}%` }
                      ]} 
                    />
                  </View>
                );
              })()}
              
              {/* Tiempo restante */}
              {(() => {
                const inProgressNap = sleepPrediction?.prediction?.dailySchedule?.allNaps?.find(
                  (nap: any) => nap.status === 'in_progress' || nap.isInProgress === true
                );
                
                const expectedDuration = inProgressNap?.expectedDuration || 
                                       sleepPrediction?.prediction?.nextNap?.expectedDuration || 60;
                const elapsedMinutes = elapsedSleepTime / 60;
                const remainingMinutes = Math.max(expectedDuration - elapsedMinutes, 0);
                
                return (
                  <View style={styles.fixedSleepRemaining}>
                    <Ionicons name="flag" size={14} color="#FFF" />
                    <Text style={styles.fixedSleepRemainingText}>
                      {formatDuration(remainingMinutes, false)}
                    </Text>
                  </View>
                );
              })()}
              
              {/* Botones de control */}
              <View style={styles.fixedSleepButtons}>
                {isPaused ? (
                  <TouchableOpacity
                    style={styles.fixedSleepBtn}
                    onPress={handleResumeSleep}
                  >
                    <Ionicons name="play" size={24} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.fixedSleepBtn}
                    onPress={handlePauseSleep}
                  >
                    <Ionicons name="pause" size={24} color="#FFF" />
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={styles.fixedSleepBtn}
                  onPress={handleStopSleep}
                >
                  <Ionicons name="stop" size={24} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}


      {/* OCULTAR TODA LA SECCIÓN DE PROGRESO DE HOY */}
      {false && (
                      <View style={styles.dailyProgressCard}>
                        {/* Header mejorado */}
                        <View style={styles.dailyProgressHeader}>
                          <View style={styles.dailyProgressTitleContainer}>
                            <Ionicons name="calendar-outline" size={20} color="#887CBC" />
                            <Text style={styles.dailyProgressTitle}>Progreso de Hoy</Text>
                          </View>
                          <View style={styles.progressBadge}>
                            <Text style={styles.progressBadgeText}>
                              {sleepPrediction.prediction.dailySchedule.completed}/{sleepPrediction.prediction.dailySchedule.totalExpected}
                            </Text>
                          </View>
                        </View>
                        
                        {/* Barra de progreso visual */}
                        <View style={styles.progressBarContainer}>
                          <View style={styles.progressBarBackground}>
                            <View style={[
                              styles.progressBarFill,
                              { 
                                width: `${sleepPrediction.prediction.dailySchedule.progress.percentage}%` 
                              }
                            ]} />
                          </View>
                        </View>
                        
                        {/* Lista de siestas vertical mejorada */}
                        <View style={styles.napsList}>
                          {sleepPrediction.prediction.dailySchedule.allNaps.map((nap: any, index: number) => {
                            // Mejorar detección de estados según cambios del backend
                            const isInProgress = nap.status === 'in_progress' || nap.isInProgress === true;
                            const isCompleted = (nap.type === 'completed' || nap.status === 'completed') && !isInProgress;
                            const isPrediction = nap.type === 'prediction' || nap.status === 'upcoming';
                            const isNext = isPrediction && nap.napNumber === sleepPrediction.prediction?.nextNap?.napNumber;
                            
                            // Calcular minutos hasta la siesta
                            const now = new Date();
                            const napTime = new Date(nap.time); // Convierte automáticamente de UTC a hora local
                            const minutesUntil = Math.floor((napTime.getTime() - now.getTime()) / 1000 / 60);
                            
                            // Duración de la siesta (priorizar actualDuration, luego expectedDuration)
                            const napDuration = nap.actualDuration || nap.expectedDuration || nap.duration || 0;
                            
                            // Determinar el label de la siesta según su estado
                            let napLabel = '';
                            if (isInProgress) {
                              napLabel = `Siesta ${index + 1} (En progreso)`;
                            } else if (isCompleted) {
                              napLabel = `Siesta ${index + 1}`;
                            } else {
                              napLabel = `Predicción ${nap.napNumber || index + 1}`;
                            }
                            
                            return (
                              <View key={nap.id || index} style={styles.napItem}>
                                {/* Indicador visual */}
                                <View style={styles.napIndicatorContainer}>
                                  <View style={[
                                    styles.napIndicator,
                                    isCompleted && styles.napIndicatorCompleted,
                                    isInProgress && styles.napIndicatorInProgress,
                                    isNext && styles.napIndicatorNext
                                  ]}>
                                    {isCompleted ? (
                                      <Ionicons name="checkmark" size={16} color="#FFF" />
                                    ) : isInProgress ? (
                                      <Ionicons name="hourglass" size={16} color="#FFF" />
                                    ) : (
                                      <Text style={styles.napIndicatorText}>{nap.napNumber || index + 1}</Text>
                                    )}
                                  </View>
                                  {index < sleepPrediction.prediction.dailySchedule.allNaps.length - 1 && (
                                    <View style={[
                                      styles.napConnectorLine,
                                      isCompleted && styles.napConnectorLineCompleted
                                    ]} />
                                  )}
                                </View>
                                
                                {/* Contenido de la siesta */}
                                <View style={[
                                  styles.napContent,
                                  isNext && styles.napContentNext,
                                  isCompleted && styles.napContentPassed
                                ]}>
                                  <View style={styles.napMainInfo}>
                                    <View style={styles.napTimeContainer}>
                                      <Ionicons 
                                        name={isCompleted ? "checkmark-circle" : (isNext ? "time" : "moon-outline")} 
                                        size={18} 
                                        color={isCompleted ? "#2ECC71" : (isNext ? "#887CBC" : "#A0AEC0")} 
                                      />
                                      <Text style={[
                                        styles.napTime,
                                        isCompleted && styles.napTimePassed
                                      ]}>
                                        {isCompleted 
                                          ? `${formatTimeFromISOToLocal(nap.startTime || nap.time)}${nap.endTime ? ` - ${formatTimeFromISOToLocal(nap.endTime)}` : ''}`
                                          : formatTimeFromISO(nap.time)
                                        }
                                      </Text>
                                    </View>
                                    <Text style={[
                                      styles.napType,
                                      isCompleted && styles.napTypePassed
                                    ]}>
                                      {napLabel}
                                    </Text>
                                  </View>
                                  
                                  {/* Info adicional */}
                                  <View style={styles.napMetadata}>
                                    <View style={styles.napDurationBadge}>
                                      <Ionicons name="hourglass-outline" size={12} color="#718096" />
                                      <Text style={styles.napDurationText}>
                                        {napDuration} min
                                      </Text>
                                    </View>
                                    
                                    {/* Badge de confianza - solo para predicciones */}
                                    {!isCompleted && nap.confidence && nap.confidence >= 65 && (
                                      <View style={styles.napConfidenceBadge}>
                                        <Ionicons name="sparkles" size={10} color="#FFD700" />
                                        <Text style={styles.napConfidenceText}>
                                          {nap.confidence >= 85 ? 'Patrón aprendido' : 'Aprendiendo'}
                                        </Text>
                                      </View>
                                    )}
                                    
                                    {isNext && minutesUntil > 0 && (
                                      <View style={styles.napCountdownBadge}>
                                        <Text style={styles.napCountdownText}>
                                          En {minutesUntil} min
                                        </Text>
                                      </View>
                                    )}
                                    
                                    {isNext && minutesUntil <= 0 && minutesUntil > -60 && (
                                      <View style={styles.napNowBadge}>
                                        <Text style={styles.napNowText}>¡AHORA!</Text>
                                      </View>
                                    )}
                                  </View>
                                </View>
                              </View>
                            );
                          })}
                          
                          {/* Hora de dormir */}
                          {sleepPrediction.prediction?.bedtime?.time && (
                            <View style={styles.napItem}>
                              <View style={styles.napIndicatorContainer}>
                                <View style={styles.bedtimeIndicator}>
                                  <Ionicons name="moon" size={16} color="#FFF" />
                                </View>
                              </View>
                              <View style={styles.bedtimeContent}>
                                <View style={styles.napMainInfo}>
                                  <View style={styles.napTimeContainer}>
                                    <Ionicons name="bed-outline" size={18} color="#667eea" />
                                    <Text style={styles.bedtimeTime}>
                                      {formatTimeWithoutTimezone(sleepPrediction.prediction.bedtime.time, false)}
                                    </Text>
                                  </View>
                                  <Text style={styles.bedtimeLabel}>Hora de Dormir</Text>
                                </View>
                              </View>
                            </View>
                          )}
                        </View>
          </View>
        )}


      {/* Modal para registrar hora de despertar */}
      <Modal
        visible={showWakeTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWakeTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.wakeModalContent}>
            <Text style={styles.wakeModalTitle}>
              ¿A qué hora despertó {selectedChild?.name}?
            </Text>

            {/* Botón rápido "Ahora" */}
            <TouchableOpacity
              style={styles.wakeNowButton}
              onPress={() => {
                setSelectedWakeTime(new Date());
              }}
            >
              <Ionicons name="flash" size={20} color="#FFA726" />
              <Text style={styles.wakeNowButtonText}>Ahora</Text>
            </TouchableOpacity>
            
            <View style={styles.modalTimeSection}>
              <Text style={styles.modalLabel}>O selecciona la hora:</Text>
              
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={selectedWakeTime}
                  mode="time"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    if (date) {
                      const today = new Date();
                      const newTime = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        date.getHours(),
                        date.getMinutes()
                      );
                      setSelectedWakeTime(newTime);
                    }
                  }}
                  style={styles.dateTimePicker}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.wakeTimeButton}
                    onPress={() => setShowWakeTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={24} color="#FFA726" />
                    <Text style={styles.wakeTimeButtonText}>
                      {selectedWakeTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </Text>
                  </TouchableOpacity>
                  
                  {showWakeTimePicker && (
                    <DateTimePicker
                      value={selectedWakeTime}
                      mode="time"
                      display="default"
                      onChange={(event, date) => {
                        setShowWakeTimePicker(false);
                        if (date) {
                          const today = new Date();
                          const newTime = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate(),
                            date.getHours(),
                            date.getMinutes()
                          );
                          setSelectedWakeTime(newTime);
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowWakeTimeModal(false)}
              >
                <Text style={{ fontSize: 16, color: '#FFF' }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.wakeModalConfirmButton]}
                onPress={handleRecordWakeTime}
              >
                <Text style={styles.modalConfirmText}>Registrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de detalles de elementos de la órbita */}
      <Modal
        visible={showOrbitDetailModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowOrbitDetailModal(false)}
      >
        <TouchableOpacity 
          style={styles.orbitDetailOverlay}
          activeOpacity={1}
          onPress={() => setShowOrbitDetailModal(false)}
        >
          <TouchableOpacity 
            style={styles.orbitDetailContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Ícono según tipo */}
            <View style={styles.orbitDetailIcon}>
              {orbitDetailData?.type === 'wakeTime' && (
                <Ionicons name="sunny" size={40} color="#FFA500" />
              )}
              {orbitDetailData?.type === 'bedtime' && (
                <Ionicons name="moon" size={40} color="#7F7FD5" />
              )}
              {orbitDetailData?.type === 'nap' && (
                <Ionicons name="bed" size={40} color="#56CCF2" />
              )}
            </View>

            {/* Título */}
            <Text style={styles.orbitDetailTitle}>
              {orbitDetailData?.title}
            </Text>

            {/* Hora destacada */}
            <View style={styles.orbitDetailTimeContainer}>
              <Ionicons name="time-outline" size={24} color="#667EEA" />
              <Text style={styles.orbitDetailTime}>
                {orbitDetailData?.time}
              </Text>
            </View>

            {/* Lista de detalles */}
            <View style={styles.orbitDetailList}>
              {orbitDetailData?.details?.map((detail: string, index: number) => (
                <View key={index} style={styles.orbitDetailItem}>
                  <View style={styles.orbitDetailBullet} />
                  <Text style={styles.orbitDetailText}>{detail}</Text>
                </View>
              ))}
            </View>

            {/* Botón cerrar */}
            <TouchableOpacity
              style={styles.orbitDetailCloseButton}
              onPress={() => setShowOrbitDetailModal(false)}
            >
              <Text style={styles.orbitDetailCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal para agregar/editar medicamento */}
      <Modal
        visible={showMedicationModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowMedicationModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.medModalContainer}
        >
          <ScrollView>
            <View style={styles.medModalHeader}>
              <TouchableOpacity onPress={() => setShowMedicationModal(false)}>
                <Text style={styles.medModalCancelButton}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={styles.medModalTitle}>
                {editingMedication ? 'Editar Medicamento' : 'Nuevo Medicamento'}
              </Text>
              <TouchableOpacity onPress={handleSaveMedication}>
                <Text style={styles.medModalSaveButton}>Guardar</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.medModalBody}>
              {/* Nombre */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Nombre del medicamento</Text>
                <TextInput
                  style={styles.medInput}
                  value={medName}
                  onChangeText={setMedName}
                  placeholder="Ej: Paracetamol"
                />
              </View>

              {/* Dosis */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Dosis</Text>
                <View style={styles.medInputRow}>
                  <TextInput
                    style={[styles.medInput, { flex: 2 }]}
                    value={medDose}
                    onChangeText={setMedDose}
                    placeholder="5"
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.medInput, { flex: 1, marginLeft: 10 }]}
                    value={medDoseUnit}
                    onChangeText={setMedDoseUnit}
                    placeholder="ml"
                  />
                </View>
              </View>

              {/* Modo de programación */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>¿Cómo programar?</Text>
                <View style={styles.medSegmentedControl}>
                  <TouchableOpacity
                    style={[styles.medSegment, medScheduleMode === 'interval' && styles.medActiveSegment]}
                    onPress={() => setMedScheduleMode('interval')}
                  >
                    <Text style={[styles.medSegmentText, medScheduleMode === 'interval' && styles.medActiveSegmentText]}>
                      Cada X horas
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.medSegment, medScheduleMode === 'times' && styles.medActiveSegment]}
                    onPress={() => setMedScheduleMode('times')}
                  >
                    <Text style={[styles.medSegmentText, medScheduleMode === 'times' && styles.medActiveSegmentText]}>
                      Horas exactas
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Intervalo (Cada X horas) */}
              {medScheduleMode === 'interval' && (
                <>
                  <View style={styles.medInputGroup}>
                    <Text style={styles.medInputLabel}>Cada cuántas horas</Text>
                    <TextInput
                      style={styles.medInput}
                      value={medEveryHours}
                      onChangeText={setMedEveryHours}
                      placeholder="Ej: 8"
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.medInputHelper}>
                      Puedes usar decimales (ej: 0.1 = 6 min, 0.5 = 30 min, 1 = 1 hora)
                    </Text>
                  </View>

                  <View style={styles.medInputGroup}>
                    <Text style={styles.medInputLabel}>Primera toma</Text>
                    <TouchableOpacity
                      style={styles.medDateButton}
                      onPress={() => setShowMedFirstDosePicker(true)}
                    >
                      <Text style={styles.medDateButtonText}>
                        {medFirstDose.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </TouchableOpacity>
                    {showMedFirstDosePicker && (
                      <DateTimePicker
                        value={medFirstDose}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event, date) => {
                          setShowMedFirstDosePicker(Platform.OS === 'ios');
                          if (date) setMedFirstDose(date);
                        }}
                      />
                    )}
                  </View>
                </>
              )}

              {/* Horas exactas */}
              {medScheduleMode === 'times' && (
                <View style={styles.medInputGroup}>
                  <Text style={styles.medInputLabel}>Horarios</Text>
                  {medTimes.map((time, index) => (
                    <View key={index} style={styles.medTimeRow}>
                      <TouchableOpacity
                        style={styles.medTimeButton}
                        onPress={() => {
                          setEditingTimeIndex(index);
                          setShowMedTimePicker(true);
                        }}
                      >
                        <Text style={styles.medTimeButtonText}>{time}</Text>
                      </TouchableOpacity>
                      {medTimes.length > 1 && (
                        <TouchableOpacity
                          onPress={() => {
                            const newTimes = medTimes.filter((_, i) => i !== index);
                            setMedTimes(newTimes);
                          }}
                        >
                          <Ionicons name="trash" size={20} color="#F44336" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.medAddTimeButton}
                    onPress={() => setMedTimes([...medTimes, '09:00'])}
                  >
                    <Ionicons name="add-circle" size={20} color="#887CBC" />
                    <Text style={styles.medAddTimeButtonText}>Agregar horario</Text>
                  </TouchableOpacity>
                  {showMedTimePicker && editingTimeIndex !== null && (
                    <DateTimePicker
                      value={new Date(`2000-01-01T${medTimes[editingTimeIndex]}:00`)}
                      mode="time"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={(event, date) => {
                        setShowMedTimePicker(Platform.OS === 'ios');
                        if (date) {
                          const newTimes = [...medTimes];
                          newTimes[editingTimeIndex!] = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                          setMedTimes(newTimes);
                        }
                        if (event.type === 'set') {
                          setEditingTimeIndex(null);
                        }
                      }}
                    />
                  )}
                </View>
              )}

              {/* Fechas */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Fecha de inicio</Text>
                <TouchableOpacity
                  style={styles.medDateButton}
                  onPress={() => setShowMedStartDatePicker(true)}
                >
                  <Text style={styles.medDateButtonText}>
                    {medStartDate.toLocaleDateString('es-ES')}
                  </Text>
                </TouchableOpacity>
                {showMedStartDatePicker && (
                  <DateTimePicker
                    value={medStartDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event, date) => {
                      setShowMedStartDatePicker(Platform.OS === 'ios');
                      if (date) setMedStartDate(date);
                    }}
                  />
                )}
              </View>

              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Fecha de fin (opcional)</Text>
                <TouchableOpacity
                  style={styles.medDateButton}
                  onPress={() => setShowMedEndDatePicker(true)}
                >
                  <Text style={styles.medDateButtonText}>
                    {medEndDate ? medEndDate.toLocaleDateString('es-ES') : 'Sin fecha de fin'}
                  </Text>
                </TouchableOpacity>
                {medEndDate && (
                  <TouchableOpacity
                    style={styles.medRemoveButton}
                    onPress={() => setMedEndDate(null)}
                  >
                    <Text style={styles.medRemoveButtonText}>Quitar</Text>
                  </TouchableOpacity>
                )}
                {showMedEndDatePicker && (
                  <DateTimePicker
                    value={medEndDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'compact' : 'default'}
                    onChange={(event, date) => {
                      setShowMedEndDatePicker(Platform.OS === 'ios');
                      if (date) setMedEndDate(date);
                    }}
                  />
                )}
              </View>

              {/* Notas */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Notas (opcional)</Text>
                <TextInput
                  style={[styles.medInput, styles.medTextArea]}
                  value={medNotes}
                  onChangeText={setMedNotes}
                  placeholder="Ej: Con alimento"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Días a programar */}
              <View style={styles.medInputGroup}>
                <Text style={styles.medInputLabel}>Días a programar</Text>
                <TextInput
                  style={styles.medInput}
                  value={medScheduleDays}
                  onChangeText={setMedScheduleDays}
                  placeholder="14"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de detalle de medicamento */}
      <Modal
        visible={showMedicationDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMedicationDetailModal(false)}
      >
        <View style={styles.medDetailOverlay}>
          <View style={styles.medDetailContent}>
            <View style={styles.medDetailHeader}>
              <Text style={styles.medDetailTitle}>{selectedMedication?.name}</Text>
              <TouchableOpacity onPress={() => setShowMedicationDetailModal(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.medDetailBody}>
              <View style={styles.medDetailRow}>
                <Text style={styles.medDetailLabel}>Dosis:</Text>
                <Text style={styles.medDetailValue}>
                  {selectedMedication?.dose} {selectedMedication?.doseUnit}
                </Text>
              </View>

              <View style={styles.medDetailRow}>
                <Text style={styles.medDetailLabel}>Frecuencia:</Text>
                <Text style={styles.medDetailValue}>
                  {getMedicationTimes(selectedMedication || {}).length > 0
                    ? getScheduleSummary(getMedicationTimes(selectedMedication || {}))
                    : 'No especificado'}
                </Text>
              </View>

              {selectedMedication?.startDate && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Inicio:</Text>
                  <Text style={styles.medDetailValue}>
                    {new Date(selectedMedication.startDate).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}

              {selectedMedication?.endDate && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Fin:</Text>
                  <Text style={styles.medDetailValue}>
                    {new Date(selectedMedication.endDate).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}

              {selectedMedication?.notes && (
                <View style={styles.medDetailRow}>
                  <Text style={styles.medDetailLabel}>Notas:</Text>
                  <Text style={styles.medDetailValue}>{selectedMedication.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.medDetailActions}>
              <TouchableOpacity
                style={[styles.medDetailButton, styles.medDetailEditButton]}
                onPress={() => {
                  setShowMedicationDetailModal(false);
                  openEditMedicationModal(selectedMedication);
                }}
              >
                <Ionicons name="create" size={20} color="#FFF" />
                <Text style={styles.medDetailButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.medDetailButton, styles.medDetailDeleteButton]}
                onPress={() => {
                  Alert.alert(
                    'Eliminar medicamento',
                    '¿Estás seguro de que deseas eliminar este medicamento?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Eliminar',
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            await medicationsService.deleteMedication(selectedMedication.id);
                            setShowMedicationDetailModal(false);
                            if (selectedChild) {
                              await loadMedications(selectedChild.id);
                            }
                            Alert.alert('Éxito', 'Medicamento eliminado');
                          } catch (error) {
                            Alert.alert('Error', 'No se pudo eliminar el medicamento');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash" size={20} color="#FFF" />
                <Text style={styles.medDetailButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#33737d",
    position: "relative",
  },


  // Scroll principal
  scrollView: {
    flex: 1,
  },

  // Sección de saludo
  greetingSection: {
    padding: 20,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  greetingTextContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    zIndex: 2,
    justifyContent: "center",
  },
  greetingHello: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#FFF",
    lineHeight: 36,
    fontFamily: "Montserrat",
  },
  greetingName: {
    fontSize: 36,
    fontWeight: "normal",
    color: "#FFF",
    lineHeight: 36,
    fontFamily: "Montserrat",
  },
  sleepTitleContainer: {
    marginTop: 15,
    marginBottom: 0,
  },
  sleepTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  greenShape: {
    position: "absolute",
    top: 20,
    right: -5,
    width: 170,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  greenShapeFace: {
    width: 170,
    height: 170,
    resizeMode: "contain",
  },

  // Sección motivacional
  motivationalSection: {
    marginBottom: 5,
    alignItems: "center",
  },
  motivationalText: {
    fontSize: 16,
    color: "#59C6C0",
    textAlign: "center",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },

  // Sección de hijos
  childrenSection: {
    paddingLeft: 0,
    paddingRight: 20,
    marginBottom: 35,
  },
  sectionTitle: {
    fontSize: 22,
    marginBottom: 14,
    marginLeft: 20,
    fontFamily: "Montserrat",
  },
  sectionTitle2: {
    fontSize: 22,
    marginBottom: 14,
    marginRight: 20,
    fontFamily: "Montserrat",
  },

  childrenWrapper: {
    backgroundColor: "#8fd8d3",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },
  listWrapper: {
    backgroundColor: "#fcde9d",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 0,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    minHeight: 100,
    alignSelf: "flex-start",
    width: "85%",
  },

  childrenContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },

  addChildButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addChildIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addChildText: {},
  childButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  childImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  childName: {
    textAlign: "center",
    fontFamily: "Montserrat",
  },
  listIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  listImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Sección de comunidades
  communitiesSection: {
    paddingHorizontal: 20,
    paddingLeft: 20,
    paddingRight: 0,
    marginBottom: 35,
  },
  communitiesWrapper: {
    backgroundColor: "#F4b8d3",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomLeftRadius: 25,
    padding: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    minHeight: 100,
    alignSelf: "flex-end",
    width: "90%",
  },
  communitiesScrollView: {
    flex: 1,
  },
  communitiesContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    minHeight: 120,
  },
  addCommunityButton: {
    alignItems: "center",
    width: 80,
    marginRight: 15,
  },
  addCommunityIcon: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#33737d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  addIconText: {
    fontSize: 40,
    color: "#F4b8d3",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addIconText2: {
    fontSize: 40,
    color: "#8fd8d3",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addListIconText: {
    fontSize: 40,
    color: "#fcde9d",
    fontWeight: "bold",
    fontFamily: "Montserrat",
  },
  addCommunityText: {
    textAlign: "center",
  },
  communityButton: {
    alignItems: "center",
    width: 95,
    marginRight: 15,
  },
  communityIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    overflow: "hidden",
  },
  communityIconText: {
    fontSize: 32,
    fontFamily: "Montserrat",
  },
  communityName: {
    textAlign: "center",
    fontFamily: "Montserrat",
  },

  // Estilos nuevos para comunidades dinámicas
  communitiesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  scrollHint: {
    fontSize: 12,
    color: "#999",
    marginRight: 10,
    fontStyle: "italic",
    fontFamily: "Montserrat",
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
    marginRight: 4,
    fontFamily: "Montserrat",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },
  emptyCommunitiesContainer: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyMessageOutside: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyMessageOutsideText: {
    fontSize: 14,
    color: "#666",
    textAlign: "left",
    fontWeight: "500",
    fontFamily: "Montserrat",
  },
  emptyMessageInline: {
    backgroundColor: "#F0F9F8",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#59C6C0",
  },
  emptyMessageText: {
    fontSize: 15,
    color: "#59C6C0",
    textAlign: "left",
    fontWeight: "600",
    fontFamily: "Montserrat",
  },
  emptyCommunitiesMessageWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: 10,
  },
  emptyCommunitiesMessage: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
    minWidth: 200,
  },
  emptyCommunitiesText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    fontWeight: "500",
  },
  joinCommunitiesButton: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  joinCommunitiesText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  communityImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },

  // Banner de DOULI
  douliBanner: {
    backgroundColor: "#96d2d3",
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingRight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  douliTextContainer: {
    flex: 1,
    marginRight: 25,
  },
  douliTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  douliSubtitle: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  douliAvatar: {
    position: "absolute",
    right: -10,
    top: -35,
    padding: 8,
    zIndex: 1001,
  },
  douliAvatarImage: {
    width: 70,
    height: 70,
    borderRadius: 30,
    resizeMode: "contain",
  },

  // Espaciado final
  finalSpacing: {
    height: 100,
  },

  // Estilos del modal de crear comunidad
  modalContainer: {
    flex: 1,
    backgroundColor: "#33737d",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#33737d',
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },

  // Sección de imagen
  imageSection: {
    marginBottom: 25,
  },
  imagePicker: {
    marginBottom: 15,
  },
  imagePlaceholder: {
    height: 140,
    backgroundColor: '#33737d',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  imageSelectedContainer: {
    position: "relative",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
  },
  selectedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageSelectedOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  imageSelectedText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 5,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#33737d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  imageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#59C6C0",
    fontWeight: "600",
  },
  imageInfo: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#E8F5E8",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  imageInfoText: {
    flex: 1,
    fontSize: 14,
    color: "#2E7D2E",
    fontWeight: "500",
  },
  removeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
  },
  removeImageText: {
    marginLeft: 4,
    fontSize: 12,
    color: "#FF6B6B",
    fontWeight: "500",
  },

  // Sección de formulario
  formSection: {
    marginBottom: 25,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#33737d',
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },

  // Sección de privacidad
  privacySection: {
    marginTop: 20,
  },
  privacyOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: '#33737d',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#59C6C0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#96d2d3',
  },
  privacyInfo: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },

  // Acciones del modal
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#33737d',
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    marginRight: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  createButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    backgroundColor: '#96d2d3',
    borderRadius: 12,
    marginLeft: 10,
  },
  createButtonDisabled: {
    backgroundColor: "#A0A0A0",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginLeft: 8,
  },

  // Estilos de Sleep Card
  sleepSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  wakeTimeCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#FFA726',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wakeTimeGradient: {
    padding: 20,
  },
  wakeTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  wakeTimeInfo: {
    flex: 1,
  },
  wakeTimeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  wakeTimeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },
  wakeTimeHint: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Montserrat',
    lineHeight: 18,
  },
  sleepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sleepHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  sleepDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepDetailsText: {
    fontSize: 14,
    color: '#887CBC',
    fontWeight: '600',
    marginRight: 4,
    fontFamily: 'Montserrat',
  },
  sleepLoadingCard: {
    backgroundColor: '#33737d',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },

  // Card de sueño activo
  activeSleepCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeSleepGradient: {
    padding: 20,
  },
  activeSleepMainContent: {
    gap: 16,
  },
  activeSleepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activeSleepBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeSleepBadgeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeSleepIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  activeSleepEmoji: {
    fontSize: 32,
  },
  activeSleepInfo: {
    flex: 1,
  },
  activeSleepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  activeSleepTime: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },
  activeSleepProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  sleepStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sleepStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  sleepStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  sleepStatLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
    textAlign: 'center',
  },
  sleepStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  sleepProgressBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sleepProgressBarBg: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  sleepProgressBarFill: {
    height: '100%',
    borderRadius: 6,
    minWidth: 12,
  },
  sleepProgressPercentage: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 50,
    alignItems: 'center',
  },
  sleepProgressPercentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  activeSleepSimpleProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  simpleProgressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeSleepElapsed: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  sleepProgressInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  sleepProgressInfoText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontFamily: 'Montserrat',
  },
  sleepControlButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sleepControlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  sleepPauseButton: {
    backgroundColor: 'rgba(255, 193, 7, 0.9)',
  },
  sleepResumeButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
  },
  sleepStopButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
  },
  sleepControlButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },

  // Badge compacto de hora de despertar
  wakeTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  wakeTimeBadgeText: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  
  // Timeline del horario del día - Rediseñado
  dailyProgressCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dailyProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dailyProgressTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyProgressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  progressBadge: {
    backgroundColor: '#F0E6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  progressBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  progressBarContainer: {
    marginBottom: 20,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2ECC71',
    borderRadius: 4,
  },
  napsList: {
    gap: 0,
  },
  napItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  napIndicatorContainer: {
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  napIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  napIndicatorCompleted: {
    backgroundColor: '#2ECC71',
  },
  napIndicatorInProgress: {
    backgroundColor: '#8B5CF6', // Morado para en progreso
  },
  napIndicatorNext: {
    backgroundColor: '#96d2d3',
    borderWidth: 3,
    borderColor: '#F0E6FF',
  },
  napIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napConnectorLine: {
    position: 'absolute',
    top: 32,
    width: 2,
    height: 40,
    backgroundColor: '#E2E8F0',
    zIndex: 1,
  },
  napConnectorLineCompleted: {
    backgroundColor: '#2ECC71',
  },
  napContent: {
    flex: 1,
    backgroundColor: '#33737d',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  napContentNext: {
    backgroundColor: '#F0E6FF',
    borderWidth: 2,
    borderColor: '#887CBC',
  },
  napContentPassed: {
    backgroundColor: '#F0FFF4',
    opacity: 0.7,
  },
  napMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  napTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  napTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napTimePassed: {
    color: '#FFF',
  },
  napType: {
    fontSize: 13,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napTypePassed: {
    color: '#FFF',
  },
  napMetadata: {
    flexDirection: 'row',
    gap: 8,
  },
  napDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  napDurationText: {
    fontSize: 11,
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  napConfidenceText: {
    fontSize: 9,
    color: '#B8860B',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  napCountdownBadge: {
    backgroundColor: '#96d2d3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  napCountdownText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  napNowBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  napNowText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  bedtimeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bedtimeContent: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bedtimeTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#667eea',
    fontFamily: 'Montserrat',
  },
  bedtimeLabel: {
    fontSize: 13,
    color: '#667eea',
    fontFamily: 'Montserrat',
  },

  // Card de presión de sueño
  sleepPressureCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  sleepPressureGradient: {
    padding: 20,
  },
  sleepPressureContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepPressureIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sleepPressureEmoji: {
    fontSize: 32,
  },
  sleepPressureInfo: {
    flex: 1,
  },
  sleepPressureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  sleepPressureSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Montserrat',
  },

  // Contenedor de predicciones
  predictionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  predictionCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  predictionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  predictionLabel: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  predictionTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  predictionDetails: {
    gap: 8,
  },
  predictionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#33737d',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  predictionBadgeText: {
    fontSize: 11,
    color: '#FFF',
    marginLeft: 4,
    fontFamily: 'Montserrat',
  },

  // Card esperando predicciones
  waitingPredictionsCard: {
    backgroundColor: '#F8F4FF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E6D9FF',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  waitingPredictionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  waitingPredictionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  waitingPredictionsText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  waitingPredictionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#96d2d3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  waitingPredictionsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  bedtimePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6D9FF',
  },
  bedtimePreviewInfo: {
    flex: 1,
  },
  bedtimePreviewLabel: {
    fontSize: 12,
    color: '#FFF',
    marginBottom: 2,
    fontFamily: 'Montserrat',
  },
  bedtimePreviewTime: {
    fontSize: 18,
    fontWeight: '700',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  criticalAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF5252',
  },
  criticalAlertText: {
    fontSize: 13,
    color: '#C62828',
    fontWeight: '600',
    fontFamily: 'Montserrat',
    flex: 1,
  },
  
  // Card vacío
  emptySleepCard: {
    backgroundColor: '#33737d',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptySleepEmoji: {
    fontSize: 48,
    marginBottom: 15,
  },
  emptySleepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  emptySleepText: {
    fontSize: 14,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    fontFamily: 'Montserrat',
  },
  emptySleepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#887CBC',
  },
  emptySleepButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
    marginRight: 8,
    fontFamily: 'Montserrat',
  },
  
  // Estilos del modal de hora de despertar
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  wakeModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  wakeModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  wakeNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3E0',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FFA726',
  },
  wakeNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFA726',
    fontFamily: 'Montserrat',
  },
  modalTimeSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    color: '#FFF',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  wakeTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFA726',
    gap: 12,
  },
  wakeTimeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  dateTimePicker: {
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  wakeModalConfirmButton: {
    backgroundColor: '#FFA726',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  
  // Estilos para el planeta animado de presión de sueño
  sleepPlanetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 360, // Contenedor más grande
    height: 360,
    alignSelf: 'center',
  },
  sleepPlanet: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  planetImage: {
    width: 200,
    height: 200,
    zIndex: 1,
  },
  orbitContainer: {
    position: 'absolute',
    width: 360, // Mismo tamaño que sleepPlanetContainer
    height: 360,
    alignItems: 'center',
    justifyContent: 'center',
    left: -80, // Centrar: (360-200)/2 = 80px a la izquierda
    top: -80,  // Centrar: (360-200)/2 = 80px arriba
  },
  orbit: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 200,
  },
  orbitOuter: {
    width: 280,
    height: 280,
  },
  orbitInner: {
    width: 240,
    height: 240,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  orbitDot: {
    position: 'absolute',
    top: -5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD54F',
    shadowColor: '#FFD54F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  napMarker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  napMarkerTime: {
    position: 'absolute',
    left: 18,
    top: -2,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  orbitMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  markerLabel: {
    position: 'absolute',
    top: 26,
    left: -10,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  napDurationLine: {
    position: 'absolute',
    height: 3,
    borderRadius: 1.5,
  },
  napDurationArc: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  napEndMarker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  napEndTime: {
    position: 'absolute',
    left: 14,
    top: -2,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFF',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  hourMark: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  // Estilos para cápsulas de órbita (estilo imagen)
  orbitCapsule: {
    position: 'absolute',
    width: 64,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  capsuleGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    opacity: 0.3,
  },
  capsuleInner: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Estilos para el indicador de hora actual
  currentTimeIndicator: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentTimeGlow: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    opacity: 0.3,
  },
  currentTimeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#FFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  // Segmentos de arco para mostrar duración de siestas
  napArcSegment: {
    position: 'absolute',
  },
  orbitLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  legendText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  
  // Estilos para modal de detalles de órbita
  orbitDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDetailContent: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    maxWidth: 350,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  orbitDetailIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  orbitDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
  },
  orbitDetailTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 8,
  },
  orbitDetailTime: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667EEA',
  },
  orbitDetailList: {
    width: '100%',
    marginBottom: 20,
  },
  orbitDetailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  orbitDetailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667EEA',
    marginTop: 6,
    marginRight: 12,
  },
  orbitDetailText: {
    flex: 1,
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  orbitDetailCloseButton: {
    width: '100%',
    backgroundColor: '#667EEA',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  orbitDetailCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  addRecordButton: {
    alignItems: 'center',
    marginTop: 15,
  },
  addRecordText: {
    fontSize: 12,
    color: '#FFF',
    marginTop: 4,
    fontWeight: '600',
  },
  // Estilos para los recuadros de información
  sleepInfoCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    marginTop: 8, // Reducido de 20 a 8
    marginBottom: 10,
    gap: 12,
  },
  sleepInfoCard: {
    width: '48%', // Ancho fijo para que quepan 2 por fila
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12,
  },
  sleepInfoIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sleepInfoContent: {
    flex: 1,
  },
  sleepInfoValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 2,
  },
  sleepInfoLabel: {
    fontSize: 12,
    color: '#718096',
    fontWeight: '500',
  },
  // Estilos para información en el centro del planeta
  planetCenterInfo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    top: 110,
  },
  // Texto "Durmiendo" arriba sobre la cara
  planetTopText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    top: 10, // Mucho más arriba
  },
  // Tiempo abajo debajo de la cara
  planetBottomText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    top: 135, // Mucho más abajo
  },
  planetCenterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  planetCenterTime: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  planetCenterSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Estilos para controles de siesta activa (debajo del planeta)
  activeSleepControls: {
    marginTop: 20,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  activeSleepControlsInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeSleepTimeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeSleepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(103, 126, 234, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeSleepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepSinceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  activeSleepButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  activeSleepControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  activeSleepPauseBtn: {
    backgroundColor: '#FFA726',
  },
  activeSleepResumeBtn: {
    backgroundColor: '#66BB6A',
  },
  activeSleepStopBtn: {
    backgroundColor: '#EF5350',
  },
  activeSleepButtonControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  // Estilos para sección de actividades
  activitiesSection: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  activitiesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  activitiesSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  activityBabyState: {
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  activityBabyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 4,
  },
  activityBabyStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  activityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  activityWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  activitiesScrollView: {
    marginBottom: 16,
  },
  activitiesScrollContent: {
    gap: 16,
    paddingRight: 20,
  },
  activityCard: {
    width: 280,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  activityCategoryBadge: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activityCategoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  activityIntensityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activityIntensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    textTransform: 'capitalize',
  },
  activityCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  activityCardDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  activityCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  activityCardDuration: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  activityCardBenefit: {
    fontSize: 13,
    color: '#8B5CF6',
    fontWeight: '500',
    marginBottom: 8,
  },
  activityCardMaterials: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  activityGeneralTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  activityGeneralTipText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  // Botón fijo inferior
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  fixedAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#887CBC',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#887CBC',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fixedAddButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    textTransform: 'lowercase',
  },
  // Barra fija de siesta activa en el FOOTER
  fixedSleepBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(44, 62, 80, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 1000,
  },
  fixedSleepBarInner: {
    width: '100%',
  },
  fixedSleepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fixedSleepTimeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 80,
  },
  fixedSleepTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fixedSleepProgressBar: {
    flex: 2,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 12,
  },
  fixedSleepProgressFill: {
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
  },
  fixedSleepRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 50,
  },
  fixedSleepRemainingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  fixedSleepButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  fixedSleepBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  // ============= ESTILOS DE PESTAÑAS =============
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 25,
    marginHorizontal: 20,
    marginVertical: 15,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  activeTabText: {
    color: '#4A5568',
    fontWeight: '700',
  },
  tabBadge: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ============= ESTILOS DE MEDICAMENTOS =============
  medicationsSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  medicationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  medicationsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  medicationsSubtitle: {
    fontSize: 14,
    color: '#FFF',
    opacity: 0.8,
    marginTop: 2,
  },
  addMedicationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  addMedicationButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },
  medicationsLoadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  medicationsLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyMedicationsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
  },
  emptyMedicationsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptyMedicationsSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
  },
  medicationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  medicationStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  medicationStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  medicationCardBody: {
    gap: 8,
  },
  medicationInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  medicationInfoText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },

  // ============= ESTILOS DE MODALES DE MEDICAMENTOS =============
  medModalContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  medModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#887CBC',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  medModalCancelButton: {
    fontSize: 16,
    color: '#FFF',
  },
  medModalSaveButton: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  medModalBody: {
    padding: 20,
  },
  medInputGroup: {
    marginBottom: 20,
  },
  medInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  medInput: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  medInputHelper: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  medTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  medSegmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    padding: 2,
  },
  medSegment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  medActiveSegment: {
    backgroundColor: '#FFF',
  },
  medSegmentText: {
    fontSize: 14,
    color: '#666',
  },
  medActiveSegmentText: {
    color: '#887CBC',
    fontWeight: '600',
  },
  medDateButton: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medDateButtonText: {
    fontSize: 16,
    color: '#333',
  },
  medRemoveButton: {
    marginTop: 8,
    padding: 8,
  },
  medRemoveButtonText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  medTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  medTimeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  medTimeButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  medAddTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: '#F0ECFF',
    borderRadius: 8,
  },
  medAddTimeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#887CBC',
  },

  // Modal de detalle
  medDetailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  medDetailContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  medDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  medDetailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  medDetailBody: {
    padding: 20,
  },
  medDetailRow: {
    marginBottom: 16,
  },
  medDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  medDetailValue: {
    fontSize: 16,
    color: '#333',
  },
  medDetailActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  medDetailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  medDetailEditButton: {
    backgroundColor: '#887CBC',
  },
  medDetailDeleteButton: {
    backgroundColor: '#F44336',
  },
  medDetailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});

export default HomeScreen;

