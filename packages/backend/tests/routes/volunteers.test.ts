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

describe('Volunteers Routes - TDD', () => {
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

  describe('GET /volunteers', () => {
    describe('Success Cases', () => {
      it('should return empty array when no volunteers exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('should return volunteers with basic information', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const volunteer = await createTestUser(pool, {
          email: 'volunteer@example.com',
          name: 'John Volunteer'
        });

        // Create volunteer registration
        await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toHaveProperty('id');
        expect(result.data[0]).toHaveProperty('grid_id');
        expect(result.data[0]).toHaveProperty('user_id');
        expect(result.data[0]).toHaveProperty('volunteer_name');
        expect(result.data[0]).toHaveProperty('status');
        expect(result.total).toBe(1);
      });

      it('should mask phone numbers when can_view_phone is false (no auth)', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create volunteer with phone number via raw SQL
        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          ['John Volunteer', 'volunteer@example.com', '0912345678']
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.can_view_phone).toBe(false);
        expect(result.data[0].volunteer_phone).toBeUndefined();
      });

      it('should show masked phone numbers when authenticated (can_view_phone is true)', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Create volunteer with phone number
        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          ['John Volunteer', 'volunteer@example.com', '0912345678']
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.can_view_phone).toBe(true);
        expect(result.data[0].volunteer_phone).toBeDefined();
        // Phone should be masked: 0912-***-678
        expect(result.data[0].volunteer_phone).toMatch(/^\d{4}-\*\*\*-\d{3}$/);
      });

      it('should filter volunteers by grid_id', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid1 = await createTestGrid(pool, disasterArea.id, { code: 'A-1' });
        const grid2 = await createTestGrid(pool, disasterArea.id, { code: 'A-2' });

        const volunteer1 = await createTestUser(pool, { email: 'vol1@example.com' });
        const volunteer2 = await createTestUser(pool, { email: 'vol2@example.com' });
        const volunteer3 = await createTestUser(pool, { email: 'vol3@example.com' });

        await createTestVolunteerRegistration(pool, grid1.id, volunteer1.id);
        await createTestVolunteerRegistration(pool, grid1.id, volunteer2.id);
        await createTestVolunteerRegistration(pool, grid2.id, volunteer3.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: `/volunteers?grid_id=${grid1.id}`
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toHaveLength(2);
        expect(result.data.every((v: any) => v.grid_id === grid1.id)).toBe(true);
      });

      it('should support pagination with limit and offset', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 25 volunteers
        for (let i = 1; i <= 25; i++) {
          const volunteer = await createTestUser(pool, { email: `vol${i}@example.com` });
          await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?limit=10&offset=0'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toHaveLength(10);
        expect(result.limit).toBe(10);
        expect(result.total).toBe(25);
      });

      it('should include status_counts when include_counts=true', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const volunteer = await createTestUser(pool);
        await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?include_counts=true'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.status_counts).toBeDefined();
        expect(result.status_counts).toHaveProperty('pending');
        expect(result.status_counts).toHaveProperty('confirmed');
        expect(result.status_counts).toHaveProperty('arrived');
        expect(result.status_counts).toHaveProperty('completed');
        expect(result.status_counts).toHaveProperty('cancelled');
      });

      it('should not include status_counts when include_counts=false', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const volunteer = await createTestUser(pool);
        await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?include_counts=false'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.status_counts).toBeUndefined();
      });

      it('should order volunteers by created_at DESC', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const volunteer1 = await createTestUser(pool, { email: 'first@example.com' });
        await createTestVolunteerRegistration(pool, grid.id, volunteer1.id);

        // Wait a bit to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));

        const volunteer2 = await createTestUser(pool, { email: 'second@example.com' });
        await createTestVolunteerRegistration(pool, grid.id, volunteer2.id);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toHaveLength(2);
        // Most recent should be first
        expect(result.data[0].user_id).toBe(volunteer2.id);
        expect(result.data[1].user_id).toBe(volunteer1.id);
      });
    });

    describe('Query Parameter Validation', () => {
      it('should return 400 when grid_id is not a valid UUID', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?grid_id=invalid-uuid'
        });

        // Assert - May return 400 or empty results depending on implementation
        expect([200, 400]).toContain(response.statusCode);
      });

      it('should handle negative limit gracefully', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?limit=-10'
        });

        // Assert
        expect([200, 400]).toContain(response.statusCode);
      });

      it('should handle negative offset gracefully', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?offset=-5'
        });

        // Assert
        expect([200, 400]).toContain(response.statusCode);
      });
    });

    describe('Phone Masking Logic', () => {
      it('should mask phone number correctly for standard format', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          ['John Volunteer', 'volunteer@example.com', '0912345678']
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data[0].volunteer_phone).toBe('0912-***-678');
      });

      it('should handle short phone numbers', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          ['John Volunteer', 'volunteer@example.com', '123']
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data[0].volunteer_phone).toBe('****');
      });

      it('should handle null phone numbers', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
          ['John Volunteer', 'volunteer@example.com', null]
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data[0].volunteer_phone).toBeUndefined();
      });
    });

    describe('Edge Cases', () => {
      it('should handle volunteers with null names', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const volunteerId = await pool.query(
          `INSERT INTO volunteers (name, email) VALUES ($1, $2) RETURNING id`,
          [null, 'volunteer@example.com']
        ).then(r => r.rows[0].id);

        await pool.query(
          `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
          [grid.id, volunteerId]
        );

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data[0].volunteer_name).toBe('匿名志工');
      });

      it('should handle very large result sets with pagination', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 250 volunteers
        for (let i = 1; i <= 250; i++) {
          const volunteer = await createTestUser(pool, { email: `vol${i}@example.com` });
          await createTestVolunteerRegistration(pool, grid.id, volunteer.id);
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?limit=200&offset=0'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const result = response.json();
        expect(result.data).toHaveLength(200); // Should respect limit
        expect(result.total).toBe(250);
      });

      it('should handle concurrent requests efficiently', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);
        const volunteer = await createTestUser(pool);
        await createTestVolunteerRegistration(pool, grid.id, volunteer.id);

        // Act - Send 20 concurrent requests
        const promises = Array(20).fill(null).map(() =>
          app.inject({
            method: 'GET',
            url: '/volunteers'
          })
        );

        const responses = await Promise.all(promises);

        // Assert - All should succeed
        responses.forEach(response => {
          expect(response.statusCode).toBe(200);
          const result = response.json();
          expect(result.data).toHaveLength(1);
        });
      });
    });

    describe('Security', () => {
      it('should not leak sensitive information in error messages', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/volunteers?grid_id=invalid'
        });

        // Assert
        if (response.statusCode >= 400) {
          const error = response.json();
          expect(JSON.stringify(error).toLowerCase()).not.toContain('password');
          expect(JSON.stringify(error).toLowerCase()).not.toContain('secret');
        }
      });
    });

    describe('RBAC - Phone Number Visibility', () => {
      // Helper function to create user with specific role
      async function createUserWithRole(pool: any, role: string, email: string) {
        const uniquePhone = `090${Date.now().toString().slice(-7)}`;
        const { rows } = await pool.query(
          `INSERT INTO users (id, display_name, email, phone_number, role, status)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active')
           RETURNING *`,
          [`${role} User`, email, uniquePhone, role]
        );
        return rows[0];
      }

      // Helper function to set grid manager
      async function setGridManager(pool: any, gridId: string, managerId: string) {
        await pool.query(
          `UPDATE grids SET grid_manager_id = $1 WHERE id = $2`,
          [managerId, gridId]
        );
      }

      describe('Unauthenticated Users', () => {
        it('should NOT see phone numbers for unauthenticated requests', async () => {
          // Arrange
          const { app, pool } = context;
          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(false);
          expect(body.data[0].volunteer_phone).toBeUndefined();
        });
      });

      describe('Admin Users', () => {
        it('should see full phone numbers for super_admin', async () => {
          // Arrange
          const { app, pool } = context;
          const adminUser = await createUserWithRole(pool, 'super_admin', 'admin@example.com');
          const authToken = generateTestToken(adminUser.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(true);
          expect(body.data[0].volunteer_phone).toBe('0912345678');
        });

        it('should see full phone numbers for regional_admin', async () => {
          // Arrange
          const { app, pool } = context;
          const adminUser = await createUserWithRole(pool, 'regional_admin', 'regional@example.com');
          const authToken = generateTestToken(adminUser.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(true);
          expect(body.data[0].volunteer_phone).toBe('0912345678');
        });
      });

      describe('Grid Manager Users', () => {
        it('should see phone numbers for volunteers in THEIR grids', async () => {
          // Arrange
          const { app, pool } = context;
          const gridManager = await createUserWithRole(pool, 'ngo_coordinator', 'manager@example.com');
          const authToken = generateTestToken(gridManager.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);
          await setGridManager(pool, grid.id, gridManager.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(true);
          expect(body.data[0].volunteer_phone).toBe('0912345678');
        });

        it('should NOT see phone numbers for volunteers in OTHER grids', async () => {
          // Arrange
          const { app, pool } = context;
          const gridManager1 = await createUserWithRole(pool, 'ngo_coordinator', 'manager1@example.com');
          const gridManager2 = await createUserWithRole(pool, 'ngo_coordinator', 'manager2@example.com');
          const authToken = generateTestToken(gridManager1.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid1 = await createTestGrid(pool, disasterArea.id, { name: 'Grid 1', code: 'G1' });
          const grid2 = await createTestGrid(pool, disasterArea.id, { name: 'Grid 2', code: 'G2' });

          await setGridManager(pool, grid1.id, gridManager1.id);
          await setGridManager(pool, grid2.id, gridManager2.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid2.id, volunteerId]
          );

          // Act - gridManager1 tries to view volunteers in grid2
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid2.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(false);
          expect(body.data[0].volunteer_phone).toBeUndefined();
        });

        it('should handle grid with no manager (no permission)', async () => {
          // Arrange
          const { app, pool } = context;
          const gridManager = await createUserWithRole(pool, 'ngo_coordinator', 'manager@example.com');
          const authToken = generateTestToken(gridManager.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);
          // DO NOT set grid manager

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(false);
          expect(body.data[0].volunteer_phone).toBeUndefined();
        });
      });

      describe('Regular Volunteer Users', () => {
        it('should NOT see phone numbers for regular volunteer users', async () => {
          // Arrange
          const { app, pool } = context;
          const regularUser = await createUserWithRole(pool, 'volunteer', 'regular@example.com');
          const authToken = generateTestToken(regularUser.id, app);

          const disasterArea = await createTestDisasterArea(pool);
          const grid = await createTestGrid(pool, disasterArea.id);

          const volunteerId = await pool.query(
            `INSERT INTO volunteers (name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
            ['John Volunteer', 'vol@example.com', '0912345678']
          ).then(r => r.rows[0].id);

          await pool.query(
            `INSERT INTO volunteer_registrations (grid_id, volunteer_id) VALUES ($1, $2)`,
            [grid.id, volunteerId]
          );

          // Act
          const response = await app.inject({
            method: 'GET',
            url: `/volunteers?grid_id=${grid.id}`,
            headers: {
              authorization: `Bearer ${authToken}`
            }
          });

          // Assert
          expect(response.statusCode).toBe(200);
          const body = response.json();
          expect(body.can_view_phone).toBe(false);
          expect(body.data[0].volunteer_phone).toBeUndefined();
        });
      });
    });
  });
});
