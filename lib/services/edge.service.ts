// Layer 1: Edge & Delivery Service
// Cloudflare CDN, Images, Stream, R2

import { appConfig } from "@/lib/config"

class EdgeService {
  private cdnUrl: string
  private streamAccountId: string

  constructor() {
    this.cdnUrl = appConfig.edge.cdn.baseUrl
    this.streamAccountId = appConfig.edge.stream.accountId
  }

  // Get optimized image URL via Cloudflare Images
  getOptimizedImageUrl(
    imageId: string,
    options: {
      width?: number
      height?: number
      fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"
      quality?: number
      format?: "auto" | "webp" | "avif"
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

  // Get video stream URL (HLS)
  getStreamUrl(videoId: string): string {
    return `https://customer-${this.streamAccountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`
  }

  // Get video thumbnail
  getStreamThumbnail(videoId: string, timeSeconds = 0): string {
    return `https://customer-${this.streamAccountId}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=${timeSeconds}s`
  }

  // Get video embed URL
  getStreamEmbedUrl(videoId: string): string {
    return `https://customer-${this.streamAccountId}.cloudflarestream.com/${videoId}/iframe`
  }

  // Purge CDN cache via FastAPI
  async purgeCache(urls: string[]): Promise<boolean> {
    try {
      const response = await fetch(`${appConfig.api.baseUrl}/api/v1/edge/purge-cache`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  // Get R2 signed URL for direct upload
  async getR2UploadUrl(filename: string, contentType: string): Promise<{ uploadUrl: string; publicUrl: string }> {
    const response = await fetch(`${appConfig.api.baseUrl}/api/v1/storage/r2-upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content_type: contentType }),
    })

    if (!response.ok) throw new Error("Failed to get upload URL")
    return response.json()
  }
}

export const edgeService = new EdgeService()
