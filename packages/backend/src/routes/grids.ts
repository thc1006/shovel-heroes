import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const qSchema = z.object({
  area_id: z.string().optional()
});

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
}
