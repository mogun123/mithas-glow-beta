import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Export auth separately for easier access
export const { auth } = supabase;

// Export database client for type-safe queries
export const db = supabase;

// Export realtime for real-time subscriptions
export const realtime = supabase.realtime;

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  const url = (import.meta as any).env.VITE_SUPABASE_URL;
  const key = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  
  return !!(url && key && 
    url !== 'https://your-project.supabase.co' && 
    key !== 'your-anon-key'
  );
};

// Types for Supabase
export interface Database {
  public: {
    Tables: {
      reels: {
        Row: {
          id: string;
          username: string;
          description: string;
          video_url: string;
          likes: number;
          comments: number;
          shares: number;
          song: string;
          has_product: boolean;
          has_ar: boolean;
          ai_match_score: number;
          is_artist: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          description: string;
          video_url: string;
          likes?: number;
          comments?: number;
          shares?: number;
          song: string;
          has_product: boolean;
          has_ar: boolean;
          ai_match_score?: number;
          is_artist: boolean;
          created_at?: string;
        };
        Update: {
          id: string;
          username?: string;
          description?: string;
          video_url?: string;
          likes?: number;
          comments?: number;
          shares?: number;
          song?: string;
          has_product?: boolean;
          has_ar?: boolean;
          ai_match_score?: number;
          is_artist?: boolean;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          description: string;
          image_url: string;
          vendor: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          description: string;
          image_url: string;
          vendor: string;
          created_at?: string;
        };
        Update: {
          id: string;
          name?: string;
          price?: number;
          description?: string;
          image_url?: string;
          vendor?: string;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          reel_id: string;
          user_id: string;
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reel_id: string;
          user_id: string;
          text: string;
          created_at?: string;
        };
        Update: {
          id: string;
          reel_id?: string;
          user_id?: string;
          text?: string;
          created_at?: string;
        };
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      vault: {
        Row: {
          id: string;
          user_id: string;
          reel_id: string;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reel_id: string;
          saved_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          reel_id?: string;
          saved_at?: string;
        };
      };
      cart: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          quantity: number;
          added_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          quantity?: number;
          added_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          product_id?: string;
          quantity?: number;
          added_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          artist_id: string;
          service_type: string;
          preferred_date: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          artist_id: string;
          service_type: string;
          preferred_date: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          artist_id?: string;
          service_type?: string;
          preferred_date?: string;
          status?: string;
          created_at?: string;
        };
      };
      clinical_analyses: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          skin_tone: string;
          undertone: string;
          skin_type: string;
          metrics: Record<string, number>;
          spatial_data: Record<string, Array<{x: number, y: number, intensity: number}>>;
          frame_data: Record<string, {image: string, timestamp: string}>;
          lab_values: Record<string, {l: number, a: number, b: number}>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          skin_tone: string;
          undertone: string;
          skin_type: string;
          metrics: Record<string, number>;
          spatial_data: Record<string, Array<{x: number, y: number, intensity: number}>>;
          frame_data: Record<string, {image: string, timestamp: string}>;
          lab_values: Record<string, {l: number, a: number, b: number}>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          session_id?: string;
          skin_tone?: string;
          undertone?: string;
          skin_type?: string;
          metrics?: Record<string, number>;
          spatial_data?: Record<string, Array<{x: number, y: number, intensity: number}>>;
          frame_data?: Record<string, {image: string, timestamp: string}>;
          lab_values?: Record<string, {l: number, a: number, b: number}>;
          updated_at?: string;
        };
      };
      scheduled_scans: {
        Row: {
          id: string;
          user_id: string;
          scheduled_at: string;
          scheduled_time: string;
          status: 'upcoming' | 'completed' | 'cancelled' | 'missed';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          scheduled_at: string;
          scheduled_time: string;
          status?: 'upcoming' | 'completed' | 'cancelled' | 'missed';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          scheduled_at?: string;
          scheduled_time?: string;
          status?: 'upcoming' | 'completed' | 'cancelled' | 'missed';
          notes?: string | null;
          updated_at?: string;
        };
      };
      clinical_metrics_history: {
        Row: {
          id: string;
          user_id: string;
          analysis_date: string;
          metrics: Record<string, number>;
          improvements: Record<string, number>;
          recommendations: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          analysis_date: string;
          metrics: Record<string, number>;
          improvements: Record<string, number>;
          recommendations: string[];
          created_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          analysis_date?: string;
          metrics?: Record<string, number>;
          improvements?: Record<string, number>;
          recommendations?: string[];
        };
      };
      user_skin_profiles: {
        Row: {
          id: string;
          user_id: string;
          latest_analysis_id: string | null;
          current_skin_tone: string | null;
          current_undertone: string | null;
          current_skin_type: string | null;
          current_metrics: Record<string, any> | null;
          preferred_products: string[];
          skin_concerns: string[];
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          latest_analysis_id?: string | null;
          current_skin_tone?: string | null;
          current_undertone?: string | null;
          current_skin_type?: string | null;
          current_metrics?: Record<string, any> | null;
          preferred_products?: string[];
          skin_concerns?: string[];
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id: string;
          user_id?: string;
          latest_analysis_id?: string | null;
          current_skin_tone?: string | null;
          current_undertone?: string | null;
          current_skin_type?: string | null;
          current_metrics?: Record<string, any> | null;
          preferred_products?: string[];
          skin_concerns?: string[];
          last_updated?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
