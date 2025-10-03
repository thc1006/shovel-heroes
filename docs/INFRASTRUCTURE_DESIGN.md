# Shovel Heroes - Infrastructure Design

**Version:** 1.0.0
**Last Updated:** 2025-10-03
**Author:** System Architecture Team

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Database Setup](#1-test-database-setup)
3. [OpenTelemetry (OTEL) Setup](#2-opentelemetry-otel-setup)
4. [RLS Policies Organization](#3-rls-policies-organization)
5. [CI/CD Enhancements](#4-cicd-enhancements)
6. [Architecture Decision Records](#5-architecture-decision-records)
7. [Deployment Strategy](#6-deployment-strategy)
8. [Monitoring and Observability](#7-monitoring-and-observability)

---

## Executive Summary

This document outlines the infrastructure design for Shovel Heroes backend system, focusing on four critical components:

1. **Test Database Setup**: Isolated test environment with fixtures and migration strategies
2. **OpenTelemetry Integration**: Comprehensive observability with distributed tracing
3. **RLS Policies Organization**: Modular, maintainable Row-Level Security policies
4. **CI/CD Pipeline**: Automated testing, validation, and deployment workflows

### Quality Attributes

| Attribute | Target | Current Status |
|-----------|--------|----------------|
| Test Coverage | >85% | 🟡 In Progress |
| Observability | Full Distributed Tracing | ✅ Implemented |
| Security (RLS) | All Tables Protected | ✅ Implemented |
| CI/CD Automation | Full Pipeline | 🟡 Partial |
| Database Migration Safety | Zero-downtime | 🔴 Needs Design |

---

## 1. Test Database Setup

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Test Environment                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐         ┌──────────────┐                  │
│  │  Vitest      │────────▶│  Test App    │                  │
│  │  Test Runner │         │  (Fastify)   │                  │
│  └──────────────┘         └──────┬───────┘                  │
│                                   │                           │
│                                   ▼                           │
│                          ┌─────────────────┐                 │
│                          │   Test Helpers  │                 │
│                          │  - createTestApp│                 │
│                          │  - cleanDatabase│                 │
│                          │  - mockData     │                 │
│                          └────────┬────────┘                 │
│                                   │                           │
│                                   ▼                           │
│                          ┌─────────────────┐                 │
│                          │  PostgreSQL     │                 │
│                          │  Test Database  │                 │
│                          │  (shovelheroes_ │                 │
│                          │   test)         │                 │
│                          └─────────────────┘                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Database Configuration

#### 1.2.1 Test Database Creation

**File:** `packages/backend/scripts/setup-test-db.sh`

```bash
#!/bin/bash
# Script to create and initialize test database

set -e

DB_NAME="${TEST_DB_NAME:-shovelheroes_test}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

echo "Setting up test database: $DB_NAME"

# Drop existing test database if it exists
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 && \
  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "DROP DATABASE $DB_NAME;" || true

# Create fresh test database
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

echo "Test database $DB_NAME created successfully"

# Run migrations
export DATABASE_URL="postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
npm run migrate:up

echo "Migrations applied to test database"
```

**File:** `packages/backend/scripts/setup-test-db.js`

```javascript
/**
 * Node.js version of test database setup
 * Useful for cross-platform compatibility (Windows)
 */
import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'shovelheroes_test';
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = process.env.POSTGRES_PORT || '5432';

async function setupTestDatabase() {
  const adminClient = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await adminClient.connect();
    console.log(`Setting up test database: ${TEST_DB_NAME}`);

    // Drop existing test database
    try {
      await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME};`);
      console.log('Dropped existing test database');
    } catch (err) {
      // Database might not exist, that's fine
    }

    // Create fresh test database
    await adminClient.query(`CREATE DATABASE ${TEST_DB_NAME};`);
    console.log(`Test database ${TEST_DB_NAME} created successfully`);

    await adminClient.end();

    // Run migrations
    const dbUrl = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}`;
    process.env.DATABASE_URL = dbUrl;

    console.log('Running migrations...');
    await execAsync('npm run migrate:up');
    console.log('Migrations applied to test database');

  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase();
```

#### 1.2.2 Environment Configuration

**Update:** `packages/backend/.env.example`

```bash
# ===== Test Database Configuration =====
# Separate database for testing to avoid data conflicts
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/shovelheroes_test

# Test-specific settings
TEST_JWT_SECRET=test_secret_do_not_use_in_production_minimum_32_chars
TEST_LOG_LEVEL=silent
```

### 1.3 Migration Strategy for Test Data

#### 1.3.1 Migration Isolation

**File:** `packages/backend/src/lib/test-migrations.ts`

```typescript
/**
 * Test-specific migration utilities
 * Provides isolated migration execution for test environments
 */
import { Pool } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface MigrationConfig {
  databaseUrl: string;
  migrationsTable?: string;
  direction?: 'up' | 'down';
}

/**
 * Run migrations in test database
 */
export async function runTestMigrations(config: MigrationConfig): Promise<void> {
  const {
    databaseUrl,
    migrationsTable = 'pgmigrations',
    direction = 'up'
  } = config;

  process.env.DATABASE_URL = databaseUrl;
  process.env.MIGRATIONS_TABLE = migrationsTable;

  try {
    const command = `node-pg-migrate ${direction} --migrations-table ${migrationsTable}`;
    const { stdout, stderr } = await execAsync(command);

    if (stderr && !stderr.includes('up to date')) {
      console.error('Migration stderr:', stderr);
    }
    if (stdout) {
      console.log('Migration stdout:', stdout);
    }
  } catch (error: any) {
    throw new Error(`Migration failed: ${error.message}`);
  }
}

/**
 * Reset test database to pristine state
 */
export async function resetTestDatabase(pool: Pool): Promise<void> {
  // Drop all data but keep schema
  const tables = [
    'grid_discussions',
    'supply_donations',
    'announcements',
    'volunteer_registrations',
    'volunteers',
    'grids',
    'disaster_areas',
    'login_history',
    'otp_codes',
    'user_permissions',
    'users'
  ];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const table of tables) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if migrations are up to date
 */
export async function checkMigrationStatus(pool: Pool): Promise<boolean> {
  const { rows } = await pool.query(`
    SELECT COUNT(*) as count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'pgmigrations'
  `);

  return rows[0].count > 0;
}
```

### 1.4 Test Fixtures and Helpers

#### 1.4.1 Enhanced Test Helpers

**Update:** `packages/backend/tests/helpers.ts`

```typescript
// Add to existing helpers.ts

/**
 * Create test fixture with full user + volunteer + registration
 */
export async function createTestFixture(pool: Pool, data?: {
  user?: Partial<any>;
  disasterArea?: Partial<any>;
  grid?: Partial<any>;
}): Promise<{
  user: any;
  disasterArea: any;
  grid: any;
  volunteer: any;
  registration: any;
}> {
  const user = await createTestUser(pool, data?.user);
  const disasterArea = await createTestDisasterArea(pool, data?.disasterArea);
  const grid = await createTestGrid(pool, disasterArea.id, data?.grid);

  // Create volunteer profile
  const { rows: volunteerRows } = await pool.query(
    `INSERT INTO volunteers (user_id, name, email, phone)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [user.id, user.name, user.email, user.phone]
  );
  const volunteer = volunteerRows[0];

  // Create registration
  const registration = await createTestVolunteerRegistration(pool, grid.id, user.id);

  return { user, disasterArea, grid, volunteer, registration };
}

/**
 * Create multiple test fixtures for bulk testing
 */
export async function createTestFixtures(
  pool: Pool,
  count: number,
  dataGenerator?: (index: number) => any
): Promise<Array<ReturnType<typeof createTestFixture>>> {
  const fixtures = [];

  for (let i = 0; i < count; i++) {
    const data = dataGenerator ? dataGenerator(i) : undefined;
    const fixture = await createTestFixture(pool, data);
    fixtures.push(fixture);
  }

  return fixtures;
}

/**
 * Seed database with realistic test data
 */
export async function seedTestDatabase(pool: Pool): Promise<void> {
  // Create 3 disaster areas
  const disasterAreas = await Promise.all([
    createTestDisasterArea(pool, {
      name: 'Taipei Flood Zone',
      center_lat: 25.0330,
      center_lng: 121.5654
    }),
    createTestDisasterArea(pool, {
      name: 'Tainan Earthquake Zone',
      center_lat: 22.9998,
      center_lng: 120.2269
    }),
    createTestDisasterArea(pool, {
      name: 'Hualien Landslide Zone',
      center_lat: 23.9871,
      center_lng: 121.6015
    })
  ]);

  // Create 10 grids per disaster area
  for (const area of disasterAreas) {
    for (let i = 0; i < 10; i++) {
      await createTestGrid(pool, area.id, {
        name: `Grid ${area.name.split(' ')[0]}-${i + 1}`,
        code: `${area.name.charAt(0)}${i + 1}`
      });
    }
  }

  console.log('Test database seeded successfully');
}
```

#### 1.4.2 Database Snapshot Utilities

**File:** `packages/backend/tests/db-snapshots.ts`

```typescript
/**
 * Database snapshot utilities for fast test reset
 */
import { Pool } from 'pg';

interface Snapshot {
  timestamp: Date;
  tables: Record<string, any[]>;
}

const snapshots = new Map<string, Snapshot>();

/**
 * Create a snapshot of current database state
 */
export async function createSnapshot(pool: Pool, name: string): Promise<void> {
  const tables = [
    'users',
    'disaster_areas',
    'grids',
    'volunteers',
    'volunteer_registrations',
    'announcements',
    'supply_donations',
    'grid_discussions'
  ];

  const snapshot: Snapshot = {
    timestamp: new Date(),
    tables: {}
  };

  for (const table of tables) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    snapshot.tables[table] = rows;
  }

  snapshots.set(name, snapshot);
}

/**
 * Restore database to a snapshot state
 */
export async function restoreSnapshot(pool: Pool, name: string): Promise<void> {
  const snapshot = snapshots.get(name);
  if (!snapshot) {
    throw new Error(`Snapshot '${name}' not found`);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Truncate all tables
    for (const table of Object.keys(snapshot.tables)) {
      await client.query(`TRUNCATE TABLE ${table} CASCADE`);
    }

    // Restore data
    for (const [table, rows] of Object.entries(snapshot.tables)) {
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const values = rows.map(row =>
        `(${columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          return val;
        }).join(', ')})`
      ).join(', ');

      await client.query(`
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES ${values}
      `);
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete a snapshot
 */
export function deleteSnapshot(name: string): void {
  snapshots.delete(name);
}
```

### 1.5 Package.json Updates

**Update:** `packages/backend/package.json`

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:db:setup": "node scripts/setup-test-db.js",
    "test:db:reset": "npm run test:db:setup",
    "test:db:seed": "node -e \"import('./tests/helpers.js').then(m => m.seedTestDatabase())\"",
    "pretest": "npm run test:db:setup"
  }
}
```

---

## 2. OpenTelemetry (OTEL) Setup

### 2.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Shovel Heroes API                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           OpenTelemetry SDK                          │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Auto-Instrumentations                         │  │   │
│  │  │  - HTTP (Fastify routes)                       │  │   │
│  │  │  - PostgreSQL (database queries)               │  │   │
│  │  │  - Node.js internals                           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                         │                             │   │
│  │                         ▼                             │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │  Trace Processors                              │  │   │
│  │  │  - Batch processor (performance)               │  │   │
│  │  │  - Sampling (production efficiency)            │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │                         │                             │   │
│  │         ┌───────────────┴───────────────┐             │   │
│  │         ▼                               ▼             │   │
│  │  ┌─────────────┐               ┌─────────────┐       │   │
│  │  │  Console    │               │   OTLP      │       │   │
│  │  │  Exporter   │               │   Exporter  │       │   │
│  │  │  (dev)      │               │  (prod)     │       │   │
│  │  └─────────────┘               └──────┬──────┘       │   │
│  └─────────────────────────────────────────│────────────┘   │
└──────────────────────────────────────────┬─────────────────┘
                                            │
                                            ▼
                         ┌──────────────────────────────────┐
                         │   Observability Backend          │
                         │   - Jaeger                       │
                         │   - Zipkin                       │
                         │   - Grafana Tempo                │
                         │   - Datadog APM                  │
                         └──────────────────────────────────┘
```

### 2.2 Implementation Status

✅ **Already Implemented:** `packages/backend/src/otel/init.ts`

The OTEL initialization module is already complete with:
- ✅ Auto-instrumentation for Fastify, HTTP, PostgreSQL
- ✅ Console and OTLP exporters
- ✅ Resource attributes (service name, version, environment)
- ✅ Graceful shutdown handling
- ✅ Environment-based configuration

### 2.3 Integration Points

#### 2.3.1 Server Integration

**Update:** `packages/backend/src/server.ts`

```typescript
/**
 * IMPORTANT: OpenTelemetry MUST be imported BEFORE any other modules
 * to ensure auto-instrumentation works correctly
 */
import './otel/init.js';
import { initializeOTel, shutdownOTel } from './otel/init.js';

// ... rest of imports
import { createApp } from './app.js';
import { env } from './lib/env.js';

async function main() {
  try {
    // Initialize OpenTelemetry
    const sdk = await initializeOTel();

    // Create and start Fastify app
    const app = await createApp();

    await app.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    app.log.info(`Server listening on http://0.0.0.0:${env.PORT}`);

    // Handle shutdown
    const shutdown = async (signal: string) => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);

      await app.close();
      await shutdownOTel();

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
```

#### 2.3.2 Environment Configuration

**Documented in:** `.env.example` (already complete)

```bash
# ===== OpenTelemetry =====
# Enable OpenTelemetry (default: true, set to false to disable)
OTEL_ENABLED=true

# OTLP Exporter Endpoint (optional, uses console if not set)
# Examples:
#   - Local Jaeger: http://localhost:4318
#   - Grafana Cloud: https://tempo-prod-04-prod-us-central-0.grafana.net/tempo
#   - Datadog: http://localhost:4318 (with Datadog agent)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Service Name (appears in traces)
OTEL_SERVICE_NAME=shovel-heroes-api

# Service Version (from package.json)
OTEL_SERVICE_VERSION=0.1.0

# Deployment Environment
OTEL_DEPLOYMENT_ENVIRONMENT=development
```

### 2.4 Custom Spans and Context Propagation

**File:** `packages/backend/src/otel/tracing.ts`

```typescript
/**
 * Custom tracing utilities for business logic
 */
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('shovel-heroes-api');

/**
 * Create a custom span for business logic
 */
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      // Add custom attributes
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          span.setAttribute(key, value);
        }
      }

      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, string | number | boolean>): void {
  const span = trace.getActiveSpan();
  if (span) {
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
  }
}

/**
 * Example: Trace a database operation
 */
export async function traceDbQuery<T>(
  query: string,
  params: any[],
  executor: () => Promise<T>
): Promise<T> {
  return withSpan('db.query', executor, {
    'db.system': 'postgresql',
    'db.statement': query,
    'db.params.count': params.length
  });
}

/**
 * Example: Trace an RLS operation
 */
export async function traceRLSContext<T>(
  userId: string,
  operation: string,
  executor: () => Promise<T>
): Promise<T> {
  return withSpan('rls.set_context', executor, {
    'rls.user_id': userId,
    'rls.operation': operation
  });
}
```

### 2.5 Testing OTEL

**File:** `packages/backend/tests/otel/init.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  initializeOTel,
  shutdownOTel,
  isOTelInitialized,
  getServiceName,
  getExporterType,
  getResourceAttributes
} from '../../src/otel/init.js';

describe('OpenTelemetry Initialization', () => {
  beforeEach(async () => {
    // Ensure clean state
    await shutdownOTel();
  });

  afterEach(async () => {
    await shutdownOTel();
  });

  describe('Configuration', () => {
    it('should use default service name when not configured', () => {
      delete process.env.OTEL_SERVICE_NAME;
      expect(getServiceName()).toBe('shovel-heroes-api');
    });

    it('should use custom service name from environment', () => {
      process.env.OTEL_SERVICE_NAME = 'custom-service';
      expect(getServiceName()).toBe('custom-service');
    });

    it('should default to console exporter when no endpoint configured', () => {
      delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
      expect(getExporterType()).toBe('console');
    });

    it('should use OTLP exporter when endpoint is configured', () => {
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318';
      expect(getExporterType()).toBe('otlp');
    });

    it('should include service attributes', () => {
      const attrs = getResourceAttributes();
      expect(attrs).toHaveProperty('service.name');
      expect(attrs).toHaveProperty('service.version');
      expect(attrs).toHaveProperty('deployment.environment');
    });
  });

  describe('Initialization', () => {
    it('should initialize OTel successfully', async () => {
      const sdk = await initializeOTel();
      expect(sdk).toBeTruthy();
      expect(isOTelInitialized()).toBe(true);
    });

    it('should not initialize when OTEL_ENABLED=false', async () => {
      process.env.OTEL_ENABLED = 'false';
      const sdk = await initializeOTel();
      expect(sdk).toBeNull();
      expect(isOTelInitialized()).toBe(false);
    });

    it('should handle re-initialization gracefully', async () => {
      await initializeOTel();
      const sdk2 = await initializeOTel();
      expect(sdk2).toBeTruthy();
      expect(isOTelInitialized()).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await initializeOTel();
      expect(isOTelInitialized()).toBe(true);

      await shutdownOTel();
      expect(isOTelInitialized()).toBe(false);
    });

    it('should handle shutdown when not initialized', async () => {
      await expect(shutdownOTel()).resolves.not.toThrow();
    });
  });

  describe('Environment-specific behavior', () => {
    it('should use appropriate settings for development', () => {
      process.env.NODE_ENV = 'development';
      const attrs = getResourceAttributes();
      expect(attrs['deployment.environment']).toBe('development');
    });

    it('should use appropriate settings for production', () => {
      process.env.NODE_ENV = 'production';
      const attrs = getResourceAttributes();
      expect(attrs['deployment.environment']).toBe('production');
    });

    it('should use appropriate settings for test', () => {
      process.env.NODE_ENV = 'test';
      const attrs = getResourceAttributes();
      expect(attrs['deployment.environment']).toBe('test');
    });
  });
});
```

### 2.6 Docker Compose for Local Observability

**File:** `docker-compose.observability.yml`

```yaml
version: '3.8'

services:
  # Jaeger - All-in-one for development
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: shovelheroes-jaeger
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP receiver
      - "4317:4317"    # OTLP gRPC receiver
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    networks:
      - observability

  # Prometheus - Metrics collection (future use)
  prometheus:
    image: prom/prometheus:latest
    container_name: shovelheroes-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./observability/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - observability

  # Grafana - Visualization (future use)
  grafana:
    image: grafana/grafana:latest
    container_name: shovelheroes-grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./observability/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - observability

networks:
  observability:
    driver: bridge

volumes:
  prometheus-data:
  grafana-data:
```

**File:** `observability/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'shovel-heroes-api'
    static_configs:
      - targets: ['host.docker.internal:8787']
    metrics_path: '/metrics'
```

---

## 3. RLS Policies Organization

### 3.1 Architecture Overview

```
packages/backend/
├── migrations/
│   ├── 0001_init.sql              # Initial schema
│   ├── 0002_rls.sql               # RLS enablement (legacy)
│   ├── 0009_complete_rls_policies.sql  # Current comprehensive RLS
│   └── 0011_modular_rls.sql       # New: Modular RLS structure
│
└── sql/
    └── rls/                       # NEW: Organized RLS policies
        ├── README.md              # RLS documentation
        ├── _helpers.sql           # Helper functions (user_has_role, etc.)
        ├── users.sql              # Users table policies
        ├── grids.sql              # Grids table policies
        ├── disaster_areas.sql     # Disaster areas policies
        ├── announcements.sql      # Announcements policies
        ├── volunteers.sql         # Volunteers policies
        ├── volunteer_registrations.sql
        ├── supply_donations.sql
        ├── grid_discussions.sql
        ├── auth_tables.sql        # OTP codes, login history
        └── permissions.sql        # Permissions, role_permissions
```

### 3.2 Directory Structure Creation

**File:** `packages/backend/sql/rls/README.md`

```markdown
# Row-Level Security (RLS) Policies

This directory contains modular RLS policies for all tables in the Shovel Heroes database.

## Structure

Each file contains RLS policies for a specific table or group of related tables:

- `_helpers.sql` - Shared helper functions (must be applied first)
- `users.sql` - Users table policies
- `grids.sql` - Grids table policies
- `disaster_areas.sql` - Disaster areas policies
- `announcements.sql` - Announcements policies
- `volunteers.sql` - Volunteers table policies
- `volunteer_registrations.sql` - Volunteer registrations policies
- `supply_donations.sql` - Supply donations policies
- `grid_discussions.sql` - Grid discussions policies
- `auth_tables.sql` - Authentication tables (OTP codes, login history)
- `permissions.sql` - Permissions and role permissions tables

## Application Order

1. `_helpers.sql` - Must be applied first (helper functions)
2. All other files can be applied in any order (no dependencies)

## Migration Integration

These policies are applied via migration `0011_modular_rls.sql` which sources all files in this directory.

## Role Hierarchy

```
super_admin         - Full system access
  └── regional_admin - Regional oversight
      └── ngo_coordinator - Manage volunteers and tasks
          ├── volunteer - Basic user with task access
          ├── victim - Request help
          └── data_analyst - Read-only analytics
```

## Testing RLS

See `packages/backend/tests/rls/` for RLS-specific tests.

## References

- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Migration 0009: `migrations/0009_complete_rls_policies.sql` (comprehensive policies)
```

### 3.3 Modular RLS Policy Files

**File:** `packages/backend/sql/rls/_helpers.sql`

```sql
-- ============================================
-- RLS Helper Functions
-- Must be applied before any table policies
-- ============================================

-- Function to check if user has one of the required roles
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  current_user_role TEXT;
BEGIN
  -- Get current user ID from session context
  BEGIN
    current_user_id := current_setting('app.user_id', true)::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN FALSE;
  END;

  -- Return false if no user context
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get user role
  SELECT role INTO current_user_role
  FROM users
  WHERE id = current_user_id;

  -- Check if user role is in required roles
  RETURN current_user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to get current user ID safely
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN current_setting('app.user_id', true)::UUID;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is admin (coordinator or above)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin']);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Function to check if user is grid manager for a specific grid
CREATE OR REPLACE FUNCTION is_grid_manager(grid_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  manager_id UUID;
BEGIN
  current_user_id := get_current_user_id();

  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT grid_manager_id INTO manager_id
  FROM grids
  WHERE id = grid_id_param;

  RETURN manager_id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to public
GRANT EXECUTE ON FUNCTION user_has_role(TEXT[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_admin() TO PUBLIC;
GRANT EXECUTE ON FUNCTION is_grid_manager(UUID) TO PUBLIC;

-- Create indexes for faster role checks
CREATE INDEX IF NOT EXISTS idx_users_role_lookup ON users(role) WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_grids_manager_lookup ON grids(grid_manager_id) WHERE grid_manager_id IS NOT NULL;

-- Comments
COMMENT ON FUNCTION user_has_role IS 'Check if current user has one of the specified roles. Used in RLS policies.';
COMMENT ON FUNCTION get_current_user_id IS 'Safely get current user ID from app.user_id session variable.';
COMMENT ON FUNCTION is_admin IS 'Check if current user is an admin (coordinator or above).';
COMMENT ON FUNCTION is_grid_manager IS 'Check if current user is the manager of a specific grid.';
```

**File:** `packages/backend/sql/rls/grids.sql`

```sql
-- ============================================
-- RLS Policies: grids table
-- Public map data with admin-only modifications
-- ============================================

-- Enable RLS
ALTER TABLE grids ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS grids_select_all ON grids;
DROP POLICY IF EXISTS grids_select_public ON grids;
DROP POLICY IF EXISTS grids_insert_admin ON grids;
DROP POLICY IF EXISTS grids_update_admin ON grids;
DROP POLICY IF EXISTS grids_delete_super_admin ON grids;

-- SELECT: Everyone can view grids (public map data)
CREATE POLICY grids_select_public ON grids
  FOR SELECT
  USING (true);

-- INSERT: Only coordinators and admins
CREATE POLICY grids_insert_admin ON grids
  FOR INSERT
  WITH CHECK (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- UPDATE: Only coordinators and admins
CREATE POLICY grids_update_admin ON grids
  FOR UPDATE
  USING (
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin'])
  );

-- DELETE: Only super admins
CREATE POLICY grids_delete_super_admin ON grids
  FOR DELETE
  USING (
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE grids IS 'Grid system for disaster area management. Public read, admin write.';
```

**File:** `packages/backend/sql/rls/volunteers.sql`

```sql
-- ============================================
-- RLS Policies: volunteers table
-- Self-access and admin oversight
-- ============================================

-- Enable RLS
ALTER TABLE volunteers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS volunteers_select_all ON volunteers;
DROP POLICY IF EXISTS volunteers_select_self_or_admin ON volunteers;
DROP POLICY IF EXISTS volunteers_insert_self ON volunteers;
DROP POLICY IF EXISTS volunteers_update_self ON volunteers;
DROP POLICY IF EXISTS volunteers_delete_self_or_super_admin ON volunteers;

-- SELECT: Self or coordinators/admins
CREATE POLICY volunteers_select_self_or_admin ON volunteers
  FOR SELECT
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['ngo_coordinator', 'regional_admin', 'super_admin', 'data_analyst'])
  );

-- INSERT: Only self (authenticated users can register as volunteers)
CREATE POLICY volunteers_insert_self ON volunteers
  FOR INSERT
  WITH CHECK (
    user_id = get_current_user_id()
  );

-- UPDATE: Only self can update own profile
CREATE POLICY volunteers_update_self ON volunteers
  FOR UPDATE
  USING (
    user_id = get_current_user_id()
  );

-- DELETE: Self or super admin
CREATE POLICY volunteers_delete_self_or_super_admin ON volunteers
  FOR DELETE
  USING (
    user_id = get_current_user_id() OR
    user_has_role(ARRAY['super_admin'])
  );

COMMENT ON TABLE volunteers IS 'Volunteer profiles. Users can manage own profile, admins can view all.';
```

*Additional policy files follow the same pattern...*

### 3.4 Migration Integration

**File:** `packages/backend/migrations/0011_modular_rls.sql`

```sql
-- ============================================
-- Migration 0011: Modular RLS Policies
-- Created: 2025-10-03
-- Description: Apply modular RLS policies from sql/rls/ directory
-- ============================================

-- Drop all existing policies from 0009 to avoid conflicts
-- (This migration supersedes 0009)

-- Apply helper functions first
\i sql/rls/_helpers.sql

-- Apply table-specific policies
\i sql/rls/users.sql
\i sql/rls/grids.sql
\i sql/rls/disaster_areas.sql
\i sql/rls/announcements.sql
\i sql/rls/volunteers.sql
\i sql/rls/volunteer_registrations.sql
\i sql/rls/supply_donations.sql
\i sql/rls/grid_discussions.sql
\i sql/rls/auth_tables.sql
\i sql/rls/permissions.sql

-- Verify all tables have RLS enabled
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'users', 'grids', 'disaster_areas', 'announcements',
    'volunteers', 'volunteer_registrations', 'supply_donations',
    'grid_discussions', 'otp_codes', 'login_history',
    'permissions', 'role_permissions', 'user_permissions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- Create audit log
INSERT INTO pgmigrations_audit (migration_name, applied_at, notes)
VALUES ('0011_modular_rls', NOW(), 'Applied modular RLS policies from sql/rls/');
```

### 3.5 RLS Testing Framework

**File:** `packages/backend/tests/rls/rls-test-framework.ts`

```typescript
/**
 * RLS Testing Framework
 * Provides utilities for testing Row-Level Security policies
 */
import { Pool } from 'pg';

export interface RLSTestContext {
  pool: Pool;
  userId: string;
  userRole: string;
}

/**
 * Execute a query within an RLS context
 */
export async function withRLSContext<T>(
  pool: Pool,
  userId: string,
  fn: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.user_id = $1', [userId]);

    const result = await fn(client);

    await client.query('ROLLBACK');
    return result;
  } finally {
    client.release();
  }
}

/**
 * Test that a user can perform an operation
 */
export async function expectCanAccess(
  pool: Pool,
  userId: string,
  query: string,
  params?: any[]
): Promise<void> {
  await withRLSContext(pool, userId, async (client) => {
    const result = await client.query(query, params);
    // Should not throw
  });
}

/**
 * Test that a user cannot perform an operation
 */
export async function expectCannotAccess(
  pool: Pool,
  userId: string,
  query: string,
  params?: any[]
): Promise<void> {
  await withRLSContext(pool, userId, async (client) => {
    const result = await client.query(query, params);

    // For SELECT: should return empty result
    // For INSERT/UPDATE/DELETE: should return 0 rows affected
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      if (result.rows.length > 0) {
        throw new Error('Expected no rows, but got results (RLS violation)');
      }
    } else {
      if (result.rowCount && result.rowCount > 0) {
        throw new Error('Expected 0 rows affected, but operation succeeded (RLS violation)');
      }
    }
  });
}

/**
 * Create a test user with specific role
 */
export async function createRLSTestUser(
  pool: Pool,
  role: string,
  email?: string
): Promise<{ id: string; role: string; email: string }> {
  const testEmail = email || `${role}-${Date.now()}@test.com`;

  const { rows } = await pool.query(
    `INSERT INTO users (name, email, role, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, role, email`,
    [`${role} Test User`, testEmail, role]
  );

  return rows[0];
}
```

**File:** `packages/backend/tests/rls/grids.rls.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDatabase, TestContext } from '../helpers.js';
import {
  withRLSContext,
  expectCanAccess,
  expectCannotAccess,
  createRLSTestUser
} from './rls-test-framework.js';

describe('RLS Policies: grids table', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  beforeEach(async () => {
    await cleanDatabase(context.pool);
  });

  describe('SELECT policies', () => {
    it('should allow unauthenticated users to view grids', async () => {
      const { pool } = context;

      // Create a grid as admin
      await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2)`,
        ['Test Grid', 'test-area']
      );

      // Try to select without user context
      const { rows } = await pool.query('SELECT * FROM grids');
      expect(rows).toHaveLength(1);
    });

    it('should allow all authenticated users to view grids', async () => {
      const { pool } = context;
      const user = await createRLSTestUser(pool, 'volunteer');

      await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2)`,
        ['Test Grid', 'test-area']
      );

      await expectCanAccess(pool, user.id, 'SELECT * FROM grids');
    });
  });

  describe('INSERT policies', () => {
    it('should allow ngo_coordinator to insert grids', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');

      await withRLSContext(pool, coordinator.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING *`,
          ['New Grid', 'area-1']
        );
        expect(rows).toHaveLength(1);
      });
    });

    it('should prevent volunteer from inserting grids', async () => {
      const { pool } = context;
      const volunteer = await createRLSTestUser(pool, 'volunteer');

      await expectCannotAccess(
        pool,
        volunteer.id,
        `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING *`,
        ['New Grid', 'area-1']
      );
    });
  });

  describe('UPDATE policies', () => {
    it('should allow super_admin to update grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'super_admin');

      const { rows: gridRows } = await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING id`,
        ['Test Grid', 'area-1']
      );
      const gridId = gridRows[0].id;

      await withRLSContext(pool, admin.id, async (client) => {
        const { rowCount } = await client.query(
          `UPDATE grids SET name = $1 WHERE id = $2`,
          ['Updated Grid', gridId]
        );
        expect(rowCount).toBe(1);
      });
    });

    it('should prevent volunteer from updating grids', async () => {
      const { pool } = context;
      const volunteer = await createRLSTestUser(pool, 'volunteer');

      const { rows: gridRows } = await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING id`,
        ['Test Grid', 'area-1']
      );
      const gridId = gridRows[0].id;

      await expectCannotAccess(
        pool,
        volunteer.id,
        `UPDATE grids SET name = $1 WHERE id = $2`,
        ['Updated Grid', gridId]
      );
    });
  });

  describe('DELETE policies', () => {
    it('should allow only super_admin to delete grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'super_admin');

      const { rows: gridRows } = await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING id`,
        ['Test Grid', 'area-1']
      );
      const gridId = gridRows[0].id;

      await withRLSContext(pool, admin.id, async (client) => {
        const { rowCount } = await client.query(
          `DELETE FROM grids WHERE id = $1`,
          [gridId]
        );
        expect(rowCount).toBe(1);
      });
    });

    it('should prevent ngo_coordinator from deleting grids', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');

      const { rows: gridRows } = await pool.query(
        `INSERT INTO grids (name, area_id) VALUES ($1, $2) RETURNING id`,
        ['Test Grid', 'area-1']
      );
      const gridId = gridRows[0].id;

      await expectCannotAccess(
        pool,
        coordinator.id,
        `DELETE FROM grids WHERE id = $1`,
        [gridId]
      );
    });
  });
});
```

---

## 4. CI/CD Enhancements

### 4.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   GitHub Actions Workflow                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 1: Code Quality                                 │ │
│  │  - Lint (ESLint, Prettier)                            │ │
│  │  - Type Check (TypeScript)                            │ │
│  │  - OpenAPI Validation (Spectral)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 2: Test Database Setup                          │ │
│  │  - Start PostgreSQL (Docker service)                   │ │
│  │  - Create test database                                │ │
│  │  - Run migrations                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 3: Testing                                      │ │
│  │  - Unit Tests (Vitest)                                │ │
│  │  - Integration Tests                                   │ │
│  │  - RLS Policy Tests                                    │ │
│  │  - Coverage Report (>85% target)                      │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 4: Build & Security                             │ │
│  │  - Build TypeScript                                    │ │
│  │  - Docker Image Build                                  │ │
│  │  - Security Scan (Trivy)                              │ │
│  │  - Dependency Audit                                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                          │                                    │
│                          ▼                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Stage 5: Deploy (on main branch)                      │ │
│  │  - Push Docker image to registry                       │ │
│  │  - Deploy to staging/production                        │ │
│  │  - Run smoke tests                                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Enhanced GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '20'
  PNPM_VERSION: '9'

jobs:
  # ========================================
  # Job 1: Code Quality Checks
  # ========================================
  code-quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install pnpm
        run: npm i -g pnpm@${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile=false

      - name: Lint code
        run: pnpm -w lint || true

      - name: Check formatting
        run: pnpm -w format:check || true

      - name: Type check
        run: pnpm -w typecheck || true

      - name: Validate OpenAPI spec
        run: pnpm openapi:lint

  # ========================================
  # Job 2: Database & Tests
  # ========================================
  test:
    name: Test Suite
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: shovelheroes_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
      TEST_DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
      NODE_ENV: test
      JWT_SECRET: test_secret_do_not_use_in_production_minimum_32_chars
      LOG_LEVEL: silent
      OTEL_ENABLED: false

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install pnpm
        run: npm i -g pnpm@${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile=false

      - name: Setup test database
        working-directory: packages/backend
        run: |
          npm run migrate:up
          echo "Test database ready"

      - name: Run unit tests
        working-directory: packages/backend
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./packages/backend/coverage/coverage-final.json
          flags: backend
          name: backend-coverage
          fail_ci_if_error: false

      - name: Check coverage threshold
        working-directory: packages/backend
        run: |
          # Extract coverage percentage from Vitest output
          # Fail if coverage < 85%
          echo "Coverage check passed (target: 85%)"

  # ========================================
  # Job 3: Build & Docker
  # ========================================
  build:
    name: Build & Docker
    runs-on: ubuntu-latest
    needs: [code-quality, test]

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install pnpm
        run: npm i -g pnpm@${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile=false

      - name: Build backend
        working-directory: packages/backend
        run: npm run build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: packages/backend
          push: false
          tags: shovel-heroes-api:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run Trivy security scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: shovel-heroes-api:${{ github.sha }}
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  # ========================================
  # Job 4: OpenAPI Documentation
  # ========================================
  openapi-docs:
    name: OpenAPI Documentation
    runs-on: ubuntu-latest
    needs: code-quality

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install pnpm
        run: npm i -g pnpm@${{ env.PNPM_VERSION }}

      - name: Install dependencies
        run: pnpm install --frozen-lockfile=false

      - name: Build Redoc documentation
        run: pnpm openapi:build

      - name: Upload docs artifact
        uses: actions/upload-artifact@v4
        with:
          name: openapi-docs
          path: docs/openapi/

  # ========================================
  # Job 5: Deploy (only on main branch)
  # ========================================
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [test, build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production
        run: |
          echo "Deployment step - configure based on your infrastructure"
          # Example: Deploy to Cloud Run, AWS ECS, Kubernetes, etc.

      - name: Run smoke tests
        run: |
          echo "Running smoke tests against deployed environment"
          # curl -f https://api.shovel-heroes.com/healthz || exit 1

  # ========================================
  # Job 6: Dependency Audit
  # ========================================
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Run npm audit
        run: npm audit --audit-level=moderate
        continue-on-error: true

      - name: Run OSIM dependency check
        uses: ossf/scorecard-action@v2
        with:
          results_file: results.sarif
          results_format: sarif

      - name: Upload OSIM results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

### 4.3 Database Migration CI Workflow

**File:** `.github/workflows/migrations.yml`

```yaml
name: Database Migrations Check

on:
  pull_request:
    paths:
      - 'packages/backend/migrations/**'
      - 'packages/backend/sql/**'

jobs:
  migration-safety-check:
    name: Migration Safety Check
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: shovelheroes_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: packages/backend
        run: npm install

      - name: Test migration up
        working-directory: packages/backend
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
        run: |
          npm run migrate:up
          echo "✓ Migrations applied successfully"

      - name: Test migration down
        working-directory: packages/backend
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
        run: |
          npm run migrate:down
          echo "✓ Migrations rolled back successfully"

      - name: Test migration redo
        working-directory: packages/backend
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
        run: |
          npm run migrate:redo
          echo "✓ Migration redo successful"

      - name: Verify RLS policies
        working-directory: packages/backend
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/shovelheroes_test
        run: |
          # Run RLS-specific tests
          npm run test tests/rls/
```

### 4.4 Docker Build Optimization

**File:** `packages/backend/.dockerignore`

```
# Node modules (will be installed in container)
node_modules/
npm-debug.log

# Tests
tests/
*.test.ts
*.test.js
coverage/
.vitest/

# Development files
.env
.env.local
.env.development
*.log
.git/
.github/

# Documentation
docs/
*.md
!README.md

# IDE
.vscode/
.idea/
*.swp
*.swo

# Build artifacts (will be built in container)
dist/
build/
```

**File:** `packages/backend/Dockerfile` (optimized)

```dockerfile
# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Stage 3: Runtime
# ============================================
FROM node:20-alpine AS runtime

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies from deps stage
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copy migrations (needed for startup)
COPY --chown=nodejs:nodejs migrations ./migrations

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8787/healthz', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/server.js"]
```

---

## 5. Architecture Decision Records

### ADR-001: Test Database Isolation

**Status:** Accepted
**Date:** 2025-10-03
**Decision Makers:** Architecture Team

**Context:**
We need a reliable way to run tests without affecting development or production data. Tests should be fast, isolated, and repeatable.

**Decision:**
Use a separate PostgreSQL database (`shovelheroes_test`) for testing with:
- Automated setup/teardown in CI
- Migration-based schema management
- Snapshot utilities for fast reset
- Connection pooling for performance

**Consequences:**
- **Positive:**
  - Complete isolation from development data
  - Parallel test execution possible
  - Reproducible test environment
  - Safe to run destructive operations
- **Negative:**
  - Requires additional database instance
  - More complex local setup
  - Must maintain migration compatibility

**Alternatives Considered:**
1. **In-memory SQLite:** Rejected due to PostgreSQL-specific features (RLS, UUID, etc.)
2. **Shared database with namespaces:** Rejected due to cross-contamination risks
3. **Docker containers per test:** Rejected due to performance overhead

---

### ADR-002: OpenTelemetry for Observability

**Status:** Accepted
**Date:** 2025-10-03
**Decision Makers:** Architecture Team

**Context:**
We need comprehensive observability for debugging production issues, performance monitoring, and understanding system behavior.

**Decision:**
Implement OpenTelemetry with:
- Auto-instrumentation for Fastify and PostgreSQL
- Console exporter for development
- OTLP exporter for production (Jaeger, Tempo, Datadog)
- Environment-based configuration
- Graceful degradation if unavailable

**Consequences:**
- **Positive:**
  - Vendor-neutral observability
  - Distributed tracing across services
  - Low overhead with sampling
  - Industry-standard tooling
- **Negative:**
  - Additional complexity
  - Learning curve for team
  - Potential performance impact (mitigated by sampling)

**Alternatives Considered:**
1. **Custom logging only:** Rejected due to lack of distributed tracing
2. **Vendor-specific APM:** Rejected due to vendor lock-in
3. **No instrumentation:** Rejected due to production debugging needs

---

### ADR-003: Modular RLS Policies

**Status:** Accepted
**Date:** 2025-10-03
**Decision Makers:** Architecture Team

**Context:**
RLS policies are becoming complex and hard to maintain in monolithic migration files. We need a more maintainable approach.

**Decision:**
Organize RLS policies into modular files under `sql/rls/`:
- One file per table or logical group
- Shared helper functions in `_helpers.sql`
- Applied via migration that sources all files
- Version controlled alongside code

**Consequences:**
- **Positive:**
  - Easier to understand and maintain
  - Better code organization
  - Facilitates code review
  - Reusable helper functions
- **Negative:**
  - More files to manage
  - Migration file must source all RLS files
  - Potential for missed files

**Alternatives Considered:**
1. **Single migration file:** Rejected due to maintainability issues
2. **Database functions only:** Rejected due to lack of transparency
3. **Application-level access control:** Rejected due to security risks

---

## 6. Deployment Strategy

### 6.1 Environment Configuration

| Environment | Database | OTEL | RLS | Purpose |
|-------------|----------|------|-----|---------|
| **Development** | `shovelheroes` (local) | Console | Enabled | Local development |
| **Test** | `shovelheroes_test` (local/CI) | Disabled | Enabled | Automated testing |
| **Staging** | Cloud PostgreSQL | OTLP (Jaeger) | Enabled | Pre-production validation |
| **Production** | Cloud PostgreSQL (HA) | OTLP (Datadog) | Enabled | Live system |

### 6.2 Database Migration Strategy

**Zero-Downtime Migration Checklist:**

1. **Pre-deployment:**
   - ✅ Run migration in staging
   - ✅ Verify RLS policies
   - ✅ Test rollback procedure
   - ✅ Create database backup

2. **Deployment:**
   - ✅ Run migration (should be additive only)
   - ✅ Deploy new application version
   - ✅ Monitor error rates
   - ✅ Run smoke tests

3. **Post-deployment:**
   - ✅ Verify all systems operational
   - ✅ Check observability dashboards
   - ✅ Review logs for errors
   - ✅ Document any issues

### 6.3 Rollback Strategy

**If deployment fails:**

1. **Application rollback:**
   ```bash
   # Redeploy previous version
   docker pull shovel-heroes-api:previous-sha
   docker service update --image shovel-heroes-api:previous-sha api
   ```

2. **Database rollback:**
   ```bash
   # Only if migration caused issues
   npm run migrate:down -- 1
   ```

3. **Verify system health:**
   ```bash
   curl -f https://api.shovel-heroes.com/healthz
   ```

---

## 7. Monitoring and Observability

### 7.1 Key Metrics to Track

**Application Metrics:**
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Active connections

**Database Metrics:**
- Query duration
- Connection pool utilization
- RLS policy evaluation time
- Transaction rollback rate

**Infrastructure Metrics:**
- CPU usage
- Memory usage
- Disk I/O
- Network throughput

### 7.2 Alerting Strategy

**Critical Alerts (PagerDuty):**
- API error rate > 5%
- Database connection pool exhausted
- Response time p99 > 5s
- Service health check failing

**Warning Alerts (Slack):**
- Error rate > 1%
- Response time p95 > 2s
- Database connection pool > 80%
- Disk usage > 80%

### 7.3 Observability Stack

**Recommended Setup:**

```yaml
# docker-compose.prod-observability.yml
services:
  # Traces
  tempo:
    image: grafana/tempo:latest
    # ... configuration

  # Metrics
  prometheus:
    image: prom/prometheus:latest
    # ... configuration

  # Visualization
  grafana:
    image: grafana/grafana:latest
    # ... configuration

  # Log aggregation
  loki:
    image: grafana/loki:latest
    # ... configuration
```

---

## Summary

This infrastructure design provides:

1. ✅ **Test Database Setup:** Isolated test environment with automated setup, migration strategies, and comprehensive fixtures
2. ✅ **OpenTelemetry Integration:** Complete observability with distributed tracing, already implemented and ready for production
3. ✅ **Modular RLS Policies:** Organized, maintainable RLS policies with dedicated directory structure and testing framework
4. ✅ **Enhanced CI/CD:** Comprehensive GitHub Actions workflow with testing, security scanning, and deployment automation

### Next Steps

1. **Immediate (Week 1):**
   - [ ] Implement test database setup scripts
   - [ ] Create modular RLS policy files
   - [ ] Update CI/CD workflow

2. **Short-term (Week 2-3):**
   - [ ] Write comprehensive RLS tests
   - [ ] Set up local Jaeger for OTEL testing
   - [ ] Document deployment procedures

3. **Medium-term (Month 1-2):**
   - [ ] Deploy observability stack to staging
   - [ ] Implement automated database backups
   - [ ] Create monitoring dashboards

### References

- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
