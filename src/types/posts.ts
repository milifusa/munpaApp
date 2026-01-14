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
}

export interface CreatePostData {
  title?: string;
  content: string;
  imageUrl?: string;
  imagePosition?: 'start' | 'end';
  tags?: string[];
  attachedLists?: string[]; // Array de IDs de listas
}

