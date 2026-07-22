// MITHAS GLOW - Complete 9-Layer Architecture Configuration
// All services and integrations centralized

const config = {
  app: {
    name: "MITHAS GLOW",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },

  // Layer 1: Edge & Delivery (Cloudflare)
  edge: {
    cdn: {
      provider: "cloudflare",
      baseUrl: process.env.NEXT_PUBLIC_CDN_URL || "",
      imageOptimization: true,
    },
    stream: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      apiToken: process.env.CLOUDFLARE_STREAM_TOKEN || "",
      baseUrl: process.env.CLOUDFLARE_STREAM_URL || "",
    },
    r2: {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID || "",
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      bucket: "mithas-glow-media",
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
    isr: { revalidate: 60 },
  },

  // Layer 3: Backend Core (FastAPI)
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    timeout: 30000,
    retryAttempts: 3,
    version: "v1",
  },

  // Layer 4: Data Layer (Supabase PostgreSQL + pgVector + PostGIS)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  database: {
    vector: {
      enabled: true,
      dimensions: 1536,
      index: "ivfflat",
    },
    geo: {
      enabled: true,
      srid: 4326,
    },
  },

  // Layer 5: Storage & Media
  storage: {
    buckets: {
      products: "product-images",
      profiles: "profile-images",
      reels: "reels",
      reviews: "review-images",
      ar: "ar-models",
    },
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxVideoSize: 100 * 1024 * 1024, // 100MB
    allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
    allowedVideoTypes: ["video/mp4", "video/webm", "video/mov"],
  },

  // Layer 6: AI & Personalization
  ai: {
    skinAnalysis: {
      endpoint: "/api/ai/skin-analysis",
      model: "mediapipe-tflite",
    },
    virtualTryOn: {
      endpoint: "/api/ai/virtual-tryon",
      model: "tensorflow-lite",
    },
    chat: {
      endpoint: "/api/ai/chat",
      model: "gpt-4",
    },
    recommendations: {
      endpoint: "/api/ai/recommendations",
      model: "pgvector-tensorflow",
    },
    faceMesh: {
      endpoint: "/api/ai/face-mesh",
      model: "mediapipe-facemesh",
    },
    virtualPhotoshoot: {
      endpoint: "/api/ai/virtual-photoshoot",
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

  // Layer 9: Payments (Razorpay + GlowPay Wallet)
  payments: {
    razorpay: {
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
      keySecret: process.env.RAZORPAY_KEY_SECRET,
    },
    currency: "INR",
    methods: ["upi", "card", "netbanking", "wallet"],
    glowPay: {
      enabled: true,
      minBalance: 100,
      maxBalance: 100000,
    },
  },

  // Search (Meilisearch/ElasticSearch)
  search: {
    provider: "meilisearch",
    url: process.env.MEILISEARCH_URL || "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_API_KEY,
    indexes: {
      products: "products",
      sellers: "sellers",
      salons: "salons",
      reels: "reels",
    },
  },

  // Caching (Redis/Upstash)
  cache: {
    provider: "upstash",
    url: process.env.UPSTASH_REDIS_URL || "",
    token: process.env.UPSTASH_REDIS_TOKEN || "",
    ttl: {
      products: 3600,
      user: 1800,
      search: 300,
    },
  },

  // Notifications (FCM)
  notifications: {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    firebaseConfig: {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },
  },

  // Booking (Google Calendar)
  booking: {
    googleCalendar: {
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID || "",
      apiKey: process.env.GOOGLE_CALENDAR_API_KEY || "",
    },
  },

  // Feature Flags
  features: {
    virtualTryOn: true,
    aiSkinAnalysis: true,
    aiChat: true,
    reels: true,
    liveStreaming: false,
    arFilters: true,
    virtualPhotoshoot: true,
    glowPay: true,
    nearbySearch: true,
  },
}

export const appConfig = config
export type AppConfig = typeof config
export default config
