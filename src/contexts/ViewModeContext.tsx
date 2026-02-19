import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import analyticsService from '../services/analyticsService';

type ViewMode = 'munpa' | 'specialist';
type ProfileType = 'specialist' | 'nutritionist' | 'coach' | 'psychologist' | 'service' | null;

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => Promise<void>;
  isSpecialistMode: boolean;
  profileType: ProfileType;
  isMedicalProfile: boolean;
  isServiceProfile: boolean;
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode debe ser usado dentro de un ViewModeProvider');
  }
  return context;
};

interface ViewModeProviderProps {
  children: ReactNode;
}

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const [viewMode, setViewModeState] = useState<ViewMode>('munpa');
  const { user } = useAuth();

  // Cargar el modo guardado al iniciar
  useEffect(() => {
    loadSavedMode();
  }, []);

  // Si el usuario no tiene perfil profesional, forzar modo munpa
  useEffect(() => {
    if (user && !user.professionalProfile?.isActive && viewMode === 'specialist') {
      console.log('⚠️ [VIEW MODE] Usuario sin perfil profesional, cambiando a modo Munpa');
      setViewMode('munpa');
    }
  }, [user]);

  const loadSavedMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('viewMode');
      if (savedMode === 'specialist' || savedMode === 'munpa') {
        console.log('📱 [VIEW MODE] Modo cargado desde storage:', savedMode);
        setViewModeState(savedMode);
      } else {
        console.log('📱 [VIEW MODE] No hay modo guardado, usando Munpa por defecto');
        setViewModeState('munpa');
      }
    } catch (error) {
      console.error('❌ [VIEW MODE] Error cargando modo:', error);
      setViewModeState('munpa');
    }
  };

  const setViewMode = async (mode: ViewMode) => {
    try {
      console.log('🔄 [VIEW MODE] Cambiando modo a:', mode);
      
      // Guardar en AsyncStorage
      await AsyncStorage.setItem('viewMode', mode);
      
      // Actualizar estado
      setViewModeState(mode);
      
      // Analytics
      const profileType = user?.professionalProfile?.accountType;
      analyticsService.logEvent('view_mode_changed', {
        mode,
        user_id: user?.id,
        has_professional_profile: user?.professionalProfile?.isActive || false,
        profile_type: profileType || 'none',
      });
      
      console.log('✅ [VIEW MODE] Modo cambiado exitosamente a:', mode, 'tipo:', profileType);
    } catch (error) {
      console.error('❌ [VIEW MODE] Error guardando modo:', error);
    }
  };

  // Determinar tipo de perfil
  const profileType: ProfileType = user?.professionalProfile?.accountType || null;
  const isServiceProfile = profileType === 'service';
  const isMedicalProfile = profileType !== null && profileType !== 'service'; // Todos excepto service son médicos

  // Debug log
  useEffect(() => {
    if (user?.professionalProfile) {
      console.log('🔍 [VIEW MODE] Perfil detectado:', {
        accountType: profileType,
        isMedicalProfile,
        isServiceProfile,
        isSpecialistMode: viewMode === 'specialist',
      });
    }
  }, [user?.professionalProfile, viewMode]);

  const value: ViewModeContextType = {
    viewMode,
    setViewMode,
    isSpecialistMode: viewMode === 'specialist',
    profileType,
    isMedicalProfile,
    isServiceProfile,
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};
