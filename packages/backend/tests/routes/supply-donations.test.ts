import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  cleanDatabase,
  generateTestToken,
  createTestUser,
  createTestDisasterArea,
  createTestGrid,
  type TestContext
} from '../helpers.js';

describe('Supply Donations CRUD - TDD', () => {
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

  describe('POST /supply-donations', () => {
    describe('Success Cases', () => {
      it('should create supply donation with valid data and return 201', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water Bottles',
          quantity: 100,
          unit: 'bottles',
          donor_contact: '0912345678'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.grid_id).toBe(grid.id);
        expect(created.donor_name).toBe('John Doe');
        expect(created.item_type).toBe('Water Bottles');
        expect(created.quantity).toBe(100);
        expect(created.unit).toBe('bottles');
        expect(created.status).toBe('pledged');
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
      });

      it('should create supply donation without optional donor_contact', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          donor_name: 'Anonymous Donor',
          item_type: 'Blankets',
          quantity: 50,
          unit: 'pieces'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.donor_contact).toBeNull();
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when grid_id is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
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

      it('should return 400 when grid_id is not a valid UUID', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          grid_id: 'invalid-uuid',
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when donor_name is empty', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          donor_name: '',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when quantity is negative', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: -10,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when quantity is zero', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 0,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when quantity is not an integer', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 10.5,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
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
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/supply-donations',
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

  describe('GET /supply-donations', () => {
    describe('Success Cases', () => {
      it('should return empty array when no supply donations exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const donations = response.json();
        expect(Array.isArray(donations)).toBe(true);
        expect(donations).toHaveLength(0);
      });

      it('should return all supply donations without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 3 supply donations
        for (let i = 1; i <= 3; i++) {
          await app.inject({
            method: 'POST',
            url: '/supply-donations',
            headers: { authorization: `Bearer ${authToken}` },
            payload: {
              grid_id: grid.id,
              donor_name: `Donor ${i}`,
              item_type: `Item ${i}`,
              quantity: i * 10,
              unit: 'units'
            }
          });
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const donations = response.json();
        expect(donations).toHaveLength(3);
        expect(donations[0]).toHaveProperty('id');
        expect(donations[0]).toHaveProperty('grid_id');
        expect(donations[0]).toHaveProperty('donor_name');
        expect(donations[0]).toHaveProperty('item_type');
        expect(donations[0]).toHaveProperty('quantity');
        expect(donations[0]).toHaveProperty('unit');
        expect(donations[0]).toHaveProperty('status');
      });

      it('should order donations by created_at DESC', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'First Donor',
            item_type: 'First Item',
            quantity: 10,
            unit: 'units'
          }
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'Second Donor',
            item_type: 'Second Item',
            quantity: 20,
            unit: 'units'
          }
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const donations = response.json();
        expect(donations).toHaveLength(2);
        expect(donations[0].donor_name).toBe('Second Donor'); // Most recent first
        expect(donations[1].donor_name).toBe('First Donor');
      });

      it('should limit results to 200 donations', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 205 donations directly in DB for speed
        for (let i = 1; i <= 205; i++) {
          await pool.query(
            `INSERT INTO supply_donations (id, grid_id, donor_name, item_type, quantity, unit, status)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6)`,
            [grid.id, `Donor ${i}`, `Item ${i}`, i, 'units', 'pledged']
          );
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const donations = response.json();
        expect(donations).toHaveLength(200); // Should limit to 200
      });
    });
  });

  describe('PUT /supply-donations/:id', () => {
    describe('Success Cases', () => {
      it('should update supply donation status and return 200', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();
        const updatePayload = {
          status: 'confirmed'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.status).toBe('confirmed');
        expect(updated.donor_name).toBe('John Doe'); // Unchanged
      });

      it('should update quantity and notes', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();
        const updatePayload = {
          quantity: 150,
          notes: 'Increased donation amount'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.quantity).toBe(150);
        expect(updated.notes).toBe('Increased donation amount');
      });

      it('should support partial updates', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();
        const updatePayload = {
          status: 'delivered' // Only update status
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.status).toBe('delivered');
        expect(updated.quantity).toBe(100); // Unchanged
        expect(updated.donor_name).toBe('John Doe'); // Unchanged
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

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();
        const invalidPayload = {
          status: 'invalid_status'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when quantity is negative', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();
        const invalidPayload = {
          quantity: -10
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when supply donation does not exist', async () => {
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
          url: '/supply-donations/00000000-0000-0000-0000-000000000000',
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
          url: '/supply-donations/00000000-0000-0000-0000-000000000000',
          payload: { status: 'confirmed' }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('DELETE /supply-donations/:id', () => {
    describe('Success Cases', () => {
      it('should delete supply donation successfully and return 204', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/supply-donations',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            donor_name: 'John Doe',
            item_type: 'Water',
            quantity: 100,
            unit: 'bottles'
          }
        });

        const donation = createResponse.json();

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` }
        });

        // Assert
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe('');

        // Verify donation is deleted
        const checkResponse = await app.inject({
          method: 'GET',
          url: '/supply-donations'
        });
        const donations = checkResponse.json();
        expect(donations.find((d: any) => d.id === donation.id)).toBeUndefined();
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when supply donation does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/supply-donations/00000000-0000-0000-0000-000000000000',
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
          url: '/supply-donations/00000000-0000-0000-0000-000000000000'
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
      const grid = await createTestGrid(pool, disasterArea.id);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/supply-donations',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          grid_id: grid.id,
          donor_name: 'John Doe',
          item_type: 'Water',
          quantity: 100,
          unit: 'bottles'
        }
      });

      const donation = createResponse.json();

      // Act - Send two concurrent update requests
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { quantity: 150 }
        }),
        app.inject({
          method: 'PUT',
          url: `/supply-donations/${donation.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { quantity: 200 }
        })
      ]);

      // Assert - Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);

      // Verify final state (last write wins)
      const finalResponse = await app.inject({
        method: 'GET',
        url: '/supply-donations'
      });
      const donations = finalResponse.json();
      const updatedDonation = donations.find((d: any) => d.id === donation.id);
      expect([150, 200]).toContain(updatedDonation.quantity);
    });

    it('should handle Unicode characters in text fields', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const payload = {
        grid_id: grid.id,
        donor_name: '王小明 🎁',
        item_type: '飲用水 💧',
        quantity: 100,
        unit: '瓶',
        donor_contact: '0912-345-678'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/supply-donations',
        headers: { authorization: `Bearer ${authToken}` },
        payload
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.donor_name).toBe('王小明 🎁');
      expect(created.item_type).toBe('飲用水 💧');
      expect(created.unit).toBe('瓶');
    });

    it('should sanitize SQL injection attempts', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const maliciousPayload = {
        grid_id: grid.id,
        donor_name: "'; DROP TABLE supply_donations; --",
        item_type: 'Water',
        quantity: 100,
        unit: 'bottles'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/supply-donations',
        headers: { authorization: `Bearer ${authToken}` },
        payload: maliciousPayload
      });

      // Assert - Should create successfully with sanitized input
      expect(response.statusCode).toBe(201);

      // Verify supply_donations table still exists
      const checkResponse = await app.inject({
        method: 'GET',
        url: '/supply-donations'
      });
      expect(checkResponse.statusCode).toBe(200);
    });
  });
});
