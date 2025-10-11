/**
 * Structured logger with context support
 * Provides different log levels and formatting for development/production
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const LOG_LEVELS = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

export interface LogContext {
  [key: string]: any;
}

export interface LoggerOptions {
  /**
   * Minimum log level to output
   * @default LogLevel.INFO
   */
  level?: LogLevel;
  
  /**
   * Output format
   * - 'json': JSON format for production
   * - 'pretty': Human-readable format for development
   * @default 'pretty'
   */
  format?: 'json' | 'pretty';
  
  /**
   * Global context to include in all logs
   */
  context?: LogContext;
  
  /**
   * Whether to include timestamps
   * @default true
   */
  includeTimestamp?: boolean;
}

export class Logger {
  private level: LogLevel;
  private format: 'json' | 'pretty';
  private context: LogContext;
  private includeTimestamp: boolean;
  
  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.format = options.format ?? 'pretty';
    this.context = options.context ?? {};
    this.includeTimestamp = options.includeTimestamp ?? true;
  }
  
  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }
  
  /**
   * Log info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }
  
  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }
  
  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = error instanceof Error ? {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } : error ? { error } : {};
    
    this.log(LogLevel.ERROR, message, { ...errorContext, ...context });
  }
  
  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    return new Logger({
      level: this.level,
      format: this.format,
      context: { ...this.context, ...context },
      includeTimestamp: this.includeTimestamp,
    });
  }
  
  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }
  
  /**
   * Get current log level
   */
  getLevel(): LogLevel {
    return this.level;
  }
  
  /**
   * Core logging function
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    // Check if we should log this level
    if (LOG_LEVELS[level] < LOG_LEVELS[this.level]) {
      return;
    }
    
    const logEntry = {
      level,
      message,
      ...this.context,
      ...context,
      ...(this.includeTimestamp ? { timestamp: new Date().toISOString() } : {}),
    };
    
    if (this.format === 'json') {
      this.logJson(logEntry);
    } else {
      this.logPretty(level, message, logEntry);
    }
  }
  
  /**
   * Log in JSON format
   */
  private logJson(entry: any): void {
    const output = JSON.stringify(entry);
    
    if (entry.level === LogLevel.ERROR) {
      console.error(output);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
  
  /**
   * Log in pretty format
   */
  private logPretty(level: LogLevel, message: string, entry: any): void {
    const timestamp = entry.timestamp ? `[${entry.timestamp}]` : '';
    const levelColor = this.getLevelColor(level);
    const levelStr = `[${level}]`;
    
    // Build context string
    const contextEntries = Object.entries(entry)
      .filter(([key]) => !['level', 'message', 'timestamp'].includes(key));
    
    const contextStr = contextEntries.length > 0
      ? ' ' + JSON.stringify(Object.fromEntries(contextEntries))
      : '';
    
    const output = `${timestamp} ${levelColor}${levelStr}\x1b[0m ${message}${contextStr}`;
    
    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
  
  /**
   * Get ANSI color code for log level
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '\x1b[36m'; // Cyan
      case LogLevel.INFO:
        return '\x1b[32m'; // Green
      case LogLevel.WARN:
        return '\x1b[33m'; // Yellow
      case LogLevel.ERROR:
        return '\x1b[31m'; // Red
      default:
        return '';
    }
  }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize global logger
 */
export function initLogger(options?: LoggerOptions): Logger {
  globalLogger = new Logger(options);
  return globalLogger;
}

/**
 * Get global logger instance
 */
export function getLogger(): Logger {
  if (!globalLogger) {
    // Auto-initialize with defaults if not explicitly initialized
    const isDevelopment = process.env.NODE_ENV !== 'production';
    globalLogger = new Logger({
      level: process.env.LOG_LEVEL as LogLevel ?? LogLevel.INFO,
      format: isDevelopment ? 'pretty' : 'json',
    });
  }
  return globalLogger;
}

/**
 * Create a new logger instance
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

/**
 * Convenience functions using global logger
 */
export const log = {
  debug: (message: string, context?: LogContext) => getLogger().debug(message, context),
  info: (message: string, context?: LogContext) => getLogger().info(message, context),
  warn: (message: string, context?: LogContext) => getLogger().warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => 
    getLogger().error(message, error, context),
};

