/**
 * Volunteer Registrations API
 * 志工報名相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 志工報名 API 對象
 * 提供 CRUD 操作
 */
export const VolunteerRegistration = {
  /**
   * 獲取所有志工報名列表
   * @param {Object} params - 查詢參數
   * @param {string} params.grid_id - 網格 ID（可選）
   * @param {string} params.status - 狀態（可選）
   * @returns {Promise<Array>} 志工報名列表
   */
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_ENDPOINTS.volunteerRegistrations}?${queryString}` : API_ENDPOINTS.volunteerRegistrations;
    return http.get(url);
  },

  /**
   * 獲取單個志工報名詳情
   * @param {string} id - 報名 ID
   * @returns {Promise<Object>} 報名詳情
   */
  get: (id) => http.get(API_ENDPOINTS.volunteerRegistration(id)),

  /**
   * 創建新的志工報名
   * @param {Object} data - 報名數據
   * @param {string} data.grid_id - 網格 ID
   * @param {string} data.volunteer_name - 志工姓名
   * @param {string} data.volunteer_phone - 志工電話
   * @param {string} data.available_time - 可服務時間
   * @param {Array} data.skills - 專業技能
   * @param {Array} data.equipment - 攜帶工具
   * @param {string} data.notes - 備註
   * @returns {Promise<Object>} 創建的報名記錄
   */
  create: (data) => http.post(API_ENDPOINTS.volunteerRegistrations, data),

  /**
   * 更新志工報名資訊
   * @param {string} id - 報名 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的報名記錄
   */
  update: (id, data) => http.put(API_ENDPOINTS.volunteerRegistration(id), data),

  /**
   * 刪除志工報名
   * @param {string} id - 報名 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.volunteerRegistration(id)),

  /**
   * 根據條件篩選志工報名（別名方法，保持向後兼容）
   * @param {Object} filters - 篩選條件
   * @returns {Promise<Array>} 報名列表
   */
  filter: (filters) => VolunteerRegistration.list(filters),
};

export default VolunteerRegistration;
