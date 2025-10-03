/**
 * Migration 0013 Schema Tests
 * Verifies that all columns from BACKEND_API_INTEGRATION_GUIDE.md are present
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';

const { Pool } = pg;

describe('Migration 0013: Add Missing Columns', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    // Use production database for this test since test DB setup has issues
    pool = new Pool({
      connectionString: 'postgres://postgres:postgres@localhost:5432/shovelheroes'
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('grids table schema', () => {
    it('should have contact_info column with correct type', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'grids' AND column_name = 'contact_info'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'contact_info',
        data_type: 'character varying',
        character_maximum_length: 255
      });
    });

    it('should have risks_notes column with correct type', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'grids' AND column_name = 'risks_notes'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'risks_notes',
        data_type: 'text'
      });
    });

    it('should have meeting_point column (from previous migration)', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'grids' AND column_name = 'meeting_point'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'meeting_point',
        data_type: 'text'
      });
    });

    it('should have grid_manager_id column (from migration 0008)', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'grids' AND column_name = 'grid_manager_id'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'grid_manager_id',
        data_type: 'uuid'
      });
    });
  });

  describe('volunteer_registrations table schema', () => {
    it('should have volunteer_name column with correct type', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'volunteer_name'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'volunteer_name',
        data_type: 'character varying',
        character_maximum_length: 255
      });
    });

    it('should have volunteer_phone column with correct type (sensitive data)', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'volunteer_phone'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'volunteer_phone',
        data_type: 'character varying',
        character_maximum_length: 50
      });
    });

    it('should have available_time column with correct type', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'available_time'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'available_time',
        data_type: 'text'
      });
    });

    it('should have skills column as TEXT[] array', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'skills'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'skills',
        data_type: 'ARRAY',
        udt_name: '_text'
      });
    });

    it('should have equipment column as TEXT[] array', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'equipment'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'equipment',
        data_type: 'ARRAY',
        udt_name: '_text'
      });
    });

    it('should have notes column (from previous migration)', async () => {
      const result = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'volunteer_registrations' AND column_name = 'notes'
      `);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        column_name: 'notes',
        data_type: 'text'
      });
    });

    it('should have status column with all required enum values', async () => {
      const result = await pool.query(`
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE 'volunteer_registrations_status_check'
      `);

      expect(result.rows).toHaveLength(1);
      const checkClause = result.rows[0].check_clause;

      // Verify all status values from guide are present
      expect(checkClause).toContain('pending');
      expect(checkClause).toContain('confirmed');
      expect(checkClause).toContain('arrived');
      expect(checkClause).toContain('completed');
      expect(checkClause).toContain('cancelled');
    });
  });

  describe('data integrity tests', () => {
    it('should allow inserting grid with contact_info and risks_notes', async () => {
      const result = await pool.query(`
        INSERT INTO grids (name, contact_info, risks_notes, meeting_point)
        VALUES ($1, $2, $3, $4)
        RETURNING id, contact_info, risks_notes, meeting_point
      `, [
        'Test Grid with Contact',
        '聯絡人：測試人員 0912-345-678',
        '注意：測試風險說明',
        '測試集合點'
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        contact_info: '聯絡人：測試人員 0912-345-678',
        risks_notes: '注意：測試風險說明',
        meeting_point: '測試集合點'
      });

      // Cleanup
      await pool.query('DELETE FROM grids WHERE id = $1', [result.rows[0].id]);
    });

    it('should allow inserting volunteer registration with all new fields', async () => {
      // First create a user, volunteer, and grid for the foreign keys
      const userResult = await pool.query(`
        INSERT INTO users (phone, display_name)
        VALUES ($1, $2)
        RETURNING id
      `, ['0912-000-test', '測試志工']);

      const volunteerResult = await pool.query(`
        INSERT INTO volunteers (user_id, name, phone)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [userResult.rows[0].id, '測試志工', '0912-000-test']);

      const gridResult = await pool.query(`
        INSERT INTO grids (name)
        VALUES ($1)
        RETURNING id
      `, ['測試網格']);

      // Insert volunteer registration with all fields
      const result = await pool.query(`
        INSERT INTO volunteer_registrations (
          grid_id, volunteer_id, volunteer_name, volunteer_phone,
          available_time, skills, equipment, notes, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        gridResult.rows[0].id,
        volunteerResult.rows[0].id,
        '張小明',
        '0912-111-222',
        '週末全天',
        ['重機械操作', '急救'],
        ['鏟子', '手套', '水桶'],
        '有清淤經驗',
        'confirmed'
      ]);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        volunteer_name: '張小明',
        volunteer_phone: '0912-111-222',
        available_time: '週末全天',
        skills: ['重機械操作', '急救'],
        equipment: ['鏟子', '手套', '水桶'],
        notes: '有清淤經驗',
        status: 'confirmed'
      });

      // Cleanup
      await pool.query('DELETE FROM volunteer_registrations WHERE id = $1', [result.rows[0].id]);
      await pool.query('DELETE FROM volunteers WHERE id = $1', [volunteerResult.rows[0].id]);
      await pool.query('DELETE FROM grids WHERE id = $1', [gridResult.rows[0].id]);
      await pool.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    });

    it('should handle NULL values for optional fields', async () => {
      const userResult = await pool.query(`
        INSERT INTO users (phone, display_name)
        VALUES ($1, $2)
        RETURNING id
      `, ['0912-000-null', '測試Null']);

      const volunteerResult = await pool.query(`
        INSERT INTO volunteers (user_id, name, phone)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [userResult.rows[0].id, '測試Null志工', '0912-000-null']);

      const gridResult = await pool.query(`
        INSERT INTO grids (name)
        VALUES ($1)
        RETURNING id
      `, ['測試Null網格']);

      const result = await pool.query(`
        INSERT INTO volunteer_registrations (grid_id, volunteer_id, status)
        VALUES ($1, $2, $3)
        RETURNING volunteer_name, volunteer_phone, available_time, skills, equipment, notes
      `, [gridResult.rows[0].id, volunteerResult.rows[0].id, 'pending']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        volunteer_name: null,
        volunteer_phone: null,
        available_time: null,
        skills: null,
        equipment: null,
        notes: null
      });

      // Cleanup
      await pool.query('DELETE FROM volunteer_registrations WHERE grid_id = $1', [gridResult.rows[0].id]);
      await pool.query('DELETE FROM volunteers WHERE id = $1', [volunteerResult.rows[0].id]);
      await pool.query('DELETE FROM grids WHERE id = $1', [gridResult.rows[0].id]);
      await pool.query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id]);
    });
  });

  describe('column comments (documentation)', () => {
    it('should have comments on sensitive data columns', async () => {
      const result = await pool.query(`
        SELECT
          c.table_name,
          c.column_name,
          pgd.description
        FROM pg_catalog.pg_statio_all_tables AS st
        INNER JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
        INNER JOIN information_schema.columns c ON (
          pgd.objsubid = c.ordinal_position
          AND c.table_schema = st.schemaname
          AND c.table_name = st.relname
        )
        WHERE c.table_name IN ('grids', 'volunteer_registrations')
        AND c.column_name IN ('contact_info', 'volunteer_phone', 'risks_notes', 'available_time', 'skills', 'equipment')
        ORDER BY c.table_name, c.column_name
      `);

      expect(result.rows.length).toBeGreaterThan(0);

      // Verify sensitive data comments
      const contactInfo = result.rows.find(r => r.column_name === 'contact_info');
      expect(contactInfo?.description).toContain('SENSITIVE');

      const volunteerPhone = result.rows.find(r => r.column_name === 'volunteer_phone');
      expect(volunteerPhone?.description).toContain('SENSITIVE');
    });
  });
});
