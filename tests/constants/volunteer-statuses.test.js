/**
 * Volunteer Statuses Constants Tests
 * 志工狀態常量測試
 */

import { describe, it, expect } from 'vitest';
import {
  VOLUNTEER_STATUSES,
  VOLUNTEER_STATUS_LABELS,
  VOLUNTEER_STATUS_COLORS,
  isValidVolunteerStatus,
  getVolunteerStatusLabel,
  getVolunteerStatusColor,
  canCancelVolunteer,
  isVolunteerFinalized,
  getNextVolunteerStatuses
} from '../../src/constants/volunteer-statuses.js';

describe('Volunteer Statuses Constants', () => {
  describe('VOLUNTEER_STATUSES', () => {
    it('should have all required volunteer statuses', () => {
      expect(VOLUNTEER_STATUSES).toHaveProperty('PENDING');
      expect(VOLUNTEER_STATUSES).toHaveProperty('CONFIRMED');
      expect(VOLUNTEER_STATUSES).toHaveProperty('ARRIVED');
      expect(VOLUNTEER_STATUSES).toHaveProperty('COMPLETED');
      expect(VOLUNTEER_STATUSES).toHaveProperty('CANCELLED');
    });

    it('should have correct values', () => {
      expect(VOLUNTEER_STATUSES.PENDING).toBe('pending');
      expect(VOLUNTEER_STATUSES.CONFIRMED).toBe('confirmed');
      expect(VOLUNTEER_STATUSES.ARRIVED).toBe('arrived');
      expect(VOLUNTEER_STATUSES.COMPLETED).toBe('completed');
      expect(VOLUNTEER_STATUSES.CANCELLED).toBe('cancelled');
    });
  });

  describe('VOLUNTEER_STATUS_LABELS', () => {
    it('should have labels for all volunteer statuses', () => {
      Object.values(VOLUNTEER_STATUSES).forEach(status => {
        expect(VOLUNTEER_STATUS_LABELS).toHaveProperty(status);
        expect(typeof VOLUNTEER_STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(VOLUNTEER_STATUS_LABELS[VOLUNTEER_STATUSES.PENDING]).toBe('待確認');
      expect(VOLUNTEER_STATUS_LABELS[VOLUNTEER_STATUSES.CONFIRMED]).toBe('已確認');
      expect(VOLUNTEER_STATUS_LABELS[VOLUNTEER_STATUSES.ARRIVED]).toBe('已到場');
      expect(VOLUNTEER_STATUS_LABELS[VOLUNTEER_STATUSES.COMPLETED]).toBe('已完成');
      expect(VOLUNTEER_STATUS_LABELS[VOLUNTEER_STATUSES.CANCELLED]).toBe('已取消');
    });
  });

  describe('VOLUNTEER_STATUS_COLORS', () => {
    it('should have colors for all volunteer statuses', () => {
      Object.values(VOLUNTEER_STATUSES).forEach(status => {
        expect(VOLUNTEER_STATUS_COLORS).toHaveProperty(status);
        expect(typeof VOLUNTEER_STATUS_COLORS[status]).toBe('string');
      });
    });
  });

  describe('isValidVolunteerStatus', () => {
    it('should return true for valid volunteer statuses', () => {
      Object.values(VOLUNTEER_STATUSES).forEach(status => {
        expect(isValidVolunteerStatus(status)).toBe(true);
      });
    });

    it('should return false for invalid volunteer statuses', () => {
      expect(isValidVolunteerStatus('invalid')).toBe(false);
      expect(isValidVolunteerStatus('')).toBe(false);
      expect(isValidVolunteerStatus(null)).toBe(false);
      expect(isValidVolunteerStatus(undefined)).toBe(false);
    });
  });

  describe('getVolunteerStatusLabel', () => {
    it('should return correct labels for valid volunteer statuses', () => {
      expect(getVolunteerStatusLabel(VOLUNTEER_STATUSES.PENDING)).toBe('待確認');
      expect(getVolunteerStatusLabel(VOLUNTEER_STATUSES.CONFIRMED)).toBe('已確認');
      expect(getVolunteerStatusLabel(VOLUNTEER_STATUSES.ARRIVED)).toBe('已到場');
    });

    it('should return default label for invalid volunteer statuses', () => {
      expect(getVolunteerStatusLabel('invalid')).toBe('未知狀態');
      expect(getVolunteerStatusLabel(null)).toBe('未知狀態');
    });
  });

  describe('getVolunteerStatusColor', () => {
    it('should return correct colors for valid volunteer statuses', () => {
      expect(getVolunteerStatusColor(VOLUNTEER_STATUSES.PENDING)).toBe('orange');
      expect(getVolunteerStatusColor(VOLUNTEER_STATUSES.CONFIRMED)).toBe('blue');
      expect(getVolunteerStatusColor(VOLUNTEER_STATUSES.ARRIVED)).toBe('green');
    });

    it('should return default color for invalid volunteer statuses', () => {
      expect(getVolunteerStatusColor('invalid')).toBe('gray');
    });
  });

  describe('canCancelVolunteer', () => {
    it('should return true for pending and confirmed statuses', () => {
      expect(canCancelVolunteer(VOLUNTEER_STATUSES.PENDING)).toBe(true);
      expect(canCancelVolunteer(VOLUNTEER_STATUSES.CONFIRMED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(canCancelVolunteer(VOLUNTEER_STATUSES.ARRIVED)).toBe(false);
      expect(canCancelVolunteer(VOLUNTEER_STATUSES.COMPLETED)).toBe(false);
      expect(canCancelVolunteer(VOLUNTEER_STATUSES.CANCELLED)).toBe(false);
    });

    it('should return false for invalid statuses', () => {
      expect(canCancelVolunteer('invalid')).toBe(false);
      expect(canCancelVolunteer(null)).toBe(false);
    });
  });

  describe('isVolunteerFinalized', () => {
    it('should return true for completed and cancelled statuses', () => {
      expect(isVolunteerFinalized(VOLUNTEER_STATUSES.COMPLETED)).toBe(true);
      expect(isVolunteerFinalized(VOLUNTEER_STATUSES.CANCELLED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isVolunteerFinalized(VOLUNTEER_STATUSES.PENDING)).toBe(false);
      expect(isVolunteerFinalized(VOLUNTEER_STATUSES.CONFIRMED)).toBe(false);
      expect(isVolunteerFinalized(VOLUNTEER_STATUSES.ARRIVED)).toBe(false);
    });

    it('should return false for invalid statuses', () => {
      expect(isVolunteerFinalized('invalid')).toBe(false);
      expect(isVolunteerFinalized(null)).toBe(false);
    });
  });

  describe('getNextVolunteerStatuses', () => {
    it('should return correct next statuses for pending', () => {
      const nextStatuses = getNextVolunteerStatuses(VOLUNTEER_STATUSES.PENDING);
      expect(nextStatuses).toContain(VOLUNTEER_STATUSES.CONFIRMED);
      expect(nextStatuses).toContain(VOLUNTEER_STATUSES.CANCELLED);
      expect(nextStatuses).toHaveLength(2);
    });

    it('should return correct next statuses for confirmed', () => {
      const nextStatuses = getNextVolunteerStatuses(VOLUNTEER_STATUSES.CONFIRMED);
      expect(nextStatuses).toContain(VOLUNTEER_STATUSES.ARRIVED);
      expect(nextStatuses).toContain(VOLUNTEER_STATUSES.CANCELLED);
      expect(nextStatuses).toHaveLength(2);
    });

    it('should return correct next statuses for arrived', () => {
      const nextStatuses = getNextVolunteerStatuses(VOLUNTEER_STATUSES.ARRIVED);
      expect(nextStatuses).toContain(VOLUNTEER_STATUSES.COMPLETED);
      expect(nextStatuses).toHaveLength(1);
    });

    it('should return empty array for finalized statuses', () => {
      expect(getNextVolunteerStatuses(VOLUNTEER_STATUSES.COMPLETED)).toEqual([]);
      expect(getNextVolunteerStatuses(VOLUNTEER_STATUSES.CANCELLED)).toEqual([]);
    });

    it('should return empty array for invalid statuses', () => {
      expect(getNextVolunteerStatuses('invalid')).toEqual([]);
      expect(getNextVolunteerStatuses(null)).toEqual([]);
    });
  });
});
