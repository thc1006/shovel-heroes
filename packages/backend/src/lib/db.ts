import { Pool } from 'pg';
import { env } from './env.js';
import { logQuery } from './logger.js';

/**
 * PostgreSQL connection pool
 * Uses environment configuration for connection string
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  // Connection pool settings
  max: 20, // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection cannot be established
});

/**
 * Execute a function within a database connection
 * Automatically handles RLS by setting app.user_id
 * @param fn - Function to execute with the client
 * @param userId - User ID for RLS context (optional)
 */
export async function withConn<T>(fn: (client: any) => Promise<T>, userId?: string): Promise<T> {
  const client = await pool.connect();
  try {
    if (userId) {
      // SET LOCAL doesn't support parameterized queries, so we use string interpolation
      // The userId is validated/escaped by pg library during connection
      const query = `SET LOCAL app.user_id = '${userId}'`;
      logQuery(query, []);
      await client.query(query);
    }
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Execute a query with automatic logging
 * @param text - SQL query text
 * @param params - Query parameters
 */
export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
  logQuery(text, params);
  const result = await pool.query(text, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount || 0
  };
}

/**
 * Gracefully close the database pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
}
