# RBAC Middleware System

Comprehensive Role-Based Access Control (RBAC) and Permission-Based Access Control (PBAC) middleware for Shovel Heroes backend API.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Security Features](#security-features)
- [Database Integration](#database-integration)
- [Testing](#testing)

## Overview

This RBAC system provides multi-layered security for the Shovel Heroes API:

1. **JWT Authentication** - Verify user identity via `@fastify/jwt`
2. **Role-Based Access Control** - Restrict routes to specific user roles
3. **Permission-Based Access Control** - Fine-grained permission checks
4. **Row-Level Security (RLS)** - PostgreSQL RLS integration via session variables
5. **Audit Logging** - Automatic security event logging

## Features

- ✅ **6 Built-in User Roles**: `volunteer`, `victim`, `ngo_coordinator`, `regional_admin`, `data_analyst`, `super_admin`
- ✅ **17 Default Permissions**: Granular access control (see migration `0007_create_auth_system_fixed.sql`)
- ✅ **PostgreSQL RLS Integration**: Automatic `app.user_id` and `app.user_role` session variables
- ✅ **Audit Trail**: All access denials logged to `audit_logs` table
- ✅ **Account Status Checks**: Suspended/inactive account detection
- ✅ **Security Event Logging**: Integration with `logSecurityEvent()`
- ✅ **TypeScript Support**: Full type safety with `AuthenticatedRequest` interface

## Installation

The RBAC middleware is located at:

```
/home/thc1006/dev/shovel-heroes/packages/backend/src/middleware/rbac.ts
```

Import it in your routes:

```typescript
import { requireRole, requirePermission, hasPermission } from '../middleware/rbac.js';
```

## Quick Start

### 1. Basic Role Protection

```typescript
import { requireRole } from '../middleware/rbac.js';

app.get('/admin/users', {
  preHandler: [
    app.auth, // JWT verification first
    requireRole(['super_admin', 'regional_admin']) // Then role check
  ]
}, async (request, reply) => {
  return { message: 'Admin users list' };
});
```

### 2. Permission-Based Access

```typescript
import { requirePermission } from '../middleware/rbac.js';

app.post('/data/export', {
  preHandler: [
    app.auth,
    requirePermission('export_data')
  ]
}, async (request, reply) => {
  return { message: 'Data exported' };
});
```

### 3. Protect All Routes in a Plugin

```typescript
import { requireRole } from '../middleware/rbac.js';

app.register(async (adminRoutes) => {
  // Apply to all routes
  adminRoutes.addHook('preHandler', app.auth);
  adminRoutes.addHook('preHandler', requireRole(['super_admin']));

  adminRoutes.get('/permissions', async () => {
    return { permissions: [] };
  });

  adminRoutes.post('/users', async () => {
    return { created: true };
  });
}, { prefix: '/admin' });
```

## API Reference

### `requireRole(allowedRoles: string[])`

Middleware factory that restricts route access to specific roles.

**Parameters:**
- `allowedRoles` - Array of role names that can access the route

**Returns:** Fastify pre-handler hook

**Roles:**
- `volunteer` - Community volunteers
- `victim` - Disaster victims requesting help
- `ngo_coordinator` - NGO staff managing volunteers and tasks
- `regional_admin` - Regional administrators
- `data_analyst` - Read-only analytics access
- `super_admin` - Full system access

**Example:**
```typescript
requireRole(['ngo_coordinator', 'regional_admin', 'super_admin'])
```

### `requirePermission(permissionName: string)`

Middleware factory that requires a specific named permission.

**Parameters:**
- `permissionName` - Name of required permission (e.g., `'export_data'`)

**Returns:** Fastify pre-handler hook

**Default Permissions:**
- `view_own_profile` - View own user profile
- `update_own_profile` - Update own profile
- `view_tasks` - View task list
- `accept_task` - Accept tasks
- `upload_task_photo` - Upload task photos
- `create_help_request` - Create help requests
- `view_own_requests` - View own help requests
- `update_own_request` - Update own requests
- `view_all_volunteers` - View all volunteers
- `assign_tasks` - Assign tasks to volunteers
- `update_tasks` - Update task status
- `view_all_requests` - View all help requests
- `approve_victim` - Approve victim accounts
- `manage_users` - Full user management
- `view_audit_logs` - View audit logs
- `manage_permissions` - Manage permissions
- `export_data` - Export system data

### `hasPermission(userId: string, permissionName: string): Promise<boolean>`

Check if a user has a specific permission.

**Parameters:**
- `userId` - UUID of the user
- `permissionName` - Name of the permission to check

**Returns:** `Promise<boolean>` - True if user has permission

**Example:**
```typescript
const canExport = await hasPermission(userId, 'export_data');
if (!canExport) {
  return reply.code(403).send({ error: 'Cannot export data' });
}
```

### `getUserPermissions(userId: string): Promise<string[]>`

Get all effective permissions for a user (role-based + user-specific).

**Parameters:**
- `userId` - UUID of the user

**Returns:** `Promise<string[]>` - Array of permission names

**Example:**
```typescript
const permissions = await getUserPermissions(userId);
// ['view_own_profile', 'update_own_profile', 'view_tasks', 'accept_task']
```

### `setRLSContext(userId: string, userRole?: string)`

Create a database client with RLS context set.

**Parameters:**
- `userId` - UUID of the user
- `userRole` - Role of the user (optional, fetched if not provided)

**Returns:** `Promise<{ client: any, release: () => Promise<void> }>`

**Example:**
```typescript
const { client, release } = await setRLSContext(userId);
try {
  const result = await client.query('SELECT * FROM volunteers WHERE user_id = $1', [userId]);
  return result.rows;
} finally {
  await release();
}
```

### `hasAnyPermission(userId: string, permissionNames: string[]): Promise<boolean>`

Check if user has at least one of the specified permissions (OR logic).

**Example:**
```typescript
const canView = await hasAnyPermission(userId, ['view_reports', 'manage_reports']);
```

### `hasAllPermissions(userId: string, permissionNames: string[]): Promise<boolean>`

Check if user has all of the specified permissions (AND logic).

**Example:**
```typescript
const canExport = await hasAllPermissions(userId, ['view_data', 'export_data']);
```

## Usage Examples

See `/home/thc1006/dev/shovel-heroes/packages/backend/src/middleware/rbac.example.ts` for 15 comprehensive examples including:

1. Single route protection
2. Route group protection
3. Permission-based access
4. Combined role + permission checks
5. Manual permission checks
6. Getting user permissions
7. Multiple permission checks (OR/AND logic)
8. RLS context usage
9. Role-specific routes (volunteer, coordinator, analyst)
10. Error handling
11. Resource ownership checks
12. Super admin routes

## Security Features

### 1. JWT Verification

All RBAC middleware requires prior JWT authentication via `app.auth`:

```typescript
app.get('/protected', {
  preHandler: [
    app.auth, // ← Required first
    requireRole(['admin'])
  ]
}, handler);
```

### 2. Account Status Checks

Automatically rejects suspended or inactive accounts:

```typescript
if (user.status === 'suspended') {
  return reply.code(403).send({
    error: 'Forbidden',
    message: 'Account is suspended'
  });
}
```

### 3. Audit Logging

All access denials are logged to `audit_logs` table:

```sql
INSERT INTO audit_logs (
  user_id, user_role, action, resource_type,
  ip_address, user_agent, request_method, request_path,
  response_status, is_suspicious, risk_level
) VALUES (...);
```

### 4. Security Event Logging

Uses `logSecurityEvent()` for real-time monitoring:

```typescript
logSecurityEvent('rbac_access_denied', {
  userId,
  userRole,
  allowedRoles,
  ip: request.ip,
  url: request.url
});
```

### 5. Minimal Error Exposure

Never leaks sensitive information in error messages:

```typescript
// ❌ Bad - leaks roles
message: `You need one of these roles: ${allowedRoles.join(', ')}`

// ✅ Good - minimal info
message: 'Insufficient permissions'
```

## Database Integration

### PostgreSQL Session Variables

The middleware automatically sets RLS context for every request:

```sql
SET LOCAL app.user_id = '123e4567-e89b-12d3-a456-426614174000';
SET LOCAL app.user_role = 'volunteer';
```

These variables are used by RLS policies in PostgreSQL:

```sql
CREATE POLICY volunteers_select_self ON volunteers
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true)::UUID);
```

### Permission Checking

Uses the `user_has_permission()` database function from migration `0007`:

```sql
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Check role permissions + user-specific permissions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Testing

### Unit Tests

Test middleware behavior:

```typescript
import { hasPermission, getUserPermissions } from '../middleware/rbac.js';

describe('RBAC Middleware', () => {
  it('should check permission correctly', async () => {
    const canExport = await hasPermission(testUserId, 'export_data');
    expect(canExport).toBe(true);
  });

  it('should get all user permissions', async () => {
    const permissions = await getUserPermissions(testUserId);
    expect(permissions).toContain('view_own_profile');
  });
});
```

### Integration Tests

Test route protection:

```typescript
import { build } from '../test-helpers.js';

describe('Protected Routes', () => {
  it('should reject unauthenticated requests', async () => {
    const app = await build();
    const response = await app.inject({
      method: 'GET',
      url: '/admin/users'
    });
    expect(response.statusCode).toBe(401);
  });

  it('should reject unauthorized roles', async () => {
    const app = await build();
    const token = generateToken({ userId: 'test-id', role: 'volunteer' });
    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(response.statusCode).toBe(403);
  });

  it('should allow authorized roles', async () => {
    const app = await build();
    const token = generateToken({ userId: 'test-id', role: 'super_admin' });
    const response = await app.inject({
      method: 'GET',
      url: '/admin/users',
      headers: { authorization: `Bearer ${token}` }
    });
    expect(response.statusCode).toBe(200);
  });
});
```

## Best Practices

### 1. Defense in Depth

Combine multiple security layers:

```typescript
app.delete('/users/:id', {
  preHandler: [
    app.auth,                    // Layer 1: Authentication
    requireRole(['super_admin']), // Layer 2: Role check
    requirePermission('manage_users') // Layer 3: Permission check
  ]
}, handler);
```

### 2. Least Privilege

Grant minimum required permissions:

```typescript
// ✅ Good - specific roles
requireRole(['ngo_coordinator', 'regional_admin'])

// ❌ Bad - too permissive
requireRole(['volunteer', 'victim', 'ngo_coordinator', 'regional_admin', 'super_admin'])
```

### 3. Resource Ownership

Check ownership in addition to role:

```typescript
const { client, release } = await setRLSContext(userId);
try {
  const result = await client.query(
    'SELECT * FROM announcements WHERE id = $1 AND author_id = $2',
    [announcementId, userId]
  );

  if (result.rows.length === 0) {
    return reply.code(403).send({ error: 'Not your announcement' });
  }
} finally {
  await release();
}
```

### 4. Always Use app.auth First

Never use RBAC middleware without prior authentication:

```typescript
// ❌ Bad - no authentication
requireRole(['admin'])

// ✅ Good - auth first
preHandler: [app.auth, requireRole(['admin'])]
```

### 5. Audit High-Security Routes

For sensitive operations, ensure audit logging is enabled (automatic for `super_admin` and `regional_admin` roles).

## Troubleshooting

### Issue: "Authentication required" error

**Cause:** JWT token not provided or invalid

**Solution:** Ensure `app.auth` middleware runs before RBAC middleware:

```typescript
preHandler: [app.auth, requireRole(['admin'])]
```

### Issue: "Insufficient permissions" error

**Cause:** User's role is not in `allowedRoles`

**Solution:** Check user's role in database and verify it matches:

```sql
SELECT id, role, status FROM users WHERE id = 'user-uuid';
```

### Issue: RLS policies not enforced

**Cause:** Session variables not set

**Solution:** Use `setRLSContext()` or ensure RBAC middleware runs:

```typescript
const { client, release } = await setRLSContext(userId);
```

### Issue: Permission checks always return false

**Cause:** `user_has_permission()` function not found or permissions not assigned

**Solution:** Run migration `0007_create_auth_system_fixed.sql`:

```bash
npm run migrate
```

## Related Files

- **Main Module**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/middleware/rbac.ts`
- **Examples**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/middleware/rbac.example.ts`
- **Auth Routes**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/auth.ts`
- **Database Migration**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0007_create_auth_system_fixed.sql`
- **RLS Policies**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0009_complete_rls_policies.sql`

## License

MIT License - See project root for details.
