/**
 * Environment Configuration
 * MITHAS GLOW - Centralized environment variable management
 * Compatible with both Next.js and Vite
 */

// Type-safe environment variable accessor
const getEnv = (key: string, required = false): string => {
  let value = ""

  // Next.js environment variables
  if (typeof process !== "undefined" && process.env) {
    value = process.env[`NEXT_PUBLIC_${key}`] || process.env[key] || ""
  }

  // Vite environment variables (fallback)
  if (!value && typeof import.meta !== "undefined" && import.meta.env) {
    const env = import.meta.env as Record<string, string>
    value = env[`VITE_${key}`] || ""
  }

  if (required && !value) {
    console.warn(`[ENV] Missing required environment variable: ${key}`)
  }

  return value
}

/**
 * Environment Configuration Object
 * All environment variables for MITHAS GLOW
 */
export const ENV = {
  // =====================================================
  // Arctic Layer 3 - FastAPI Backend
  // =====================================================
  FASTAPI_URL: getEnv("FASTAPI_URL") || "http://localhost:8000",
  API_VERSION: getEnv("API_VERSION") || "v1",

  // =====================================================
  // Arctic Layer 4 - Supabase (PostgreSQL + Auth)
  // =====================================================
  SUPABASE_URL: getEnv("SUPABASE_URL", true),
  SUPABASE_ANON_KEY: getEnv("SUPABASE_ANON_KEY", true),
  SUPABASE_SERVICE_ROLE_KEY: getEnv("SUPABASE_SERVICE_ROLE_KEY"), // Server-only

  // =====================================================
  // Arctic Layer 5 - Storage (Cloudflare R2 / Supabase Storage)
  // =====================================================
  R2_ACCOUNT_ID: getEnv("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: getEnv("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: getEnv("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET_NAME: getEnv("R2_BUCKET_NAME") || "mithas-glow-assets",
  CDN_URL: getEnv("CDN_URL") || "https://cdn.mithasglow.com",

  // =====================================================
  // Arctic Layer 6 - AI/ML Services
  // =====================================================
  AI_SERVICE_URL: getEnv("AI_SERVICE_URL") || getEnv("FASTAPI_URL") || "http://localhost:8000",
  TENSORFLOW_MODEL_PATH: getEnv("TENSORFLOW_MODEL_PATH"),

  // =====================================================
  // Arctic Layer 7 - Security
  // =====================================================
  KEYCLOAK_URL: getEnv("KEYCLOAK_URL"),
  KEYCLOAK_REALM: getEnv("KEYCLOAK_REALM") || "mithas-glow",
  KEYCLOAK_CLIENT_ID: getEnv("KEYCLOAK_CLIENT_ID"),

  // =====================================================
  // Arctic Layer 8 - Analytics & Monitoring
  // =====================================================
  POSTHOG_API_KEY: getEnv("POSTHOG_API_KEY"),
  POSTHOG_HOST: getEnv("POSTHOG_HOST") || "https://app.posthog.com",
  SENTRY_DSN: getEnv("SENTRY_DSN"),

  // =====================================================
  // Payment Gateways
  // =====================================================
  RAZORPAY_KEY_ID: getEnv("RAZORPAY_KEY_ID"),
  RAZORPAY_KEY_SECRET: getEnv("RAZORPAY_KEY_SECRET"), // Server-only
  STRIPE_PUBLISHABLE_KEY: getEnv("STRIPE_PUBLISHABLE_KEY"),
  STRIPE_SECRET_KEY: getEnv("STRIPE_SECRET_KEY"), // Server-only

  // =====================================================
  // Application Settings
  // =====================================================
  NODE_ENV: getEnv("NODE_ENV") || "development",
  APP_URL: getEnv("APP_URL") || "http://localhost:3000",
  APP_NAME: "MITHAS GLOW",
  APP_VERSION: getEnv("APP_VERSION") || "1.0.0",

  // Feature flags
  ENABLE_AI_FEATURES: getEnv("ENABLE_AI_FEATURES") === "true",
  ENABLE_AR_TRYON: getEnv("ENABLE_AR_TRYON") === "true",
  ENABLE_REELS: getEnv("ENABLE_REELS") === "true",
  ENABLE_CHAT: getEnv("ENABLE_CHAT") === "true",
  ENABLE_ANALYTICS: getEnv("ENABLE_ANALYTICS") === "true",
} as const

/**
 * Check if all required environment variables are set
 */
export const validateEnv = (): { valid: boolean; missing: string[] } => {
  const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY"]

  const missing = required.filter((key) => {
    const value = ENV[key as keyof typeof ENV]
    return !value || value === ""
  })

  return {
    valid: missing.length === 0,
    missing,
  }
}

/**
 * Get environment status for debugging
 */
export const getEnvStatus = () => {
  const { valid, missing } = validateEnv()

  return {
    valid,
    missing,
    environment: ENV.NODE_ENV,
    services: {
      supabase: !!ENV.SUPABASE_URL && !!ENV.SUPABASE_ANON_KEY,
      fastapi: !!ENV.FASTAPI_URL,
      ai: !!ENV.AI_SERVICE_URL,
      analytics: !!ENV.POSTHOG_API_KEY,
      payments: !!ENV.RAZORPAY_KEY_ID || !!ENV.STRIPE_PUBLISHABLE_KEY,
    },
    features: {
      ai: ENV.ENABLE_AI_FEATURES,
      ar: ENV.ENABLE_AR_TRYON,
      reels: ENV.ENABLE_REELS,
      chat: ENV.ENABLE_CHAT,
      analytics: ENV.ENABLE_ANALYTICS,
    },
  }
}

/**
 * Check if running in development
 */
export const isDev = () => ENV.NODE_ENV === "development"

/**
 * Check if running in production
 */
export const isProd = () => ENV.NODE_ENV === "production"

export default ENV
