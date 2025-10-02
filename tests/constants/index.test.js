/**
 * Constants Index Tests
 * 常量統一導出測試
 */

import { describe, it, expect } from 'vitest';
import * as constants from '../../src/constants/index.js';

describe('Constants Index', () => {
  describe('Exports', () => {
    it('should export CONSTANTS_VERSION', () => {
      expect(constants.CONSTANTS_VERSION).toBeDefined();
      expect(typeof constants.CONSTANTS_VERSION).toBe('string');
    });

    it('should export all grid types constants', () => {
      expect(constants.GRID_TYPES).toBeDefined();
      expect(constants.GRID_TYPE_LABELS).toBeDefined();
      expect(constants.GRID_STATUSES).toBeDefined();
      expect(constants.GRID_STATUS_LABELS).toBeDefined();
      expect(constants.GRID_STATUS_COLORS).toBeDefined();
    });

    it('should export all grid types functions', () => {
      expect(typeof constants.isValidGridType).toBe('function');
      expect(typeof constants.isValidGridStatus).toBe('function');
      expect(typeof constants.getGridTypeLabel).toBe('function');
      expect(typeof constants.getGridStatusLabel).toBe('function');
      expect(typeof constants.getGridStatusColor).toBe('function');
    });

    it('should export all volunteer statuses constants', () => {
      expect(constants.VOLUNTEER_STATUSES).toBeDefined();
      expect(constants.VOLUNTEER_STATUS_LABELS).toBeDefined();
      expect(constants.VOLUNTEER_STATUS_COLORS).toBeDefined();
    });

    it('should export all volunteer statuses functions', () => {
      expect(typeof constants.isValidVolunteerStatus).toBe('function');
      expect(typeof constants.getVolunteerStatusLabel).toBe('function');
      expect(typeof constants.getVolunteerStatusColor).toBe('function');
      expect(typeof constants.canCancelVolunteer).toBe('function');
      expect(typeof constants.isVolunteerFinalized).toBe('function');
      expect(typeof constants.getNextVolunteerStatuses).toBe('function');
    });

    it('should export all supply & donation constants', () => {
      expect(constants.DELIVERY_METHODS).toBeDefined();
      expect(constants.DELIVERY_METHOD_LABELS).toBeDefined();
      expect(constants.DONATION_STATUSES).toBeDefined();
      expect(constants.DONATION_STATUS_LABELS).toBeDefined();
      expect(constants.DONATION_STATUS_COLORS).toBeDefined();
      expect(constants.SUPPLY_CATEGORIES).toBeDefined();
      expect(constants.SUPPLY_CATEGORY_LABELS).toBeDefined();
    });

    it('should export all supply & donation functions', () => {
      expect(typeof constants.isValidDeliveryMethod).toBe('function');
      expect(typeof constants.isValidDonationStatus).toBe('function');
      expect(typeof constants.isValidSupplyCategory).toBe('function');
      expect(typeof constants.getDeliveryMethodLabel).toBe('function');
      expect(typeof constants.getDonationStatusLabel).toBe('function');
      expect(typeof constants.getDonationStatusColor).toBe('function');
      expect(typeof constants.getSupplyCategoryLabel).toBe('function');
      expect(typeof constants.canCancelDonation).toBe('function');
      expect(typeof constants.isDonationFinalized).toBe('function');
      expect(typeof constants.getNextDonationStatuses).toBe('function');
    });

    it('should export all user roles constants', () => {
      expect(constants.USER_ROLES).toBeDefined();
      expect(constants.USER_ROLE_LABELS).toBeDefined();
      expect(constants.USER_ROLE_PRIORITIES).toBeDefined();
    });

    it('should export all user roles functions', () => {
      expect(typeof constants.isValidUserRole).toBe('function');
      expect(typeof constants.getUserRoleLabel).toBe('function');
      expect(typeof constants.getUserRolePriority).toBe('function');
      expect(typeof constants.hasHigherRole).toBe('function');
      expect(typeof constants.isAdmin).toBe('function');
      expect(typeof constants.isGridManager).toBe('function');
      expect(typeof constants.canViewPhone).toBe('function');
      expect(typeof constants.canViewEmail).toBe('function');
      expect(typeof constants.canEditGrid).toBe('function');
      expect(typeof constants.canDeleteGrid).toBe('function');
      expect(typeof constants.canManageVolunteers).toBe('function');
      expect(typeof constants.canManageSupplies).toBe('function');
      expect(typeof constants.canViewAuditLogs).toBe('function');
      expect(typeof constants.canExportData).toBe('function');
      expect(typeof constants.getUserPermissions).toBe('function');
    });
  });

  describe('Integration', () => {
    it('should have consistent values across modules', () => {
      // Test that re-exported values match original exports
      expect(constants.GRID_TYPES.MANPOWER).toBe('manpower');
      expect(constants.VOLUNTEER_STATUSES.PENDING).toBe('pending');
      expect(constants.DONATION_STATUSES.PLEDGED).toBe('pledged');
      expect(constants.USER_ROLES.ADMIN).toBe('admin');
    });

    it('should have no naming conflicts', () => {
      const exportedNames = Object.keys(constants);
      const uniqueNames = new Set(exportedNames);
      expect(exportedNames.length).toBe(uniqueNames.size);
    });

    it('should export all expected constant groups', () => {
      const hasGridTypes = 'GRID_TYPES' in constants;
      const hasVolunteerStatuses = 'VOLUNTEER_STATUSES' in constants;
      const hasDonationStatuses = 'DONATION_STATUSES' in constants;
      const hasUserRoles = 'USER_ROLES' in constants;

      expect(hasGridTypes).toBe(true);
      expect(hasVolunteerStatuses).toBe(true);
      expect(hasDonationStatuses).toBe(true);
      expect(hasUserRoles).toBe(true);
    });
  });

  describe('Version', () => {
    it('should have valid semantic version format', () => {
      const versionRegex = /^\d+\.\d+\.\d+$/;
      expect(constants.CONSTANTS_VERSION).toMatch(versionRegex);
    });

    it('should be version 1.0.0', () => {
      expect(constants.CONSTANTS_VERSION).toBe('1.0.0');
    });
  });
});
