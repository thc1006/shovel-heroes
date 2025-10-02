/**
 * Announcements API
 * 系統公告相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 公告 API 對象
 * 提供 CRUD 操作
 */
export const Announcement = {
  /**
   * 獲取所有公告列表
   * @param {Object} params - 查詢參數
   * @param {string} params.sort - 排序方式（可選）
   * @param {number} params.limit - 限制數量（可選）
   * @returns {Promise<Array>} 公告列表
   */
  list: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${API_ENDPOINTS.announcements}?${queryString}` : API_ENDPOINTS.announcements;
    return http.get(url);
  },

  /**
   * 獲取單個公告詳情
   * @param {string} id - 公告 ID
   * @returns {Promise<Object>} 公告詳情
   */
  get: (id) => http.get(API_ENDPOINTS.announcement(id)),

  /**
   * 創建新公告
   * @param {Object} data - 公告數據
   * @param {string} data.title - 公告標題
   * @param {string} data.body - 公告內容 (支援 Markdown)
   * @param {string} data.priority - 優先級（可選）
   * @returns {Promise<Object>} 創建的公告
   */
  create: (data) => http.post(API_ENDPOINTS.announcements, data),

  /**
   * 更新公告資訊
   * @param {string} id - 公告 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的公告
   */
  update: (id, data) => http.put(API_ENDPOINTS.announcement(id), data),

  /**
   * 刪除公告
   * @param {string} id - 公告 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.announcement(id)),
};

export default Announcement;
