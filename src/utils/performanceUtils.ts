// Performance optimization utilities for AI skin analysis

export interface PerformanceMetrics {
  frameRate: number;
  processingTime: number;
  memoryUsage: number;
  cpuUsage: number;
  renderTime: number;
}

export interface PerformanceConfig {
  maxFrameRate: number;
  targetProcessingTime: number; // ms
  memoryLimit: number; // MB
  enableWebWorkers: boolean;
  enableGPUAcceleration: boolean;
  qualityMode: 'performance' | 'balanced' | 'quality';
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    frameRate: 0,
    processingTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    renderTime: 0,
  };

  private frameCount = 0;
  private lastFrameTime = performance.now();
  private processingTimes: number[] = [];
  private renderTimes: number[] = [];

  constructor(private config: PerformanceConfig) {}

  public startFrame(): void {
    this.lastFrameTime = performance.now();
  }

  public endFrame(): void {
    const now = performance.now();
    const frameDuration = now - this.lastFrameTime;
    
    this.frameCount++;
    this.metrics.frameRate = 1000 / frameDuration;
    
    // Update average every 10 frames
    if (this.frameCount % 10 === 0) {
      this.updateAverages();
    }
  }

  public recordProcessingTime(time: number): void {
    this.processingTimes.push(time);
    if (this.processingTimes.length > 60) {
      this.processingTimes.shift();
    }
    this.metrics.processingTime = time;
  }

  public recordRenderTime(time: number): void {
    this.renderTimes.push(time);
    if (this.renderTimes.length > 60) {
      this.renderTimes.shift();
    }
    this.metrics.renderTime = time;
  }

  public updateMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
    }
  }

  public updateCPUUsage(): void {
    // Simplified CPU usage estimation
    // In a real implementation, you might use more sophisticated methods
    const processingLoad = this.metrics.processingTime / this.config.targetProcessingTime;
    this.metrics.cpuUsage = Math.min(100, processingLoad * 100);
  }

  private updateAverages(): void {
    if (this.processingTimes.length > 0) {
      const avgProcessing = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
      this.metrics.processingTime = avgProcessing;
    }

    if (this.renderTimes.length > 0) {
      const avgRender = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
      this.metrics.renderTime = avgRender;
    }
  }

  public getMetrics(): PerformanceMetrics {
    this.updateMemoryUsage();
    this.updateCPUUsage();
    return { ...this.metrics };
  }

  public isPerformanceOptimal(): boolean {
    return (
      this.metrics.frameRate >= this.config.maxFrameRate * 0.8 &&
      this.metrics.processingTime <= this.config.targetProcessingTime &&
      this.metrics.memoryUsage <= this.config.memoryLimit
    );
  }

  public getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.metrics.frameRate < this.config.maxFrameRate * 0.8) {
      suggestions.push('Consider reducing frame rate or quality');
    }

    if (this.metrics.processingTime > this.config.targetProcessingTime) {
      suggestions.push('Processing time exceeds target - enable Web Workers');
    }

    if (this.metrics.memoryUsage > this.config.memoryLimit) {
      suggestions.push('Memory usage high - clear unused data');
    }

    if (this.metrics.renderTime > 16) { // 60fps = 16ms per frame
      suggestions.push('Render time high - reduce quality or enable GPU acceleration');
    }

    return suggestions;
  }
}

export class FrameRateLimiter {
  private targetFrameRate: number;
  private frameInterval: number;
  private lastFrameTime = 0;

  constructor(targetFrameRate: number = 30) {
    this.targetFrameRate = targetFrameRate;
    this.frameInterval = 1000 / targetFrameRate;
  }

  public shouldProcess(): boolean {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= this.frameInterval) {
      this.lastFrameTime = now;
      return true;
    }
    
    return false;
  }

  public setTargetFrameRate(fps: number): void {
    this.targetFrameRate = fps;
    this.frameInterval = 1000 / fps;
  }
}

export class MemoryManager {
  private static instance: MemoryManager;
  private cache = new Map<string, any>();
  private maxCacheSize = 100; // items
  private memoryThreshold = 100; // MB

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  public set(key: string, value: any): void {
    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      size: this.estimateSize(value),
    });
  }

  public get(key: string): any {
    const item = this.cache.get(key);
    if (item) {
      item.timestamp = Date.now(); // Update access time
      return item.value;
    }
    return null;
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private estimateSize(obj: any): number {
    // Rough estimation of object size in bytes
    if (obj === null || obj === undefined) return 0;
    
    if (typeof obj === 'string') return obj.length * 2;
    if (typeof obj === 'number') return 8;
    if (typeof obj === 'boolean') return 4;
    
    if (obj instanceof ImageData) {
      return obj.data.length;
    }
    
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.estimateSize(item), 0);
    }
    
    if (typeof obj === 'object') {
      return Object.keys(obj).reduce((sum, key) => {
        return sum + this.estimateSize(obj[key]);
      }, 0);
    }
    
    return 0;
  }

  public getMemoryUsage(): number {
    let totalSize = 0;
    for (const item of this.cache.values()) {
      totalSize += item.size;
    }
    return totalSize / (1024 * 1024); // Convert to MB
  }

  public shouldCleanup(): boolean {
    return this.getMemoryUsage() > this.memoryThreshold;
  }

  public cleanup(): void {
    // Remove items older than 5 minutes
    const cutoffTime = Date.now() - 5 * 60 * 1000;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < cutoffTime) {
        this.cache.delete(key);
      }
    }
  }
}

export class ThreadPool {
  private workers: Worker[] = [];
  private taskQueue: Array<{
    task: any;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private maxWorkers: number;

  constructor(maxWorkers: number = navigator.hardwareConcurrency || 4) {
    this.maxWorkers = Math.min(maxWorkers, 4); // Limit to 4 workers for web compatibility
  }

  public async executeTask(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ task, resolve, reject });
      this.processQueue();
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    if (this.workers.length >= this.maxWorkers) return;

    const taskItem = this.taskQueue.shift();
    if (!taskItem) return;

    const worker = this.createWorker();
    this.workers.push(worker);

    worker.postMessage(taskItem.task);

    worker.onmessage = (event) => {
      taskItem.resolve(event.data);
      this.cleanupWorker(worker);
      this.processQueue(); // Process next task
    };

    worker.onerror = (error) => {
      taskItem.reject(error);
      this.cleanupWorker(worker);
      this.processQueue(); // Process next task
    };
  }

  private createWorker(): Worker {
    // Create a blob with worker code
    const workerCode = `
      self.onmessage = function(event) {
        const { type, data } = event.data;
        
        try {
          let result;
          
          switch (type) {
            case 'processImageData':
              result = processImageData(data);
              break;
            case 'calculateStatistics':
              result = calculateStatistics(data);
              break;
            case 'applyFilters':
              result = applyFilters(data);
              break;
            default:
              throw new Error('Unknown task type');
          }
          
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
      
      function processImageData(data) {
        // Image processing logic here
        return { processed: true, data: data };
      }
      
      function calculateStatistics(data) {
        // Statistics calculation logic here
        return { mean: 0, variance: 0 };
      }
      
      function applyFilters(data) {
        // Filter application logic here
        return { filtered: true, data: data };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    return new Worker(workerUrl);
  }

  private cleanupWorker(worker: Worker): void {
    const index = this.workers.indexOf(worker);
    if (index > -1) {
      this.workers.splice(index, 1);
    }
    worker.terminate();
  }

  public terminate(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.taskQueue = [];
  }
}

export class PerformanceOptimizer {
  private monitor: PerformanceMonitor;
  private frameRateLimiter: FrameRateLimiter;
  private memoryManager: MemoryManager;
  private threadPool: ThreadPool;

  constructor(config: PerformanceConfig) {
    this.monitor = new PerformanceMonitor(config);
    this.frameRateLimiter = new FrameRateLimiter(config.maxFrameRate);
    this.memoryManager = MemoryManager.getInstance();
    this.threadPool = new ThreadPool();
  }

  public async optimizeProcessing<T>(
    task: () => T,
    options: {
      useWorker?: boolean;
      cacheKey?: string;
      priority?: 'high' | 'normal' | 'low';
    } = {}
  ): Promise<T> {
    const { useWorker = false, cacheKey, priority = 'normal' } = options;

    // Check cache first
    if (cacheKey) {
      const cached = this.memoryManager.get(cacheKey);
      if (cached) return cached;
    }

    // Frame rate limiting
    if (!this.frameRateLimiter.shouldProcess()) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const startTime = performance.now();

    let result: T;

    if (useWorker && this.threadPool) {
      // Execute in worker thread
      result = await this.threadPool.executeTask(task);
    } else {
      // Execute in main thread
      result = await task();
    }

    const processingTime = performance.now() - startTime;
    this.monitor.recordProcessingTime(processingTime);

    // Cache result if provided
    if (cacheKey) {
      this.memoryManager.set(cacheKey, result);
    }

    // Memory cleanup if needed
    if (this.memoryManager.shouldCleanup()) {
      this.memoryManager.cleanup();
    }

    return result;
  }

  public getPerformanceReport(): {
    metrics: PerformanceMetrics;
    isOptimal: boolean;
    suggestions: string[];
    memoryUsage: number;
  } {
    const metrics = this.monitor.getMetrics();
    const isOptimal = this.monitor.isPerformanceOptimal();
    const suggestions = this.monitor.getOptimizationSuggestions();
    const memoryUsage = this.memoryManager.getMemoryUsage();

    return {
      metrics,
      isOptimal,
      suggestions,
      memoryUsage,
    };
  }

  public adjustQualityBasedOnPerformance(): 'low' | 'medium' | 'high' {
    const metrics = this.monitor.getMetrics();
    
    if (metrics.frameRate < 20 || metrics.processingTime > 100) {
      return 'low';
    } else if (metrics.frameRate < 30 || metrics.processingTime > 50) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  public cleanup(): void {
    this.threadPool.terminate();
    this.memoryManager.clear();
  }
}

// Utility functions for common performance optimizations

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

export function memoize<T extends (...args: any[]) => any>(func: T): T {
  const cache = new Map();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

export function requestIdleCallback<T>(
  callback: () => T,
  timeout?: number
): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = performance.now() + (timeout || 5000);
    
    const checkIdle = () => {
      if (performance.now() >= deadline) {
        reject(new Error('Idle callback timeout'));
        return;
      }
      
      if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          try {
            const result = callback();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, { timeout });
      } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(() => {
          try {
            const result = callback();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, 1);
      }
    };
    
    checkIdle();
  });
}
