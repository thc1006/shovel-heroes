import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1)
});

export function registerAnnouncementRoutes(app: FastifyInstance) {
  // Public GET - list all announcements
  app.get('/announcements', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, title, body, created_at FROM announcements ORDER BY created_at DESC LIMIT 100'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create announcement (requires auth)
  app.post('/announcements', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const { title, body } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO announcements (title, body) VALUES ($1, $2) RETURNING *',
          [title, body]
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}