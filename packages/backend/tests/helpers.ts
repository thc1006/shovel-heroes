import Fastify, { FastifyInstance } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';

// Import all route registrations
import { registerHealth } from '../src/routes/healthz.js';
import { registerGrids } from '../src/routes/grids.js';
import { registerDisasterAreaRoutes } from '../src/routes/disaster-areas.js';
import { registerVolunteersRoutes } from '../src/routes/volunteers.js';
import { registerVolunteerRegistrationRoutes } from '../src/routes/volunteer-registrations.js';
import { registerUserRoutes } from '../src/routes/users.js';
import { registerAnnouncementRoutes } from '../src/routes/announcements.js';
import { registerSupplyDonationRoutes } from '../src/routes/supply-donations.js';
import { registerGridDiscussionRoutes } from '../src/routes/grid-discussions.js';

// Set test environment before importing env
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test_secret_do_not_use_in_production_minimum_32_chars';

const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes_test';
const JWT_SECRET = 'test_secret_do_not_use_in_production_minimum_32_chars';

export interface TestContext {
  app: FastifyInstance;
  pool: Pool;
  jwt: typeof jwt;
}

/**
 * Create a test Fastify application with all plugins and routes registered
 */
export async function createTestApp(): Promise<TestContext> {
  const pool = new Pool({ connectionString: TEST_DB_URL });

  const app = Fastify({
    logger: false // Disable logging in tests
  });

  // Register plugins
  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(rateLimit, {
    max: 1000, // Higher limit for tests
    timeWindow: '1 minute'
  });
  await app.register(jwt, { secret: JWT_SECRET });

  // Decorate app with db pool
  app.decorate('db', pool);

  // Auth decorator
  app.decorate('auth', async (req: any, reply: any) => {
    try {
      await req.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'unauthorized' });
    }
  });

  // Register all routes
  registerHealth(app);
  registerGrids(app);
  registerDisasterAreaRoutes(app);
  registerVolunteersRoutes(app);
  registerVolunteerRegistrationRoutes(app);
  registerUserRoutes(app);
  registerAnnouncementRoutes(app);
  registerSupplyDonationRoutes(app);
  registerGridDiscussionRoutes(app);

  app.get('/', async () => ({ ok: true }));

  await app.ready();

  return { app, pool, jwt };
}

/**
 * Close the test app and cleanup resources
 */
export async function closeTestApp(context: TestContext): Promise<void> {
  await context.app.close();
  await context.pool.end();
}

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(userId: string, app: FastifyInstance): string {
  return app.jwt.sign({ userId, sub: userId });
}

/**
 * Clean all test data from database tables
 * Order matters: delete child tables before parent tables to avoid FK constraint violations
 */
export async function cleanDatabase(pool: Pool): Promise<void> {
  const tables = [
    // Delete from child tables first (those with foreign keys)
    'volunteer_registrations',  // References: volunteers, grids, disaster_areas
    'grid_discussions',         // References: grids, users
    'supply_donations',         // References: grids, disaster_areas
    'announcements',            // References: disaster_areas
    'volunteers',               // References: users (NEW - added this)
    'grids',                    // References: disaster_areas, users (manager_id)
    'disaster_areas',           // No references
    'users'                     // Parent table, deleted last
  ];

  for (const table of tables) {
    await pool.query(`DELETE FROM ${table}`);
  }
}

/**
 * Create a test user in the database
 */
export async function createTestUser(pool: Pool, data?: Partial<{ id: string; name: string; email: string; phone: string }>): Promise<any> {
  const id = data?.id || randomUUID();
  const display_name = data?.name || 'Test User';
  const email = data?.email || `test-${id.substring(0, 8)}@example.com`;
  const phone_number = data?.phone || null;

  const { rows } = await pool.query(
    `INSERT INTO users (id, display_name, email, phone_number) VALUES ($1, $2, $3, $4) RETURNING id, display_name, display_name as name, email, phone_number, phone_number as phone`,
    [id, display_name, email, phone_number]
  );

  return rows[0];
}

/**
 * Create a test disaster area
 */
export async function createTestDisasterArea(pool: Pool, data?: Partial<{ id: string; name: string; description?: string; location?: string }>): Promise<any> {
  const id = data?.id || randomUUID();
  const name = data?.name || 'Test Disaster Area';
  const description = data?.description || 'Test disaster area description';
  const location = data?.location || 'Test Location';

  const { rows } = await pool.query(
    `INSERT INTO disaster_areas (id, name, description, location) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, name, description, location]
  );

  return rows[0];
}

/**
 * Create a test grid
 */
export async function createTestGrid(pool: Pool, disasterAreaId: string, data?: Partial<{ id: string; name: string; area_id: string }>): Promise<any> {
  const id = data?.id || randomUUID();
  const name = data?.name || 'Test Grid';
  const area_id = data?.area_id || disasterAreaId;

  const { rows } = await pool.query(
    `INSERT INTO grids (id, name, area_id) VALUES ($1, $2, $3) RETURNING *`,
    [id, name, area_id]
  );

  return rows[0];
}

/**
 * Create a test volunteer registration
 * Note: userId should be the user's ID. This function will create/get the volunteer record automatically.
 */
export async function createTestVolunteerRegistration(pool: Pool, gridId: string, userId: string, overrides: any = {}): Promise<any> {
  const id = randomUUID();

  // First, ensure the user has a volunteer record
  let volunteerId = overrides.volunteer_id;

  if (!volunteerId) {
    // Check if user already has a volunteer record
    const { rows: existingVolunteers } = await pool.query(
      'SELECT id FROM volunteers WHERE user_id = $1',
      [userId]
    );

    if (existingVolunteers.length > 0) {
      volunteerId = existingVolunteers[0].id;
    } else {
      // Create a volunteer record for this user
      const { rows: newVolunteers } = await pool.query(
        `INSERT INTO volunteers (id, user_id, name, email, phone, status)
         VALUES (gen_random_uuid(), $1, 'Test Volunteer', $2, '0912-345-678', 'available')
         RETURNING id`,
        [userId, `volunteer-${userId}@example.com`]
      );
      volunteerId = newVolunteers[0].id;
    }
  }

  // Now create the volunteer registration with the volunteer_id
  const { rows } = await pool.query(
    `INSERT INTO volunteer_registrations (
      id, volunteer_id, grid_id, disaster_area_id, status, notes,
      volunteer_name, volunteer_phone, available_time, skills, equipment
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      id,
      volunteerId,
      gridId,
      overrides.disaster_area_id || null,
      overrides.status || 'pending',
      overrides.notes || null,
      overrides.volunteer_name || 'Test Volunteer',
      overrides.volunteer_phone || '0912-345-678',
      overrides.available_time || null,
      overrides.skills || null,
      overrides.equipment || null
    ]
  );

  return rows[0];
}

/**
 * Set app.user_id for RLS testing
 */
export async function withUserId<T>(pool: Pool, userId: string, fn: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    // PostgreSQL SET LOCAL doesn't support parameterized queries
    await client.query(`SET LOCAL app.user_id = '${userId}'`);
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Mock data generators
 */
export const mockData = {
  user: (overrides?: any) => ({
    id: randomUUID(),
    display_name: 'Mock User',
    name: 'Mock User',
    email: `mock-${Date.now()}@example.com`,
    phone_number: '0912345678',
    phone: '0912345678',
    ...overrides
  }),

  disasterArea: (overrides?: any) => ({
    id: randomUUID(),
    name: 'Mock Disaster Area',
    center_lat: 25.0330,
    center_lng: 121.5654,
    ...overrides
  }),

  grid: (areaId: string, overrides?: any) => ({
    id: randomUUID(),
    name: 'Mock Grid',
    area_id: areaId,
    ...overrides
  }),

  announcement: (overrides?: any) => ({
    id: randomUUID(),
    title: 'Mock Announcement',
    body: 'This is a mock announcement for testing',
    ...overrides
  }),

  supplyDonation: (gridId: string, overrides?: any) => ({
    id: randomUUID(),
    grid_id: gridId,
    name: 'Mock Supply',
    quantity: 10,
    unit: 'boxes',
    donor_contact: '0912345678',
    ...overrides
  })
};

/**
 * Wait for a condition to be true (for async operations)
 */
export async function waitFor(condition: () => boolean | Promise<boolean>, timeout = 5000, interval = 100): Promise<void> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  throw new Error('Timeout waiting for condition');
}
