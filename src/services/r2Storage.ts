interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

class R2StorageService {
  private config: R2Config;
  private isConfigured: boolean = false;

  constructor() {
    // Initialize with environment variables
    this.config = {
      accountId: import.meta.env.VITE_R2_ACCOUNT_ID || '',
      accessKeyId: import.meta.env.VITE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY || '',
      bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'glow-chat-media',
      publicUrl: import.meta.env.VITE_R2_PUBLIC_URL || '',
    };

    this.isConfigured = !!(this.config.accountId && this.config.accessKeyId && this.config.secretAccessKey);
  }

  async uploadFile(file: File): Promise<UploadResult> {
    if (!this.isConfigured) {
      throw new Error('R2 storage not configured');
    }

    try {
      // Generate unique file key
      const fileKey = this.generateFileKey(file.name);
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', fileKey);
      formData.append('contentType', file.type);

      // Upload to R2 via API route
      const response = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        url: result.url,
        key: result.key,
        size: file.size,
        contentType: file.type,
      };
    } catch (error) {
      console.error('Failed to upload file to R2:', error);
      throw error;
    }
  }

  async uploadImage(file: File): Promise<UploadResult> {
    // Validate image file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Image size must be less than 10MB');
    }

    // Compress image if needed
    const compressedFile = await this.compressImage(file);
    
    return this.uploadFile(compressedFile);
  }

  async uploadVideo(file: File): Promise<UploadResult> {
    // Validate video file
    if (!file.type.startsWith('video/')) {
      throw new Error('File must be a video');
    }

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      throw new Error('Video size must be less than 100MB');
    }

    return this.uploadFile(file);
  }

  async uploadAudio(file: File): Promise<UploadResult> {
    // Validate audio file
    if (!file.type.startsWith('audio/')) {
      throw new Error('File must be an audio file');
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      throw new Error('Audio size must be less than 20MB');
    }

    return this.uploadFile(file);
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.isConfigured) {
      throw new Error('R2 storage not configured');
    }

    try {
      const response = await fetch('/api/r2/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to delete file from R2:', error);
      throw error;
    }
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('R2 storage not configured');
    }

    try {
      const response = await fetch('/api/r2/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, expiresIn }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const { url } = await response.json();
      return url;
    } catch (error) {
      console.error('Failed to get signed URL:', error);
      throw error;
    }
  }

  async getFileMetadata(key: string): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('R2 storage not configured');
    }

    try {
      const response = await fetch(`/api/r2/metadata/${key}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get file metadata: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      console.error('Failed to get file metadata:', error);
      throw error;
    }
  }

  private generateFileKey(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const baseName = originalName.split('.').slice(0, -1).join('.');
    
    // Sanitize filename
    const sanitizedName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    return `chat-media/${timestamp}_${randomString}_${sanitizedName}.${extension}`;
  }

  private async compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 1920x1080)
        let { width, height } = img;
        const maxWidth = 1920;
        const maxHeight = 1080;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress image
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          0.8 // Quality: 80%
        );
      };

      img.onerror = () => {
        resolve(file); // Return original if compression fails
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Utility methods for file type detection
  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  isVideoFile(file: File): boolean {
    return file.type.startsWith('video/');
  }

  isAudioFile(file: File): boolean {
    return file.type.startsWith('audio/');
  }

  // Get file preview URL for chat messages
  async getPreviewUrl(file: File): Promise<string> {
    if (this.isImageFile(file)) {
      return URL.createObjectURL(file);
    }

    if (this.isVideoFile(file)) {
      // For videos, we could generate a thumbnail
      return URL.createObjectURL(file);
    }

    if (this.isAudioFile(file)) {
      // Return audio waveform or default audio icon
      return '/icons/audio-placeholder.svg';
    }

    // Default file icon
    return '/icons/file-placeholder.svg';
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file extension icon
  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const iconMap: Record<string, string> = {
      'jpg': '/icons/image.svg',
      'jpeg': '/icons/image.svg',
      'png': '/icons/image.svg',
      'gif': '/icons/image.svg',
      'webp': '/icons/image.svg',
      'mp4': '/icons/video.svg',
      'mov': '/icons/video.svg',
      'avi': '/icons/video.svg',
      'webm': '/icons/video.svg',
      'mp3': '/icons/audio.svg',
      'wav': '/icons/audio.svg',
      'ogg': '/icons/audio.svg',
      'pdf': '/icons/pdf.svg',
      'doc': '/icons/document.svg',
      'docx': '/icons/document.svg',
      'txt': '/icons/text.svg',
    };

    return iconMap[extension || ''] || '/icons/file.svg';
  }
}

export const r2Storage = new R2StorageService();
