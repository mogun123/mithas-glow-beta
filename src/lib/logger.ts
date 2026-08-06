/**
 * Production Logger
 * Enables logs in development, auto-disables in production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private isDevelopment: boolean;
  private logHistory: LogEntry[] = [];

  constructor() {
    // Check for production environment
    this.isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  }

  private formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] MITHAS GLOW: ${message}${contextStr}`;
  }

  private storeLog(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };
    
    // Keep last 1000 logs in memory for debugging
    this.logHistory.push(entry);
    if (this.logHistory.length > 1000) {
      this.logHistory.shift();
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;
    this.storeLog('debug', message, context);
    console.debug(this.formatMessage('debug', message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (!this.isDevelopment) return;
    this.storeLog('info', message, context);
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.storeLog('warn', message, context);
    if (this.isDevelopment) {
      console.warn(this.formatMessage('warn', message, context));
    } else {
      // In production, still show warnings but in a cleaner format
      console.warn(`[WARN] ${message}`);
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    this.storeLog('error', message, context);
    
    if (this.isDevelopment) {
      console.error(this.formatMessage('error', message, context));
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      } else if (error) {
        console.error('Error details:', error);
      }
    } else {
      // In production, log errors without verbose details
      console.error(`[ERROR] ${message}`);
    }
  }

  /**
   * Get recent logs for debugging purposes
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logHistory.slice(-count);
  }

  /**
   * Clear log history
   */
  clearLogs(): void {
    this.logHistory = [];
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience exports
export const log = logger;
export default logger;
