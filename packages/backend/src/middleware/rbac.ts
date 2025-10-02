import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { pool } from '../lib/db.js';
import { logSecurityEvent } from '../lib/logger.js';

/**
 * Extended Fastify request type with authenticated user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: {
    userId: string;
    role: string;
  };
}

/**
 * User data fetched from database
 */
interface UserData {
  id: string;
  role: string;
  status: string;
  email: string | null;
  phone_number: string | null;
}

/**
 * RBAC Middleware Factory
 *
 * Creates a Fastify pre-handler hook that enforces role-based access control.
 * This middleware should be used AFTER JWT verification (via @fastify/jwt).
 *
 * @param allowedRoles - Array of role names that are permitted to access the route
 * @returns Fastify pre-handler hook
 *
 * @example
 * ```typescript
 * // In a Fastify route
 * app.get('/admin/users', {
 *   preHandler: [app.auth, requireRole(['super_admin', 'regional_admin'])]
 * }, async (request, reply) => {
 *   // Only super_admin and regional_admin can access this
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Register routes with role requirement
 * app.register(async (fastify) => {
 *   fastify.addHook('preHandler', requireRole(['super_admin']));
 *
 *   fastify.get('/admin/permissions', async (req, reply) => {
 *     // All routes in this context require super_admin role
 *   });
 * });
 * ```
 */
export function requireRole(allowedRoles: string[]): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;

    // 1. Verify JWT token was already validated
    if (!authRequest.user || !authRequest.user.userId) {
      logSecurityEvent('rbac_no_user', {
        ip: request.ip,
        url: request.url,
        method: request.method,
      });

      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userId = authRequest.user.userId;

    try {
      // 2. Get user from database
      const userResult = await pool.query<UserData>(`
        SELECT id, role, status, email, phone_number
        FROM users
        WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0) {
        logSecurityEvent('rbac_user_not_found', {
          userId,
          ip: request.ip,
          url: request.url,
          method: request.method,
        });

        return reply.code(401).send({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'User not found',
        });
      }

      const user = userResult.rows[0];

      // 3. Check account status
      if (user.status === 'suspended') {
        logSecurityEvent('rbac_suspended_account', {
          userId,
          role: user.role,
          ip: request.ip,
          url: request.url,
        });

        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Account is suspended',
        });
      }

      if (user.status === 'inactive') {
        logSecurityEvent('rbac_inactive_account', {
          userId,
          role: user.role,
          ip: request.ip,
          url: request.url,
        });

        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Account is inactive',
        });
      }

      // 4. Check if user's role is in allowedRoles
      if (!allowedRoles.includes(user.role)) {
        logSecurityEvent('rbac_access_denied', {
          userId,
          userRole: user.role,
          allowedRoles, // Note: This is logged for debugging, not returned to client
          ip: request.ip,
          url: request.url,
          method: request.method,
        });

        // Log to audit_logs table for compliance
        await pool.query(`
          INSERT INTO audit_logs (
            user_id, user_role, action, resource_type,
            ip_address, user_agent, request_method, request_path,
            response_status, is_suspicious, risk_level
          ) VALUES ($1, $2, 'access_denied', 'endpoint', $3, $4, $5, $6, 403, true, 'medium')
        `, [
          userId,
          user.role,
          request.ip,
          request.headers['user-agent'] || null,
          request.method,
          request.url,
        ]);

        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      // 5. Set PostgreSQL session variables for RLS
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL app.user_id = $1', [userId]);
        await client.query('SET LOCAL app.user_role = $1', [user.role]);

        // Store client in request for transaction support
        (request as any).dbClient = client;

        // Update authRequest with verified role from database
        authRequest.user.role = user.role;

        // Log successful access (for high-security routes)
        if (allowedRoles.includes('super_admin') || allowedRoles.includes('regional_admin')) {
          await client.query(`
            INSERT INTO audit_logs (
              user_id, user_role, action, resource_type,
              ip_address, user_agent, request_method, request_path,
              response_status, risk_level
            ) VALUES ($1, $2, 'access_granted', 'endpoint', $3, $4, $5, $6, 200, 'low')
          `, [
            userId,
            user.role,
            request.ip,
            request.headers['user-agent'] || null,
            request.method,
            request.url,
          ]);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Continue to route handler
    } catch (error) {
      request.log.error({ err: error, userId }, 'RBAC middleware error');

      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Access control check failed',
      });
    }
  };
}

/**
 * Check if user has a specific permission
 *
 * This function checks both role-based permissions and user-specific permissions.
 * It uses the database function `user_has_permission` defined in migration 0007.
 *
 * @param userId - UUID of the user
 * @param permissionName - Name of the permission to check
 * @returns Promise<boolean> - True if user has permission
 *
 * @example
 * ```typescript
 * const canExportData = await hasPermission(userId, 'export_data');
 * if (!canExportData) {
 *   return reply.code(403).send({ error: 'Cannot export data' });
 * }
 * ```
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  try {
    const result = await pool.query<{ has_permission: boolean }>(`
      SELECT user_has_permission($1, $2) AS has_permission
    `, [userId, permissionName]);

    return result.rows[0]?.has_permission || false;
  } catch (error) {
    // Log error but return false for security
    console.error('Error checking permission:', error);
    return false;
  }
}

/**
 * Get all effective permissions for a user
 *
 * Returns the combined set of permissions from:
 * 1. Role-based permissions (from role_permissions table)
 * 2. User-specific permissions (from user_permissions table)
 *
 * User-specific permissions can grant OR revoke permissions.
 *
 * @param userId - UUID of the user
 * @returns Promise<string[]> - Array of permission names
 *
 * @example
 * ```typescript
 * const permissions = await getUserPermissions(userId);
 * console.log('User can:', permissions);
 * // ['view_own_profile', 'update_own_profile', 'view_tasks', 'accept_task']
 * ```
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const result = await pool.query<{ name: string }>(`
      WITH user_role AS (
        SELECT role FROM users WHERE id = $1
      ),
      role_perms AS (
        SELECT p.name
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        INNER JOIN user_role ur ON ur.role = rp.role
      ),
      user_perms AS (
        SELECT p.name, up.granted
        FROM permissions p
        INNER JOIN user_permissions up ON up.permission_id = p.id
        WHERE up.user_id = $1
        AND (up.expires_at IS NULL OR up.expires_at > NOW())
      )
      SELECT DISTINCT rp.name
      FROM role_perms rp
      WHERE NOT EXISTS (
        SELECT 1 FROM user_perms up
        WHERE up.name = rp.name AND up.granted = FALSE
      )
      UNION
      SELECT DISTINCT up.name
      FROM user_perms up
      WHERE up.granted = TRUE
      ORDER BY name
    `, [userId]);

    return result.rows.map(row => row.name);
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return [];
  }
}

/**
 * Permission-based Access Control Middleware
 *
 * More granular than role-based access control. Checks if the authenticated
 * user has a specific named permission.
 *
 * @param permissionName - Name of the required permission
 * @returns Fastify pre-handler hook
 *
 * @example
 * ```typescript
 * // Require specific permission regardless of role
 * app.post('/data/export', {
 *   preHandler: [app.auth, requirePermission('export_data')]
 * }, async (request, reply) => {
 *   // Only users with 'export_data' permission can access
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Combine with role check for defense in depth
 * app.delete('/users/:id', {
 *   preHandler: [
 *     app.auth,
 *     requireRole(['super_admin', 'regional_admin']),
 *     requirePermission('manage_users')
 *   ]
 * }, async (request, reply) => {
 *   // Must be admin AND have manage_users permission
 * });
 * ```
 */
export function requirePermission(permissionName: string): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;

    // Verify authentication first
    if (!authRequest.user || !authRequest.user.userId) {
      logSecurityEvent('permission_check_no_user', {
        permission: permissionName,
        ip: request.ip,
        url: request.url,
      });

      return reply.code(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const userId = authRequest.user.userId;

    try {
      // Check if user has the required permission
      const hasRequiredPermission = await hasPermission(userId, permissionName);

      if (!hasRequiredPermission) {
        logSecurityEvent('permission_denied', {
          userId,
          permission: permissionName,
          ip: request.ip,
          url: request.url,
          method: request.method,
        });

        // Log to audit_logs
        await pool.query(`
          INSERT INTO audit_logs (
            user_id, action, resource_type,
            ip_address, user_agent, request_method, request_path,
            response_status, is_suspicious, risk_level,
            old_value
          ) VALUES ($1, 'permission_denied', 'permission', $2, $3, $4, $5, 403, true, 'medium', $6)
        `, [
          userId,
          request.ip,
          request.headers['user-agent'] || null,
          request.method,
          request.url,
          JSON.stringify({ required_permission: permissionName }),
        ]);

        return reply.code(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      // Permission granted, set PostgreSQL session variables
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SET LOCAL app.user_id = $1', [userId]);

        // Get user role for RLS
        const userResult = await client.query<{ role: string }>(`
          SELECT role FROM users WHERE id = $1
        `, [userId]);

        if (userResult.rows.length > 0) {
          await client.query('SET LOCAL app.user_role = $1', [userResult.rows[0].role]);
        }

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

      // Continue to route handler
    } catch (error) {
      request.log.error({ err: error, userId, permission: permissionName }, 'Permission check error');

      return reply.code(500).send({
        statusCode: 500,
        error: 'Internal Server Error',
        message: 'Permission check failed',
      });
    }
  };
}

/**
 * Helper function to set RLS context for a database query
 *
 * Use this when you need to execute queries with proper RLS context
 * outside of route handlers.
 *
 * @param userId - UUID of the user
 * @param userRole - Role of the user (optional, will fetch if not provided)
 * @returns Promise with query executor function
 *
 * @example
 * ```typescript
 * const { client, release } = await setRLSContext(userId, userRole);
 * try {
 *   const result = await client.query('SELECT * FROM volunteers WHERE user_id = $1', [userId]);
 *   // RLS policies are automatically enforced
 *   return result.rows;
 * } finally {
 *   await release();
 * }
 * ```
 */
export async function setRLSContext(userId: string, userRole?: string): Promise<{
  client: any;
  release: () => Promise<void>;
}> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.user_id = $1', [userId]);

    // Fetch role if not provided
    if (!userRole) {
      const result = await client.query<{ role: string }>(`
        SELECT role FROM users WHERE id = $1
      `, [userId]);

      userRole = result.rows[0]?.role;
    }

    if (userRole) {
      await client.query('SET LOCAL app.user_role = $1', [userRole]);
    }

    await client.query('COMMIT');

    return {
      client,
      release: async () => {
        try {
          await client.query('ROLLBACK'); // Clean up any uncommitted transaction
        } catch {
          // Ignore errors during cleanup
        } finally {
          client.release();
        }
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    client.release();
    throw error;
  }
}

/**
 * Verify user has one of multiple permissions (OR logic)
 *
 * @param userId - UUID of the user
 * @param permissionNames - Array of permission names (user needs ANY one)
 * @returns Promise<boolean> - True if user has at least one permission
 *
 * @example
 * ```typescript
 * const canManage = await hasAnyPermission(userId, ['manage_users', 'view_audit_logs']);
 * ```
 */
export async function hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean> {
  for (const permission of permissionNames) {
    if (await hasPermission(userId, permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Verify user has all specified permissions (AND logic)
 *
 * @param userId - UUID of the user
 * @param permissionNames - Array of permission names (user needs ALL)
 * @returns Promise<boolean> - True if user has all permissions
 *
 * @example
 * ```typescript
 * const canExport = await hasAllPermissions(userId, ['view_data', 'export_data']);
 * ```
 */
export async function hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean> {
  for (const permission of permissionNames) {
    if (!await hasPermission(userId, permission)) {
      return false;
    }
  }
  return true;
}
