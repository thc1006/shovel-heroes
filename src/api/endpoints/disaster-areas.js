/**
 * Disaster Areas API
 * 災區相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 災區 API 對象
 * 提供 CRUD 操作
 */
export const DisasterArea = {
  /**
   * 獲取所有災區列表
   * @returns {Promise<Array>} 災區列表
   */
  list: () => http.get(API_ENDPOINTS.disasterAreas),

  /**
   * 獲取單個災區詳情
   * @param {string} id - 災區 ID
   * @returns {Promise<Object>} 災區詳情
   */
  get: (id) => http.get(API_ENDPOINTS.disasterArea(id)),

  /**
   * 創建新災區
   * @param {Object} data - 災區數據
   * @param {string} data.name - 災區名稱
   * @param {string} data.county - 縣市
   * @param {string} data.township - 鄉鎮
   * @param {number} data.center_lat - 中心緯度
   * @param {number} data.center_lng - 中心經度
   * @param {string} data.description - 描述
   * @param {string} data.status - 狀態
   * @returns {Promise<Object>} 創建的災區
   */
  create: (data) => http.post(API_ENDPOINTS.disasterAreas, data),

  /**
   * 更新災區資訊
   * @param {string} id - 災區 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的災區
   */
  update: (id, data) => http.put(API_ENDPOINTS.disasterArea(id), data),

  /**
   * 刪除災區
   * @param {string} id - 災區 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.disasterArea(id)),
};

export default DisasterArea;
