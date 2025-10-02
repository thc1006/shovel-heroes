/**
 * API 配置文件
 *
 * 集中管理所有 API 相關的配置參數
 * 基於環境變數提供靈活的配置
 * 支援雙模式：REST API / 前端 LocalStorage
 */

// 模式判斷
const USE_FRONTEND_MODE = import.meta.env.VITE_USE_FRONTEND === 'true';

// API 基礎 URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

// API 請求超時時間（毫秒）
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// API 版本
export const API_VERSION = 'v1';

// 當前使用模式
export const API_MODE = USE_FRONTEND_MODE ? 'frontend' : 'rest';

// 請求重試配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 秒
  retryOnStatus: [408, 429, 500, 502, 503, 504],
};

// 請求標頭預設值
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

// 是否啟用請求日志
export const ENABLE_REQUEST_LOGGING = import.meta.env.DEV || false;

// 是否啟用錯誤追蹤
export const ENABLE_ERROR_TRACKING = import.meta.env.PROD || false;

// API 端點路徑
export const API_ENDPOINTS = {
  // 災區相關
  disasterAreas: '/disaster-areas',
  disasterArea: (id) => `/disaster-areas/${id}`,

  // 網格相關
  grids: '/grids',
  grid: (id) => `/grids/${id}`,

  // 志工報名相關
  volunteerRegistrations: '/volunteer-registrations',
  volunteerRegistration: (id) => `/volunteer-registrations/${id}`,

  // 物資捐贈相關
  supplyDonations: '/supply-donations',
  supplyDonation: (id) => `/supply-donations/${id}`,

  // 網格討論相關
  gridDiscussions: '/grid-discussions',
  gridDiscussion: (id) => `/grid-discussions/${id}`,

  // 系統公告相關
  announcements: '/announcements',
  announcement: (id) => `/announcements/${id}`,

  // 使用者相關
  users: '/users',
  user: (id) => `/users/${id}`,
  me: '/me',

  // 特殊功能
  functions: {
    csvExport: '/functions/csv-export',
    csvImport: '/functions/csv-import',
    csvTemplate: '/functions/csv-template',
    fixGridBounds: '/functions/fix-grid-bounds',
    gridProxy: '/functions/grid-proxy',
  },

  // Legacy 端點（向後兼容）
  legacy: {
    sync: '/legacy/sync',
    roster: '/legacy/roster',
  },

  // 志工聚合資訊
  volunteers: '/volunteers',
};

// 模式切換輔助函數
export const isFrontendMode = () => USE_FRONTEND_MODE;
export const isRestMode = () => !USE_FRONTEND_MODE;

// 導出配置對象（方便統一導入）
export const apiConfig = {
  mode: API_MODE,
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  version: API_VERSION,
  retry: RETRY_CONFIG,
  headers: DEFAULT_HEADERS,
  logging: ENABLE_REQUEST_LOGGING,
  errorTracking: ENABLE_ERROR_TRACKING,
  endpoints: API_ENDPOINTS,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
};

// 開發模式 logging
if (import.meta.env.DEV) {
  console.log('[API Config]', {
    mode: API_MODE,
    baseURL: API_BASE_URL,
    timeout: `${API_TIMEOUT}ms`,
  });
}

export default apiConfig;
