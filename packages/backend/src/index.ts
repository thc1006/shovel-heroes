import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { pool, withConn } from './lib/db.js';
import { registerHealth } from './routes/healthz.js';
import { registerGrids } from './routes/grids.js';

const PORT = Number(process.env.PORT || 8787);
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info'
  }
});

await app.register(helmet);
await app.register(cors, {
  origin: (origin, cb) => {
    // allow same-origin or explicit whitelist via env
    const allowed = (process.env.CORS_ALLOWLIST || '').split(',').filter(Boolean);
    if (!origin || allowed.length === 0 || allowed.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
});
await app.register(rateLimit, {
  max: 300, // per IP per timeWindow
  timeWindow: '1 minute'
});
await app.register(jwt, { secret: JWT_SECRET });

app.decorate('auth', async (req: any, _reply: any) => {
  try {
    await req.jwtVerify();
  } catch {
    return _reply.code(401).send({ error: 'unauthorized' });
  }
});

// Health + Grids
registerHealth(app);
registerGrids(app);

app.get('/', async () => ({ ok: true }));

// graceful shutdown
async function shutdown() {
  app.log.info('Shutting down...');
  await app.close();
  await pool.end();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen({ port: PORT, host: '0.0.0.0' })
  .then(addr => app.log.info({ addr }, 'API listening'))
  .catch(err => { app.log.error(err); process.exit(1); });
