import { axiosInstance as api } from './api';

const API_BASE_URL = 'https://api.munpa.online';

export interface ShareChildRequest {
  role: 'padre' | 'madre' | 'cuidadora' | 'familiar' | 'otro';
  expiresInDays?: number; // Default: 7
}

export interface ShareChildResponse {
  success: boolean;
  data: {
    token: string;
    invitationLink: string; // munpa://share-child/{token}
    webLink?: string; // https://munpa.online/share-child/{token} (opcional, para compartir)
  };
}

export interface ChildInvitation {
  token: string;
  childId: string;
  childName: string;
  invitedBy: string; // userId
  invitedByName?: string;
  invitedByPhoto?: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
  expiresAt: string;
  acceptedBy?: string;
  acceptedAt?: string;
}

export interface InvitationDetails {
  success: boolean;
  data: {
    invitation: ChildInvitation;
    child: {
      id: string;
      name: string;
      photoUrl?: string;
    };
    inviter: {
      id: string;
      name: string;
      photoUrl?: string;
    };
  };
}

export interface SharedWithUser {
  userId: string;
  name: string;
  photoUrl?: string;
  role: string;
  isPrincipal: boolean;
}

export const shareChildService = {
  // 1. Generar link de invitación
  shareChild: async (childId: string, data: ShareChildRequest): Promise<ShareChildResponse> => {
    console.log('📤 [SHARE CHILD] Generando link de invitación para hijo:', childId);
    console.log('📤 [SHARE CHILD] Datos:', data);
    
    try {
      const response = await api.post(`/api/auth/children/${childId}/share`, data);
      console.log('✅ [SHARE CHILD] Link generado:', response.data);
      
      // Si el backend no proporciona webLink, generarlo desde el deep link
      const result = response.data;
      if (result.data && result.data.invitationLink && !result.data.webLink) {
        const deepLink = result.data.invitationLink;
        // Extraer el token del deep link
        const tokenMatch = deepLink.match(/munpa:\/\/share-child\/(.+)/);
        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1];
          // Generar link web que redirige al deep link
          result.data.webLink = `https://munpa.online/share-child/${token}`;
          console.log('✅ [SHARE CHILD] Web link generado:', result.data.webLink);
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error generando link:', error.response?.data || error.message);
      throw error;
    }
  },

  // 2. Listar invitaciones pendientes
  getInvitations: async (): Promise<ChildInvitation[]> => {
    console.log('📋 [SHARE CHILD] Obteniendo invitaciones pendientes...');
    
    try {
      const response = await api.get('/api/auth/children/invitations');
      console.log('✅ [SHARE CHILD] Invitaciones obtenidas:', response.data?.data?.length || 0);
      return response.data?.data || [];
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error obteniendo invitaciones:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // 3. Obtener detalles de una invitación
  getInvitationDetails: async (token: string): Promise<InvitationDetails> => {
    console.log('🔍 [SHARE CHILD] Obteniendo detalles de invitación:', token);
    
    try {
      const response = await api.get(`/api/auth/children/invitations/${token}`);
      console.log('✅ [SHARE CHILD] Detalles obtenidos:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error obteniendo detalles:', error.response?.data || error.message);
      throw error;
    }
  },

  // 4. Aceptar invitación
  acceptInvitation: async (token: string): Promise<any> => {
    console.log('✅ [SHARE CHILD] Aceptando invitación:', token);
    
    try {
      const response = await api.post(`/api/auth/children/invitations/${token}/accept`);
      console.log('✅ [SHARE CHILD] Invitación aceptada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error aceptando invitación:', error.response?.data || error.message);
      throw error;
    }
  },

  // 5. Rechazar invitación
  rejectInvitation: async (token: string): Promise<any> => {
    console.log('❌ [SHARE CHILD] Rechazando invitación:', token);
    
    try {
      const response = await api.post(`/api/auth/children/invitations/${token}/reject`);
      console.log('✅ [SHARE CHILD] Invitación rechazada:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error rechazando invitación:', error.response?.data || error.message);
      throw error;
    }
  },

  // 6. Listar usuarios con acceso al hijo
  getSharedWith: async (childId: string): Promise<SharedWithUser[]> => {
    console.log('👥 [SHARE CHILD] Obteniendo usuarios con acceso al hijo:', childId);
    
    try {
      const response = await api.get(`/api/auth/children/${childId}/shared-with`);
      console.log('✅ [SHARE CHILD] Usuarios obtenidos:', response.data?.data?.length || 0);
      return response.data?.data || [];
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error obteniendo usuarios:', error.response?.data || error.message);
      if (error.response?.status === 404) {
        return [];
      }
      throw error;
    }
  },

  // 7. Revocar acceso de un usuario
  revokeAccess: async (childId: string, userId: string): Promise<any> => {
    console.log('🚫 [SHARE CHILD] Revocando acceso:', { childId, userId });
    
    try {
      const response = await api.delete(`/api/auth/children/${childId}/shared-with/${userId}`);
      console.log('✅ [SHARE CHILD] Acceso revocado:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ [SHARE CHILD] Error revocando acceso:', error.response?.data || error.message);
      throw error;
    }
  },
};

