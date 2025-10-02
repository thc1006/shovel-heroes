/**
 * Users API
 * 使用者與登入資訊相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 使用者 API 對象
 * 提供使用者管理功能
 */
export const User = {
  /**
   * 獲取所有使用者列表（需權限）
   * @returns {Promise<Array>} 使用者列表
   */
  list: () => http.get(API_ENDPOINTS.users),

  /**
   * 獲取單個使用者詳情
   * @param {string} id - 使用者 ID
   * @returns {Promise<Object>} 使用者詳情
   */
  get: (id) => http.get(API_ENDPOINTS.user(id)),

  /**
   * 獲取當前登入使用者資訊
   * @returns {Promise<Object>} 當前使用者
   */
  me: () => http.get(API_ENDPOINTS.me),

  /**
   * 創建新使用者
   * @param {Object} data - 使用者數據
   * @param {string} data.name - 顯示名稱
   * @param {string} data.email - 電子郵件
   * @param {string} data.password - 密碼
   * @param {string} data.role - 角色
   * @returns {Promise<Object>} 創建的使用者
   */
  create: (data) => http.post(API_ENDPOINTS.users, data),

  /**
   * 更新使用者資訊
   * @param {string} id - 使用者 ID
   * @param {Object} data - 更新的數據
   * @returns {Promise<Object>} 更新後的使用者
   */
  update: (id, data) => http.put(API_ENDPOINTS.user(id), data),

  /**
   * 刪除使用者
   * @param {string} id - 使用者 ID
   * @returns {Promise<void>}
   */
  delete: (id) => http.delete(API_ENDPOINTS.user(id)),

  /**
   * 登入（暫時占位，實際可能需要不同的端點）
   * @param {Object} credentials - 登入憑證
   * @param {string} credentials.email - 電子郵件
   * @param {string} credentials.password - 密碼
   * @returns {Promise<Object>} 登入回應（含 token）
   */
  login: (credentials) => http.post('/auth/login', credentials),

  /**
   * 登出（暫時占位）
   * @returns {Promise<void>}
   */
  logout: () => http.post('/auth/logout'),

  /**
   * 註冊（暫時占位）
   * @param {Object} userData - 註冊數據
   * @returns {Promise<Object>} 註冊回應
   */
  register: (userData) => http.post('/auth/register', userData),
};

export default User;
