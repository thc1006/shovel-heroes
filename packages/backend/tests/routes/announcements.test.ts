import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestApp,
  closeTestApp,
  cleanDatabase,
  generateTestToken,
  createTestUser,
  type TestContext
} from '../helpers.js';

describe('Announcements CRUD - TDD', () => {
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

  describe('POST /announcements', () => {
    describe('Success Cases', () => {
      it('should create announcement with valid data and return 201', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          title: 'Important Update',
          content: 'This is an important announcement about disaster relief operations.',
          priority: 'high',
          published: true
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.title).toBe('Important Update');
        expect(created.content).toBe('This is an important announcement about disaster relief operations.');
        expect(created.priority).toBe('high');
        expect(created.published).toBe(true);
        expect(created.author_id).toBe(testUser.id);
        expect(created.id).toBeDefined();
        expect(created.created_at).toBeDefined();
      });

      it('should create announcement with default values', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          title: 'Simple Announcement',
          content: 'This is a simple announcement.'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.priority).toBe('normal'); // Default priority
        expect(created.published).toBe(true); // Default published
      });

      it('should create unpublished announcement', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const payload = {
          title: 'Draft Announcement',
          content: 'This is a draft.',
          published: false
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload
        });

        // Assert
        expect(response.statusCode).toBe(201);
        const created = response.json();
        expect(created.published).toBe(false);
      });

      it('should create announcement with all priority levels', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const priorities = ['low', 'normal', 'high', 'urgent'];

        // Act & Assert
        for (const priority of priorities) {
          const response = await app.inject({
            method: 'POST',
            url: '/announcements',
            headers: { authorization: `Bearer ${authToken}` },
            payload: {
              title: `${priority} priority`,
              content: 'Test content',
              priority
            }
          });

          expect(response.statusCode).toBe(201);
          const created = response.json();
          expect(created.priority).toBe(priority);
        }
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when title is missing', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          content: 'Content without title'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
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

      it('should return 400 when title is empty string', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          title: '',
          content: 'Content with empty title'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
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

        const invalidPayload = {
          title: 'Title without content'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: {
            authorization: `Bearer ${authToken}`
          },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when priority has invalid value', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const invalidPayload = {
          title: 'Test Announcement',
          content: 'Test content',
          priority: 'invalid_priority'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
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
          title: 'Unauthorized Announcement',
          content: 'This should fail'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
          payload
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });

      it('should return 401 when auth token is invalid', async () => {
        // Arrange
        const { app } = context;

        const payload = {
          title: 'Invalid Token Announcement',
          content: 'This should fail'
        };

        // Act
        const response = await app.inject({
          method: 'POST',
          url: '/announcements',
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

  describe('GET /announcements', () => {
    describe('Success Cases', () => {
      it('should return empty array when no announcements exist', async () => {
        // Arrange
        const { app } = context;

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const announcements = response.json();
        expect(Array.isArray(announcements)).toBe(true);
        expect(announcements).toHaveLength(0);
      });

      it('should return only published announcements (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Create published announcement
        await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Published Announcement',
            content: 'This is published',
            published: true
          }
        });

        // Create unpublished announcement
        await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Draft Announcement',
            content: 'This is a draft',
            published: false
          }
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const announcements = response.json();
        expect(announcements).toHaveLength(1);
        expect(announcements[0].title).toBe('Published Announcement');
        expect(announcements[0].published).toBe(true);
      });

      it('should return announcements without authentication (public endpoint)', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Create 3 published announcements
        for (let i = 1; i <= 3; i++) {
          await app.inject({
            method: 'POST',
            url: '/announcements',
            headers: { authorization: `Bearer ${authToken}` },
            payload: {
              title: `Announcement ${i}`,
              content: `Content ${i}`,
              published: true
            }
          });
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const announcements = response.json();
        expect(announcements).toHaveLength(3);
        expect(announcements[0]).toHaveProperty('id');
        expect(announcements[0]).toHaveProperty('title');
        expect(announcements[0]).toHaveProperty('content');
        expect(announcements[0]).toHaveProperty('priority');
        expect(announcements[0]).toHaveProperty('published');
        expect(announcements[0]).toHaveProperty('created_at');
      });

      it('should order announcements by is_pinned DESC, order ASC, created_at DESC', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Create regular announcement
        await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Regular Announcement',
            content: 'Regular content',
            published: true
          }
        });

        // Create another regular announcement
        await new Promise(resolve => setTimeout(resolve, 10));
        await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Newer Regular Announcement',
            content: 'Newer content',
            published: true
          }
        });

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const announcements = response.json();
        expect(announcements).toHaveLength(2);
        // Most recent should be first (when is_pinned and order are equal)
        expect(announcements[0].title).toBe('Newer Regular Announcement');
      });

      it('should limit results to 100 announcements', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);

        // Create 105 announcements directly in DB
        for (let i = 1; i <= 105; i++) {
          await pool.query(
            `INSERT INTO announcements (id, title, content, published, author_id)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [`Announcement ${i}`, `Content ${i}`, true, testUser.id]
          );
        }

        // Act
        const response = await app.inject({
          method: 'GET',
          url: '/announcements'
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const announcements = response.json();
        expect(announcements).toHaveLength(100); // Should limit to 100
      });
    });
  });

  describe('PUT /announcements/:id', () => {
    describe('Success Cases', () => {
      it('should update announcement and return 200', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Original Title',
            content: 'Original content',
            priority: 'normal'
          }
        });

        const announcement = createResponse.json();
        const updatePayload = {
          title: 'Updated Title',
          content: 'Updated content',
          priority: 'high'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.title).toBe('Updated Title');
        expect(updated.content).toBe('Updated content');
        expect(updated.priority).toBe('high');
      });

      it('should support partial updates', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Original Title',
            content: 'Original content',
            priority: 'normal'
          }
        });

        const announcement = createResponse.json();
        const updatePayload = {
          priority: 'urgent' // Only update priority
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.priority).toBe('urgent');
        expect(updated.title).toBe('Original Title'); // Unchanged
        expect(updated.content).toBe('Original content'); // Unchanged
      });

      it('should update published status', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Draft Announcement',
            content: 'Draft content',
            published: false
          }
        });

        const announcement = createResponse.json();
        const updatePayload = {
          published: true
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: updatePayload
        });

        // Assert
        expect(response.statusCode).toBe(200);
        const updated = response.json();
        expect(updated.published).toBe(true);
      });
    });

    describe('Validation Failures', () => {
      it('should return 400 when title is empty string', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Original Title',
            content: 'Original content'
          }
        });

        const announcement = createResponse.json();
        const invalidPayload = {
          title: ''
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });

      it('should return 400 when priority has invalid value', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'Original Title',
            content: 'Original content'
          }
        });

        const announcement = createResponse.json();
        const invalidPayload = {
          priority: 'invalid_priority'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: invalidPayload
        });

        // Assert
        expect(response.statusCode).toBe(400);
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when announcement does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const updatePayload = {
          title: 'Updated Title'
        };

        // Act
        const response = await app.inject({
          method: 'PUT',
          url: '/announcements/00000000-0000-0000-0000-000000000000',
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
          url: '/announcements/00000000-0000-0000-0000-000000000000',
          payload: { title: 'Unauthorized Update' }
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('DELETE /announcements/:id', () => {
    describe('Success Cases', () => {
      it('should delete announcement successfully and return 204', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        const createResponse = await app.inject({
          method: 'POST',
          url: '/announcements',
          headers: { authorization: `Bearer ${authToken}` },
          payload: {
            title: 'To Be Deleted',
            content: 'This will be deleted'
          }
        });

        const announcement = createResponse.json();

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` }
        });

        // Assert
        expect(response.statusCode).toBe(204);
        expect(response.body).toBe('');

        // Verify announcement is deleted
        const checkResponse = await app.inject({
          method: 'GET',
          url: '/announcements'
        });
        const announcements = checkResponse.json();
        expect(announcements.find((a: any) => a.id === announcement.id)).toBeUndefined();
      });
    });

    describe('Not Found Cases', () => {
      it('should return 404 when announcement does not exist', async () => {
        // Arrange
        const { app, pool } = context;
        const testUser = await createTestUser(pool);
        const authToken = generateTestToken(testUser.id, app);

        // Act
        const response = await app.inject({
          method: 'DELETE',
          url: '/announcements/00000000-0000-0000-0000-000000000000',
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
          url: '/announcements/00000000-0000-0000-0000-000000000000'
        });

        // Assert
        expect(response.statusCode).toBe(401);
      });
    });
  });

  describe('Edge Cases & Security', () => {
    it('should handle Unicode characters in text fields', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const payload = {
        title: '重要公告 📢',
        content: '這是一個重要的災害救援公告 🚨',
        priority: 'urgent'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: { authorization: `Bearer ${authToken}` },
        payload
      });

      // Assert
      expect(response.statusCode).toBe(201);
      const created = response.json();
      expect(created.title).toBe('重要公告 📢');
      expect(created.content).toBe('這是一個重要的災害救援公告 🚨');
    });

    it('should handle very long content', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const longContent = 'A'.repeat(10000);
      const payload = {
        title: 'Long Content Announcement',
        content: longContent
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/announcements',
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

      const maliciousPayload = {
        title: "'; DROP TABLE announcements; --",
        content: 'Malicious content'
      };

      // Act
      const response = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: { authorization: `Bearer ${authToken}` },
        payload: maliciousPayload
      });

      // Assert - Should create successfully with sanitized input
      expect(response.statusCode).toBe(201);

      // Verify announcements table still exists
      const checkResponse = await app.inject({
        method: 'GET',
        url: '/announcements'
      });
      expect(checkResponse.statusCode).toBe(200);
    });

    it('should handle concurrent updates correctly', async () => {
      // Arrange
      const { app, pool } = context;
      const testUser = await createTestUser(pool);
      const authToken = generateTestToken(testUser.id, app);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: { authorization: `Bearer ${authToken}` },
        payload: {
          title: 'Concurrent Test',
          content: 'Original content'
        }
      });

      const announcement = createResponse.json();

      // Act - Send two concurrent update requests
      const [response1, response2] = await Promise.all([
        app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { priority: 'high' }
        }),
        app.inject({
          method: 'PUT',
          url: `/announcements/${announcement.id}`,
          headers: { authorization: `Bearer ${authToken}` },
          payload: { priority: 'urgent' }
        })
      ]);

      // Assert - Both should succeed
      expect(response1.statusCode).toBe(200);
      expect(response2.statusCode).toBe(200);
    });
  });
});
