import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/shovelheroes';
export const pool = new Pool({ connectionString });

export async function withConn<T>(fn: (client: any)=>Promise<T>, userId?: string) {
  const client = await pool.connect();
  try {
    if (userId) {
      await client.query("set local app.user_id = $1", [userId]);
    }
    return await fn(client);
  } finally {
    client.release();
  }
}
