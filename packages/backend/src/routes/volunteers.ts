import type { FastifyInstance } from 'fastify';
import { withConn, pool } from '../lib/db.js';
import type { AuthenticatedRequest } from '../middleware/rbac.js';

// NOTE: This endpoint is an aggregate view combining volunteer_registrations + volunteers.
// DB schema currently only stores minimal fields for volunteer_registrations.
// For now we synthesize presentation fields that frontend expects (volunteer_name, volunteer_phone, etc.).
// Future: extend schema to actually persist skills/equipment/available_time/notes or join another table.

interface RawRow {
  id: string;
  grid_id: string;
  volunteer_id: string;
  created_at: string;
  volunteer_name: string | null;
  volunteer_email: string | null;
  volunteer_phone: string | null;
}

/**
 * Helper function to mask phone numbers for privacy
 * Keeps first 4 digits and last 3 digits, masks middle with ***
 * @param phone - Phone number to mask (e.g., "0912345678")
 * @returns Masked phone (e.g., "0912-***-678") or "****" for short numbers
 */
function maskPhone(phone: string | null): string | undefined {
  if (!phone || phone.trim() === '') return undefined;

  const cleaned = phone.trim();
  if (cleaned.length < 4) return '****';

  // Keep first 4 digits and last 3 digits
  const first = cleaned.substring(0, 4);
  const last = cleaned.substring(cleaned.length - 3);
  return `${first}-***-${last}`;
}

/**
 * Determine if authenticated user can view phone numbers
 * Rules (STRICT RBAC):
 * 1. Unauthenticated users CANNOT view (can_view_phone = false)
 * 2. Admins (super_admin, regional_admin) can ALWAYS view FULL phones
 * 3. Grid Managers (ngo_coordinator) can view FULL phones ONLY for THEIR grids when grid_id is specified
 * 4. Regular users (volunteer, etc.) CANNOT view phones (can_view_phone = false)
 *
 * @returns { canView: boolean, showFullPhone: boolean }
 */
async function canViewPhoneNumbers(
  userId: string | undefined,
  userRole: string | undefined,
  gridId: string | undefined
): Promise<{ canView: boolean; showFullPhone: boolean }> {
  // No auth = no phone access at all
  if (!userId || !userRole) {
    return { canView: false, showFullPhone: false };
  }

  // Admins can always view FULL phones
  if (userRole === 'super_admin' || userRole === 'regional_admin') {
    return { canView: true, showFullPhone: true };
  }

  // Grid managers can view FULL phones only for their grids (when grid_id is specified)
  if (userRole === 'ngo_coordinator' && gridId) {
    try {
      const result = await pool.query(
        `SELECT grid_manager_id FROM grids WHERE id = $1`,
        [gridId]
      );

      if (result.rows.length > 0 && result.rows[0].grid_manager_id === userId) {
        return { canView: true, showFullPhone: true };
      }
    } catch (error) {
      // Log error but deny access on failure
      console.error('Error checking grid manager:', error);
      return { canView: false, showFullPhone: false };
    }
  }

  // Default: regular users and unauthorized grid managers CANNOT view phones
  return { canView: false, showFullPhone: false };
}

export function registerVolunteersRoutes(app: FastifyInstance) {
  app.get('/volunteers', async (req: any, reply) => {
    try {
      const { grid_id, status, limit = 200, offset = 0, include_counts = 'true' } = req.query as any;

      // Validate query parameters
      const parsedLimit = Math.max(0, Number(limit) || 200);
      const parsedOffset = Math.max(0, Number(offset) || 0);

      // We don't actually have status column in volunteer_registrations yet.
      // Frontend expects statuses; we will default all to 'pending' until schema evolves.
      // If later a status column added, adjust the SELECT accordingly.

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      if (grid_id) {
        // Validate UUID format (basic check)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(grid_id)) {
          // Invalid UUID - return empty results instead of error
          return { data: [], can_view_phone: false, total: 0, limit: parsedLimit, page: 1 };
        }
        conditions.push(`vr.grid_id = $${paramIndex++}`);
        params.push(grid_id);
      }
      // status filter is ignored for now because no status column; keep placeholder for future.
      if (status) {
        // conditions.push(`vr.status = $${paramIndex++}`);
        // params.push(status);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const rows = await withConn(async (c) => {
        const sql = `SELECT vr.id, vr.grid_id, vr.volunteer_id, vr.status, vr.created_at,
                            v.name as volunteer_name, v.email as volunteer_email, v.phone as volunteer_phone
                     FROM volunteer_registrations vr
                     LEFT JOIN volunteers v ON v.id = vr.volunteer_id
                     ${where}
                     ORDER BY vr.created_at DESC
                     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        const queryParams = [...params, parsedLimit, parsedOffset];
        const { rows } = await c.query(sql, queryParams);
        return rows as RawRow[];
      });

      // Get authenticated user info if available
      let userId: string | undefined;
      let userRole: string | undefined;

      try {
        // Try to verify JWT without requiring it (optional auth)
        await req.jwtVerify();
        const authReq = req as AuthenticatedRequest;
        userId = authReq.user?.userId;

        // Fetch user role from database if authenticated
        if (userId) {
          const userResult = await pool.query(
            'SELECT role FROM users WHERE id = $1',
            [userId]
          );
          if (userResult.rows.length > 0) {
            userRole = userResult.rows[0].role;
          }
        }
      } catch {
        // No valid JWT, treat as unauthenticated
        // This is intentional - endpoint is public but with limited data
      }

      // Determine if user can view phone numbers based on RBAC
      const phoneAccess = await canViewPhoneNumbers(userId, userRole, grid_id);
      const can_view_phone = phoneAccess.canView;
      const showFullPhone = phoneAccess.showFullPhone;

      // Map rows to VolunteerListItem spec shape
      const data = rows.map(r => {
        let displayPhone: string | undefined;

        if (can_view_phone && r.volunteer_phone) {
          // Show full phone for admins and grid managers, masked for others
          displayPhone = showFullPhone ? r.volunteer_phone : maskPhone(r.volunteer_phone);
        }

        return {
          id: r.id,
          grid_id: r.grid_id,
          user_id: r.volunteer_id,
          volunteer_name: (r.volunteer_name && r.volunteer_name.trim()) || '匿名志工',
          volunteer_phone: displayPhone,
          status: 'pending',
          available_time: null,
          skills: [],
          equipment: [],
          notes: null,
          created_date: r.created_at
        };
      });

      let status_counts: any = undefined;
      if (include_counts !== 'false') {
        // Since all are pending currently
        status_counts = { pending: data.length, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 };
      }

      // total (without pagination) - if full dataset small we can reuse data length else run count(*).
      // Simplicity: run a COUNT(*) query with same filters.
      const total = await withConn(async (c) => {
        const countSql = `SELECT COUNT(*)::int AS c FROM volunteer_registrations vr ${where}`;
        const { rows: countRows } = await c.query(countSql, params);
        return countRows[0]?.c ?? data.length;
      });

      return { data, can_view_phone, total, status_counts, limit: parsedLimit, page: Math.floor(parsedOffset / parsedLimit) + 1 };
    } catch (err: any) {
      app.log.error(err);
      return reply.code(500).send({ message: 'Internal error' });
    }
  });
}
