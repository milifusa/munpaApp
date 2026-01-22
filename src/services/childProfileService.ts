import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://api.munpa.online';

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ============= VACUNAS 💉 =============
export const vaccinesService = {
  getVaccines: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/vaccines`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo vacunas:', error);
      throw error;
    }
  },

  addVaccine: async (childId: string, vaccineData: {
    name: string;
    scheduledDate: string;
    appliedDate?: string;
    status: 'pending' | 'applied' | 'skipped';
    location?: string;
    batch?: string;
    notes?: string;
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/vaccines`, vaccineData);
      return response.data;
    } catch (error) {
      console.error('Error agregando vacuna:', error);
      throw error;
    }
  },

  updateVaccine: async (childId: string, vaccineId: string, vaccineData: {
    name?: string;
    scheduledDate?: string;
    appliedDate?: string;
    status?: 'pending' | 'applied' | 'skipped';
    location?: string;
    batch?: string;
    notes?: string;
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/vaccines/${vaccineId}`, vaccineData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando vacuna:', error);
      throw error;
    }
  },

  deleteVaccine: async (childId: string, vaccineId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/vaccines/${vaccineId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando vacuna:', error);
      throw error;
    }
  },
};

// ============= CITAS MÉDICAS 🏥 =============
export const appointmentsService = {
  getAppointments: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/appointments`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo citas:', error);
      throw error;
    }
  },

  addAppointment: async (childId: string, appointmentData: {
    type: 'checkup' | 'specialist' | 'emergency' | 'vaccine';
    date: string;
    doctor: string;
    location?: string;
    reason?: string;
    notes?: string;
    status?: 'scheduled' | 'completed' | 'cancelled';
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/appointments`, appointmentData);
      return response.data;
    } catch (error) {
      console.error('Error agregando cita:', error);
      throw error;
    }
  },

  updateAppointment: async (childId: string, appointmentId: string, appointmentData: {
    type?: 'checkup' | 'specialist' | 'emergency' | 'vaccine';
    date?: string;
    doctor?: string;
    location?: string;
    reason?: string;
    notes?: string;
    status?: 'scheduled' | 'completed' | 'cancelled';
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/appointments/${appointmentId}`, appointmentData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando cita:', error);
      throw error;
    }
  },

  deleteAppointment: async (childId: string, appointmentId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/appointments/${appointmentId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando cita:', error);
      throw error;
    }
  },
};

// ============= MEDICAMENTOS 💊 =============
export const medicationsService = {
  getMedications: async (childId: string) => {
    try {
      const response = await api.get(`/api/medications/${childId}`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo medicamentos:', error);
      throw error;
    }
  },

  addMedication: async (childId: string, medicationData: {
    name: string;
    dose: number | string;
    doseUnit: string;
    times?: string[];
    repeatEveryMinutes?: number;
    startTime?: string;
    endTime?: string;
    startDate: string;
    endDate?: string;
    notes?: string;
    timezone?: string;
    scheduleDays?: number;
  }) => {
    try {
      const response = await api.post(`/api/medications`, {
        childId,
        ...medicationData,
      });
      return response.data;
    } catch (error) {
      console.error('Error agregando medicamento:', error);
      throw error;
    }
  },

  updateMedication: async (medicationId: string, medicationData: {
    name?: string;
    dose?: number | string;
    doseUnit?: string;
    times?: string[];
    repeatEveryMinutes?: number;
    startTime?: string;
    endTime?: string;
    startDate?: string;
    endDate?: string;
    notes?: string;
    scheduleDays?: number;
    active?: boolean;
  }) => {
    try {
      const response = await api.put(`/api/medications/${medicationId}`, medicationData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando medicamento:', error);
      throw error;
    }
  },

  deleteMedication: async (medicationId: string) => {
    try {
      const response = await api.delete(`/api/medications/${medicationId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando medicamento:', error);
      throw error;
    }
  },
};

// ============= ALERGIAS 🚫 =============
export const allergiesService = {
  updateAllergies: async (childId: string, allergies: string[]) => {
    try {
      const response = await api.put(`/api/children/${childId}/allergies`, { allergies });
      return response.data;
    } catch (error) {
      console.error('Error actualizando alergias:', error);
      throw error;
    }
  },
};

// ============= HISTORIAL MÉDICO 📖 =============
export const medicalHistoryService = {
  getMedicalHistory: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/medical-history`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo historial médico:', error);
      throw error;
    }
  },

  addMedicalHistory: async (childId: string, historyData: {
    type: 'diagnosis' | 'treatment' | 'surgery' | 'hospitalization' | 'other';
    date: string;
    title: string;
    description: string;
    doctor?: string;
    location?: string;
    attachments?: string[];
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/medical-history`, historyData);
      return response.data;
    } catch (error) {
      console.error('Error agregando historial médico:', error);
      throw error;
    }
  },

  updateMedicalHistory: async (childId: string, historyId: string, historyData: {
    type?: 'diagnosis' | 'treatment' | 'surgery' | 'hospitalization' | 'other';
    date?: string;
    title?: string;
    description?: string;
    doctor?: string;
    location?: string;
    attachments?: string[];
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/medical-history/${historyId}`, historyData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando historial médico:', error);
      throw error;
    }
  },

  deleteMedicalHistory: async (childId: string, historyId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/medical-history/${historyId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando historial médico:', error);
      throw error;
    }
  },
};

// ============= MEDICIONES 📏 =============
export const measurementsService = {
  getMeasurements: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/measurements`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo mediciones:', error);
      throw error;
    }
  },

  addMeasurement: async (childId: string, measurementData: {
    date: string;
    weight?: number;
    height?: number;
    headCircumference?: number;
    notes?: string;
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/measurements`, measurementData);
      return response.data;
    } catch (error) {
      console.error('Error agregando medición:', error);
      throw error;
    }
  },

  updateMeasurement: async (childId: string, measurementId: string, measurementData: {
    date?: string;
    weight?: number;
    height?: number;
    headCircumference?: number;
    notes?: string;
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/measurements/${measurementId}`, measurementData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando medición:', error);
      throw error;
    }
  },

  deleteMeasurement: async (childId: string, measurementId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/measurements/${measurementId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando medición:', error);
      throw error;
    }
  },
};

// ============= SEGUIMIENTO DE SUEÑO 😴 =============
export const sleepTrackingService = {
  getSleepRecords: async (childId: string, startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(
        `/api/children/${childId}/sleep-tracking?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo registros de sueño:', error);
      throw error;
    }
  },

  addSleepRecord: async (childId: string, sleepData: {
    date: string;
    sleepTime: string;
    wakeTime: string;
    duration?: number;
    quality?: 'good' | 'fair' | 'poor';
    naps?: Array<{ time: string; duration: number }>;
    notes?: string;
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/sleep-tracking`, sleepData);
      return response.data;
    } catch (error) {
      console.error('Error agregando registro de sueño:', error);
      throw error;
    }
  },
};

// ============= REGISTRO DE ALIMENTACIÓN 🍼 =============
export const feedingLogService = {
  getFeedingRecords: async (childId: string, startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await api.get(
        `/api/children/${childId}/feeding-log?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error obteniendo registros de alimentación:', error);
      throw error;
    }
  },

  addFeedingRecord: async (childId: string, feedingData: {
    date: string;
    type: 'breastfeeding' | 'bottle' | 'solid' | 'water';
    amount?: number;
    duration?: number;
    food?: string;
    breast?: 'left' | 'right' | 'both';
    notes?: string;
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/feeding-log`, feedingData);
      return response.data;
    } catch (error) {
      console.error('Error agregando registro de alimentación:', error);
      throw error;
    }
  },
};

// ============= HITOS DEL DESARROLLO 🎉 =============
export const milestonesService = {
  getMilestones: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/milestones`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo hitos:', error);
      throw error;
    }
  },

  addMilestone: async (childId: string, milestoneData: {
    type: 'first_smile' | 'first_word' | 'first_step' | 'first_tooth' | 'custom';
    title: string;
    date: string;
    description?: string;
    photos?: string[];
    celebrationEmoji?: string;
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/milestones`, milestoneData);
      return response.data;
    } catch (error) {
      console.error('Error agregando hito:', error);
      throw error;
    }
  },

  updateMilestone: async (childId: string, milestoneId: string, milestoneData: {
    type?: 'first_smile' | 'first_word' | 'first_step' | 'first_tooth' | 'custom';
    title?: string;
    date?: string;
    description?: string;
    photos?: string[];
    celebrationEmoji?: string;
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/milestones/${milestoneId}`, milestoneData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando hito:', error);
      throw error;
    }
  },

  deleteMilestone: async (childId: string, milestoneId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/milestones/${milestoneId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando hito:', error);
      throw error;
    }
  },
};

// ============= DIARIO DEL BEBÉ 📔 =============
export const diaryService = {
  getDiaryEntries: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/diary`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo diario:', error);
      throw error;
    }
  },

  addDiaryEntry: async (childId: string, entryData: {
    date: string;
    title: string;
    content: string;
    mood?: 'happy' | 'sad' | 'neutral' | 'excited';
    photos?: string[];
    tags?: string[];
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/diary`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error agregando entrada de diario:', error);
      throw error;
    }
  },

  updateDiaryEntry: async (childId: string, diaryId: string, entryData: {
    date?: string;
    title?: string;
    content?: string;
    mood?: 'happy' | 'sad' | 'neutral' | 'excited';
    photos?: string[];
    tags?: string[];
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/diary/${diaryId}`, entryData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando entrada de diario:', error);
      throw error;
    }
  },

  deleteDiaryEntry: async (childId: string, diaryId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/diary/${diaryId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando entrada de diario:', error);
      throw error;
    }
  },
};

// ============= ÁLBUMES DE FOTOS 📸 =============
export const albumsService = {
  getAlbums: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/albums`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo álbumes:', error);
      throw error;
    }
  },

  createAlbum: async (childId: string, albumData: {
    name: string;
    description?: string;
    coverPhoto?: string;
    photos?: Array<{ url: string; caption?: string; date?: string }>;
    theme?: 'birthday' | 'first_year' | 'vacation' | 'custom';
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/albums`, albumData);
      return response.data;
    } catch (error) {
      console.error('Error creando álbum:', error);
      throw error;
    }
  },

  addPhotosToAlbum: async (
    childId: string,
    albumId: string,
    photos: Array<{ url: string; caption?: string; date?: string }>
  ) => {
    try {
      const response = await api.post(
        `/api/children/${childId}/albums/${albumId}/photos`,
        { photos }
      );
      return response.data;
    } catch (error) {
      console.error('Error agregando fotos al álbum:', error);
      throw error;
    }
  },

  updateAlbum: async (childId: string, albumId: string, albumData: {
    name?: string;
    description?: string;
    coverPhoto?: string;
    theme?: 'birthday' | 'first_year' | 'vacation' | 'custom';
  }) => {
    try {
      const response = await api.put(`/api/children/${childId}/albums/${albumId}`, albumData);
      return response.data;
    } catch (error) {
      console.error('Error actualizando álbum:', error);
      throw error;
    }
  },

  deleteAlbum: async (childId: string, albumId: string) => {
    try {
      const response = await api.delete(`/api/children/${childId}/albums/${albumId}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando álbum:', error);
      throw error;
    }
  },
};

// ============= CUIDADORES 👨‍👩‍👧‍👦 =============
export const caregiversService = {
  getCaregivers: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/caregivers`);
      return response.data;
    } catch (error) {
      console.error('Error obteniendo cuidadores:', error);
      throw error;
    }
  },

  inviteCaregiver: async (childId: string, caregiverData: {
    email: string;
    name: string;
    relationship: 'father' | 'mother' | 'grandparent' | 'other';
    permissions: {
      canEdit: boolean;
      canViewMedical: boolean;
      canViewPhotos: boolean;
    };
  }) => {
    try {
      const response = await api.post(`/api/children/${childId}/caregivers`, caregiverData);
      return response.data;
    } catch (error) {
      console.error('Error invitando cuidador:', error);
      throw error;
    }
  },
};

// ============= EXPORTAR 📄 =============
export const exportService = {
  exportToPDF: async (childId: string) => {
    try {
      const response = await api.get(`/api/children/${childId}/export-pdf`);
      return response.data;
    } catch (error) {
      console.error('Error exportando datos:', error);
      throw error;
    }
  },
};

export default {
  vaccines: vaccinesService,
  appointments: appointmentsService,
  medications: medicationsService,
  allergies: allergiesService,
  medicalHistory: medicalHistoryService,
  measurements: measurementsService,
  sleepTracking: sleepTrackingService,
  feedingLog: feedingLogService,
  milestones: milestonesService,
  diary: diaryService,
  albums: albumsService,
  caregivers: caregiversService,
  export: exportService,
};

