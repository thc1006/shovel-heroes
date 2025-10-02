/**
 * Supply Donations API
 * 物資捐贈相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 物資捐贈 API 對象
 * 提供 CRUD 操作
 */
export const SupplyDonation = {
  /**
   * 獲取所有物資捐贈列表
   * @param {Object} params - 查詢參數
   * @param {string} params.grid_id - 網格 ID（可選）
   * @param {string} params.status - 狀態（可選）
   * @returns {Promise<Array>} 物資捐贈列表
   */
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_ENDPOINTS.supplyDonations}?${queryString}` : API_ENDPOINTS.supplyDonations;
    return http.get(url);
  },

  /**
   * 獲取單個物資捐贈詳情
   * @param {string} id - 捐贈 ID
   * @returns {Promise<Object>} 捐贈詳情
   */
  get: (id) => http.get(API_ENDPOINTS.supplyDonation(id)),

  /**
   * 創建新的物資捐贈記錄
   * @param {Object} data - 捐贈數據
   * @param {string} data.grid_id - 網格 ID
   * @param {string} data.donor_name - 捐贈者姓名
   * @param {string} data.donor_phone - 捐贈者電話
   * @param {string} data.supply_name - 物資名稱
   * @param {number} data.quantity - 數量
   * @param {string} data.unit - 單位
   * @param {string} data.status - 狀態
   * @param {string} data.notes - 備註
   * @returns {Promise<Object>} 創建的捐贈記錄
   */
  create: (data) => http.post(API_ENDPOINTS.supplyDonations, data),

  /**
   * 更新物資捐贈資訊
   * @param {string} id - 捐贈 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的捐贈記錄
   */
  update: (id, data) => http.put(API_ENDPOINTS.supplyDonation(id), data),

  /**
   * 刪除物資捐贈記錄
   * @param {string} id - 捐贈 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.supplyDonation(id)),

  /**
   * 根據條件篩選物資捐贈（別名方法，保持向後兼容）
   * @param {Object} filters - 篩選條件
   * @returns {Promise<Array>} 捐贈列表
   */
  filter: (filters) => SupplyDonation.list(filters),
};

export default SupplyDonation;
