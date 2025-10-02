/**
 * RBAC Middleware Usage Examples
 *
 * This file demonstrates how to use the RBAC middleware in various scenarios.
 * DO NOT import this file in production code - it's for documentation only.
 */

import type { FastifyInstance } from 'fastify';
import {
  requireRole,
  requirePermission,
  hasPermission,
  getUserPermissions,
  setRLSContext,
  hasAnyPermission,
  hasAllPermissions,
} from './rbac.js';

/**
 * Example 1: Protect a single route with role requirement
 */
export function exampleSingleRoute(app: FastifyInstance) {
  app.get('/admin/users', {
    preHandler: [
      app.auth, // First verify JWT
      requireRole(['super_admin', 'regional_admin']), // Then check role
    ],
  }, async (request, reply) => {
    // Only super_admin and regional_admin can access this
    return { message: 'Admin users list' };
  });
}

/**
 * Example 2: Protect all routes in a plugin with role requirement
 */
export async function exampleRouteGroup(app: FastifyInstance) {
  app.register(async (adminRoutes) => {
    // Apply to all routes in this plugin
    adminRoutes.addHook('preHandler', app.auth);
    adminRoutes.addHook('preHandler', requireRole(['super_admin']));

    adminRoutes.get('/permissions', async () => {
      return { message: 'Permissions list' };
    });

    adminRoutes.post('/permissions', async () => {
      return { message: 'Permission created' };
    });
  }, { prefix: '/admin' });
}

/**
 * Example 3: Permission-based access control
 */
export function examplePermissionBased(app: FastifyInstance) {
  // Require specific permission, regardless of role
  app.post('/data/export', {
    preHandler: [
      app.auth,
      requirePermission('export_data'),
    ],
  }, async (request, reply) => {
    // Any user with 'export_data' permission can access
    return { message: 'Data exported' };
  });
}

/**
 * Example 4: Defense in depth - combine role and permission checks
 */
export function exampleCombinedChecks(app: FastifyInstance) {
  app.delete('/users/:id', {
    preHandler: [
      app.auth, // 1. Verify JWT
      requireRole(['super_admin', 'regional_admin']), // 2. Must be admin
      requirePermission('manage_users'), // 3. Must have permission
    ],
  }, async (request, reply) => {
    // Must pass ALL three checks
    const { id } = request.params as { id: string };
    return { message: `User ${id} deleted` };
  });
}

/**
 * Example 5: Manual permission check inside route handler
 */
export function exampleManualCheck(app: FastifyInstance) {
  app.post('/announcements', {
    preHandler: app.auth,
  }, async (request, reply) => {
    const user = (request as any).user;

    // Check specific permission
    const canCreate = await hasPermission(user.userId, 'create_announcement');

    if (!canCreate) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'You do not have permission to create announcements',
      });
    }

    // Create announcement
    return { message: 'Announcement created' };
  });
}

/**
 * Example 6: Get user's permissions for UI customization
 */
export function exampleGetPermissions(app: FastifyInstance) {
  app.get('/auth/me/permissions', {
    preHandler: app.auth,
  }, async (request, reply) => {
    const user = (request as any).user;

    // Get all permissions for the user
    const permissions = await getUserPermissions(user.userId);

    return {
      userId: user.userId,
      role: user.role,
      permissions, // Frontend can use this to show/hide features
    };
  });
}

/**
 * Example 7: Check multiple permissions (OR logic)
 */
export function exampleAnyPermission(app: FastifyInstance) {
  app.get('/reports', {
    preHandler: app.auth,
  }, async (request, reply) => {
    const user = (request as any).user;

    // User needs at least one of these permissions
    const canView = await hasAnyPermission(user.userId, [
      'view_reports',
      'manage_reports',
      'export_data',
    ]);

    if (!canView) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Insufficient permissions to view reports',
      });
    }

    return { message: 'Reports list' };
  });
}

/**
 * Example 8: Check multiple permissions (AND logic)
 */
export function exampleAllPermissions(app: FastifyInstance) {
  app.post('/sensitive-action', {
    preHandler: app.auth,
  }, async (request, reply) => {
    const user = (request as any).user;

    // User needs ALL of these permissions
    const canPerform = await hasAllPermissions(user.userId, [
      'view_sensitive_data',
      'modify_sensitive_data',
      'export_data',
    ]);

    if (!canPerform) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'This action requires multiple permissions',
      });
    }

    return { message: 'Sensitive action performed' };
  });
}

/**
 * Example 9: Execute query with RLS context
 */
export async function exampleRLSContext() {
  const userId = 'some-uuid';

  // Set RLS context for manual queries
  const { client, release } = await setRLSContext(userId);

  try {
    // All queries in this block will have RLS applied
    const result = await client.query(`
      SELECT * FROM volunteers WHERE user_id = $1
    `, [userId]);

    return result.rows;
  } finally {
    // Always release the client
    await release();
  }
}

/**
 * Example 10: Volunteer-only route
 */
export function exampleVolunteerRoute(app: FastifyInstance) {
  app.get('/tasks/available', {
    preHandler: [
      app.auth,
      requireRole(['volunteer']),
    ],
  }, async (request, reply) => {
    // Only volunteers can see available tasks
    return { message: 'Available tasks' };
  });
}

/**
 * Example 11: NGO Coordinator routes
 */
export function exampleCoordinatorRoutes(app: FastifyInstance) {
  app.register(async (coordinatorRoutes) => {
    // All routes require ngo_coordinator or higher
    coordinatorRoutes.addHook('preHandler', app.auth);
    coordinatorRoutes.addHook('preHandler', requireRole([
      'ngo_coordinator',
      'regional_admin',
      'super_admin',
    ]));

    coordinatorRoutes.get('/volunteers/all', async () => {
      return { message: 'All volunteers' };
    });

    coordinatorRoutes.post('/tasks/assign', async () => {
      return { message: 'Task assigned' };
    });

    coordinatorRoutes.patch('/victims/:id/verify', async () => {
      return { message: 'Victim verified' };
    });
  }, { prefix: '/coordinator' });
}

/**
 * Example 12: Data analyst read-only routes
 */
export function exampleAnalystRoutes(app: FastifyInstance) {
  app.register(async (analystRoutes) => {
    analystRoutes.addHook('preHandler', app.auth);
    analystRoutes.addHook('preHandler', requireRole([
      'data_analyst',
      'regional_admin',
      'super_admin',
    ]));

    analystRoutes.get('/analytics/dashboard', async () => {
      return { message: 'Analytics dashboard' };
    });

    analystRoutes.get('/analytics/volunteers', async () => {
      return { message: 'Volunteer statistics' };
    });

    // Data analysts can export but not modify
    analystRoutes.post('/analytics/export', {
      preHandler: requirePermission('export_data'),
    }, async () => {
      return { message: 'Data exported' };
    });
  }, { prefix: '/analytics' });
}

/**
 * Example 13: Error handling with RBAC
 */
export function exampleErrorHandling(app: FastifyInstance) {
  app.get('/admin/sensitive', {
    preHandler: [app.auth, requireRole(['super_admin'])],
  }, async (request, reply) => {
    try {
      const user = (request as any).user;

      // Additional permission check
      const hasAccess = await hasPermission(user.userId, 'view_sensitive_data');

      if (!hasAccess) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'Additional permission required',
        });
      }

      // Perform sensitive operation
      return { message: 'Sensitive data' };
    } catch (error) {
      request.log.error({ err: error }, 'Error in sensitive route');

      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process request',
      });
    }
  });
}

/**
 * Example 14: Conditional access based on resource ownership
 */
export function exampleResourceOwnership(app: FastifyInstance) {
  app.patch('/announcements/:id', {
    preHandler: app.auth,
  }, async (request, reply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    // Set RLS context
    const { client, release } = await setRLSContext(user.userId, user.role);

    try {
      // Check if user owns this announcement or is admin
      const result = await client.query(`
        SELECT id, author_id FROM announcements WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return reply.code(404).send({
          error: 'Not Found',
          message: 'Announcement not found',
        });
      }

      const announcement = result.rows[0];

      // Allow if owner or has manage_announcements permission
      const isOwner = announcement.author_id === user.userId;
      const canManage = await hasPermission(user.userId, 'manage_announcements');

      if (!isOwner && !canManage) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: 'You can only edit your own announcements',
        });
      }

      // Update announcement
      await client.query(`
        UPDATE announcements SET title = $1 WHERE id = $2
      `, ['Updated title', id]);

      return { message: 'Announcement updated' };
    } finally {
      await release();
    }
  });
}

/**
 * Example 15: Super admin only routes
 */
export function exampleSuperAdminRoutes(app: FastifyInstance) {
  app.register(async (superAdminRoutes) => {
    // Extremely restrictive - super_admin only
    superAdminRoutes.addHook('preHandler', app.auth);
    superAdminRoutes.addHook('preHandler', requireRole(['super_admin']));

    superAdminRoutes.post('/users/:id/suspend', async (request) => {
      const { id } = request.params as { id: string };
      return { message: `User ${id} suspended` };
    });

    superAdminRoutes.delete('/permissions/:id', async (request) => {
      const { id } = request.params as { id: string };
      return { message: `Permission ${id} deleted` };
    });

    superAdminRoutes.get('/audit-logs', async () => {
      return { message: 'Full audit log' };
    });
  }, { prefix: '/superadmin' });
}
