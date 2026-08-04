/**
 * API Module Exports
 * MITHAS GLOW - Centralized API access
 */

// Core client and config
export { apiClient, type ApiResponse, type ApiError } from "./client"
export { API_CONFIG, API_ENDPOINTS, getApiUrl, isApiConfigured } from "./config"

// Services
export { aiService } from "./services/ai.service"
export { authService } from "./auth"

// Re-export types
export type {
  SkinAnalysisResult,
  ARTryOnResult,
  StyleRecommendation,
  PersonalizedFeedItem,
} from "./services/ai.service"
