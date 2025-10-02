/**
 * Grids API
 * 網格/任務相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 網格 API 對象
 * 提供 CRUD 操作
 */
export const Grid = {
  /**
   * 獲取所有網格列表
   * @param {Object} params - 查詢參數
   * @param {string} params.disaster_area_id - 災區 ID（可選）
   * @param {string} params.grid_type - 網格類型（可選）
   * @param {string} params.status - 狀態（可選）
   * @returns {Promise<Array>} 網格列表
   */
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_ENDPOINTS.grids}?${queryString}` : API_ENDPOINTS.grids;
    return http.get(url);
  },

  /**
   * 獲取單個網格詳情
   * @param {string} id - 網格 ID
   * @returns {Promise<Object>} 網格詳情
   */
  get: (id) => http.get(API_ENDPOINTS.grid(id)),

  /**
   * 創建新網格
   * @param {Object} data - 網格數據
   * @param {string} data.code - 網格代碼
   * @param {string} data.grid_type - 網格類型
   * @param {string} data.disaster_area_id - 災區 ID
   * @param {number} data.center_lat - 中心緯度
   * @param {number} data.center_lng - 中心經度
   * @param {Object} data.bounds - 邊界
   * @param {number} data.volunteer_needed - 需要志工數
   * @param {string} data.meeting_point - 集合地點
   * @param {string} data.contact_info - 聯絡資訊
   * @param {Array} data.supplies_needed - 所需物資
   * @param {string} data.status - 狀態
   * @returns {Promise<Object>} 創建的網格
   */
  create: (data) => http.post(API_ENDPOINTS.grids, data),

  /**
   * 更新網格資訊
   * @param {string} id - 網格 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的網格
   */
  update: (id, data) => http.put(API_ENDPOINTS.grid(id), data),

  /**
   * 刪除網格
   * @param {string} id - 網格 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.grid(id)),

  /**
   * 根據條件篩選網格（別名方法，保持向後兼容）
   * @param {Object} filters - 篩選條件
   * @returns {Promise<Array>} 網格列表
   */
  filter: (filters) => Grid.list(filters),
};

export default Grid;
