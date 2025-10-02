import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  grid_id: z.string().uuid(),
  user_id: z.string().uuid()
});

export function registerVolunteerRegistrationRoutes(app: FastifyInstance) {
  // Public GET - list all volunteer registrations
  app.get('/volunteer-registrations', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, grid_id, user_id, created_at FROM volunteer_registrations ORDER BY created_at DESC LIMIT 200'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create volunteer registration (requires auth, user can only register themselves)
  app.post('/volunteer-registrations', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;

      // RLS policy ensures user can only insert their own registration
      // So we enforce that user_id matches the authenticated user
      if (parsed.data.user_id !== userId) {
        return reply.code(403).send({ message: 'Cannot register on behalf of other users' });
      }

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO volunteer_registrations (grid_id, user_id) VALUES ($1, $2) RETURNING *',
          [parsed.data.grid_id, parsed.data.user_id]
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected DELETE - cancel volunteer registration (requires auth, user can only cancel their own)
  app.delete('/volunteer-registrations/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params as any;
    try {
      const userId = req.user?.sub;

      // RLS policy ensures user can only delete their own registration
      const rowCount = await withConn(async (c) => {
        const result = await c.query(
          'DELETE FROM volunteer_registrations WHERE id = $1',
          [id]
        );
        return result.rowCount || 0;
      }, userId);

      if (rowCount === 0) {
        return reply.code(404).send({ message: 'Not found or not authorized' });
      }
      return reply.code(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}