# RBAC Quick Reference Card

## 🚀 Quick Start

```typescript
import { requireRole, requirePermission, hasPermission } from './middleware/rbac.js';
```

## 📋 Roles

| Role | Description | Level |
|------|-------------|-------|
| `volunteer` | Community volunteers | 1 |
| `victim` | Disaster victims | 1 |
| `data_analyst` | Read-only analytics | 2 |
| `ngo_coordinator` | NGO staff | 3 |
| `regional_admin` | Regional admins | 4 |
| `super_admin` | System admins | 5 |

## 🔐 Common Permissions

| Permission | Description |
|------------|-------------|
| `view_own_profile` | View own profile |
| `update_own_profile` | Edit own profile |
| `view_tasks` | See available tasks |
| `accept_task` | Accept tasks |
| `create_help_request` | Create help request |
| `view_all_volunteers` | See all volunteers |
| `assign_tasks` | Assign tasks |
| `approve_victim` | Approve victims |
| `manage_users` | Full user management |
| `view_audit_logs` | View audit logs |
| `export_data` | Export data |

## 📝 Usage Patterns

### 1. Single Route Protection

```typescript
app.get('/admin/users', {
  preHandler: [app.auth, requireRole(['super_admin'])]
}, handler);
```

### 2. Multiple Allowed Roles

```typescript
app.get('/coordinator/tasks', {
  preHandler: [app.auth, requireRole(['ngo_coordinator', 'regional_admin', 'super_admin'])]
}, handler);
```

### 3. Permission-Based

```typescript
app.post('/data/export', {
  preHandler: [app.auth, requirePermission('export_data')]
}, handler);
```

### 4. Combined (Defense in Depth)

```typescript
app.delete('/users/:id', {
  preHandler: [
    app.auth,
    requireRole(['super_admin', 'regional_admin']),
    requirePermission('manage_users')
  ]
}, handler);
```

### 5. Protect All Routes in Plugin

```typescript
app.register(async (adminRoutes) => {
  adminRoutes.addHook('preHandler', app.auth);
  adminRoutes.addHook('preHandler', requireRole(['super_admin']));

  adminRoutes.get('/permissions', handler);
  adminRoutes.post('/users', handler);
}, { prefix: '/admin' });
```

### 6. Manual Permission Check

```typescript
app.post('/announcements', {
  preHandler: app.auth
}, async (request, reply) => {
  const { userId } = (request as any).user;

  if (!await hasPermission(userId, 'create_announcement')) {
    return reply.code(403).send({ error: 'No permission' });
  }

  // Create announcement...
});
```

### 7. Get User Permissions

```typescript
app.get('/auth/me/permissions', {
  preHandler: app.auth
}, async (request, reply) => {
  const { userId } = (request as any).user;
  const permissions = await getUserPermissions(userId);
  return { permissions };
});
```

### 8. Check Multiple Permissions (OR)

```typescript
const canView = await hasAnyPermission(userId, [
  'view_reports',
  'manage_reports',
  'export_data'
]);
```

### 9. Check Multiple Permissions (AND)

```typescript
const canExport = await hasAllPermissions(userId, [
  'view_sensitive_data',
  'export_data'
]);
```

### 10. Manual RLS Context

```typescript
const { client, release } = await setRLSContext(userId);
try {
  const result = await client.query('SELECT * FROM volunteers');
  return result.rows;
} finally {
  await release();
}
```

## ⚠️ Common Mistakes

### ❌ Don't Do This

```typescript
// Missing app.auth
requireRole(['admin'])

// Direct permission check without error handling
hasPermission(userId, 'export') // No await, no error check

// Leaking role names in errors
message: `Need role: ${allowedRoles.join(', ')}`

// Not releasing RLS client
const { client } = await setRLSContext(userId);
await client.query('...');
// ⚠️ Memory leak!
```

### ✅ Do This

```typescript
// Always use app.auth first
preHandler: [app.auth, requireRole(['admin'])]

// Proper permission check
if (!await hasPermission(userId, 'export_data')) {
  return reply.code(403).send({ error: 'Insufficient permissions' });
}

// Generic error messages
message: 'Insufficient permissions'

// Always release client
const { client, release } = await setRLSContext(userId);
try {
  await client.query('...');
} finally {
  await release();
}
```

## 🎯 Role-Based Route Templates

### Volunteer Routes

```typescript
app.get('/tasks/available', {
  preHandler: [app.auth, requireRole(['volunteer'])]
}, handler);
```

### Coordinator Routes

```typescript
app.register(async (coordinatorRoutes) => {
  coordinatorRoutes.addHook('preHandler', app.auth);
  coordinatorRoutes.addHook('preHandler', requireRole([
    'ngo_coordinator',
    'regional_admin',
    'super_admin'
  ]));

  coordinatorRoutes.get('/volunteers/all', handler);
  coordinatorRoutes.post('/tasks/assign', handler);
  coordinatorRoutes.patch('/victims/:id/verify', handler);
}, { prefix: '/coordinator' });
```

### Admin Routes

```typescript
app.register(async (adminRoutes) => {
  adminRoutes.addHook('preHandler', app.auth);
  adminRoutes.addHook('preHandler', requireRole(['super_admin']));

  adminRoutes.get('/permissions', handler);
  adminRoutes.post('/users/:id/suspend', handler);
  adminRoutes.get('/audit-logs', handler);
}, { prefix: '/admin' });
```

### Analyst Routes

```typescript
app.register(async (analystRoutes) => {
  analystRoutes.addHook('preHandler', app.auth);
  analystRoutes.addHook('preHandler', requireRole([
    'data_analyst',
    'regional_admin',
    'super_admin'
  ]));

  analystRoutes.get('/analytics/dashboard', handler);
  analystRoutes.get('/analytics/volunteers', handler);
  analystRoutes.post('/analytics/export', {
    preHandler: requirePermission('export_data')
  }, handler);
}, { prefix: '/analytics' });
```

## 🔍 Debugging

### Check User Role

```sql
SELECT id, role, status FROM users WHERE id = 'user-uuid';
```

### Check User Permissions

```sql
SELECT user_has_permission('user-uuid', 'export_data');
```

### View Audit Logs

```sql
SELECT * FROM audit_logs
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Role Permissions

```sql
SELECT p.name
FROM permissions p
INNER JOIN role_permissions rp ON rp.permission_id = p.id
WHERE rp.role = 'volunteer';
```

## 📊 HTTP Status Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Access granted |
| 401 | Unauthorized | No JWT token or invalid token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 500 | Internal Server Error | Database or system error |

## 🛡️ Security Checklist

- [ ] Always use `app.auth` before RBAC middleware
- [ ] Use least privilege (minimum required roles)
- [ ] Combine role + permission checks for sensitive operations
- [ ] Never leak role names in error messages
- [ ] Always release RLS clients in finally blocks
- [ ] Log all access denials for audit
- [ ] Check account status (suspended/inactive)
- [ ] Use PostgreSQL RLS for data-level security

## 📚 More Information

- Full Documentation: `./README.md`
- Usage Examples: `./rbac.example.ts`
- Implementation: `./rbac.ts`

## 🆘 Help

**Problem:** "Authentication required" error
**Solution:** Add `app.auth` before RBAC middleware

**Problem:** "Insufficient permissions" error
**Solution:** Check user's role in database matches allowed roles

**Problem:** RLS not working
**Solution:** Use `setRLSContext()` or ensure RBAC middleware runs

**Problem:** Permission check returns false
**Solution:** Run migration 0007 to create `user_has_permission()` function
