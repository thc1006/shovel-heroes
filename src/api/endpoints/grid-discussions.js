/**
 * Grid Discussions API
 * 網格討論留言相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 網格討論 API 對象
 * 提供留言功能
 */
export const GridDiscussion = {
  /**
   * 獲取所有網格討論列表
   * @param {Object} params - 查詢參數
   * @param {string} params.grid_id - 網格 ID（可選，建議過濾）
   * @returns {Promise<Array>} 討論列表
   */
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_ENDPOINTS.gridDiscussions}?${queryString}` : API_ENDPOINTS.gridDiscussions;
    return http.get(url);
  },

  /**
   * 獲取單個討論詳情
   * @param {string} id - 討論 ID
   * @returns {Promise<Object>} 討論詳情
   */
  get: (id) => http.get(API_ENDPOINTS.gridDiscussion(id)),

  /**
   * 在指定網格張貼留言
   * @param {Object} data - 留言數據
   * @param {string} data.grid_id - 網格 ID
   * @param {string} data.user_id - 使用者 ID
   * @param {string} data.content - 留言內容
   * @returns {Promise<Object>} 創建的留言
   */
  create: (data) => http.post(API_ENDPOINTS.gridDiscussions, data),

  /**
   * 更新討論留言
   * @param {string} id - 討論 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的留言
   */
  update: (id, data) => http.put(API_ENDPOINTS.gridDiscussion(id), data),

  /**
   * 刪除討論留言
   * @param {string} id - 討論 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.gridDiscussion(id)),

  /**
   * 根據條件篩選討論（別名方法，保持向後兼容）
   * @param {Object} filters - 篩選條件
   * @returns {Promise<Array>} 討論列表
   */
  filter: (filters) => GridDiscussion.list(filters),
};

export default GridDiscussion;
