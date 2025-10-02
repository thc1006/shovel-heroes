import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const qSchema = z.object({
  area_id: z.string().optional()
});

export function registerGrids(app: FastifyInstance) {
  app.get('/grids', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = qSchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: 'bad_request', detail: parsed.error.flatten() });

    const userId = (req.user && (req.user as any).sub) || null;
    const rows = await withConn(async (c) => {
      const { rows } = await c.query(
        `select id, name, area_id from grids
         where ($1::text is null or area_id = $1) 
         order by name limit 100`, 
        [parsed.data.area_id ?? null]
      );
      return rows;
    }, userId ?? undefined);

    return { items: rows };
  });
}
