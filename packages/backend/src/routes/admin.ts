import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { pool, withConn } from '../lib/db.js';
import { logSecurityEvent } from '../lib/logger.js';
import { requireRole } from '../middleware/rbac.js';

// ============================================
// Zod Schemas for Validation
// ============================================

const getUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin']).optional(),
  status: z.enum(['active', 'suspended', 'pending_verification', 'inactive']).optional(),
  search: z.string().optional(),
});

const verifyVictimSchema = z.object({
  user_id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'need_more_info']),
  notes: z.string().optional(),
});

const auditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'inactive']),
  reason: z.string().optional(),
});

const userIdParamSchema = z.object({
  user_id: z.string().uuid(),
});

// ============================================
// Helper Functions
// ============================================

/**
 * Log admin action to audit_logs
 */
async function logAdminAction(
  adminId: string,
  adminRole: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  ipAddress: string | undefined,
  userAgent: string | undefined,
  requestData?: any,
  oldValue?: any,
  newValue?: any
) {
  await pool.query(`
    INSERT INTO audit_logs (
      user_id, user_role, action, resource_type, resource_id,
      ip_address, user_agent, request_data, old_value, new_value
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `, [
    adminId,
    adminRole,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    requestData ? JSON.stringify(requestData) : null,
    oldValue ? JSON.stringify(oldValue) : null,
    newValue ? JSON.stringify(newValue) : null,
  ]);
}

/**
 * Revoke all user sessions
 */
async function revokeUserSessions(userId: string) {
  await pool.query(`
    DELETE FROM sessions WHERE user_id = $1
  `, [userId]);
}

// ============================================
// Routes
// ============================================

const adminRoutes: FastifyPluginAsync = async (app) => {
  // First, verify JWT token for all admin routes
  app.addHook('onRequest', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      logSecurityEvent('jwt_verification_failed', {
        ip: request.ip,
        url: request.url,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Invalid or expired authentication token',
      });
    }
  });

  // Then, enforce role-based access (coordinator or higher)
  app.addHook('onRequest', requireRole(['ngo_coordinator', 'regional_admin', 'super_admin']));

  /**
   * GET /admin/users
   * List all users with filtering and pagination
   */
  app.get('/admin/users', {
    schema: {
      description: 'List all users with filtering and pagination',
      tags: ['admin'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          role: { type: 'string', enum: ['volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'data_analyst', 'super_admin'] },
          status: { type: 'string', enum: ['active', 'suspended', 'pending_verification', 'inactive'] },
          search: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const query = getUsersQuerySchema.parse(request.query);
    const offset = (query.page - 1) * query.limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.role) {
      conditions.push(`role = $${paramIndex++}`);
      params.push(query.role);
    }

    if (query.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(query.status);
    }

    if (query.search) {
      conditions.push(`(email ILIKE $${paramIndex} OR phone_number ILIKE $${paramIndex})`);
      params.push(`%${query.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get users
    params.push(query.limit, offset);
    const result = await pool.query(`
      SELECT id as user_id, role, email, phone_number, status,
             phone_verified, email_verified, created_at, updated_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    const authRequest = request as any;
    await logAdminAction(
      authRequest.user.userId,
      authRequest.user.role,
      'LIST_USERS',
      'users',
      null,
      request.ip,
      request.headers['user-agent'],
      query
    );

    return reply.send({
      users: result.rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * GET /admin/users/:user_id
   * Get detailed user information
   */
  app.get('/admin/users/:user_id', {
    schema: {
      description: 'Get detailed user information',
      tags: ['admin'],
      params: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);

    const result = await pool.query(`
      SELECT id as user_id, role, email, phone_number, status,
             phone_verified, email_verified,
             created_at, updated_at
      FROM users
      WHERE id = $1
    `, [params.user_id]);

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const authRequest = request as any;
    await logAdminAction(
      authRequest.user.userId,
      authRequest.user.role,
      'VIEW_USER_DETAILS',
      'users',
      params.user_id,
      request.ip,
      request.headers['user-agent']
    );

    return reply.send({ user: result.rows[0] });
  });

  /**
   * PATCH /admin/users/:user_id/status
   * Update user status (suspend/activate)
   */
  app.patch('/admin/users/:user_id/status', {
    schema: {
      description: 'Update user status',
      tags: ['admin'],
      params: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'suspended', 'inactive'] },
          reason: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);
    const body = updateUserStatusSchema.parse(request.body);

    // Get current user data
    const userResult = await pool.query(
      'SELECT status FROM users WHERE id = $1',
      [params.user_id]
    );

    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const oldStatus = userResult.rows[0].status;

    // Update status
    await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [body.status, params.user_id]
    );

    // If suspending, revoke all sessions
    if (body.status === 'suspended') {
      await revokeUserSessions(params.user_id);
    }

    const authRequest = request as any;
    await logAdminAction(
      authRequest.user.userId,
      authRequest.user.role,
      'UPDATE_USER_STATUS',
      'users',
      params.user_id,
      request.ip,
      request.headers['user-agent'],
      body,
      { status: oldStatus },
      { status: body.status }
    );

    logSecurityEvent('USER_STATUS_CHANGED', {
      admin_id: authRequest.user.userId,
      target_user_id: params.user_id,
      old_status: oldStatus,
      new_status: body.status,
      reason: body.reason,
    });

    return reply.send({
      message: 'User status updated successfully',
      old_status: oldStatus,
      new_status: body.status,
    });
  });

  /**
   * POST /admin/verify-victim
   * Verify victim identity and status
   */
  app.post('/admin/verify-victim', {
    schema: {
      description: 'Verify victim identity and status',
      tags: ['admin'],
      body: {
        type: 'object',
        required: ['user_id', 'action'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
          action: { type: 'string', enum: ['approve', 'reject', 'need_more_info'] },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = verifyVictimSchema.parse(request.body);

    // Check if user is a victim
    const userResult = await pool.query(
      'SELECT role, status FROM users WHERE id = $1',
      [body.user_id]
    );

    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    if (userResult.rows[0].role !== 'victim') {
      return reply.code(400).send({ error: 'User is not a victim' });
    }

    // Update verification status
    let newStatus: string;
    switch (body.action) {
      case 'approve':
        newStatus = 'active';
        break;
      case 'reject':
        newStatus = 'inactive';
        break;
      case 'need_more_info':
        newStatus = 'pending_verification';
        break;
    }

    await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, body.user_id]
    );

    const authRequest = request as any;
    await logAdminAction(
      authRequest.user.userId,
      authRequest.user.role,
      'VERIFY_VICTIM',
      'users',
      body.user_id,
      request.ip,
      request.headers['user-agent'],
      body,
      { status: userResult.rows[0].status },
      { status: newStatus }
    );

    logSecurityEvent('VICTIM_VERIFICATION', {
      admin_id: authRequest.user.userId,
      victim_id: body.user_id,
      action: body.action,
      notes: body.notes,
    });

    return reply.send({
      message: 'Victim verification processed',
      action: body.action,
      new_status: newStatus,
    });
  });

  /**
   * GET /admin/audit-logs
   * Get audit logs with filtering
   */
  app.get('/admin/audit-logs', {
    schema: {
      description: 'Get audit logs with filtering and pagination',
      tags: ['admin'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'number', minimum: 1, default: 1 },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          user_id: { type: 'string', format: 'uuid' },
          action: { type: 'string' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' },
        },
      },
    },
  }, async (request, reply) => {
    const query = auditLogsQuerySchema.parse(request.query);
    const offset = (query.page - 1) * query.limit;

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(query.user_id);
    }

    if (query.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(query.action);
    }

    if (query.start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(query.start_date);
    }

    if (query.end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get logs
    params.push(query.limit, offset);
    const result = await pool.query(`
      SELECT id as log_id, user_id, user_role, action, resource_type, resource_id,
             ip_address, user_agent, request_data, old_value, new_value, created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    return reply.send({
      logs: result.rows,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  });

  /**
   * DELETE /admin/users/:user_id
   * Soft delete a user (requires super_admin)
   */
  app.delete('/admin/users/:user_id', {
    preHandler: requireRole(['super_admin']),
    schema: {
      description: 'Soft delete a user (super_admin only)',
      tags: ['admin'],
      params: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const params = userIdParamSchema.parse(request.params);

    const userResult = await pool.query(
      'SELECT id as user_id, role FROM users WHERE id = $1',
      [params.user_id]
    );

    if (userResult.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Soft delete by setting status to inactive
    await pool.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      ['inactive', params.user_id]
    );

    // Revoke all sessions
    await revokeUserSessions(params.user_id);

    const authRequest = request as any;
    await logAdminAction(
      authRequest.user.userId,
      authRequest.user.role,
      'DELETE_USER',
      'users',
      params.user_id,
      request.ip,
      request.headers['user-agent'],
      null,
      userResult.rows[0],
      { status: 'inactive' }
    );

    logSecurityEvent('USER_DELETED', {
      admin_id: authRequest.user.userId,
      deleted_user_id: params.user_id,
      deleted_user_role: userResult.rows[0].role,
    });

    return reply.send({ message: 'User deleted successfully' });
  });

  /**
   * GET /admin/stats
   * Get dashboard statistics
   */
  app.get('/admin/stats', async (request, reply) => {
    // Get user counts by role
    const roleStats = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    // Get user counts by status
    const statusStats = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM users
      GROUP BY status
    `);

    // Get total users
    const totalUsers = await pool.query(`
      SELECT COUNT(*) as total FROM users
    `);

    // Get active volunteers (status = active AND role = volunteer)
    const activeVolunteers = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE role = 'volunteer' AND status = 'active'
    `);

    // Get pending verifications
    const pendingVerifications = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE status = 'pending_verification'
    `);

    // Get recent signups (last 7 days)
    const recentSignups = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    // Get audit log counts by action (last 30 days)
    const auditStats = await pool.query(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY action
      ORDER BY count DESC
      LIMIT 10
    `);

    return reply.send({
      users: {
        total: parseInt(totalUsers.rows[0].total),
        byRole: roleStats.rows,
        byStatus: statusStats.rows,
        activeVolunteers: parseInt(activeVolunteers.rows[0].count),
        pendingVerifications: parseInt(pendingVerifications.rows[0].count),
        recentSignups: parseInt(recentSignups.rows[0].count),
      },
      auditActivity: auditStats.rows,
    });
  });

  /**
   * GET /admin/recent-activity
   * Get recent activity feed
   */
  app.get('/admin/recent-activity', async (request, reply) => {
    const query = z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).parse(request.query);

    // Get recent audit logs with user information
    const activities = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.resource_type,
        al.resource_id,
        al.user_id,
        al.user_role,
        al.ip_address,
        al.created_at,
        al.request_method,
        al.request_path,
        al.response_status
      FROM audit_logs al
      ORDER BY al.created_at DESC
      LIMIT $1
    `, [query.limit]);

    return reply.send({
      activities: activities.rows,
    });
  });

  /**
   * GET /admin/audit-logs/export
   * Export audit logs as CSV
   */
  app.get('/admin/audit-logs/export', async (request, reply) => {
    const query = z.object({
      start_date: z.string().datetime().optional(),
      end_date: z.string().datetime().optional(),
      action: z.string().optional(),
      user_id: z.string().uuid().optional(),
    }).parse(request.query);

    // Build dynamic WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (query.user_id) {
      conditions.push(`user_id = $${paramIndex++}`);
      params.push(query.user_id);
    }

    if (query.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(query.action);
    }

    if (query.start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(query.start_date);
    }

    if (query.end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(query.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get all matching logs
    const result = await pool.query(`
      SELECT
        id,
        user_id,
        user_role,
        action,
        resource_type,
        resource_id,
        ip_address,
        user_agent,
        request_method,
        request_path,
        response_status,
        is_suspicious,
        risk_level,
        created_at
      FROM audit_logs
      ${whereClause}
      ORDER BY created_at DESC
    `, params);

    // Generate CSV
    const csvHeaders = [
      'ID',
      'User ID',
      'User Role',
      'Action',
      'Resource Type',
      'Resource ID',
      'IP Address',
      'User Agent',
      'Request Method',
      'Request Path',
      'Response Status',
      'Is Suspicious',
      'Risk Level',
      'Created At',
    ];

    const csvRows = result.rows.map(row => [
      row.id,
      row.user_id || '',
      row.user_role || '',
      row.action,
      row.resource_type || '',
      row.resource_id || '',
      row.ip_address || '',
      row.user_agent || '',
      row.request_method || '',
      row.request_path || '',
      row.response_status || '',
      row.is_suspicious ? 'true' : 'false',
      row.risk_level || '',
      row.created_at,
    ]);

    // Escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csv = [
      csvHeaders.map(escapeCsvValue).join(','),
      ...csvRows.map(row => row.map(escapeCsvValue).join(',')),
    ].join('\n');

    // Set headers for CSV download
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="audit_logs_${new Date().toISOString().split('T')[0]}.csv"`);

    return reply.send(csv);
  });
};

export default adminRoutes;
