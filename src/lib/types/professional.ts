/**
 * Professional Dashboard Types
 * Strict type definitions for the Professional Dashboard
 */

import { Database } from './database.types';

// Booking status union type - matches database constraint
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

// Professional role types - supports future expansion
export type ProfessionalRole = 
  | 'seller'
  | 'professional'
  | 'makeup_artist'
  | 'hair_stylist'
  | 'salon'
  | 'spa'
  | 'nail_artist'
  | 'mehendi_artist'
  | 'photographer'
  | 'fashion_designer';

// Database-derived types
export type BookingRow = Database['public']['Tables']['bookings']['Row'];
export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
export type ReviewRow = Database['public']['Tables']['reviews']['Row'];

// Booking with customer details (joined data)
export interface BookingWithDetails {
  id: string;
  customer_id: string;
  artist_id: string;
  service_name: string | null;
  total_price: number | null;
  booking_date: string;
  booking_time?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: BookingStatus;
  created_at: string;
  updated_at?: string;
  customer?: {
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
  };
}

// Dashboard statistics
export interface DashboardStats {
  todayBookings: number;
  pendingRequests: number;
  upcomingAppointments: number;
  completedToday: number;
  todaysEarnings: number;
  monthlyEarnings: number;
  averageRating: number;
  totalReviews: number;
}

// Tab navigation types
export type DashboardTab = 
  | 'dashboard' 
  | 'bookings' 
  | 'availability' 
  | 'ai-assistant' 
  | 'analytics' 
  | 'profile';

// Booking filter types
export type BookingFilter = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled';

// Component props
export interface ProfessionalDashboardProps {
  onNavigateHome?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToMirror?: () => void;
}

// Helper function to check if a role is a professional role
export function isProfessionalRole(role: string | null | undefined): role is ProfessionalRole {
  if (!role) return false;
  
  const professionalRoles: readonly string[] = [
    'seller',
    'professional',
    'makeup_artist',
    'hair_stylist',
    'salon',
    'spa',
    'nail_artist',
    'mehendi_artist',
    'photographer',
    'fashion_designer',
  ] as const;
  
  return professionalRoles.includes(role);
}

// Type guard for BookingStatus
export function isValidBookingStatus(status: string): status is BookingStatus {
  const validStatuses: readonly BookingStatus[] = [
    'pending',
    'confirmed',
    'completed',
    'cancelled',
    'no_show',
  ];
  return validStatuses.includes(status as BookingStatus);
}

// Safe date extraction helper type
export interface DateExtractable {
  booking_date?: string;
  appointment_date?: string;
  date?: string;
  created_at?: string;
}

// Safe time extraction helper type
export interface TimeExtractable {
  booking_time?: string;
  appointment_time?: string;
  time?: string;
}
