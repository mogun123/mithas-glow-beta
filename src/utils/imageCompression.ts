/**
 * Image Compression Utility for Seller Dashboard
 * Optimizes images for storage and Supabase upload
 * Reduces browser localStorage usage and improves performance
 */

interface CompressedImageResult {
  compressedDataUrl: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  format: string;
}

/**
 * Compress image using canvas with optimized JPEG settings
 * @param file - Original image file
 * @param maxWidth - Maximum width for compression (default: 1200)
 * @param maxHeight - Maximum height for compression (default: 1200)
 * @param quality - JPEG quality (0.1 to 1.0, default: 0.7)
 * @returns Promise<CompressedImageResult>
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions maintaining aspect ratio
      let { width, height } = calculateDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      // Draw and compress image
      ctx?.drawImage(img, 0, 0, width, height);

      // Use JPEG with optimized quality for better compression
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Calculate compression metrics
      const originalSize = file.size;
      const compressedSize = Math.round((compressedDataUrl.length * 3) / 4); // Base64 to bytes approximation
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      resolve({
        compressedDataUrl,
        originalSize,
        compressedSize,
        compressionRatio,
        format: 'image/jpeg'
      });
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image from canvas directly (for camera captures)
 * @param canvas - HTML canvas element
 * @param quality - JPEG quality (default: 0.7)
 * @returns Compressed data URL
 */
export function compressCanvas(
  canvas: HTMLCanvasElement,
  quality: number = 0.7
): string {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Calculate dimensions maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if larger than max dimensions
  if (width > maxWidth || height > maxHeight) {
    const aspectRatio = width / height;

    if (width > height) {
      width = maxWidth;
      height = maxWidth / aspectRatio;
    } else {
      height = maxHeight;
      width = maxHeight * aspectRatio;
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Upload compressed image to Supabase Storage
 * @param compressedDataUrl - Base64 compressed image
 * @param fileName - Name for the file
 * @param bucket - Supabase bucket name (default: 'product-images')
 * @returns Public URL of uploaded image
 */
export async function uploadToSupabaseStorage(
  compressedDataUrl: string,
  fileName: string,
  bucket: string = 'product-images'
): Promise<string> {
  try {
    // Convert base64 to blob
    const response = await fetch(compressedDataUrl);
    const blob = await response.blob();
    
    // Generate unique file name with timestamp
    const uniqueFileName = `${fileName}-${Date.now()}.jpg`;
    
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('../lib/supabase');
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(uniqueFileName, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600', // 1 hour cache
        upsert: false
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }
}

/**
 * Fallback for offline mode - store compressed image in localStorage
 * @param compressedDataUrl - Compressed image data URL
 * @param productId - Product ID for key
 */
export function storeOfflineImage(compressedDataUrl: string, productId: string): void {
  try {
    const key = `mithas_product_image_${productId}`;
    localStorage.setItem(key, compressedDataUrl);
  } catch (error) {
    console.warn('Failed to store image offline:', error);
  }
}

/**
 * Retrieve offline image from localStorage
 * @param productId - Product ID
 * @returns Image data URL or null
 */
export function getOfflineImage(productId: string): string | null {
  try {
    const key = `mithas_product_image_${productId}`;
    return localStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to retrieve offline image:', error);
    return null;
  }
}

/**
 * Clean up old offline images to prevent localStorage overflow
 * @param maxImages - Maximum number of images to keep (default: 50)
 */
export function cleanupOfflineImages(maxImages: number = 50): void {
  try {
    const keys = Object.keys(localStorage).filter(key => 
      key.startsWith('mithas_product_image_')
    );

    if (keys.length > maxImages) {
      // Sort by timestamp (extracted from key) and remove oldest
      const sortedKeys = keys.sort((a, b) => {
        const timestampA = parseInt(a.split('_').pop() || '0');
        const timestampB = parseInt(b.split('_').pop() || '0');
        return timestampA - timestampB;
      });

      // Remove oldest images
      const keysToRemove = sortedKeys.slice(0, keys.length - maxImages);
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log(`Cleaned up ${keysToRemove.length} old offline images`);
    }
  } catch (error) {
    console.warn('Failed to cleanup offline images:', error);
  }
}
