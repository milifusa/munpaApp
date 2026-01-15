// src/screens/SleepTrackerScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { sleepService } from '../services/api';
import sleepTrackingNotification from '../services/sleepTrackingNotification';
import { SleepEntry, SleepPrediction, SleepStats } from '../types/sleep';

// Función para formatear hora SIN conversión (para predicciones que ya vienen en hora local)
const formatTimeFromISO = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const isoStr = date.toISOString();
    const timePart = isoStr.split('T')[1];
    const [hours, minutes] = timePart.split(':');
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formateando hora:', error);
    return '--:--';
  }
};

// Función para formatear hora CON conversión a local (para eventos históricos en UTC)
const formatTimeFromISOToLocal = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    const localTime = date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return localTime;
  } catch (error) {
    console.error('Error formateando hora:', error);
    return '--:--';
  }
};

const SleepTrackerScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const childId = route.params?.childId || ''; // ID del hijo seleccionado
  const childName = route.params?.childName || 'tu bebé'; // Nombre del hijo
  const [activeSleep, setActiveSleep] = useState<SleepEntry | null>(null);
  const [prediction, setPrediction] = useState<SleepPrediction | null>(null);
  const [sleepHistory, setSleepHistory] = useState<SleepEntry[]>([]);
  const [stats, setStats] = useState<SleepStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estado para info de hora de despertar
  const [wakeTimeInfo, setWakeTimeInfo] = useState<{
    wakeTime: string;
    source: 'recorded' | 'predicted-historical' | 'default';
    hasRegisteredToday: boolean;
    message: string;
  } | null>(null);
  
  // Estados para modal de inicio de siesta
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState(new Date());
  const [selectedSleepType, setSelectedSleepType] = useState<'nap' | 'nightsleep'>('nap');
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Estados para pausar/reanudar
  const [isPaused, setIsPaused] = useState(false);
  const [pauseStartTime, setPauseStartTime] = useState<Date | null>(null);
  const [currentPauses, setCurrentPauses] = useState<Array<{ startTime: Date; endTime?: Date }>>([]);
  
  // Estado para el contador en tiempo real
  const [elapsedTime, setElapsedTime] = useState(0); // en segundos
  
  // Animación para el botón activo
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    if (childId) {
      loadData();
    }
  }, [childId]);

  useEffect(() => {
    if (activeSleep) {
      startPulseAnimation();
    }
  }, [activeSleep]);

  // Contador en tiempo real para sueño activo
  useEffect(() => {
    if (!activeSleep) {
      setElapsedTime(0);
      return;
    }

    // No actualizar el contador si está pausado
    if (isPaused) {
      return;
    }

    // Calcular tiempo transcurrido inicial
    const calculateElapsed = () => {
      const now = new Date();
      const start = new Date(activeSleep.startTime);
      let diffMs = now.getTime() - start.getTime();
      
      // Restar el tiempo de todas las pausas completadas
      currentPauses.forEach(pause => {
        if (pause.endTime) {
          const pauseDuration = pause.endTime.getTime() - pause.startTime.getTime();
          diffMs -= pauseDuration;
        }
      });
      
      const diffSeconds = Math.floor(diffMs / 1000);
      setElapsedTime(diffSeconds);
    };

    // Calcular inmediatamente
    calculateElapsed();

    // Actualizar cada segundo para mostrar contador en tiempo real
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeSleep, isPaused, currentPauses]);

  // Recargar datos cuando la pantalla vuelve a estar en foco
  useFocusEffect(
    React.useCallback(() => {
      if (childId) {
        console.log('🔄 [SLEEP] Recargando datos al volver a la pantalla');
        loadData();
      }
    }, [childId])
  );

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar historial de sueño
      const historyResponse = await sleepService.getSleepHistory(childId, 30);
      const history = historyResponse.sleepHistory || [];
      setSleepHistory(history);
      
      // Verificar si hay un sueño activo
      const active = history.find((entry: SleepEntry) => !entry.endTime);
      setActiveSleep(active || null);
      
      // Obtener información de hora de despertar
      try {
        const wakeTimeResponse = await sleepService.getWakeTime(childId);
        console.log('⏰ [SLEEP TRACKER] Info de hora de despertar:', wakeTimeResponse);
        if (wakeTimeResponse.success) {
          setWakeTimeInfo({
            wakeTime: wakeTimeResponse.wakeTime,
            source: wakeTimeResponse.source,
            hasRegisteredToday: wakeTimeResponse.hasRegisteredToday,
            message: wakeTimeResponse.message
          });
        }
      } catch (error) {
        console.log('⚠️ [SLEEP] Error obteniendo info de hora de despertar:', error);
        setWakeTimeInfo(null);
      }
      
      // Obtener predicción con IA
      try {
        const predResponse = await sleepService.getSleepPrediction(childId);
        console.log('🔍 [SLEEP TRACKER] Respuesta de predicción recibida:', {
          success: predResponse.success,
          hasPrediction: !!predResponse.prediction,
          predictionKeys: predResponse.prediction ? Object.keys(predResponse.prediction) : [],
          wakeTimeInPrediction: predResponse.prediction?.wakeTime,
          dailyScheduleExists: !!predResponse.prediction?.dailySchedule,
          allNapsCount: predResponse.prediction?.dailySchedule?.allNaps?.length || 0
        });
        
        if (predResponse.success) {
          // La respuesta puede tener prediction o ser directa
          const pred = predResponse.prediction || predResponse;
          console.log('✅ [SLEEP TRACKER] Guardando predicción en estado:', {
            hasWakeTime: !!pred.wakeTime,
            wakeTime: pred.wakeTime,
            hasNextNap: !!pred.nextNap,
            hasDailySchedule: !!pred.dailySchedule,
            allNapsCount: pred.dailySchedule?.allNaps?.length || 0
          });
          setPrediction(pred);
        }
      } catch (error) {
        console.log('⚠️ [SLEEP] No hay suficientes datos para predicción:', error);
      }
      
      // Obtener análisis completo (incluye estadísticas)
      try {
        const analysisResponse = await sleepService.getSleepAnalysis(childId, 7);
        if (analysisResponse.success && analysisResponse.analysis) {
          setStats(analysisResponse.analysis.patterns);
        }
      } catch (error) {
        console.log('No hay suficientes datos para análisis');
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de sueño');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar modal para seleccionar hora de inicio
  const showStartSleepModal = (type: 'nap' | 'nightsleep') => {
    console.log('🎯 [MODAL] Abriendo modal para:', type);
    console.log('🎯 [MODAL] Estado actual de prediction:', {
      predictionExists: !!prediction,
      hasWakeTime: !!prediction?.wakeTime,
      wakeTime: prediction?.wakeTime,
      predictionKeys: prediction ? Object.keys(prediction) : [],
    });
    
    setSelectedSleepType(type);
    setSelectedStartTime(new Date());
    setShowStartModal(true);
    if (Platform.OS === 'android') {
      setShowTimePicker(true);
    }
  };

  // Confirmar inicio de siesta con hora seleccionada
  const handleStartSleep = async () => {
    try {
      const now = new Date();
      
      // Validar que no sea futura
      if (selectedStartTime > now) {
        Alert.alert('Error', 'No puedes registrar una siesta que comienza en el futuro');
        return;
      }

      // Validar que haya hora de despertar registrada HOY - solo para siestas
      console.log('🔍 [VALIDATION] Validando hora de despertar para siesta:', {
        hasWakeTimeInfo: !!wakeTimeInfo,
        hasRegisteredToday: wakeTimeInfo?.hasRegisteredToday,
        source: wakeTimeInfo?.source,
        wakeTime: wakeTimeInfo?.wakeTime,
        selectedType: selectedSleepType
      });

      if (selectedSleepType === 'nap' && !wakeTimeInfo?.hasRegisteredToday) {
        setShowStartModal(false);
        Alert.alert(
          '⚠️ Hora de Despertar Requerida',
          'Debes registrar primero la hora de despertar de hoy para poder agregar siestas. Ve al Home y presiona "Agregar hora de despertar".',
          [{ text: 'Entendido' }]
        );
        return;
      }

      setShowStartModal(false);
      setLoading(true);

      console.log('📅 [SLEEP] Enviando hora al servidor (UTC):', {
        horaLocal: selectedStartTime.toString(),
        horaUTC: selectedStartTime.toISOString()
      });

      const response = await sleepService.recordSleep({
        childId,
        type: selectedSleepType,
        startTime: selectedStartTime.toISOString(),
      });
      
      if (response.success && response.sleepEvent) {
        setActiveSleep(response.sleepEvent);
        
        // NO iniciar notificaciones - solo usar la barra visual en HomeScreen
        // await sleepTrackingNotification.startTracking({
        //   startTime: response.sleepEvent.startTime,
        //   expectedDuration: response.sleepEvent.expectedDuration,
        //   isPaused: false,
        // });
        
        Alert.alert('✓ Iniciado', `Seguimiento de ${selectedSleepType === 'nap' ? 'siesta' : 'noche'} iniciado`);
        loadData(); // Recargar para actualizar la UI
      }
    } catch (error) {
      console.error('Error iniciando sueño:', error);
      Alert.alert('Error', 'No se pudo iniciar el seguimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleEndSleep = async (quality?: string) => {
    if (!activeSleep) return;
    
    try {
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - new Date(activeSleep.startTime).getTime()) / 1000 / 60
      );
      
      console.log('📅 [SLEEP] Finalizando sueño (UTC):', {
        horaLocal: endTime.toString(),
        horaUTC: endTime.toISOString()
      });
      
      await sleepService.updateSleepEvent(activeSleep.id, {
        endTime: endTime.toISOString(),
        duration,
        quality: quality as any,
      });
      
      // NO detener notificación - solo usar barra visual
      // await sleepTrackingNotification.stopTracking();
      
      setActiveSleep(null);
      setIsPaused(false);
      setPauseStartTime(null);
      setCurrentPauses([]);
      Alert.alert('✓ Completado', 'Seguimiento finalizado');
      
      // Recargar datos
      loadData();
    } catch (error) {
      console.error('Error finalizando sueño:', error);
      Alert.alert('Error', 'No se pudo finalizar el seguimiento');
    }
  };

  const handlePauseSleep = async () => {
    if (!activeSleep || isPaused) return;
    
    const now = new Date();
    setPauseStartTime(now);
    setIsPaused(true);
    
    // Actualizar notificación a estado pausado
    // NO actualizar notificación - solo usar barra visual
    // await sleepTrackingNotification.updatePauseState(true);
    
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
      // NO actualizar notificación - solo usar barra visual
      // await sleepTrackingNotification.updatePauseState(false);
      
      Alert.alert('▶️ Reanudado', 'Siesta reanudada. El contador continúa.');
    } catch (error) {
      console.error('Error reanudando sueño:', error);
      Alert.alert('Error', 'No se pudo registrar la pausa');
      // Revertir estado en caso de error
      setIsPaused(false);
      setPauseStartTime(null);
    }
  };

  const handleResumeStoppedSleep = async (sleepEvent: SleepEntry) => {
    if (!sleepEvent.endTime || activeSleep) {
      if (activeSleep) {
        Alert.alert('Atención', 'Ya hay una siesta activa. Finalízala primero antes de reanudar otra.');
      }
      return;
    }
    
    Alert.alert(
      '¿Reanudar siesta?',
      `Esto eliminará la hora de fin (${formatTime(sleepEvent.endTime)}) y volverá a activar el contador.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reanudar',
          onPress: async () => {
            try {
              setLoading(true);
              
              console.log('🔄 [SLEEP] Reanudando siesta:', sleepEvent.id);
              
              // SOLUCIÓN: Eliminar la siesta detenida y crear una nueva activa
              // Esto es más confiable que intentar modificar el endTime
              try {
                // 1. Eliminar la siesta detenida
                console.log('🗑️ [SLEEP] Eliminando siesta detenida...');
                await sleepService.deleteSleepEvent(sleepEvent.id);
                
                // 2. Crear una nueva siesta activa con el mismo startTime
                console.log('➕ [SLEEP] Creando nueva siesta activa...');
                const newResponse = await sleepService.recordSleep({
                  childId: sleepEvent.childId,
                  type: sleepEvent.type,
                  startTime: sleepEvent.startTime,
                  quality: sleepEvent.quality,
                  wakeUps: sleepEvent.wakeUps,
                  location: sleepEvent.location,
                  notes: sleepEvent.notes,
                  // NO incluir endTime - esto la hace activa
                });
                
                
                if (newResponse.success && newResponse.sleepEvent) {
                  setActiveSleep(newResponse.sleepEvent);
                } else {
                  // Fallback: crear objeto local
                  const reactivatedSleep: SleepEntry = {
                    ...sleepEvent,
                    id: newResponse.sleepEventId || sleepEvent.id,
                    endTime: undefined,
                    duration: undefined,
                  };
                  setActiveSleep(reactivatedSleep);
                }
                
                Alert.alert('✓ Reanudada', 'La siesta ha sido reanudada. El contador está activo nuevamente.');
                
                // Recargar datos
                await loadData();
              } catch (innerError: any) {
                console.error('❌ [SLEEP] Error en el proceso de reanudar:', innerError);
                throw innerError;
              }
            } catch (error: any) {
              console.error('❌ [SLEEP] Error reanudando siesta detenida:', error);
              console.error('❌ [SLEEP] Error details:', error.response?.data);
              Alert.alert(
                'Error',
                error.response?.data?.message || 'No se pudo reanudar la siesta'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDuration = (totalMinutes: number, showSeconds: boolean = false) => {
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

  const getTimeUntilNextNap = () => {
    if (!prediction?.nextNap?.time) return null;
    
    const now = new Date();
    const napTime = new Date(prediction.nextNap.time);
    const diff = napTime.getTime() - now.getTime();
    
    if (diff < 0) return 'Ahora';
    
    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);
    
    if (hours > 0) return `En ${hours}h ${minutes}m`;
    return `En ${minutes}m`;
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#887CBC" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>💤 Seguimiento de Sueño</Text>
          
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Predicción con IA */}
        {prediction && prediction.nextNap && !activeSleep && (
          <View style={styles.predictionCard}>
            <LinearGradient
              colors={['#667EEA', '#764BA2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.predictionGradient}
            >
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles" size={16} color="#FFD700" />
                <Text style={styles.aiBadgeText}>IA Predictiva</Text>
              </View>
              
              <Text style={styles.predictionTitle}>
                ⏰ Próxima Siesta Predicha
              </Text>
              
              <Text style={styles.predictionTime}>
                {formatTimeFromISO(prediction.nextNap.time)}
              </Text>
              
              <Text style={styles.predictionSubtitle}>
                {getTimeUntilNextNap()}
              </Text>
              
              <View style={styles.confidenceBar}>
                <View style={styles.confidenceBarBg}>
                  <View 
                    style={[
                      styles.confidenceBarFill, 
                      { width: `${Math.round(prediction.nextNap.confidence * 100)}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round(prediction.nextNap.confidence * 100)}% de confianza
                </Text>
              </View>
              
              {prediction.nextNap.confidence >= 85 && (
                <View style={styles.learningInfoBox}>
                  <Ionicons name="bulb" size={14} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.learningInfoText}>
                    Duración aprendida del patrón de {childName}
                  </Text>
                </View>
              )}
              
              <View style={styles.predictionDetails}>
                <View style={styles.predictionDetail}>
                  <Ionicons name="moon" size={18} color="#FFF" />
                  <Text style={styles.predictionDetailText}>
                    ~{formatDuration(prediction.nextNap.expectedDuration)}
                  </Text>
                  {prediction.nextNap.confidence && prediction.nextNap.confidence >= 65 && (
                    <View style={styles.predictionConfidenceBadge}>
                      <Ionicons name="sparkles" size={10} color="#FFD700" />
                      <Text style={styles.predictionConfidenceText}>
                        {prediction.nextNap.confidence}%
                      </Text>
                    </View>
                  )}
                </View>
                
                {prediction.bedtime && prediction.bedtime.time && (
                  <View style={styles.predictionDetail}>
                    <Ionicons name="bed" size={18} color="#FFF" />
                    <Text style={styles.predictionDetailText}>
                      {formatTimeFromISO(prediction.bedtime.time)}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Horario del día completo */}
        {prediction?.dailySchedule && prediction.dailySchedule.allNaps && prediction.dailySchedule.allNaps.length > 0 && !activeSleep && (
          <View style={styles.dailyScheduleCard}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.scheduleTitle}>📅 Horario de Hoy</Text>
              <View style={styles.scheduleProgress}>
                <Text style={styles.scheduleProgressText}>
                  {prediction.dailySchedule.completed}/{prediction.dailySchedule.totalExpected} completadas
                </Text>
                <View style={styles.progressDotsContainer}>
                  {Array.from({ length: prediction.dailySchedule?.totalExpected || 0 }).map((_, index) => (
                    <View 
                      key={index} 
                      style={[
                        styles.progressDot,
                        index < (prediction.dailySchedule?.completed || 0) && styles.progressDotCompleted
                      ]} 
                    />
                  ))}
                </View>
              </View>
            </View>

            {prediction.dailySchedule.allNaps.map((nap, index) => {
              const isCompleted = nap.type === 'completed' || nap.status === 'completed';
              const isPrediction = nap.type === 'prediction';
              const isNext = isPrediction && nap.napNumber === prediction?.nextNap?.napNumber;
              const napDuration = nap.expectedDuration || nap.actualDuration || nap.duration || 0;
              const napLabel = isCompleted 
                ? `Siesta ${index + 1}` 
                : `Predicción ${nap.napNumber || index + 1}`;
              
              return (
              <View 
                key={nap.id || index} 
                style={[
                  styles.napScheduleItem,
                  isCompleted && styles.napScheduleItemPassed,
                  isNext && styles.napScheduleItemNext
                ]}
              >
                <View style={styles.napScheduleIcon}>
                  <Text style={styles.napScheduleNumber}>
                    {isCompleted ? '✅' : isNext ? '⏰' : '😴'}
                  </Text>
                </View>

                <View style={styles.napScheduleInfo}>
                  <Text style={[
                    styles.napScheduleType,
                    isCompleted && styles.napScheduleTypePassed
                  ]}>
                    {napLabel}
                  </Text>
                  <Text style={[
                    styles.napScheduleTime,
                    isCompleted && styles.napScheduleTimePassed
                  ]}>
                    {isCompleted 
                      ? `${formatTimeFromISOToLocal(nap.startTime || nap.time)}${nap.endTime ? ` - ${formatTimeFromISOToLocal(nap.endTime)}` : ''} (${napDuration}min)`
                      : `${formatTimeFromISO(nap.time)} (${napDuration}min)`
                    }
                  </Text>
                  {isNext && (
                    <Text style={styles.napScheduleNext}>
                      {getTimeUntilNextNap()}
                    </Text>
                  )}
                </View>

                <View style={styles.napScheduleConfidence}>
                  <Ionicons 
                    name={isCompleted ? 'checkmark-circle' : 'analytics-outline'} 
                    size={20} 
                    color={isCompleted ? '#2ECC71' : '#887CBC'} 
                  />
                  <Text style={[
                    styles.napScheduleConfidenceText,
                    isCompleted && styles.napScheduleConfidenceTextPassed
                  ]}>
                    {isCompleted ? 'Hecha' : `${nap.confidence || 0}%`}
                  </Text>
                </View>
              </View>
            );
            })}
          </View>
        )}

        {/* Mensaje cuando no hay suficientes datos */}
        {!prediction || (!prediction.nextNap && !activeSleep) ? (
          <View style={styles.noPredictionCard}>
            <Ionicons name="information-circle" size={48} color="#887CBC" />
            <Text style={styles.noPredictionTitle}>
              📊 Insuficientes datos para predicciones
            </Text>
            <Text style={styles.noPredictionText}>
              Registra al menos 3 siestas para que la IA pueda generar predicciones personalizadas
            </Text>
            <View style={styles.noPredictionTip}>
              <Ionicons name="bulb" size={20} color="#FFA500" />
              <Text style={styles.noPredictionTipText}>
                Cuantos más datos registres, más precisas serán las predicciones
              </Text>
            </View>
          </View>
        ) : null}

        {/* Estado activo de sueño */}
        {activeSleep && (
            <Animated.View 
            style={[
              styles.activeSleepCard,
              { transform: [{ scale: pulseAnim }] }
            ]}
          >
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeSleepGradient}
            >
              <Ionicons 
                name={activeSleep.type === 'nap' ? 'partly-sunny' : 'moon'} 
                size={48} 
                color="#FFF" 
              />
              
              <Text style={styles.activeSleepTitle}>
                {activeSleep.type === 'nap' ? '😴 Durmiendo Siesta' : '🌙 Durmiendo Noche'}
              </Text>
              
              <Text style={styles.activeSleepTime}>
                Desde {formatTime(activeSleep.startTime)}
              </Text>

              {/* Contador de tiempo */}
              <View style={styles.sleepTimer}>
                <View style={styles.timerRow}>
                  <Text style={styles.timerLabel}>Tiempo transcurrido:</Text>
                  <Text style={styles.timerValue}>{formatDuration(elapsedTime / 60, true)}</Text>
                </View>
                
                {prediction?.nextNap?.expectedDuration && activeSleep.type === 'nap' && (
                  <>
                    <View style={styles.timerRow}>
                      <Text style={styles.timerLabel}>Duración esperada:</Text>
                      <Text style={styles.timerValue}>{formatDuration(prediction.nextNap.expectedDuration)}</Text>
                    </View>
                    
                    <View style={styles.timerRow}>
                      <Text style={styles.timerLabel}>
                        {elapsedTime / 60 >= prediction.nextNap.expectedDuration ? 'Tiempo extra:' : 'Tiempo restante:'}
                      </Text>
                      <Text style={[
                        styles.timerValue,
                        elapsedTime / 60 >= prediction.nextNap.expectedDuration && styles.timerValueExtra
                      ]}>
                        {elapsedTime / 60 >= prediction.nextNap.expectedDuration 
                          ? `+${formatDuration((elapsedTime / 60) - prediction.nextNap.expectedDuration, true)}`
                          : formatDuration(prediction.nextNap.expectedDuration - (elapsedTime / 60), true)
                        }
                      </Text>
                    </View>
                  </>
                )}
              </View>
              
              {/* Botones de control */}
              <View style={styles.sleepControlButtons}>
                {/* Botón de Pausar/Reanudar */}
                {isPaused ? (
                  <TouchableOpacity 
                    style={styles.pauseResumeButton}
                    onPress={handleResumeSleep}
                  >
                    <Ionicons name="play-circle" size={24} color="#FFF" />
                    <Text style={styles.pauseResumeButtonText}>Reanudar</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.pauseResumeButton}
                    onPress={handlePauseSleep}
                  >
                    <Ionicons name="pause-circle" size={24} color="#FFF" />
                    <Text style={styles.pauseResumeButtonText}>Pausar</Text>
                  </TouchableOpacity>
                )}
                
                {/* Botón de Despertar */}
                <TouchableOpacity 
                  style={styles.endSleepButton}
                  onPress={() => {
                    Alert.alert(
                      '¿Cómo fue el sueño?',
                      'Califica la calidad del sueño',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: '😢 Malo', onPress: () => handleEndSleep('poor') },
                        { text: '😐 Regular', onPress: () => handleEndSleep('fair') },
                        { text: '😊 Bueno', onPress: () => handleEndSleep('good') },
                        { text: '🤩 Excelente', onPress: () => handleEndSleep('excellent') },
                      ]
                    );
                  }}
                >
                  <Ionicons name="stop-circle" size={24} color="#FFF" />
                  <Text style={styles.endSleepButtonText}>Despertar</Text>
                </TouchableOpacity>
              </View>

              {/* Indicador de pausa */}
              {isPaused && (
                <View style={styles.pauseIndicator}>
                  <Ionicons name="pause-circle" size={20} color="#FFD700" />
                  <Text style={styles.pauseIndicatorText}>
                    Pausado - El contador está detenido
                  </Text>
                </View>
              )}

              {/* Contador de pausas */}
              {currentPauses.length > 0 && (
                <View style={styles.pausesCounter}>
                  <Ionicons name="pause" size={16} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.pausesCounterText}>
                    {currentPauses.length} pausa{currentPauses.length > 1 ? 's' : ''} registrada{currentPauses.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        )}

        {/* Botones para iniciar sueño */}
        {!activeSleep && (
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => showStartSleepModal('nap')}
            >
              <LinearGradient
                colors={['#56CCF2', '#2F80ED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="partly-sunny" size={32} color="#FFF" />
                <Text style={styles.actionButtonText}>Iniciar Siesta</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => showStartSleepModal('nightsleep')}
            >
              <LinearGradient
                colors={['#7F7FD5', '#86A8E7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionButtonGradient}
              >
                <Ionicons name="moon" size={32} color="#FFF" />
                <Text style={styles.actionButtonText}>Iniciar Noche</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Estadísticas */}
        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>📊 Estadísticas (7 días)</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Ionicons name="time" size={24} color="#667EEA" style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {formatDuration(stats.totalDailySleep || 0)}
                </Text>
                <Text style={styles.statLabel}>Promedio diario</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="sunny" size={24} color="#56CCF2" style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {formatDuration(stats.napStats?.averageDuration || 0)}
                </Text>
                <Text style={styles.statLabel}>Siesta promedio</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="moon" size={24} color="#7F7FD5" style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {formatDuration(stats.nightStats?.averageDuration || 0)}
                </Text>
                <Text style={styles.statLabel}>Noche promedio</Text>
              </View>
              
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle" size={24} color="#48BB78" style={styles.statIcon} />
                <Text style={styles.statValue}>
                  {Math.round(stats.consistency || 0)}%
                </Text>
                <Text style={styles.statLabel}>Consistencia</Text>
              </View>
            </View>
          </View>
        )}

        {/* Historial reciente */}
        <View style={styles.historyContainer}>
          <Text style={styles.sectionTitle}>📋 Historial de Hoy</Text>
          
          {(() => {
            // Filtrar solo las siestas de hoy
            const todayEntries = sleepHistory.filter((entry) => {
              const entryDate = new Date(entry.startTime);
              const today = new Date();
              return entryDate.getDate() === today.getDate() &&
                     entryDate.getMonth() === today.getMonth() &&
                     entryDate.getFullYear() === today.getFullYear();
            });

            // Si no hay entradas de hoy, mostrar mensaje
            if (todayEntries.length === 0) {
              return (
                <View style={styles.emptyHistoryCard}>
                  <Ionicons name="moon-outline" size={48} color="#CBD5E0" />
                  <Text style={styles.emptyHistoryText}>
                    No hay siestas registradas hoy
                  </Text>
                  <Text style={styles.emptyHistorySubtext}>
                    Presiona "Iniciar Siesta" para comenzar a registrar
                  </Text>
                </View>
              );
            }

            // Mostrar las entradas de hoy
            return todayEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.historyCard}
              onPress={() => {
                if (entry.endTime) {
                  // Solo permitir editar si el sueño ya terminó
                  // @ts-ignore
                  navigation.navigate('EditSleepEvent', {
                    eventId: entry.id,
                    sleepEvent: entry,
                  });
                }
              }}
              disabled={!entry.endTime}
            >
              <View style={styles.historyIconContainer}>
                <Ionicons 
                  name={entry.type === 'nap' ? 'partly-sunny' : 'moon'} 
                  size={24} 
                  color={entry.type === 'nap' ? '#56CCF2' : '#7F7FD5'} 
                />
              </View>
              
              <View style={styles.historyContent}>
                <View style={styles.historyTitleRow}>
                  <Text style={styles.historyTitle}>
                    {entry.type === 'nap' ? 'Siesta' : 'Sueño Nocturno'}
                  </Text>
                  {entry.pauses && entry.pauses.length > 0 && (
                    <View style={styles.pauseBadge}>
                      <Ionicons name="pause" size={12} color="#FFA500" />
                      <Text style={styles.pauseBadgeText}>{entry.pauses.length} pausa{entry.pauses.length > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.historyTime}>
                  {formatTime(entry.startTime)}
                  {entry.endTime && ` - ${formatTime(entry.endTime)}`}
                </Text>
                {entry.pauses && entry.pauses.length > 0 && entry.netDuration !== undefined && entry.grossDuration !== undefined && entry.netDuration !== entry.grossDuration && (
                  <Text style={styles.historyDurationDetail}>
                    {formatDuration(entry.grossDuration - entry.netDuration)} en pausas
                  </Text>
                )}
              </View>
              
              {(entry.duration !== undefined || entry.netDuration !== undefined) && (
                <View style={styles.historyDuration}>
                  <Text style={styles.historyDurationText}>
                    {formatDuration(entry.netDuration ?? entry.duration ?? 0)}
                  </Text>
                  {entry.pauses && entry.pauses.length > 0 && entry.grossDuration && entry.netDuration !== entry.grossDuration && (
                    <Text style={styles.historyDurationSubtext}>
                      de {formatDuration(entry.grossDuration)}
                    </Text>
                  )}
                </View>
              )}
              
              {entry.endTime && (
                <View style={styles.historyActions}>
                  {/* Botón de reanudar */}
                  <TouchableOpacity
                    style={styles.resumeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleResumeStoppedSleep(entry);
                    }}
                  >
                    <Ionicons name="play-circle" size={22} color="#4ECDC4" />
                  </TouchableOpacity>
                  
                  {/* Botón de editar */}
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      // @ts-ignore
                      navigation.navigate('EditSleepEvent', {
                        eventId: entry.id,
                        sleepEvent: entry,
                      });
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#887CBC" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
            ));
          })()}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal para seleccionar hora de inicio */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedSleepType === 'nap' ? '¿Cuándo empezó la siesta?' : '¿Cuándo empezó a dormir?'}
            </Text>

            {/* Botón rápido "Ahora" */}
            <TouchableOpacity
              style={styles.nowButton}
              onPress={() => {
                setSelectedStartTime(new Date());
              }}
            >
              <Ionicons name="flash" size={20} color="#887CBC" />
              <Text style={styles.nowButtonText}>Ahora</Text>
            </TouchableOpacity>
            
            <View style={styles.modalTimeSection}>
              <Text style={styles.modalLabel}>O selecciona la hora:</Text>
              
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={selectedStartTime}
                  mode="time"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={(event, date) => {
                    if (date) {
                      // Mantener el día de hoy pero cambiar la hora
                      const today = new Date();
                      const newTime = new Date(
                        today.getFullYear(),
                        today.getMonth(),
                        today.getDate(),
                        date.getHours(),
                        date.getMinutes()
                      );
                      setSelectedStartTime(newTime);
                    }
                  }}
                  style={styles.dateTimePicker}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={24} color="#887CBC" />
                    <Text style={styles.timeButtonText}>
                      {selectedStartTime.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </Text>
                  </TouchableOpacity>
                  
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedStartTime}
                      mode="time"
                      display="default"
                      onChange={(event, date) => {
                        setShowTimePicker(false);
                        if (date) {
                          // Mantener el día de hoy pero cambiar la hora
                          const today = new Date();
                          const newTime = new Date(
                            today.getFullYear(),
                            today.getMonth(),
                            today.getDate(),
                            date.getHours(),
                            date.getMinutes()
                          );
                          setSelectedStartTime(newTime);
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
                onPress={() => setShowStartModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={handleStartSleep}
              >
                <Text style={styles.modalConfirmText}>Iniciar</Text>
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
    backgroundColor: '#F7FAFC',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#718096',
    fontFamily: 'Montserrat',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#96d2d3',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  predictionCard: {
    marginTop: -30,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  predictionGradient: {
    padding: 24,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Montserrat-SemiBold',
  },
  predictionTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    fontFamily: 'Montserrat',
  },
  predictionTime: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat-Bold',
  },
  predictionSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    fontFamily: 'Montserrat',
  },
  confidenceBar: {
    marginBottom: 20,
  },
  confidenceBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: '#48BB78',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'Montserrat',
  },
  learningInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  learningInfoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Montserrat',
    fontStyle: 'italic',
    flex: 1,
  },
  predictionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  predictionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 4,
    gap: 8,
  },
  predictionConfidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  predictionConfidenceText: {
    fontSize: 9,
    color: '#FFD700',
    fontWeight: '700',
    fontFamily: 'Montserrat',
  },
  predictionDetailText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 8,
    fontFamily: 'Montserrat',
  },
  activeSleepCard: {
    marginTop: -30,
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  activeSleepGradient: {
    padding: 32,
    alignItems: 'center',
  },
  activeSleepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 16,
    fontFamily: 'Montserrat-Bold',
  },
  activeSleepTime: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  sleepTimer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    width: '100%',
    gap: 12,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Montserrat',
  },
  timerValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  timerValueExtra: {
    color: '#FFD700',
  },
  sleepControlButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  pauseResumeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pauseResumeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  endSleepButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 24,
  },
  endSleepButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat-SemiBold',
  },
  pauseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  pauseIndicatorText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  pausesCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 6,
  },
  pausesCounterText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    fontFamily: 'Montserrat',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionButtonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: 'Montserrat-SemiBold',
  },
  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
    fontFamily: 'Montserrat-Bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    fontFamily: 'Montserrat-Bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  historyContainer: {
    marginBottom: 24,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyHistoryCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  historyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F7FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
    fontFamily: 'Montserrat-SemiBold',
  },
  historyTime: {
    fontSize: 13,
    color: '#718096',
    fontFamily: 'Montserrat',
  },
  historyDuration: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyDurationText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A5568',
    fontFamily: 'Montserrat-SemiBold',
  },
  historyDurationSubtext: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
    fontFamily: 'Montserrat',
  },
  historyDurationDetail: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  pauseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  pauseBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFA500',
    fontFamily: 'Montserrat',
  },
  historyActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resumeButton: {
    padding: 8,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(136, 124, 188, 0.1)',
    borderRadius: 8,
  },
  noPredictionCard: {
    backgroundColor: '#F7FAFC',
    borderRadius: 20,
    padding: 30,
    marginHorizontal: 20,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  noPredictionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  noPredictionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Montserrat',
  },
  noPredictionTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  noPredictionTipText: {
    flex: 1,
    fontSize: 13,
    color: '#FFA500',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  nowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0E6FF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 2,
    borderColor: '#887CBC',
  },
  nowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  modalTimeSection: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#718096',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Montserrat',
  },
  dateTimePicker: {
    width: '100%',
    height: 120,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7FAFC',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#887CBC',
    gap: 12,
  },
  timeButtonText: {
    fontSize: 24,
    color: '#2D3748',
    fontWeight: 'bold',
    fontFamily: 'Montserrat',
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
    color: '#4A5568',
    fontFamily: 'Montserrat',
  },
  modalConfirmButton: {
    backgroundColor: '#96d2d3',
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    fontFamily: 'Montserrat',
  },
  // Estilos del horario del día
  dailyScheduleCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scheduleHeader: {
    marginBottom: 20,
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
    fontFamily: 'Montserrat',
  },
  scheduleProgress: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleProgressText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '600',
    fontFamily: 'Montserrat',
  },
  progressDotsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  progressDotCompleted: {
    backgroundColor: '#2ECC71',
  },
  napScheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  napScheduleItemPassed: {
    opacity: 0.6,
  },
  napScheduleItemNext: {
    borderColor: '#887CBC',
    backgroundColor: '#F0E6FF',
  },
  napScheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  napScheduleNumber: {
    fontSize: 20,
  },
  napScheduleInfo: {
    flex: 1,
  },
  napScheduleType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
    fontFamily: 'Montserrat',
  },
  napScheduleTypePassed: {
    color: '#718096',
  },
  napScheduleTime: {
    fontSize: 14,
    color: '#4A5568',
    fontFamily: 'Montserrat',
  },
  napScheduleTimePassed: {
    color: '#A0AEC0',
  },
  napScheduleNext: {
    fontSize: 12,
    color: '#887CBC',
    fontWeight: '600',
    marginTop: 4,
    fontFamily: 'Montserrat',
  },
  napScheduleConfidence: {
    alignItems: 'center',
    gap: 4,
  },
  napScheduleConfidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#887CBC',
    fontFamily: 'Montserrat',
  },
  napScheduleConfidenceTextPassed: {
    color: '#2ECC71',
  },
});

export default SleepTrackerScreen;

