/**
 * Volunteer Statuses Constants
 * 志工狀態常量定義
 *
 * 提供型別安全的志工狀態定義
 */

export const VOLUNTEER_STATUSES = {
  PENDING: 'pending',       // 待確認
  CONFIRMED: 'confirmed',   // 已確認
  ARRIVED: 'arrived',       // 已到場
  COMPLETED: 'completed',   // 已完成
  CANCELLED: 'cancelled'    // 已取消
};

export const VOLUNTEER_STATUS_LABELS = {
  [VOLUNTEER_STATUSES.PENDING]: '待確認',
  [VOLUNTEER_STATUSES.CONFIRMED]: '已確認',
  [VOLUNTEER_STATUSES.ARRIVED]: '已到場',
  [VOLUNTEER_STATUSES.COMPLETED]: '已完成',
  [VOLUNTEER_STATUSES.CANCELLED]: '已取消'
};

// Volunteer Status Colors (for UI)
export const VOLUNTEER_STATUS_COLORS = {
  [VOLUNTEER_STATUSES.PENDING]: 'orange',
  [VOLUNTEER_STATUSES.CONFIRMED]: 'blue',
  [VOLUNTEER_STATUSES.ARRIVED]: 'green',
  [VOLUNTEER_STATUSES.COMPLETED]: 'gray',
  [VOLUNTEER_STATUSES.CANCELLED]: 'red'
};

/**
 * 驗證志工狀態是否有效
 * @param {string} status - 志工狀態
 * @returns {boolean} 是否為有效的志工狀態
 */
export const isValidVolunteerStatus = (status) =>
  Object.values(VOLUNTEER_STATUSES).includes(status);

/**
 * 獲取志工狀態標籤
 * @param {string} status - 志工狀態
 * @returns {string} 志工狀態的中文標籤
 */
export const getVolunteerStatusLabel = (status) =>
  VOLUNTEER_STATUS_LABELS[status] || '未知狀態';

/**
 * 獲取志工狀態顏色
 * @param {string} status - 志工狀態
 * @returns {string} 狀態對應的顏色
 */
export const getVolunteerStatusColor = (status) =>
  VOLUNTEER_STATUS_COLORS[status] || 'gray';

/**
 * 檢查志工是否可以取消
 * @param {string} status - 志工狀態
 * @returns {boolean} 是否可以取消
 */
export const canCancelVolunteer = (status) =>
  [VOLUNTEER_STATUSES.PENDING, VOLUNTEER_STATUSES.CONFIRMED].includes(status);

/**
 * 檢查志工是否已經完成或取消
 * @param {string} status - 志工狀態
 * @returns {boolean} 是否已完成或取消
 */
export const isVolunteerFinalized = (status) =>
  [VOLUNTEER_STATUSES.COMPLETED, VOLUNTEER_STATUSES.CANCELLED].includes(status);

/**
 * 獲取下一個可能的志工狀態
 * @param {string} currentStatus - 當前狀態
 * @returns {string[]} 可能的下一個狀態列表
 */
export const getNextVolunteerStatuses = (currentStatus) => {
  const statusFlow = {
    [VOLUNTEER_STATUSES.PENDING]: [VOLUNTEER_STATUSES.CONFIRMED, VOLUNTEER_STATUSES.CANCELLED],
    [VOLUNTEER_STATUSES.CONFIRMED]: [VOLUNTEER_STATUSES.ARRIVED, VOLUNTEER_STATUSES.CANCELLED],
    [VOLUNTEER_STATUSES.ARRIVED]: [VOLUNTEER_STATUSES.COMPLETED],
    [VOLUNTEER_STATUSES.COMPLETED]: [],
    [VOLUNTEER_STATUSES.CANCELLED]: []
  };

  return statusFlow[currentStatus] || [];
};
