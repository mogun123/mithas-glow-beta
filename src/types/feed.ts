export interface FeedCard {
  id: string;
  type: 'product' | 'tutorial' | 'reel' | 'post';
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  thumbnail?: string;
  creator?: string;
  creatorAvatar?: string;
  category?: string;
  tags?: string[];
  likes?: number;
  views?: number;
  comments?: number;
  createdAt?: string;
  location?: {
    city?: string;
    country?: string;
  };
  price?: number;
  discount?: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  metadata?: Record<string, any>;
}
