/**
 * Cloudflare Services - Layer 1 Edge & Delivery
 * CDN, Stream, Images, R2, WAF integration
 */

import { arcticConfig, getCdnUrl, getStreamUrl, getImageUrl, getR2Url } from "@/lib/config/arctic"

// Types
export interface CloudflareStreamVideo {
  uid: string
  thumbnail: string
  playback: {
    hls: string
    dash: string
  }
  duration: number
  size: number
  status: "ready" | "processing" | "error"
}

export interface CloudflareImage {
  id: string
  filename: string
  variants: string[]
  uploaded: string
}

export interface R2Object {
  key: string
  size: number
  etag: string
  lastModified: string
  url: string
}

/**
 * Cloudflare Service for Edge & Delivery Layer
 */
class CloudflareService {
  private accountId: string
  private streamUrl: string
  private imagesUrl: string

  constructor() {
    this.accountId = arcticConfig.edge.cloudflare.accountId
    this.streamUrl = arcticConfig.edge.cloudflare.stream.url
    this.imagesUrl = arcticConfig.edge.cloudflare.images.deliveryUrl
  }

  // ==========================================
  // CDN & Static Assets
  // ==========================================

  /**
   * Get CDN-optimized URL for static assets
   */
  getCdnUrl(path: string): string {
    return getCdnUrl(path)
  }

  /**
   * Get optimized image URL with transformations
   */
  getOptimizedImageUrl(
    url: string,
    options?: {
      width?: number
      height?: number
      fit?: "scale-down" | "contain" | "cover" | "crop" | "pad"
      quality?: number
      format?: "webp" | "avif" | "jpeg" | "png"
    },
  ): string {
    const cdnUrl = arcticConfig.edge.cloudflare.cdnUrl
    if (!cdnUrl) return url

    const params = []
    if (options?.width) params.push(`width=${options.width}`)
    if (options?.height) params.push(`height=${options.height}`)
    if (options?.fit) params.push(`fit=${options.fit}`)
    if (options?.quality) params.push(`quality=${options.quality}`)
    if (options?.format) params.push(`format=${options.format}`)

    if (params.length === 0) return url

    return `${cdnUrl}/cdn-cgi/image/${params.join(",")}/${url}`
  }

  // ==========================================
  // Cloudflare Stream (Video)
  // ==========================================

  /**
   * Get HLS stream URL for video playback
   */
  getStreamHlsUrl(videoId: string): string {
    return getStreamUrl(videoId)
  }

  /**
   * Get DASH stream URL for video playback
   */
  getStreamDashUrl(videoId: string): string {
    if (this.streamUrl) {
      return `${this.streamUrl}/${videoId}/manifest/video.mpd`
    }
    return ""
  }

  /**
   * Get video thumbnail URL
   */
  getStreamThumbnailUrl(videoId: string, time = 0): string {
    if (this.streamUrl) {
      return `${this.streamUrl}/${videoId}/thumbnails/thumbnail.jpg?time=${time}s`
    }
    return ""
  }

  /**
   * Get animated GIF preview
   */
  getStreamGifUrl(videoId: string, duration = 5): string {
    if (this.streamUrl) {
      return `${this.streamUrl}/${videoId}/thumbnails/thumbnail.gif?duration=${duration}s`
    }
    return ""
  }

  // ==========================================
  // Cloudflare Images
  // ==========================================

  /**
   * Get Cloudflare Images URL with variant
   */
  getImagesUrl(imageId: string, variant = "public"): string {
    return getImageUrl(imageId, variant)
  }

  /**
   * Get all image variants
   */
  getImageVariants(imageId: string): {
    original: string
    thumbnail: string
    medium: string
    large: string
  } {
    return {
      original: this.getImagesUrl(imageId, "public"),
      thumbnail: this.getImagesUrl(imageId, "thumbnail"),
      medium: this.getImagesUrl(imageId, "medium"),
      large: this.getImagesUrl(imageId, "large"),
    }
  }

  // ==========================================
  // Cloudflare R2 (Object Storage)
  // ==========================================

  /**
   * Get R2 public URL for an object
   */
  getR2PublicUrl(key: string, bucket: "media" | "reels" | "assets" = "media"): string {
    return getR2Url(key, bucket)
  }

  /**
   * Check if R2 is configured
   */
  isR2Configured(): boolean {
    return !!arcticConfig.edge.cloudflare.r2.accessKeyId
  }

  // ==========================================
  // Video Processing Helpers
  // ==========================================

  /**
   * Get video player config for Cloudflare Stream
   */
  getVideoPlayerConfig(videoId: string): {
    src: string
    poster: string
    type: string
  } {
    return {
      src: this.getStreamHlsUrl(videoId),
      poster: this.getStreamThumbnailUrl(videoId),
      type: "application/x-mpegURL",
    }
  }

  /**
   * Check if Stream is configured
   */
  isStreamConfigured(): boolean {
    return arcticConfig.edge.cloudflare.stream.enabled
  }

  /**
   * Check if Images is configured
   */
  isImagesConfigured(): boolean {
    return !!arcticConfig.edge.cloudflare.images.deliveryUrl
  }
}

export const cloudflareService = new CloudflareService()
export default cloudflareService
