import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const qSchema = z.object({
  area_id: z.string().optional()
});

const CreateGridSchema = z.object({
  code: z.string().min(1).max(50),
  name: z.string().min(1),
  grid_type: z.enum(['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area']),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
  area_id: z.string().uuid().optional(),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }).optional(),
  volunteer_needed: z.number().int().min(0).default(0),
  volunteer_registered: z.number().int().min(0).default(0),
  supplies_needed: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string(),
    received: z.number().default(0)
  })).optional(),
  meeting_point: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['open', 'closed', 'completed', 'in_progress', 'preparing']).default('open')
});

const UpdateGridSchema = CreateGridSchema.partial();

export function registerGrids(app: FastifyInstance) {
  // Public GET - list all grids (no auth required for public viewing)
  app.get('/grids', async (req: any, reply) => {
    const parsed = qSchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });

    const rows = await withConn(async (c) => {
      const { rows } = await c.query(
        `SELECT id, code, name, area_id, grid_type, status,
                center_lat, center_lng, bounds,
                volunteer_needed, volunteer_registered,
                supplies_needed, meeting_point, description,
                created_at, updated_at
         FROM grids
         WHERE ($1::text IS NULL OR area_id = $1)
         ORDER BY code LIMIT 100`,
        [parsed.data.area_id ?? null]
      );
      return rows;
    });

    return rows;
  });

  // Protected POST - create grid (requires auth)
  app.post('/grids', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateGridSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const {
        code,
        name,
        area_id,
        grid_type,
        center_lat,
        center_lng,
        bounds,
        volunteer_needed,
        volunteer_registered,
        supplies_needed,
        meeting_point,
        description,
        status
      } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          `INSERT INTO grids (
            code, name, area_id, grid_type, center_lat, center_lng, bounds,
            volunteer_needed, volunteer_registered, supplies_needed,
            meeting_point, description, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10::jsonb, $11, $12, $13)
          RETURNING *`,
          [
            code,
            name,
            area_id,
            grid_type,
            center_lat,
            center_lng,
            bounds ? JSON.stringify(bounds) : null,
            volunteer_needed ?? 0,
            volunteer_registered ?? 0,
            supplies_needed ? JSON.stringify(supplies_needed) : '[]',
            meeting_point,
            description,
            status ?? 'open'
          ]
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);

      // Handle unique constraint violation for code
      if (err.code === '23505' && err.constraint?.includes('code')) {
        return reply.code(409).send({ message: 'Grid code already exists' });
      }

      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected PUT - update grid (requires auth)
  app.put('/grids/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params as any;
    const parsed = UpdateGridSchema.safeParse(req.body);
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

        // Handle JSONB fields - convert to JSON string
        if (k === 'bounds' || k === 'supplies_needed') {
          fields.push(`${k} = $${i++}::jsonb`);
          values.push(JSON.stringify(v));
        } else {
          fields.push(`${k} = $${i++}`);
          values.push(v);
        }
      }

      if (fields.length === 0) {
        // No fields to update, return current record
        const row = await withConn(async (c) => {
          const { rows } = await c.query('SELECT * FROM grids WHERE id = $1', [id]);
          return rows[0] || null;
        }, userId);

        if (!row) return reply.code(404).send({ message: 'Not found' });
        return row;
      }

      values.push(id);
      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          `UPDATE grids SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
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

  // Protected DELETE - delete grid with cascading deletes (requires auth)
  app.delete('/grids/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params;
    const userId = req.user?.sub;

    try {
      const deletedCount = await withConn(async (c) => {
        // Cascade delete in correct order to avoid foreign key constraint violations

        // 1. Delete volunteer registrations first (depends on grids)
        await c.query('DELETE FROM volunteer_registrations WHERE grid_id = $1', [id]);

        // 2. Delete supply donations (depends on grids)
        await c.query('DELETE FROM supply_donations WHERE grid_id = $1', [id]);

        // 3. Delete grid discussions (depends on grids)
        await c.query('DELETE FROM grid_discussions WHERE grid_id = $1', [id]);

        // 4. Finally delete the grid itself
        const result = await c.query('DELETE FROM grids WHERE id = $1', [id]);
        return result.rowCount || 0;
      }, userId);

      if (deletedCount === 0) {
        return reply.code(404).send({ message: 'Not found' });
      }
      return reply.code(204).send();
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}
