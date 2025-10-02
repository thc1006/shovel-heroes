/**
 * User Roles & Permissions Constants
 * 使用者角色與權限常量定義
 *
 * 提供型別安全的使用者角色與權限檢查
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',               // 管理員
  GRID_MANAGER: 'grid_manager', // 網格管理員
  USER: 'user'                  // 一般使用者
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: '管理員',
  [USER_ROLES.GRID_MANAGER]: '網格管理員',
  [USER_ROLES.USER]: '一般使用者'
};

// User Role Priorities (higher number = more permissions)
export const USER_ROLE_PRIORITIES = {
  [USER_ROLES.ADMIN]: 100,
  [USER_ROLES.GRID_MANAGER]: 50,
  [USER_ROLES.USER]: 10
};

/**
 * 驗證使用者角色是否有效
 * @param {string} role - 使用者角色
 * @returns {boolean} 是否為有效的使用者角色
 */
export const isValidUserRole = (role) =>
  Object.values(USER_ROLES).includes(role);

/**
 * 獲取使用者角色標籤
 * @param {string} role - 使用者角色
 * @returns {string} 使用者角色的中文標籤
 */
export const getUserRoleLabel = (role) =>
  USER_ROLE_LABELS[role] || '未知角色';

/**
 * 檢查使用者角色優先級
 * @param {string} role - 使用者角色
 * @returns {number} 角色優先級
 */
export const getUserRolePriority = (role) =>
  USER_ROLE_PRIORITIES[role] || 0;

/**
 * 比較兩個角色的優先級
 * @param {string} roleA - 角色 A
 * @param {string} roleB - 角色 B
 * @returns {boolean} 角色 A 是否優先級更高
 */
export const hasHigherRole = (roleA, roleB) =>
  getUserRolePriority(roleA) > getUserRolePriority(roleB);

// ==================== Permission Checks ====================

/**
 * 檢查使用者是否為管理員
 * @param {Object} user - 使用者物件
 * @returns {boolean} 是否為管理員
 */
export const isAdmin = (user) =>
  user?.role === USER_ROLES.ADMIN;

/**
 * 檢查使用者是否為網格管理員
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件（可選）
 * @returns {boolean} 是否為該網格的管理員
 */
export const isGridManager = (user, grid = null) => {
  if (!user) return false;
  if (user.role !== USER_ROLES.GRID_MANAGER) return false;
  if (!grid) return true;
  return user.id === grid.grid_manager_id;
};

/**
 * 檢查使用者是否可以查看電話號碼
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以查看電話
 */
export const canViewPhone = (user, grid) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  if (user.role === USER_ROLES.GRID_MANAGER && user.id === grid?.grid_manager_id) return true;
  return false;
};

/**
 * 檢查使用者是否可以查看 Email
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以查看 Email
 */
export const canViewEmail = (user, grid) => {
  // Same permission as viewing phone
  return canViewPhone(user, grid);
};

/**
 * 檢查使用者是否可以編輯網格
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以編輯網格
 */
export const canEditGrid = (user, grid) => {
  if (!user || !grid) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  if (user.role === USER_ROLES.GRID_MANAGER && user.id === grid.grid_manager_id) return true;
  return false;
};

/**
 * 檢查使用者是否可以刪除網格
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以刪除網格
 */
export const canDeleteGrid = (user, grid) => {
  if (!user || !grid) return false;
  // Only admin can delete grids
  return user.role === USER_ROLES.ADMIN;
};

/**
 * 檢查使用者是否可以管理志工
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以管理志工
 */
export const canManageVolunteers = (user, grid) => {
  return canEditGrid(user, grid);
};

/**
 * 檢查使用者是否可以管理物資
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件
 * @returns {boolean} 是否可以管理物資
 */
export const canManageSupplies = (user, grid) => {
  return canEditGrid(user, grid);
};

/**
 * 檢查使用者是否可以查看審計日誌
 * @param {Object} user - 使用者物件
 * @returns {boolean} 是否可以查看審計日誌
 */
export const canViewAuditLogs = (user) => {
  if (!user) return false;
  // Only admin can view audit logs
  return user.role === USER_ROLES.ADMIN;
};

/**
 * 檢查使用者是否可以匯出資料
 * @param {Object} user - 使用者物件
 * @returns {boolean} 是否可以匯出資料
 */
export const canExportData = (user) => {
  if (!user) return false;
  // Admin and grid managers can export data
  return [USER_ROLES.ADMIN, USER_ROLES.GRID_MANAGER].includes(user.role);
};

/**
 * 獲取使用者的所有權限
 * @param {Object} user - 使用者物件
 * @param {Object} grid - 網格物件（可選）
 * @returns {Object} 權限物件
 */
export const getUserPermissions = (user, grid = null) => ({
  isAdmin: isAdmin(user),
  isGridManager: isGridManager(user, grid),
  canViewPhone: canViewPhone(user, grid),
  canViewEmail: canViewEmail(user, grid),
  canEditGrid: canEditGrid(user, grid),
  canDeleteGrid: canDeleteGrid(user, grid),
  canManageVolunteers: canManageVolunteers(user, grid),
  canManageSupplies: canManageSupplies(user, grid),
  canViewAuditLogs: canViewAuditLogs(user),
  canExportData: canExportData(user)
});
