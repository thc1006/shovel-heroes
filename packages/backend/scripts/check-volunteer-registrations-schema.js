#!/usr/bin/env node
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes_test'
});

try {
  const result = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'volunteer_registrations'
    ORDER BY ordinal_position
  `);
  console.table(result.rows);
} catch (err) {
  console.error(err);
} finally {
  await pool.end();
}
