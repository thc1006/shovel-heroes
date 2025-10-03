#!/usr/bin/env node
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

try {
  console.log('volunteer_registrations columns in PRODUCTION DB:');
  const columns = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'volunteer_registrations'
    ORDER BY ordinal_position
  `);
  console.log('Row count:', columns.rows.length);
  console.table(columns.rows);

} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
