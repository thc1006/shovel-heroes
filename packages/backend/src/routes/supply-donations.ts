import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  grid_id: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: z.string().min(1),
  donor_contact: z.string().optional()
});

export function registerSupplyDonationRoutes(app: FastifyInstance) {
  // Public GET - list all supply donations
  app.get('/supply-donations', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, grid_id, name, quantity, unit, donor_contact, created_at FROM supply_donations ORDER BY created_at DESC LIMIT 200'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create supply donation (requires auth)
  app.post('/supply-donations', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const { grid_id, name, quantity, unit, donor_contact } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO supply_donations (grid_id, name, quantity, unit, donor_contact) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [grid_id, name, quantity, unit, donor_contact || null]
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