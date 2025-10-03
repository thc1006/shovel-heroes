#!/usr/bin/env node
/**
 * Test Database Setup Script
 *
 * This script creates and initializes the test database for the Shovel Heroes backend.
 * It is idempotent and can be run multiple times safely.
 *
 * Usage:
 *   node scripts/setup-test-db.js
 *   npm run test:db:setup
 *
 * Environment Variables:
 *   TEST_DB_NAME - Name of test database (default: shovelheroes_test)
 *   POSTGRES_USER - PostgreSQL user (default: postgres)
 *   POSTGRES_PASSWORD - PostgreSQL password (default: postgres)
 *   POSTGRES_HOST - PostgreSQL host (default: localhost)
 *   POSTGRES_PORT - PostgreSQL port (default: 5432)
 */

import { Client } from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const execAsync = promisify(exec);

// Configuration
const TEST_DB_NAME = process.env.TEST_DB_NAME || 'shovelheroes_test';
const DB_USER = process.env.POSTGRES_USER || 'postgres';
const DB_PASSWORD = process.env.POSTGRES_PASSWORD || 'postgres';
const DB_HOST = process.env.POSTGRES_HOST || 'localhost';
const DB_PORT = process.env.POSTGRES_PORT || '5432';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`[${step}] ${message}`, colors.blue);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

/**
 * Check if PostgreSQL is accessible
 */
async function checkPostgresConnection() {
  logStep('1/5', 'Checking PostgreSQL connection...');

  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    logSuccess(`Connected to PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
    await client.end();
    return true;
  } catch (error) {
    logError(`Failed to connect to PostgreSQL: ${error.message}`);
    logWarning(`Make sure PostgreSQL is running on ${DB_HOST}:${DB_PORT}`);
    logWarning(`You can start it with: docker start shovelheroes-postgres`);
    return false;
  }
}

/**
 * Check if test database exists
 */
async function checkDatabaseExists() {
  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    const result = await client.query(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1)`,
      [TEST_DB_NAME]
    );
    await client.end();
    return result.rows[0].exists;
  } catch (error) {
    logError(`Failed to check database existence: ${error.message}`);
    return false;
  }
}

/**
 * Drop existing test database if it exists
 */
async function dropTestDatabase() {
  logStep('2/5', `Checking if ${TEST_DB_NAME} database exists...`);

  const exists = await checkDatabaseExists();

  if (!exists) {
    log(`Database ${TEST_DB_NAME} does not exist, skipping drop`);
    return true;
  }

  log(`Database ${TEST_DB_NAME} exists, dropping it...`);

  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();

    // Terminate existing connections
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid()
    `, [TEST_DB_NAME]);

    // Drop database
    await client.query(`DROP DATABASE IF EXISTS ${TEST_DB_NAME}`);
    logSuccess(`Dropped existing database: ${TEST_DB_NAME}`);

    await client.end();
    return true;
  } catch (error) {
    logError(`Failed to drop database: ${error.message}`);
    await client.end();
    return false;
  }
}

/**
 * Create fresh test database
 */
async function createTestDatabase() {
  logStep('3/5', `Creating test database: ${TEST_DB_NAME}...`);

  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres'
  });

  try {
    await client.connect();
    await client.query(`CREATE DATABASE ${TEST_DB_NAME}`);
    logSuccess(`Test database ${TEST_DB_NAME} created successfully`);
    await client.end();
    return true;
  } catch (error) {
    logError(`Failed to create database: ${error.message}`);
    await client.end();
    return false;
  }
}

/**
 * Run migrations on test database
 */
async function runMigrations() {
  logStep('4/5', 'Running migrations...');

  const dbUrl = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}`;

  try {
    const { stdout, stderr } = await execAsync('npm run migrate:up', {
      env: {
        ...process.env,
        DATABASE_URL: dbUrl,
        NODE_ENV: 'test'
      },
      cwd: process.cwd()
    });

    if (stdout) {
      log(stdout.trim());
    }

    if (stderr && !stderr.includes('up to date')) {
      logWarning(stderr.trim());
    }

    logSuccess('Migrations applied successfully');
    return true;
  } catch (error) {
    logError(`Failed to run migrations: ${error.message}`);
    if (error.stdout) log(error.stdout);
    if (error.stderr) logWarning(error.stderr);
    return false;
  }
}

/**
 * Verify database setup
 */
async function verifyDatabaseSetup() {
  logStep('5/5', 'Verifying database setup...');

  const client = new Client({
    host: DB_HOST,
    port: parseInt(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: TEST_DB_NAME
  });

  try {
    await client.connect();

    // Check for required tables
    const requiredTables = [
      'users',
      'disaster_areas',
      'grids',
      'volunteers',
      'volunteer_registrations',
      'announcements',
      'supply_donations',
      'grid_discussions',
      'pgmigrations'
    ];

    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    const existingTables = result.rows.map(row => row.table_name);

    let allTablesExist = true;
    for (const table of requiredTables) {
      if (existingTables.includes(table)) {
        logSuccess(`Table exists: ${table}`);
      } else {
        logError(`Missing table: ${table}`);
        allTablesExist = false;
      }
    }

    // Check for RLS helper functions
    const functionResult = await client.query(`
      SELECT proname
      FROM pg_proc
      WHERE proname IN ('user_has_role', 'get_current_user_id', 'is_admin')
    `);

    const existingFunctions = functionResult.rows.map(row => row.proname);
    const requiredFunctions = ['user_has_role', 'get_current_user_id', 'is_admin'];

    for (const func of requiredFunctions) {
      if (existingFunctions.includes(func)) {
        logSuccess(`Function exists: ${func}()`);
      } else {
        logWarning(`Missing function: ${func}() (may not be critical)`);
      }
    }

    // Check migration count
    const migrationResult = await client.query('SELECT COUNT(*) as count FROM pgmigrations');
    const migrationCount = migrationResult.rows[0].count;
    logSuccess(`Applied ${migrationCount} migrations`);

    await client.end();

    if (allTablesExist) {
      logSuccess('Database verification completed successfully');
      return true;
    } else {
      logError('Database verification failed: missing required tables');
      return false;
    }
  } catch (error) {
    logError(`Verification failed: ${error.message}`);
    await client.end();
    return false;
  }
}

/**
 * Main setup function
 */
async function setupTestDatabase() {
  log('\n' + '='.repeat(60), colors.bright);
  log('  Shovel Heroes - Test Database Setup', colors.bright);
  log('='.repeat(60) + '\n', colors.bright);

  log('Configuration:');
  log(`  Host:     ${DB_HOST}:${DB_PORT}`);
  log(`  User:     ${DB_USER}`);
  log(`  Database: ${TEST_DB_NAME}\n`);

  try {
    // Step 1: Check PostgreSQL connection
    const connected = await checkPostgresConnection();
    if (!connected) {
      process.exit(1);
    }

    // Step 2: Drop existing database
    const dropped = await dropTestDatabase();
    if (!dropped) {
      process.exit(1);
    }

    // Step 3: Create new database
    const created = await createTestDatabase();
    if (!created) {
      process.exit(1);
    }

    // Step 4: Run migrations
    const migrated = await runMigrations();
    if (!migrated) {
      process.exit(1);
    }

    // Step 5: Verify setup
    const verified = await verifyDatabaseSetup();
    if (!verified) {
      process.exit(1);
    }

    // Success!
    log('\n' + '='.repeat(60), colors.bright);
    log('  ✓ Test Database Setup Complete!', colors.green + colors.bright);
    log('='.repeat(60) + '\n', colors.bright);

    log('You can now run tests with:', colors.blue);
    log('  npm test\n');

    log('Connection string:', colors.blue);
    log(`  postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${TEST_DB_NAME}\n`);

  } catch (error) {
    logError(`Setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
setupTestDatabase().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
