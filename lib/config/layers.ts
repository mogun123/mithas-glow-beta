// MITHAS GLOW - 9-Layer Architecture Configuration

export const config = {
  // Layer 1: Edge & Delivery
  edge: {
    cdn: {
      provider: "cloudflare",
      baseUrl: process.env.NEXT_PUBLIC_CDN_URL || "",
      imageOptimization: true,
    },
    stream: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      apiToken: process.env.CLOUDFLARE_STREAM_TOKEN || "",
    },
    security: {
      waf: true,
      ddosProtection: true,
      rateLimit: 1000,
    },
  },

  // Layer 2: Frontend Experience (Next.js on Vercel)
  frontend: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    ssr: true,
    isr: {
      revalidate: 60,
    },
  },

  // Layer 3: Backend Core (FastAPI)
  backend: {
    baseUrl: process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000",
    apiVersion: "v1",
    timeout: 30000,
  },

  // Layer 4: Data Layer (Supabase PostgreSQL)
  data: {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    },
    vector: {
      enabled: true,
      dimensions: 1536,
    },
    geo: {
      enabled: true,
      srid: 4326,
    },
  },

  // Layer 5: Storage & Media
  storage: {
    supabase: {
      bucket: "user-uploads",
      maxSize: 10 * 1024 * 1024, // 10MB
    },
    cloudflareR2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      bucket: "mithas-glow-media",
    },
    stream: {
      maxDuration: 300, // 5 minutes
      allowedFormats: ["mp4", "mov", "webm"],
    },
  },

  // Layer 6: AI & Personalization
  ai: {
    skinAnalysis: {
      endpoint: "/api/v1/ai/skin-analysis",
      model: "mediapipe-tflite",
    },
    makeupTryOn: {
      endpoint: "/api/v1/ai/makeup-tryon",
      model: "tensorflow-lite",
    },
    faceMesh: {
      endpoint: "/api/v1/ai/face-mesh",
      model: "mediapipe-facemesh",
    },
    recommendations: {
      endpoint: "/api/v1/ai/recommendations",
      model: "pgvector-tensorflow",
    },
    virtualPhotoshoot: {
      endpoint: "/api/v1/ai/virtual-photoshoot",
      model: "stable-diffusion-controlnet",
    },
    safetyFilter: {
      enabled: true,
      model: "opencv-clip",
    },
  },

  // Layer 7: Security
  security: {
    auth: {
      provider: "supabase",
      sessionDuration: 7 * 24 * 60 * 60, // 7 days
    },
    encryption: {
      algorithm: "AES-256",
    },
    jwt: {
      expiresIn: "1h",
    },
  },

  // Layer 8: Analytics & Monitoring
  analytics: {
    posthog: {
      apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    },
    sentry: {
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || "",
    },
  },

  // Layer 9: Payments
  payments: {
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID || "",
      keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    },
    glowPay: {
      enabled: true,
      minBalance: 100,
    },
  },
}

export type Config = typeof config
