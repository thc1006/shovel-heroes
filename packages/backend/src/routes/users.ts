import type { FastifyInstance } from 'fastify';
import { withConn } from '../lib/db.js';

export function registerUserRoutes(app: FastifyInstance) {
  // GET /users - List all users (may require auth in production)
  app.get('/users', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, display_name as name, email, phone_number as phone, display_name FROM users ORDER BY id LIMIT 100'
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

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return reply.code(401).send({ message: 'Invalid user ID format' });
      }

      const user = await withConn(async (c) => {
        // Ensure user exists in database (upsert pattern for JWT-based auth)
        const email = req.user?.email || `user-${userId}@example.com`;
        const displayName = req.user?.name || req.user?.email?.split('@')[0] || 'User';

        // Check if user already exists by ID
        const { rows: existingById } = await c.query(
          'SELECT id, display_name as name, email, phone_number as phone, display_name FROM users WHERE id = $1',
          [userId]
        );

        if (existingById.length > 0) {
          // User exists by ID, return it
          return existingById[0];
        }

        // User doesn't exist by ID, check if email is already taken
        const { rows: existingByEmail } = await c.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingByEmail.length > 0) {
          // Email is taken by another user
          // This shouldn't happen in normal flow, but handle gracefully
          // Return the existing user with that email
          const { rows } = await c.query(
            'SELECT id, display_name as name, email, phone_number as phone, display_name FROM users WHERE email = $1',
            [email]
          );
          return rows[0];
        }

        // User doesn't exist, create new user
        const { rows: newUser } = await c.query(
          `INSERT INTO users (id, display_name, email)
           VALUES ($1, $2, $3)
           RETURNING id, display_name as name, email, phone_number as phone, display_name`,
          [userId, displayName, email]
        );

        return newUser[0];
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