import { z } from 'zod';

/**
 * Environment variable schema validation
 * This ensures all required environment variables are present and valid
 * before the application starts.
 */
const envSchema = z.object({
  // Application environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server configuration
  PORT: z.coerce.number().int().positive().default(8787),

  // Database configuration
  DATABASE_URL: z.string().url().startsWith('postgres'),

  // Security configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters for security'),

  // CORS configuration (comma-separated list of allowed origins)
  CORS_ALLOWLIST: z.string().default(''),

  // Logging configuration
  LOG_LEVEL: z.enum(['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // Email configuration (optional, defaults for development)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@shovelheroes.local'),

  // Rate limiting (requests per minute per IP)
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),

  // OpenTelemetry configuration
  OTEL_ENABLED: z.string().default('true').transform((val) => val !== 'false'),
  OTEL_SERVICE_NAME: z.string().default('shovel-heroes-api'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validated environment variables
 * This will throw an error if any required variables are missing or invalid
 */
export const env = envSchema.parse(process.env);

/**
 * Validate environment on startup
 * Call this early in the application lifecycle
 */
export function validateEnv(): void {
  try {
    envSchema.parse(process.env);
    console.log('✓ Environment variables validated successfully');
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('✗ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Check if running in production
 */
export const isProduction = (): boolean => env.NODE_ENV === 'production';

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => env.NODE_ENV === 'development';

/**
 * Check if running in test environment
 */
export const isTest = (): boolean => env.NODE_ENV === 'test';
