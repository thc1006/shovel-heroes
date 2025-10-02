import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  name: z.string().min(1),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180)
});

const UpdateSchema = CreateSchema.partial();

export function registerDisasterAreaRoutes(app: FastifyInstance) {
  // Public GET - list all disaster areas
  app.get('/disaster-areas', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, name, center_lat, center_lng, created_at, updated_at FROM disaster_areas ORDER BY created_at DESC LIMIT 100'
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create disaster area (requires auth)
  app.post('/disaster-areas', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO disaster_areas (name, center_lat, center_lng) VALUES ($1, $2, $3) RETURNING *',
          [parsed.data.name, parsed.data.center_lat, parsed.data.center_lng]
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Public GET - get single disaster area by ID
  app.get('/disaster-areas/:id', async (req, reply) => {
    const { id } = req.params as any;
    try {
      const row = await withConn(async (c) => {
        const { rows } = await c.query(
          'SELECT id, name, center_lat, center_lng, created_at, updated_at FROM disaster_areas WHERE id = $1',
          [id]
        );
        return rows[0] || null;
      });

      if (!row) {
        return reply.code(404).send({ message: 'Not found' });
      }
      return row;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected PUT - update disaster area (requires auth)
  app.put('/disaster-areas/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params as any;
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
        // No fields to update, return current record
        const row = await withConn(async (c) => {
          const { rows } = await c.query('SELECT * FROM disaster_areas WHERE id = $1', [id]);
          return rows[0] || null;
        }, userId);

        if (!row) return reply.code(404).send({ message: 'Not found' });
        return row;
      }

      values.push(id);
      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          `UPDATE disaster_areas SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
          values
        );
        return rows[0] || null;
      }, userId);

      if (!result) {
        return reply.code(404).send({ message: 'Not found' });
      }
      return result;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected DELETE - delete disaster area (requires auth)
  app.delete('/disaster-areas/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params as any;
    try {
      const userId = req.user?.sub;
      const rowCount = await withConn(async (c) => {
        const result = await c.query('DELETE FROM disaster_areas WHERE id = $1', [id]);
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