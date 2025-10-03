# OpenAPI to TypeScript Type Generation

This document describes the OpenAPI-to-TypeScript type generation system implemented in Phase 1 of the TDD Development Plan.

## Overview

The project uses `openapi-typescript` to automatically generate TypeScript types from the OpenAPI specification (`api-spec/openapi.yaml`). This ensures type safety between the API contract and the implementation.

## Architecture

```
api-spec/openapi.yaml
  ↓ (openapi-typescript)
packages/shared-types/src/openapi.ts (generated types)
  ↓ (imported by)
packages/backend/src/lib/openapi-types.ts (type helpers)
  ↓ (used in)
packages/backend/src/routes/*.ts (route handlers)
```

## Setup

### Dependencies

The following packages are installed:

- **Root package.json**:
  - `openapi-typescript@7.4.2` - Generates TypeScript types from OpenAPI spec
  - `@stoplight/spectral-cli@6.11.0` - OpenAPI linting and validation

- **packages/backend/package.json**:
  - `shovel-shared-types: file:../shared-types` - Workspace reference to shared types

### Package Structure

#### packages/shared-types/

```json
{
  "name": "shovel-shared-types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  }
}
```

**Files**:
- `src/openapi.ts` - Auto-generated TypeScript types (1780+ lines)
- `tsconfig.json` - TypeScript configuration for declaration-only builds

## Usage

### 1. Generate Types from OpenAPI Spec

```bash
# Generate types only
npm run types:openapi

# Generate and build declarations
npm run codegen
```

This runs:
```bash
openapi-typescript api-spec/openapi.yaml -o packages/shared-types/src/openapi.ts
```

### 2. Validate OpenAPI Spec

```bash
npm run openapi:lint
```

This uses Spectral to validate the OpenAPI specification against OpenAPI 3.1 standards.

### 3. Import Types in Backend

```typescript
// Import raw OpenAPI types
import type { components, paths } from 'shovel-shared-types/src/openapi';

// Or use the helper exports
import type {
  Grid,
  DisasterArea,
  User,
  CreateGridBody,
  ListGridsQuery
} from './lib/openapi-types';
```

## Type Helper System

The `src/lib/openapi-types.ts` file provides convenient type aliases and helpers:

### Schema Type Aliases

```typescript
export type Grid = components['schemas']['Grid'];
export type DisasterArea = components['schemas']['DisasterArea'];
export type User = components['schemas']['User'];
export type VolunteerStatus = components['schemas']['VolunteerStatus'];
export type UserRole = components['schemas']['UserRole'];
// ... and more
```

### Endpoint Type Helpers

```typescript
// Extract request body type
export type CreateGridBody = RequestBody<'/grids', 'post'>;

// Extract response type
export type ListGridsResponse = ResponseBody<'/grids', 'get', 200>;

// Extract query parameters
export type ListGridsQuery = QueryParams<'/grids', 'get'>;

// Extract path parameters
export type GetGridParams = PathParams<'/grids/{id}', 'get'>;
```

### Type Guards (Runtime Validation)

```typescript
import { isVolunteerStatus, isUserRole } from './lib/openapi-types';

if (isVolunteerStatus(status)) {
  // TypeScript knows status is VolunteerStatus
}
```

## Integration with Fastify

### Route Handler Example

```typescript
import type { FastifyPluginAsync } from 'fastify';
import type { CreateGridBody, Grid } from '../lib/openapi-types';

const gridsRoutes: FastifyPluginAsync = async (app) => {
  // Type-safe route handler
  app.post<{ Body: CreateGridBody; Reply: Grid }>(
    '/grids',
    async (request, reply) => {
      const gridData = request.body; // TypeScript knows the exact shape

      // Validation, database logic...
      const createdGrid: Grid = {
        // TypeScript enforces all required fields
        id: generateId(),
        code: gridData.code,
        grid_type: gridData.grid_type,
        // ...
      };

      return createdGrid; // TypeScript validates response matches Grid
    }
  );
};
```

### Query Parameters Example

```typescript
import type { ListGridsQuery, ListGridsResponse } from '../lib/openapi-types';

app.get<{ Querystring: ListGridsQuery; Reply: ListGridsResponse }>(
  '/grids',
  async (request, reply) => {
    const { area_id, limit, offset } = request.query; // Fully typed

    // Database query...
    const grids: Grid[] = await fetchGrids({ area_id, limit, offset });

    return grids; // Type-checked against OpenAPI spec
  }
);
```

## Testing

Comprehensive tests validate the type system:

```bash
npm test tests/lib/openapi-types.test.ts
```

**Test Coverage**:
- ✓ Schema type imports (Grid, DisasterArea, User, etc.)
- ✓ Enum type validation (VolunteerStatus, UserRole, UserStatus)
- ✓ Request/Response type extraction
- ✓ Type safety enforcement (required fields, enums)
- ✓ Optional field handling
- ✓ Nested type structures
- ✓ Type guard functions

## Workflow

### When Updating the API

1. **Update OpenAPI spec** (`api-spec/openapi.yaml`)
   ```yaml
   components:
     schemas:
       NewResource:
         type: object
         properties:
           id:
             type: string
   ```

2. **Validate the spec**
   ```bash
   npm run openapi:lint
   ```

3. **Regenerate types**
   ```bash
   npm run codegen
   ```

4. **Update backend code** (TypeScript will show errors for breaking changes)
   ```typescript
   import type { NewResource } from './lib/openapi-types';

   // Add to openapi-types.ts if needed
   export type NewResource = components['schemas']['NewResource'];
   ```

5. **Run tests**
   ```bash
   npm test
   ```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Validate OpenAPI spec
  run: npm run openapi:lint

- name: Generate types
  run: npm run types:openapi

- name: Type check
  run: npm run lint

- name: Run tests
  run: npm test
```

## Benefits

1. **Type Safety**: Compile-time validation that API implementation matches spec
2. **Single Source of Truth**: OpenAPI spec drives both API docs and types
3. **Automatic Updates**: Regenerate types when spec changes
4. **Developer Experience**: IntelliSense/autocomplete for all API types
5. **Reduced Errors**: Catch mismatches before runtime
6. **Documentation**: Types serve as inline documentation

## Common Patterns

### Creating Type-Safe API Clients

```typescript
import type { paths } from 'shovel-shared-types/src/openapi';

// Extract types for a specific endpoint
type LoginBody = paths['/auth/login']['post']['requestBody']['content']['application/json'];
type LoginResponse = paths['/auth/login']['post']['responses'][200]['content']['application/json'];

async function login(credentials: LoginBody): Promise<LoginResponse> {
  // Fully type-safe API call
}
```

### Zod Schema Generation

```typescript
import { z } from 'zod';
import type { Grid } from './lib/openapi-types';

// Create runtime validation from type
export const gridSchema = z.object({
  id: z.string(),
  code: z.string(),
  grid_type: z.enum(['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area']),
  disaster_area_id: z.string(),
  volunteer_needed: z.number().int().default(0),
  volunteer_registered: z.number().int().default(0),
  center_lat: z.number(),
  center_lng: z.number(),
  bounds: z.object({
    north: z.number(),
    south: z.number(),
    east: z.number(),
    west: z.number()
  }),
  status: z.enum(['open', 'closed', 'completed', 'pending']).default('open')
  // ... more fields
}) satisfies z.ZodType<Grid>; // Ensures Zod schema matches OpenAPI type
```

## File Locations

- **OpenAPI Spec**: `/api-spec/openapi.yaml`
- **Generated Types**: `/packages/shared-types/src/openapi.ts`
- **Type Helpers**: `/packages/backend/src/lib/openapi-types.ts`
- **Tests**: `/packages/backend/tests/lib/openapi-types.test.ts`
- **Scripts**:
  - `types:openapi` - Generate types from OpenAPI
  - `types:build` - Build shared-types package
  - `codegen` - Run both generation and build
  - `openapi:lint` - Validate OpenAPI spec

## Next Steps (Phase 1.2+)

- [ ] Generate Zod schemas from OpenAPI (using `@anatine/zod-openapi`)
- [ ] Add OpenAPI spec validation in pre-commit hooks
- [ ] Generate mock data from OpenAPI schemas
- [ ] Add request/response validation middleware using generated types
- [ ] Create OpenAPI-driven API client for frontend

## References

- [openapi-typescript Documentation](https://openapi-ts.pages.dev/)
- [OpenAPI Specification 3.1](https://spec.openapis.org/oas/v3.1.0)
- [Spectral OpenAPI Linting](https://meta.stoplight.io/docs/spectral/)
- [TDD Development Plan](../../docs/TDD_DEVELOPMENT_PLAN.md)
