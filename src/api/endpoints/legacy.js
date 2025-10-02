/**
 * Legacy API
 * 與舊系統資料同步的 v2 相容端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * Legacy API 對象
 * 提供與舊版系統的相容介面
 */
export const Legacy = {
  /**
   * 與舊版系統同步資料（可能為非同步背景作業）
   * @param {Object} syncOptions - 同步選項（可選）
   * @returns {Promise<Object>} 同步結果 { status, message }
   */
  sync: (syncOptions = {}) =>
    http.post(API_ENDPOINTS.legacy.sync, syncOptions),

  /**
   * 取得舊系統格式之 roster 資料
   * @returns {Promise<Object>} Roster 數據
   */
  getRoster: () =>
    http.get(API_ENDPOINTS.legacy.roster),
};

export default Legacy;
