// Layer 4 Extension: Geo Service
// PostGIS queries for location-based features

import { appConfig } from "@/lib/config"

class GeoService {
  private baseUrl: string

  constructor() {
    this.baseUrl = appConfig.api.baseUrl
  }

  // Get user's current location
  async getCurrentLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation not supported"))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          reject(new Error(error.message))
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  // Find nearby salons
  async findNearbySalons(
    lat: number,
    lng: number,
    options: { radiusKm?: number; limit?: number; services?: string[] } = {},
  ): Promise<SalonWithDistance[]> {
    const { radiusKm = 10, limit = 20, services } = options

    const response = await fetch(`${this.baseUrl}/api/v1/geo/nearby-salons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat,
        lng,
        radius_km: radiusKm,
        limit,
        services,
      }),
    })

    if (!response.ok) throw new Error("Failed to find nearby salons")
    const data = await response.json()
    return data.salons
  }

  // Find nearby deals
  async findNearbyDeals(lat: number, lng: number, radiusKm = 10): Promise<DealWithDistance[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/geo/nearby-deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, radius_km: radiusKm }),
    })

    if (!response.ok) throw new Error("Failed to find nearby deals")
    const data = await response.json()
    return data.deals
  }

  // Get directions to a location
  async getDirections(from: { lat: number; lng: number }, to: { lat: number; lng: number }): Promise<DirectionsResult> {
    const response = await fetch(`${this.baseUrl}/api/v1/geo/directions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from_lat: from.lat,
        from_lng: from.lng,
        to_lat: to.lat,
        to_lng: to.lng,
      }),
    })

    if (!response.ok) throw new Error("Failed to get directions")
    return response.json()
  }

  // Search salons by area (city/region)
  async searchByArea(area: string, options: { services?: string[]; rating?: number } = {}): Promise<SalonResult[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/geo/search-area`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ area, ...options }),
    })

    if (!response.ok) throw new Error("Failed to search area")
    const data = await response.json()
    return data.salons
  }

  // Calculate distance between two points
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1)
    const dLng = this.toRad(lng2 - lng1)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180)
  }
}

interface SalonWithDistance {
  id: string
  name: string
  address: string
  location: { lat: number; lng: number }
  rating: number
  reviews_count: number
  images: string[]
  services: string[]
  distance_km: number
}

interface DealWithDistance {
  id: string
  title: string
  description: string
  discount_percent: number
  salon: {
    id: string
    name: string
    address: string
  }
  distance_km: number
  expires_at: string
}

interface DirectionsResult {
  distance_km: number
  duration_minutes: number
  polyline: string
  steps: {
    instruction: string
    distance_km: number
    duration_minutes: number
  }[]
}

interface SalonResult {
  id: string
  name: string
  address: string
  rating: number
  services: string[]
}

export const geoService = new GeoService()
