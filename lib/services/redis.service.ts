/**
 * Redis/Upstash Service - Layer 3 Backend Caching
 * Session management, caching, rate limiting
 */

import { arcticConfig } from "@/lib/config/arctic"

// Types
export interface CacheOptions {
  ttl?: number // seconds
  tags?: string[]
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

/**
 * Redis Service using Upstash REST API
 * Works in both server and client environments
 */
class RedisService {
  private restUrl: string
  private token: string
  private enabled: boolean

  constructor() {
    this.restUrl = arcticConfig.backend.redis.url
    this.token = arcticConfig.backend.redis.token
    this.enabled = arcticConfig.backend.redis.enabled
  }

  /**
   * Check if Redis is configured
   */
  isConfigured(): boolean {
    return this.enabled && !!this.restUrl && !!this.token
  }

  /**
   * Execute Redis command via Upstash REST API
   */
  private async execute<T>(command: string[]): Promise<T | null> {
    if (!this.isConfigured()) {
      console.warn("[Redis] Not configured, skipping command:", command[0])
      return null
    }

    try {
      const response = await fetch(this.restUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      })

      if (!response.ok) {
        throw new Error(`Redis error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.result as T
    } catch (error) {
      console.error("[Redis] Command failed:", error)
      return null
    }
  }

  // ==========================================
  // Basic Operations
  // ==========================================

  /**
   * Get value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const result = await this.execute<string>(["GET", key])
    if (result) {
      try {
        return JSON.parse(result) as T
      } catch {
        return result as unknown as T
      }
    }
    return null
  }

  /**
   * Set value with optional TTL
   */
  async set(key: string, value: unknown, options?: CacheOptions): Promise<boolean> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value)
    const command = ["SET", key, stringValue]

    if (options?.ttl) {
      command.push("EX", String(options.ttl))
    }

    const result = await this.execute<string>(command)
    return result === "OK"
  }

  /**
   * Delete key(s)
   */
  async delete(...keys: string[]): Promise<number> {
    const result = await this.execute<number>(["DEL", ...keys])
    return result || 0
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.execute<number>(["EXISTS", key])
    return result === 1
  }

  /**
   * Set TTL on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.execute<number>(["EXPIRE", key, String(seconds)])
    return result === 1
  }

  // ==========================================
  // Cache Operations
  // ==========================================

  /**
   * Get or set cache with callback
   */
  async cache<T>(key: string, callback: () => Promise<T>, options?: CacheOptions): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Execute callback and cache result
    const result = await callback()
    await this.set(key, result, {
      ttl: options?.ttl || arcticConfig.backend.redis.ttl.cache,
    })

    return result
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.execute<string[]>(["KEYS", pattern])
    if (keys && keys.length > 0) {
      await this.delete(...keys)
    }
  }

  // ==========================================
  // Session Management
  // ==========================================

  /**
   * Store session data
   */
  async setSession(sessionId: string, data: Record<string, unknown>): Promise<boolean> {
    return this.set(`session:${sessionId}`, data, {
      ttl: arcticConfig.backend.redis.ttl.session,
    })
  }

  /**
   * Get session data
   */
  async getSession<T extends Record<string, unknown>>(sessionId: string): Promise<T | null> {
    return this.get<T>(`session:${sessionId}`)
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    const deleted = await this.delete(`session:${sessionId}`)
    return deleted > 0
  }

  /**
   * Extend session TTL
   */
  async extendSession(sessionId: string): Promise<boolean> {
    return this.expire(`session:${sessionId}`, arcticConfig.backend.redis.ttl.session)
  }

  // ==========================================
  // Rate Limiting
  // ==========================================

  /**
   * Check rate limit using sliding window
   */
  async checkRateLimit(identifier: string, maxRequests: number, windowSeconds = 60): Promise<RateLimitResult> {
    if (!this.isConfigured()) {
      return { allowed: true, remaining: maxRequests, reset: 0 }
    }

    const key = `ratelimit:${identifier}`
    const now = Date.now()
    const windowStart = now - windowSeconds * 1000

    // Use sorted set for sliding window
    // Remove old entries
    await this.execute(["ZREMRANGEBYSCORE", key, "0", String(windowStart)])

    // Count current requests
    const count = (await this.execute<number>(["ZCARD", key])) || 0

    if (count >= maxRequests) {
      // Get oldest entry to calculate reset time
      const oldest = await this.execute<string[]>(["ZRANGE", key, "0", "0", "WITHSCORES"])
      const resetTime =
        oldest && oldest[1] ? Math.ceil((Number(oldest[1]) + windowSeconds * 1000 - now) / 1000) : windowSeconds

      return {
        allowed: false,
        remaining: 0,
        reset: resetTime,
      }
    }

    // Add current request
    await this.execute(["ZADD", key, String(now), `${now}`])
    await this.expire(key, windowSeconds)

    return {
      allowed: true,
      remaining: maxRequests - count - 1,
      reset: windowSeconds,
    }
  }

  // ==========================================
  // Pub/Sub (for real-time features)
  // ==========================================

  /**
   * Publish message to channel
   */
  async publish(channel: string, message: unknown): Promise<number> {
    const stringMessage = typeof message === "string" ? message : JSON.stringify(message)
    const result = await this.execute<number>(["PUBLISH", channel, stringMessage])
    return result || 0
  }

  // ==========================================
  // Counter Operations
  // ==========================================

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    const result = await this.execute<number>(["INCR", key])
    return result || 0
  }

  /**
   * Increment by specific amount
   */
  async incrBy(key: string, amount: number): Promise<number> {
    const result = await this.execute<number>(["INCRBY", key, String(amount)])
    return result || 0
  }

  /**
   * Decrement counter
   */
  async decr(key: string): Promise<number> {
    const result = await this.execute<number>(["DECR", key])
    return result || 0
  }

  // ==========================================
  // Hash Operations (for complex objects)
  // ==========================================

  /**
   * Set hash field
   */
  async hset(key: string, field: string, value: unknown): Promise<boolean> {
    const stringValue = typeof value === "string" ? value : JSON.stringify(value)
    const result = await this.execute<number>(["HSET", key, field, stringValue])
    return result !== null
  }

  /**
   * Get hash field
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    const result = await this.execute<string>(["HGET", key, field])
    if (result) {
      try {
        return JSON.parse(result) as T
      } catch {
        return result as unknown as T
      }
    }
    return null
  }

  /**
   * Get all hash fields
   */
  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    const result = await this.execute<string[]>(["HGETALL", key])
    if (result && result.length > 0) {
      const obj: Record<string, unknown> = {}
      for (let i = 0; i < result.length; i += 2) {
        try {
          obj[result[i]] = JSON.parse(result[i + 1])
        } catch {
          obj[result[i]] = result[i + 1]
        }
      }
      return obj as T
    }
    return null
  }
}

export const redisService = new RedisService()
export default redisService
