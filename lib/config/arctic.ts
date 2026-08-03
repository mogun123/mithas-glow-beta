/**
 * MITHAS GLOW - Arctic 12-Layer Architecture Configuration
 * Complete integration with all technical tools
 *
 * Traffic Flow:
 * User -> Cloudflare (CDN + WAF) -> AWS ALB -> Nginx -> Next.js Frontend (Docker) -> FastAPI Backend -> Supabase
 */

// Environment helper
const getEnv = (key: string, fallback = ""): string => {
  if (typeof process !== "undefined" && process.env) {
    return process.env[key] || process.env[`NEXT_PUBLIC_${key}`] || fallback
  }
  return fallback
}

/**
 * Complete Arctic 12-Layer Configuration
 */
export const arcticConfig = {
  // ================================================
  // LAYER 1: EDGE & DELIVERY (Cloudflare Only)
  // ================================================
  edge: {
    cloudflare: {
      // CDN & DNS
      cdnUrl: getEnv("CLOUDFLARE_CDN_URL", ""),
      zoneId: getEnv("CLOUDFLARE_ZONE_ID", ""),
      accountId: getEnv("CLOUDFLARE_ACCOUNT_ID", ""),

      // SSL & Security
      sslMode: "strict" as const,
      wafEnabled: true,
      ddosProtection: true,

      // Edge Routing
      edgeRouting: {
        enabled: true,
        regions: ["asia-south1", "us-east1", "eu-west1"],
      },

      // Cloudflare Stream (Video)
      stream: {
        url: getEnv("CLOUDFLARE_STREAM_URL", ""),
        customerSubdomain: getEnv("CLOUDFLARE_STREAM_SUBDOMAIN", ""),
        enabled: !!getEnv("CLOUDFLARE_STREAM_URL"),
      },

      // Cloudflare Images
      images: {
        accountHash: getEnv("CLOUDFLARE_IMAGES_ACCOUNT_HASH", ""),
        deliveryUrl: getEnv("CLOUDFLARE_IMAGES_URL", ""),
        variants: ["public", "thumbnail", "medium", "large"],
        quality: 85,
        formats: ["webp", "avif", "jpeg"],
      },

      // Cloudflare R2 (Object Storage)
      r2: {
        accountId: getEnv("CLOUDFLARE_ACCOUNT_ID", ""),
        accessKeyId: getEnv("R2_ACCESS_KEY_ID", ""),
        secretAccessKey: getEnv("R2_SECRET_ACCESS_KEY", ""),
        buckets: {
          media: "mithas-glow-media",
          reels: "mithas-glow-reels",
          assets: "mithas-glow-assets",
        },
        publicUrl: getEnv("R2_PUBLIC_URL", ""),
        maxVideoSize: 100 * 1024 * 1024, // 100MB
      },
    },
  },

  // ================================================
  // LAYER 2: FRONTEND EXPERIENCE (Self-hosted Next.js)
  // ================================================
  frontend: {
    // Hosting: AWS EKS (Kubernetes) - Docker container via Nginx
    hosting: {
      platform: "aws-eks" as const,
      containerRuntime: "docker",
      reverseProxy: "nginx",
      alternativeHosts: ["aws-ec2", "aws-ecs", "cloudflare-pages"] as const,
    },

    url: getEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

    // Next.js App Router Configuration
    nextjs: {
      appRouter: true,
      serverComponents: true,
      clientComponents: true,
      staticGeneration: true,
      // NO API routes - all handled by FastAPI
      apiRoutes: false,
      serverActions: false,
    },

    // UI Libraries
    styling: {
      tailwindcss: true,
      shadcnui: true,
    },

    // State Management
    stateManagement: {
      zustand: true,
      redux: false, // Using Zustand instead
    },

    // Supabase Client-Side
    supabaseSDK: {
      realtime: true,
      auth: true,
      storage: true,
    },
  },

  // ================================================
  // LAYER 3: BACKEND CORE (FastAPI - Main Brain)
  // ================================================
  backend: {
    fastapi: {
      url: getEnv("NEXT_PUBLIC_API_URL", getEnv("FASTAPI_URL", "http://localhost:8000")),
      version: "v1",
      timeout: 30000,
      uploadTimeout: 120000,
      retries: 3,
      retryDelay: 1000,
    },

    // Nginx Reverse Proxy
    nginx: {
      enabled: true,
      upstreamServers: ["fastapi:8000"],
      cacheEnabled: true,
      rateLimiting: {
        requestsPerSecond: 100,
        burstSize: 200,
      },
    },

    // AWS Load Balancers
    loadBalancer: {
      type: "alb" as const, // Application Load Balancer
      healthCheckPath: "/health",
      targetGroup: "fastapi-targets",
    },

    // Redis / Upstash (Caching & Sessions)
    redis: {
      url: getEnv("UPSTASH_REDIS_REST_URL", getEnv("REDIS_URL", "")),
      token: getEnv("UPSTASH_REDIS_REST_TOKEN", ""),
      enabled: !!getEnv("UPSTASH_REDIS_REST_URL") || !!getEnv("REDIS_URL"),
      ttl: {
        session: 7 * 24 * 60 * 60, // 7 days
        cache: 60 * 60, // 1 hour
        rateLimit: 60, // 1 minute
      },
    },

    // Meilisearch / Elasticsearch (Search)
    search: {
      provider: "meilisearch" as const,
      meilisearch: {
        host: getEnv("MEILISEARCH_HOST", "http://localhost:7700"),
        apiKey: getEnv("MEILISEARCH_API_KEY", ""),
        indexes: {
          products: "products",
          sellers: "sellers",
          reels: "reels",
          salons: "salons",
        },
      },
      elasticsearch: {
        node: getEnv("ELASTICSEARCH_NODE", ""),
        apiKey: getEnv("ELASTICSEARCH_API_KEY", ""),
      },
    },

    // FFmpeg (Video Processing)
    ffmpeg: {
      enabled: true,
      maxDuration: 300, // 5 minutes
      outputFormats: ["mp4", "webm", "hls"],
      thumbnailFormat: "jpg",
      compressionPreset: "medium",
    },

    // Razorpay API (Payments)
    razorpay: {
      keyId: getEnv("RAZORPAY_KEY_ID", ""),
      keySecret: getEnv("RAZORPAY_KEY_SECRET", ""),
      webhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET", ""),
      enabled: !!getEnv("RAZORPAY_KEY_ID"),
    },

    // Google Calendar API (Booking)
    googleCalendar: {
      clientId: getEnv("GOOGLE_CLIENT_ID", ""),
      clientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
      redirectUri: getEnv("GOOGLE_REDIRECT_URI", ""),
      enabled: !!getEnv("GOOGLE_CLIENT_ID"),
    },

    // Firebase Cloud Messaging (Push Notifications)
    fcm: {
      projectId: getEnv("FCM_PROJECT_ID", ""),
      privateKey: getEnv("FCM_PRIVATE_KEY", ""),
      clientEmail: getEnv("FCM_CLIENT_EMAIL", ""),
      vapidKey: getEnv("NEXT_PUBLIC_FCM_VAPID_KEY", ""),
      enabled: !!getEnv("FCM_PROJECT_ID"),
    },

    // Supabase Edge Functions (Light Jobs Only)
    supabaseEdge: {
      url: getEnv("SUPABASE_URL", ""),
      anonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
      serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
    },
  },

  // ================================================
  // LAYER 4: DATA LAYER (Supabase PostgreSQL)
  // ================================================
  database: {
    supabase: {
      url: getEnv("NEXT_PUBLIC_SUPABASE_URL", ""),
      anonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""),
      serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
    },

    // PostgreSQL Extensions
    extensions: {
      pgVector: {
        enabled: true,
        dimensions: 1536, // OpenAI embeddings
        indexType: "ivfflat",
      },
      postGIS: {
        enabled: true,
        srid: 4326,
      },
      pgBouncer: {
        enabled: true,
        poolMode: "transaction",
        maxConnections: 100,
      },
    },

    // Supabase Realtime
    realtime: {
      enabled: true,
      channels: ["orders", "chat", "notifications", "presence"],
    },

    // Supabase Storage
    storage: {
      buckets: {
        avatars: "avatars",
        products: "products",
        reels: "reels",
        chat: "chat-attachments",
        skinProfiles: "skin-profiles",
      },
      maxFileSize: 10 * 1024 * 1024, // 10MB
    },

    // Supabase Analytics
    analytics: {
      enabled: true,
    },
  },

  // ================================================
  // LAYER 5: STORAGE & MEDIA
  // ================================================
  storage: {
    // Supabase Storage (User photos, JSON)
    supabase: {
      allowedImageTypes: ["image/jpeg", "image/png", "image/webp"],
      allowedVideoTypes: ["video/mp4", "video/webm"],
      maxImageSize: 10 * 1024 * 1024, // 10MB
      maxVideoSize: 100 * 1024 * 1024, // 100MB
    },

    // Cloudflare R2 (Reels, Large Media)
    r2: {
      enabled: !!getEnv("R2_ACCESS_KEY_ID"),
      useForReels: true,
      useForLargeMedia: true,
    },

    // Cloudflare Stream (Video Playback)
    stream: {
      enabled: !!getEnv("CLOUDFLARE_STREAM_URL"),
      useForReels: true,
      adaptiveBitrate: true,
    },

    // CDN-backed Static Delivery
    cdn: {
      enabled: !!getEnv("CLOUDFLARE_CDN_URL"),
      cacheControl: "public, max-age=31536000",
    },
  },

  // ================================================
  // LAYER 6: AI & PERSONALIZATION
  // ================================================
  ai: {
    // TensorFlow Lite
    tensorflowLite: {
      enabled: true,
      models: {
        skinAnalysis: "skin-analysis-v2.tflite",
        virtualTryOn: "virtual-tryon-v1.tflite",
        productRecognition: "product-recognition-v1.tflite",
      },
    },

    // PyTorch
    pytorch: {
      enabled: true,
      models: {
        styleTransfer: "style-transfer.pt",
        colorAnalysis: "color-analysis.pt",
      },
    },

    // MediaPipe
    mediapipe: {
      faceMesh: {
        enabled: true,
        maxFaces: 1,
        refineLandmarks: true,
      },
      selfieSegmentation: {
        enabled: true,
        modelSelection: 1,
      },
    },

    // OpenCV
    opencv: {
      enabled: true,
      features: ["face_detection", "skin_tone_analysis", "color_matching"],
    },

    // CLIP (Image-Text Matching)
    clip: {
      enabled: true,
      model: "ViT-B/32",
      endpoint: "/ai/clip-search",
    },

    // Stable Diffusion
    stableDiffusion: {
      enabled: true,
      model: "sd-v1-5",
      endpoint: "/ai/generate-image",
    },

    // ControlNet
    controlNet: {
      enabled: true,
      models: ["canny", "depth", "pose"],
      endpoint: "/ai/controlnet",
    },

    // AI Recommender (FastAPI + pgVector)
    recommender: {
      enabled: true,
      algorithm: "collaborative-filtering",
      embeddingModel: "text-embedding-ada-002",
      endpoint: "/ai/recommendations",
    },
  },

  // ================================================
  // LAYER 7: AR / GLOW MIRROR
  // ================================================
  arMirror: {
    // MediaPipe FaceMesh
    faceMesh: {
      enabled: true,
      maxFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    },

    // TensorFlow Lite
    tflite: {
      enabled: true,
      models: ["makeup-overlay.tflite", "lipstick.tflite", "eyeshadow.tflite"],
    },

    // Unity AR Foundation (Phase-2)
    unityAR: {
      enabled: false, // Phase 2
      arFoundation: true,
      arCore: true,
      arKit: true,
    },

    // Real-time Try-On
    realTimeTryOn: {
      enabled: true,
      fps: 30,
      resolution: { width: 640, height: 480 },
    },

    // Encrypted Profiles (Supabase Storage)
    encryptedProfiles: {
      enabled: true,
      encryption: "AES-256-GCM",
      bucket: "skin-profiles",
    },
  },

  // ================================================
  // LAYER 8: CORE PRODUCT MODULES
  // ================================================
  modules: {
    glowShop: {
      enabled: true,
      features: ["cart", "wishlist", "reviews", "recommendations"],
    },
    glowReels: {
      enabled: true,
      maxDuration: 300, // 5 minutes
      features: ["like", "comment", "share", "products"],
    },
    glowChat: {
      enabled: true,
      features: ["vendor-chat", "ai-stylist", "support"],
    },
    glowMirror: {
      enabled: true,
      features: ["skin-analysis", "virtual-tryon", "ar-makeup"],
    },
    glowWallet: {
      enabled: true,
      minBalance: 100,
      maxBalance: 100000,
      features: ["add-funds", "pay", "transfer", "payout"],
    },
    glowArtistBooking: {
      enabled: true,
      features: ["salon-search", "slot-booking", "google-calendar"],
    },
    infinityGlowFeed: {
      enabled: true,
      features: ["personalized", "trending", "following"],
    },
  },

  // ================================================
  // LAYER 9: SECURITY & IDENTITY
  // ================================================
  security: {
    // Supabase Auth
    supabaseAuth: {
      enabled: true,
      providers: ["email", "google", "apple"],
      emailConfirmation: true,
      phoneVerification: true,
    },

    // Keycloak (Advanced IAM) - Phase 2
    keycloak: {
      enabled: false,
      realm: getEnv("KEYCLOAK_REALM", ""),
      clientId: getEnv("KEYCLOAK_CLIENT_ID", ""),
      clientSecret: getEnv("KEYCLOAK_CLIENT_SECRET", ""),
    },

    // JWT Configuration
    jwt: {
      accessTokenExpiry: "1h",
      refreshTokenExpiry: "7d",
      algorithm: "RS256",
    },

    // Encryption
    encryption: {
      algorithm: "AES-256-GCM",
      keyDerivation: "PBKDF2",
    },

    // HashiCorp Vault (Phase 2)
    vault: {
      enabled: false,
      address: getEnv("VAULT_ADDR", ""),
      token: getEnv("VAULT_TOKEN", ""),
    },

    // Cloudflare WAF Rules
    waf: {
      enabled: true,
      rules: ["sql-injection", "xss", "rce", "rate-limiting"],
    },

    // Rate Limiting
    rateLimiting: {
      nginx: {
        requestsPerSecond: 100,
        burstSize: 200,
      },
      edge: {
        requestsPerMinute: 1000,
      },
    },
  },

  // ================================================
  // LAYER 10: ANALYTICS & OBSERVABILITY
  // ================================================
  analytics: {
    // PostHog
    posthog: {
      apiKey: getEnv("NEXT_PUBLIC_POSTHOG_KEY", ""),
      host: getEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://app.posthog.com"),
      enabled: !!getEnv("NEXT_PUBLIC_POSTHOG_KEY"),
    },

    // Grafana
    grafana: {
      url: getEnv("GRAFANA_URL", ""),
      apiKey: getEnv("GRAFANA_API_KEY", ""),
      enabled: !!getEnv("GRAFANA_URL"),
    },

    // Prometheus
    prometheus: {
      enabled: true,
      pushGateway: getEnv("PROMETHEUS_PUSHGATEWAY", ""),
      scrapeInterval: "15s",
    },

    // Loki (Logs)
    loki: {
      url: getEnv("LOKI_URL", ""),
      enabled: !!getEnv("LOKI_URL"),
    },

    // Jaeger (Tracing)
    jaeger: {
      collectorEndpoint: getEnv("JAEGER_COLLECTOR_ENDPOINT", ""),
      enabled: !!getEnv("JAEGER_COLLECTOR_ENDPOINT"),
    },

    // Sentry (Error Tracking)
    sentry: {
      dsn: getEnv("NEXT_PUBLIC_SENTRY_DSN", ""),
      environment: getEnv("NODE_ENV", "development"),
      enabled: !!getEnv("NEXT_PUBLIC_SENTRY_DSN"),
    },
  },

  // ================================================
  // LAYER 11: DEVOPS & DEPLOYMENT
  // ================================================
  devops: {
    // Docker
    docker: {
      enabled: true,
      registry: "aws-ecr",
      image: "mithas-glow-frontend",
    },

    // Kubernetes (AWS EKS)
    kubernetes: {
      enabled: true,
      cluster: getEnv("EKS_CLUSTER_NAME", "mithas-glow-cluster"),
      namespace: "production",
      replicas: 3,
    },

    // GitHub Actions (CI/CD)
    cicd: {
      provider: "github-actions",
      workflows: ["build", "test", "deploy"],
    },

    // AWS ECR
    ecr: {
      repositoryUri: getEnv("AWS_ECR_REPOSITORY_URI", ""),
      region: getEnv("AWS_REGION", "ap-south-1"),
    },

    // AWS CodePipeline
    codePipeline: {
      enabled: false, // Using GitHub Actions
    },

    // Backups
    backups: {
      s3: {
        bucket: getEnv("AWS_BACKUP_BUCKET", "mithas-glow-backups"),
        enabled: true,
      },
      supabase: {
        enabled: true,
        schedule: "daily",
      },
    },
  },

  // ================================================
  // LAYER 12: ADMIN & QA
  // ================================================
  admin: {
    // Appsmith / Retool
    dashboard: {
      provider: "appsmith" as const,
      url: getEnv("ADMIN_DASHBOARD_URL", ""),
      enabled: !!getEnv("ADMIN_DASHBOARD_URL"),
    },

    // Testing
    testing: {
      pytest: {
        enabled: true,
        coverage: 80,
      },
      cypress: {
        enabled: true,
        baseUrl: getEnv("CYPRESS_BASE_URL", "http://localhost:3000"),
      },
      postman: {
        enabled: true,
        collectionUrl: getEnv("POSTMAN_COLLECTION_URL", ""),
      },
    },
  },
} as const

// ================================================
// HELPER FUNCTIONS
// ================================================

/**
 * Get FastAPI Base URL
 */
export function getApiBaseUrl(): string {
  return arcticConfig.backend.fastapi.url.replace(/\/$/, "")
}

/**
 * Get full API URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  const base = getApiBaseUrl()
  const version = arcticConfig.backend.fastapi.version
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${base}/api/${version}${cleanEndpoint}`
}

/**
 * Check if FastAPI backend is configured
 */
export function isBackendConfigured(): boolean {
  const url = arcticConfig.backend.fastapi.url
  return url !== "http://localhost:8000" && url !== ""
}

/**
 * Get CDN URL for assets
 */
export function getCdnUrl(path: string): string {
  const cdnUrl = arcticConfig.edge.cloudflare.cdnUrl
  if (cdnUrl) {
    return `${cdnUrl}${path.startsWith("/") ? path : `/${path}`}`
  }
  return path
}

/**
 * Get Cloudflare Stream URL
 */
export function getStreamUrl(videoId: string): string {
  const streamUrl = arcticConfig.edge.cloudflare.stream.url
  if (streamUrl) {
    return `${streamUrl}/${videoId}/manifest/video.m3u8`
  }
  return ""
}

/**
 * Get Cloudflare Images URL
 */
export function getImageUrl(imageId: string, variant = "public"): string {
  const { deliveryUrl, accountHash } = arcticConfig.edge.cloudflare.images
  if (deliveryUrl && accountHash) {
    return `${deliveryUrl}/${accountHash}/${imageId}/${variant}`
  }
  return imageId
}

/**
 * Get R2 Public URL
 */
export function getR2Url(path: string, bucket?: keyof typeof arcticConfig.edge.cloudflare.r2.buckets): string {
  const publicUrl = arcticConfig.edge.cloudflare.r2.publicUrl
  const bucketName = bucket ? arcticConfig.edge.cloudflare.r2.buckets[bucket] : ""
  if (publicUrl) {
    return `${publicUrl}/${bucketName}/${path}`
  }
  return path
}

/**
 * Check if Redis/Upstash is configured
 */
export function isRedisConfigured(): boolean {
  return arcticConfig.backend.redis.enabled
}

/**
 * Check if FCM is configured
 */
export function isFCMConfigured(): boolean {
  return arcticConfig.backend.fcm.enabled
}

/**
 * Check if Meilisearch is configured
 */
export function isSearchConfigured(): boolean {
  return !!arcticConfig.backend.search.meilisearch.apiKey
}

export type ArcticConfig = typeof arcticConfig
export default arcticConfig
