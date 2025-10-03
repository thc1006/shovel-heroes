#!/usr/bin/env node
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes_test'
});

try {
  console.log('All tables:');
  const tables = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.table(tables.rows);

  console.log('\nvolunteer_registrations columns:');
  const columns = await pool.query(`
    SELECT column_name, data_type, udt_name, is_nullable, column_default
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
