import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  grid_id: z.string().uuid(),
  message: z.string().min(1)
});

export function registerGridDiscussionRoutes(app: FastifyInstance) {
  // Public GET - list all grid discussions
  app.get('/grid-discussions', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, grid_id, user_id, message, created_at FROM grid_discussions ORDER BY created_at DESC LIMIT 200'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create grid discussion (requires auth, user_id comes from JWT)
  app.post('/grid-discussions', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const { grid_id, message } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO grid_discussions (grid_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
          [grid_id, userId, message]
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