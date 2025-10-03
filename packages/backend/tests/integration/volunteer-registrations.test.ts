import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, generateTestToken, TestContext } from '../helpers.js';
import { randomUUID } from 'crypto';

describe('PUT /volunteer-registrations/:id - Status Updates', () => {
  let context: TestContext;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let volunteerId: string;
  let gridId: string;
  let registrationId: string;

  beforeAll(async () => {
    context = await createTestApp();

    // Create test users
    userId = randomUUID();
    adminId = randomUUID();

    // Insert test users
    await context.pool.query(
      'INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3), ($4, $5, $6)',
      [userId, 'user@test.com', 'Test User', adminId, 'admin@test.com', 'Admin User']
    );

    // Generate tokens
    userToken = generateTestToken(userId, context.app);
    adminToken = generateTestToken(adminId, context.app);

    // Create a test volunteer for the user
    const volunteerResult = await context.pool.query(
      'INSERT INTO volunteers (user_id, name, email) VALUES ($1, $2, $3) RETURNING id',
      [userId, 'Test Volunteer', 'volunteer@test.com']
    );
    volunteerId = volunteerResult.rows[0].id;

    // Create a test grid (using center_lat/center_lng columns)
    const gridResult = await context.pool.query(
      'INSERT INTO grids (name, center_lat, center_lng) VALUES ($1, $2, $3) RETURNING id',
      ['Test Grid', 23.5, 121.5]
    );
    gridId = gridResult.rows[0].id;
  });

  afterAll(async () => {
    // Cleanup
    await context.pool.query('DELETE FROM volunteer_registrations WHERE grid_id = $1', [gridId]);
    await context.pool.query('DELETE FROM volunteers WHERE id = $1', [volunteerId]);
    await context.pool.query('DELETE FROM grids WHERE id = $1', [gridId]);
    await context.pool.query('DELETE FROM users WHERE id = ANY($1)', [[userId, adminId]]);
    await closeTestApp(context);
  });

  beforeEach(async () => {
    // Clean up registrations before each test
    await context.pool.query('DELETE FROM volunteer_registrations WHERE grid_id = $1', [gridId]);

    // Create a fresh registration for each test
    const regResult = await context.pool.query(
      'INSERT INTO volunteer_registrations (volunteer_id, grid_id, status) VALUES ($1, $2, $3) RETURNING id',
      [volunteerId, gridId, 'pending']
    );
    registrationId = regResult.rows[0].id;
  });

  describe('Authentication and Authorization', () => {
    it('should return 401 when no auth token provided', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 when trying to update non-existent registration', async () => {
      const fakeId = randomUUID();
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${fakeId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Not found or not authorized');
    });

    it('should return 404 when trying to update another user\'s registration', async () => {
      // Create another user's registration
      const otherUserId = randomUUID();
      await context.pool.query(
        'INSERT INTO users (id, email, display_name) VALUES ($1, $2, $3)',
        [otherUserId, 'other@test.com', 'Other User']
      );

      const otherVolunteerResult = await context.pool.query(
        'INSERT INTO volunteers (user_id, name, email) VALUES ($1, $2, $3) RETURNING id',
        [otherUserId, 'Other Volunteer', 'other.volunteer@test.com']
      );
      const otherVolunteerId = otherVolunteerResult.rows[0].id;

      const otherRegResult = await context.pool.query(
        'INSERT INTO volunteer_registrations (volunteer_id, grid_id, status) VALUES ($1, $2, $3) RETURNING id',
        [otherVolunteerId, gridId, 'pending']
      );
      const otherRegistrationId = otherRegResult.rows[0].id;

      // Try to update other user's registration with our token
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${otherRegistrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(404);

      // Cleanup
      await context.pool.query('DELETE FROM volunteer_registrations WHERE id = $1', [otherRegistrationId]);
      await context.pool.query('DELETE FROM volunteers WHERE id = $1', [otherVolunteerId]);
      await context.pool.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    });
  });

  describe('Validation', () => {
    it('should return 400 when status is missing', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid payload');
      expect(body.issues).toBeDefined();
    });

    it('should return 400 when status is invalid', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'invalid_status' }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid payload');
      expect(body.issues).toBeDefined();
    });
  });

  describe('Status Transitions - User (Owner)', () => {
    it('should allow user to update pending → confirmed', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('confirmed');
      expect(body.id).toBe(registrationId);
      expect(body.updated_at).toBeDefined();
    });

    it('should allow user to update confirmed → arrived', async () => {
      // First set to confirmed
      await context.pool.query(
        'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
        ['confirmed', registrationId]
      );

      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'arrived' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('arrived');
      expect(body.id).toBe(registrationId);
    });

    it('should allow user to update arrived → completed', async () => {
      // First set to arrived
      await context.pool.query(
        'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
        ['arrived', registrationId]
      );

      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'completed' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('completed');
      expect(body.id).toBe(registrationId);
    });

    it('should allow user to cancel from pending status', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'cancelled' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
      expect(body.id).toBe(registrationId);
    });

    it('should allow user to cancel from confirmed status', async () => {
      // First set to confirmed
      await context.pool.query(
        'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
        ['confirmed', registrationId]
      );

      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'cancelled' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
    });

    it('should allow user to cancel from arrived status', async () => {
      // First set to arrived
      await context.pool.query(
        'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
        ['arrived', registrationId]
      );

      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'cancelled' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
    });

    it('should allow user to cancel from completed status', async () => {
      // First set to completed
      await context.pool.query(
        'UPDATE volunteer_registrations SET status = $1 WHERE id = $2',
        ['completed', registrationId]
      );

      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'cancelled' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('cancelled');
    });
  });

  describe('Complete Status Flow', () => {
    it('should allow complete flow: pending → confirmed → arrived → completed', async () => {
      // pending → confirmed
      let response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).status).toBe('confirmed');

      // confirmed → arrived
      response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'arrived' }
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).status).toBe('arrived');

      // arrived → completed
      response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'completed' }
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).status).toBe('completed');
    });
  });

  describe('Updated Timestamp', () => {
    it('should update updated_at timestamp on status change', async () => {
      // Get original timestamp
      const beforeResult = await context.pool.query(
        'SELECT created_at, updated_at FROM volunteer_registrations WHERE id = $1',
        [registrationId]
      );
      const beforeUpdatedAt = beforeResult.rows[0].updated_at;

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Update status
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify updated_at changed
      const afterUpdatedAt = new Date(body.updated_at);
      const beforeDate = new Date(beforeUpdatedAt);
      expect(afterUpdatedAt.getTime()).toBeGreaterThan(beforeDate.getTime());
    });
  });

  describe('Response Format', () => {
    it('should return complete registration object on success', async () => {
      const response = await context.app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${userToken}` },
        payload: { status: 'confirmed' }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Verify all expected fields are present
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('volunteer_id');
      expect(body).toHaveProperty('grid_id');
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('created_at');
      expect(body).toHaveProperty('updated_at');

      // Verify values
      expect(body.id).toBe(registrationId);
      expect(body.volunteer_id).toBe(volunteerId);
      expect(body.grid_id).toBe(gridId);
      expect(body.status).toBe('confirmed');
    });
  });
});
