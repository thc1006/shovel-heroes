import type { FastifyInstance } from 'fastify';
import { withConn } from '../lib/db.js';

export function registerUserRoutes(app: FastifyInstance) {
  // GET /users - List all users (may require auth in production)
  app.get('/users', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, name, email, phone, display_name FROM users ORDER BY id LIMIT 100'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // GET /me - Get current authenticated user
  app.get('/me', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }

      const user = await withConn(async (c) => {
        // Ensure user exists in database (upsert pattern for JWT-based auth)
        const email = req.user?.email || `user-${userId}@example.com`;
        const name = req.user?.name || req.user?.email?.split('@')[0] || 'User';

        await c.query(
          'INSERT INTO users (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email',
          [userId, name, email]
        );

        const { rows } = await c.query(
          'SELECT id, name, email, phone, display_name FROM users WHERE id = $1',
          [userId]
        );
        return rows[0];
      }, userId);

      if (!user) {
        return reply.code(404).send({ message: 'User not found' });
      }

      return user;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}