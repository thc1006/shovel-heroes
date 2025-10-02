import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  cleanDatabase,
  generateTestToken,
  createTestUser,
  createTestDisasterArea,
  createTestGrid,
  createTestVolunteerRegistration,
  type TestContext
} from '../helpers.js';

describe('Grids CRUD - TDD London School', () => {
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

  describe('POST /grids', () => {
    describe('Success Cases', () => {
      it('should create grid with valid minimal data and return 201', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool, { email: 'admin@example.com' });
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);

        const payload = {
          code: 'A-1',
          name: 'Test Grid A-1',
          area_id: disasterArea.id,
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created).toMatchObject(payload);
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
        expect(created.updated_at).toBeDefined();
        expect(created.status).toBe('preparing'); // Default status
        expect(created.volunteer_needed).toBe(0); // Default value
        expect(created.volunteer_registered).toBe(0); // Default value
      });

      it('should create grid with all optional fields', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);

        const payload = {
          code: 'B-2',
          name: 'Full Featured Grid',
          area_id: disasterArea.id,
          grid_type: 'supply_storage',
          status: 'open',
          center_lat: 24.0,
          center_lng: 122.0,
          bounds: {
            north: 24.001,
            south: 23.999,
            east: 122.001,
            west: 121.999
          },
          volunteer_needed: 20,
          volunteer_registered: 5,
          supplies_needed: [
            { name: '清潔用具', quantity: 100, received: 45, unit: '組' },
            { name: '飲用水', quantity: 500, received: 320, unit: '瓶' }
          ],
          meeting_point: '光復鄉公所前廣場',
          description: '主要物資集散中心'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created).toMatchObject(payload);
        expect(created.bounds).toEqual(payload.bounds);
        expect(created.supplies_needed).toEqual(payload.supplies_needed);
      });

      it('should create grid with null area_id (not linked to disaster area)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          code: 'C-1',
          name: 'Independent Grid',
          area_id: null,
          grid_type: 'mud_disposal',
          center_lat: 23.8,
          center_lng: 121.6
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.area_id).toBeNull();
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when code is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          name: 'Grid without code',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('bad_request');
        expect(error.detail).toBeDefined();
      });

      it('should return 400 when grid_type is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          code: 'A-1',
          name: 'Invalid Grid Type',
          grid_type: 'invalid_type', // Not in allowed enum
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('bad_request');
      });

      it('should return 400 when center_lat is out of range', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          code: 'A-1',
          name: 'Invalid Latitude',
          grid_type: 'manpower',
          center_lat: 999, // Invalid latitude
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when center_lng is out of range', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          code: 'A-1',
          name: 'Invalid Longitude',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: -999 // Invalid longitude
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when bounds format is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          code: 'A-1',
          name: 'Invalid Bounds',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5,
          bounds: { invalid: 'format' } // Missing required north/south/east/west
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when volunteer_needed is negative', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          code: 'A-1',
          name: 'Negative Volunteers',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5,
          volunteer_needed: -10 // Cannot be negative
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app } = context;

        const payload = {
          code: 'A-1',
          name: 'Unauthorized Grid',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app } = context;

        const payload = {
          code: 'A-1',
          name: 'Invalid Token Grid',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: 'Bearer invalid_token_xyz'
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is expired', async () => {
        // Arrange
        const { app } = context;

        // Generate an immediately expired token
        const expiredToken = app.jwt.sign(
          { userId: 'test-user' },
          { expiresIn: '0s' }
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        const payload = {
          code: 'A-1',
          name: 'Expired Token Grid',
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${expiredToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });

    describe('Duplicate Code Handling', () => {
      it('should return 409 when grid code already exists', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);

        // Create first grid
        const firstPayload = {
          code: 'DUPLICATE-1',
          name: 'First Grid',
          area_id: disasterArea.id,
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        const firstResponse = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: firstPayload
        });

        expect(firstResponse.statusCode).toBe(201);

        // Try to create another grid with same code
        const duplicatePayload = {
          code: 'DUPLICATE-1', // Same code
          name: 'Second Grid',
          area_id: disasterArea.id,
          grid_type: 'supply_storage',
          center_lat: 24.0,
          center_lng: 122.0
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: duplicatePayload
        });

        // Assert
        expect(response.statusCode).toBe(409);
        const error = response.json();
        expect(error.error).toBe('conflict');
        expect(error.message).toContain('code');
      });
    });

    describe('Foreign Key Constraints', () => {
      it('should return 400 or 404 when area_id references non-existent disaster area', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          code: 'A-1',
          name: 'Grid with Invalid Area',
          area_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
          grid_type: 'manpower',
          center_lat: 23.5,
          center_lng: 121.5
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grids',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect([400, 404, 500]).toContain(response.statusCode);
      });
    });
  });

  describe('GET /grids', () => {
    describe('Success Cases', () => {
      it('should return empty array when no grids exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(Array.isArray(grids)).toBe(true);
        expect(grids).toHaveLength(0);
      });

      it('should return all grids without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        await createTestGrid(pool, disasterArea.id, { code: 'A-1', name: 'Grid 1' });
        await createTestGrid(pool, disasterArea.id, { code: 'A-2', name: 'Grid 2' });
        await createTestGrid(pool, disasterArea.id, { code: 'A-3', name: 'Grid 3' });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids).toHaveLength(3);
        expect(grids[0].code).toBeDefined();
        expect(grids[0].name).toBeDefined();
      });

      it('should filter grids by area_id query parameter', async () => {
        // Arrange
        const { app, pool } = context;
        const area1 = await createTestDisasterArea(pool, { name: 'Area 1' });
        const area2 = await createTestDisasterArea(pool, { name: 'Area 2' });

        await createTestGrid(pool, area1.id, { code: 'A1-1', name: 'Area 1 Grid 1' });
        await createTestGrid(pool, area1.id, { code: 'A1-2', name: 'Area 1 Grid 2' });
        await createTestGrid(pool, area2.id, { code: 'A2-1', name: 'Area 2 Grid 1' });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: `/grids?area_id=${area1.id}`
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids).toHaveLength(2);
        expect(grids.every((g: any) => g.area_id === area1.id)).toBe(true);
      });

      it('should return grids ordered by code', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        await createTestGrid(pool, disasterArea.id, { code: 'C-3', name: 'Grid C3' });
        await createTestGrid(pool, disasterArea.id, { code: 'A-1', name: 'Grid A1' });
        await createTestGrid(pool, disasterArea.id, { code: 'B-2', name: 'Grid B2' });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids[0].code).toBe('A-1');
        expect(grids[1].code).toBe('B-2');
        expect(grids[2].code).toBe('C-3');
      });

      it('should limit results to 100 grids', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);

        // Create 105 grids
        for (let i = 1; i <= 105; i++) {
          await pool.query(
            `INSERT INTO grids (id, code, name, area_id) VALUES (gen_random_uuid(), $1, $2, $3)`,
            [`GRID-${i.toString().padStart(3, '0')}`, `Grid ${i}`, disasterArea.id]
          );
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids).toHaveLength(100); // Should limit to 100
      });

      it('should include all grid fields in response', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);

        const gridData = {
          code: 'FULL-1',
          name: 'Full Data Grid',
          grid_type: 'supply_storage',
          status: 'open',
          center_lat: 23.875,
          center_lng: 121.578,
          volunteer_needed: 20,
          volunteer_registered: 10,
          meeting_point: 'Test Meeting Point',
          description: 'Test Description'
        };

        await createTestGrid(pool, disasterArea.id, gridData);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids).toHaveLength(1);

        const grid = grids[0];
        expect(grid).toHaveProperty('id');
        expect(grid).toHaveProperty('code');
        expect(grid).toHaveProperty('name');
        expect(grid).toHaveProperty('area_id');
        expect(grid).toHaveProperty('grid_type');
        expect(grid).toHaveProperty('status');
        expect(grid).toHaveProperty('center_lat');
        expect(grid).toHaveProperty('center_lng');
        expect(grid).toHaveProperty('bounds');
        expect(grid).toHaveProperty('volunteer_needed');
        expect(grid).toHaveProperty('volunteer_registered');
        expect(grid).toHaveProperty('supplies_needed');
        expect(grid).toHaveProperty('meeting_point');
        expect(grid).toHaveProperty('description');
        expect(grid).toHaveProperty('created_at');
        expect(grid).toHaveProperty('updated_at');
      });
    });

    describe('Query Parameter Validation', () => {
      it('should return 400 when area_id is not a valid UUID', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids?area_id=invalid-uuid'
        });

        // Assert
        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.error).toBe('bad_request');
      });

      it('should return empty array when filtering by non-existent area_id', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        await createTestGrid(pool, disasterArea.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grids?area_id=00000000-0000-0000-0000-000000000000'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const grids = response.json();
        expect(grids).toHaveLength(0);
      });
    });
  });

  describe('PUT /grids/:id', () => {
    describe('Success Cases', () => {
      it('should update grid with valid data and return 200', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id, {
          code: 'ORIG-1',
          name: 'Original Grid'
        });

        const updatePayload = {
          name: 'Updated Grid Name',
          status: 'open',
          volunteer_needed: 30,
          description: 'Updated description'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.name).toBe(updatePayload.name);
        expect(updated.status).toBe(updatePayload.status);
        expect(updated.volunteer_needed).toBe(updatePayload.volunteer_needed);
        expect(updated.description).toBe(updatePayload.description);
        expect(updated.code).toBe('ORIG-1'); // Unchanged
        expect(updated.updated_at).not.toBe(grid.updated_at);
      });

      it('should support partial updates (only update provided fields)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id, {
          code: 'PARTIAL-1',
          name: 'Original Name',
          status: 'preparing',
          volunteer_needed: 10
        });

        const partialUpdate = {
          status: 'open' // Only update status
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: partialUpdate
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.status).toBe('open'); // Updated
        expect(updated.name).toBe('Original Name'); // Unchanged
        expect(updated.volunteer_needed).toBe(10); // Unchanged
      });

      it('should update bounds field with valid GeoJSON-like structure', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const updatePayload = {
          bounds: {
            north: 24.001,
            south: 23.999,
            east: 122.001,
            west: 121.999
          }
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.bounds).toEqual(updatePayload.bounds);
      });

      it('should update supplies_needed array', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const updatePayload = {
          supplies_needed: [
            { name: '清潔用具', quantity: 100, received: 45, unit: '組' },
            { name: '飲用水', quantity: 500, received: 320, unit: '瓶' },
            { name: '即食食品', quantity: 200, received: 150, unit: '份' }
          ]
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.supplies_needed).toEqual(updatePayload.supplies_needed);
      });

      it('should update volunteer counts', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id, {
          volunteer_needed: 10,
          volunteer_registered: 3
        });

        const updatePayload = {
          volunteer_needed: 25,
          volunteer_registered: 15
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.volunteer_needed).toBe(25);
        expect(updated.volunteer_registered).toBe(15);
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when status has invalid value', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          status: 'invalid_status' // Not in allowed enum
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when grid_type has invalid value', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_type: 'unknown_type'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when bounds format is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          bounds: { invalid: 'format' }
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when volunteer numbers are negative', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          volunteer_needed: -5
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when grid does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const updatePayload = {
          name: 'Updated Name'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: '/grids/00000000-0000-0000-0000-000000000000',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.message).toContain('Not found');
      });

      it('should return 400 when grid ID is not a valid UUID', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const updatePayload = {
          name: 'Updated Name'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: '/grids/invalid-uuid',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: updatePayload
        });

        // Assert
        expect([400, 404, 500]).toContain(response.statusCode);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const updatePayload = {
          name: 'Unauthorized Update'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const updatePayload = {
          name: 'Invalid Token Update'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: 'Bearer invalid_token_xyz'
          },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('DELETE /grids/:id', () => {
    describe('Success Cases', () => {
      it('should delete grid successfully and return 204', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe('');

        // Verify grid is deleted
        const checkResponse = await app.inject({
          method: 'GET',
          url: '/grids'
        });
        const grids = checkResponse.json();
        expect(grids.find((g: any) => g.id === grid.id)).toBeUndefined();
      });

      it('should cascade delete volunteer_registrations when grid is deleted', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create volunteer registrations
        const volunteer1 = await createTestUser(pool, { email: 'vol1@example.com' });
        const volunteer2 = await createTestUser(pool, { email: 'vol2@example.com' });
        await createTestVolunteerRegistration(pool, grid.id, volunteer1.id);
        await createTestVolunteerRegistration(pool, grid.id, volunteer2.id);

        // Verify registrations exist
        const { rows: beforeDelete } = await pool.query(
          'SELECT * FROM volunteer_registrations WHERE grid_id = $1',
          [grid.id]
        );
        expect(beforeDelete).toHaveLength(2);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(204);

        // Verify volunteer_registrations are cascade deleted
        const { rows: afterDelete } = await pool.query(
          'SELECT * FROM volunteer_registrations WHERE grid_id = $1',
          [grid.id]
        );
        expect(afterDelete).toHaveLength(0);
      });

      it('should cascade delete supply_donations when grid is deleted', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create supply donations
        await pool.query(
          `INSERT INTO supply_donations (id, grid_id, name, quantity, unit, donor_contact)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
          [grid.id, 'Water Bottles', 100, 'bottles', '0912345678']
        );
        await pool.query(
          `INSERT INTO supply_donations (id, grid_id, name, quantity, unit, donor_contact)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
          [grid.id, 'Cleaning Supplies', 50, 'sets', '0923456789']
        );

        // Verify donations exist
        const { rows: beforeDelete } = await pool.query(
          'SELECT * FROM supply_donations WHERE grid_id = $1',
          [grid.id]
        );
        expect(beforeDelete).toHaveLength(2);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(204);

        // Verify supply_donations are cascade deleted
        const { rows: afterDelete } = await pool.query(
          'SELECT * FROM supply_donations WHERE grid_id = $1',
          [grid.id]
        );
        expect(afterDelete).toHaveLength(0);
      });

      it('should cascade delete grid_discussions when grid is deleted', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create grid discussions
        await pool.query(
          `INSERT INTO grid_discussions (id, grid_id, user_id, content)
           VALUES (gen_random_uuid(), $1, $2, $3)`,
          [grid.id, testUser.id, 'Discussion message 1']
        );
        await pool.query(
          `INSERT INTO grid_discussions (id, grid_id, user_id, content)
           VALUES (gen_random_uuid(), $1, $2, $3)`,
          [grid.id, testUser.id, 'Discussion message 2']
        );

        // Verify discussions exist
        const { rows: beforeDelete } = await pool.query(
          'SELECT * FROM grid_discussions WHERE grid_id = $1',
          [grid.id]
        );
        expect(beforeDelete).toHaveLength(2);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(204);

        // Verify grid_discussions are cascade deleted
        const { rows: afterDelete } = await pool.query(
          'SELECT * FROM grid_discussions WHERE grid_id = $1',
          [grid.id]
        );
        expect(afterDelete).toHaveLength(0);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when grid does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/grids/00000000-0000-0000-0000-000000000000',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.message).toContain('Not found');
      });

      it('should return 400 when grid ID is not a valid UUID', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/grids/invalid-uuid',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect([400, 404, 500]).toContain(response.statusCode);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/grids/${grid.id}`,
          headers: {
            authorization: 'Bearer invalid_token_xyz'
          }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('Edge Cases & Security', () => {
    it('should handle concurrent updates correctly', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id, {
        volunteer_needed: 10
      });

      // Act - Send two concurrent update requests
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { volunteer_needed: 20 }
        }),
        app.inject({
          method: 'PUT',
          url: `/grids/${grid.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { volunteer_needed: 30 }
        })
      ]);

      // Assert - Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      // Verify final state (last write wins)
      const finalResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });
      const grids = finalResponse.json();
      const updatedGrid = grids.find((g: any) => g.id === grid.id);
      expect([20, 30]).toContain(updatedGrid.volunteer_needed);
    });

    it('should sanitize input to prevent SQL injection', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);

      const maliciousPayload = {
        code: "A-1'; DROP TABLE grids; --",
        name: "Test Grid",
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: maliciousPayload
      });

      // Assert - Should create successfully with sanitized input
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.code).toBe(maliciousPayload.code);

      // Verify grids table still exists
      const checkResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });
      expect(checkResponse.statusCode).toBe(200);
    });

    it('should handle very long text fields', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);

      const longDescription = 'A'.repeat(10000);
      const payload = {
        code: 'LONG-1',
        name: 'Grid with Long Description',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5,
        description: longDescription
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload
      });

      // Assert
      expect([201, 400]).toContain(response.statusCode);

      if (response.statusCode === 201) {
        const created = response.json();
        expect(created.description).toBe(longDescription);
      }
    });

    it('should handle Unicode characters in text fields', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);

      const payload = {
        code: '中文-1',
        name: '光復市區清淤區 🚜',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5,
        description: '這是中文描述 with émojis 🌟 and spëcial çhars'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.code).toBe(payload.code);
      expect(created.name).toBe(payload.name);
      expect(created.description).toBe(payload.description);
    });
  });
});
