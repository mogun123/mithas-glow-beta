export type LogLevel = 'error' | 'warn' | 'info' | 'success' | 'debug';

export interface LoggerContext {
  region?: string;
  pixelCount?: number;
  landmarkCount?: number;
  fallbackStatus?: string;
  errorType?: string;
  [key: string]: any;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  level: LogLevel;
  context?: LoggerContext;
}

export interface DebugState {
  landmarksCount: number;
  foreheadPointsPresent: boolean;
  regionPixelCount: number;
  currentFallbackStatus: string;
  lastError: string;
  isProcessing: boolean;
  lastUpdate: string;
}

export interface RegionExtractionResult {
  success: boolean;
  warning?: string;
  region: string;
  pixelCount: number;
  landmarks: any[];
  fallbackUsed?: boolean;
}
