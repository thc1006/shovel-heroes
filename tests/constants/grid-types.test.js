/**
 * Grid Types Constants Tests
 * 網格類型常量測試
 */

import { describe, it, expect } from 'vitest';
import {
  GRID_TYPES,
  GRID_TYPE_LABELS,
  GRID_STATUSES,
  GRID_STATUS_LABELS,
  GRID_STATUS_COLORS,
  isValidGridType,
  isValidGridStatus,
  getGridTypeLabel,
  getGridStatusLabel,
  getGridStatusColor
} from '../../src/constants/grid-types.js';

describe('Grid Types Constants', () => {
  describe('GRID_TYPES', () => {
    it('should have all required grid types', () => {
      expect(GRID_TYPES).toHaveProperty('MUD_DISPOSAL');
      expect(GRID_TYPES).toHaveProperty('MANPOWER');
      expect(GRID_TYPES).toHaveProperty('SUPPLY_STORAGE');
      expect(GRID_TYPES).toHaveProperty('ACCOMMODATION');
      expect(GRID_TYPES).toHaveProperty('FOOD_AREA');
    });

    it('should have correct values', () => {
      expect(GRID_TYPES.MUD_DISPOSAL).toBe('mud_disposal');
      expect(GRID_TYPES.MANPOWER).toBe('manpower');
      expect(GRID_TYPES.SUPPLY_STORAGE).toBe('supply_storage');
      expect(GRID_TYPES.ACCOMMODATION).toBe('accommodation');
      expect(GRID_TYPES.FOOD_AREA).toBe('food_area');
    });
  });

  describe('GRID_TYPE_LABELS', () => {
    it('should have labels for all grid types', () => {
      Object.values(GRID_TYPES).forEach(type => {
        expect(GRID_TYPE_LABELS).toHaveProperty(type);
        expect(typeof GRID_TYPE_LABELS[type]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(GRID_TYPE_LABELS[GRID_TYPES.MUD_DISPOSAL]).toBe('污泥暫置場');
      expect(GRID_TYPE_LABELS[GRID_TYPES.MANPOWER]).toBe('人力任務');
      expect(GRID_TYPE_LABELS[GRID_TYPES.SUPPLY_STORAGE]).toBe('物資停放處');
      expect(GRID_TYPE_LABELS[GRID_TYPES.ACCOMMODATION]).toBe('住宿地點');
      expect(GRID_TYPE_LABELS[GRID_TYPES.FOOD_AREA]).toBe('領吃食區域');
    });
  });

  describe('GRID_STATUSES', () => {
    it('should have all required grid statuses', () => {
      expect(GRID_STATUSES).toHaveProperty('OPEN');
      expect(GRID_STATUSES).toHaveProperty('CLOSED');
      expect(GRID_STATUSES).toHaveProperty('COMPLETED');
      expect(GRID_STATUSES).toHaveProperty('PENDING');
    });

    it('should have correct values', () => {
      expect(GRID_STATUSES.OPEN).toBe('open');
      expect(GRID_STATUSES.CLOSED).toBe('closed');
      expect(GRID_STATUSES.COMPLETED).toBe('completed');
      expect(GRID_STATUSES.PENDING).toBe('pending');
    });
  });

  describe('GRID_STATUS_LABELS', () => {
    it('should have labels for all grid statuses', () => {
      Object.values(GRID_STATUSES).forEach(status => {
        expect(GRID_STATUS_LABELS).toHaveProperty(status);
        expect(typeof GRID_STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(GRID_STATUS_LABELS[GRID_STATUSES.OPEN]).toBe('開放中');
      expect(GRID_STATUS_LABELS[GRID_STATUSES.CLOSED]).toBe('已關閉');
      expect(GRID_STATUS_LABELS[GRID_STATUSES.COMPLETED]).toBe('已完成');
      expect(GRID_STATUS_LABELS[GRID_STATUSES.PENDING]).toBe('準備中');
    });
  });

  describe('GRID_STATUS_COLORS', () => {
    it('should have colors for all grid statuses', () => {
      Object.values(GRID_STATUSES).forEach(status => {
        expect(GRID_STATUS_COLORS).toHaveProperty(status);
        expect(typeof GRID_STATUS_COLORS[status]).toBe('string');
      });
    });

    it('should have valid color values', () => {
      const validColors = ['green', 'red', 'gray', 'yellow', 'blue', 'orange', 'purple'];
      Object.values(GRID_STATUS_COLORS).forEach(color => {
        expect(validColors).toContain(color);
      });
    });
  });

  describe('isValidGridType', () => {
    it('should return true for valid grid types', () => {
      Object.values(GRID_TYPES).forEach(type => {
        expect(isValidGridType(type)).toBe(true);
      });
    });

    it('should return false for invalid grid types', () => {
      expect(isValidGridType('invalid')).toBe(false);
      expect(isValidGridType('')).toBe(false);
      expect(isValidGridType(null)).toBe(false);
      expect(isValidGridType(undefined)).toBe(false);
      expect(isValidGridType(123)).toBe(false);
    });
  });

  describe('isValidGridStatus', () => {
    it('should return true for valid grid statuses', () => {
      Object.values(GRID_STATUSES).forEach(status => {
        expect(isValidGridStatus(status)).toBe(true);
      });
    });

    it('should return false for invalid grid statuses', () => {
      expect(isValidGridStatus('invalid')).toBe(false);
      expect(isValidGridStatus('')).toBe(false);
      expect(isValidGridStatus(null)).toBe(false);
      expect(isValidGridStatus(undefined)).toBe(false);
      expect(isValidGridStatus(123)).toBe(false);
    });
  });

  describe('getGridTypeLabel', () => {
    it('should return correct labels for valid grid types', () => {
      expect(getGridTypeLabel(GRID_TYPES.MUD_DISPOSAL)).toBe('污泥暫置場');
      expect(getGridTypeLabel(GRID_TYPES.MANPOWER)).toBe('人力任務');
      expect(getGridTypeLabel(GRID_TYPES.SUPPLY_STORAGE)).toBe('物資停放處');
    });

    it('should return default label for invalid grid types', () => {
      expect(getGridTypeLabel('invalid')).toBe('未知類型');
      expect(getGridTypeLabel(null)).toBe('未知類型');
      expect(getGridTypeLabel(undefined)).toBe('未知類型');
    });
  });

  describe('getGridStatusLabel', () => {
    it('should return correct labels for valid grid statuses', () => {
      expect(getGridStatusLabel(GRID_STATUSES.OPEN)).toBe('開放中');
      expect(getGridStatusLabel(GRID_STATUSES.CLOSED)).toBe('已關閉');
      expect(getGridStatusLabel(GRID_STATUSES.COMPLETED)).toBe('已完成');
    });

    it('should return default label for invalid grid statuses', () => {
      expect(getGridStatusLabel('invalid')).toBe('未知狀態');
      expect(getGridStatusLabel(null)).toBe('未知狀態');
      expect(getGridStatusLabel(undefined)).toBe('未知狀態');
    });
  });

  describe('getGridStatusColor', () => {
    it('should return correct colors for valid grid statuses', () => {
      expect(getGridStatusColor(GRID_STATUSES.OPEN)).toBe('green');
      expect(getGridStatusColor(GRID_STATUSES.CLOSED)).toBe('red');
      expect(getGridStatusColor(GRID_STATUSES.COMPLETED)).toBe('gray');
    });

    it('should return default color for invalid grid statuses', () => {
      expect(getGridStatusColor('invalid')).toBe('gray');
      expect(getGridStatusColor(null)).toBe('gray');
      expect(getGridStatusColor(undefined)).toBe('gray');
    });
  });
});
