import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createTestApp, closeTestApp, cleanDatabase, TestContext } from '../helpers.js';
import {
  withRLSContext,
  expectCanAccess,
  expectCannotAccess,
  createRLSTestUser,
  createRLSTestDisasterArea,
  createRLSTestGrid,
  verifyRLSEnabled,
  countPolicies,
  withoutRLSContext
} from './rls-test-framework.js';

describe('RLS Policies: grids table', () => {
  let context: TestContext;

  beforeAll(async () => {
    context = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(context);
  });

  beforeEach(async () => {
    await cleanDatabase(context.pool);
  });

  describe('RLS Configuration', () => {
    it('should have RLS enabled on grids table', async () => {
      const rlsEnabled = await verifyRLSEnabled(context.pool, 'grids');
      expect(rlsEnabled).toBe(true);
    });

    it('should have 4 policies on grids table', async () => {
      const policyCount = await countPolicies(context.pool, 'grids');
      expect(policyCount).toBe(4); // SELECT, INSERT, UPDATE, DELETE
    });
  });

  describe('SELECT policies', () => {
    it('should allow unauthenticated users to view grids', async () => {
      const { pool } = context;
      const disasterArea = await createRLSTestDisasterArea(pool);

      // Create a grid without RLS context (as superuser)
      await withoutRLSContext(pool, async (client) => {
        await client.query(
          `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3)`,
          [disasterArea.id, 'Test Grid', 'TG1']
        );
      });

      // Query without user context should work (public data)
      const { rows } = await pool.query('SELECT * FROM grids');
      expect(rows).toHaveLength(1);
    });

    it('should allow all authenticated users to view grids', async () => {
      const { pool } = context;
      const user = await createRLSTestUser(pool, 'volunteer');
      const disasterArea = await createRLSTestDisasterArea(pool);

      await withoutRLSContext(pool, async (client) => {
        await client.query(
          `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3)`,
          [disasterArea.id, 'Test Grid', 'TG1']
        );
      });

      await expectCanAccess(pool, user.id, 'SELECT * FROM grids');
    });
  });

  describe('INSERT policies', () => {
    it('should allow ngo_coordinator to insert grids', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');
      const disasterArea = await createRLSTestDisasterArea(pool);

      await withRLSContext(pool, coordinator.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
          [disasterArea.id, 'New Grid', 'NG1']
        );
        expect(rows).toHaveLength(1);
        expect(rows[0].name).toBe('New Grid');
      });
    });

    it('should allow regional_admin to insert grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'regional_admin');
      const disasterArea = await createRLSTestDisasterArea(pool);

      await withRLSContext(pool, admin.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
          [disasterArea.id, 'New Grid', 'NG1']
        );
        expect(rows).toHaveLength(1);
      });
    });

    it('should prevent volunteer from inserting grids', async () => {
      const { pool } = context;
      const volunteer = await createRLSTestUser(pool, 'volunteer');
      const disasterArea = await createRLSTestDisasterArea(pool);

      await expectCannotAccess(
        pool,
        volunteer.id,
        `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
        [disasterArea.id, 'New Grid', 'NG1']
      );
    });

    it('should prevent data_analyst from inserting grids', async () => {
      const { pool } = context;
      const analyst = await createRLSTestUser(pool, 'data_analyst');
      const disasterArea = await createRLSTestDisasterArea(pool);

      await expectCannotAccess(
        pool,
        analyst.id,
        `INSERT INTO grids (disaster_area_id, name, code) VALUES ($1, $2, $3) RETURNING *`,
        [disasterArea.id, 'New Grid', 'NG1']
      );
    });
  });

  describe('UPDATE policies', () => {
    it('should allow super_admin to update grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'super_admin');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await withRLSContext(pool, admin.id, async (client) => {
        const { rowCount } = await client.query(
          `UPDATE grids SET name = $1 WHERE id = $2`,
          ['Updated Grid', grid.id]
        );
        expect(rowCount).toBe(1);
      });
    });

    it('should allow ngo_coordinator to update grids', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await withRLSContext(pool, coordinator.id, async (client) => {
        const { rowCount } = await client.query(
          `UPDATE grids SET name = $1 WHERE id = $2`,
          ['Updated Grid', grid.id]
        );
        expect(rowCount).toBe(1);
      });
    });

    it('should prevent volunteer from updating grids', async () => {
      const { pool } = context;
      const volunteer = await createRLSTestUser(pool, 'volunteer');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await expectCannotAccess(
        pool,
        volunteer.id,
        `UPDATE grids SET name = $1 WHERE id = $2`,
        ['Updated Grid', grid.id]
      );
    });
  });

  describe('DELETE policies', () => {
    it('should allow only super_admin to delete grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'super_admin');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await withRLSContext(pool, admin.id, async (client) => {
        const { rowCount } = await client.query(
          `DELETE FROM grids WHERE id = $1`,
          [grid.id]
        );
        expect(rowCount).toBe(1);
      });
    });

    it('should prevent ngo_coordinator from deleting grids', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await expectCannotAccess(
        pool,
        coordinator.id,
        `DELETE FROM grids WHERE id = $1`,
        [grid.id]
      );
    });

    it('should prevent regional_admin from deleting grids', async () => {
      const { pool } = context;
      const admin = await createRLSTestUser(pool, 'regional_admin');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id);

      await expectCannotAccess(
        pool,
        admin.id,
        `DELETE FROM grids WHERE id = $1`,
        [grid.id]
      );
    });
  });

  describe('Grid Manager scenarios', () => {
    it('should allow grid manager to be assigned', async () => {
      const { pool } = context;
      const coordinator = await createRLSTestUser(pool, 'ngo_coordinator');
      const manager = await createRLSTestUser(pool, 'volunteer');
      const disasterArea = await createRLSTestDisasterArea(pool);

      // Coordinator assigns a grid manager
      await withRLSContext(pool, coordinator.id, async (client) => {
        const { rows } = await client.query(
          `INSERT INTO grids (disaster_area_id, name, code, grid_manager_id)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [disasterArea.id, 'Managed Grid', 'MG1', manager.id]
        );
        expect(rows[0].grid_manager_id).toBe(manager.id);
      });
    });

    it('should verify is_grid_manager helper function works', async () => {
      const { pool } = context;
      const manager = await createRLSTestUser(pool, 'volunteer');
      const nonManager = await createRLSTestUser(pool, 'volunteer');
      const disasterArea = await createRLSTestDisasterArea(pool);
      const grid = await createRLSTestGrid(pool, disasterArea.id, {
        grid_manager_id: manager.id
      });

      // Check manager
      await withRLSContext(pool, manager.id, async (client) => {
        const { rows } = await client.query(
          `SELECT is_grid_manager($1) as is_manager`,
          [grid.id]
        );
        expect(rows[0].is_manager).toBe(true);
      });

      // Check non-manager
      await withRLSContext(pool, nonManager.id, async (client) => {
        const { rows } = await client.query(
          `SELECT is_grid_manager($1) as is_manager`,
          [grid.id]
        );
        expect(rows[0].is_manager).toBe(false);
      });
    });
  });
});
