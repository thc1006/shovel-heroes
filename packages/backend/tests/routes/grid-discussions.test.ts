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

describe('Grid Discussions Routes - TDD', () => {
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

  describe('POST /grid-discussions', () => {
    describe('Success Cases', () => {
      it('should create grid discussion with valid data and return 201', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool, { email: 'user@example.com' });
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          content: 'This is a discussion message about the grid operations.'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.grid_id).toBe(grid.id);
        expect(created.user_id).toBe(testUser.id);
        expect(created.content).toBe('This is a discussion message about the grid operations.');
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
      });

      it('should associate discussion with authenticated user from JWT', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool, { email: 'author@example.com', name: 'John Doe' });
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const payload = {
          grid_id: grid.id,
          content: 'Testing user association'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.user_id).toBe(testUser.id);

        // Verify in database
        const { rows } = await pool.query(
          'SELECT user_id FROM grid_discussions WHERE id = $1',
          [created.id]
        );
        expect(rows[0].user_id).toBe(testUser.id);
      });

      it('should handle multiple discussions on same grid', async () => {
        // Arrange
        const { app, pool } = context;
        const user1 = await createTestUser(pool, { email: 'user1@example.com' });
        const user2 = await createTestUser(pool, { email: 'user2@example.com' });
        const authToken1 = generateTestToken(user1.id, app);
        const authToken2 = generateTestToken(user2.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Act - Create two discussions
        const response1 = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken1}` },
          payload: {
            grid_id: grid.id,
            content: 'First discussion message'
          }
        });

        const response2 = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken2}` },
          payload: {
            grid_id: grid.id,
            content: 'Second discussion message'
          }
        });

        // Assert
        expect(response1.statusCode).toBe(201);
        expect(response2.statusCode).toBe(201);
        const discussion1 = response1.json();
        const discussion2 = response2.json();
        expect(discussion1.user_id).toBe(user1.id);
        expect(discussion2.user_id).toBe(user2.id);
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when grid_id is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          content: 'Discussion without grid_id'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
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
          content: 'Discussion with invalid grid_id'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when content is missing', async () => {
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
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when content is empty string', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        const invalidPayload = {
          grid_id: grid.id,
          content: ''
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
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
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          grid_id: '00000000-0000-0000-0000-000000000000', // Non-existent UUID
          content: 'Discussion for non-existent grid'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert - May return 404 or 500 depending on FK constraint handling
        expect([400, 404, 500]).toContain(response.statusCode);
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
          content: 'Unauthorized discussion'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
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
          content: 'Invalid token discussion'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
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
        const { app, pool } = context;
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Generate an immediately expired token
        const expiredToken = app.jwt.sign(
          { userId: 'test-user', sub: 'test-user' },
          { expiresIn: '0s' }
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        const payload = {
          grid_id: grid.id,
          content: 'Expired token discussion'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: {
            authorization: `Bearer ${expiredToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('GET /grid-discussions', () => {
    describe('Success Cases', () => {
      it('should return empty array when no discussions exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const discussions = response.json();
        expect(Array.isArray(discussions)).toBe(true);
        expect(discussions).toHaveLength(0);
      });

      it('should return all grid discussions without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 3 discussions
        for (let i = 1; i <= 3; i++) {
          await app.inject({
            method: 'POST',
            url: '/grid-discussions',
            headers: { authorization: `Bearer ${authToken}` },
            payload: {
              grid_id: grid.id,
              content: `Discussion message ${i}`
            }
          });
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const discussions = response.json();
        expect(discussions).toHaveLength(3);
        expect(discussions[0]).toHaveProperty('id');
        expect(discussions[0]).toHaveProperty('grid_id');
        expect(discussions[0]).toHaveProperty('user_id');
        expect(discussions[0]).toHaveProperty('content');
        expect(discussions[0]).toHaveProperty('created_at');
      });

      it('should order discussions by created_at DESC', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            content: 'First message'
          }
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            content: 'Second message'
          }
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const discussions = response.json();
        expect(discussions).toHaveLength(2);
        // Most recent should be first
        expect(discussions[0].content).toBe('Second message');
        expect(discussions[1].content).toBe('First message');
      });

      it('should limit results to 200 discussions', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const disasterArea = await createTestDisasterArea(pool);
        const grid = await createTestGrid(pool, disasterArea.id);

        // Create 205 discussions directly in DB
        for (let i = 1; i <= 205; i++) {
          await pool.query(
            `INSERT INTO grid_discussions (id, grid_id, user_id, content)
             VALUES (gen_random_uuid(), $1, $2, $3)`,
            [grid.id, testUser.id, `Message ${i}`]
          );
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const discussions = response.json();
        expect(discussions).toHaveLength(200); // Should limit to 200
      });

      it('should include discussions from multiple grids', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);
        const disasterArea = await createTestDisasterArea(pool);
        const grid1 = await createTestGrid(pool, disasterArea.id, { code: 'A-1' });
        const grid2 = await createTestGrid(pool, disasterArea.id, { code: 'A-2' });

        await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid1.id,
            content: 'Discussion for grid 1'
          }
        });

        await app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid2.id,
            content: 'Discussion for grid 2'
          }
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/grid-discussions'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const discussions = response.json();
        expect(discussions).toHaveLength(2);
        const gridIds = discussions.map((d: any) => d.grid_id);
        expect(gridIds).toContain(grid1.id);
        expect(gridIds).toContain(grid2.id);
      });
    });
  });

  describe('Edge Cases & Security', () => {
    it('should handle Unicode characters in content', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const payload = {
        grid_id: grid.id,
        content: '這裡需要更多志工！😊 Let\'s help together! 🙏'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grid-discussions',
        headers: { authorization: `Bearer ${authToken}` },
        payload
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.content).toBe('這裡需要更多志工！😊 Let\'s help together! 🙏');
    });

    it('should handle very long content', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const longContent = 'A'.repeat(5000);
      const payload = {
        grid_id: grid.id,
        content: longContent
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grid-discussions',
        headers: { authorization: `Bearer ${authToken}` },
        payload
      });

      // Assert
      expect([201, 400]).toContain(response.statusCode);
      if (response.statusCode === 201) {
        const created = response.json();
        expect(created.content).toBe(longContent);
      }
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
        content: "'; DROP TABLE grid_discussions; --"
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grid-discussions',
        headers: { authorization: `Bearer ${authToken}` },
        payload: maliciousPayload
      });

      // Assert - Should create successfully with sanitized input
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.content).toBe("'; DROP TABLE grid_discussions; --");

      // Verify grid_discussions table still exists
      const checkResponse = await app.inject({
        method: 'GET',
        url: '/grid-discussions'
      });
      expect(checkResponse.statusCode).toBe(200);
    });

    it('should handle concurrent posts efficiently', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      // Act - Send 10 concurrent requests
      const promises = Array(10).fill(null).map((_, i) =>
        app.inject({
          method: 'POST',
          url: '/grid-discussions',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            grid_id: grid.id,
            content: `Concurrent message ${i + 1}`
          }
        })
      );

      const responses = await Promise.all(promises);

      // Assert - All should succeed
      responses.forEach((response, i) => {
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.content).toBe(`Concurrent message ${i + 1}`);
      });

      // Verify all were created
      const checkResponse = await app.inject({
        method: 'GET',
        url: '/grid-discussions'
      });
      const discussions = checkResponse.json();
      expect(discussions).toHaveLength(10);
    });

    it('should handle XSS attempts in content', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);
      const disasterArea = await createTestDisasterArea(pool);
      const grid = await createTestGrid(pool, disasterArea.id);

      const xssPayload = {
        grid_id: grid.id,
        content: '<script>alert("XSS")</script>'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/grid-discussions',
        headers: { authorization: `Bearer ${authToken}` },
        payload: xssPayload
      });

      // Assert - Should store as-is (sanitization should happen on frontend)
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.content).toBe('<script>alert("XSS")</script>');
    });
  });
});
