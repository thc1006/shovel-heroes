import type { FastifyInstance } from 'fastify';
import { listDisasterAreas, createDisasterArea } from '../modules/disaster-areas/repo.js';
import { z } from 'zod';

const CreateSchema = z.object({
  name: z.string().min(1),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180)
});

export function registerDisasterAreaRoutes(app: FastifyInstance) {
  app.get('/disaster-areas', async () => {
    return listDisasterAreas(app);
  });

  app.post('/disaster-areas', async (req, reply) => {
    const parsed = CreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ message: 'Invalid payload', issues: parsed.error.issues });
    }
    const created = await createDisasterArea(app, parsed.data);
    return reply.status(201).send(created);
  });
}