import pino from 'pino';
import { env, isProduction, isDevelopment } from './env.js';

/**
 * Pino logger configuration
 * - In development: uses pino-pretty for human-readable logs
 * - In production: outputs structured JSON logs
 */
export const logger = pino({
  level: env.LOG_LEVEL,

  // Production: structured JSON logs
  // Development: pretty-printed logs
  transport: isDevelopment()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  // Base configuration
  base: {
    env: env.NODE_ENV,
  },

  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,

  // Redact sensitive information
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'secret',
      'api_key',
      'apiKey',
    ],
    censor: '[REDACTED]',
  },

  // Serializers for request/response logging
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
});

/**
 * Create a child logger with additional context
 * @param bindings - Additional context to bind to the logger
 */
export function createLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

/**
 * Log database queries (only in development)
 */
export function logQuery(query: string, params?: unknown[]) {
  if (isDevelopment()) {
    logger.debug({ query, params }, 'Database query');
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(event: string, details: Record<string, unknown>) {
  logger.warn({ event, ...details }, 'Security event');
}

/**
 * Log performance metrics
 */
export function logPerformance(operation: string, duration: number, metadata?: Record<string, unknown>) {
  logger.info({ operation, duration, ...metadata }, 'Performance metric');
}
