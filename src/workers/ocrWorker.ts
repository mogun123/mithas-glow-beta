/**
 * OCR Web Worker for Seller Dashboard
 * Moves Tesseract OCR processing off main thread to prevent UI freezing
 * Includes timeout protection and progress reporting
 */

// Import Tesseract.js in worker context
declare const importScripts: (...urls: string[]) => void;
importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js');

interface OCRWorkerMessage {
  type: 'OCR_REQUEST';
  payload: {
    imageData: {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    };
    language?: string;
    timeout?: number;
  };
}

interface OCRWorkerResponse {
  type: 'OCR_SUCCESS' | 'OCR_ERROR' | 'OCR_PROGRESS';
  payload: {
    text?: string;
    confidence?: number;
    progress?: number;
    status?: string;
    error?: string;
  };
}

// Supported languages for OCR
const SUPPORTED_LANGUAGES = {
  eng: 'English',
  tam: 'Tamil'
};

// Default timeout for OCR processing (30 seconds)
const DEFAULT_TIMEOUT = 30000;

let currentTimeout: number | null = null;

/**
 * Cleanup any pending timeout
 */
function clearCurrentTimeout(): void {
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }
}

/**
 * Send progress update to main thread
 */
function sendProgress(progress: number, status: string): void {
  self.postMessage({
    type: 'OCR_PROGRESS',
    payload: { progress, status }
  } as OCRWorkerResponse);
}

/**
 * Send success response
 */
function sendSuccess(text: string, confidence: number): void {
  clearCurrentTimeout();
  self.postMessage({
    type: 'OCR_SUCCESS',
    payload: { text, confidence }
  } as OCRWorkerResponse);
}

/**
 * Send error response
 */
function sendError(error: string): void {
  clearCurrentTimeout();
  self.postMessage({
    type: 'OCR_ERROR',
    payload: { error }
  } as OCRWorkerResponse);
}

/**
 * Set timeout for OCR operation
 */
function setTimeoutWrapper(timeout: number): void {
  clearCurrentTimeout();
  currentTimeout = setTimeout(() => {
      sendError(`OCR timeout after ${timeout}ms`);
    }, timeout) as unknown as number;
}

/**
 * Convert ImageData to canvas for Tesseract
 */
function imageDataToCanvas(imageData: any): HTMLCanvasElement {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const clampedArray = new Uint8ClampedArray(imageData.data);
    const imageDataObj = new ImageData(clampedArray, imageData.width, imageData.height);
    ctx.putImageData(imageDataObj, 0, 0);
  }
  
  return canvas as any;
}

/**
 * Main OCR processing function
 */
async function processOCR(
  imageData: any,
  language: string = 'eng',
  timeout: number = DEFAULT_TIMEOUT
): Promise<void> {
  try {
    sendProgress(0, 'Initializing OCR engine...');
    
    // Set timeout
    setTimeoutWrapper(timeout);
    
    // Validate Tesseract availability
    if (typeof self.Tesseract === 'undefined') {
      throw new Error('Tesseract.js not available in worker');
    }

    sendProgress(10, 'Loading language data...');
    
    // Create canvas from image data
    const canvas = imageDataToCanvas(imageData);
    
    sendProgress(20, 'Preparing image for OCR...');
    
    // Perform OCR with progress callback
    const result = await self.Tesseract.recognize(canvas, language, {
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 80) + 20; // Scale to 20-100%
          sendProgress(progress, `Recognizing text... ${Math.round(m.progress * 100)}%`);
        } else if (m.status === 'loading tesseract core') {
          sendProgress(15, 'Loading OCR engine...');
        } else if (m.status === 'initializing tesseract') {
          sendProgress(18, 'Initializing OCR...');
        }
      }
    });

    sendProgress(95, 'Processing results...');
    
    // Extract text and confidence
    const text = result?.data?.text || '';
    const confidence = result?.data?.confidence || 0;
    
    if (!text.trim()) {
      sendError('No text detected in image');
      return;
    }

    sendProgress(100, 'OCR complete');
    
    // Send successful result
    sendSuccess(text.trim(), confidence);
    
  } catch (error) {
    console.error('OCR Worker Error:', error);
    sendError(error instanceof Error ? error.message : 'Unknown OCR error');
  }
}

/**
 * Handle messages from main thread
 */
self.onmessage = async (event: MessageEvent<OCRWorkerMessage>) => {
  const { type, payload } = event.data;
  
  if (type === 'OCR_REQUEST') {
    const { imageData, language = 'eng', timeout = DEFAULT_TIMEOUT } = payload;
    
    // Validate language support
    if (!SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES]) {
      sendError(`Unsupported language: ${language}. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
      return;
    }
    
    // Validate image data
    if (!imageData || !imageData.data || !imageData.width || !imageData.height) {
      sendError('Invalid image data provided');
      return;
    }
    
    // Start OCR processing
    await processOCR(imageData, language, timeout);
  }
};

/**
 * Handle worker errors
 */
self.onerror = (error: string | Event) => {
  const errorMessage = typeof error === 'string' ? error : 
    (error as any).message || (error as any).toString() || 'Unknown worker error';
  sendError(`Worker error: ${errorMessage}`);
};

/**
 * Handle unhandled rejections
 */
self.onunhandledrejection = (event: PromiseRejectionEvent) => {
  sendError(`Unhandled promise rejection: ${event.reason}`);
};

// Export for TypeScript
export {};
