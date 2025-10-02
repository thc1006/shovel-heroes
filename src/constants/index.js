/**
 * Constants Index
 * 常量統一導出入口
 *
 * 提供所有常量的統一導入接口
 */

// Grid Types & Statuses
export * from './grid-types.js';

// Volunteer Statuses
export * from './volunteer-statuses.js';

// Supply & Donation
export * from './supply-donation.js';

// User Roles & Permissions
export * from './user-roles.js';

/**
 * 常量版本號
 * 用於追蹤常量定義的變更
 */
export const CONSTANTS_VERSION = '1.0.0';

/**
 * 所有常量的命名空間導出
 * 方便需要區分來源時使用
 */
export {
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
} from './grid-types.js';

export {
  VOLUNTEER_STATUSES,
  VOLUNTEER_STATUS_LABELS,
  VOLUNTEER_STATUS_COLORS,
  isValidVolunteerStatus,
  getVolunteerStatusLabel,
  getVolunteerStatusColor,
  canCancelVolunteer,
  isVolunteerFinalized,
  getNextVolunteerStatuses
} from './volunteer-statuses.js';

export {
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
} from './supply-donation.js';

export {
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
} from './user-roles.js';
