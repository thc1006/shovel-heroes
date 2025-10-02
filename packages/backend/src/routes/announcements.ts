import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { withConn } from '../lib/db.js';

const CreateSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  published: z.boolean().optional()
});

const UpdateSchema = CreateSchema.partial();

export function registerAnnouncementRoutes(app: FastifyInstance) {
  // Public GET - list all published announcements
  app.get('/announcements', async (req, reply) => {
    try {
      const rows = await withConn(async (c) => {
        const { rows } = await c.query(
          `SELECT id, title, content, category, is_pinned, "order",
                  contact_phone, external_links, priority, published,
                  author_id, created_at, updated_at
           FROM announcements
           WHERE published = true
           ORDER BY is_pinned DESC, "order" ASC, created_at DESC
           LIMIT 100`
        );
        return rows;
      });
      return rows;
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected POST - create announcement (requires auth)
  app.post('/announcements', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }

    try {
      const userId = req.user?.sub;
      const { title, content, priority, published } = parsed.data;

      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          'INSERT INTO announcements (title, content, priority, published, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [title, content, priority || 'normal', published !== false, userId]
        );
        return rows[0];
      }, userId);

      return reply.code(201).send(result);
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });

  // Protected PUT - update announcement (requires auth)
  app.put('/announcements/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
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
          const { rows } = await c.query('SELECT * FROM announcements WHERE id = $1', [id]);
          return rows[0] || null;
        }, userId);
        if (!row) return reply.code(404).send({ message: 'Not found' });
        return row;
      }

      values.push(id);
      const result = await withConn(async (c) => {
        const { rows } = await c.query(
          `UPDATE announcements SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i} RETURNING *`,
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

  // Protected DELETE - delete announcement (requires auth)
  app.delete('/announcements/:id', { preHandler: [app.auth as any] }, async (req: any, reply) => {
    const { id } = req.params;
    const userId = req.user?.sub;

    try {
      const rowCount = await withConn(async (c) => {
        const result = await c.query('DELETE FROM announcements WHERE id = $1', [id]);
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