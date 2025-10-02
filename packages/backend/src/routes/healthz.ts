import type { FastifyInstance } from 'fastify';
import { pool } from '../lib/db.js';

export function registerHealth(app: FastifyInstance) {
  app.get('/healthz', async (_req, _reply) => {
    try {
      const res = await pool.query('select 1 as ok');
      return { status: 'ok', db: res.rows.length ? 'ok' : 'fail' };
    } catch (e) {
      app.log.error(e);
      return { status: 'degraded', db: 'fail' };
    }
  });
}
