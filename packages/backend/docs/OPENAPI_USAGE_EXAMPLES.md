# OpenAPI Types - Usage Examples

This document provides practical examples of using OpenAPI-generated types in the Shovel Heroes backend.

## Table of Contents

1. [Basic Route Handlers](#basic-route-handlers)
2. [Query Parameters](#query-parameters)
3. [Path Parameters](#path-parameters)
4. [Request Body Validation](#request-body-validation)
5. [Response Typing](#response-typing)
6. [Error Handling](#error-handling)
7. [Type Guards](#type-guards)
8. [Advanced Patterns](#advanced-patterns)

---

## Basic Route Handlers

### Example: List Grids

```typescript
import type { FastifyPluginAsync } from 'fastify';
import type { Grid } from '../lib/openapi-types';

const gridsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Reply: Grid[] }>(
    '/grids',
    async (request, reply) => {
      const grids = await db.query<Grid>(`
        SELECT * FROM grids
        WHERE status != 'deleted'
      `);

      return grids.rows; // Type-safe: must match Grid[]
    }
  );
};

export default gridsRoutes;
```

### Example: Get Single Grid

```typescript
import type { GetGridParams } from '../lib/openapi-types';

app.get<{ Params: GetGridParams; Reply: Grid }>(
  '/grids/:id',
  async (request, reply) => {
    const { id } = request.params; // TypeScript knows this is a string (ID type)

    const result = await db.query<Grid>(
      'SELECT * FROM grids WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ message: 'Grid not found' });
    }

    return result.rows[0]; // Type-safe: must match Grid
  }
);
```

---

## Query Parameters

### Example: List Grids with Filtering

```typescript
import type { ListGridsQuery, ListGridsResponse } from '../lib/openapi-types';

app.get<{ Querystring: ListGridsQuery; Reply: ListGridsResponse }>(
  '/grids',
  async (request, reply) => {
    // All query params are typed!
    const {
      area_id,
      limit = 50,
      offset = 0
    } = request.query;

    let query = 'SELECT * FROM grids WHERE 1=1';
    const params: any[] = [];

    if (area_id) {
      params.push(area_id);
      query += ` AND disaster_area_id = $${params.length}`;
    }

    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query<Grid>(query, params);

    return result.rows; // Type-checked: Grid[]
  }
);
```

### Example: Volunteers List with Status Filter

```typescript
import type { ListVolunteersQuery, ListVolunteersResponse } from '../lib/openapi-types';

app.get<{ Querystring: ListVolunteersQuery; Reply: ListVolunteersResponse }>(
  '/volunteers',
  async (request, reply) => {
    const {
      grid_id,
      status,
      include_counts = true,
      limit = 50,
      offset = 0
    } = request.query; // All typed from OpenAPI spec!

    // Build query based on filters
    const volunteers = await fetchVolunteers({
      grid_id,
      status,
      limit,
      offset
    });

    const response: ListVolunteersResponse = {
      data: volunteers,
      can_view_phone: await checkPhonePermission(request),
      total: volunteers.length
    };

    if (include_counts) {
      response.status_counts = await getStatusCounts(grid_id);
    }

    return response;
  }
);
```

---

## Path Parameters

### Example: Update Grid

```typescript
import type { PathParams } from '../lib/openapi-types';

type UpdateGridParams = PathParams<'/grids/{id}', 'put'>;
type UpdateGridBody = RequestBody<'/grids', 'put'>;

app.put<{
  Params: UpdateGridParams;
  Body: UpdateGridBody;
  Reply: Grid
}>(
  '/grids/:id',
  async (request, reply) => {
    const { id } = request.params; // Typed as ID (string)
    const gridData = request.body;  // Typed as Grid schema

    // Update logic
    const result = await db.query<Grid>(
      `UPDATE grids SET
        code = $1,
        grid_type = $2,
        status = $3,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [gridData.code, gridData.grid_type, gridData.status, id]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ message: 'Grid not found' });
    }

    return result.rows[0];
  }
);
```

---

## Request Body Validation

### Example: Create Grid with Zod

```typescript
import { z } from 'zod';
import type { CreateGridBody, Grid } from '../lib/openapi-types';

// Zod schema that matches OpenAPI type
const createGridSchema = z.object({
  code: z.string().min(1),
  grid_type: z.enum(['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area']),
  disaster_area_id: z.string().uuid(),
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
}) satisfies z.ZodType<CreateGridBody>; // Ensures Zod matches OpenAPI

app.post<{ Body: CreateGridBody; Reply: Grid }>(
  '/grids',
  {
    schema: {
      body: createGridSchema // Fastify JSON Schema validation
    }
  },
  async (request, reply) => {
    const gridData = request.body; // Validated and typed

    const result = await db.query<Grid>(
      `INSERT INTO grids (
        code, grid_type, disaster_area_id,
        volunteer_needed, volunteer_registered,
        center_lat, center_lng, bounds, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        gridData.code,
        gridData.grid_type,
        gridData.disaster_area_id,
        gridData.volunteer_needed,
        gridData.volunteer_registered,
        gridData.center_lat,
        gridData.center_lng,
        JSON.stringify(gridData.bounds),
        gridData.status
      ]
    );

    return result.rows[0];
  }
);
```

### Example: Auth Registration

```typescript
import type { AuthRegisterBody, AuthRegisterResponse } from '../lib/openapi-types';

app.post<{ Body: AuthRegisterBody; Reply: AuthRegisterResponse }>(
  '/auth/register',
  async (request, reply) => {
    const {
      role,
      full_name,
      phone_number,
      email,
      password,
      emergency_contact
    } = request.body; // All typed from OpenAPI

    // Validation logic
    if (role === 'volunteer' || role === 'victim') {
      if (!phone_number) {
        return reply.code(400).send({
          message: 'Phone number required for volunteers and victims'
        });
      }
    } else {
      if (!email || !password) {
        return reply.code(400).send({
          message: 'Email and password required for admin roles'
        });
      }
    }

    // Create user
    const user = await createUser({
      role,
      full_name,
      phone_number,
      email,
      password,
      emergency_contact
    });

    return reply.code(201).send({
      userId: user.id,
      role: user.role,
      message: 'Registration successful'
    });
  }
);
```

---

## Response Typing

### Example: Typed Error Responses

```typescript
import type { Error as ApiError } from '../lib/openapi-types';

function sendError(reply: FastifyReply, status: number, message: string, code?: string) {
  const error: ApiError = {
    message,
    code
  };
  return reply.code(status).send(error);
}

// Usage
app.get('/grids/:id', async (request, reply) => {
  const grid = await findGrid(request.params.id);

  if (!grid) {
    return sendError(reply, 404, 'Grid not found', 'GRID_NOT_FOUND');
  }

  return grid;
});
```

### Example: Admin Stats Response

```typescript
import type { ResponseBody } from '../lib/openapi-types';

type AdminStatsResponse = ResponseBody<'/admin/stats', 'get', 200>;

app.get<{ Reply: AdminStatsResponse }>(
  '/admin/stats',
  async (request, reply) => {
    const response: AdminStatsResponse = {
      users: {
        total: await countUsers(),
        byRole: await getUsersByRole(),
        byStatus: await getUsersByStatus(),
        activeVolunteers: await countActiveVolunteers(),
        pendingVerifications: await countPendingVerifications(),
        recentSignups: await countRecentSignups()
      }
    };

    return response; // Type-safe: matches OpenAPI spec
  }
);
```

---

## Error Handling

### Example: Typed Error Responses with Status Codes

```typescript
import type { components } from 'shovel-shared-types/src/openapi';

type UnauthorizedError = components['responses']['Unauthorized'];
type NotFoundError = components['responses']['NotFound'];
type ValidationError = components['responses']['ValidationError'];

app.get('/grids/:id', async (request, reply) => {
  // Auth check
  if (!request.user) {
    const error: UnauthorizedError = {
      content: {
        'application/json': {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      }
    };
    return reply.code(401).send(error.content['application/json']);
  }

  // Not found check
  const grid = await findGrid(request.params.id);
  if (!grid) {
    const error: NotFoundError = {
      content: {
        'application/json': {
          message: 'Grid not found',
          code: 'GRID_NOT_FOUND'
        }
      }
    };
    return reply.code(404).send(error.content['application/json']);
  }

  return grid;
});
```

---

## Type Guards

### Example: Runtime Validation with Type Guards

```typescript
import {
  isVolunteerStatus,
  isUserRole,
  isUserStatus
} from '../lib/openapi-types';

// Validate volunteer status from request
app.patch('/volunteer-registrations/:id', async (request, reply) => {
  const { status } = request.body;

  if (!isVolunteerStatus(status)) {
    return reply.code(400).send({
      message: 'Invalid volunteer status',
      code: 'INVALID_STATUS'
    });
  }

  // TypeScript now knows status is VolunteerStatus
  await updateRegistrationStatus(request.params.id, status);

  return { success: true };
});

// Validate user role during registration
app.post('/auth/register', async (request, reply) => {
  const { role } = request.body;

  if (!isUserRole(role)) {
    return reply.code(400).send({
      message: 'Invalid user role',
      code: 'INVALID_ROLE'
    });
  }

  // TypeScript knows role is UserRole
  const user = await createUser({ ...request.body, role });

  return user;
});
```

---

## Advanced Patterns

### Example: Generic API Response Wrapper

```typescript
import type { paths } from 'shovel-shared-types/src/openapi';

type ApiResponse<
  Path extends keyof paths,
  Method extends keyof paths[Path],
  Status extends number = 200
> = paths[Path][Method] extends {
  responses: { [K in Status]: { content: { 'application/json': infer R } } }
}
  ? R
  : never;

// Usage
type ListGridsResponse = ApiResponse<'/grids', 'get', 200>;
type CreateGridResponse = ApiResponse<'/grids', 'post', 201>;
```

### Example: Type-Safe Database Query Builder

```typescript
import type { Grid } from '../lib/openapi-types';

class GridRepository {
  async findAll(filters: Partial<Pick<Grid, 'disaster_area_id' | 'status'>>): Promise<Grid[]> {
    const conditions: string[] = [];
    const values: any[] = [];

    if (filters.disaster_area_id) {
      values.push(filters.disaster_area_id);
      conditions.push(`disaster_area_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      conditions.push(`status = $${values.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM grids ${where}`;

    const result = await db.query<Grid>(query, values);
    return result.rows;
  }

  async create(data: Omit<Grid, 'id' | 'created_at' | 'updated_at'>): Promise<Grid> {
    const result = await db.query<Grid>(
      `INSERT INTO grids (code, grid_type, disaster_area_id, ...)
       VALUES ($1, $2, $3, ...)
       RETURNING *`,
      [data.code, data.grid_type, data.disaster_area_id, ...]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<Grid>): Promise<Grid | null> {
    const fields = Object.keys(data)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    const result = await db.query<Grid>(
      `UPDATE grids SET ${fields}, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, ...Object.values(data)]
    );

    return result.rows[0] || null;
  }
}
```

### Example: API Client with Full Type Safety

```typescript
import type { paths } from 'shovel-shared-types/src/openapi';

class ApiClient {
  async get<Path extends keyof paths>(
    path: Path,
    params?: paths[Path]['get']['parameters']
  ): Promise<paths[Path]['get']['responses'][200]['content']['application/json']> {
    const url = new URL(path, this.baseUrl);

    if (params?.query) {
      Object.entries(params.query).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const response = await fetch(url.toString());
    return response.json();
  }

  async post<Path extends keyof paths>(
    path: Path,
    body: paths[Path]['post']['requestBody']['content']['application/json']
  ): Promise<paths[Path]['post']['responses'][201]['content']['application/json']> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }
}

// Usage
const api = new ApiClient();

const grids = await api.get('/grids', {
  query: { area_id: 'area_123', limit: 50 }
}); // Fully typed!

const newGrid = await api.post('/grids', {
  code: 'A-1',
  grid_type: 'manpower',
  // ... TypeScript ensures all required fields are present
}); // Fully typed!
```

---

## Summary

These examples demonstrate:

1. **Full type safety** from OpenAPI spec to implementation
2. **IntelliSense support** for all API types
3. **Compile-time validation** of request/response shapes
4. **Runtime validation** with type guards
5. **Maintainability** through single source of truth

For more information, see [OPENAPI_TYPES.md](./OPENAPI_TYPES.md).
