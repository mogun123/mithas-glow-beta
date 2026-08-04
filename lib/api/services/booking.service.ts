/**
 * Booking Service - Salon Booking Integration
 * Google Calendar API via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"

// Types
export interface Salon {
  id: string
  name: string
  slug: string
  description: string
  address: string
  city: string
  state: string
  location: {
    lat: number
    lng: number
  }
  phone: string
  email: string
  images: string[]
  rating: number
  reviews_count: number
  services_count: number
  is_verified: boolean
  opening_hours: {
    [day: string]: { open: string; close: string } | null
  }
  amenities: string[]
  created_at: string
}

export interface SalonWithDistance extends Salon {
  distance_km: number
}

export interface Service {
  id: string
  salon_id: string
  name: string
  description: string
  category: string
  price: number
  duration_minutes: number
  image_url?: string
  is_popular: boolean
}

export interface TimeSlot {
  start: string
  end: string
  time?: string
  start_time?: string
  available: boolean
  staff_id?: string
  staff_name?: string
}

export interface Booking {
  id: string
  booking_number: string
  user_id: string
  salon_id: string
  salon: Salon
  service_id: string
  service: Service
  staff_id?: string
  staff_name?: string
  slot_start: string
  slot_end: string
  status: BookingStatus
  notes?: string
  total_price: number
  payment_status: "pending" | "paid" | "refunded"
  created_at: string
  updated_at: string
}

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show"

export interface CreateBookingData {
  salon_id?: string
  salonId?: string
  service_id?: string
  serviceId?: string
  slot_start?: string
  slot_end?: string
  date?: string
  time?: string
  staff_id?: string
  notes?: string
  payment_method?: string
}

/**
 * Booking Service
 */
export const bookingService = {
  // Salons
  salons: {
    list: (params?: {
      city?: string
      service_category?: string
      page?: number
      limit?: number
    }): Promise<ApiResponse<Salon[]>> => httpClient.get(ENDPOINTS.BOOKING.SALONS, { params }),

    get: (id: string): Promise<ApiResponse<Salon>> => httpClient.get(ENDPOINTS.BOOKING.SALON_DETAIL(id)),

    getServices: (salonId: string): Promise<ApiResponse<Service[]>> =>
      httpClient.get(ENDPOINTS.BOOKING.SERVICES(salonId)),

    getSlots: (
      salonId: string,
      params: { service_id?: string; date: string; staff_id?: string },
    ): Promise<ApiResponse<TimeSlot[]>> => httpClient.get(ENDPOINTS.BOOKING.SLOTS(salonId), { params }),
  },

  // Bookings
  bookings: {
    create: (data: CreateBookingData): Promise<ApiResponse<Booking>> => {
      const normalizedData = {
        salon_id: data.salon_id || data.salonId,
        service_id: data.service_id || data.serviceId,
        slot_start: data.slot_start || (data.date && data.time ? `${data.date}T${data.time}:00` : undefined),
        slot_end: data.slot_end,
        staff_id: data.staff_id,
        notes: data.notes,
        payment_method: data.payment_method,
      }
      return httpClient.post(ENDPOINTS.BOOKING.CREATE, normalizedData)
    },

    myBookings: (params?: {
      status?: BookingStatus | string
      page?: number
      limit?: number
    }): Promise<ApiResponse<Booking[]>> => httpClient.get(ENDPOINTS.BOOKING.MY_BOOKINGS, { params }),

    cancel: (id: string, reason?: string): Promise<ApiResponse<{ refund_amount?: number }>> =>
      httpClient.post(ENDPOINTS.BOOKING.CANCEL(id), { reason }),

    reschedule: (id: string, data: { slot_start: string; slot_end: string }): Promise<ApiResponse<Booking>> =>
      httpClient.post(ENDPOINTS.BOOKING.RESCHEDULE(id), data),
  },
}

export default bookingService
