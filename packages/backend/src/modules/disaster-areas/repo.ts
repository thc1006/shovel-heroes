import type { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export interface DisasterArea {
  id: string;
  name: string;
  center_lat: number;
  center_lng: number;
  created_at: string;
  updated_at: string;
}

export async function listDisasterAreas(app: FastifyInstance): Promise<DisasterArea[]> {
  if (!app.hasDecorator('db')) return [];
  const { rows } = await app.db.query<DisasterArea>('SELECT * FROM disaster_areas ORDER BY created_at DESC');
  return rows;
}

interface CreateInput {
  name: string;
  center_lat: number;
  center_lng: number;
}

export async function createDisasterArea(app: FastifyInstance, input: CreateInput): Promise<DisasterArea> {
  if (!app.hasDecorator('db')) {
    const now = new Date().toISOString();
    return { id: randomUUID(), created_at: now, updated_at: now, ...input } as DisasterArea;
  }
  const id = randomUUID();
  const { rows } = await app.db.query<DisasterArea>(
    `INSERT INTO disaster_areas (id, name, center_lat, center_lng) VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, input.name, input.center_lat, input.center_lng]
  );
  return rows[0];
}
