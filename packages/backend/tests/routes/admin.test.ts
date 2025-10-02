import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { pool } from '../../src/lib/db.js';
import type { FastifyInstance } from 'fastify';

describe('Admin Routes', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let adminUserId: string;
  let testVictimId: string;
  let testVolunteerId: string;

  beforeAll(async () => {
    app = await buildApp();

    // Create test super admin
    const adminResult = await pool.query(`
      INSERT INTO users (
        email, password_hash, role, status,
        full_name_encrypted, phone_verified, email_verified
      ) VALUES (
        'admin@test.com',
        '$2b$10$test.hash',
        'super_admin',
        'active',
        'test_admin'::bytea,
        true,
        true
      ) RETURNING id
    `);
    adminUserId = adminResult.rows[0].id;

    // Generate admin token
    adminToken = app.jwt.sign(
      { userId: adminUserId, role: 'super_admin' },
      { expiresIn: '24h' }
    );

    // Create test victim
    const victimResult = await pool.query(`
      INSERT INTO users (
        phone_number, role, status,
        full_name_encrypted, phone_verified
      ) VALUES (
        '1234567890',
        'victim',
        'active',
        'test_victim'::bytea,
        true
      ) RETURNING id
    `);
    testVictimId = victimResult.rows[0].id;

    // Create victim profile
    await pool.query(`
      INSERT INTO victim_profiles (
        user_id, damage_description, damage_level, verification_status
      ) VALUES (
        $1, 'Test damage', 'moderate', 'pending'
      )
    `, [testVictimId]);

    // Create test volunteer
    const volunteerResult = await pool.query(`
      INSERT INTO users (
        phone_number, role, status,
        full_name_encrypted, phone_verified
      ) VALUES (
        '9876543210',
        'volunteer',
        'active',
        'test_volunteer'::bytea,
        true
      ) RETURNING id
    `);
    testVolunteerId = volunteerResult.rows[0].id;

    // Create volunteer profile
    await pool.query(`
      INSERT INTO volunteer_profiles (user_id)
      VALUES ($1)
    `, [testVolunteerId]);
  });

  afterAll(async () => {
    // Cleanup
    await pool.query('DELETE FROM victim_profiles WHERE user_id = $1', [testVictimId]);
    await pool.query('DELETE FROM volunteer_profiles WHERE user_id = $1', [testVolunteerId]);
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [[adminUserId, testVictimId, testVolunteerId]]);
    await pool.query('DELETE FROM audit_logs WHERE user_id = $1', [adminUserId]);
    await app.close();
  });

  describe('GET /admin/users', () => {
    it('should list users with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users?page=1&limit=20',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('users');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.users)).toBe(true);
      expect(data.pagination).toHaveProperty('page', 1);
      expect(data.pagination).toHaveProperty('limit', 20);
      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('totalPages');
    });

    it('should filter users by role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users?role=victim',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      data.users.forEach((user: any) => {
        expect(user.role).toBe('victim');
      });
    });

    it('should filter users by status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users?status=active',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      data.users.forEach((user: any) => {
        expect(user.status).toBe('active');
      });
    });

    it('should search users by email or phone', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users?search=1234567890',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.users.length).toBeGreaterThan(0);
    });

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/users',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /admin/verify-victim', () => {
    it('should approve victim verification', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/verify-victim',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          user_id: testVictimId,
          action: 'approve',
          notes: 'Verified successfully',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe('Victim verified successfully');
      expect(data.victim_profile.verification_status).toBe('approved');

      // Verify audit log was created
      const auditLog = await pool.query(`
        SELECT * FROM audit_logs
        WHERE user_id = $1
        AND action = 'verify_victim_approve'
        AND resource_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `, [adminUserId, testVictimId]);

      expect(auditLog.rows.length).toBe(1);
    });

    it('should reject victim verification', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/verify-victim',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          user_id: testVictimId,
          action: 'reject',
          notes: 'Insufficient evidence',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.victim_profile.verification_status).toBe('rejected');
    });

    it('should request more info', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/verify-victim',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          user_id: testVictimId,
          action: 'need_more_info',
          notes: 'Please provide additional photos',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.victim_profile.verification_status).toBe('need_more_info');
    });

    it('should return 404 for non-existent victim', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/admin/verify-victim',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          user_id: '00000000-0000-0000-0000-000000000000',
          action: 'approve',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /admin/audit-logs', () => {
    it('should get audit logs with pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/audit-logs?page=1&limit=20',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data).toHaveProperty('logs');
      expect(data).toHaveProperty('pagination');
      expect(Array.isArray(data.logs)).toBe(true);
    });

    it('should filter audit logs by user_id', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/admin/audit-logs?user_id=${adminUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      data.logs.forEach((log: any) => {
        expect(log.user_id).toBe(adminUserId);
      });
    });

    it('should filter audit logs by action', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/audit-logs?action=verify_victim_approve',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      data.logs.forEach((log: any) => {
        expect(log.action).toBe('verify_victim_approve');
      });
    });
  });

  describe('PATCH /admin/users/:id/status', () => {
    it('should update user status to suspended', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${testVolunteerId}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          status: 'suspended',
          reason: 'Violated terms of service',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.user.status).toBe('suspended');

      // Verify sessions were revoked
      const sessions = await pool.query(`
        SELECT * FROM sessions WHERE user_id = $1
      `, [testVolunteerId]);
      expect(sessions.rows.length).toBe(0);
    });

    it('should update user status to active', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${testVolunteerId}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          status: 'active',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.user.status).toBe('active');
    });

    it('should prevent self-suspension', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${adminUserId}/status`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          status: 'suspended',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should require super_admin role', async () => {
      // Create coordinator token
      const coordinatorToken = app.jwt.sign(
        { userId: testVolunteerId, role: 'ngo_coordinator' },
        { expiresIn: '24h' }
      );

      const response = await app.inject({
        method: 'PATCH',
        url: `/admin/users/${testVictimId}/status`,
        headers: {
          authorization: `Bearer ${coordinatorToken}`,
        },
        payload: {
          status: 'suspended',
        },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /admin/stats', () => {
    it('should return dashboard statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/admin/stats',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();

      expect(data).toHaveProperty('users');
      expect(data.users).toHaveProperty('total');
      expect(data.users).toHaveProperty('byRole');
      expect(data.users).toHaveProperty('byStatus');
      expect(data.users).toHaveProperty('newToday');
      expect(data.users).toHaveProperty('newThisWeek');

      expect(data).toHaveProperty('volunteers');
      expect(data.volunteers).toHaveProperty('total');
      expect(data.volunteers).toHaveProperty('active');

      expect(data).toHaveProperty('victims');
      expect(data.victims).toHaveProperty('total');
      expect(data.victims).toHaveProperty('pending_verification');
      expect(data.victims).toHaveProperty('approved');
      expect(data.victims).toHaveProperty('rejected');

      expect(data).toHaveProperty('security');
      expect(data.security).toHaveProperty('failed_logins_today');
      expect(data.security).toHaveProperty('suspicious_activity');
      expect(data.security).toHaveProperty('locked_accounts');

      // Verify statistics are numbers
      expect(typeof data.users.total).toBe('number');
      expect(typeof data.volunteers.total).toBe('number');
      expect(typeof data.victims.total).toBe('number');
    });
  });
});
