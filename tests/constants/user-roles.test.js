/**
 * User Roles & Permissions Constants Tests
 * 使用者角色與權限常量測試
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_ROLE_PRIORITIES,
  isValidUserRole,
  getUserRoleLabel,
  getUserRolePriority,
  hasHigherRole,
  isAdmin,
  isGridManager,
  canViewPhone,
  canViewEmail,
  canEditGrid,
  canDeleteGrid,
  canManageVolunteers,
  canManageSupplies,
  canViewAuditLogs,
  canExportData,
  getUserPermissions
} from '../../src/constants/user-roles.js';

describe('User Roles & Permissions Constants', () => {
  let adminUser, gridManagerUser, regularUser, grid;

  beforeEach(() => {
    adminUser = { id: '1', role: USER_ROLES.ADMIN };
    gridManagerUser = { id: '2', role: USER_ROLES.GRID_MANAGER };
    regularUser = { id: '3', role: USER_ROLES.USER };
    grid = { id: '100', grid_manager_id: '2' };
  });

  describe('USER_ROLES', () => {
    it('should have all required user roles', () => {
      expect(USER_ROLES).toHaveProperty('ADMIN');
      expect(USER_ROLES).toHaveProperty('GRID_MANAGER');
      expect(USER_ROLES).toHaveProperty('USER');
    });

    it('should have correct values', () => {
      expect(USER_ROLES.ADMIN).toBe('admin');
      expect(USER_ROLES.GRID_MANAGER).toBe('grid_manager');
      expect(USER_ROLES.USER).toBe('user');
    });
  });

  describe('USER_ROLE_LABELS', () => {
    it('should have labels for all user roles', () => {
      Object.values(USER_ROLES).forEach(role => {
        expect(USER_ROLE_LABELS).toHaveProperty(role);
        expect(typeof USER_ROLE_LABELS[role]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(USER_ROLE_LABELS[USER_ROLES.ADMIN]).toBe('管理員');
      expect(USER_ROLE_LABELS[USER_ROLES.GRID_MANAGER]).toBe('網格管理員');
      expect(USER_ROLE_LABELS[USER_ROLES.USER]).toBe('一般使用者');
    });
  });

  describe('USER_ROLE_PRIORITIES', () => {
    it('should have priorities for all user roles', () => {
      Object.values(USER_ROLES).forEach(role => {
        expect(USER_ROLE_PRIORITIES).toHaveProperty(role);
        expect(typeof USER_ROLE_PRIORITIES[role]).toBe('number');
      });
    });

    it('should have correct priority order', () => {
      expect(USER_ROLE_PRIORITIES[USER_ROLES.ADMIN]).toBeGreaterThan(
        USER_ROLE_PRIORITIES[USER_ROLES.GRID_MANAGER]
      );
      expect(USER_ROLE_PRIORITIES[USER_ROLES.GRID_MANAGER]).toBeGreaterThan(
        USER_ROLE_PRIORITIES[USER_ROLES.USER]
      );
    });
  });

  describe('Basic Functions', () => {
    it('isValidUserRole should work correctly', () => {
      Object.values(USER_ROLES).forEach(role => {
        expect(isValidUserRole(role)).toBe(true);
      });
      expect(isValidUserRole('invalid')).toBe(false);
      expect(isValidUserRole(null)).toBe(false);
    });

    it('getUserRoleLabel should return correct labels', () => {
      expect(getUserRoleLabel(USER_ROLES.ADMIN)).toBe('管理員');
      expect(getUserRoleLabel('invalid')).toBe('未知角色');
    });

    it('getUserRolePriority should return correct priorities', () => {
      expect(getUserRolePriority(USER_ROLES.ADMIN)).toBe(100);
      expect(getUserRolePriority(USER_ROLES.GRID_MANAGER)).toBe(50);
      expect(getUserRolePriority(USER_ROLES.USER)).toBe(10);
      expect(getUserRolePriority('invalid')).toBe(0);
    });

    it('hasHigherRole should compare roles correctly', () => {
      expect(hasHigherRole(USER_ROLES.ADMIN, USER_ROLES.GRID_MANAGER)).toBe(true);
      expect(hasHigherRole(USER_ROLES.ADMIN, USER_ROLES.USER)).toBe(true);
      expect(hasHigherRole(USER_ROLES.GRID_MANAGER, USER_ROLES.USER)).toBe(true);
      expect(hasHigherRole(USER_ROLES.USER, USER_ROLES.ADMIN)).toBe(false);
    });
  });

  describe('Role Check Functions', () => {
    it('isAdmin should identify admin users', () => {
      expect(isAdmin(adminUser)).toBe(true);
      expect(isAdmin(gridManagerUser)).toBe(false);
      expect(isAdmin(regularUser)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });

    it('isGridManager should identify grid managers', () => {
      expect(isGridManager(gridManagerUser)).toBe(true);
      expect(isGridManager(gridManagerUser, grid)).toBe(true);
      expect(isGridManager(adminUser)).toBe(false);
      expect(isGridManager(regularUser)).toBe(false);
    });

    it('isGridManager should check grid ownership when grid provided', () => {
      const otherGridManager = { id: '999', role: USER_ROLES.GRID_MANAGER };
      expect(isGridManager(gridManagerUser, grid)).toBe(true);
      expect(isGridManager(otherGridManager, grid)).toBe(false);
    });
  });

  describe('Permission Check Functions', () => {
    describe('canViewPhone', () => {
      it('should allow admin to view phone', () => {
        expect(canViewPhone(adminUser, grid)).toBe(true);
      });

      it('should allow grid manager to view phone for their grid', () => {
        expect(canViewPhone(gridManagerUser, grid)).toBe(true);
      });

      it('should not allow grid manager to view phone for other grids', () => {
        const otherGridManager = { id: '999', role: USER_ROLES.GRID_MANAGER };
        expect(canViewPhone(otherGridManager, grid)).toBe(false);
      });

      it('should not allow regular user to view phone', () => {
        expect(canViewPhone(regularUser, grid)).toBe(false);
      });

      it('should return false for null user or grid', () => {
        expect(canViewPhone(null, grid)).toBe(false);
        expect(canViewPhone(regularUser, null)).toBe(false);
      });
    });

    describe('canViewEmail', () => {
      it('should have same permissions as canViewPhone', () => {
        expect(canViewEmail(adminUser, grid)).toBe(canViewPhone(adminUser, grid));
        expect(canViewEmail(gridManagerUser, grid)).toBe(canViewPhone(gridManagerUser, grid));
        expect(canViewEmail(regularUser, grid)).toBe(canViewPhone(regularUser, grid));
      });
    });

    describe('canEditGrid', () => {
      it('should allow admin to edit any grid', () => {
        expect(canEditGrid(adminUser, grid)).toBe(true);
      });

      it('should allow grid manager to edit their grid', () => {
        expect(canEditGrid(gridManagerUser, grid)).toBe(true);
      });

      it('should not allow grid manager to edit other grids', () => {
        const otherGridManager = { id: '999', role: USER_ROLES.GRID_MANAGER };
        expect(canEditGrid(otherGridManager, grid)).toBe(false);
      });

      it('should not allow regular user to edit grid', () => {
        expect(canEditGrid(regularUser, grid)).toBe(false);
      });

      it('should return false for null user or grid', () => {
        expect(canEditGrid(null, grid)).toBe(false);
        expect(canEditGrid(adminUser, null)).toBe(false);
      });
    });

    describe('canDeleteGrid', () => {
      it('should only allow admin to delete grids', () => {
        expect(canDeleteGrid(adminUser, grid)).toBe(true);
        expect(canDeleteGrid(gridManagerUser, grid)).toBe(false);
        expect(canDeleteGrid(regularUser, grid)).toBe(false);
      });

      it('should return false for null user or grid', () => {
        expect(canDeleteGrid(null, grid)).toBe(false);
        expect(canDeleteGrid(adminUser, null)).toBe(false);
      });
    });

    describe('canManageVolunteers', () => {
      it('should have same permissions as canEditGrid', () => {
        expect(canManageVolunteers(adminUser, grid)).toBe(canEditGrid(adminUser, grid));
        expect(canManageVolunteers(gridManagerUser, grid)).toBe(canEditGrid(gridManagerUser, grid));
        expect(canManageVolunteers(regularUser, grid)).toBe(canEditGrid(regularUser, grid));
      });
    });

    describe('canManageSupplies', () => {
      it('should have same permissions as canEditGrid', () => {
        expect(canManageSupplies(adminUser, grid)).toBe(canEditGrid(adminUser, grid));
        expect(canManageSupplies(gridManagerUser, grid)).toBe(canEditGrid(gridManagerUser, grid));
        expect(canManageSupplies(regularUser, grid)).toBe(canEditGrid(regularUser, grid));
      });
    });

    describe('canViewAuditLogs', () => {
      it('should only allow admin to view audit logs', () => {
        expect(canViewAuditLogs(adminUser)).toBe(true);
        expect(canViewAuditLogs(gridManagerUser)).toBe(false);
        expect(canViewAuditLogs(regularUser)).toBe(false);
        expect(canViewAuditLogs(null)).toBe(false);
      });
    });

    describe('canExportData', () => {
      it('should allow admin and grid manager to export data', () => {
        expect(canExportData(adminUser)).toBe(true);
        expect(canExportData(gridManagerUser)).toBe(true);
      });

      it('should not allow regular user to export data', () => {
        expect(canExportData(regularUser)).toBe(false);
        expect(canExportData(null)).toBe(false);
      });
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for admin', () => {
      const permissions = getUserPermissions(adminUser, grid);
      expect(permissions.isAdmin).toBe(true);
      expect(permissions.canViewPhone).toBe(true);
      expect(permissions.canEditGrid).toBe(true);
      expect(permissions.canDeleteGrid).toBe(true);
      expect(permissions.canViewAuditLogs).toBe(true);
      expect(permissions.canExportData).toBe(true);
    });

    it('should return correct permissions for grid manager', () => {
      const permissions = getUserPermissions(gridManagerUser, grid);
      expect(permissions.isAdmin).toBe(false);
      expect(permissions.isGridManager).toBe(true);
      expect(permissions.canViewPhone).toBe(true);
      expect(permissions.canEditGrid).toBe(true);
      expect(permissions.canDeleteGrid).toBe(false);
      expect(permissions.canViewAuditLogs).toBe(false);
      expect(permissions.canExportData).toBe(true);
    });

    it('should return correct permissions for regular user', () => {
      const permissions = getUserPermissions(regularUser, grid);
      expect(permissions.isAdmin).toBe(false);
      expect(permissions.isGridManager).toBe(false);
      expect(permissions.canViewPhone).toBe(false);
      expect(permissions.canEditGrid).toBe(false);
      expect(permissions.canDeleteGrid).toBe(false);
      expect(permissions.canViewAuditLogs).toBe(false);
      expect(permissions.canExportData).toBe(false);
    });

    it('should work without grid parameter', () => {
      const permissions = getUserPermissions(adminUser);
      expect(permissions).toHaveProperty('isAdmin');
      expect(permissions).toHaveProperty('canViewAuditLogs');
      expect(permissions).toHaveProperty('canExportData');
    });
  });
});
