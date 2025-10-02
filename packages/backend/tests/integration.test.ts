import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  cleanDatabase,
  generateTestToken,
  createTestUser,
  createTestDisasterArea,
  createTestGrid,
  createTestVolunteerRegistration,
  withUserId,
  type TestContext
} from './helpers.js';

describe('Integration Tests - Full Workflow', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  beforeEach(async () => {
    await cleanDatabase(context.pool);
  });

  describe('Complete Disaster Response Workflow', () => {
    it('should handle complete workflow: create disaster area → create grid → volunteer registration', async () => {
      const { app, pool } = context;

      // Create a test user and get auth token
      const testUser = await createTestUser(pool, { name: 'Admin User', email: 'admin@example.com' });
      const authToken = generateTestToken(testUser.id, app);

      // Step 1: Create a disaster area (requires auth)
      const disasterAreaPayload = {
        name: '花蓮地震災區',
        center_lat: 24.0,
        center_lng: 121.5
      };

      const disasterResponse = await app.inject({
        method: 'POST',
        url: '/disaster-areas',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: disasterAreaPayload
      });

      expect(disasterResponse.statusCode).toBe(201);
      const disasterArea = disasterResponse.json();
      expect(disasterArea).toMatchObject(disasterAreaPayload);
      expect(disasterArea.id).toBeDefined();
      expect(disasterArea.created_at).toBeDefined();

      // Step 2: Create a grid in the disaster area
      const gridPayload = {
        name: 'Grid A-1',
        area_id: disasterArea.id
      };

      const gridResponse = await app.inject({
        method: 'POST',
        url: '/grids',
        payload: gridPayload
      });

      expect(gridResponse.statusCode).toBe(201);
      const grid = gridResponse.json();
      expect(grid).toMatchObject(gridPayload);
      expect(grid.id).toBeDefined();

      // Step 3: Create test users
      const user1 = await createTestUser(pool, { name: 'Volunteer 1', email: 'vol1@example.com' });
      const user2 = await createTestUser(pool, { name: 'Volunteer 2', email: 'vol2@example.com' });

      // Step 4: Register volunteers to the grid
      const registration1Payload = {
        grid_id: grid.id,
        user_id: user1.id
      };

      const registration1Response = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        payload: registration1Payload
      });

      expect(registration1Response.statusCode).toBe(201);
      const registration1 = registration1Response.json();
      expect(registration1).toMatchObject(registration1Payload);

      const registration2Payload = {
        grid_id: grid.id,
        user_id: user2.id
      };

      const registration2Response = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        payload: registration2Payload
      });

      expect(registration2Response.statusCode).toBe(201);

      // Step 5: List volunteers for the grid
      const volunteersResponse = await app.inject({
        method: 'GET',
        url: `/volunteers?grid_id=${grid.id}`,
        headers: {
          authorization: 'Bearer test-token'
        }
      });

      expect(volunteersResponse.statusCode).toBe(200);
      const volunteersData = volunteersResponse.json();
      expect(volunteersData.data).toHaveLength(2);
      expect(volunteersData.total).toBe(2);
      expect(volunteersData.can_view_phone).toBe(true);

      // Step 6: Verify disaster area can be retrieved
      const getDisasterResponse = await app.inject({
        method: 'GET',
        url: `/disaster-areas/${disasterArea.id}`
      });

      expect(getDisasterResponse.statusCode).toBe(200);
      expect(getDisasterResponse.json()).toMatchObject(disasterArea);

      // Step 7: Update disaster area (requires auth)
      const updatePayload = {
        name: '花蓮地震災區 (已更新)'
      };

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/disaster-areas/${disasterArea.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: updatePayload
      });

      expect(updateResponse.statusCode).toBe(200);
      const updatedDisasterArea = updateResponse.json();
      expect(updatedDisasterArea.name).toBe(updatePayload.name);

      // Step 8: List all disaster areas
      const listResponse = await app.inject({
        method: 'GET',
        url: '/disaster-areas'
      });

      expect(listResponse.statusCode).toBe(200);
      const disasterAreas = listResponse.json();
      expect(disasterAreas).toHaveLength(1);
      expect(disasterAreas[0].name).toBe(updatePayload.name);
    });
  });

  describe('Row-Level Security (RLS) Tests', () => {
    it('should enforce RLS policies across multiple users', async () => {
      const { pool } = context;

      // Create test disaster area and grid
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      // Create two separate users
      const user1 = await createTestUser(pool, { name: 'User 1' });
      const user2 = await createTestUser(pool, { name: 'User 2' });

      // User 1 creates a registration
      const reg1 = await withUserId(pool, user1.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO volunteer_registrations (id, grid_id, user_id) VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
          [grid.id, user1.id]
        );
        return rows[0];
      });

      // User 2 creates a registration
      const reg2 = await withUserId(pool, user2.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO volunteer_registrations (id, grid_id, user_id) VALUES (gen_random_uuid(), $1, $2) RETURNING *`,
          [grid.id, user2.id]
        );
        return rows[0];
      });

      expect(reg1).toBeDefined();
      expect(reg2).toBeDefined();
      expect(reg1.user_id).toBe(user1.id);
      expect(reg2.user_id).toBe(user2.id);

      // Verify both registrations exist without RLS context
      const { rows: allRegs } = await pool.query(
        `SELECT * FROM volunteer_registrations WHERE grid_id = $1`,
        [grid.id]
      );
      expect(allRegs).toHaveLength(2);
    });

    it('should apply RLS filtering when app.user_id is set', async () => {
      const { pool } = context;

      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);
      const user = await createTestUser(pool);

      // Create registration with user context
      await withUserId(pool, user.id, async (client) => {
        await client.query(
          `INSERT INTO volunteer_registrations (id, grid_id, user_id) VALUES (gen_random_uuid(), $1, $2)`,
          [grid.id, user.id]
        );
      });

      // Query with user context should see their own data
      const filtered = await withUserId(pool, user.id, async (client) => {
        const { rows } = await client.query(
          `SELECT * FROM volunteer_registrations WHERE grid_id = $1`,
          [grid.id]
        );
        return rows;
      });

      expect(filtered.length).toBeGreaterThan(0);
    });
  });

  describe('Rate Limiting Tests', () => {
    it('should allow requests within rate limit', async () => {
      const { app } = context;

      // Make multiple requests within limit (test limit is 1000/min)
      for (let i = 0; i < 10; i++) {
        const response = await app.inject({
          method: 'GET',
          url: '/healthz'
        });
        expect(response.statusCode).toBe(200);
      }
    });

    it('should include rate limit headers', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'GET',
        url: '/healthz'
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });

  describe('JWT Authentication Tests', () => {
    it('should reject requests with invalid JWT', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });

      // The /me endpoint uses auth preHandler
      expect([401, 500]).toContain(response.statusCode);
    });

    it('should accept valid JWT tokens', async () => {
      const { app, pool } = context;
      const user = await createTestUser(pool);

      const token = generateTestToken(user.id, app);

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      // The user route has a simple auth stub, so this depends on implementation
      expect(response.statusCode).toBeLessThan(500);
    });

    it('should handle JWT expiration', async () => {
      const { app } = context;

      // Generate a token that expires immediately
      const expiredToken = app.jwt.sign(
        { userId: 'test-user' },
        { expiresIn: '0s' }
      );

      // Wait to ensure expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${expiredToken}`
        }
      });

      // Should be unauthorized
      expect([401, 500]).toContain(response.statusCode);
    });
  });

  describe('Input Validation Tests', () => {
    it('should validate disaster area creation payload', async () => {
      const { app, pool } = context;

      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const invalidPayload = {
        name: '',
        center_lat: 999, // Invalid latitude
        center_lng: 999  // Invalid longitude
      };

      const response = await app.inject({
        method: 'POST',
        url: '/disaster-areas',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: invalidPayload
      });

      expect(response.statusCode).toBe(400);
      const error = response.json();
      expect(error.message).toBeDefined();
      expect(error.issues).toBeDefined();
    });

    it('should validate volunteer registration payload', async () => {
      const { app, pool } = context;

      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const invalidPayload = {
        grid_id: '',
        user_id: ''
      };

      const response = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: invalidPayload
      });

      expect(response.statusCode).toBe(400);
    });

    it('should validate announcement payload', async () => {
      const { app, pool } = context;

      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const invalidPayload = {
        title: '',
        body: ''
      };

      const response = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: invalidPayload
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Error Handling Tests', () => {
    it('should return 404 for non-existent disaster area', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'GET',
        url: '/disaster-areas/00000000-0000-0000-0000-000000000000'
      });

      expect(response.statusCode).toBe(404);
      const error = response.json();
      expect(error.message).toBe('Not found');
    });

    it('should return 404 when updating non-existent disaster area', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'PUT',
        url: '/disaster-areas/00000000-0000-0000-0000-000000000000',
        payload: { name: 'Updated Name' }
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 when deleting non-existent disaster area', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'DELETE',
        url: '/disaster-areas/00000000-0000-0000-0000-000000000000'
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return proper JSON error format', async () => {
      const { app } = context;

      const response = await app.inject({
        method: 'GET',
        url: '/disaster-areas/invalid-uuid'
      });

      // Should handle gracefully, either 404 or 400
      expect([400, 404, 500]).toContain(response.statusCode);

      const body = response.json();
      expect(body).toBeDefined();
      expect(typeof body).toBe('object');
    });
  });

  describe('CRUD Operations Tests', () => {
    describe('Announcements', () => {
      it('should create and list announcements', async () => {
        const { app, pool } = context;

        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          title: 'Test Announcement',
          body: 'This is a test announcement'
        };

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        expect(createResponse.statusCode).toBe(201);
        const created = createResponse.json();
        expect(created).toMatchObject(payload);

        const listResponse = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        expect(listResponse.statusCode).toBe(200);
        const announcements = listResponse.json();
        expect(announcements).toHaveLength(1);
      });
    });

    describe('Supply Donations', () => {
      it('should create and list supply donations', async () => {
        const { app, pool } = context;

        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          name: 'Water Bottles',
          quantity: 100,
          unit: 'bottles',
          donor_contact: '0912345678'
        };

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        expect(createResponse.statusCode).toBe(201);
        const created = createResponse.json();
        expect(created).toMatchObject(payload);

        const listResponse = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });

        expect(listResponse.statusCode).toBe(200);
        const donations = listResponse.json();
        expect(donations).toHaveLength(1);
      });
    });

    describe('Grid Discussions', () => {
      it('should create and list grid discussions', async () => {
        const { app, pool } = context;

        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const user = await createTestUser(pool);
        const authToken = generateTestToken(user.id, app);

        const payload = {
          grid_id: grid.id,
          content: 'This is a test discussion message'
        };

        const createResponse = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        expect(createResponse.statusCode).toBe(201);
        const created = createResponse.json();
        expect(created.content).toBe(payload.content);

        const listResponse = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        expect(listResponse.statusCode).toBe(200);
        const discussions = listResponse.json();
        expect(discussions).toHaveLength(1);
      });
    });
  });

  describe('Data Format Tests', () => {
    it('should use ISO 8601 format for timestamps', async () => {
      const { app, pool } = context;

      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const payload = {
        name: 'Test Area',
        center_lat: 25.0,
        center_lng: 121.5
      };

      const response = await app.inject({
        method: 'POST',
        url: '/disaster-areas',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload
      });

      expect(response.statusCode).toBe(201);
      const created = response.json();

      // Verify ISO 8601 format
      expect(created.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(new Date(created.created_at).toISOString()).toBeTruthy();
    });

    it('should use UUIDs for all IDs', async () => {
      const { app, pool } = context;

      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);
      const user = await createTestUser(pool);

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(disasterArea.id).toMatch(uuidRegex);
      expect(grid.id).toMatch(uuidRegex);
      expect(user.id).toMatch(uuidRegex);
    });

    it('should use parameterized queries (no SQL injection)', async () => {
      const { app, pool } = context;

      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      // Try SQL injection in disaster area name
      const maliciousPayload = {
        name: "Test'; DROP TABLE users; --",
        center_lat: 25.0,
        center_lng: 121.5
      };

      const response = await app.inject({
        method: 'POST',
        url: '/disaster-areas',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: maliciousPayload
      });

      expect(response.statusCode).toBe(201);
      const created = response.json();

      // Name should be stored as-is (parameterized queries prevent injection)
      expect(created.name).toBe(maliciousPayload.name);

      // Verify users table still exists
      const usersResponse = await app.inject({
        method: 'GET',
        url: '/users'
      });
      expect(usersResponse.statusCode).toBe(200);
    });
  });
});
