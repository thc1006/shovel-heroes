/**
 * Supply & Donation Constants Tests
 * 物資與捐贈常量測試
 */

import { describe, it, expect } from 'vitest';
import {
  DELIVERY_METHODS,
  DELIVERY_METHOD_LABELS,
  DONATION_STATUSES,
  DONATION_STATUS_LABELS,
  DONATION_STATUS_COLORS,
  SUPPLY_CATEGORIES,
  SUPPLY_CATEGORY_LABELS,
  isValidDeliveryMethod,
  isValidDonationStatus,
  isValidSupplyCategory,
  getDeliveryMethodLabel,
  getDonationStatusLabel,
  getDonationStatusColor,
  getSupplyCategoryLabel,
  canCancelDonation,
  isDonationFinalized,
  getNextDonationStatuses
} from '../../src/constants/supply-donation.js';

describe('Supply & Donation Constants', () => {
  describe('DELIVERY_METHODS', () => {
    it('should have all required delivery methods', () => {
      expect(DELIVERY_METHODS).toHaveProperty('DIRECT');
      expect(DELIVERY_METHODS).toHaveProperty('PICKUP_POINT');
      expect(DELIVERY_METHODS).toHaveProperty('VOLUNTEER_PICKUP');
    });

    it('should have correct values', () => {
      expect(DELIVERY_METHODS.DIRECT).toBe('direct');
      expect(DELIVERY_METHODS.PICKUP_POINT).toBe('pickup_point');
      expect(DELIVERY_METHODS.VOLUNTEER_PICKUP).toBe('volunteer_pickup');
    });
  });

  describe('DELIVERY_METHOD_LABELS', () => {
    it('should have labels for all delivery methods', () => {
      Object.values(DELIVERY_METHODS).forEach(method => {
        expect(DELIVERY_METHOD_LABELS).toHaveProperty(method);
        expect(typeof DELIVERY_METHOD_LABELS[method]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(DELIVERY_METHOD_LABELS[DELIVERY_METHODS.DIRECT]).toBe('直接送達');
      expect(DELIVERY_METHOD_LABELS[DELIVERY_METHODS.PICKUP_POINT]).toBe('轉運點');
      expect(DELIVERY_METHOD_LABELS[DELIVERY_METHODS.VOLUNTEER_PICKUP]).toBe('志工取貨');
    });
  });

  describe('DONATION_STATUSES', () => {
    it('should have all required donation statuses', () => {
      expect(DONATION_STATUSES).toHaveProperty('PLEDGED');
      expect(DONATION_STATUSES).toHaveProperty('CONFIRMED');
      expect(DONATION_STATUSES).toHaveProperty('IN_TRANSIT');
      expect(DONATION_STATUSES).toHaveProperty('DELIVERED');
      expect(DONATION_STATUSES).toHaveProperty('CANCELLED');
    });

    it('should have correct values', () => {
      expect(DONATION_STATUSES.PLEDGED).toBe('pledged');
      expect(DONATION_STATUSES.CONFIRMED).toBe('confirmed');
      expect(DONATION_STATUSES.IN_TRANSIT).toBe('in_transit');
      expect(DONATION_STATUSES.DELIVERED).toBe('delivered');
      expect(DONATION_STATUSES.CANCELLED).toBe('cancelled');
    });
  });

  describe('DONATION_STATUS_LABELS', () => {
    it('should have labels for all donation statuses', () => {
      Object.values(DONATION_STATUSES).forEach(status => {
        expect(DONATION_STATUS_LABELS).toHaveProperty(status);
        expect(typeof DONATION_STATUS_LABELS[status]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(DONATION_STATUS_LABELS[DONATION_STATUSES.PLEDGED]).toBe('已承諾');
      expect(DONATION_STATUS_LABELS[DONATION_STATUSES.CONFIRMED]).toBe('已確認');
      expect(DONATION_STATUS_LABELS[DONATION_STATUSES.IN_TRANSIT]).toBe('運送中');
      expect(DONATION_STATUS_LABELS[DONATION_STATUSES.DELIVERED]).toBe('已送達');
      expect(DONATION_STATUS_LABELS[DONATION_STATUSES.CANCELLED]).toBe('已取消');
    });
  });

  describe('SUPPLY_CATEGORIES', () => {
    it('should have all required supply categories', () => {
      expect(SUPPLY_CATEGORIES).toHaveProperty('FOOD');
      expect(SUPPLY_CATEGORIES).toHaveProperty('WATER');
      expect(SUPPLY_CATEGORIES).toHaveProperty('CLOTHING');
      expect(SUPPLY_CATEGORIES).toHaveProperty('TOOLS');
      expect(SUPPLY_CATEGORIES).toHaveProperty('MEDICAL');
      expect(SUPPLY_CATEGORIES).toHaveProperty('HYGIENE');
      expect(SUPPLY_CATEGORIES).toHaveProperty('SHELTER');
      expect(SUPPLY_CATEGORIES).toHaveProperty('OTHER');
    });

    it('should have correct values', () => {
      expect(SUPPLY_CATEGORIES.FOOD).toBe('food');
      expect(SUPPLY_CATEGORIES.WATER).toBe('water');
      expect(SUPPLY_CATEGORIES.CLOTHING).toBe('clothing');
      expect(SUPPLY_CATEGORIES.TOOLS).toBe('tools');
      expect(SUPPLY_CATEGORIES.MEDICAL).toBe('medical');
      expect(SUPPLY_CATEGORIES.HYGIENE).toBe('hygiene');
      expect(SUPPLY_CATEGORIES.SHELTER).toBe('shelter');
      expect(SUPPLY_CATEGORIES.OTHER).toBe('other');
    });
  });

  describe('SUPPLY_CATEGORY_LABELS', () => {
    it('should have labels for all supply categories', () => {
      Object.values(SUPPLY_CATEGORIES).forEach(category => {
        expect(SUPPLY_CATEGORY_LABELS).toHaveProperty(category);
        expect(typeof SUPPLY_CATEGORY_LABELS[category]).toBe('string');
      });
    });

    it('should have correct Chinese labels', () => {
      expect(SUPPLY_CATEGORY_LABELS[SUPPLY_CATEGORIES.FOOD]).toBe('食物');
      expect(SUPPLY_CATEGORY_LABELS[SUPPLY_CATEGORIES.WATER]).toBe('飲用水');
      expect(SUPPLY_CATEGORY_LABELS[SUPPLY_CATEGORIES.TOOLS]).toBe('工具');
    });
  });

  describe('Validation Functions', () => {
    it('isValidDeliveryMethod should work correctly', () => {
      Object.values(DELIVERY_METHODS).forEach(method => {
        expect(isValidDeliveryMethod(method)).toBe(true);
      });
      expect(isValidDeliveryMethod('invalid')).toBe(false);
      expect(isValidDeliveryMethod(null)).toBe(false);
    });

    it('isValidDonationStatus should work correctly', () => {
      Object.values(DONATION_STATUSES).forEach(status => {
        expect(isValidDonationStatus(status)).toBe(true);
      });
      expect(isValidDonationStatus('invalid')).toBe(false);
      expect(isValidDonationStatus(null)).toBe(false);
    });

    it('isValidSupplyCategory should work correctly', () => {
      Object.values(SUPPLY_CATEGORIES).forEach(category => {
        expect(isValidSupplyCategory(category)).toBe(true);
      });
      expect(isValidSupplyCategory('invalid')).toBe(false);
      expect(isValidSupplyCategory(null)).toBe(false);
    });
  });

  describe('Label Getter Functions', () => {
    it('getDeliveryMethodLabel should return correct labels', () => {
      expect(getDeliveryMethodLabel(DELIVERY_METHODS.DIRECT)).toBe('直接送達');
      expect(getDeliveryMethodLabel('invalid')).toBe('未知方式');
    });

    it('getDonationStatusLabel should return correct labels', () => {
      expect(getDonationStatusLabel(DONATION_STATUSES.PLEDGED)).toBe('已承諾');
      expect(getDonationStatusLabel('invalid')).toBe('未知狀態');
    });

    it('getDonationStatusColor should return correct colors', () => {
      expect(getDonationStatusColor(DONATION_STATUSES.PLEDGED)).toBe('yellow');
      expect(getDonationStatusColor(DONATION_STATUSES.DELIVERED)).toBe('green');
      expect(getDonationStatusColor('invalid')).toBe('gray');
    });

    it('getSupplyCategoryLabel should return correct labels', () => {
      expect(getSupplyCategoryLabel(SUPPLY_CATEGORIES.FOOD)).toBe('食物');
      expect(getSupplyCategoryLabel('invalid')).toBe('未知類別');
    });
  });

  describe('canCancelDonation', () => {
    it('should return true for pledged and confirmed statuses', () => {
      expect(canCancelDonation(DONATION_STATUSES.PLEDGED)).toBe(true);
      expect(canCancelDonation(DONATION_STATUSES.CONFIRMED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(canCancelDonation(DONATION_STATUSES.IN_TRANSIT)).toBe(false);
      expect(canCancelDonation(DONATION_STATUSES.DELIVERED)).toBe(false);
      expect(canCancelDonation(DONATION_STATUSES.CANCELLED)).toBe(false);
    });
  });

  describe('isDonationFinalized', () => {
    it('should return true for delivered and cancelled statuses', () => {
      expect(isDonationFinalized(DONATION_STATUSES.DELIVERED)).toBe(true);
      expect(isDonationFinalized(DONATION_STATUSES.CANCELLED)).toBe(true);
    });

    it('should return false for other statuses', () => {
      expect(isDonationFinalized(DONATION_STATUSES.PLEDGED)).toBe(false);
      expect(isDonationFinalized(DONATION_STATUSES.CONFIRMED)).toBe(false);
      expect(isDonationFinalized(DONATION_STATUSES.IN_TRANSIT)).toBe(false);
    });
  });

  describe('getNextDonationStatuses', () => {
    it('should return correct next statuses for pledged', () => {
      const nextStatuses = getNextDonationStatuses(DONATION_STATUSES.PLEDGED);
      expect(nextStatuses).toContain(DONATION_STATUSES.CONFIRMED);
      expect(nextStatuses).toContain(DONATION_STATUSES.CANCELLED);
      expect(nextStatuses).toHaveLength(2);
    });

    it('should return correct next statuses for confirmed', () => {
      const nextStatuses = getNextDonationStatuses(DONATION_STATUSES.CONFIRMED);
      expect(nextStatuses).toContain(DONATION_STATUSES.IN_TRANSIT);
      expect(nextStatuses).toContain(DONATION_STATUSES.CANCELLED);
      expect(nextStatuses).toHaveLength(2);
    });

    it('should return correct next statuses for in_transit', () => {
      const nextStatuses = getNextDonationStatuses(DONATION_STATUSES.IN_TRANSIT);
      expect(nextStatuses).toContain(DONATION_STATUSES.DELIVERED);
      expect(nextStatuses).toHaveLength(1);
    });

    it('should return empty array for finalized statuses', () => {
      expect(getNextDonationStatuses(DONATION_STATUSES.DELIVERED)).toEqual([]);
      expect(getNextDonationStatuses(DONATION_STATUSES.CANCELLED)).toEqual([]);
    });

    it('should return empty array for invalid statuses', () => {
      expect(getNextDonationStatuses('invalid')).toEqual([]);
      expect(getNextDonationStatuses(null)).toEqual([]);
    });
  });
});
