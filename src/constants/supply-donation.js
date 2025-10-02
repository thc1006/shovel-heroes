/**
 * Supply & Donation Constants
 * 物資與捐贈常量定義
 *
 * 提供型別安全的物資配送與捐贈狀態定義
 */

// Delivery Methods
export const DELIVERY_METHODS = {
  DIRECT: 'direct',                    // 直接送達
  PICKUP_POINT: 'pickup_point',        // 轉運點
  VOLUNTEER_PICKUP: 'volunteer_pickup' // 志工取貨
};

export const DELIVERY_METHOD_LABELS = {
  [DELIVERY_METHODS.DIRECT]: '直接送達',
  [DELIVERY_METHODS.PICKUP_POINT]: '轉運點',
  [DELIVERY_METHODS.VOLUNTEER_PICKUP]: '志工取貨'
};

// Donation Statuses
export const DONATION_STATUSES = {
  PLEDGED: 'pledged',       // 已承諾
  CONFIRMED: 'confirmed',   // 已確認
  IN_TRANSIT: 'in_transit', // 運送中
  DELIVERED: 'delivered',   // 已送達
  CANCELLED: 'cancelled'    // 已取消
};

export const DONATION_STATUS_LABELS = {
  [DONATION_STATUSES.PLEDGED]: '已承諾',
  [DONATION_STATUSES.CONFIRMED]: '已確認',
  [DONATION_STATUSES.IN_TRANSIT]: '運送中',
  [DONATION_STATUSES.DELIVERED]: '已送達',
  [DONATION_STATUSES.CANCELLED]: '已取消'
};

// Donation Status Colors (for UI)
export const DONATION_STATUS_COLORS = {
  [DONATION_STATUSES.PLEDGED]: 'yellow',
  [DONATION_STATUSES.CONFIRMED]: 'blue',
  [DONATION_STATUSES.IN_TRANSIT]: 'purple',
  [DONATION_STATUSES.DELIVERED]: 'green',
  [DONATION_STATUSES.CANCELLED]: 'red'
};

// Supply Categories
export const SUPPLY_CATEGORIES = {
  FOOD: 'food',                   // 食物
  WATER: 'water',                 // 飲用水
  CLOTHING: 'clothing',           // 衣物
  TOOLS: 'tools',                 // 工具
  MEDICAL: 'medical',             // 醫療用品
  HYGIENE: 'hygiene',             // 衛生用品
  SHELTER: 'shelter',             // 住宿用品
  OTHER: 'other'                  // 其他
};

export const SUPPLY_CATEGORY_LABELS = {
  [SUPPLY_CATEGORIES.FOOD]: '食物',
  [SUPPLY_CATEGORIES.WATER]: '飲用水',
  [SUPPLY_CATEGORIES.CLOTHING]: '衣物',
  [SUPPLY_CATEGORIES.TOOLS]: '工具',
  [SUPPLY_CATEGORIES.MEDICAL]: '醫療用品',
  [SUPPLY_CATEGORIES.HYGIENE]: '衛生用品',
  [SUPPLY_CATEGORIES.SHELTER]: '住宿用品',
  [SUPPLY_CATEGORIES.OTHER]: '其他'
};

/**
 * 驗證配送方式是否有效
 * @param {string} method - 配送方式
 * @returns {boolean} 是否為有效的配送方式
 */
export const isValidDeliveryMethod = (method) =>
  Object.values(DELIVERY_METHODS).includes(method);

/**
 * 驗證捐贈狀態是否有效
 * @param {string} status - 捐贈狀態
 * @returns {boolean} 是否為有效的捐贈狀態
 */
export const isValidDonationStatus = (status) =>
  Object.values(DONATION_STATUSES).includes(status);

/**
 * 驗證物資類別是否有效
 * @param {string} category - 物資類別
 * @returns {boolean} 是否為有效的物資類別
 */
export const isValidSupplyCategory = (category) =>
  Object.values(SUPPLY_CATEGORIES).includes(category);

/**
 * 獲取配送方式標籤
 * @param {string} method - 配送方式
 * @returns {string} 配送方式的中文標籤
 */
export const getDeliveryMethodLabel = (method) =>
  DELIVERY_METHOD_LABELS[method] || '未知方式';

/**
 * 獲取捐贈狀態標籤
 * @param {string} status - 捐贈狀態
 * @returns {string} 捐贈狀態的中文標籤
 */
export const getDonationStatusLabel = (status) =>
  DONATION_STATUS_LABELS[status] || '未知狀態';

/**
 * 獲取捐贈狀態顏色
 * @param {string} status - 捐贈狀態
 * @returns {string} 狀態對應的顏色
 */
export const getDonationStatusColor = (status) =>
  DONATION_STATUS_COLORS[status] || 'gray';

/**
 * 獲取物資類別標籤
 * @param {string} category - 物資類別
 * @returns {string} 物資類別的中文標籤
 */
export const getSupplyCategoryLabel = (category) =>
  SUPPLY_CATEGORY_LABELS[category] || '未知類別';

/**
 * 檢查捐贈是否可以取消
 * @param {string} status - 捐贈狀態
 * @returns {boolean} 是否可以取消
 */
export const canCancelDonation = (status) =>
  [DONATION_STATUSES.PLEDGED, DONATION_STATUSES.CONFIRMED].includes(status);

/**
 * 檢查捐贈是否已經完成
 * @param {string} status - 捐贈狀態
 * @returns {boolean} 是否已完成
 */
export const isDonationFinalized = (status) =>
  [DONATION_STATUSES.DELIVERED, DONATION_STATUSES.CANCELLED].includes(status);

/**
 * 獲取下一個可能的捐贈狀態
 * @param {string} currentStatus - 當前狀態
 * @returns {string[]} 可能的下一個狀態列表
 */
export const getNextDonationStatuses = (currentStatus) => {
  const statusFlow = {
    [DONATION_STATUSES.PLEDGED]: [DONATION_STATUSES.CONFIRMED, DONATION_STATUSES.CANCELLED],
    [DONATION_STATUSES.CONFIRMED]: [DONATION_STATUSES.IN_TRANSIT, DONATION_STATUSES.CANCELLED],
    [DONATION_STATUSES.IN_TRANSIT]: [DONATION_STATUSES.DELIVERED],
    [DONATION_STATUSES.DELIVERED]: [],
    [DONATION_STATUSES.CANCELLED]: []
  };

  return statusFlow[currentStatus] || [];
};
