import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { registerHealth } from './routes/healthz.js';

describe('API smoke', () => {
  const app = Fastify();
  beforeAll(async () => {
    await app.register(helmet);
    await app.register(cors);
    await app.register(rateLimit, { max: 2, timeWindow: '1 minute' });
    await app.register(jwt, { secret: 'test' });
    registerHealth(app);
    await app.ready();
  });
  afterAll(async () => app.close());

  it('GET /healthz', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
  });
});
