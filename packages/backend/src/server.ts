import { build, cleanup } from './app.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';

// Graceful shutdown handler
async function shutdown(signal: string, app: any) {
  logger.info({ signal }, 'Shutting down gracefully...');
  try {
    await cleanup(app);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
}

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
async function start() {
  try {
    const app = await build();

    // Register shutdown handlers
    process.on('SIGINT', () => shutdown('SIGINT', app));
    process.on('SIGTERM', () => shutdown('SIGTERM', app));

    const address = await app.listen({ port: env.PORT, host: '0.0.0.0' });

    logger.info({
      address,
      env: env.NODE_ENV,
      cors: env.CORS_ALLOWLIST || 'allow-all',
      rateLimit: `${env.RATE_LIMIT_MAX}/${env.RATE_LIMIT_WINDOW}`,
    }, 'Server started successfully');
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
