// Tipos para el sistema de posts

export interface AttachedList {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  isPublic: boolean;
  totalItems: number;
  completedItems: number;
}

export interface EventLocation {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface EventData {
  title: string;
  description?: string;
  eventDate: any; // Firestore Timestamp o ISO string
  eventEndDate?: any; // Firestore Timestamp o ISO string
  location?: EventLocation;
  maxAttendees?: number;
  requiresConfirmation?: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  attendees: string[]; // Array de UIDs
  attendeeCount: number;
  pendingAttendees?: string[];
  reminderSent?: boolean;
  reminderSentAt?: any;
  // NUEVO: Lista de espera
  waitlist?: string[]; // Array de UIDs en espera
  waitlistCount?: number;
  // NUEVO: Check-in con QR
  checkInCode?: string; // Código único de 8 caracteres
  checkedInAttendees?: string[]; // Array de UIDs que hicieron check-in
  checkedInCount?: number;
  checkInTimes?: { [userId: string]: any }; // Timestamp de cada check-in
}

export interface Post {
  id: string;
  title?: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  communityId: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  imageUrl?: string;
  imagePosition?: 'start' | 'end';
  isPinned?: boolean;
  tags?: string[];
  attachedLists?: AttachedList[];
  // NUEVO: Soporte para eventos
  postType?: 'normal' | 'event';
  eventData?: EventData;
  // Flags para el usuario actual (solo para eventos)
  userAttending?: boolean;
  userInWaitlist?: boolean; // NUEVO: Usuario está en lista de espera
  userCheckedIn?: boolean; // NUEVO: Usuario hizo check-in
}

export interface CreatePostData {
  title?: string;
  content: string;
  imageUrl?: string;
  imagePosition?: 'start' | 'end';
  tags?: string[];
  attachedLists?: string[]; // Array de IDs de listas
  // NUEVO: Soporte para crear eventos
  postType?: 'normal' | 'event';
  eventData?: {
    title: string;
    description?: string;
    eventDate: string; // ISO 8601
    eventEndDate?: string;
    location?: EventLocation;
    maxAttendees?: number;
    requiresConfirmation?: boolean;
  };
}

export interface Attendee {
  userId: string;
  userName: string;
  userPhoto?: string;
  confirmedAt: any;
}

