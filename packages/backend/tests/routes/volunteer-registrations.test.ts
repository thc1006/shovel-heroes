import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
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

describe('Volunteer Registrations CRUD - TDD', () => {
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

  describe('POST /volunteer-registrations', () => {
    describe('Success Cases', () => {
      it('should create volunteer registration with valid data and return 201', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.grid_id).toBe(grid.id);
        expect(created.volunteer_id).toBe(volunteer.id);
        expect(created.status).toBe('pending'); // Default status
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
      });

      it('should allow user to register themselves as volunteer', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          volunteer_id: volunteer.id // Registering themselves
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.volunteer_id).toBe(volunteer.id);
      });

      it('should allow multiple volunteers to register for same grid', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer1 = await createTestUser(pool, { email: 'volunteer1@example.com' });
        const volunteer2 = await createTestUser(pool, { email: 'volunteer2@example.com' });
        const authToken1 = generateTestToken(volunteer1.id, app);
        const authToken2 = generateTestToken(volunteer2.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Act
        const response1 = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: { authorization: `Bearer ${authToken1}` },
          payload: {
            grid_id: grid.id,
            volunteer_id: volunteer1.id
          }
        });

        const response2 = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: { authorization: `Bearer ${authToken2}` },
          payload: {
            grid_id: grid.id,
            volunteer_id: volunteer2.id
          }
        });

        // Assert
        expect(response1.statusCode).toBe(201);
        expect(response2.statusCode).toBe(201);
        const reg1 = response1.json();
        const reg2 = response2.json();
        expect(reg1.volunteer_id).toBe(volunteer1.id);
        expect(reg2.volunteer_id).toBe(volunteer2.id);
        expect(reg1.grid_id).toBe(grid.id);
        expect(reg2.grid_id).toBe(grid.id);
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when grid_id is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
        const error = response.json();
        expect(error.message).toContain('Invalid payload');
      });

      it('should return 400 when volunteer_id is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when grid_id is not a valid UUID', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const volunteer = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          grid_id: 'invalid-uuid',
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when volunteer_id is not a valid UUID', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          volunteer_id: 'invalid-uuid'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should handle non-existent grid_id', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const volunteer = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          grid_id: '00000000-0000-0000-0000-000000000000',
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert - May return 404 or 500 depending on FK constraint
        expect([400, 404, 500]).toContain(response.statusCode);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          volunteer_id: volunteer.id
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: {
            authorization: 'Bearer invalid_token_xyz'
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('GET /volunteer-registrations', () => {
    describe('Success Cases', () => {
      it('should return empty array when no registrations exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteer-registrations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const registrations = response.json();
        expect(Array.isArray(registrations)).toBe(true);
        expect(registrations).toHaveLength(0);
      });

      it('should return all registrations without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 3 registrations
        for (let i = 1; i <= 3; i++) {
          const volunteer = await createTestUser(pool, { email: `vol${i}@example.com` });
          await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteer-registrations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const registrations = response.json();
        expect(registrations).toHaveLength(3);
        expect(registrations[0]).toHaveProperty('id');
        expect(registrations[0]).toHaveProperty('grid_id');
        expect(registrations[0]).toHaveProperty('volunteer_id');
        expect(registrations[0]).toHaveProperty('status');
        expect(registrations[0]).toHaveProperty('created_at');
      });

      it('should order registrations by created_at DESC', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const volunteer1 = await createTestUser(pool, { email: 'first@example.com' });
        await createTestVolunteerRegistration(pool, grid.id, volunteer1.id);

        await new Promise(resolve => setTimeout(resolve, 10));

        const volunteer2 = await createTestUser(pool, { email: 'second@example.com' });
        await createTestVolunteerRegistration(pool, grid.id, volunteer2.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteer-registrations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const registrations = response.json();
        expect(registrations).toHaveLength(2);
        // Most recent should be first
        expect(registrations[0].volunteer_id).toBe(volunteer2.id);
        expect(registrations[1].volunteer_id).toBe(volunteer1.id);
      });

      it('should limit results to 200 registrations', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 205 registrations directly in DB
        for (let i = 1; i <= 205; i++) {
          const volunteer = await createTestUser(pool, { email: `vol${i}@example.com` });
          await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteer-registrations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const registrations = response.json();
        expect(registrations).toHaveLength(200); // Should limit to 200
      });
    });
  });

  describe('PUT /volunteer-registrations/:id', () => {
    describe('Success Cases', () => {
      it('should update registration status and return 200', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        const updatePayload = {
          status: 'confirmed'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.status).toBe('confirmed');
      });

      it('should allow volunteer to update their own registration', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { status: 'cancelled' }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.status).toBe('cancelled');
        expect(updated.volunteer_id).toBe(volunteer.id);
      });

      it('should support all valid status transitions', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool);
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const statuses = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];

        // Act & Assert
        for (const status of statuses) {
          const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

          const response = await app.inject({
            method: 'PUT',
            url: `/volunteer-registrations/${registration.id}`,
            headers: { authorization: `Bearer ${authToken}` },
            payload: { status }
          });

          expect(response.statusCode).toBe(200);
          const updated = response.json();
          expect(updated.status).toBe(status);
        }
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when status has invalid value', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool);
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        const invalidPayload = {
          status: 'invalid_status'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when registration does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const updatePayload = {
          status: 'confirmed'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: '/volunteer-registrations/00000000-0000-0000-0000-000000000000',
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(404);
        const error = response.json();
        expect(error.message).toContain('Not found');
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: '/volunteer-registrations/00000000-0000-0000-0000-000000000000',
          payload: { status: 'confirmed' }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should prevent user from updating other volunteers registrations', async () => {
        // Arrange - This test assumes RLS is working
        const { app, pool } = context;
        const volunteer1 = await createTestUser(pool, { email: 'volunteer1@example.com' });
        const volunteer2 = await createTestUser(pool, { email: 'volunteer2@example.com' });
        const authToken2 = generateTestToken(volunteer2.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create registration for volunteer1
        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer1.id);

        // Act - Try to update volunteer1's registration as volunteer2
        const response = await app.inject({
          method: 'PUT',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken2}` },
          payload: { status: 'cancelled' }
        });

        // Assert - Should be forbidden or not found (due to RLS)
        expect([403, 404]).toContain(response.statusCode);
      });
    });
  });

  describe('DELETE /volunteer-registrations/:id', () => {
    describe('Success Cases', () => {
      it('should delete registration successfully and return 204', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` }
        });

        // Assert
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe('');

        // Verify registration is deleted
        const checkResponse = await app.inject({
          method: 'GET',
          url: '/volunteer-registrations'
        });
        const registrations = checkResponse.json();
        expect(registrations.find((r: any) => r.id === registration.id)).toBeUndefined();
      });

      it('should allow volunteer to cancel their own registration', async () => {
        // Arrange
        const { app, pool } = context;
        const volunteer = await createTestUser(pool, { email: 'volunteer@example.com' });
        const authToken = generateTestToken(volunteer.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` }
        });

        // Assert
        expect(response.statusCode).toBe(204);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when registration does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/volunteer-registrations/00000000-0000-0000-0000-000000000000',
          headers: { authorization: `Bearer ${authToken}` }
        });

        // Assert
        expect(response.statusCode).toBe(404);
      });
    });

    describe('Authentication & Authorization', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/volunteer-registrations/00000000-0000-0000-0000-000000000000'
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should prevent user from deleting other volunteers registrations', async () => {
        // Arrange - This test assumes RLS is working
        const { app, pool } = context;
        const volunteer1 = await createTestUser(pool, { email: 'volunteer1@example.com' });
        const volunteer2 = await createTestUser(pool, { email: 'volunteer2@example.com' });
        const authToken2 = generateTestToken(volunteer2.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create registration for volunteer1
        const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer1.id);

        // Act - Try to delete volunteer1's registration as volunteer2
        const response = await app.inject({
          method: 'DELETE',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken2}` }
        });

        // Assert - Should be forbidden or not found (due to RLS)
        expect([403, 404]).toContain(response.statusCode);
      });
    });
  });

  describe('Edge Cases & Security', () => {
    it('should handle concurrent registrations for same volunteer', async () => {
      // Arrange
      const { app, pool } = context;
      const volunteer = await createTestUser(pool);
      const authToken = generateTestToken(volunteer.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid1 = await createTestGrid(pool, disasterArea.id, { code: 'A-1' });
      const grid2 = await createTestGrid(pool, disasterArea.id, { code: 'A-2' });

      // Act - Register for two grids concurrently
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid1.id,
            volunteer_id: volunteer.id
          }
        }),
        app.inject({
          method: 'POST',
          url: '/volunteer-registrations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid2.id,
            volunteer_id: volunteer.id
          }
        })
      ]);

      // Assert - Both should succeed
      expect(response1.statusCode).toBe(201);
      expect(response2.statusCode).toBe(201);
    });

    it('should handle duplicate registration attempts', async () => {
      // Arrange
      const { app, pool } = context;
      const volunteer = await createTestUser(pool);
      const authToken = generateTestToken(volunteer.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      // Create first registration
      const response1 = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          grid_id: grid.id,
          volunteer_id: volunteer.id
        }
      });

      expect(response1.statusCode).toBe(201);

      // Try to register again for same grid
      const response2 = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          grid_id: grid.id,
          volunteer_id: volunteer.id
        }
      });

      // Assert - May allow duplicate or return conflict
      expect([201, 409, 500]).toContain(response2.statusCode);
    });

    it('should handle rapid status updates', async () => {
      // Arrange
      const { app, pool } = context;
      const volunteer = await createTestUser(pool);
      const authToken = generateTestToken(volunteer.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const registration = await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

      // Act - Send multiple concurrent status updates
      const statuses = ['confirmed', 'arrived', 'completed'];
      const promises = statuses.map(status =>
        app.inject({
          method: 'PUT',
          url: `/volunteer-registrations/${registration.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { status }
        })
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed (last write wins)
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    it('should validate UUID format in URL parameters', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      // Act
      const response = await app.inject({
        method: 'PUT',
        url: '/volunteer-registrations/invalid-uuid',
        headers: { authorization: `Bearer ${authToken}` },
        payload: { status: 'confirmed' }
      });

      // Assert
      expect([400, 404, 500]).toContain(response.statusCode);
    });
  });
});
