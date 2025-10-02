# PUT /volunteer-registrations/:id Implementation

## Summary

This document describes the implementation of the `PUT /volunteer-registrations/:id` endpoint for updating volunteer registration status.

## Files Modified/Created

### 1. Migration File
**File**: `/home/thc1006/dev/shovel-heroes/packages/backend/migrations/0008_add_volunteer_registration_statuses.sql`

**Changes**:
- Added 'arrived' and 'completed' status values to the CHECK constraint
- Added `updated_at` column to track status changes
- Created trigger to auto-update `updated_at` timestamp
- Added RLS policy for UPDATE operations (users can update their own, admins can update any)

**Status Values**:
- `pending`: Initial state when user registers
- `confirmed`: Admin/coordinator approves the registration
- `arrived`: Volunteer checks in at the site
- `completed`: Volunteer completes their assigned task
- `cancelled`: User or admin cancels the registration

### 2. Route Implementation
**File**: `/home/thc1006/dev/shovel-heroes/packages/backend/src/routes/volunteer-registrations.ts`

**Changes**:
- Added `UpdateStatusSchema` Zod schema for validation
- Implemented `PUT /volunteer-registrations/:id` endpoint
- Authorization: Requires JWT authentication
- RLS enforcement: Only owner or admin can update

**Request Format**:
```typescript
PUT /volunteer-registrations/:id
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "confirmed" | "arrived" | "completed" | "cancelled"
}
```

**Response Format**:
```typescript
200 OK
{
  "id": "uuid",
  "volunteer_id": "uuid",
  "grid_id": "uuid",
  "disaster_area_id": "uuid",
  "status": "confirmed",
  "notes": "string",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid payload or status value
- `401 Unauthorized`: No auth token provided
- `404 Not Found`: Registration doesn't exist or user not authorized
- `500 Internal Server Error`: Database or server error

### 3. Test Suite
**File**: `/home/thc1006/dev/shovel-heroes/packages/backend/tests/integration/volunteer-registrations.test.ts`

**Test Coverage**:
- Authentication and Authorization (3 tests)
  - 401 when no token
  - 404 when non-existent registration
  - 404 when trying to update another user's registration
- Validation (2 tests)
  - 400 when status missing
  - 400 when invalid status value
- Status Transitions (7 tests)
  - pending → confirmed
  - confirmed → arrived
  - arrived → completed
  - Any status → cancelled (4 tests)
- Complete Flow (1 test)
  - pending → confirmed → arrived → completed
- Updated Timestamp (1 test)
- Response Format (1 test)

**Total**: 15 comprehensive tests

## How to Apply Changes

### Step 1: Run Migration

```bash
cd /home/thc1006/dev/shovel-heroes

# Apply the migration to development database
npm run migrate:up

# Or for production
NODE_ENV=production npm run migrate:up
```

### Step 2: Build Backend

```bash
cd /home/thc1006/dev/shovel-heroes/packages/backend
npm run build
```

### Step 3: Run Tests (Requires Test Database)

```bash
# Create test database first
createdb shovelheroes_test

# Apply migrations to test database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_test npm run migrate:up

# Run the test suite
npm test -- tests/integration/volunteer-registrations.test.ts

# Or run all tests
npm test
```

## API Usage Examples

### Example 1: User Updates Own Registration to Confirmed

```bash
# Get JWT token for user (after login)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Update registration status
curl -X PUT http://localhost:8787/volunteer-registrations/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}'
```

### Example 2: Complete Workflow

```bash
# 1. User registers (POST /volunteer-registrations)
# Status: pending

# 2. Admin confirms registration
curl -X PUT http://localhost:8787/volunteer-registrations/$REG_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"status": "confirmed"}'

# 3. Volunteer arrives and checks in
curl -X PUT http://localhost:8787/volunteer-registrations/$REG_ID \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"status": "arrived"}'

# 4. Volunteer completes task
curl -X PUT http://localhost:8787/volunteer-registrations/$REG_ID \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"status": "completed"}'
```

### Example 3: User Cancels Registration

```bash
# User can cancel from any status
curl -X PUT http://localhost:8787/volunteer-registrations/$REG_ID \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"status": "cancelled"}'
```

## Security Implementation

### Row-Level Security (RLS)

The migration creates an RLS policy for UPDATE operations:

```sql
CREATE POLICY volunteer_registrations_update_own ON volunteer_registrations
  FOR UPDATE
  USING (
    volunteer_id IN (SELECT id FROM volunteers WHERE user_id = app.current_user_id())
    OR app.is_admin()
  )
  WITH CHECK (
    volunteer_id IN (SELECT id FROM volunteers WHERE user_id = app.current_user_id())
    OR app.is_admin()
  );
```

This ensures:
1. Users can only update registrations where their `user_id` matches the volunteer's `user_id`
2. Admins can update any registration (when `app.is_admin()` returns true)
3. PostgreSQL enforces this at the database level, not just application level

### Authorization Flow

```
1. Request arrives with JWT token
2. Fastify auth middleware verifies JWT → extracts user_id
3. withConn() helper sets `app.user_id` in database session
4. UPDATE query executes
5. PostgreSQL RLS checks USING clause:
   - Is user_id == volunteer.user_id? OR
   - Is user an admin?
6. If yes: UPDATE succeeds, return updated row
   If no: UPDATE affects 0 rows, return 404
```

## Database Schema Changes

```sql
-- Before (0004_create_all_tables.sql)
status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled'))

-- After (0008_add_volunteer_registration_statuses.sql)
status TEXT CHECK (status IN ('pending', 'confirmed', 'arrived', 'completed', 'cancelled'))

-- Also added:
updated_at TIMESTAMPTZ DEFAULT NOW()
```

## Validation Rules

### Zod Schema
```typescript
const UpdateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'arrived', 'completed', 'cancelled'])
});
```

### Status Transition Rules
- **No restrictions on transitions** - any status can transition to any other status
- This allows flexibility for:
  - Admin corrections (e.g., confirmed → pending)
  - Cancellations from any state
  - Re-activation of cancelled registrations

### Recommended Workflow
```
pending → confirmed → arrived → completed
  ↓         ↓          ↓          ↓
  └─────────cancelled──────────────┘
```

## Integration with Existing Code

### Related Tables
- `volunteers`: Links registration to volunteer (which links to user)
- `grids`: The area where volunteer is assigned
- `disaster_areas`: Optional disaster area reference

### Related Endpoints
- `POST /volunteer-registrations`: Create new registration (status defaults to 'pending')
- `GET /volunteer-registrations`: List all registrations
- `DELETE /volunteer-registrations/:id`: Delete registration (owner only)

## Testing Without Database

For quick smoke testing without running full test suite:

```bash
# Start backend server
cd /home/thc1006/dev/shovel-heroes
npm run dev:api

# In another terminal, use curl
# (You'll need to create a user and get a real JWT token first)

# Test invalid status
curl -X PUT http://localhost:8787/volunteer-registrations/test-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "invalid"}' \
  -v
# Expected: 400 Bad Request

# Test missing auth
curl -X PUT http://localhost:8787/volunteer-registrations/test-id \
  -H "Content-Type: application/json" \
  -d '{"status": "confirmed"}' \
  -v
# Expected: 401 Unauthorized
```

## Future Enhancements

Potential improvements for future iterations:

1. **Status Transition Validation**: Enforce specific allowed transitions
   - e.g., can only go from pending → confirmed, not directly to completed

2. **Audit Trail**: Track who made each status change and when
   - Add `status_updated_by` and `status_updated_at` fields

3. **Notifications**: Send emails/SMS when status changes
   - confirmed: Send confirmation email to volunteer
   - arrived: Notify coordinator
   - completed: Send thank you message

4. **Batch Updates**: Allow updating multiple registrations at once
   - e.g., mark all confirmed registrations as arrived for an event

5. **Status History**: Keep complete history of all status changes
   - Create `volunteer_registration_status_history` table

## Troubleshooting

### Tests Fail with "database does not exist"
```bash
# Create test database
createdb shovelheroes_test

# Run migrations on test database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_test npm run migrate:up
```

### 404 Error When User Should Have Access
- Check that volunteer record exists for the user
- Verify `volunteer.user_id` matches authenticated user's ID
- Check RLS policy is enabled: `SELECT * FROM pg_policies WHERE tablename = 'volunteer_registrations';`

### updated_at Not Updating
- Verify trigger was created: `\d volunteer_registrations` in psql
- Check migration 0008 was applied: `SELECT * FROM pgmigrations;`

## References

- **OpenAPI Spec**: Should be updated to include PUT /volunteer-registrations/:id
- **CLAUDE.md**: Follow TDD principles, write tests before implementation
- **Migration System**: node-pg-migrate for database schema changes
- **RLS Documentation**: PostgreSQL Row-Level Security for authorization
