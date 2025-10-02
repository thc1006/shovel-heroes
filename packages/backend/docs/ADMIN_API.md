# Admin API Documentation

This document describes the administrative API endpoints for the Shovel Heroes platform.

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Endpoints](#endpoints)
   - [List Users](#get-adminusers)
   - [Verify Victim](#post-adminverify-victim)
   - [Audit Logs](#get-adminaudit-logs)
   - [Update User Status](#patch-adminusersidstatus)
   - [Dashboard Statistics](#get-adminstats)
4. [Error Handling](#error-handling)
5. [Security](#security)

## Authentication

All admin endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Authorization

Admin endpoints use Role-Based Access Control (RBAC):

- **ngo_coordinator**: Can list users, verify victims, view audit logs, view stats
- **regional_admin**: Same as ngo_coordinator
- **super_admin**: All coordinator permissions + update user status

## Endpoints

### GET /admin/users

List all users with filtering and pagination.

**Access:** ngo_coordinator, regional_admin, super_admin

**Query Parameters:**

| Parameter | Type   | Required | Default | Description                           |
|-----------|--------|----------|---------|---------------------------------------|
| page      | number | No       | 1       | Page number (min: 1)                  |
| limit     | number | No       | 20      | Results per page (min: 1, max: 100)   |
| role      | string | No       | -       | Filter by role (volunteer, victim, etc) |
| status    | string | No       | -       | Filter by status (active, suspended, etc) |
| search    | string | No       | -       | Search by email or phone number       |

**Response:**

```json
{
  "users": [
    {
      "id": "uuid",
      "role": "volunteer",
      "status": "active",
      "email": "user@example.com",
      "phone_number": "1234567890",
      "created_at": "2024-01-01T00:00:00Z",
      "last_login_at": "2024-01-02T00:00:00Z",
      "phone_verified": true,
      "email_verified": true,
      "identity_verified": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/admin/users?page=1&limit=20&role=volunteer&status=active" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### POST /admin/verify-victim

Verify victim identity and update verification status.

**Access:** ngo_coordinator, regional_admin, super_admin

**Request Body:**

```json
{
  "user_id": "uuid",
  "action": "approve | reject | need_more_info",
  "notes": "Optional verification notes"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Victim verified successfully",
  "victim_profile": {
    "user_id": "uuid",
    "verification_status": "approved",
    "verification_notes": "Verified successfully",
    "reviewed_by": "admin-uuid",
    "reviewed_at": "2024-01-02T00:00:00Z"
  }
}
```

**Actions:**

- **approve**: Set verification_status = 'approved', set identity_verified = true
- **reject**: Set verification_status = 'rejected'
- **need_more_info**: Set verification_status = 'need_more_info'

**Audit Logging:**

All verification actions are logged to the `audit_logs` table with:
- Admin user ID
- Victim user ID
- Action taken
- IP address
- Old/new verification status

**Example:**

```bash
curl -X POST "http://localhost:3000/admin/verify-victim" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "victim-uuid",
    "action": "approve",
    "notes": "Identity verified via government ID"
  }'
```

---

### GET /admin/audit-logs

Get audit logs with filtering and pagination.

**Access:** ngo_coordinator, regional_admin, super_admin

**Query Parameters:**

| Parameter  | Type   | Required | Default | Description                    |
|------------|--------|----------|---------|--------------------------------|
| page       | number | No       | 1       | Page number                    |
| limit      | number | No       | 20      | Results per page (max: 100)    |
| user_id    | string | No       | -       | Filter by user UUID            |
| action     | string | No       | -       | Filter by action type          |
| start_date | string | No       | -       | Filter by start date (ISO8601) |
| end_date   | string | No       | -       | Filter by end date (ISO8601)   |

**Response:**

```json
{
  "logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "user_role": "super_admin",
      "action": "verify_victim_approve",
      "resource_type": "victim_profile",
      "resource_id": "uuid",
      "ip_address": "192.168.1.1",
      "created_at": "2024-01-02T00:00:00Z",
      "is_suspicious": false,
      "risk_level": "low"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/admin/audit-logs?user_id=admin-uuid&action=verify_victim_approve" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

### PATCH /admin/users/:id/status

Update user status (suspend, activate, or deactivate).

**Access:** super_admin ONLY

**URL Parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| id        | string | Yes      | User UUID   |

**Request Body:**

```json
{
  "status": "active | suspended | inactive",
  "reason": "Optional reason for status change"
}
```

**Response:**

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "role": "volunteer",
    "status": "suspended",
    "email": "user@example.com",
    "phone_number": "1234567890",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

**Behavior:**

- If status is set to **suspended**, all user sessions are revoked
- Users cannot change their own status
- Action is logged to audit_logs

**Example:**

```bash
curl -X PATCH "http://localhost:3000/admin/users/user-uuid/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "suspended",
    "reason": "Violated terms of service"
  }'
```

---

### GET /admin/stats

Get admin dashboard statistics.

**Access:** ngo_coordinator, regional_admin, super_admin

**Response:**

```json
{
  "users": {
    "total": 1000,
    "byRole": {
      "volunteer": 600,
      "victim": 350,
      "ngo_coordinator": 40,
      "regional_admin": 8,
      "super_admin": 2
    },
    "byStatus": {
      "active": 900,
      "suspended": 20,
      "pending_verification": 80
    },
    "newToday": 15,
    "newThisWeek": 87
  },
  "volunteers": {
    "total": 600,
    "active": 550,
    "registered_to_grids": 420
  },
  "victims": {
    "total": 350,
    "pending_verification": 45,
    "approved": 280,
    "rejected": 15,
    "need_more_info": 10
  },
  "security": {
    "failed_logins_today": 12,
    "suspicious_activity": 3,
    "locked_accounts": 2
  }
}
```

**Example:**

```bash
curl -X GET "http://localhost:3000/admin/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Error Handling

All endpoints return standard error responses:

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found

```json
{
  "error": "User not found"
}
```

### 400 Bad Request

```json
{
  "error": "Cannot change your own status"
}
```

### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Access control check failed"
}
```

---

## Security

### Audit Logging

All admin actions are logged to the `audit_logs` table with:
- User ID and role
- Action performed
- Resource affected
- IP address and user agent
- Timestamp
- Old/new values (for updates)
- Risk level and suspicious flag

### RLS (Row-Level Security)

All database queries automatically enforce PostgreSQL RLS policies:
- `app.user_id` is set to the authenticated user's UUID
- `app.user_role` is set to the user's role
- Policies prevent unauthorized data access

### Rate Limiting

(To be implemented)

### CORS

(Configure allowed origins in production)

---

## Implementation Files

- **Routes**: `/packages/backend/src/routes/admin.ts`
- **Middleware**: `/packages/backend/src/middleware/rbac.ts`
- **Tests**: `/packages/backend/tests/routes/admin.test.ts`
- **Migrations**: `/packages/backend/migrations/0007_create_auth_system_fixed.sql`

---

## Testing

Run the test suite:

```bash
cd packages/backend
npm test tests/routes/admin.test.ts
```

---

## Notes

- All endpoints use Zod for input validation
- Database queries use parameterized queries to prevent SQL injection
- Sessions are revoked when users are suspended
- Admins cannot modify their own status
- All mutations are logged for compliance
