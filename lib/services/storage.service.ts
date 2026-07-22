// Storage Service - File Uploads, Image Optimization
import { createBrowserClient } from "@supabase/ssr"
import { appConfig } from "@/lib/config"

export interface UploadResult {
  url: string
  path: string
  size: number
  contentType: string
}

export interface ImageVariants {
  original: string
  thumbnail: string
  medium: string
  large: string
}

class StorageService {
  private supabase
  private cdnUrl: string

  constructor() {
    this.supabase = createBrowserClient(appConfig.supabase.url, appConfig.supabase.anonKey)
    this.cdnUrl = appConfig.cdn.baseUrl
  }

  async uploadImage(file: File, bucket: keyof typeof appConfig.storage.buckets, path?: string): Promise<UploadResult> {
    // Validate file type
    if (!appConfig.storage.allowedImageTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.")
    }

    // Validate file size
    if (file.size > appConfig.storage.maxFileSize) {
      throw new Error("File size exceeds 10MB limit.")
    }

    // Compress image before upload
    const compressedFile = await this.compressImage(file)

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = path ? `${path}/${timestamp}.${extension}` : `${timestamp}.${extension}`

    const bucketName = appConfig.storage.buckets[bucket]

    const { data, error } = await this.supabase.storage.from(bucketName).upload(fileName, compressedFile, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = this.supabase.storage.from(bucketName).getPublicUrl(data.path)

    return {
      url: this.getCdnUrl(urlData.publicUrl),
      path: data.path,
      size: compressedFile.size,
      contentType: compressedFile.type,
    }
  }

  async uploadVideo(file: File, bucket: keyof typeof appConfig.storage.buckets, path?: string): Promise<UploadResult> {
    // Validate file type
    if (!appConfig.storage.allowedVideoTypes.includes(file.type)) {
      throw new Error("Invalid file type. Only MP4 and WebM are allowed.")
    }

    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const fileName = path ? `${path}/${timestamp}.${extension}` : `${timestamp}.${extension}`

    const bucketName = appConfig.storage.buckets[bucket]

    const { data, error } = await this.supabase.storage.from(bucketName).upload(fileName, file, {
      cacheControl: "3600",
      upsert: false,
    })

    if (error) {
      throw new Error(`Upload failed: ${error.message}`)
    }

    const { data: urlData } = this.supabase.storage.from(bucketName).getPublicUrl(data.path)

    return {
      url: urlData.publicUrl,
      path: data.path,
      size: file.size,
      contentType: file.type,
    }
  }

  async deleteFile(bucket: keyof typeof appConfig.storage.buckets, path: string): Promise<void> {
    const bucketName = appConfig.storage.buckets[bucket]

    const { error } = await this.supabase.storage.from(bucketName).remove([path])

    if (error) {
      throw new Error(`Delete failed: ${error.message}`)
    }
  }

  getImageVariants(originalUrl: string): ImageVariants {
    if (!this.cdnUrl) {
      return {
        original: originalUrl,
        thumbnail: originalUrl,
        medium: originalUrl,
        large: originalUrl,
      }
    }

    // Cloudflare Image Resizing
    return {
      original: originalUrl,
      thumbnail: `${this.cdnUrl}/cdn-cgi/image/width=150,height=150,fit=cover/${originalUrl}`,
      medium: `${this.cdnUrl}/cdn-cgi/image/width=400,height=400,fit=cover/${originalUrl}`,
      large: `${this.cdnUrl}/cdn-cgi/image/width=800,height=800,fit=contain/${originalUrl}`,
    }
  }

  private async compressImage(file: File): Promise<File> {
    // Skip compression for small files
    if (file.size < 500 * 1024) {
      return file
    }

    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = new Image()
      img.crossOrigin = "anonymous"

      img.onload = () => {
        // Calculate new dimensions (max 1920px)
        const maxSize = 1920
        let { width, height } = img

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height / width) * maxSize
            width = maxSize
          } else {
            width = (width / height) * maxSize
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name, { type: "image/jpeg" }))
            } else {
              resolve(file)
            }
          },
          "image/jpeg",
          0.85,
        )
      }

      img.onerror = () => resolve(file)
      img.src = URL.createObjectURL(file)
    })
  }

  private getCdnUrl(url: string): string {
    if (!this.cdnUrl) return url
    // Replace Supabase URL with CDN URL if configured
    return url.replace(appConfig.supabase.url, this.cdnUrl)
  }
}

export const storageService = new StorageService()
