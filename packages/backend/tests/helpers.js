import Fastify from 'fastify';
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
/**
 * Create a test Fastify application with all plugins and routes registered
 */
export async function createTestApp() {
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
    app.decorate('auth', async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch {
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
export async function closeTestApp(context) {
    await context.app.close();
    await context.pool.end();
}
/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(userId, app) {
    return app.jwt.sign({ userId, sub: userId });
}
/**
 * Clean all test data from database tables
 */
export async function cleanDatabase(pool) {
    const tables = [
        'grid_discussions',
        'supply_donations',
        'announcements',
        'volunteer_registrations',
        'grids',
        'disaster_areas',
        'users'
    ];
    for (const table of tables) {
        await pool.query(`DELETE FROM ${table}`);
    }
}
/**
 * Create a test user in the database
 */
export async function createTestUser(pool, data) {
    const id = data?.id || randomUUID();
    const name = data?.name || 'Test User';
    const email = data?.email || `test-${id.substring(0, 8)}@example.com`;
    const phone = data?.phone || null;
    const { rows } = await pool.query(`INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *`, [id, name, email, phone]);
    return rows[0];
}
/**
 * Create a test disaster area
 */
export async function createTestDisasterArea(pool, data) {
    const id = data?.id || randomUUID();
    const name = data?.name || 'Test Disaster Area';
    const center_lat = data?.center_lat || 25.0330;
    const center_lng = data?.center_lng || 121.5654;
    const { rows } = await pool.query(`INSERT INTO disaster_areas (id, name, center_lat, center_lng) VALUES ($1, $2, $3, $4) RETURNING *`, [id, name, center_lat, center_lng]);
    return rows[0];
}
/**
 * Create a test grid
 */
export async function createTestGrid(pool, disasterAreaId, data) {
    const id = data?.id || randomUUID();
    const name = data?.name || 'Test Grid';
    const area_id = data?.area_id || disasterAreaId;
    const { rows } = await pool.query(`INSERT INTO grids (id, name, area_id) VALUES ($1, $2, $3) RETURNING *`, [id, name, area_id]);
    return rows[0];
}
/**
 * Create a test volunteer registration
 */
export async function createTestVolunteerRegistration(pool, gridId, userId) {
    const id = randomUUID();
    const { rows } = await pool.query(`INSERT INTO volunteer_registrations (id, grid_id, user_id) VALUES ($1, $2, $3) RETURNING *`, [id, gridId, userId]);
    return rows[0];
}
/**
 * Set app.user_id for RLS testing
 */
export async function withUserId(pool, userId, fn) {
    const client = await pool.connect();
    try {
        await client.query('SET LOCAL app.user_id = $1', [userId]);
        return await fn(client);
    }
    finally {
        client.release();
    }
}
/**
 * Mock data generators
 */
export const mockData = {
    user: (overrides) => ({
        id: randomUUID(),
        name: 'Mock User',
        email: `mock-${Date.now()}@example.com`,
        phone: '0912345678',
        ...overrides
    }),
    disasterArea: (overrides) => ({
        id: randomUUID(),
        name: 'Mock Disaster Area',
        center_lat: 25.0330,
        center_lng: 121.5654,
        ...overrides
    }),
    grid: (areaId, overrides) => ({
        id: randomUUID(),
        name: 'Mock Grid',
        area_id: areaId,
        ...overrides
    }),
    announcement: (overrides) => ({
        id: randomUUID(),
        title: 'Mock Announcement',
        body: 'This is a mock announcement for testing',
        ...overrides
    }),
    supplyDonation: (gridId, overrides) => ({
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
export async function waitFor(condition, timeout = 5000, interval = 100) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
}
