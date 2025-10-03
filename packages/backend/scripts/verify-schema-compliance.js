#!/usr/bin/env node
/**
 * Schema Compliance Verification Script
 * Verifies that database schema matches BACKEND_API_INTEGRATION_GUIDE.md
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const { Pool } = pg;

const REQUIRED_COLUMNS = {
  grids: [
    { name: 'contact_info', type: 'character varying', max_length: 255 },
    { name: 'risks_notes', type: 'text', max_length: null },
    { name: 'meeting_point', type: 'text', max_length: null },
    { name: 'grid_manager_id', type: 'uuid', max_length: null }
  ],
  volunteer_registrations: [
    { name: 'volunteer_name', type: 'character varying', max_length: 255 },
    { name: 'volunteer_phone', type: 'character varying', max_length: 50 },
    { name: 'available_time', type: 'text', max_length: null },
    { name: 'skills', type: 'ARRAY', udt_name: '_text' },
    { name: 'equipment', type: 'ARRAY', udt_name: '_text' },
    { name: 'notes', type: 'text', max_length: null }
  ]
};

const REQUIRED_STATUS_VALUES = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];

async function verifySchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  let allPassed = true;
  const results = {
    grids: { passed: 0, failed: 0, missing: [] },
    volunteer_registrations: { passed: 0, failed: 0, missing: [] },
    status_constraint: { passed: false, missing: [] }
  };

  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  Schema Compliance Verification                            ║');
    console.log('║  Reference: BACKEND_API_INTEGRATION_GUIDE.md (lines 850-878)');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Verify grids table
    console.log('📋 Checking grids table...');
    for (const col of REQUIRED_COLUMNS.grids) {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, udt_name
        FROM information_schema.columns
        WHERE table_name = 'grids' AND column_name = $1
      `, [col.name]);

      if (result.rows.length === 0) {
        console.log(`  ❌ MISSING: ${col.name}`);
        results.grids.failed++;
        results.grids.missing.push(col.name);
        allPassed = false;
      } else {
        const actual = result.rows[0];
        const typeMatch = actual.data_type === col.type;
        const lengthMatch = col.max_length ? actual.character_maximum_length === col.max_length : true;

        if (typeMatch && lengthMatch) {
          console.log(`  ✓ ${col.name} (${actual.data_type}${col.max_length ? `(${col.max_length})` : ''})`);
          results.grids.passed++;
        } else {
          console.log(`  ❌ MISMATCH: ${col.name} - expected ${col.type}${col.max_length ? `(${col.max_length})` : ''}, got ${actual.data_type}${actual.character_maximum_length ? `(${actual.character_maximum_length})` : ''}`);
          results.grids.failed++;
          allPassed = false;
        }
      }
    }

    // Verify volunteer_registrations table
    console.log('\n📋 Checking volunteer_registrations table...');
    for (const col of REQUIRED_COLUMNS.volunteer_registrations) {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length, udt_name
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = $1
      `, [col.name]);

      if (result.rows.length === 0) {
        console.log(`  ❌ MISSING: ${col.name}`);
        results.volunteer_registrations.failed++;
        results.volunteer_registrations.missing.push(col.name);
        allPassed = false;
      } else {
        const actual = result.rows[0];
        const typeMatch = actual.data_type === col.type;
        const lengthMatch = col.max_length ? actual.character_maximum_length === col.max_length : true;
        const udtMatch = col.udt_name ? actual.udt_name === col.udt_name : true;

        if (typeMatch && lengthMatch && udtMatch) {
          const typeDesc = col.type === 'ARRAY' ? `${col.type} (${col.udt_name})` : col.type;
          console.log(`  ✓ ${col.name} (${typeDesc}${col.max_length ? `(${col.max_length})` : ''})`);
          results.volunteer_registrations.passed++;
        } else {
          console.log(`  ❌ MISMATCH: ${col.name}`);
          results.volunteer_registrations.failed++;
          allPassed = false;
        }
      }
    }

    // Verify status constraint
    console.log('\n📋 Checking volunteer_registrations status constraint...');
    const statusResult = await pool.query(`
      SELECT constraint_name, check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name LIKE 'volunteer_registrations_status_check'
    `);

    if (statusResult.rows.length === 0) {
      console.log('  ❌ Status constraint not found');
      allPassed = false;
    } else {
      const checkClause = statusResult.rows[0].check_clause;
      const missingValues = REQUIRED_STATUS_VALUES.filter(v => !checkClause.includes(v));

      if (missingValues.length === 0) {
        console.log('  ✓ All required status values present:');
        REQUIRED_STATUS_VALUES.forEach(v => console.log(`    - ${v}`));
        results.status_constraint.passed = true;
      } else {
        console.log('  ❌ Missing status values:', missingValues.join(', '));
        results.status_constraint.missing = missingValues;
        allPassed = false;
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  VERIFICATION SUMMARY                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Grids Table:                  ${results.grids.passed}/${REQUIRED_COLUMNS.grids.length} passed`);
    console.log(`Volunteer Registrations:      ${results.volunteer_registrations.passed}/${REQUIRED_COLUMNS.volunteer_registrations.length} passed`);
    console.log(`Status Constraint:            ${results.status_constraint.passed ? 'PASS' : 'FAIL'}`);

    console.log('\n' + '─'.repeat(60));

    if (allPassed) {
      console.log('✅ SCHEMA COMPLIANCE: PASSED');
      console.log('   All columns from BACKEND_API_INTEGRATION_GUIDE.md are present');
      console.log('   and correctly typed.\n');
      process.exit(0);
    } else {
      console.log('❌ SCHEMA COMPLIANCE: FAILED');
      console.log('   Some columns are missing or incorrectly typed.');
      console.log('   Run migration 0013 to fix: npm run migrate:up\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('Error verifying schema:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifySchema();
