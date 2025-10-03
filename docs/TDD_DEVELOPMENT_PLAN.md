# Shovel Heroes - TDD Development Plan

> **Version**: 1.0.0
> **Last Updated**: 2025-10-03
> **Methodology**: SPARC + Test-Driven Development
> **Status**: Active Development

---

## Executive Summary

This plan outlines a comprehensive, phase-based approach to developing Shovel Heroes backend using **Test-Driven Development (TDD)** principles. All development follows the **OpenAPI 3.2.0 specification** as the single source of truth, with strict adherence to security-first practices (JWT, RBAC, RLS).

### Core Principles

1. **TDD First**: Write tests before implementation
2. **OpenAPI Driven**: All endpoints match `api-spec/openapi.yaml`
3. **Security First**: JWT authentication, RBAC, PostgreSQL RLS policies
4. **No Base44**: Self-hosted REST + PostgreSQL only
5. **Atomic PRs**: Small, focused pull requests with clear acceptance criteria

### Success Metrics

- ✅ **Test Coverage**: >90% for all routes
- ✅ **OpenAPI Compliance**: 100% alignment with spec
- ✅ **Security**: Zero exposed PII without proper authorization
- ✅ **Performance**: <100ms average response time for CRUD operations
- ✅ **RLS Validation**: All multi-tenant data properly isolated

---

## Phase Structure Overview

| Phase | Focus | Duration | Priority | Status |
|-------|-------|----------|----------|--------|
| [Phase 0](#phase-0--repository-initialization--governance) | Repo Initialization & Governance | 2 days | CRITICAL | ⚠️ In Progress |
| [Phase 1](#phase-1--openapi-driven-type-generation) | OpenAPI Driven + Type Generation | 2 days | HIGH | 🔜 Pending |
| [Phase 2](#phase-2--backend-tdd-core-crud) | Backend TDD (Core CRUD) | 5 days | HIGH | 🔜 Pending |
| [Phase 3](#phase-3--authentication--authorization) | Authentication & Authorization | 4 days | CRITICAL | 🔜 Pending |
| [Phase 4](#phase-4--advanced-features--business-logic) | Advanced Features & Business Logic | 5 days | MEDIUM | 🔜 Pending |
| [Phase 5](#phase-5--observability--deployment) | Observability & Deployment | 3 days | MEDIUM | 🔜 Pending |

**Total Estimated Duration**: 21 working days (4-5 weeks)

---

## Phase 0 — Repository Initialization & Governance

**Goal**: Establish development standards, CI/CD pipelines, and project governance.

### 0.1 Codebase Health Check

**Agent Assignment**: `code-analyzer`, `reviewer`

**Tasks**:

1. ✅ Validate OpenAPI 3.2.0 syntax
   - Run: `pnpm openapi:lint` (Spectral)
   - Validate all `$ref` references resolve correctly
   - Check for unused schemas/parameters

2. ✅ Verify ESLint/Prettier configuration
   - Ensure `.eslintrc.js` and `.prettierrc` exist
   - Add missing rules for TypeScript strict mode
   - Configure Vitest globals

3. ✅ Create CONTRIBUTING.md
   - Define PR template with acceptance criteria
   - Document TDD workflow
   - Establish commit message conventions (Conventional Commits)

4. ✅ Add CODEOWNERS
   - Define review requirements by file path
   - Assign backend routes to backend team
   - Protect critical files (migrations, auth)

**Test Requirements**:
```bash
# Acceptance Tests
npm run openapi:lint          # Must pass
npm run lint                  # No errors
npm run format:check          # All files formatted
```

**Deliverables**:
- [ ] `CONTRIBUTING.md` with TDD workflow
- [ ] `.github/CODEOWNERS` file
- [ ] Updated `.eslintrc.js` with strict rules
- [ ] CI passes on all checks

**Dependencies**: None
**Estimated Time**: 4 hours
**Priority**: P0 (Blocker)

---

### 0.2 CI Pipeline Enhancement

**Agent Assignment**: `cicd-engineer`, `github-modes`

**Tasks**:

1. ✅ Add Node.js 20 matrix testing
   - Test on Node 20.x, 22.x
   - Cache `pnpm` dependencies
   - Run migrations in CI environment

2. ✅ OpenAPI artifact generation
   - Generate `redoc-static.html`
   - Upload as GitHub Actions artifact
   - Make downloadable for manual review

3. ✅ Test coverage reporting
   - Generate coverage with Vitest
   - Upload to Codecov/Coveralls (optional)
   - Fail if coverage < 90%

4. ✅ Security scanning
   - Add `npm audit` check
   - Scan for leaked secrets (truffleHog/gitleaks)
   - Validate `.env.example` completeness

**Test Requirements**:
```yaml
# .github/workflows/ci.yml
- name: Test with coverage
  run: npm run test:coverage
- name: Check coverage threshold
  run: |
    coverage=$(jq -r '.total.lines.pct' coverage/coverage-summary.json)
    if (( $(echo "$coverage < 90" | bc -l) )); then
      echo "Coverage $coverage% is below 90%"
      exit 1
    fi
```

**Deliverables**:
- [ ] Enhanced `.github/workflows/ci.yml`
- [ ] Coverage threshold enforcement
- [ ] Redoc artifact generation
- [ ] Security scan integration

**Dependencies**: 0.1
**Estimated Time**: 6 hours
**Priority**: P0 (Blocker)

---

## Phase 1 — OpenAPI Driven + Type Generation

**Goal**: Ensure OpenAPI spec is complete and generate TypeScript types for shared use.

### 1.1 Expand OpenAPI Schemas

**Agent Assignment**: `api-docs`, `specification`

**Tasks**:

1. ✅ Audit existing schemas vs. database columns
   - Compare `components.schemas.Grid` with `grids` table
   - Add missing fields: `grid_manager_id`, `updated_at`
   - Ensure all enums match database constraints

2. ✅ Add request/response examples
   - Provide realistic examples for all POST/PUT bodies
   - Include error response examples (400/401/404/500)
   - Document query parameter behavior

3. ✅ Define reusable components
   - Extract common patterns (pagination, timestamps)
   - Create `components.parameters` for shared params
   - Standardize error schema

4. ✅ Validate with real database schema
   - Cross-reference with `migrations/*.sql`
   - Ensure JSONB fields documented correctly
   - Match PostgreSQL data types to OpenAPI types

**Test Requirements**:
```bash
# Automated Tests
npm run openapi:lint              # Spectral rules pass
npm run openapi:preview           # Redocly renders without errors

# Manual Review Checklist
- [ ] All database columns mapped to schemas
- [ ] All endpoints have 2xx and error responses
- [ ] Examples are realistic and helpful
- [ ] Security requirements documented
```

**Deliverables**:
- [ ] Updated `api-spec/openapi.yaml` (v0.3.0)
- [ ] All schemas validated against migrations
- [ ] Comprehensive examples for all operations
- [ ] Validation rules documented (Zod alignment)

**Dependencies**: Phase 0
**Estimated Time**: 8 hours
**Priority**: P1 (High)

---

### 1.2 TypeScript Type Generation

**Agent Assignment**: `coder`, `base-template-generator`

**Tasks**:

1. ✅ Setup `openapi-typescript` tooling
   - Install `openapi-typescript` package
   - Create generation script in `packages/shared-types/`
   - Configure output path and naming conventions

2. ✅ Generate types from OpenAPI
   - Run: `pnpm types:openapi`
   - Output to `packages/shared-types/src/openapi.d.ts`
   - Ensure tree-shakable exports

3. ✅ Integrate types in backend
   - Import schemas in route handlers
   - Type Fastify request/reply objects
   - Use for Zod schema generation

4. ✅ Validate type alignment
   - Ensure no TypeScript compilation errors
   - Check runtime schema validation matches
   - Document type usage patterns

**Test Requirements**:
```typescript
// Type Safety Test
import { components } from '@shovel/shared-types';

type Grid = components['schemas']['Grid'];

const grid: Grid = {
  id: 'grid_123',
  code: 'A-1',
  grid_type: 'manpower', // ✅ Type-safe enum
  // TypeScript will error on missing required fields
};

// Compilation Test
npm run build  # Must succeed with no type errors
```

**Deliverables**:
- [ ] `packages/shared-types/package.json` with scripts
- [ ] Generated `openapi.d.ts` file
- [ ] Backend imports using shared types
- [ ] Documentation of type usage

**Dependencies**: 1.1
**Estimated Time**: 4 hours
**Priority**: P1 (High)

---

### 1.3 Redoc API Documentation Preview

**Agent Assignment**: `api-docs`

**Tasks**:

1. ✅ Setup Redoc preview server
   - Run: `redocly preview-docs api-spec/openapi.yaml`
   - Verify all endpoints render correctly
   - Check parameter documentation clarity

2. ✅ Visual validation checklist
   - [ ] All HTTP methods shown with correct colors
   - [ ] Request/response schemas expandable
   - [ ] Examples are copy-pasteable
   - [ ] Authentication requirements visible

3. ✅ Fix rendering issues
   - Resolve broken `$ref` links
   - Ensure Markdown in descriptions renders
   - Validate nested schema display

**Test Requirements**:
```bash
# Manual Review
redocly preview-docs api-spec/openapi.yaml --port 8080

# Checklist
- [ ] /disaster-areas renders all CRUD operations
- [ ] /grids shows proper enum values
- [ ] /volunteers displays can_view_phone logic
- [ ] Security schemes are documented
```

**Deliverables**:
- [ ] Validated API documentation preview
- [ ] Screenshot of key endpoints
- [ ] List of documentation improvements

**Dependencies**: 1.1
**Estimated Time**: 2 hours
**Priority**: P2 (Medium)

---

## Phase 2 — Backend TDD (Core CRUD)

**Goal**: Implement core CRUD operations with comprehensive test coverage using TDD methodology.

### 2.1 Test-First: Disaster Areas CRUD

**Agent Assignment**: `tester`, `backend-dev`

**TDD Cycle**:

**🔴 RED: Write Failing Tests**

```typescript
// packages/backend/tests/routes/disaster-areas.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../helpers/app';
import type { FastifyInstance } from 'fastify';

describe('GET /disaster-areas', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return 200 with array of disaster areas', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/disaster-areas',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeInstanceOf(Array);
  });

  it('should return disaster areas with required fields', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/disaster-areas',
    });

    const areas = response.json();
    if (areas.length > 0) {
      expect(areas[0]).toHaveProperty('id');
      expect(areas[0]).toHaveProperty('name');
      expect(areas[0]).toHaveProperty('center_lat');
      expect(areas[0]).toHaveProperty('center_lng');
      expect(areas[0]).toHaveProperty('created_at');
    }
  });

  it('should support pagination with limit and offset', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/disaster-areas?limit=10&offset=0',
    });

    expect(response.statusCode).toBe(200);
  });
});

describe('POST /disaster-areas', () => {
  it('should return 401 without authentication', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      payload: {
        name: 'Test Area',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('should return 201 with valid JWT token', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    const response = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Test Area',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toHaveProperty('id');
  });

  it('should return 400 with invalid coordinates', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    const response = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        name: 'Invalid Area',
        center_lat: 91, // ❌ Out of range (-90 to 90)
        center_lng: 121.578,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toHaveProperty('message');
  });
});

describe('PUT /disaster-areas/:id', () => {
  it('should update disaster area with valid data', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    // First create
    const createRes = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Original Name',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    const { id } = createRes.json();

    // Then update
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/disaster-areas/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Updated Name',
        center_lat: 23.8752,
        center_lng: 121.579,
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.json().name).toBe('Updated Name');
  });
});

describe('DELETE /disaster-areas/:id', () => {
  it('should delete disaster area and cascade to grids', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    // Create area
    const createRes = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'To Delete',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    const { id } = createRes.json();

    // Delete
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/disaster-areas/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(deleteRes.statusCode).toBe(204);

    // Verify deleted
    const getRes = await app.inject({
      method: 'GET',
      url: `/disaster-areas/${id}`,
    });

    expect(getRes.statusCode).toBe(404);
  });
});
```

**🟢 GREEN: Implement Minimum Code**

```typescript
// packages/backend/src/routes/disaster-areas.ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const DisasterAreaSchema = z.object({
  name: z.string().min(1).max(255),
  center_lat: z.number().min(-90).max(90),
  center_lng: z.number().min(-180).max(180),
});

export const disasterAreasRoutes: FastifyPluginAsync = async (app) => {
  // GET /disaster-areas
  app.get('/disaster-areas', async (req, reply) => {
    const { limit = 50, offset = 0 } = req.query as any;

    const result = await app.db.query(
      `SELECT * FROM disaster_areas
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  });

  // POST /disaster-areas
  app.post('/disaster-areas', {
    preHandler: [app.authenticate, app.requireRole(['admin'])],
  }, async (req, reply) => {
    const data = DisasterAreaSchema.parse(req.body);

    const result = await app.db.query(
      `INSERT INTO disaster_areas (name, center_lat, center_lng)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.center_lat, data.center_lng]
    );

    reply.code(201);
    return result.rows[0];
  });

  // PUT /disaster-areas/:id
  app.put('/disaster-areas/:id', {
    preHandler: [app.authenticate, app.requireRole(['admin'])],
  }, async (req, reply) => {
    const { id } = req.params as any;
    const data = DisasterAreaSchema.parse(req.body);

    const result = await app.db.query(
      `UPDATE disaster_areas
       SET name = $1, center_lat = $2, center_lng = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [data.name, data.center_lat, data.center_lng, id]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return { message: 'Disaster area not found' };
    }

    return result.rows[0];
  });

  // DELETE /disaster-areas/:id
  app.delete('/disaster-areas/:id', {
    preHandler: [app.authenticate, app.requireRole(['admin'])],
  }, async (req, reply) => {
    const { id } = req.params as any;

    const result = await app.db.query(
      'DELETE FROM disaster_areas WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      reply.code(404);
      return { message: 'Disaster area not found' };
    }

    reply.code(204);
  });
};
```

**🔵 REFACTOR: Improve Code Quality**

1. Extract validation schemas to separate file
2. Add request/response type definitions
3. Implement error handling middleware
4. Add audit logging for mutations

**Acceptance Criteria**:
- [ ] All tests pass (100% coverage)
- [ ] No TypeScript compilation errors
- [ ] OpenAPI spec matches implementation
- [ ] Database constraints validated
- [ ] Audit logs generated for POST/PUT/DELETE

**Deliverables**:
- [ ] `tests/routes/disaster-areas.test.ts` (15+ tests)
- [ ] `src/routes/disaster-areas.ts` implementation
- [ ] `src/schemas/disaster-areas.ts` validation schemas
- [ ] Migration validated

**Dependencies**: Phase 1
**Estimated Time**: 6 hours
**Priority**: P1 (High)

---

### 2.2 Test-First: Grids CRUD + Business Logic

**Agent Assignment**: `tester`, `backend-dev`

**TDD Focus**: Grid-specific business logic with volunteer count management

**🔴 RED: Write Failing Tests**

```typescript
// packages/backend/tests/routes/grids.test.ts
describe('Grid Business Logic', () => {
  describe('volunteer_registered auto-increment', () => {
    it('should increment when volunteer registration confirmed', async () => {
      const token = await generateTestToken(app, { role: 'user' });

      // Create grid with 0 volunteers
      const gridRes = await createTestGrid(app, {
        volunteer_needed: 10,
        volunteer_registered: 0,
      });
      const { id: gridId } = gridRes.json();

      // Register volunteer
      await app.inject({
        method: 'POST',
        url: '/volunteer-registrations',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          grid_id: gridId,
          user_id: 'user_123',
        },
      });

      // Confirm registration (should trigger +1)
      const regRes = await app.inject({
        method: 'PUT',
        url: `/volunteer-registrations/${registrationId}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { status: 'confirmed' },
      });

      // Verify grid updated
      const gridCheck = await app.inject({
        method: 'GET',
        url: `/grids/${gridId}`,
      });

      expect(gridCheck.json().volunteer_registered).toBe(1);
    });

    it('should decrement when registration cancelled', async () => {
      // Similar test for decrement logic
    });

    it('should not allow volunteer_registered > volunteer_needed', async () => {
      // Test business constraint
    });
  });

  describe('Grid type-specific validation', () => {
    it('should require supplies_needed for supply_storage grids', async () => {
      const token = await generateTestToken(app, { role: 'grid_manager' });

      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          code: 'S-1',
          grid_type: 'supply_storage',
          disaster_area_id: 'area_123',
          // ❌ Missing supplies_needed
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().message).toContain('supplies_needed');
    });

    it('should require volunteer_needed for manpower grids', async () => {
      // Test validation
    });
  });

  describe('Bounds validation', () => {
    it('should validate bounds form a valid rectangle', async () => {
      const token = await generateTestToken(app, { role: 'grid_manager' });

      const response = await app.inject({
        method: 'POST',
        url: '/grids',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          code: 'A-1',
          grid_type: 'manpower',
          disaster_area_id: 'area_123',
          bounds: {
            north: 23.874, // ❌ north < south
            south: 23.876,
            east: 121.579,
            west: 121.577,
          },
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
```

**🟢 GREEN: Implement Business Logic**

```typescript
// packages/backend/src/routes/grids.ts
import { GridValidator } from '../validators/grid-validator';

export const gridsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/grids', {
    preHandler: [app.authenticate, app.requireRole(['admin', 'grid_manager'])],
  }, async (req, reply) => {
    const data = req.body as any;

    // Type-specific validation
    if (data.grid_type === 'supply_storage') {
      if (!data.supplies_needed || data.supplies_needed.length === 0) {
        reply.code(400);
        return { message: 'supply_storage grids must have supplies_needed' };
      }
    }

    if (data.grid_type === 'manpower') {
      if (!data.volunteer_needed || data.volunteer_needed < 1) {
        reply.code(400);
        return { message: 'manpower grids must specify volunteer_needed' };
      }
    }

    // Bounds validation
    if (data.bounds) {
      const { north, south, east, west } = data.bounds;
      if (north <= south || east <= west) {
        reply.code(400);
        return { message: 'Invalid bounds: north must be > south, east must be > west' };
      }
    }

    // Insert
    const result = await app.db.query(
      `INSERT INTO grids (
        code, grid_type, disaster_area_id,
        volunteer_needed, volunteer_registered,
        center_lat, center_lng, bounds, status,
        supplies_needed, meeting_point, risks_notes, contact_info
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.code,
        data.grid_type,
        data.disaster_area_id,
        data.volunteer_needed || 0,
        data.volunteer_registered || 0,
        data.center_lat,
        data.center_lng,
        JSON.stringify(data.bounds),
        data.status || 'open',
        data.supplies_needed ? JSON.stringify(data.supplies_needed) : null,
        data.meeting_point,
        data.risks_notes,
        data.contact_info,
      ]
    );

    reply.code(201);
    return result.rows[0];
  });

  // Additional routes...
};
```

**🔵 REFACTOR**:
1. Extract `GridValidator` class for complex validation
2. Add database constraints for integrity
3. Implement optimistic locking for concurrent updates
4. Add comprehensive error messages

**Acceptance Criteria**:
- [ ] All grid types validated correctly
- [ ] Volunteer count logic transactional
- [ ] Bounds validation prevents invalid rectangles
- [ ] Database constraints match application logic
- [ ] 95%+ test coverage

**Deliverables**:
- [ ] `tests/routes/grids.test.ts` (25+ tests)
- [ ] `src/routes/grids.ts` with business logic
- [ ] `src/validators/grid-validator.ts`
- [ ] Database triggers for volunteer_registered

**Dependencies**: 2.1
**Estimated Time**: 10 hours
**Priority**: P1 (High)

---

### 2.3 Test-First: Volunteer Registrations

**Agent Assignment**: `tester`, `backend-dev`

**TDD Focus**: Registration workflow with status transitions

**Key Test Cases**:

```typescript
describe('Volunteer Registration Workflow', () => {
  it('should follow valid status transitions', async () => {
    // pending -> confirmed ✅
    // confirmed -> arrived ✅
    // arrived -> completed ✅
    // confirmed -> cancelled ✅
    // pending -> cancelled ✅
    // cancelled -> confirmed ❌ (invalid)
    // completed -> pending ❌ (invalid)
  });

  it('should prevent duplicate registrations', async () => {
    // Same user_id + grid_id should fail
  });

  it('should update grid volunteer_registered on status change', async () => {
    // pending -> confirmed: +1
    // confirmed -> cancelled: -1
    // pending -> cancelled: no change
  });

  it('should enforce grid capacity limits', async () => {
    // Cannot confirm if volunteer_registered >= volunteer_needed
  });
});
```

**Acceptance Criteria**:
- [ ] All status transitions validated
- [ ] Transactional updates (registration + grid count)
- [ ] Duplicate prevention enforced
- [ ] Capacity limits respected
- [ ] Audit trail for all changes

**Deliverables**:
- [ ] `tests/routes/volunteer-registrations.test.ts` (20+ tests)
- [ ] `src/routes/volunteer-registrations.ts`
- [ ] Database triggers or transactions
- [ ] Status machine validator

**Dependencies**: 2.2
**Estimated Time**: 8 hours
**Priority**: P1 (High)

---

### 2.4 RLS (Row-Level Security) Validation Tests

**Agent Assignment**: `tester`, `security-manager`

**TDD Focus**: PostgreSQL RLS policies enforce multi-tenant isolation

**🔴 RED: Write Security Tests**

```typescript
// packages/backend/tests/security/rls.test.ts
describe('Row-Level Security', () => {
  describe('Grids with grid_manager_id', () => {
    it('should only allow grid managers to see their own grids', async () => {
      // User A is grid_manager for grid_1
      const tokenA = await generateTestToken(app, {
        id: 'user_a',
        role: 'grid_manager',
      });

      // User B is grid_manager for grid_2
      const tokenB = await generateTestToken(app, {
        id: 'user_b',
        role: 'grid_manager',
      });

      // Create grid_1 managed by user_a
      await app.inject({
        method: 'POST',
        url: '/grids',
        headers: { authorization: `Bearer ${tokenA}` },
        payload: {
          code: 'A-1',
          grid_manager_id: 'user_a',
          // ...
        },
      });

      // User B should NOT see grid_1
      const resB = await app.inject({
        method: 'GET',
        url: '/grids',
        headers: { authorization: `Bearer ${tokenB}` },
      });

      const gridsB = resB.json();
      expect(gridsB.find(g => g.code === 'A-1')).toBeUndefined();
    });

    it('should allow admins to see all grids', async () => {
      const adminToken = await generateTestToken(app, {
        role: 'admin',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/grids',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      // Should see all grids regardless of grid_manager_id
    });
  });

  describe('Sensitive PII fields', () => {
    it('should not expose volunteer_phone without can_view_phone', async () => {
      const userToken = await generateTestToken(app, {
        role: 'user',
      });

      const res = await app.inject({
        method: 'GET',
        url: '/volunteers',
        headers: { authorization: `Bearer ${userToken}` },
      });

      const { data, can_view_phone } = res.json();
      expect(can_view_phone).toBe(false);

      if (data.length > 0) {
        expect(data[0].volunteer_phone).toBeUndefined();
      }
    });

    it('should expose volunteer_phone to grid managers', async () => {
      const managerToken = await generateTestToken(app, {
        id: 'manager_123',
        role: 'grid_manager',
      });

      const res = await app.inject({
        method: 'GET',
        url: `/volunteers?grid_id=${gridIdManagedByManager123}`,
        headers: { authorization: `Bearer ${managerToken}` },
      });

      const { data, can_view_phone } = res.json();
      expect(can_view_phone).toBe(true);

      if (data.length > 0) {
        expect(data[0].volunteer_phone).toBeDefined();
      }
    });
  });
});
```

**🟢 GREEN: Implement RLS Policies**

```sql
-- packages/backend/sql/rls/grids_rls.sql
ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

-- Policy: Grid managers can only see their own grids
CREATE POLICY grids_select_manager_only ON grids
  FOR SELECT
  USING (
    -- Admins see all
    current_setting('app.user_role', true) = 'admin'
    OR
    -- Grid managers see only their own
    (
      current_setting('app.user_role', true) = 'grid_manager'
      AND grid_manager_id = current_setting('app.user_id', true)
    )
    OR
    -- Public grids (grid_manager_id IS NULL) visible to all
    grid_manager_id IS NULL
  );

-- Policy: Only grid manager can update their grid
CREATE POLICY grids_update_manager_only ON grids
  FOR UPDATE
  USING (
    current_setting('app.user_role', true) = 'admin'
    OR
    (
      current_setting('app.user_role', true) = 'grid_manager'
      AND grid_manager_id = current_setting('app.user_id', true)
    )
  );
```

```typescript
// Middleware to set RLS context
app.addHook('preHandler', async (req, reply) => {
  if (req.user) {
    await app.db.query('SET LOCAL app.user_id = $1', [req.user.id]);
    await app.db.query('SET LOCAL app.user_role = $1', [req.user.role]);
  }
});
```

**Acceptance Criteria**:
- [ ] All RLS policies tested
- [ ] Multi-tenant isolation verified
- [ ] PII exposure controlled
- [ ] Admin bypass works correctly
- [ ] No data leakage across tenants

**Deliverables**:
- [ ] `tests/security/rls.test.ts` (15+ tests)
- [ ] `sql/rls/*.sql` policy files
- [ ] Migration with RLS enabled
- [ ] Documentation of security model

**Dependencies**: 2.3
**Estimated Time**: 8 hours
**Priority**: P0 (Critical - Security)

---

## Phase 3 — Authentication & Authorization

**Goal**: Implement robust JWT authentication, OTP system, and RBAC.

### 3.1 JWT Authentication System

**Agent Assignment**: `security-manager`, `backend-dev`

**TDD Focus**: Token generation, validation, refresh, and revocation

**Test Cases**:

```typescript
describe('JWT Authentication', () => {
  describe('POST /auth/register', () => {
    it('should register user with phone number (volunteer)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          phone_number: '0912345678',
          role: 'volunteer',
          full_name: 'Test Volunteer',
        },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json()).toHaveProperty('userId');
    });

    it('should register user with email (admin)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'admin@example.org',
          password: 'SecurePass123!',
          role: 'super_admin',
          full_name: 'System Admin',
        },
      });

      expect(res.statusCode).toBe(201);
    });

    it('should reject duplicate phone/email', async () => {
      // Register first time
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          phone_number: '0912345678',
          role: 'volunteer',
          full_name: 'First User',
        },
      });

      // Attempt duplicate
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          phone_number: '0912345678',
          role: 'volunteer',
          full_name: 'Second User',
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().message).toContain('already exists');
    });

    it('should enforce password strength for admin roles', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'weak@example.org',
          password: '123', // ❌ Too weak
          role: 'admin',
          full_name: 'Weak Admin',
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().message).toContain('password');
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid email and password', async () => {
      // Register admin
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'admin@example.org',
          password: 'SecurePass123!',
          role: 'admin',
          full_name: 'Admin',
        },
      });

      // Login
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'admin@example.org',
          password: 'SecurePass123!',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('accessToken');
      expect(res.json()).toHaveProperty('refreshToken');
      expect(res.json().user).toHaveProperty('id');
      expect(res.json().user.role).toBe('admin');
    });

    it('should login with valid phone and OTP', async () => {
      // Register volunteer
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          phone_number: '0912345678',
          role: 'volunteer',
          full_name: 'Volunteer',
        },
      });

      // Request OTP
      await app.inject({
        method: 'POST',
        url: '/auth/request-otp',
        payload: {
          phone_number: '0912345678',
          purpose: 'login',
        },
      });

      // Get OTP from test helper (in real: from SMS)
      const otp = await getTestOTP('0912345678');

      // Login with OTP
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          phone_number: '0912345678',
          otp,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('accessToken');
    });

    it('should lock account after 5 failed attempts', async () => {
      // Register user
      await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'lock@example.org',
          password: 'CorrectPass123!',
          role: 'user',
          full_name: 'Lock Test',
        },
      });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            email: 'lock@example.org',
            password: 'WrongPass',
          },
        });
      }

      // 6th attempt should be locked
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'lock@example.org',
          password: 'CorrectPass123!',
        },
      });

      expect(res.statusCode).toBe(423); // Locked
      expect(res.json().message).toContain('locked');
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Login to get tokens
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'admin@example.org',
          password: 'SecurePass123!',
        },
      });

      const { refreshToken } = loginRes.json();

      // Wait 1 second (simulate token expiry)
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Refresh
      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: refreshToken,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('accessToken');
      expect(res.json()).toHaveProperty('refreshToken');
    });

    it('should reject expired refresh token', async () => {
      const expiredToken = generateExpiredToken();

      const res = await app.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refresh_token: expiredToken,
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke token and prevent reuse', async () => {
      // Login
      const loginRes = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'admin@example.org',
          password: 'SecurePass123!',
        },
      });

      const { accessToken } = loginRes.json();

      // Logout
      await app.inject({
        method: 'POST',
        url: '/auth/logout',
        payload: {
          token: accessToken,
        },
      });

      // Try to use revoked token
      const res = await app.inject({
        method: 'GET',
        url: '/me',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });
});
```

**Implementation**:

```typescript
// packages/backend/src/routes/auth.ts
import bcrypt from 'bcrypt';
import { randomInt } from 'crypto';

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/register
  app.post('/auth/register', async (req, reply) => {
    const { phone_number, email, password, role, full_name } = req.body as any;

    // Validate role-specific requirements
    if (['admin', 'super_admin'].includes(role)) {
      if (!email || !password) {
        reply.code(400);
        return { message: 'Admin roles require email and password' };
      }

      // Password strength validation
      if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
        reply.code(400);
        return { message: 'Password must be 8+ chars with uppercase and number' };
      }
    }

    if (['volunteer', 'victim'].includes(role)) {
      if (!phone_number) {
        reply.code(400);
        return { message: 'Volunteer/victim roles require phone_number' };
      }
    }

    // Check for duplicates
    const existing = await app.db.query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, phone_number]
    );

    if (existing.rows.length > 0) {
      reply.code(409);
      return { message: 'User already exists' };
    }

    // Hash password if provided
    const password_hash = password ? await bcrypt.hash(password, 10) : null;

    // Insert user
    const result = await app.db.query(
      `INSERT INTO users (
        email, phone_number, password_hash, role, full_name, status
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, role, email, phone_number`,
      [email, phone_number, password_hash, role, full_name, 'active']
    );

    reply.code(201);
    return {
      userId: result.rows[0].user_id,
      role: result.rows[0].role,
      message: 'Registration successful',
    };
  });

  // POST /auth/login
  app.post('/auth/login', async (req, reply) => {
    const { email, password, phone_number, otp } = req.body as any;

    let user;

    // Email + Password login
    if (email && password) {
      const result = await app.db.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        reply.code(401);
        return { message: 'Invalid credentials' };
      }

      user = result.rows[0];

      // Check account status
      if (user.status === 'suspended') {
        reply.code(423);
        return { message: 'Account is locked' };
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password_hash);

      if (!valid) {
        // Increment failed attempts
        await app.db.query(
          `UPDATE users
           SET failed_login_attempts = failed_login_attempts + 1,
               last_failed_login = NOW()
           WHERE user_id = $1`,
          [user.user_id]
        );

        // Lock after 5 attempts
        if (user.failed_login_attempts >= 4) {
          await app.db.query(
            'UPDATE users SET status = $1 WHERE user_id = $2',
            ['suspended', user.user_id]
          );
        }

        reply.code(401);
        return { message: 'Invalid credentials' };
      }

      // Reset failed attempts on success
      await app.db.query(
        `UPDATE users
         SET failed_login_attempts = 0, last_login = NOW()
         WHERE user_id = $1`,
        [user.user_id]
      );
    }

    // Phone + OTP login
    else if (phone_number && otp) {
      // Verify OTP
      const otpValid = await verifyOTP(app.db, phone_number, otp, 'login');

      if (!otpValid) {
        reply.code(401);
        return { message: 'Invalid or expired OTP' };
      }

      const result = await app.db.query(
        'SELECT * FROM users WHERE phone_number = $1',
        [phone_number]
      );

      if (result.rows.length === 0) {
        reply.code(401);
        return { message: 'User not found' };
      }

      user = result.rows[0];

      // Update last login
      await app.db.query(
        'UPDATE users SET last_login = NOW() WHERE user_id = $1',
        [user.user_id]
      );
    }

    else {
      reply.code(400);
      return { message: 'Provide either (email + password) or (phone_number + otp)' };
    }

    // Generate tokens
    const accessToken = app.jwt.sign(
      {
        id: user.user_id,
        role: user.role,
        email: user.email,
        phone_number: user.phone_number,
      },
      { expiresIn: '24h' }
    );

    const refreshToken = app.jwt.sign(
      {
        id: user.user_id,
        type: 'refresh',
      },
      { expiresIn: '7d' }
    );

    // Store refresh token
    await app.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.user_id, await bcrypt.hash(refreshToken, 10)]
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.user_id,
        role: user.role,
        email: user.email,
        phone_number: user.phone_number,
      },
    };
  });

  // POST /auth/request-otp
  app.post('/auth/request-otp', async (req, reply) => {
    const { phone_number, purpose } = req.body as any;

    // Generate 6-digit OTP
    const otp = randomInt(100000, 999999).toString();

    // Store OTP (expires in 5 minutes)
    await app.db.query(
      `INSERT INTO otp_codes (phone_number, otp_hash, purpose, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '5 minutes')`,
      [phone_number, await bcrypt.hash(otp, 10), purpose]
    );

    // Send SMS (mock in dev, real in prod)
    if (process.env.NODE_ENV === 'production') {
      await sendSMS(phone_number, `Your Shovel Heroes OTP: ${otp}`);
    } else {
      app.log.info({ phone_number, otp }, 'OTP generated (dev mode)');
    }

    return { message: 'OTP sent successfully' };
  });

  // Additional endpoints...
};

async function verifyOTP(db: any, phone: string, otp: string, purpose: string): Promise<boolean> {
  const result = await db.query(
    `SELECT otp_hash FROM otp_codes
     WHERE phone_number = $1
       AND purpose = $2
       AND expires_at > NOW()
       AND used = false
     ORDER BY created_at DESC
     LIMIT 1`,
    [phone, purpose]
  );

  if (result.rows.length === 0) return false;

  const valid = await bcrypt.compare(otp, result.rows[0].otp_hash);

  if (valid) {
    // Mark OTP as used
    await db.query(
      'UPDATE otp_codes SET used = true WHERE phone_number = $1 AND purpose = $2',
      [phone, purpose]
    );
  }

  return valid;
}
```

**Acceptance Criteria**:
- [ ] All authentication flows tested
- [ ] Token expiry and refresh working
- [ ] OTP generation and validation secure
- [ ] Account lockout after failed attempts
- [ ] Token revocation on logout
- [ ] Audit logging for all auth events

**Deliverables**:
- [ ] `tests/routes/auth.test.ts` (30+ tests)
- [ ] `src/routes/auth.ts` implementation
- [ ] `migrations/XXX_create_otp_tables.sql`
- [ ] `migrations/XXX_create_refresh_tokens.sql`
- [ ] Password hashing and validation utilities

**Dependencies**: Phase 2
**Estimated Time**: 12 hours
**Priority**: P0 (Critical)

---

### 3.2 RBAC (Role-Based Access Control)

**Agent Assignment**: `security-manager`, `backend-dev`

**Test Cases**:

```typescript
describe('RBAC Middleware', () => {
  describe('requireRole middleware', () => {
    it('should allow admin to access admin-only endpoints', async () => {
      const adminToken = await generateTestToken(app, { role: 'admin' });

      const res = await app.inject({
        method: 'GET',
        url: '/admin/users',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should block non-admin from admin endpoints', async () => {
      const userToken = await generateTestToken(app, { role: 'user' });

      const res = await app.inject({
        method: 'GET',
        url: '/admin/users',
        headers: { authorization: `Bearer ${userToken}` },
      });

      expect(res.statusCode).toBe(403);
      expect(res.json().message).toContain('Insufficient permissions');
    });

    it('should allow grid_manager to manage their own grids', async () => {
      const managerToken = await generateTestToken(app, {
        id: 'manager_123',
        role: 'grid_manager',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/grids/${gridOwnedByManager123}`,
        headers: { authorization: `Bearer ${managerToken}` },
        payload: { status: 'completed' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should block grid_manager from managing others grids', async () => {
      const managerToken = await generateTestToken(app, {
        id: 'manager_123',
        role: 'grid_manager',
      });

      const res = await app.inject({
        method: 'PUT',
        url: `/grids/${gridOwnedByManager456}`,
        headers: { authorization: `Bearer ${managerToken}` },
        payload: { status: 'completed' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Permission Matrix', () => {
    const tests = [
      { endpoint: 'POST /disaster-areas', roles: ['admin'], expect: 201 },
      { endpoint: 'POST /grids', roles: ['admin', 'grid_manager'], expect: 201 },
      { endpoint: 'POST /volunteer-registrations', roles: ['user', 'volunteer'], expect: 201 },
      { endpoint: 'GET /admin/users', roles: ['admin', 'super_admin'], expect: 200 },
      { endpoint: 'DELETE /admin/users/:id', roles: ['super_admin'], expect: 200 },
    ];

    tests.forEach(({ endpoint, roles, expect: expectedCode }) => {
      it(`${endpoint} should be accessible by ${roles.join(', ')}`, async () => {
        for (const role of roles) {
          const token = await generateTestToken(app, { role });
          const [method, path] = endpoint.split(' ');

          const res = await app.inject({
            method,
            url: path.replace(':id', 'test_id'),
            headers: { authorization: `Bearer ${token}` },
            payload: {},
          });

          expect([expectedCode, 400, 404]).toContain(res.statusCode); // Allow validation/not found, but not 403
        }
      });
    });
  });
});
```

**Implementation**:

```typescript
// packages/backend/src/middleware/rbac.ts
import type { FastifyRequest, FastifyReply } from 'fastify';

export function requireRole(allowedRoles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401);
      return reply.send({ message: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log access denial
      await req.server.db.query(
        `INSERT INTO audit_logs (
          user_id, user_role, action, resource_type,
          ip_address, user_agent, success
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          req.user.id,
          req.user.role,
          'ACCESS_DENIED',
          req.url,
          req.ip,
          req.headers['user-agent'],
          false,
        ]
      );

      reply.code(403);
      return reply.send({
        message: 'Insufficient permissions',
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }
  };
}

export function requireResourceOwnership(resourceType: 'grid' | 'registration') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) {
      reply.code(401);
      return reply.send({ message: 'Unauthorized' });
    }

    // Admins bypass ownership checks
    if (req.user.role === 'admin' || req.user.role === 'super_admin') {
      return;
    }

    const { id } = req.params as any;

    if (resourceType === 'grid') {
      const result = await req.server.db.query(
        'SELECT grid_manager_id FROM grids WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        reply.code(404);
        return reply.send({ message: 'Grid not found' });
      }

      const grid = result.rows[0];

      if (req.user.role === 'grid_manager' && grid.grid_manager_id !== req.user.id) {
        reply.code(403);
        return reply.send({ message: 'You can only manage your own grids' });
      }
    }

    // Similar checks for other resource types...
  };
}
```

**Acceptance Criteria**:
- [ ] All role-based access rules tested
- [ ] Permission matrix validated
- [ ] Ownership checks enforced
- [ ] Audit logging for access denials
- [ ] Clear error messages

**Deliverables**:
- [ ] `tests/middleware/rbac.test.ts` (25+ tests)
- [ ] `src/middleware/rbac.ts`
- [ ] Permission matrix documentation
- [ ] Audit log table migration

**Dependencies**: 3.1
**Estimated Time**: 8 hours
**Priority**: P0 (Critical)

---

### 3.3 Audit Logging System

**Agent Assignment**: `backend-dev`, `security-manager`

**Test Cases**:

```typescript
describe('Audit Logging', () => {
  it('should log all POST/PUT/DELETE operations', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    // Perform mutation
    await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Audit Test Area',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    // Check audit log
    const logs = await app.db.query(
      `SELECT * FROM audit_logs
       WHERE action = 'CREATE_DISASTER_AREA'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    expect(logs.rows.length).toBe(1);
    expect(logs.rows[0].user_id).toBeDefined();
    expect(logs.rows[0].request_data).toHaveProperty('name', 'Audit Test Area');
  });

  it('should capture old and new values for updates', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    // Create
    const createRes = await app.inject({
      method: 'POST',
      url: '/disaster-areas',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Original Name',
        center_lat: 23.8751,
        center_lng: 121.578,
      },
    });

    const { id } = createRes.json();

    // Update
    await app.inject({
      method: 'PUT',
      url: `/disaster-areas/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Updated Name',
        center_lat: 23.8752,
        center_lng: 121.579,
      },
    });

    // Check audit log
    const logs = await app.db.query(
      `SELECT * FROM audit_logs
       WHERE action = 'UPDATE_DISASTER_AREA' AND resource_id = $1`,
      [id]
    );

    expect(logs.rows[0].old_value).toHaveProperty('name', 'Original Name');
    expect(logs.rows[0].new_value).toHaveProperty('name', 'Updated Name');
  });

  it('should support audit log export', async () => {
    const token = await generateTestToken(app, { role: 'admin' });

    const res = await app.inject({
      method: 'GET',
      url: '/admin/audit-logs/export?start_date=2025-10-01&end_date=2025-10-31',
      headers: { authorization: `Bearer ${token}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('user_id,action,resource_type');
  });
});
```

**Acceptance Criteria**:
- [ ] All mutations logged
- [ ] Old/new values captured for updates
- [ ] IP address and user agent recorded
- [ ] Export to CSV working
- [ ] Retention policy configurable

**Deliverables**:
- [ ] `tests/routes/audit.test.ts` (15+ tests)
- [ ] Audit logging middleware
- [ ] Export functionality
- [ ] Migration for audit_logs table

**Dependencies**: 3.2
**Estimated Time**: 6 hours
**Priority**: P1 (High)

---

## Phase 4 — Advanced Features & Business Logic

**Goal**: Implement complex business logic, supply management, discussions, and announcements.

### 4.1 Supply Donation Management

**Agent Assignment**: `backend-dev`, `tester`

**TDD Focus**: Supply tracking with status workflow and delivery management

**Key Test Cases**:

```typescript
describe('Supply Donations', () => {
  describe('Status workflow', () => {
    it('should follow valid status transitions', async () => {
      // pledged -> confirmed -> in_transit -> delivered
      // pledged -> cancelled
      // confirmed -> cancelled
    });

    it('should update grid supplies_needed.received when delivered', async () => {
      // When donation status = 'delivered', increment corresponding supply
    });
  });

  describe('PII protection', () => {
    it('should hide donor_phone from non-authorized users', async () => {
      const userToken = await generateTestToken(app, { role: 'user' });

      const res = await app.inject({
        method: 'GET',
        url: '/supply-donations',
        headers: { authorization: `Bearer ${userToken}` },
      });

      const donations = res.json();
      if (donations.length > 0) {
        expect(donations[0].donor_phone).toBeUndefined();
      }
    });
  });

  describe('Delivery coordination', () => {
    it('should validate delivery_method is required for confirmed status', async () => {
      // Business rule: confirmed donations must specify delivery method
    });

    it('should allow filtering by delivery_method', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/supply-donations?delivery_method=direct',
      });

      expect(res.statusCode).toBe(200);
    });
  });
});
```

**Acceptance Criteria**:
- [ ] Status workflow validated
- [ ] PII protection enforced
- [ ] Grid supply tracking updated
- [ ] Delivery methods documented
- [ ] 90%+ test coverage

**Deliverables**:
- [ ] `tests/routes/supply-donations.test.ts` (20+ tests)
- [ ] `src/routes/supply-donations.ts`
- [ ] Business logic for supply matching
- [ ] Migration updates

**Dependencies**: Phase 3
**Estimated Time**: 8 hours
**Priority**: P2 (Medium)

---

### 4.2 Grid Discussions

**Agent Assignment**: `backend-dev`, `tester`

**TDD Focus**: Real-time discussion threads with moderation

**Key Test Cases**:

```typescript
describe('Grid Discussions', () => {
  it('should post discussion message to grid', async () => {
    const token = await generateTestToken(app, { role: 'volunteer' });

    const res = await app.inject({
      method: 'POST',
      url: '/grid-discussions',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        grid_id: 'grid_123',
        content: 'Meeting at 2pm today.',
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it('should filter discussions by grid_id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grid-discussions?grid_id=grid_123',
    });

    const discussions = res.json();
    expect(discussions.every(d => d.grid_id === 'grid_123')).toBe(true);
  });

  it('should support pagination for discussions', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/grid-discussions?grid_id=grid_123&limit=10&offset=0',
    });

    expect(res.statusCode).toBe(200);
  });

  it('should allow grid managers to delete inappropriate content', async () => {
    const managerToken = await generateTestToken(app, {
      id: 'manager_123',
      role: 'grid_manager',
    });

    const res = await app.inject({
      method: 'DELETE',
      url: `/grid-discussions/${discussionId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(res.statusCode).toBe(204);
  });
});
```

**Acceptance Criteria**:
- [ ] Discussions filterable by grid
- [ ] Pagination working
- [ ] Moderation capabilities
- [ ] Real-time updates (WebSocket optional)
- [ ] Content validation

**Deliverables**:
- [ ] `tests/routes/grid-discussions.test.ts` (15+ tests)
- [ ] `src/routes/grid-discussions.ts`
- [ ] Moderation endpoints
- [ ] Content sanitization

**Dependencies**: Phase 3
**Estimated Time**: 6 hours
**Priority**: P2 (Medium)

---

### 4.3 Announcements System

**Agent Assignment**: `backend-dev`, `tester`

**TDD Focus**: System-wide announcements with priority levels

**Key Test Cases**:

```typescript
describe('Announcements', () => {
  it('should create announcement (admin only)', async () => {
    const adminToken = await generateTestToken(app, { role: 'admin' });

    const res = await app.inject({
      method: 'POST',
      url: '/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: 'Urgent: Weather Alert',
        body: 'Typhoon approaching. All operations suspended.',
        priority: 'urgent',
        published: true,
      },
    });

    expect(res.statusCode).toBe(201);
  });

  it('should support Markdown in body', async () => {
    const adminToken = await generateTestToken(app, { role: 'admin' });

    const res = await app.inject({
      method: 'POST',
      url: '/announcements',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: 'Test',
        body: '# Heading\n\n**Bold text**',
        priority: 'normal',
      },
    });

    expect(res.statusCode).toBe(201);
    // Optionally sanitize HTML if rendering
  });

  it('should filter announcements by priority', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/announcements?priority=urgent',
    });

    const announcements = res.json();
    expect(announcements.every(a => a.priority === 'urgent')).toBe(true);
  });

  it('should only show published announcements to public', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/announcements',
    });

    const announcements = res.json();
    expect(announcements.every(a => a.published === true)).toBe(true);
  });

  it('should allow admins to see unpublished drafts', async () => {
    const adminToken = await generateTestToken(app, { role: 'admin' });

    const res = await app.inject({
      method: 'GET',
      url: '/announcements?include_drafts=true',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
  });
});
```

**Acceptance Criteria**:
- [ ] Admin-only creation
- [ ] Markdown support validated
- [ ] Priority filtering
- [ ] Published/draft states
- [ ] Soft delete capability

**Deliverables**:
- [ ] `tests/routes/announcements.test.ts` (15+ tests)
- [ ] `src/routes/announcements.ts`
- [ ] Markdown sanitization
- [ ] Priority schema validation

**Dependencies**: Phase 3
**Estimated Time**: 6 hours
**Priority**: P2 (Medium)

---

### 4.4 Volunteer List with can_view_phone Logic

**Agent Assignment**: `backend-dev`, `security-manager`

**TDD Focus**: Complex authorization logic for PII exposure

**Critical Test Cases**:

```typescript
describe('GET /volunteers - PII Protection', () => {
  it('should set can_view_phone=false for unauthenticated requests', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/volunteers',
    });

    const { can_view_phone, data } = res.json();
    expect(can_view_phone).toBe(false);

    if (data.length > 0) {
      expect(data[0].volunteer_phone).toBeUndefined();
    }
  });

  it('should set can_view_phone=true for admins', async () => {
    const adminToken = await generateTestToken(app, { role: 'admin' });

    const res = await app.inject({
      method: 'GET',
      url: '/volunteers',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const { can_view_phone, data } = res.json();
    expect(can_view_phone).toBe(true);

    if (data.length > 0) {
      expect(data[0].volunteer_phone).toBeDefined();
    }
  });

  it('should set can_view_phone=true for grid managers viewing their grid', async () => {
    const managerToken = await generateTestToken(app, {
      id: 'manager_123',
      role: 'grid_manager',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/volunteers?grid_id=${gridManagedByManager123}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const { can_view_phone } = res.json();
    expect(can_view_phone).toBe(true);
  });

  it('should set can_view_phone=false for grid managers viewing other grids', async () => {
    const managerToken = await generateTestToken(app, {
      id: 'manager_123',
      role: 'grid_manager',
    });

    const res = await app.inject({
      method: 'GET',
      url: `/volunteers?grid_id=${gridManagedByManager456}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const { can_view_phone } = res.json();
    expect(can_view_phone).toBe(false);
  });

  it('should return status_counts for all volunteers', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/volunteers?include_counts=true',
    });

    const { status_counts } = res.json();
    expect(status_counts).toHaveProperty('pending');
    expect(status_counts).toHaveProperty('confirmed');
    expect(status_counts).toHaveProperty('arrived');
    expect(status_counts).toHaveProperty('completed');
    expect(status_counts).toHaveProperty('cancelled');
  });
});
```

**Implementation**:

```typescript
// packages/backend/src/routes/volunteers.ts
export const volunteersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/volunteers', async (req, reply) => {
    const { grid_id, status, include_counts = true, limit = 50, offset = 0 } = req.query as any;

    const user = req.user; // From JWT middleware (may be undefined)

    // Build query
    let query = `
      SELECT
        vr.id,
        vr.grid_id,
        vr.user_id,
        vr.status,
        vr.available_time,
        vr.skills,
        vr.equipment,
        vr.notes,
        vr.created_at as created_date,
        u.full_name as volunteer_name,
        u.phone_number as volunteer_phone
      FROM volunteer_registrations vr
      JOIN users u ON vr.user_id = u.user_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (grid_id) {
      params.push(grid_id);
      query += ` AND vr.grid_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND vr.status = $${params.length}`;
    }

    query += ` ORDER BY vr.created_at DESC`;

    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await app.db.query(query, params);

    // Determine can_view_phone
    let canViewPhone = false;

    if (user) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        canViewPhone = true;
      } else if (user.role === 'grid_manager' && grid_id) {
        // Check if user is manager of this grid
        const gridCheck = await app.db.query(
          'SELECT grid_manager_id FROM grids WHERE id = $1',
          [grid_id]
        );

        if (gridCheck.rows.length > 0 && gridCheck.rows[0].grid_manager_id === user.id) {
          canViewPhone = true;
        }
      }
    }

    // Filter out volunteer_phone if not authorized
    const data = result.rows.map(row => {
      if (!canViewPhone) {
        delete row.volunteer_phone;
      }
      return row;
    });

    // Get status counts if requested
    let status_counts;
    if (include_counts) {
      const countQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'arrived') as arrived,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) as total
        FROM volunteer_registrations
        ${grid_id ? 'WHERE grid_id = $1' : ''}
      `;

      const countParams = grid_id ? [grid_id] : [];
      const countResult = await app.db.query(countQuery, countParams);

      status_counts = {
        pending: parseInt(countResult.rows[0].pending),
        confirmed: parseInt(countResult.rows[0].confirmed),
        arrived: parseInt(countResult.rows[0].arrived),
        completed: parseInt(countResult.rows[0].completed),
        cancelled: parseInt(countResult.rows[0].cancelled),
      };
    }

    return {
      data,
      can_view_phone: canViewPhone,
      total: data.length,
      ...(status_counts && { status_counts }),
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  });
};
```

**Acceptance Criteria**:
- [ ] can_view_phone logic correct for all roles
- [ ] PII never leaked to unauthorized users
- [ ] Status counts accurate
- [ ] Pagination working
- [ ] Grid filtering validated

**Deliverables**:
- [ ] `tests/routes/volunteers.test.ts` (25+ tests)
- [ ] `src/routes/volunteers.ts`
- [ ] Authorization logic documented
- [ ] Security review completed

**Dependencies**: Phase 3
**Estimated Time**: 8 hours
**Priority**: P0 (Critical - PII Protection)

---

### 4.5 CSV Import/Export Functions

**Agent Assignment**: `backend-dev`, `tester`

**TDD Focus**: Bulk operations with validation

**Key Test Cases**:

```typescript
describe('CSV Functions', () => {
  describe('GET /functions/export-grids-csv', () => {
    it('should export grids as CSV', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/functions/export-grids-csv',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');

      const csv = res.body;
      expect(csv).toContain('code,disaster_area_id,grid_type');
    });

    it('should include all grid fields', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/functions/export-grids-csv',
      });

      const csv = res.body;
      const headers = csv.split('\n')[0];

      expect(headers).toContain('volunteer_needed');
      expect(headers).toContain('volunteer_registered');
      expect(headers).toContain('status');
    });
  });

  describe('POST /functions/import-grids-csv', () => {
    it('should import valid CSV', async () => {
      const adminToken = await generateTestToken(app, { role: 'admin' });

      const csv = `code,disaster_area_id,grid_type,status,center_lat,center_lng
A-1,area_123,manpower,open,23.8751,121.578
A-2,area_123,supply_storage,open,23.8752,121.579`;

      const res = await app.inject({
        method: 'POST',
        url: '/functions/import-grids-csv',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { csv },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('imported', 2);
    });

    it('should validate CSV data before import', async () => {
      const adminToken = await generateTestToken(app, { role: 'admin' });

      const csv = `code,disaster_area_id,grid_type,status,center_lat,center_lng
INVALID,area_123,invalid_type,open,91,121.578`; // Invalid lat & type

      const res = await app.inject({
        method: 'POST',
        url: '/functions/import-grids-csv',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { csv },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json()).toHaveProperty('errors');
    });

    it('should support upsert on import (update existing)', async () => {
      const adminToken = await generateTestToken(app, { role: 'admin' });

      // Create grid A-1
      await app.inject({
        method: 'POST',
        url: '/grids',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          code: 'A-1',
          disaster_area_id: 'area_123',
          grid_type: 'manpower',
          status: 'open',
          center_lat: 23.8751,
          center_lng: 121.578,
        },
      });

      // Import CSV with updated A-1
      const csv = `code,disaster_area_id,grid_type,status,center_lat,center_lng
A-1,area_123,manpower,completed,23.8751,121.578`;

      const res = await app.inject({
        method: 'POST',
        url: '/functions/import-grids-csv',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { csv, mode: 'upsert' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toHaveProperty('updated', 1);

      // Verify status changed
      const gridRes = await app.inject({
        method: 'GET',
        url: '/grids',
      });

      const grid = gridRes.json().find(g => g.code === 'A-1');
      expect(grid.status).toBe('completed');
    });
  });

  describe('GET /functions/grid-template', () => {
    it('should download blank CSV template', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/functions/grid-template',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');

      const csv = res.body;
      expect(csv).toContain('code,disaster_area_id,grid_type');
    });
  });
});
```

**Acceptance Criteria**:
- [ ] Export generates valid CSV
- [ ] Import validates all data
- [ ] Upsert mode supported
- [ ] Template download works
- [ ] Transaction rollback on errors

**Deliverables**:
- [ ] `tests/routes/functions.test.ts` (20+ tests)
- [ ] `src/routes/functions.ts`
- [ ] CSV parsing utilities
- [ ] Validation schemas

**Dependencies**: Phase 3
**Estimated Time**: 8 hours
**Priority**: P2 (Medium)

---

## Phase 5 — Observability & Deployment

**Goal**: Implement monitoring, logging, and production deployment readiness.

### 5.1 OpenTelemetry Integration

**Agent Assignment**: `cicd-engineer`, `perf-analyzer`

**Tasks**:

1. ✅ Configure OpenTelemetry SDK
   - Setup `@opentelemetry/sdk-node`
   - Enable auto-instrumentation for Fastify, pg, http
   - Configure trace exporters (OTLP HTTP)

2. ✅ Add custom spans for business operations
   - Trace volunteer registration flow
   - Monitor RLS policy execution time
   - Track JWT validation performance

3. ✅ Setup metrics collection
   - Request rate by endpoint
   - Error rate by status code
   - Database query duration
   - Active connections

4. ✅ Configure exporters
   - Console exporter (dev)
   - OTLP HTTP (production)
   - Jaeger/Zipkin (optional)

**Implementation**:

```typescript
// packages/backend/src/otel/init.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'shovel-heroes-api',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Reduce noise
      },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
```

```typescript
// Usage in routes
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('shovel-heroes');

app.post('/volunteer-registrations', async (req, reply) => {
  const span = tracer.startSpan('volunteer.register');

  try {
    // ... registration logic
    span.setStatus({ code: 0 }); // Success
  } catch (error) {
    span.setStatus({ code: 2, message: error.message }); // Error
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
});
```

**Test Requirements**:

```typescript
describe('OpenTelemetry', () => {
  it('should generate traces for HTTP requests', async () => {
    // Setup in-memory exporter
    const memoryExporter = new InMemorySpanExporter();

    const res = await app.inject({
      method: 'GET',
      url: '/healthz',
    });

    expect(res.statusCode).toBe(200);

    const spans = memoryExporter.getFinishedSpans();
    expect(spans.length).toBeGreaterThan(0);
    expect(spans[0].name).toContain('GET /healthz');
  });

  it('should track custom business spans', async () => {
    const token = await generateTestToken(app, { role: 'user' });

    await app.inject({
      method: 'POST',
      url: '/volunteer-registrations',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        grid_id: 'grid_123',
        user_id: 'user_123',
      },
    });

    const spans = memoryExporter.getFinishedSpans();
    const customSpan = spans.find(s => s.name === 'volunteer.register');

    expect(customSpan).toBeDefined();
  });
});
```

**Acceptance Criteria**:
- [ ] All HTTP requests traced
- [ ] Database queries instrumented
- [ ] Custom spans for business logic
- [ ] Metrics exported to OTLP
- [ ] Dashboard configured (Grafana/Jaeger)

**Deliverables**:
- [ ] `src/otel/init.ts` configuration
- [ ] Custom instrumentation in critical paths
- [ ] Tests for telemetry
- [ ] Grafana dashboard JSON (optional)

**Dependencies**: Phase 4
**Estimated Time**: 6 hours
**Priority**: P2 (Medium)

---

### 5.2 MailHog Integration for Notifications

**Agent Assignment**: `backend-dev`

**Tasks**:

1. ✅ Setup Nodemailer with MailHog
2. ✅ Create email templates
3. ✅ Implement notification service
4. ✅ Add /debug/send-mail endpoint (dev only)

**Implementation**:

```typescript
// packages/backend/src/lib/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || '127.0.0.1',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
});

export async function sendEmail(options: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}) {
  if (process.env.NODE_ENV === 'production' && !process.env.SMTP_HOST) {
    throw new Error('SMTP_HOST not configured for production');
  }

  return transporter.sendMail({
    from: process.env.SMTP_FROM || 'noreply@shovelheroes.org',
    ...options,
  });
}

// Templates
export function volunteerConfirmationEmail(volunteer: any, grid: any) {
  return {
    subject: `Volunteer Registration Confirmed - ${grid.code}`,
    html: `
      <h1>Registration Confirmed</h1>
      <p>Dear ${volunteer.name},</p>
      <p>Your volunteer registration for grid <strong>${grid.code}</strong> has been confirmed.</p>
      <p><strong>Meeting Point:</strong> ${grid.meeting_point}</p>
      <p><strong>Risks:</strong> ${grid.risks_notes}</p>
      <p>Thank you for your service!</p>
    `,
  };
}
```

```typescript
// packages/backend/src/routes/debug.ts
export const debugRoutes: FastifyPluginAsync = async (app) => {
  if (process.env.NODE_ENV !== 'development') {
    return; // Only in dev mode
  }

  app.post('/debug/send-mail', async (req, reply) => {
    const { to, subject, body } = req.body as any;

    await sendEmail({
      to,
      subject,
      html: body,
    });

    return { message: 'Email sent to MailHog' };
  });
};
```

**Test Requirements**:

```typescript
describe('Email Notifications', () => {
  it('should send volunteer confirmation email', async () => {
    const email = volunteerConfirmationEmail(
      { name: 'Test Volunteer' },
      { code: 'A-1', meeting_point: 'City Hall', risks_notes: 'None' }
    );

    expect(email.subject).toContain('A-1');
    expect(email.html).toContain('Test Volunteer');
    expect(email.html).toContain('City Hall');
  });

  it('should send email via SMTP', async () => {
    const info = await sendEmail({
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>Test body</p>',
    });

    expect(info.accepted).toContain('test@example.com');
  });
});
```

**Acceptance Criteria**:
- [ ] MailHog integration working
- [ ] Email templates validated
- [ ] Debug endpoint functional
- [ ] Production SMTP configurable
- [ ] Error handling for failed sends

**Deliverables**:
- [ ] `src/lib/email.ts` service
- [ ] Email templates
- [ ] `src/routes/debug.ts` (dev only)
- [ ] Tests for email service

**Dependencies**: Phase 4
**Estimated Time**: 4 hours
**Priority**: P2 (Medium)

---

### 5.3 Nginx Deployment Configuration

**Agent Assignment**: `cicd-engineer`

**Tasks**:

1. ✅ Validate `infra/nginx/shovelheroes.conf`
2. ✅ Create deployment script
3. ✅ Setup Let's Encrypt SSL
4. ✅ Configure reverse proxy headers

**Nginx Configuration**:

```nginx
# infra/nginx/shovelheroes.conf
upstream api_backend {
    server localhost:8787;
}

server {
    listen 80;
    server_name shovelheroes.example.org;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name shovelheroes.example.org;

    ssl_certificate /etc/letsencrypt/live/shovelheroes.example.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/shovelheroes.example.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # API proxy
    location /api {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static frontend
    location / {
        root /var/www/shovelheroes/dist;
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**Deployment Script**:

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🚀 Deploying Shovel Heroes..."

# 1. Build frontend
echo "📦 Building frontend..."
VITE_API_BASE=/api npm run build

# 2. Build backend
echo "⚙️  Building backend..."
cd packages/backend
npm run build
cd ../..

# 3. Run migrations
echo "🗄️  Running database migrations..."
cd packages/backend
npm run migrate:up
cd ../..

# 4. Deploy static files
echo "📂 Deploying static files..."
sudo mkdir -p /var/www/shovelheroes
sudo cp -r dist/* /var/www/shovelheroes/

# 5. Restart backend service
echo "🔄 Restarting backend service..."
sudo systemctl restart shovel-heroes-api

# 6. Reload nginx
echo "🔃 Reloading nginx..."
sudo nginx -t && sudo nginx -s reload

echo "✅ Deployment complete!"
```

**Systemd Service**:

```ini
# /etc/systemd/system/shovel-heroes-api.service
[Unit]
Description=Shovel Heroes API Server
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/shovel-heroes/packages/backend
Environment="NODE_ENV=production"
EnvironmentFile=/opt/shovel-heroes/packages/backend/.env
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Acceptance Criteria**:
- [ ] Nginx configuration validated
- [ ] SSL certificates working
- [ ] Deployment script tested
- [ ] Systemd service configured
- [ ] Health checks passing

**Deliverables**:
- [ ] Updated `infra/nginx/shovelheroes.conf`
- [ ] `scripts/deploy.sh` script
- [ ] Systemd service file
- [ ] Deployment documentation

**Dependencies**: Phase 4
**Estimated Time**: 6 hours
**Priority**: P2 (Medium)

---

### 5.4 Rate Limiting & Security Hardening

**Agent Assignment**: `security-manager`, `backend-dev`

**Tasks**:

1. ✅ Configure @fastify/rate-limit
2. ✅ Setup Helmet security headers
3. ✅ Implement CORS allowlist
4. ✅ Add request validation middleware

**Implementation**:

```typescript
// packages/backend/src/app.ts
import rateLimit from '@fastify/rate-limit';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';

export async function buildApp() {
  const app = fastify({ logger: true });

  // Helmet security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // CORS allowlist
  await app.register(cors, {
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'https://shovelheroes.example.org',
        process.env.CORS_ORIGIN,
      ].filter(Boolean);

      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Rate limiting
  await app.register(rateLimit, {
    global: true,
    max: 100, // 100 requests
    timeWindow: '1 minute',
    cache: 10000,
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (req, context) => ({
      code: 'RATE_LIMIT_EXCEEDED',
      error: 'Too Many Requests',
      message: `Rate limit exceeded, retry in ${context.after}`,
      retryAfter: context.after,
    }),
  });

  // Custom rate limits for specific routes
  app.post('/auth/login', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '15 minutes',
      },
    },
  }, async (req, reply) => {
    // Login logic
  });

  return app;
}
```

**Test Requirements**:

```typescript
describe('Security Middleware', () => {
  describe('Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'GET',
          url: '/healthz',
        });

        expect(res.statusCode).toBe(200);
      }
    });

    it('should return 429 when limit exceeded', async () => {
      // Make 101 requests (limit is 100/min)
      for (let i = 0; i < 101; i++) {
        await app.inject({
          method: 'GET',
          url: '/healthz',
        });
      }

      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });

      expect(res.statusCode).toBe(429);
      expect(res.json()).toHaveProperty('retryAfter');
    });

    it('should have stricter limit for login endpoint', async () => {
      for (let i = 0; i < 6; i++) {
        await app.inject({
          method: 'POST',
          url: '/auth/login',
          payload: {
            email: 'test@example.com',
            password: 'wrong',
          },
        });
      }

      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrong',
        },
      });

      expect(res.statusCode).toBe(429);
    });
  });

  describe('CORS', () => {
    it('should allow requests from allowed origins', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
        headers: {
          origin: 'http://localhost:5173',
        },
      });

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });

    it('should block requests from disallowed origins', async () => {
      try {
        await app.inject({
          method: 'GET',
          url: '/healthz',
          headers: {
            origin: 'https://evil.com',
          },
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('CORS');
      }
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/healthz',
      });

      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
      expect(res.headers).toHaveProperty('x-xss-protection', '1; mode=block');
    });
  });
});
```

**Acceptance Criteria**:
- [ ] Rate limits enforced
- [ ] CORS allowlist working
- [ ] Security headers present
- [ ] No security scan warnings
- [ ] Performance impact minimal

**Deliverables**:
- [ ] Security middleware configuration
- [ ] Tests for security features
- [ ] Security audit report
- [ ] Documentation

**Dependencies**: Phase 4
**Estimated Time**: 6 hours
**Priority**: P0 (Critical - Security)

---

## Agent Assignments Summary

| Agent | Phases | Total Estimated Hours |
|-------|--------|----------------------|
| code-analyzer | 0.1 | 4h |
| reviewer | 0.1, 4.4 | 4h + 2h |
| cicd-engineer | 0.2, 5.1, 5.3 | 6h + 6h + 6h |
| api-docs | 1.1, 1.3 | 8h + 2h |
| specification | 1.1 | 8h |
| coder | 1.2 | 4h |
| tester | 2.1, 2.2, 2.3, 2.4, 4.1-4.5 | 6h + 10h + 8h + 8h + 40h |
| backend-dev | 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 4.1-4.5, 5.2, 5.4 | 70h |
| security-manager | 2.4, 3.1, 3.2, 3.3, 4.4, 5.4 | 8h + 12h + 8h + 6h + 8h + 6h |
| perf-analyzer | 5.1 | 6h |

**Total Project Effort**: ~210 hours (approximately 5-6 weeks for a single developer)

---

## Testing Strategy

### Unit Tests
- **Target**: Individual functions and utilities
- **Coverage**: 95%+
- **Tools**: Vitest
- **Location**: `tests/unit/`

### Integration Tests
- **Target**: Route handlers with database
- **Coverage**: 90%+
- **Tools**: Vitest + Supertest
- **Location**: `tests/routes/`

### Security Tests
- **Target**: Authentication, authorization, RLS
- **Coverage**: 100%
- **Tools**: Vitest + custom helpers
- **Location**: `tests/security/`

### E2E Tests (Optional)
- **Target**: Full user workflows
- **Coverage**: Critical paths
- **Tools**: Playwright (future)
- **Location**: `tests/e2e/`

### Test Helpers

```typescript
// tests/helpers/app.ts
export async function buildTestApp() {
  const app = await buildApp();

  // Use test database
  process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/shovelheroes_test';

  return app;
}

// tests/helpers/auth.ts
export async function generateTestToken(
  app: FastifyInstance,
  payload: { id?: string; role: string; email?: string }
) {
  return app.jwt.sign({
    id: payload.id || 'test_user',
    role: payload.role,
    email: payload.email || 'test@example.com',
  });
}

// tests/helpers/db.ts
export async function resetDatabase() {
  await db.query('TRUNCATE TABLE users, grids, volunteer_registrations CASCADE');
}

export async function seedTestData() {
  // Insert standard test fixtures
}
```

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| PostgreSQL RLS complexity | High | Medium | Comprehensive test suite, early validation |
| JWT token revocation at scale | Medium | Low | Use Redis for blacklist if needed |
| OpenAPI schema drift | High | Medium | Automated validation in CI, regular audits |
| Database migration conflicts | Medium | Low | Strict migration review process |
| Performance bottlenecks | Medium | Low | Early profiling, OpenTelemetry monitoring |

### Process Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | Medium | High | Strict adherence to OpenAPI spec |
| Test coverage gaps | High | Medium | Coverage threshold enforcement (90%) |
| Documentation lag | Medium | High | Document-as-you-go, PR templates |
| Breaking changes | High | Low | Semantic versioning, deprecation warnings |

---

## Success Criteria

### Phase Completion Criteria

Each phase is considered complete when:

1. ✅ All tests pass with >90% coverage
2. ✅ OpenAPI spec aligned with implementation
3. ✅ Code review approved by 2+ reviewers
4. ✅ Documentation updated
5. ✅ CI/CD pipeline green
6. ✅ Security scan passed
7. ✅ Performance benchmarks met

### Overall Project Success

- [ ] All 31 API endpoints implemented
- [ ] 100% OpenAPI spec compliance
- [ ] >90% test coverage across all modules
- [ ] Zero critical security vulnerabilities
- [ ] <100ms average response time for CRUD
- [ ] RLS policies validated for all multi-tenant data
- [ ] Production deployment successful
- [ ] Health checks passing for 7 days

---

## Next Steps

1. **Immediate Actions** (This Week):
   - [ ] Complete Phase 0.1 (Codebase Health Check)
   - [ ] Complete Phase 0.2 (CI Enhancement)
   - [ ] Begin Phase 1.1 (OpenAPI Schema Expansion)

2. **Week 2**:
   - [ ] Complete Phase 1 (OpenAPI + Types)
   - [ ] Begin Phase 2.1-2.2 (Core CRUD)

3. **Week 3-4**:
   - [ ] Complete Phase 2 (Backend TDD)
   - [ ] Complete Phase 3 (Auth & RBAC)

4. **Week 5**:
   - [ ] Complete Phase 4 (Advanced Features)
   - [ ] Begin Phase 5 (Observability)

5. **Week 6**:
   - [ ] Complete Phase 5 (Deployment)
   - [ ] Final testing and production release

---

## Appendix

### A. Recommended Reading

- [OpenAPI 3.2.0 Specification](https://spec.openapis.org/oas/v3.2.0)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Fastify Best Practices](https://www.fastify.io/docs/latest/Guides/Best-Practices/)
- [Test-Driven Development with Vitest](https://vitest.dev/guide/)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)

### B. Tools & Resources

- **Development**: VSCode, Postman, DBeaver
- **Testing**: Vitest, Supertest, Faker
- **Monitoring**: Grafana, Jaeger, Prometheus
- **Security**: OWASP ZAP, npm audit, Snyk
- **CI/CD**: GitHub Actions, Docker, Nginx

### C. Contact & Support

- **Project Lead**: TBD
- **Backend Team**: TBD
- **DevOps**: TBD
- **Security**: TBD

---

**Document Status**: Active Development Plan
**Last Review**: 2025-10-03
**Next Review**: Weekly (Every Monday)
**Approved By**: TBD

---

*This plan is a living document and will be updated as development progresses. All changes should be committed to version control with clear commit messages.*
