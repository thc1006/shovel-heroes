import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { env, validateEnv, isProduction } from './lib/env.js';
import { logger, logSecurityEvent } from './lib/logger.js';
import { pool, closePool } from './lib/db.js';
import { registerHealth } from './routes/healthz.js';
import { registerGrids } from './routes/grids.js';
import { registerDisasterAreaRoutes } from './routes/disaster-areas.js';
import { registerVolunteersRoutes } from './routes/volunteers.js';
import { registerVolunteerRegistrationRoutes } from './routes/volunteer-registrations.js';
import { registerUserRoutes } from './routes/users.js';
import { registerAnnouncementRoutes } from './routes/announcements.js';
import { registerSupplyDonationRoutes } from './routes/supply-donations.js';
import { registerGridDiscussionRoutes } from './routes/grid-discussions.js';

// Validate environment variables on startup
validateEnv();

// Security check: JWT_SECRET must not be default in production
if (isProduction() && env.JWT_SECRET.includes('dev_secret')) {
  logger.fatal('SECURITY ERROR: JWT_SECRET is set to default value in production!');
  process.exit(1);
}

const app = Fastify({
  logger,
  // Trust proxy headers (for rate limiting behind reverse proxy)
  trustProxy: isProduction(),
  // Request ID tracking
  requestIdLogLabel: 'reqId',
  genReqId: () => crypto.randomUUID(),
});

// Security headers with Helmet
await app.register(helmet, {
  contentSecurityPolicy: isProduction() ? undefined : false, // Disable CSP in dev for easier debugging
  hsts: isProduction() ? { maxAge: 31536000, includeSubDomains: true } : false,
});

// CORS configuration with strict allowlist
await app.register(cors, {
  origin: (origin, cb) => {
    const allowed = env.CORS_ALLOWLIST.split(',').filter(Boolean);

    // In development, allow all origins if allowlist is empty
    if (!isProduction() && allowed.length === 0) {
      return cb(null, true);
    }

    // Allow same-origin requests (no origin header)
    if (!origin) {
      return cb(null, true);
    }

    // Check against allowlist
    if (allowed.includes(origin)) {
      return cb(null, true);
    }

    // Reject with security logging
    logSecurityEvent('cors_rejection', { origin, allowed });
    cb(new Error('Not allowed by CORS policy'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate limiting to prevent abuse
await app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_WINDOW,
  errorResponseBuilder: () => ({
    statusCode: 429,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  }),
  onExceeding: (req) => {
    logSecurityEvent('rate_limit_warning', {
      ip: req.ip,
      url: req.url,
    });
  },
  onExceeded: (req) => {
    logSecurityEvent('rate_limit_exceeded', {
      ip: req.ip,
      url: req.url,
    });
  },
});

// JWT authentication
await app.register(jwt, {
  secret: env.JWT_SECRET,
  sign: {
    expiresIn: '24h', // Token expiry
  },
});

// Decorate app with database pool
app.decorate('db', pool);

// Authentication decorator
app.decorate('auth', async (req: any, reply: any) => {
  try {
    await req.jwtVerify();
  } catch (err) {
    logSecurityEvent('jwt_verification_failed', {
      ip: req.ip,
      url: req.url,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return reply.code(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
    });
  }
});

// Global error handler - don't leak internal errors
app.setErrorHandler((error, request, reply) => {
  const statusCode = error.statusCode || 500;

  // Log all errors
  if (statusCode >= 500) {
    request.log.error({ err: error, req: request }, 'Internal server error');
  } else {
    request.log.warn({ err: error, req: request }, 'Client error');
  }

  // In production, don't expose internal error details
  const message = isProduction() && statusCode >= 500
    ? 'Internal server error'
    : error.message;

  reply.status(statusCode).send({
    statusCode,
    error: error.name || 'Error',
    message,
  });
});

// Register all routes (type assertion needed due to logger type mismatch)
registerHealth(app as any);
registerGrids(app as any);
registerDisasterAreaRoutes(app as any);
registerVolunteersRoutes(app as any);
registerVolunteerRegistrationRoutes(app as any);
registerUserRoutes(app as any);
registerAnnouncementRoutes(app as any);
registerSupplyDonationRoutes(app as any);
registerGridDiscussionRoutes(app as any);

app.get('/', async () => ({ ok: true }));

// Graceful shutdown handler
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down gracefully...');
  try {
    // Stop accepting new connections
    await app.close();
    logger.info('HTTP server closed');

    // Close database pool
    await closePool();
    logger.info('Database pool closed');

    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ reason, promise }, 'Unhandled promise rejection');
  process.exit(1);
});

// Start server
app.listen({ port: env.PORT, host: '0.0.0.0' })
  .then((address) => {
    logger.info({
      address,
      env: env.NODE_ENV,
      cors: env.CORS_ALLOWLIST || 'allow-all',
      rateLimit: `${env.RATE_LIMIT_MAX}/${env.RATE_LIMIT_WINDOW}`,
    }, 'Server started successfully');
  })
  .catch((err) => {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  });
