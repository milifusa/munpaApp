// src/types/sleep.ts

export interface SleepPause {
  id: string;
  startTime?: string; // ISO string
  endTime?: string; // ISO string
  duration: number; // en minutos
  reason?: string;
  createdAt?: string;
}

export interface SleepEntry {
  id: string;
  childId: string;
  userId: string;
  type: 'nap' | 'nightsleep';
  startTime: string; // ISO string
  endTime?: string; // ISO string, undefined si está en progreso
  duration?: number; // en minutos (duración neta por defecto)
  grossDuration?: number; // duración bruta (sin descontar pausas)
  netDuration?: number; // duración neta (descontando pausas)
  quality?: 'poor' | 'fair' | 'good' | 'excellent';
  notes?: string;
  wakeUps?: number; // despertares durante el sueño
  location?: 'crib' | 'stroller' | 'car' | 'carrier';
  temperature?: number;
  noiseLevel?: number;
  pauses?: SleepPause[]; // pausas/interrupciones
  createdAt?: string;
  updatedAt?: string;
}

export interface Child {
  id: string;
  userId: string;
  name: string;
  birthDate: string; // ISO string
  ageInMonths: number;
  photoURL?: string;
}

export interface DailyNap {
  time: string;
  windowStart: string;
  windowEnd: string;
  expectedDuration: number;
  confidence: number;
  napNumber: number;
  type: string;
  status: 'passed' | 'upcoming';
}

export interface CompletedNap {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: 'completed';
}

export interface DailyNapUnified {
  id?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  actualDuration?: number;
  quality?: string;
  windowStart?: string;
  windowEnd?: string;
  expectedDuration?: number;
  confidence?: number;
  napNumber?: number;
  type: 'completed' | 'prediction' | string;
  status: 'completed' | 'upcoming' | 'passed' | string;
  isReal: boolean;
}

export interface DailySchedule {
  date: string;
  allNaps: DailyNapUnified[];
  totalExpected: number;
  completed: number;
  remaining: number;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
}

export interface SleepPrediction {
  wakeTime?: string; // Hora de despertar registrada hoy (ISO string)
  nextNap: {
    time: string;
    windowStart: string;
    windowEnd: string;
    expectedDuration: number;
    confidence: number;
    napNumber?: number;
    type: string;
    reason: string;
    status?: string;
  };
  dailySchedule?: DailySchedule;
  bedtime: {
    time: string;
    windowStart: string;
    windowEnd: string;
    confidence: number;
    consistency: string;
    reason: string;
  };
  patterns: {
    totalDailySleep: number;
    napStats: {
      averageDuration: number;
      averagePerDay: number;
      totalNaps: number;
    };
    nightStats: {
      averageDuration: number;
      averageWakeUps: number;
      totalNights: number;
    };
    overallQuality: string;
    consistency: number;
  };
  recommendations: Array<{
    type: 'success' | 'warning' | 'info' | 'tip';
    category: string;
    title: string;
    message: string;
    action: string;
  }>;
  sleepPressure: {
    level: 'low' | 'medium' | 'high' | 'critical';
    hoursSinceLastSleep: number;
    lastSleepTime: string;
    recommendation: string;
  };
  predictedAt: string;
  confidence: number;
}

export interface SleepStats {
  totalDailySleep: number;
  napStats: {
    averageDuration: number;
    averagePerDay: number;
    totalNaps: number;
  };
  nightStats: {
    averageDuration: number;
    averageWakeUps: number;
    totalNights: number;
  };
  overallQuality: string;
  consistency: number;
}

export interface SleepReminder {
  type: 'nap' | 'bedtime';
  title: string;
  message: string;
  time: string;
  minutesUntil: number;
  priority: 'critical' | 'high' | 'medium';
}

export interface WakeTimeEntry {
  id: string;
  childId: string;
  userId: string;
  wakeTime: string; // ISO timestamp
  type: 'wake';
  createdAt: string;
}

export interface WakeTimeResponse {
  success: boolean;
  message: string;
  wakeEvent?: WakeTimeEntry;
}

