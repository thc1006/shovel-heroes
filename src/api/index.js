/**
 * API 層統一導出
 *
 * 此文件整合所有 API endpoints 並提供統一的導出介面
 * 完全基於 REST API，移除 Base44 SDK 依賴
 */

// 導出配置
export {
  apiConfig,
  API_BASE_URL,
  API_ENDPOINTS,
  API_MODE,
  isFrontendMode,
  isRestMode
} from './config.js';

// 導出 HTTP 客戶端
export { http } from './client.js';

// 導出所有 Entity APIs
export { DisasterArea } from './endpoints/disaster-areas.js';
export { Grid } from './endpoints/grids.js';
export { VolunteerRegistration } from './endpoints/volunteers.js';
export { SupplyDonation } from './endpoints/supplies.js';
export { GridDiscussion } from './endpoints/grid-discussions.js';
export { Announcement } from './endpoints/announcements.js';
export { User } from './endpoints/users.js';

// 導出功能函數
export {
  Functions,
  fixGridBounds,
  exportGridsCSV,
  importGridsCSV,
  getGridTemplate,
  proxyExternalGridAPI,
  proxyExternalVolunteerAPI,
  getVolunteers,
  getUsers,
} from './endpoints/functions.js';

// 導出 Legacy APIs
export { Legacy } from './endpoints/legacy.js';

// 創建便捷的 API 對象（向後兼容）
export const API = {
  DisasterArea: null, // 延遲載入
  Grid: null,
  VolunteerRegistration: null,
  SupplyDonation: null,
  GridDiscussion: null,
  Announcement: null,
  User: null,
  Functions: null,
  Legacy: null,
};

// 動態載入所有 endpoints（避免循環依賴）
import('./endpoints/disaster-areas.js').then(m => { API.DisasterArea = m.DisasterArea; });
import('./endpoints/grids.js').then(m => { API.Grid = m.Grid; });
import('./endpoints/volunteers.js').then(m => { API.VolunteerRegistration = m.VolunteerRegistration; });
import('./endpoints/supplies.js').then(m => { API.SupplyDonation = m.SupplyDonation; });
import('./endpoints/grid-discussions.js').then(m => { API.GridDiscussion = m.GridDiscussion; });
import('./endpoints/announcements.js').then(m => { API.Announcement = m.Announcement; });
import('./endpoints/users.js').then(m => { API.User = m.User; });
import('./endpoints/functions.js').then(m => { API.Functions = m.Functions; });
import('./endpoints/legacy.js').then(m => { API.Legacy = m.Legacy; });

export default API;
