"use client"

/**
 * Geo Hooks
 * Location-based services via FastAPI + PostGIS
 */

import useSWR from "swr"
import { geoService, type LocationSearchResult, type Deal } from "@/lib/api"

export function useNearbyStores(lat?: number, lng?: number, radiusKm?: number) {
  const { data, error, isLoading, mutate } = useSWR<{ id: string; name: string; address: string; distance: string }[]>(
    lat && lng ? `/geo/nearby-stores?lat=${lat}&lng=${lng}` : null,
    async () => {
      // Use nearby deals endpoint to get stores - in production this would be a separate endpoint
      const response = await geoService.nearbyDeals(lat!, lng!, radiusKm)
      if (!response.success) throw new Error(response.error)
      // Transform deals to store format
      const deals = response.data || []
      return deals.map((deal: Deal) => ({
        id: deal.id,
        name: deal.store_name || deal.title,
        address: deal.address || "",
        distance: deal.distance ? `${deal.distance.toFixed(1)} km` : "N/A",
      }))
    },
    { revalidateOnFocus: false },
  )

  return { stores: data || [], isLoading, error, refetch: mutate }
}

export function useNearbyDeals(lat?: number, lng?: number, radiusKm?: number) {
  const { data, error, isLoading, mutate } = useSWR<Deal[]>(
    lat && lng ? `/geo/nearby-deals?lat=${lat}&lng=${lng}` : null,
    async () => {
      const response = await geoService.nearbyDeals(lat!, lng!, radiusKm)
      if (!response.success) throw new Error(response.error)
      return response.data || []
    },
    { revalidateOnFocus: false },
  )

  return { deals: data || [], isLoading, error, refetch: mutate }
}

export function useLocationSearch(query: string) {
  const { data, error, isLoading } = useSWR<LocationSearchResult[]>(
    query ? `/geo/search?q=${encodeURIComponent(query)}` : null,
    async () => {
      const response = await geoService.searchLocation(query)
      if (!response.success) throw new Error(response.error)
      return response.data || []
    },
    { revalidateOnFocus: false },
  )

  return { results: data || [], isLoading, error }
}

export function useUserLocation() {
  const { data, error, isLoading, mutate } = useSWR<{ lat: number; lng: number } | null>(
    "user-location",
    async () => {
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
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000 },
        )
      })
    },
    { revalidateOnFocus: false },
  )

  return { location: data, isLoading, error, refetch: mutate }
}
