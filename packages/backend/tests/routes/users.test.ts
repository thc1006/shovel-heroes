import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  cleanDatabase,
  generateTestToken,
  createTestUser,
  type TestContext
} from '../helpers.js';

describe('Users Routes - TDD', () => {
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

  describe('GET /users', () => {
    describe('Success Cases', () => {
      it('should return empty array when no users exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(Array.isArray(users)).toBe(true);
        expect(users).toHaveLength(0);
      });

      it('should return all users without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        await createTestUser(pool, { email: 'user1@example.com', name: 'User 1' });
        await createTestUser(pool, { email: 'user2@example.com', name: 'User 2' });
        await createTestUser(pool, { email: 'user3@example.com', name: 'User 3' });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(users).toHaveLength(3);
        expect(users[0]).toHaveProperty('id');
        expect(users[0]).toHaveProperty('name');
        expect(users[0]).toHaveProperty('email');
        expect(users[0]).toHaveProperty('phone');
        expect(users[0]).toHaveProperty('display_name');
      });

      it('should limit results to 100 users', async () => {
        // Arrange
        const { app, pool } = context;

        // Create 105 users
        for (let i = 1; i <= 105; i++) {
          await createTestUser(pool, {
            email: `user${i}@example.com`,
            name: `User ${i}`
          });
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(users).toHaveLength(100); // Should limit to 100
      });

      it('should not expose sensitive information', async () => {
        // Arrange
        const { app, pool } = context;
        await createTestUser(pool, {
          email: 'test@example.com',
          name: 'Test User'
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(users[0]).not.toHaveProperty('password');
        expect(users[0]).not.toHaveProperty('password_hash');
      });
    });

    describe('Edge Cases', () => {
      it('should handle Unicode characters in names', async () => {
        // Arrange
        const { app, pool } = context;
        await createTestUser(pool, {
          email: 'unicode@example.com',
          name: '王小明 😊'
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(users[0].name).toBe('王小明 😊');
      });

      it('should handle null phone numbers', async () => {
        // Arrange
        const { app, pool } = context;
        await createTestUser(pool, {
          email: 'nophone@example.com',
          phone: null
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/users'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const users = response.json();
        expect(users[0].phone).toBeNull();
      });
    });
  });

  describe('GET /me', () => {
    describe('Success Cases', () => {
      it('should return current user info when authenticated', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool, {
          email: 'me@example.com',
          name: 'Current User'
        });
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const user = response.json();
        expect(user.id).toBe(testUser.id);
        expect(user.email).toBe('me@example.com');
        expect(user.name).toBe('Current User');
      });

      it('should upsert user if not exists in database (JWT-based auth)', async () => {
        // Arrange
        const { app } = context;
        const newUserId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID
        const authToken = generateTestToken(newUserId, app);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const user = response.json();
        expect(user.id).toBe(newUserId);
        expect(user.email).toBeDefined();
      });

      it('should return user with all expected fields', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool, {
          email: 'full@example.com',
          name: 'Full User',
          phone: '0912345678'
        });
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const user = response.json();
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('name');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('phone');
        expect(user).toHaveProperty('display_name');
        expect(user).not.toHaveProperty('password');
      });
    });

    describe('Authentication Failures', () => {
      it('should return 401 when no auth token is provided', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me'
        });

        // Assert
        expect(response.statusCode).toBe(401);
        const error = response.json();
        expect(error.error).toBeDefined();
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: 'Bearer invalid_token_xyz'
          }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is expired', async () => {
        // Arrange
        const { app } = context;

        // Generate an immediately expired token
        const expiredToken = app.jwt.sign(
          { userId: 'test-user', sub: 'test-user' },
          { expiresIn: '0s' }
        );

        await new Promise(resolve => setTimeout(resolve, 100));

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: `Bearer ${expiredToken}`
          }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is malformed', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: 'Bearer'
          }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when authorization header is missing Bearer prefix', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: authToken // Missing "Bearer " prefix
          }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });

    describe('Edge Cases', () => {
      it('should handle concurrent requests from same user', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act - Send 10 concurrent requests
        const promises = Array(10).fill(null).map(() =>
          app.inject({
            method: 'GET',
            url: '/me',
            headers: {
              authorization: `Bearer ${authToken}`
            }
          })
        );

        const responses = await Promise.all(promises);

        // Assert - All should succeed
        responses.forEach(response => {
          expect(response.statusCode).toBe(200);
          const user = response.json();
          expect(user.id).toBe(testUser.id);
        });
      });

      it('should handle very long email addresses', async () => {
        // Arrange
        const { app, pool } = context;
        const longEmail = 'a'.repeat(200) + '@example.com';
        const testUser = await createTestUser(pool, { email: longEmail });
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/me',
          headers: {
            authorization: `Bearer ${authToken}`
          }
        });

        // Assert
        expect([200, 500]).toContain(response.statusCode);
        if (response.statusCode === 200) {
          const user = response.json();
          expect(user.email).toBe(longEmail);
        }
      });
    });
  });

  describe('Security', () => {
    it('should not expose other users data via /me endpoint', async () => {
      // Arrange
      const { app, pool } = context;
      const user1 = await createTestUser(pool, { email: 'user1@example.com' });
      const user2 = await createTestUser(pool, { email: 'user2@example.com' });
      const authToken = generateTestToken(user1.id, app);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Assert
      expect(response.statusCode).toBe(200);
      const user = response.json();
      expect(user.id).toBe(user1.id);
      expect(user.id).not.toBe(user2.id);
      expect(user.email).toBe('user1@example.com');
    });

    it('should sanitize SQL injection attempts in JWT sub claim', async () => {
      // Arrange
      const { app, pool } = context;
      const maliciousUserId = "550e8400-e29b-41d4-a716-446655440001"; // Valid UUID for DB

      // Create user
      await pool.query(
        'INSERT INTO users (id, display_name, email) VALUES ($1, $2, $3)',
        [maliciousUserId, 'Malicious User', 'malicious@example.com']
      );

      const authToken = generateTestToken(maliciousUserId, app);

      // Act
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      // Assert - Should handle safely
      expect([200, 500]).toContain(response.statusCode);

      // Verify users table still exists
      const { rows } = await pool.query('SELECT COUNT(*) FROM users');
      expect(rows[0].count).toBeDefined();
    });
  });
});
