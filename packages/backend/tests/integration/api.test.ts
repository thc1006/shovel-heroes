import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { build } from '../../src/app.js';
import type { FastifyInstance } from 'fastify';
import { withConn } from '../../src/lib/db.js';

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let authToken: string;
  let testUserId: string;
  let testAreaId: string;
  let testGridId: string;
  let testVolunteerRegId: string;
  let testSupplyDonationId: string;
  let testAnnouncementId: string;

  beforeAll(async () => {
    app = await build();
    await app.ready();

    // Create test user and get JWT token
    const testUserEmail = `test-${Date.now()}@example.com`;
    const testUserPassword = 'TestPassword123!';

    // Register test user
    const registerResponse = await app.inject({
      method: 'POST',
      url: '/register',
      payload: {
        email: testUserEmail,
        password: testUserPassword,
        name: 'Test User'
      }
    });

    if (registerResponse.statusCode !== 201) {
      throw new Error(`Failed to create test user: ${registerResponse.body}`);
    }

    testUserId = JSON.parse(registerResponse.body).id;

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/login',
      payload: {
        email: testUserEmail,
        password: testUserPassword
      }
    });

    if (loginResponse.statusCode !== 200) {
      throw new Error(`Failed to login: ${loginResponse.body}`);
    }

    authToken = JSON.parse(loginResponse.body).token;

    // Create test disaster area
    testAreaId = await createTestDisasterArea();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Reset test state if needed
  });

  async function createTestDisasterArea(): Promise<string> {
    const result = await withConn(async (c) => {
      const { rows } = await c.query(
        `INSERT INTO disaster_areas (name, location, disaster_type, severity, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [`Test Area ${Date.now()}`, 'Test Location', 'flood', 'moderate', 'active']
      );
      return rows[0].id;
    });
    return result;
  }

  async function cleanupTestData() {
    await withConn(async (c) => {
      // Delete in order due to foreign key constraints
      if (testVolunteerRegId) {
        await c.query('DELETE FROM volunteer_registrations WHERE id = $1', [testVolunteerRegId]);
      }
      if (testSupplyDonationId) {
        await c.query('DELETE FROM supply_donations WHERE id = $1', [testSupplyDonationId]);
      }
      if (testGridId) {
        await c.query('DELETE FROM grids WHERE id = $1', [testGridId]);
      }
      if (testAnnouncementId) {
        await c.query('DELETE FROM announcements WHERE id = $1', [testAnnouncementId]);
      }
      if (testAreaId) {
        await c.query('DELETE FROM disaster_areas WHERE id = $1', [testAreaId]);
      }
      if (testUserId) {
        await c.query('DELETE FROM users WHERE id = $1', [testUserId]);
      }
    });
  }

  describe('1. Grids CRUD', () => {
    it('POST /grids - should create a new grid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          code: `TEST-GRID-${Date.now()}`,
          grid_type: 'manpower',
          area_id: testAreaId,
          center_lat: 23.5,
          center_lng: 121.5,
          volunteer_needed: 10,
          bounds: {
            north: 23.51,
            south: 23.49,
            east: 121.51,
            west: 121.49
          },
          meeting_point: '測試集合點',
          status: 'open'
        }
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('id');
      expect(data.grid_type).toBe('manpower');
      expect(data.volunteer_needed).toBe(10);
      testGridId = data.id;
    });

    it('GET /grids - should list all grids', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/grids'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('GET /grids?area_id - should filter grids by area', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/grids?area_id=${testAreaId}`
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data)).toBe(true);
      data.forEach((grid: any) => {
        expect(grid.area_id).toBe(testAreaId);
      });
    });

    it('PUT /grids/:id - should update grid status and volunteer_needed', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/grids/${testGridId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          status: 'closed',
          volunteer_needed: 15
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('closed');
      expect(data.volunteer_needed).toBe(15);
    });

    it('DELETE /grids/:id - should delete grid', async () => {
      // Create a temporary grid for deletion
      const createResponse = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          code: `DELETE-TEST-${Date.now()}`,
          grid_type: 'supply',
          area_id: testAreaId,
          center_lat: 23.5,
          center_lng: 121.5
        }
      });

      const tempGrid = JSON.parse(createResponse.body);

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/grids/${tempGrid.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify deletion
      const getResponse = await app.inject({
        method: 'GET',
        url: `/grids/${tempGrid.id}`
      });

      expect(getResponse.statusCode).toBe(404);
    });
  });

  describe('2. Volunteer Registrations', () => {
    it('POST /volunteer-registrations - should create registration', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          grid_id: testGridId,
          user_id: testUserId
        }
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('id');
      expect(data.grid_id).toBe(testGridId);
      expect(data.user_id).toBe(testUserId);
      testVolunteerRegId = data.id;
    });

    it('PUT /volunteer-registrations/:id - should update status', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${testVolunteerRegId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          status: 'confirmed'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('confirmed');
    });

    it('GET /volunteer-registrations - should list registrations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/volunteer-registrations'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('3. Supply Donations CRUD', () => {
    it('POST /supply-donations - should create donation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/supply-donations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          grid_id: testGridId,
          name: '飲用水',
          quantity: 100,
          unit: '箱',
          donor_contact: 'test@example.com'
        }
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('id');
      expect(data.name).toBe('飲用水');
      testSupplyDonationId = data.id;
    });

    it('PUT /supply-donations/:id - should update donation status', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/supply-donations/${testSupplyDonationId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          status: 'delivered'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.status).toBe('delivered');
    });

    it('DELETE /supply-donations/:id - should delete donation', async () => {
      // Create temp donation for deletion
      const createResponse = await app.inject({
        method: 'POST',
        url: '/supply-donations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          grid_id: testGridId,
          name: '臨時物資',
          quantity: 10,
          unit: '箱'
        }
      });

      const tempDonation = JSON.parse(createResponse.body);

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/supply-donations/${tempDonation.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(204);
    });
  });

  describe('4. Announcements CRUD', () => {
    it('POST /announcements - should create announcement', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          title: '測試公告',
          content: '這是一個測試公告內容',
          priority: 'normal',
          published: true
        }
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data).toHaveProperty('id');
      expect(data.title).toBe('測試公告');
      testAnnouncementId = data.id;
    });

    it('PUT /announcements/:id - should update announcement', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: `/announcements/${testAnnouncementId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          title: '更新後的公告',
          priority: 'high'
        }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.title).toBe('更新後的公告');
      expect(data.priority).toBe('high');
    });

    it('DELETE /announcements/:id - should delete announcement', async () => {
      // Create temp announcement for deletion
      const createResponse = await app.inject({
        method: 'POST',
        url: '/announcements',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          title: '臨時公告',
          content: '臨時內容'
        }
      });

      const tempAnnouncement = JSON.parse(createResponse.body);

      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/announcements/${tempAnnouncement.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(204);
    });
  });

  describe('5. Trigger Validation - volunteer_registered counter', () => {
    it('should auto-increment volunteer_registered on registration', async () => {
      // Get initial count
      const initialResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });

      const initialGrids = JSON.parse(initialResponse.body);
      const targetGrid = initialGrids.find((g: any) => g.id === testGridId);
      const initialCount = targetGrid?.volunteer_registered || 0;

      // Create new registration
      const regResponse = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          grid_id: testGridId,
          user_id: testUserId
        }
      });

      expect(regResponse.statusCode).toBe(201);
      const newReg = JSON.parse(regResponse.body);

      // Verify count increased
      const afterResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });

      const afterGrids = JSON.parse(afterResponse.body);
      const afterGrid = afterGrids.find((g: any) => g.id === testGridId);

      expect(afterGrid.volunteer_registered).toBe(initialCount + 1);

      // Cleanup - delete registration
      await app.inject({
        method: 'DELETE',
        url: `/volunteer-registrations/${newReg.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });
    });

    it('should auto-decrement volunteer_registered on deletion', async () => {
      // Create registration
      const regResponse = await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          grid_id: testGridId,
          user_id: testUserId
        }
      });

      const newReg = JSON.parse(regResponse.body);

      // Get count after creation
      const beforeDeleteResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });

      const beforeGrids = JSON.parse(beforeDeleteResponse.body);
      const beforeGrid = beforeGrids.find((g: any) => g.id === testGridId);
      const countBeforeDelete = beforeGrid.volunteer_registered;

      // Delete registration
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/volunteer-registrations/${newReg.id}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(deleteResponse.statusCode).toBe(204);

      // Verify count decreased
      const afterDeleteResponse = await app.inject({
        method: 'GET',
        url: '/grids'
      });

      const afterGrids = JSON.parse(afterDeleteResponse.body);
      const afterGrid = afterGrids.find((g: any) => g.id === testGridId);

      expect(afterGrid.volunteer_registered).toBe(countBeforeDelete - 1);
    });
  });
});
