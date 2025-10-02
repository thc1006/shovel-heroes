/**
 * Functions API
 * 匯入匯出 / 後端批次或延伸功能相關 API 端點
 */

import { http } from '../client.js';
import { API_ENDPOINTS } from '../config.js';

/**
 * 功能 API 對象
 * 提供各種特殊功能操作
 */

/**
 * 批次修正網格邊界（僅管理維運）
 * @returns {Promise<Object>} 修正結果 { message, totalGrids, updatedCount }
 */
export const fixGridBounds = () =>
  http.post(API_ENDPOINTS.functions.fixGridBounds);

/**
 * 匯出所有網格資料為 CSV 檔
 * @returns {Promise<string>} CSV 內容
 */
export const exportGridsCSV = () =>
  http.get(API_ENDPOINTS.functions.csvExport);

/**
 * 從 CSV 內容匯入 / 更新網格
 * @param {string} csvContent - CSV 內容
 * @returns {Promise<Object>} 匯入結果
 */
export const importGridsCSV = (csvContent) =>
  http.post(API_ENDPOINTS.functions.csvImport, { csv: csvContent });

/**
 * 下載空白網格匯入範本 CSV
 * @returns {Promise<string>} CSV 範本內容
 */
export const getGridTemplate = () =>
  http.get(API_ENDPOINTS.functions.csvTemplate);

/**
 * 代理對外部網格系統的呼叫
 * @param {Object} requestData - 請求數據
 * @returns {Promise<Object>} 代理回應
 */
export const proxyExternalGridAPI = (requestData) =>
  http.post(API_ENDPOINTS.functions.gridProxy, requestData);

/**
 * 代理對外部志工系統的呼叫
 * @param {Object} requestData - 請求數據
 * @returns {Promise<Object>} 代理回應
 */
export const proxyExternalVolunteerAPI = (requestData) =>
  http.post('/functions/external-volunteer-api', requestData);

/**
 * 獲取志工聚合資訊（整合報名與使用者呈現所需欄位）
 * 回傳封裝含 data 與 can_view_phone 供前端判斷是否顯示電話
 * @param {Object} params - 查詢參數
 * @param {string} params.grid_id - 過濾指定網格的志工（可選）
 * @param {string} params.status - 過濾指定狀態（可選）
 * @param {boolean} params.include_counts - 是否回傳狀態統計（可選）
 * @param {number} params.limit - 單頁筆數（可選）
 * @param {number} params.offset - 起始位移（可選）
 * @returns {Promise<Object>} 志工列表回應 { data, can_view_phone, total, status_counts, page, limit }
 */
export const getVolunteers = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${API_ENDPOINTS.volunteers}?${queryString}` : API_ENDPOINTS.volunteers;
  return http.get(url);
};

/**
 * 獲取使用者列表（安全封裝，已處理權限）
 * @returns {Promise<Object>} 使用者列表回應 { data }
 */
export const getUsers = () =>
  http.get(API_ENDPOINTS.users).then(data => ({ data: { data } }));

// 導出所有功能函數
export const Functions = {
  fixGridBounds,
  exportGridsCSV,
  importGridsCSV,
  getGridTemplate,
  proxyExternalGridAPI,
  proxyExternalVolunteerAPI,
  getVolunteers,
  getUsers,
};

export default Functions;
