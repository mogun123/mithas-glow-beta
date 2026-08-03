export interface ReelItem {
  id: string;
  videoUrl: string;
  thumbnail: string;
  duration: number;
  title: string;
  creator: string;
  likes: number;
  views: number;
  createdAt?: string;
  category?: string;
}
