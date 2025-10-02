/**
 * Grid Types Constants
 * 網格類型常量定義
 *
 * 提供型別安全的網格類型與狀態定義
 */

// Grid Types
export const GRID_TYPES = {
  MUD_DISPOSAL: 'mud_disposal',      // 污泥暫置場
  MANPOWER: 'manpower',              // 人力任務
  SUPPLY_STORAGE: 'supply_storage',  // 物資停放處
  ACCOMMODATION: 'accommodation',     // 住宿地點
  FOOD_AREA: 'food_area'             // 領吃食區域
};

export const GRID_TYPE_LABELS = {
  [GRID_TYPES.MUD_DISPOSAL]: '污泥暫置場',
  [GRID_TYPES.MANPOWER]: '人力任務',
  [GRID_TYPES.SUPPLY_STORAGE]: '物資停放處',
  [GRID_TYPES.ACCOMMODATION]: '住宿地點',
  [GRID_TYPES.FOOD_AREA]: '領吃食區域'
};

// Grid Statuses
export const GRID_STATUSES = {
  OPEN: 'open',           // 開放中
  CLOSED: 'closed',       // 已關閉
  COMPLETED: 'completed', // 已完成
  PENDING: 'pending'      // 準備中
};

export const GRID_STATUS_LABELS = {
  [GRID_STATUSES.OPEN]: '開放中',
  [GRID_STATUSES.CLOSED]: '已關閉',
  [GRID_STATUSES.COMPLETED]: '已完成',
  [GRID_STATUSES.PENDING]: '準備中'
};

// Grid Status Colors (for UI)
export const GRID_STATUS_COLORS = {
  [GRID_STATUSES.OPEN]: 'green',
  [GRID_STATUSES.CLOSED]: 'red',
  [GRID_STATUSES.COMPLETED]: 'gray',
  [GRID_STATUSES.PENDING]: 'yellow'
};

/**
 * 驗證網格類型是否有效
 * @param {string} type - 網格類型
 * @returns {boolean} 是否為有效的網格類型
 */
export const isValidGridType = (type) =>
  Object.values(GRID_TYPES).includes(type);

/**
 * 驗證網格狀態是否有效
 * @param {string} status - 網格狀態
 * @returns {boolean} 是否為有效的網格狀態
 */
export const isValidGridStatus = (status) =>
  Object.values(GRID_STATUSES).includes(status);

/**
 * 獲取網格類型標籤
 * @param {string} type - 網格類型
 * @returns {string} 網格類型的中文標籤
 */
export const getGridTypeLabel = (type) =>
  GRID_TYPE_LABELS[type] || '未知類型';

/**
 * 獲取網格狀態標籤
 * @param {string} status - 網格狀態
 * @returns {string} 網格狀態的中文標籤
 */
export const getGridStatusLabel = (status) =>
  GRID_STATUS_LABELS[status] || '未知狀態';

/**
 * 獲取網格狀態顏色
 * @param {string} status - 網格狀態
 * @returns {string} 狀態對應的顏色
 */
export const getGridStatusColor = (status) =>
  GRID_STATUS_COLORS[status] || 'gray';
