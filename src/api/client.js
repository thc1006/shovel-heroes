/**
 * HTTP Client
 *
 * 基於 fetch API 的輕量級 HTTP 客戶端
 * 取代原 Base44 SDK，提供統一的 API 請求介面
 */

import { API_BASE_URL, DEFAULT_HEADERS, API_TIMEOUT, ENABLE_REQUEST_LOGGING } from './config.js';

/**
 * 通用請求函數
 * @param {string} path - API 路徑
 * @param {Object} options - 請求選項
 * @param {string} options.method - HTTP 方法
 * @param {Object} options.headers - 請求標頭
 * @param {any} options.body - 請求主體
 * @param {number} options.timeout - 超時時間
 * @returns {Promise<any>} API 響應數據
 */
async function request(path, {
  method = 'GET',
  headers = {},
  body,
  timeout = API_TIMEOUT,
} = {}) {
  const url = `${API_BASE_URL}${path}`;
  const requestHeaders = { ...DEFAULT_HEADERS, ...headers };

  // 構建請求選項
  const options = {
    method,
    headers: requestHeaders,
  };

  // 添加請求主體（如果有）
  if (body !== undefined) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // 日志記錄（開發環境）
  if (ENABLE_REQUEST_LOGGING) {
    console.log(`[API] ${method} ${path}`, body);
  }

  try {
    // 創建超時控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    options.signal = controller.signal;

    // 發送請求
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    // 處理錯誤響應
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(`API ${method} ${path} failed with status ${response.status}`);
      error.status = response.status;
      error.statusText = response.statusText;
      error.body = errorText;

      if (ENABLE_REQUEST_LOGGING) {
        console.error('[API Error]', error);
      }

      throw error;
    }

    // 解析響應
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();

      if (ENABLE_REQUEST_LOGGING) {
        console.log(`[API Response] ${method} ${path}`, data);
      }

      return data;
    }

    // 非 JSON 響應返回文本
    return await response.text();

  } catch (error) {
    // 處理網絡錯誤或超時
    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`);
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    if (ENABLE_REQUEST_LOGGING) {
      console.error('[API Network Error]', error);
    }

    throw error;
  }
}

/**
 * HTTP 方法快捷方式
 */
export const http = {
  /**
   * GET 請求
   * @param {string} path - API 路徑
   * @param {Object} options - 請求選項
   */
  get: (path, options = {}) =>
    request(path, { ...options, method: 'GET' }),

  /**
   * POST 請求
   * @param {string} path - API 路徑
   * @param {any} body - 請求主體
   * @param {Object} options - 請求選項
   */
  post: (path, body, options = {}) =>
    request(path, { ...options, method: 'POST', body }),

  /**
   * PUT 請求
   * @param {string} path - API 路徑
   * @param {any} body - 請求主體
   * @param {Object} options - 請求選項
   */
  put: (path, body, options = {}) =>
    request(path, { ...options, method: 'PUT', body }),

  /**
   * PATCH 請求
   * @param {string} path - API 路徑
   * @param {any} body - 請求主體
   * @param {Object} options - 請求選項
   */
  patch: (path, body, options = {}) =>
    request(path, { ...options, method: 'PATCH', body }),

  /**
   * DELETE 請求
   * @param {string} path - API 路徑
   * @param {Object} options - 請求選項
   */
  delete: (path, options = {}) =>
    request(path, { ...options, method: 'DELETE' }),
};

export default http;
