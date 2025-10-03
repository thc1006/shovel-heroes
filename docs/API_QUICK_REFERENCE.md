# Shovel Heroes API Quick Reference

**Version:** 0.2.0
**Base URL:** `http://localhost:8787` (dev) | `https://your.api.server` (prod)
**Last Updated:** 2025-10-03

---

## Authentication

All protected endpoints require JWT Bearer token in Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

### Auth Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/register` | POST | ❌ | Register new user |
| `/auth/login` | POST | ❌ | Login (phone+OTP or email+password) |
| `/auth/logout` | POST | ❌ | Logout and revoke session |
| `/auth/refresh` | POST | ❌ | Refresh access token |
| `/auth/request-otp` | POST | ❌ | Request OTP for phone |
| `/auth/verify-otp` | POST | ❌ | Verify OTP code |

**User Roles:**
- `volunteer` - 志工
- `victim` - 災民
- `ngo_coordinator` - NGO 協調員 / 格主
- `regional_admin` - 區域管理員
- `data_analyst` - 資料分析師
- `super_admin` - 超級管理員

---

## Admin Panel

**Required Role:** `ngo_coordinator`, `regional_admin`, or `super_admin`

| Endpoint | Method | Auth | Min Role | Description |
|----------|--------|------|----------|-------------|
| `/admin/users` | GET | ✅ | coordinator | List all users |
| `/admin/users/:user_id` | GET | ✅ | coordinator | Get user details |
| `/admin/users/:user_id/status` | PATCH | ✅ | coordinator | Update user status |
| `/admin/users/:user_id` | DELETE | ✅ | **super_admin** | Delete user |
| `/admin/verify-victim` | POST | ✅ | coordinator | Verify victim identity |
| `/admin/audit-logs` | GET | ✅ | coordinator | Get audit logs |
| `/admin/audit-logs/export` | GET | ✅ | coordinator | Export logs as CSV |
| `/admin/stats` | GET | ✅ | coordinator | Dashboard statistics |
| `/admin/recent-activity` | GET | ✅ | coordinator | Recent activity feed |

---

## Disaster Areas

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/disaster-areas` | GET | ❌ | List all disaster areas |
| `/disaster-areas` | POST | ✅ | Create disaster area |
| `/disaster-areas/:id` | GET | ❌ | Get single disaster area |
| `/disaster-areas/:id` | PUT | ✅ | Update disaster area |
| `/disaster-areas/:id` | DELETE | ✅ | Delete disaster area |

---

## Grids (救援網格)

| Endpoint | Method | Auth | Query Params | Description |
|----------|--------|------|--------------|-------------|
| `/grids` | GET | ❌ | `area_id`, `limit`, `offset` | List all grids |
| `/grids` | POST | ✅ | - | Create new grid |
| `/grids/:id` | GET | ❌ | - | Get single grid |
| `/grids/:id` | PUT | ✅ | - | Update grid |
| `/grids/:id` | DELETE | ✅ | - | Delete grid (cascade) |

**Grid Types:**
- `mud_disposal` - 土石清運
- `manpower` - 人力需求
- `supply_storage` - 物資存放
- `accommodation` - 住宿安置
- `food_area` - 飲食區

**Grid Status:**
- `open` - 開放中
- `closed` - 已關閉
- `completed` - 已完成
- `in_progress` - 進行中
- `preparing` - 準備中

---

## Volunteer Registrations

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/volunteer-registrations` | GET | ❌ | List all registrations |
| `/volunteer-registrations` | POST | ✅ | Register for grid |
| `/volunteer-registrations/:id` | PUT | ✅ | Update registration status |
| `/volunteer-registrations/:id` | DELETE | ✅ | Cancel registration |

**Registration Status:**
- `pending` - 待確認
- `confirmed` - 已確認
- `arrived` - 已到達
- `completed` - 已完成
- `cancelled` - 已取消

---

## Volunteers (Aggregate View)

| Endpoint | Method | Auth | Query Params | Description |
|----------|--------|------|--------------|-------------|
| `/volunteers` | GET | ❌ | `grid_id`, `status`, `limit`, `offset`, `include_counts` | List volunteers with details |

**Response includes:**
- `data[]` - Volunteer list items
- `can_view_phone` - Boolean (based on user role)
- `total` - Total count
- `status_counts` - Count by status
- `page`, `limit` - Pagination info

**Phone Number Privacy:**
- Unauthenticated users: ❌ Cannot view
- Regular users: ❌ Cannot view
- Grid Managers (ngo_coordinator): ✅ Can view for their grids only
- Admins (regional_admin, super_admin): ✅ Can view all

---

## Supply Donations

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/supply-donations` | GET | ❌ | List all donations |
| `/supply-donations` | POST | ✅ | Record new donation |
| `/supply-donations/:id` | PUT | ✅ | Update donation |
| `/supply-donations/:id` | DELETE | ✅ | Delete donation |

**Donation Status:**
- `pending` - 待確認
- `confirmed` - 已確認
- `delivered` - 已送達

---

## Grid Discussions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/grid-discussions` | GET | ❌ | List all discussions |
| `/grid-discussions` | POST | ✅ | Post new message |

---

## Announcements

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/announcements` | GET | ❌ | List published announcements |
| `/announcements` | POST | ✅ | Create announcement |
| `/announcements/:id` | PUT | ✅ | Update announcement |
| `/announcements/:id` | DELETE | ✅ | Delete announcement |

**Priority Levels:**
- `low` - 低
- `normal` - 普通
- `high` - 高
- `urgent` - 緊急

---

## Users

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/users` | GET | ❌ | List all users |
| `/me` | GET | ✅ | Get current authenticated user |

---

## Functions (Import/Export)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/functions/fix-grid-bounds` | POST | ✅ | Normalize grid bounds |
| `/functions/export-grids-csv` | GET | ❌ | Export grids as CSV |
| `/functions/import-grids-csv` | POST | ❌ | Import grids from CSV |
| `/functions/grid-template` | GET | ❌ | Download blank CSV template |
| `/functions/external-grid-api` | POST | ❌ | Proxy to external grid API |
| `/functions/external-volunteer-api` | POST | ❌ | Proxy to external volunteer API |

---

## Legacy (v2 Compatibility)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v2/sync` | POST | ❌ | Sync with legacy system |
| `/api/v2/roster` | GET | ❌ | Get legacy roster |

---

## Health Check

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/healthz` | GET | ❌ | System and database health |

**Response:**
```json
{
  "status": "ok",
  "db": "ok"
}
```

---

## Common Response Codes

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request body/params |
| 401 | Unauthorized | Missing or invalid JWT token |
| 403 | Forbidden | Insufficient permissions (RBAC) |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry (e.g., email exists) |
| 423 | Locked | Account locked (too many failed logins) |
| 500 | Internal Server Error | Server error |

---

## Pagination

Most list endpoints support pagination:

**Query Parameters:**
- `limit` - Items per page (default: 50, max: 200)
- `offset` - Skip N items (default: 0)

**Example:**
```
GET /grids?limit=20&offset=40
```

---

## Example Requests

### Register as Volunteer
```bash
curl -X POST http://localhost:8787/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "0912345678",
    "role": "volunteer",
    "full_name": "張小強"
  }'
```

### Login with OTP
```bash
# Step 1: Request OTP
curl -X POST http://localhost:8787/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "0912345678",
    "purpose": "login"
  }'

# Step 2: Login with OTP
curl -X POST http://localhost:8787/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "0912345678",
    "otp": "123456"
  }'
```

### Get Grids for Disaster Area
```bash
curl http://localhost:8787/grids?area_id=550e8400-e29b-41d4-a716-446655440000
```

### Register for Grid (Requires Auth)
```bash
curl -X POST http://localhost:8787/volunteer-registrations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "grid_id": "550e8400-e29b-41d4-a716-446655440000",
    "volunteer_id": "660e8400-e29b-41d4-a716-446655440001"
  }'
```

### Admin: List Users (Requires Coordinator+)
```bash
curl http://localhost:8787/admin/users?role=volunteer&status=active \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN"
```

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store JWT tokens securely** (HttpOnly cookies recommended)
3. **Refresh tokens before expiry** (access token: 24h, refresh: 7d)
4. **Never log or expose sensitive data** (passwords, full phone numbers, PII)
5. **Implement rate limiting** on auth endpoints
6. **Use CORS allowlist** in production
7. **Validate all inputs** on both client and server
8. **Audit all admin actions** (automatic via audit_logs table)

---

## Need Help?

- **OpenAPI Spec:** `/api-spec/openapi.yaml`
- **Validation Report:** `/docs/API_SPEC_VALIDATION_REPORT.md`
- **Update Summary:** `/docs/OPENAPI_UPDATE_SUMMARY.md`
- **Backend Code:** `/packages/backend/src/routes/`

---

**Generated:** 2025-10-03
**API Version:** 0.2.0
**Documentation:** Complete and verified ✅
