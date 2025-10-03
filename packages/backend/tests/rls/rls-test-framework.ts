/**
 * RLS Testing Framework
 * Provides utilities for testing Row-Level Security policies
 */
import { Pool, PoolClient } from 'pg';

export interface RLSTestContext {
  pool: Pool;
  userId: string;
  userRole: string;
}

/**
 * Execute a query within an RLS context
 * This sets app.user_id and runs the query in a transaction
 * Note: PostgreSQL SET commands don't support parameters, so we use string formatting
 */
export async function withRLSContext<T>(
  pool: Pool,
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // PostgreSQL SET LOCAL doesn't support parameters, use literal
    await client.query(`SET LOCAL app.user_id = '${userId}'`);

    const result = await fn(client);

    await client.query('ROLLBACK');
    return result;
  } finally {
    client.release();
  }
}

/**
 * Test that a user can perform an operation
 * Throws if the operation fails
 */
export async function expectCanAccess(
  pool: Pool,
  userId: string,
  query: string,
  params?: any[]
): Promise<void> {
  await withRLSContext(pool, userId, async (client) => {
    const result = await client.query(query, params);
    // Should not throw - operation is allowed
  });
}

/**
 * Test that a user cannot perform an operation
 * Verifies that RLS blocks the operation (returns no rows or 0 affected)
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
 * Test that an operation throws an error
 * Used for operations that should be completely blocked (not just return no rows)
 */
export async function expectAccessDenied(
  pool: Pool,
  userId: string,
  query: string,
  params?: any[]
): Promise<void> {
  await withRLSContext(pool, userId, async (client) => {
    try {
      await client.query(query, params);
      throw new Error('Expected operation to be denied, but it succeeded');
    } catch (error: any) {
      // Expected - operation was denied
      if (error.message.includes('Expected operation to be denied')) {
        throw error;
      }
      // Good - some other error means it was blocked
    }
  });
}

/**
 * Execute a query without RLS context (as superuser)
 * Useful for setup and teardown
 */
export async function withoutRLSContext<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a test user with specific role
 */
export async function createRLSTestUser(
  pool: Pool,
  role: string,
  email?: string
): Promise<{ id: string; role: string; email: string; name: string }> {
  const testEmail = email || `${role}-${Date.now()}@test.com`;
  const testName = `${role} Test User`;

  const { rows } = await pool.query(
    `INSERT INTO users (display_name, email, role, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING id, role, email, display_name, display_name as name`,
    [testName, testEmail, role]
  );

  return rows[0];
}

/**
 * Create a test disaster area
 * Note: disaster_areas table uses 'location' text field, not center_lat/lng
 */
export async function createRLSTestDisasterArea(
  pool: Pool,
  data?: Partial<{
    name: string;
    description: string;
    location: string;
    severity: string;
  }>
): Promise<any> {
  const { rows } = await pool.query(
    `INSERT INTO disaster_areas (name, description, location, severity, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data?.name || 'Test Disaster Area',
      data?.description || 'RLS test disaster area',
      data?.location || 'Test Location (25.0330, 121.5654)',
      data?.severity || 'medium',
      'active'
    ]
  );

  return rows[0];
}

/**
 * Create a test grid
 * Note: grids table uses 'area_id' (text), not 'disaster_area_id' (UUID)
 */
export async function createRLSTestGrid(
  pool: Pool,
  disasterAreaId: string,
  data?: Partial<{
    name: string;
    code: string;
    grid_manager_id: string;
  }>
): Promise<any> {
  const { rows } = await pool.query(
    `INSERT INTO grids (area_id, name, code, grid_manager_id, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      disasterAreaId, // area_id is text, so we can pass the disaster_area_id as text
      data?.name || 'Test Grid',
      data?.code || 'TG1',
      data?.grid_manager_id || null,
      'open'
    ]
  );

  return rows[0];
}

/**
 * Verify RLS is enabled on a table
 */
export async function verifyRLSEnabled(
  pool: Pool,
  tableName: string
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT relrowsecurity
     FROM pg_class
     WHERE relname = $1`,
    [tableName]
  );

  return rows[0]?.relrowsecurity || false;
}

/**
 * Count active policies on a table
 */
export async function countPolicies(
  pool: Pool,
  tableName: string
): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) as count
     FROM pg_policies
     WHERE tablename = $1`,
    [tableName]
  );

  return parseInt(rows[0]?.count || '0');
}

/**
 * List all policies on a table
 */
export async function listPolicies(
  pool: Pool,
  tableName: string
): Promise<Array<{ policyname: string; cmd: string; qual: string }>> {
  const { rows } = await pool.query(
    `SELECT policyname, cmd, qual
     FROM pg_policies
     WHERE tablename = $1
     ORDER BY policyname`,
    [tableName]
  );

  return rows;
}
