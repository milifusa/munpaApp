import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Line, Path, Circle, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { childrenService, growthService } from '../services/api';
import analyticsService from '../services/analyticsService';

type GrowthTab = 'weight' | 'height' | 'head' | 'summary';

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
}

interface Measurement {
  id: string;
  measuredAt: string;
  valueKg?: number;
  valueCm?: number;
  notes?: string;
  source?: string;
  createdBy?: { uid?: string; name?: string };
  ageWeeks?: number;
  percentile?: number;
}

interface PercentilePoint {
  ageWeeks: number;
  p3: number;
  p50: number;
  p97: number;
}

interface SummaryResponse {
  latest?: {
    id: string;
    measuredAt: string;
    weightKg?: number;
    heightCm?: number;
    headCm?: number;
    weightPercentile?: number | null;
    heightPercentile?: number | null;
    headPercentile?: number | null;
    ageWeeks?: number | null;
  };
  history?: Array<{
    id: string;
    measuredAt: string;
    weightKg?: number;
    heightCm?: number;
    headCm?: number;
    weightPercentile?: number | null;
    heightPercentile?: number | null;
    headPercentile?: number | null;
    ageWeeks?: number | null;
  }>;
}

const CHART_HEIGHT = 210;
const CHART_WIDTH = Dimensions.get('window').width - 40;
const MUNPA_PRIMARY = '#59C6C0';
const MUNPA_PURPLE = '#887CBC';

const GrowthScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<GrowthTab>('weight');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loadingChild, setLoadingChild] = useState(true);
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [percentiles, setPercentiles] = useState<PercentilePoint[]>([]);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [heightInput, setHeightInput] = useState('');
  const [headInput, setHeadInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [measuredAt, setMeasuredAt] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');

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
          await AsyncStorage.setItem('selectedChildId', childToSelect.id);
        }
        setSelectedChild(childToSelect);
      } else {
        setChildren([]);
        setSelectedChild(null);
      }
    } catch (error) {
      console.error('❌ [GROWTH] Error cargando hijos:', error);
      setChildren([]);
      setSelectedChild(null);
    } finally {
      setLoadingChild(false);
    }
  };

  const resolveChildSex = (child: Child | null): 'M' | 'F' => {
    const raw = (child?.sex || child?.gender || '').toString().toUpperCase();
    if (raw.startsWith('M')) return 'M';
    if (raw.startsWith('F')) return 'F';
    return 'F';
  };

  const getAgeWeeksAt = (child: Child | null, dateValue: string): number => {
    if (!child) return 0;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 0;
    const measurementDateUtc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    if (child.birthDate) {
      let birth: Date;
      if (typeof child.birthDate === 'string') {
        birth = child.birthDate.length === 10
          ? new Date(`${child.birthDate}T00:00:00Z`)
          : new Date(child.birthDate);
      } else if ((child.birthDate as any)?._seconds) {
        birth = new Date((child.birthDate as any)._seconds * 1000);
      } else if ((child.birthDate as any)?.seconds) {
        birth = new Date((child.birthDate as any).seconds * 1000);
      } else {
        birth = new Date(String(child.birthDate));
      }
      if (!Number.isNaN(birth.getTime())) {
        const birthDateUtc = new Date(Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate()));
        const diffMs = measurementDateUtc.getTime() - birthDateUtc.getTime();
        return Math.max(0, diffMs / (1000 * 60 * 60 * 24 * 7));
      }
    }
    const months = child.currentAgeInMonths ?? child.ageInMonths ?? null;
    if (months != null) {
      return Math.max(0, months * 4.345);
    }
    return 0;
  };

  const getSummaryPercentile = (latest?: SummaryResponse['latest']) => {
    if (!latest) return '-';
    const value =
      activeTab === 'weight'
        ? latest.weightPercentile
        : activeTab === 'height'
        ? latest.heightPercentile
        : latest.headPercentile;
    return typeof value === 'number' ? `P${Math.round(value)}` : '-';
  };

  const loadPercentiles = async (type: 'weight' | 'height' | 'head', child: Child) => {
    try {
      const sex = resolveChildSex(child);
      const response = await growthService.getPercentiles({ sex, type });
      if (response?.success && Array.isArray(response?.data)) {
        setPercentiles(response.data);
      } else {
        setPercentiles([]);
      }
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setPercentiles([]);
        return;
      }
      console.error('❌ [GROWTH] Error percentiles:', error);
      setPercentiles([]);
    }
  };

  const loadMeasurements = async (type: 'weight' | 'height' | 'head', child: Child) => {
    try {
      setLoading(true);
      let response: any;
      if (type === 'weight') {
        response = await growthService.getWeightMeasurements(child.id);
      } else if (type === 'height') {
        response = await growthService.getHeightMeasurements(child.id);
      } else {
        response = await growthService.getHeadMeasurements(child.id);
      }
      const items = Array.isArray(response?.data) ? response.data : [];
      console.log('📈 [GROWTH] Mediciones recibidas:', items);
      setMeasurements(items);
      await loadPercentiles(type, child);
    } catch (error) {
      console.error('❌ [GROWTH] Error cargando mediciones:', error);
      setMeasurements([]);
      setPercentiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async (child: Child) => {
    try {
      setLoading(true);
      const response = await growthService.getSummary(child.id);
      setSummary(response?.data || null);
    } catch (error) {
      console.error('❌ [GROWTH] Error cargando resumen:', error);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!selectedChild) {
        setLoading(false);
        return;
      }
      if (activeTab === 'summary') {
        loadSummary(selectedChild);
      } else {
        loadMeasurements(activeTab, selectedChild);
      }
    }, [activeTab, selectedChild?.id])
  );

  const latestMeasurement = measurements[0] || null;
  const previousMeasurement = measurements[1] || null;

  const latestValue = useMemo(() => {
    if (!latestMeasurement) return null;
    if (activeTab === 'weight') return latestMeasurement.valueKg ?? null;
    return latestMeasurement.valueCm ?? null;
  }, [latestMeasurement, activeTab]);

  const changeValue = useMemo(() => {
    if (!latestMeasurement || !previousMeasurement) return null;
    const current = activeTab === 'weight' ? latestMeasurement.valueKg : latestMeasurement.valueCm;
    const previous = activeTab === 'weight' ? previousMeasurement.valueKg : previousMeasurement.valueCm;
    if (current == null || previous == null) return null;
    return current - previous;
  }, [latestMeasurement, previousMeasurement, activeTab]);

  const getNearestPercentile = (ageWeeks: number) => {
    if (percentiles.length === 0) return null;
    let best = percentiles[0];
    let bestDiff = Math.abs(best.ageWeeks - ageWeeks);
    percentiles.forEach((p) => {
      const diff = Math.abs(p.ageWeeks - ageWeeks);
      if (diff < bestDiff) {
        best = p;
        bestDiff = diff;
      }
    });
    return best;
  };

  const percentileLabel = useMemo(() => {
    if (!latestMeasurement) return '-';
    if (typeof latestMeasurement.percentile === 'number') {
      return `P${Math.round(latestMeasurement.percentile)}`;
    }
    if (latestValue == null) return '-';
    const ageWeeks = latestMeasurement.ageWeeks ?? getAgeWeeksAt(selectedChild, latestMeasurement.measuredAt);
    const point = getNearestPercentile(ageWeeks);
    if (!point) return '-';
    const candidates = [
      { label: 'P3', value: point.p3 },
      { label: 'P50', value: point.p50 },
      { label: 'P97', value: point.p97 },
    ];
    let closest = candidates[0];
    let bestDiff = Math.abs(latestValue - candidates[0].value);
    candidates.forEach((c) => {
      const diff = Math.abs(latestValue - c.value);
      if (diff < bestDiff) {
        bestDiff = diff;
        closest = c;
      }
    });
    return closest.label;
  }, [latestMeasurement, latestValue, percentiles, selectedChild]);

  const chartData = useMemo(() => {
    const measurementPoints = measurements
      .map((m) => {
        const value = activeTab === 'weight' ? m.valueKg : m.valueCm;
        if (value == null) return null;
        const ageWeeks = m.ageWeeks ?? getAgeWeeksAt(selectedChild, m.measuredAt);
        return { x: ageWeeks, y: value };
      })
      .filter(Boolean) as Array<{ x: number; y: number }>;

    const percentilePoints = percentiles.map((p) => ({
      x: p.ageWeeks,
      p3: p.p3,
      p50: p.p50,
      p97: p.p97,
    }));

    const allYValues = [
      ...percentilePoints.flatMap((p) => [p.p3, p.p50, p.p97]),
      ...measurementPoints.map((p) => p.y),
    ];

    const defaultMinY = allYValues.length > 0 ? Math.min(...allYValues) : 0;
    const defaultMaxY = allYValues.length > 0 ? Math.max(...allYValues) : 1;
    const minX = 0;
    const percentileMaxX = percentilePoints.length
      ? Math.max(...percentilePoints.map((p) => p.x))
      : 0;
    const measurementMaxX = measurementPoints.length
      ? Math.max(...measurementPoints.map((p) => p.x))
      : 0;
    const defaultMaxX = Math.max(percentileMaxX || measurementMaxX || 1, 1);

    const minY = activeTab === 'weight' ? 0 : defaultMinY * 0.9;
    const maxY = activeTab === 'weight' ? 25 : defaultMaxY * 1.1;
    const maxX = activeTab === 'weight' ? 26 : defaultMaxX;

    const extendedPercentiles = [...percentilePoints];

    return {
      measurementPoints,
      percentilePoints: extendedPercentiles,
      minY,
      maxY,
      minX,
      maxX,
    };
  }, [measurements, percentiles, activeTab, selectedChild]);

  const renderChart = () => {
    const { measurementPoints, percentilePoints, minY, maxY, minX, maxX } = chartData;
    const paddingLeft = 34;
    const paddingRight = 14;
    const paddingTop = 16;
    const paddingBottom = 28;
    const width = CHART_WIDTH;
    const height = CHART_HEIGHT;

    const scaleX = (x: number) => {
      const clampedX = Math.min(maxX, Math.max(minX, x));
      return (
        paddingLeft +
        ((clampedX - minX) / Math.max(1, maxX - minX)) * (width - paddingLeft - paddingRight)
      );
    };
    const scaleY = (y: number) =>
      height -
      paddingBottom -
      ((y - minY) / Math.max(1, maxY - minY)) * (height - paddingTop - paddingBottom);

    const buildPath = (points: Array<{ x: number; y: number }>) => {
      if (points.length === 0) return '';
      return points
        .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
        .join(' ');
    };

    const p3Path = buildPath(percentilePoints.map((p) => ({ x: p.x, y: p.p3 })));
    const p50Path = buildPath(percentilePoints.map((p) => ({ x: p.x, y: p.p50 })));
    const p97Path = buildPath(percentilePoints.map((p) => ({ x: p.x, y: p.p97 })));
    const measurementPath = buildPath(measurementPoints);

    const xTicks = activeTab === 'weight'
      ? Array.from({ length: 14 }, (_, i) => i * 2)
      : Array.from({ length: 7 }, (_, i) => Math.round((maxX / 6) * i));
    const yTicks = activeTab === 'weight'
      ? Array.from({ length: 13 }, (_, i) => i * 2)
      : Array.from({ length: 6 }, (_, i) => Math.round((maxY / 5) * i));

    return (
      <View style={styles.chartContainer}>
        <Svg width={width} height={height}>
          {yTicks.map((tick) => {
            const y = scaleY(tick);
            return (
              <Line
                key={`h-${tick}`}
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}
          {xTicks.map((tick) => {
            const x = scaleX(tick);
            return (
              <Line
                key={`v-${tick}`}
                y1={paddingTop}
                y2={height - paddingBottom}
                x1={x}
                x2={x}
                stroke="#E5E7EB"
                strokeWidth={1}
              />
            );
          })}
          {p97Path ? <Path d={p97Path} stroke="#EF4444" strokeWidth={2} fill="none" /> : null}
          {p50Path ? <Path d={p50Path} stroke="#22C55E" strokeWidth={2} fill="none" /> : null}
          {p3Path ? <Path d={p3Path} stroke="#F59E0B" strokeWidth={2} fill="none" /> : null}
          {measurementPath ? <Path d={measurementPath} stroke="#6366F1" strokeWidth={2} fill="none" /> : null}
          {measurementPoints.map((p, idx) => (
            <Circle key={`pt-${idx}`} cx={scaleX(p.x)} cy={scaleY(p.y)} r={4} fill="#6366F1" />
          ))}
          {yTicks.map((tick) => (
            <SvgText
              key={`y-${tick}`}
              x={paddingLeft - 8}
              y={scaleY(tick) + 4}
              fontSize="10"
              fill="#6B7280"
              textAnchor="end"
            >
              {tick}
            </SvgText>
          ))}
          {xTicks.map((tick) => (
            <SvgText
              key={`x-${tick}`}
              x={scaleX(tick)}
              y={height - 8}
              fontSize="10"
              fill="#6B7280"
              textAnchor="middle"
            >
              {tick}
            </SvgText>
          ))}
          <SvgText x={width / 2} y={height - 2} fontSize="11" fill="#6B7280" textAnchor="middle">
            Edad (semanas)
          </SvgText>
        </Svg>
      </View>
    );
  };

  const formatDateLabel = (dateValue?: string) => {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTimeLabel = (dateValue?: string) => {
    if (!dateValue) return '';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimelineTitle = (measurement: Measurement) => {
    const rawWeeks = measurement.ageWeeks ?? getAgeWeeksAt(selectedChild, measurement.measuredAt);
    const weeks = Math.max(0, Math.round(rawWeeks));
    if (weeks <= 1) return 'Crecimiento a 1 semana';
    return `Crecimiento a ${weeks} semanas`;
  };

  const openAddModal = () => {
    analyticsService.logEvent('growth_add_measurement_opened', {
      child_id: selectedChild?.id,
      active_tab: activeTab,
    });
    setWeightInput('');
    setHeightInput('');
    setHeadInput('');
    setNotesInput('');
    setMeasuredAt(new Date());
    setShowAddModal(true);
  };

  const handleSaveMeasurement = async () => {
    if (!selectedChild) return;
    const weightValue = weightInput ? parseFloat(weightInput.replace(',', '.')) : null;
    const heightValue = heightInput ? parseFloat(heightInput.replace(',', '.')) : null;
    const headValue = headInput ? parseFloat(headInput.replace(',', '.')) : null;

    if (!weightValue && !heightValue && !headValue) {
      Alert.alert('Error', 'Ingresa al menos una medición');
      return;
    }

    if ((weightValue && weightValue <= 0) || (heightValue && heightValue <= 0) || (headValue && headValue <= 0)) {
      Alert.alert('Error', 'Ingresa valores válidos');
      return;
    }

    const payloadBase = {
      measuredAt: measuredAt.toISOString(),
      notes: notesInput.trim() || undefined,
      source: 'app',
    };
    try {
      const measurements = [];
      if (weightValue) {
        await growthService.createWeightMeasurement(selectedChild.id, { valueKg: weightValue, ...payloadBase });
        measurements.push('weight');
      }
      if (heightValue) {
        await growthService.createHeightMeasurement(selectedChild.id, { valueCm: heightValue, ...payloadBase });
        measurements.push('height');
      }
      if (headValue) {
        await growthService.createHeadMeasurement(selectedChild.id, { valueCm: headValue, ...payloadBase });
        measurements.push('head');
      }
      analyticsService.logEvent('growth_measurement_saved', {
        child_id: selectedChild.id,
        measurements: measurements.join(','),
        has_notes: !!notesInput.trim(),
      });
      setShowAddModal(false);
      if (activeTab === 'summary') {
        await loadSummary(selectedChild);
      } else {
        await loadMeasurements(activeTab, selectedChild);
      }
    } catch (error) {
      console.error('❌ [GROWTH] Error guardando medicion:', error);
      Alert.alert('Error', 'No se pudo guardar la medición');
    }
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
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="scale-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Crecimiento</Text>
            <Text style={styles.headerSubtitle}>
              Seguimiento de crecimiento de {selectedChild?.name || 'tu bebé'}
            </Text>
          </View>
          <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
        </View>

        <View style={styles.tabsWrapper}>
          {([
            { key: 'weight', label: 'Peso' },
            { key: 'height', label: 'Altura' },
            { key: 'head', label: 'Cabeza' },
            { key: 'summary', label: 'Resumen' },
          ] as Array<{ key: GrowthTab; label: string }>).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => {
                analyticsService.logEvent('growth_tab_changed', {
                  child_id: selectedChild?.id,
                  tab: tab.key,
                });
                setActiveTab(tab.key);
              }}
            >
              <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab !== 'summary' && (
          <>
            {loading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={MUNPA_PRIMARY} />
                <Text style={styles.loadingText}>Cargando crecimiento...</Text>
              </View>
            ) : measurements.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="speedometer-outline" size={28} color={MUNPA_PRIMARY} />
                </View>
                <Text style={styles.emptyTitle}>Agrega una medición de crecimiento</Text>
                <TouchableOpacity style={styles.primaryButton} onPress={openAddModal}>
                  <Text style={styles.primaryButtonText}>Agregar medición</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>CRECIMIENTO REGISTRADO</Text>
                  <View style={styles.summaryRow}>
                    <View>
                      <Text style={styles.summaryValue}>
                        {latestValue != null ? latestValue.toFixed(2) : '--'}{' '}
                        <Text style={styles.summaryUnit}>{activeTab === 'weight' ? 'kg' : 'cm'}</Text>
                      </Text>
                      <Text style={styles.summaryDate}>
                        {formatDateLabel(latestMeasurement?.measuredAt)} {formatTimeLabel(latestMeasurement?.measuredAt)}
                      </Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Text style={styles.summaryPercentile}>
                        {activeTab === 'summary' ? getSummaryPercentile(summary?.latest) : percentileLabel}
                      </Text>
                      <Text style={styles.summaryHint}>Percentil</Text>
                    </View>
                    <View style={styles.summaryRight}>
                      <Text style={styles.summaryPercentile}>
                        {changeValue == null ? '-' : `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}`}
                      </Text>
                      <Text style={styles.summaryHint}>Cambio</Text>
                    </View>
                  </View>
                </View>

                {renderChart()}

                <Text style={styles.timelineTitle}>Timeline</Text>
                {measurements.map((measurement) => (
                  <View key={measurement.id} style={styles.timelineCard}>
                    <View style={styles.timelineIcon}>
                      <Ionicons name="scale-outline" size={20} color={MUNPA_PRIMARY} />
                    </View>
                    <View style={styles.timelineInfo}>
                      <Text style={styles.timelineMain}>{formatTimelineTitle(measurement)}</Text>
                      <Text style={styles.timelineSub}>
                        {measurement.createdBy?.name ? `Por ${measurement.createdBy.name}` : 'Registro en app'}
                      </Text>
                      <Text style={styles.timelineSub}>
                        {activeTab === 'weight'
                          ? `Peso: ${measurement.valueKg?.toFixed(2) || '--'} kg`
                          : activeTab === 'height'
                          ? `Altura: ${measurement.valueCm?.toFixed(2) || '--'} cm`
                          : `Cabeza: ${measurement.valueCm?.toFixed(2) || '--'} cm`}
                      </Text>
                    </View>
                    <View style={styles.timelineDate}>
                      <Text style={styles.timelineDateText}>{formatDateLabel(measurement.measuredAt)}</Text>
                      <Text style={styles.timelineDateText}>{formatTimeLabel(measurement.measuredAt)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}

        {activeTab === 'summary' && (
          <View style={styles.summarySection}>
            <Text style={styles.timelineTitle}>Historial</Text>
            {loading ? (
              <View style={styles.loadingBlock}>
                <ActivityIndicator size="small" color={MUNPA_PRIMARY} />
                <Text style={styles.loadingText}>Cargando resumen...</Text>
              </View>
            ) : summary?.history?.length ? (
              <View style={styles.tableCard}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderText}>Fecha</Text>
                  <Text style={styles.tableHeaderText}>Peso</Text>
                  <Text style={styles.tableHeaderText}>Altura</Text>
                  <Text style={styles.tableHeaderText}>Cabeza</Text>
                </View>
                {summary.history.map((row) => (
                  <View key={row.id} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{formatDateLabel(row.measuredAt)}</Text>
                    <Text style={styles.tableCell}>{row.weightKg?.toFixed(2) || '--'} kg</Text>
                    <Text style={styles.tableCell}>{row.heightCm?.toFixed(2) || '--'} cm</Text>
                    <Text style={styles.tableCell}>{row.headCm?.toFixed(2) || '--'} cm</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyHint}>No hay historial disponible.</Text>
            )}
          </View>
        )}
          </ScrollView>
        </View>
      </SafeAreaView>

      {activeTab !== 'summary' && (
        <TouchableOpacity style={[styles.fab, { bottom: 30 + insets.bottom }]} onPress={openAddModal}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalCard}
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowAddModal(false)}>
                  <Ionicons name="arrow-back" size={22} color="#2D3748" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Registrar crecimiento</Text>
                <View style={{ width: 22 }} />
              </View>

              <View style={styles.modalSection}>
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setPickerMode('date');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.modalRowLabel}>Fecha</Text>
                  <View style={styles.modalRowValue}>
                    <Text style={styles.modalRowValueText}>{measuredAt.toLocaleDateString('es-ES')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalRow}
                  onPress={() => {
                    setPickerMode('time');
                    setShowDatePicker(true);
                  }}
                >
                  <Text style={styles.modalRowLabel}>Hora</Text>
                  <View style={styles.modalRowValue}>
                    <Text style={styles.modalRowValueText}>
                      {measuredAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.modalSection}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>Peso</Text>
                  <TextInput
                    style={styles.modalRowInput}
                    value={weightInput}
                    onChangeText={setWeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00 kg"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>Altura</Text>
                  <TextInput
                    style={styles.modalRowInput}
                    value={heightInput}
                    onChangeText={setHeightInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00 cm"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalRowLabel}>Perímetro cefálico</Text>
                  <TextInput
                    style={styles.modalRowInput}
                    value={headInput}
                    onChangeText={setHeadInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00 cm"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              </View>

              <View style={styles.modalSection}>
                <TextInput
                  style={[styles.modalNotesInput, styles.modalNotes]}
                  value={notesInput}
                  onChangeText={setNotesInput}
                  placeholder="Agregar nota"
                  multiline
                />
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={measuredAt}
                  mode={pickerMode}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setMeasuredAt(date);
                  }}
                />
              )}

              <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.modalSaveFull} onPress={handleSaveMeasurement}>
                  <Text style={styles.modalSaveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: '#6B7280',
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#E6F7F6',
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  tabItemActive: {
    backgroundColor: MUNPA_PRIMARY,
  },
  tabLabel: {
    fontSize: 13,
    color: '#4A5568',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  summaryCard: {
    marginTop: 16,
    marginHorizontal: 20,
    backgroundColor: '#F0FBFA',
    borderRadius: 18,
    padding: 18,
  },
  summaryLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: MUNPA_PRIMARY,
    fontWeight: '700',
  },
  summaryRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3748',
  },
  summaryUnit: {
    fontSize: 16,
    color: '#6B7280',
  },
  summaryDate: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
  },
  summaryRight: {
    alignItems: 'center',
    minWidth: 70,
  },
  summaryPercentile: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  summaryHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  chartContainer: {
    marginTop: 16,
    marginHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  timelineTitle: {
    marginTop: 20,
    marginHorizontal: 20,
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  timelineCard: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E6F7F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  timelineInfo: {
    flex: 1,
  },
  timelineMain: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D3748',
  },
  timelineSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  timelineDate: {
    alignItems: 'flex-end',
  },
  timelineDateText: {
    fontSize: 11,
    color: '#6B7280',
  },
  summarySection: {
    marginTop: 20,
    paddingBottom: 40,
  },
  tableCard: {
    marginTop: 12,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F4F0FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
  },
  emptyState: {
    marginTop: 30,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#E6F7F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    color: '#2D3748',
    fontWeight: '600',
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: MUNPA_PRIMARY,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyHint: {
    marginTop: 12,
    marginHorizontal: 20,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingBlock: {
    marginTop: 24,
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  fab: {
    position: 'absolute',
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: MUNPA_PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingBottom: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalFooter: {
    paddingBottom: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalRowLabel: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '600',
    flex: 1,
  },
  modalRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalRowValueText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalRowInput: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    color: '#2D3748',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalNotesInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
  },
  modalNotes: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalDateButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalDateText: {
    fontSize: 14,
    color: '#111827',
  },
  modalSaveFull: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: MUNPA_PURPLE,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default GrowthScreen;
