// Tipos para el sistema de listas
export interface ListItem {
  id: string;
  text: string;
  isCompleted: boolean;
  completed?: boolean; // Campo alternativo para compatibilidad con backend
  commentsCount: number;
  imageUrl?: string; // URL de imagen del item (opcional)
  priority?: 'low' | 'medium' | 'high'; // Prioridad del item
  details?: string; // Detalles adicionales del item
  brand?: string; // Marca del producto/item
  store?: string; // Tienda donde se puede comprar
  approximatePrice?: number; // Precio aproximado
  averageRating?: number; // Calificación promedio del item (1-5)
  totalRatings?: number; // Número total de calificaciones (nuevo campo del backend)
  ratingsCount?: number; // Número total de calificaciones (campo anterior para compatibilidad)
  commentCount?: number; // Número de comentarios (nuevo campo del backend)
  userRating?: number; // Calificación del usuario actual (1-5), null si no ha calificado
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface ListComment {
  id: string;
  itemId: string;
  listId: string;
  userId: string; // Nuevo campo del backend
  authorId?: string; // Campo anterior para compatibilidad
  userName: string; // Nuevo campo del backend - nombre real
  authorName?: string; // Campo anterior para compatibilidad
  userPhoto?: string; // Nuevo campo del backend - foto de perfil
  authorPhoto?: string; // Campo anterior para compatibilidad
  content: string;
  createdAt: any; // Firestore Timestamp
}

export interface List {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string; // URL de imagen de la lista (opcional)
  isPublic: boolean;
  creatorId: string;
  creatorName: string;
  creatorPhoto?: string;
  items: ListItem[];
  itemsCount: number;
  completedItemsCount: number;
  starsCount: number;
  commentsCount: number;
  isStarred?: boolean; // Para el usuario actual
  isOwner?: boolean; // Para el usuario actual
  originalListId?: string; // Para listas copiadas
  originalListTitle?: string; // Para listas copiadas
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface CreateListData {
  title: string;
  description?: string;
  imageUrl?: string; // URL de imagen de la lista (opcional)
  isPublic: boolean;
}

export interface UpdateListData {
  title?: string;
  description?: string;
  imageUrl?: string; // URL de imagen de la lista (opcional)
  isPublic?: boolean;
}

export interface CreateItemData {
  text: string;
  imageUrl?: string; // URL de imagen del item (opcional)
  priority?: 'low' | 'medium' | 'high'; // Prioridad del item
  details?: string; // Detalles adicionales del item
  brand?: string; // Marca del producto/item
  store?: string; // Tienda donde se puede comprar
  approximatePrice?: number; // Precio aproximado
}

export interface CreateCommentData {
  content: string;
}

export interface ListsResponse {
  success: boolean;
  data: List[];
  message?: string;
}

export interface ListResponse {
  success: boolean;
  data: List;
  message?: string;
}

export interface ListItemResponse {
  success: boolean;
  data: ListItem;
  message?: string;
}

export interface CommentsResponse {
  success: boolean;
  data: ListComment[];
  message?: string;
}

export interface StarResponse {
  success: boolean;
  data: {
    starsCount: number;
    isStarred: boolean;
  };
  message?: string;
}

export interface CopyListResponse {
  success: boolean;
  data: {
    listId: string;
    title: string;
  };
  message?: string;
}
