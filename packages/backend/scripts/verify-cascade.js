#!/usr/bin/env node
/**
 * Verify CASCADE constraints are properly configured
 * Tests that deleting a grid auto-deletes related records
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shovelheroes_test'
});

async function verifyCascade() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 Verifying CASCADE constraints...\n');

    // 1. Check constraints in schema
    console.log('1️⃣ Checking foreign key constraints...');
    const { rows: constraints } = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'grid_id'
        AND kcu.table_name IN ('volunteer_registrations', 'supply_donations', 'grid_discussions')
      ORDER BY tc.table_name
    `);

    console.table(constraints);

    const cascadeCount = constraints.filter(c => c.delete_rule === 'CASCADE').length;
    if (cascadeCount !== 3) {
      throw new Error(`Expected 3 CASCADE rules, found ${cascadeCount}`);
    }
    console.log('✅ All 3 foreign keys have CASCADE delete rules\n');

    // 2. Test actual cascade behavior
    console.log('2️⃣ Testing CASCADE behavior with sample data...');

    await client.query('BEGIN');

    // Create test grid
    const { rows: [grid] } = await client.query(`
      INSERT INTO grids (name, area_id)
      VALUES ('Test Grid', 'TEST001')
      RETURNING id
    `);
    console.log(`   Created test grid: ${grid.id}`);

    // Create test volunteer
    const { rows: [volunteer] } = await client.query(`
      INSERT INTO volunteers (name, email, status)
      VALUES ('Test Volunteer', 'test@example.com', 'available')
      RETURNING id
    `);
    console.log(`   Created test volunteer: ${volunteer.id}`);

    // Create related records
    await client.query(`
      INSERT INTO volunteer_registrations (volunteer_id, grid_id, status)
      VALUES ($1, $2, 'confirmed')
    `, [volunteer.id, grid.id]);
    console.log(`   Created volunteer registration`);

    await client.query(`
      INSERT INTO supply_donations (donor_name, item_type, grid_id, status)
      VALUES ('Test Donor', 'Water', $1, 'received')
    `, [grid.id]);
    console.log(`   Created supply donation`);

    await client.query(`
      INSERT INTO grid_discussions (grid_id, message)
      VALUES ($1, 'Test discussion')
    `, [grid.id]);
    console.log(`   Created grid discussion`);

    // Count related records BEFORE delete
    const { rows: [before] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM volunteer_registrations WHERE grid_id = $1) as registrations,
        (SELECT COUNT(*) FROM supply_donations WHERE grid_id = $1) as donations,
        (SELECT COUNT(*) FROM grid_discussions WHERE grid_id = $1) as discussions
    `, [grid.id]);
    console.log(`\n   📊 Before delete:`, before);

    // DELETE the grid
    await client.query(`DELETE FROM grids WHERE id = $1`, [grid.id]);
    console.log(`   🗑️  Deleted grid: ${grid.id}`);

    // Count related records AFTER delete
    const { rows: [after] } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM volunteer_registrations WHERE grid_id = $1) as registrations,
        (SELECT COUNT(*) FROM supply_donations WHERE grid_id = $1) as donations,
        (SELECT COUNT(*) FROM grid_discussions WHERE grid_id = $1) as discussions
    `, [grid.id]);
    console.log(`   📊 After delete:`, after);

    await client.query('ROLLBACK');

    // Verify all counts are 0 after cascade delete
    if (after.registrations !== '0' || after.donations !== '0' || after.discussions !== '0') {
      throw new Error(`CASCADE delete failed! Expected all counts to be 0, got: ${JSON.stringify(after)}`);
    }

    console.log('\n✅ CASCADE behavior verified successfully!');
    console.log('   All related records were automatically deleted when grid was deleted.\n');

    return true;

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyCascade()
  .then(() => {
    console.log('✅ All CASCADE constraint checks passed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ CASCADE constraint verification failed');
    console.error('Error:', error);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  });
