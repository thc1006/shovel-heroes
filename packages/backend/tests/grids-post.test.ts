import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { registerGrids } from '../src/routes/grids.js';
import { withConn } from '../src/lib/db.js';

describe('POST /grids', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let createdGridId: string;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Register JWT
    await app.register(jwt, { secret: 'test-secret-key' });

    // Auth decorator
    app.decorate('auth', async (req: any, reply: any) => {
      try {
        await req.jwtVerify();
      } catch (err) {
        return reply.code(401).send({ message: 'Unauthorized' });
      }
    });

    // Register grids routes
    registerGrids(app);
    await app.ready();

    // Create test user in database
    const userId = await withConn(async (c) => {
      const { rows } = await c.query(
        'INSERT INTO users (phone, display_name) VALUES ($1, $2) RETURNING id',
        [`test-${Date.now()}`, 'Test User']
      );
      return rows[0].id;
    });
    testUserId = userId;

    // Generate JWT token
    authToken = app.jwt.sign({ sub: testUserId });
  });

  afterAll(async () => {
    // Cleanup
    if (createdGridId) {
      await withConn(async (c) => {
        await c.query('DELETE FROM grids WHERE id = $1', [createdGridId]);
      });
    }
    if (testUserId) {
      await withConn(async (c) => {
        await c.query('DELETE FROM users WHERE id = $1', [testUserId]);
      });
    }
    await app.close();
  });

  it('should create a new grid with valid data', async () => {
    const uniqueCode = `TEST-${Date.now()}`;
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: uniqueCode,
        name: 'Test Grid',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5,
        volunteer_needed: 10,
        bounds: {
          north: 23.51,
          south: 23.49,
          east: 121.51,
          west: 121.49
        },
        meeting_point: 'Test Meeting Point',
        description: 'Test description'
      }
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('id');
    expect(data.code).toBe(uniqueCode);
    expect(data.name).toBe('Test Grid');
    expect(data.grid_type).toBe('manpower');
    expect(data.center_lat).toBe(23.5);
    expect(data.center_lng).toBe(121.5);
    expect(data.volunteer_needed).toBe(10);
    expect(data.status).toBe('open');

    createdGridId = data.id;
  });

  it('should return 400 for missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: 'TEST-INVALID',
        // Missing name, grid_type, center_lat, center_lng
      }
    });

    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.body);
    expect(data).toHaveProperty('message', 'Invalid payload');
    expect(data).toHaveProperty('issues');
  });

  it('should return 400 for invalid grid_type', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: 'TEST-INVALID-TYPE',
        name: 'Test Grid',
        grid_type: 'invalid_type',
        center_lat: 23.5,
        center_lng: 121.5
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 400 for invalid coordinates', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: 'TEST-INVALID-COORDS',
        name: 'Test Grid',
        grid_type: 'manpower',
        center_lat: 100, // Invalid: > 90
        center_lng: 200  // Invalid: > 180
      }
    });

    expect(response.statusCode).toBe(400);
  });

  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      payload: {
        code: 'TEST-UNAUTH',
        name: 'Test Grid',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 409 for duplicate code', async () => {
    const duplicateCode = `DUP-${Date.now()}`;

    // First create a grid
    const firstResponse = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: duplicateCode,
        name: 'First Grid',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5
      }
    });

    expect(firstResponse.statusCode).toBe(201);
    const firstData = JSON.parse(firstResponse.body);

    // Try to create another grid with same code
    const duplicateResponse = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: duplicateCode,
        name: 'Duplicate Grid',
        grid_type: 'supply_storage',
        center_lat: 24.5,
        center_lng: 120.5
      }
    });

    expect(duplicateResponse.statusCode).toBe(409);
    const duplicateData = JSON.parse(duplicateResponse.body);
    expect(duplicateData).toHaveProperty('message', 'Grid code already exists');

    // Cleanup the first grid
    await withConn(async (c) => {
      await c.query('DELETE FROM grids WHERE id = $1', [firstData.id]);
    });
  });

  it('should use default values correctly', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/grids',
      headers: {
        authorization: `Bearer ${authToken}`
      },
      payload: {
        code: `DEFAULT-${Date.now()}`,
        name: 'Test Grid',
        grid_type: 'manpower',
        center_lat: 23.5,
        center_lng: 121.5
        // Not providing: volunteer_needed, volunteer_registered, status
      }
    });

    expect(response.statusCode).toBe(201);
    const data = JSON.parse(response.body);
    expect(data.volunteer_needed).toBe(0);
    expect(data.volunteer_registered).toBe(0);
    expect(data.status).toBe('open');

    // Cleanup
    await withConn(async (c) => {
      await c.query('DELETE FROM grids WHERE id = $1', [data.id]);
    });
  });
});
