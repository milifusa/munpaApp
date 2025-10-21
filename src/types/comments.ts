export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface CreateCommentData {
  content: string;
}

export interface CommentResponse {
  success: boolean;
  message: string;
  data: Comment | Comment[];
}
