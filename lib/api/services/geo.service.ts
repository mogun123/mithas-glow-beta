/**
 * Geo Service - Location-based Features
 * PostGIS via FastAPI
 */

import { httpClient, type ApiResponse } from "../http-client"
import { ENDPOINTS } from "../config"
import type { SalonWithDistance, Salon } from "./booking.service"

// Types
export interface Deal {
  id: string
  title: string
  description: string
  discount_percent: number
  discount_amount?: number
  salon_id: string
  salon: Salon
  service_ids?: string[]
  valid_from: string
  valid_until: string
  terms?: string
  image_url?: string
  distance_km?: number
  store_name?: string
  address?: string
  distance?: number
}

export interface RouteInfo {
  distance_km: number
  duration_minutes: number
  polyline: string
  steps?: RouteStep[]
}

export interface RouteStep {
  instruction: string
  distance_km: number
  duration_minutes: number
}

export interface LocationSearchResult {
  place_id: string
  name: string
  address: string
  location: {
    lat: number
    lng: number
  }
  type: string
}

/**
 * Geo Service
 */
export const geoService = {
  // Nearby Search
  nearbySalons: (lat: number, lng: number, radiusKm?: number): Promise<ApiResponse<SalonWithDistance[]>> =>
    httpClient.post(ENDPOINTS.GEO.NEARBY_SALONS, {
      lat,
      lng,
      radius_km: radiusKm || 10,
    }),

  nearbyDeals: (lat: number, lng: number, radiusKm?: number): Promise<ApiResponse<Deal[]>> =>
    httpClient.post(ENDPOINTS.GEO.NEARBY_DEALS, {
      lat,
      lng,
      radius_km: radiusKm || 10,
    }),

  // Directions
  getDirections: (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): Promise<ApiResponse<RouteInfo>> =>
    httpClient.post(ENDPOINTS.GEO.DIRECTIONS, {
      from_lat: from.lat,
      from_lng: from.lng,
      to_lat: to.lat,
      to_lng: to.lng,
    }),

  // Location Search
  searchLocation: (query: string): Promise<ApiResponse<LocationSearchResult[]>> =>
    httpClient.get(ENDPOINTS.GEO.SEARCH_LOCATION, { params: { q: query } }),
}

export default geoService
