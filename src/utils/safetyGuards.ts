/**
 * Safety Guards and Performance Optimizations
 * 
 * This module provides utility functions for:
 * - Input validation and sanitization
 * - Error handling and recovery
 * - Performance monitoring
 * - Memory management
 * - Rate limiting
 * - Data integrity checks
 */

// Input validation utilities
export class InputValidator {
  /**
   * Validate user ID format
   */
  static isValidUserId(userId: string): boolean {
    return typeof userId === 'string' && 
           userId.length > 0 && 
           userId.length <= 100 &&
           /^[a-zA-Z0-9_-]+$/.test(userId);
  }

  /**
   * Validate journey ID format
   */
  static isValidJourneyId(journeyId: string): boolean {
    return typeof journeyId === 'string' && 
           journeyId.length > 0 && 
           journeyId.length <= 100 &&
           /^[a-zA-Z0-9_-]+$/.test(journeyId);
  }

  /**
   * Validate skin score range
   */
  static isValidSkinScore(score: number): boolean {
    return typeof score === 'number' && 
           score >= 0 && 
           score <= 100 &&
           !isNaN(score) &&
           isFinite(score);
  }

  /**
   * Validate date string
   */
  static isValidDateString(dateString: string): boolean {
    if (typeof dateString !== 'string') return false;
    
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && 
           date.getTime() > 0 && 
           date.getTime() <= Date.now() + 365 * 24 * 60 * 60 * 1000; // Max 1 year in future
  }

  /**
   * Sanitize text input
   */
  static sanitizeText(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') return '';
    
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove potential JS
      .replace(/on\w+=/gi, ''); // Remove potential event handlers
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    if (typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  /**
   * Validate phone number format
   */
  static isValidPhone(phone: string): boolean {
    if (typeof phone !== 'string') return false;
    
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20;
  }
}

// Error handling utilities
export class ErrorHandler {
  private static errorCounts: Map<string, number> = new Map();
  private static lastErrors: Map<string, number> = new Map();

  /**
   * Handle database errors with retry logic
   */
  static async handleDatabaseError<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Log error
        console.error(`Database error in ${operationName} (attempt ${attempt}/${maxRetries}):`, error);
        
        // Check if we should retry
        if (attempt === maxRetries || !this.shouldRetry(error as Error)) {
          break;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
    
    // Track error frequency
    this.trackError(operationName);
    
    throw lastError!;
  }

  /**
   * Determine if an error is retryable
   */
  private static shouldRetry(error: Error): boolean {
    const retryableErrors = [
      'timeout',
      'connection',
      'network',
      'rate limit',
      'temporary',
      'service unavailable'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }

  /**
   * Track error frequency
   */
  private static trackError(operationName: string): void {
    const count = this.errorCounts.get(operationName) || 0;
    this.errorCounts.set(operationName, count + 1);
    this.lastErrors.set(operationName, Date.now());
    
    // Alert if error frequency is too high
    if (count >= 5) {
      console.warn(`High error frequency detected in ${operationName}: ${count} errors`);
    }
  }

  /**
   * Create safe async function wrapper
   */
  static safeAsync<T>(
    fn: () => Promise<T>,
    fallback?: T
  ): Promise<T | null> {
    return fn().catch(error => {
      console.error('Async operation failed:', error);
      return fallback !== undefined ? fallback : null;
    });
  }

  /**
   * Create safe sync function wrapper
   */
  static safeSync<T>(
    fn: () => T,
    fallback?: T
  ): T | null {
    try {
      return fn();
    } catch (error) {
      console.error('Sync operation failed:', error);
      return fallback !== undefined ? fallback : null;
    }
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  private static startTimes: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  static startTiming(operationName: string): void {
    this.startTimes.set(operationName, performance.now());
  }

  /**
   * End timing an operation and record the duration
   */
  static endTiming(operationName: string): number {
    const startTime = this.startTimes.get(operationName);
    if (!startTime) return 0;

    const duration = performance.now() - startTime;
    this.recordMetric(operationName, duration);
    this.startTimes.delete(operationName);

    return duration;
  }

  /**
   * Record a performance metric
   */
  static recordMetric(operationName: string, value: number): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }

    const values = this.metrics.get(operationName)!;
    values.push(value);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }

    // Alert if performance is poor
    if (value > 5000) { // 5 seconds
      console.warn(`Slow operation detected: ${operationName} took ${value.toFixed(2)}ms`);
    }
  }

  /**
   * Get performance statistics for an operation
   */
  static getStats(operationName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
  } | null {
    const values = this.metrics.get(operationName);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const average = values.reduce((sum, val) => sum + val, 0) / count;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const p95 = sorted[Math.floor(count * 0.95)];

    return { count, average, min, max, p95 };
  }

  /**
   * Create performance monitoring wrapper
   */
  static withTiming<T>(
    operationName: string,
    fn: () => Promise<T>
  ): Promise<T> {
    this.startTiming(operationName);
    return fn().finally(() => {
      this.endTiming(operationName);
    });
  }
}

// Memory management utilities
export class MemoryManager {
  private static caches: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private static maxCacheSize = 100;

  /**
   * Set cached data with TTL
   */
  static setCache(key: string, data: any, ttlMs: number = 300000): void { // 5 minutes default
    // Clean old entries if cache is full
    if (this.caches.size >= this.maxCacheSize) {
      this.cleanOldEntries();
    }

    this.caches.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  /**
   * Get cached data
   */
  static getCache<T>(key: string): T | null {
    const entry = this.caches.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.caches.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Clean old cache entries
   */
  static cleanOldEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.caches.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.caches.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  static clearCache(): void {
    this.caches.clear();
  }

  /**
   * Get cache size
   */
  static getCacheSize(): number {
    return this.caches.size;
  }

  /**
   * Memoize function with cache
   */
  static memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    ttlMs: number = 300000
  ): T {
    return ((...args: Parameters<T>) => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      
      const cached = this.getCache(key);
      if (cached !== null) {
        return cached;
      }

      const result = fn(...args);
      this.setCache(key, result, ttlMs);
      return result;
    }) as T;
  }
}

// Rate limiting utilities
export class RateLimiter {
  private static requests: Map<string, number[]> = new Map();

  /**
   * Check if request is allowed
   */
  static isAllowed(
    identifier: string, 
    maxRequests: number, 
    windowMs: number = 60000 // 1 minute default
  ): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, []);
    }

    const timestamps = this.requests.get(identifier)!;
    
    // Remove old timestamps
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);
    this.requests.set(identifier, validTimestamps);

    // Check if under limit
    if (validTimestamps.length < maxRequests) {
      validTimestamps.push(now);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests
   */
  static getRemainingRequests(
    identifier: string,
    maxRequests: number,
    windowMs: number = 60000
  ): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

    return Math.max(0, maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limit for identifier
   */
  static reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// Data integrity utilities
export class DataIntegrity {
  /**
   * Validate skin analysis data structure
   */
  static validateSkinAnalysisData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    const requiredFields = [
      'final_redness_score',
      'final_texture_score',
      'melanin_index',
      'overall_skin_health_score',
      'scan_timestamp'
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate score ranges
    const scoreFields = [
      'final_redness_score',
      'final_texture_score',
      'melanin_index',
      'overall_skin_health_score'
    ];

    for (const field of scoreFields) {
      if (field in data && !InputValidator.isValidSkinScore(data[field])) {
        errors.push(`Invalid score range for ${field}: ${data[field]}`);
      }
    }

    // Validate timestamp
    if ('scan_timestamp' in data && !InputValidator.isValidDateString(data.scan_timestamp)) {
      errors.push('Invalid scan_timestamp format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate journey data structure
   */
  static validateJourneyData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    const requiredFields = ['user_id', 'status', 'start_date'];
    
    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate user_id
    if ('user_id' in data && !InputValidator.isValidUserId(data.user_id)) {
      errors.push('Invalid user_id format');
    }

    // Validate status
    if ('status' in data) {
      const validStatuses = ['active', 'completed', 'expired', 'paused'];
      if (!validStatuses.includes(data.status)) {
        errors.push(`Invalid status: ${data.status}`);
      }
    }

    // Validate dates
    if ('start_date' in data && !InputValidator.isValidDateString(data.start_date)) {
      errors.push('Invalid start_date format');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize and validate user input data
   */
  static sanitizeInput(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        sanitized[key] = InputValidator.sanitizeText(value);
      } else if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        sanitized[key] = value;
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? InputValidator.sanitizeText(item) : item
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeInput(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

// Safety wrapper for common operations
export class SafetyWrapper {
  /**
   * Safe database operation with all protections
   */
  static async safeDatabaseOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    options: {
      maxRetries?: number;
      timeoutMs?: number;
      cacheKey?: string;
      cacheTtl?: number;
      rateLimitKey?: string;
      rateLimitRequests?: number;
    } = {}
  ): Promise<T | null> {
    const {
      maxRetries = 3,
      timeoutMs = 10000,
      cacheKey,
      cacheTtl = 300000,
      rateLimitKey,
      rateLimitRequests = 10
    } = options;

    // Check rate limit
    if (rateLimitKey && !RateLimiter.isAllowed(rateLimitKey, rateLimitRequests)) {
      console.warn(`Rate limit exceeded for ${operationName}`);
      return null;
    }

    // Check cache
    if (cacheKey) {
      const cached = MemoryManager.getCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    try {
      // Add timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
      });

      const result = await Promise.race([
        ErrorHandler.handleDatabaseError(operation, operationName, maxRetries),
        timeoutPromise
      ]);

      // Cache result
      if (cacheKey && result !== null) {
        MemoryManager.setCache(cacheKey, result, cacheTtl);
      }

      return result;
    } catch (error) {
      console.error(`Safe operation failed for ${operationName}:`, error);
      return null;
    }
  }

  /**
   * Safe API call with all protections
   */
  static async safeApiCall<T>(
    apiCall: () => Promise<T>,
    operationName: string,
    options: {
      maxRetries?: number;
      timeoutMs?: number;
      fallbackValue?: T;
    } = {}
  ): Promise<T | null> {
    const { maxRetries = 2, timeoutMs = 15000, fallbackValue } = options;

    try {
      return await ErrorHandler.handleDatabaseError(apiCall, operationName, maxRetries);
    } catch (error) {
      console.error(`API call failed for ${operationName}:`, error);
      return fallbackValue !== undefined ? fallbackValue : null;
    }
  }
}

// Performance monitoring decorator
export function monitorPerformance(operationName?: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const name = operationName || `${target.constructor.name}.${propertyName}`;

    descriptor.value = async function (...args: any[]) {
      PerformanceMonitor.startTiming(name);
      try {
        const result = await method.apply(this, args);
        return result;
      } finally {
        PerformanceMonitor.endTiming(name);
      }
    };

    return descriptor;
  };
}

// Export all utilities
export {
  InputValidator,
  ErrorHandler,
  PerformanceMonitor,
  MemoryManager,
  RateLimiter,
  DataIntegrity,
  SafetyWrapper
};
