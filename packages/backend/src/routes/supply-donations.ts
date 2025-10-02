import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  grid_id: z.string().uuid(),
  donor_name: z.string().min(1),
  item_type: z.string().min(1),
  quantity: z.number().int().positive(),
  unit: z.string().min(1),
  donor_contact: z.string().optional()
});

const UpdateSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'delivered']).optional(),
  quantity: z.number().int().positive().optional(),
  notes: z.string().optional()
});

export function registerSupplyDonationRoutes(app: FastifyInstance) {
  // Public GET - list all supply donations
  app.get('/supply-donations', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, grid_id, donor_name, item_type, quantity, unit, donor_contact, status, created_at FROM supply_donations ORDER BY created_at DESC LIMIT 200'
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
      const { grid_id, donor_name, item_type, quantity, unit, donor_contact } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO supply_donations (grid_id, donor_name, item_type, quantity, unit, donor_contact, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
          [grid_id, donor_name, item_type, quantity, unit, donor_contact || null, 'pledged']
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected PUT - update supply donation (requires auth)
  app.put('/supply-donations/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params;
    const parsed = UpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const fields: string[] = [];
      const values: any[] = [];
      let i = 1;

      for (const [k, v] of Object.entries(parsed.data)) {
        if (typeof v === 'undefined') continue;
        fields.push(`${k} = $${i++}`);
        values.push(v);
      }

      if (fields.length === 0) {
        const row = await withConn(async (c) => {
          const { rows } = await c.query('SELECT * FROM supply_donations WHERE id = $1', [id]);
          return rows[0] || null;
        }, userId);
        if (!row) return reply.code(404).send({ message: 'Not found' });
        return row;
      }

      values.push(id);
      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          `UPDATE supply_donations SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
          values
        );
        return rows[0] || null;
      }, userId);

      if (!result) return reply.code(404).send({ message: 'Not found' });
      return result;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected DELETE - delete supply donation (requires auth)
  app.delete('/supply-donations/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params;
    const userId = req.user?.sub;

    try {
      const rowCount = await withConn(async (c) => {
        const result = await c.query('DELETE FROM supply_donations WHERE id = $1', [id]);
        return result.rowCount || 0;
      }, userId);

      if (rowCount === 0) {
        return reply.code(404).send({ message: 'Not found' });
      }
      return reply.code(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}