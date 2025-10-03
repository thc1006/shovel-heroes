#!/usr/bin/env node
/**
 * Manual migration script to apply 0013_add_missing_columns.sql
 * This bypasses node-pg-migrate ordering issues
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

async function applyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Read migration file
    const migrationPath = join(__dirname, '../migrations/0013_add_missing_columns.sql');
    const migrationSQL = await readFile(migrationPath, 'utf8');

    console.log('Applying migration 0013_add_missing_columns.sql...');

    // Execute migration
    await pool.query(migrationSQL);

    console.log('✓ Migration applied successfully');

    // Verify columns were added
    console.log('\nVerifying grids table columns:');
    const gridsResult = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'grids'
      AND column_name IN ('contact_info', 'risks_notes', 'meeting_point')
      ORDER BY column_name;
    `);
    console.table(gridsResult.rows);

    console.log('\nVerifying volunteer_registrations table columns:');
    const vrResult = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'volunteer_registrations'
      AND column_name IN ('volunteer_name', 'volunteer_phone', 'available_time', 'skills', 'equipment', 'notes')
      ORDER BY column_name;
    `);
    console.table(vrResult.rows);

    console.log('\n✓ All columns verified successfully');

  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applyMigration();
