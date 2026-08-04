// Layer 1: Edge & Delivery Service
// Cloudflare CDN, Images, Stream, WAF

import { config } from "@/lib/config/layers"

export class EdgeService {
  private cdnUrl: string

  constructor() {
    this.cdnUrl = config.edge.cdn.baseUrl
  }

  // Get optimized image URL via Cloudflare Images
  getOptimizedImageUrl(
    imageId: string,
    options: {
      width?: number
      height?: number
      fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"
      quality?: number
      format?: "auto" | "webp" | "avif" | "json"
    } = {},
  ): string {
    const { width, height, fit = "cover", quality = 80, format = "auto" } = options
    const params = new URLSearchParams()

    if (width) params.set("width", width.toString())
    if (height) params.set("height", height.toString())
    params.set("fit", fit)
    params.set("quality", quality.toString())
    params.set("format", format)

    return `${this.cdnUrl}/cdn-cgi/image/${params.toString()}/${imageId}`
  }

  // Get video stream URL
  getStreamUrl(videoId: string): string {
    const accountId = config.edge.stream.accountId
    return `https://customer-${accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`
  }

  // Get video thumbnail
  getStreamThumbnail(videoId: string, time = 0): string {
    const accountId = config.edge.stream.accountId
    return `https://customer-${accountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=${time}s`
  }

  // Purge CDN cache
  async purgeCache(urls: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${config.backend.baseUrl}/api/v1/edge/purge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export const edgeService = new EdgeService()
