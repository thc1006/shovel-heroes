/**
 * API Config 測試
 *
 * 測試環境變數讀取、模式判斷、與輔助函數
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('API Config', () => {
  let originalEnv;

  beforeEach(() => {
    // 保存原始環境變數
    originalEnv = { ...import.meta.env };
  });

  afterEach(() => {
    // 恢復原始環境變數
    vi.unstubAllEnvs();
  });

  describe('環境變數讀取', () => {
    it('應該從 VITE_USE_FRONTEND 環境變數讀取模式', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');
      vi.stubEnv('VITE_API_BASE', 'http://localhost:8787');

      // 動態重新載入模組以套用新環境變數
      const config = await import('../../src/api/config.js');

      expect(config.API_MODE).toBe('frontend');
    });

    it('應該從 VITE_API_BASE 讀取 API 基礎 URL', async () => {
      vi.stubEnv('VITE_API_BASE', 'https://api.example.com');

      const config = await import('../../src/api/config.js');

      expect(config.API_BASE_URL).toBe('https://api.example.com');
    });

    it('應該從 VITE_API_TIMEOUT 讀取超時時間', async () => {
      vi.stubEnv('VITE_API_TIMEOUT', '60000');

      const config = await import('../../src/api/config.js');

      expect(config.API_TIMEOUT).toBe(60000);
    });
  });

  describe('模式判斷邏輯', () => {
    it('當 VITE_USE_FRONTEND=true 時應該使用 frontend 模式', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');

      const config = await import('../../src/api/config.js');

      expect(config.API_MODE).toBe('frontend');
      expect(config.isFrontendMode()).toBe(true);
      expect(config.isRestMode()).toBe(false);
    });

    it('當 VITE_USE_FRONTEND=false 時應該使用 rest 模式', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'false');

      const config = await import('../../src/api/config.js');

      expect(config.API_MODE).toBe('rest');
      expect(config.isFrontendMode()).toBe(false);
      expect(config.isRestMode()).toBe(true);
    });

    it('當 VITE_USE_FRONTEND 未設定時應該預設為 rest 模式', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', undefined);

      const config = await import('../../src/api/config.js');

      expect(config.API_MODE).toBe('rest');
      expect(config.isFrontendMode()).toBe(false);
      expect(config.isRestMode()).toBe(true);
    });
  });

  describe('API_BASE_URL fallback', () => {
    it('當 VITE_API_BASE 未設定時應該使用預設值', async () => {
      vi.stubEnv('VITE_API_BASE', undefined);

      const config = await import('../../src/api/config.js');

      expect(config.API_BASE_URL).toBe('http://localhost:8787');
    });

    it('當 VITE_API_BASE 設定為空字串時應該使用預設值', async () => {
      vi.stubEnv('VITE_API_BASE', '');

      const config = await import('../../src/api/config.js');

      expect(config.API_BASE_URL).toBe('http://localhost:8787');
    });
  });

  describe('Timeout 預設值', () => {
    it('當 VITE_API_TIMEOUT 未設定時應該使用預設值 30000', async () => {
      vi.stubEnv('VITE_API_TIMEOUT', undefined);

      const config = await import('../../src/api/config.js');

      expect(config.API_TIMEOUT).toBe(30000);
    });

    it('當 VITE_API_TIMEOUT 為無效數字時應該使用預設值', async () => {
      vi.stubEnv('VITE_API_TIMEOUT', 'invalid');

      const config = await import('../../src/api/config.js');

      expect(config.API_TIMEOUT).toBe(30000);
    });

    it('應該正確轉換字串數字為數值', async () => {
      vi.stubEnv('VITE_API_TIMEOUT', '45000');

      const config = await import('../../src/api/config.js');

      expect(config.API_TIMEOUT).toBe(45000);
      expect(typeof config.API_TIMEOUT).toBe('number');
    });
  });

  describe('輔助函數', () => {
    it('isFrontendMode() 在 frontend 模式下應該返回 true', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');

      const config = await import('../../src/api/config.js');

      expect(config.isFrontendMode()).toBe(true);
    });

    it('isFrontendMode() 在 rest 模式下應該返回 false', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'false');

      const config = await import('../../src/api/config.js');

      expect(config.isFrontendMode()).toBe(false);
    });

    it('isRestMode() 在 rest 模式下應該返回 true', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'false');

      const config = await import('../../src/api/config.js');

      expect(config.isRestMode()).toBe(true);
    });

    it('isRestMode() 在 frontend 模式下應該返回 false', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');

      const config = await import('../../src/api/config.js');

      expect(config.isRestMode()).toBe(false);
    });

    it('isFrontendMode() 和 isRestMode() 應該互斥', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');

      const config = await import('../../src/api/config.js');

      expect(config.isFrontendMode()).toBe(!config.isRestMode());
    });
  });

  describe('apiConfig 對象', () => {
    it('應該包含所有必要的配置屬性', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');
      vi.stubEnv('VITE_API_BASE', 'http://localhost:8787');

      const config = await import('../../src/api/config.js');

      expect(config.apiConfig).toHaveProperty('mode');
      expect(config.apiConfig).toHaveProperty('baseURL');
      expect(config.apiConfig).toHaveProperty('timeout');
      expect(config.apiConfig).toHaveProperty('version');
      expect(config.apiConfig).toHaveProperty('retry');
      expect(config.apiConfig).toHaveProperty('headers');
      expect(config.apiConfig).toHaveProperty('logging');
      expect(config.apiConfig).toHaveProperty('errorTracking');
      expect(config.apiConfig).toHaveProperty('endpoints');
      expect(config.apiConfig).toHaveProperty('isDev');
      expect(config.apiConfig).toHaveProperty('isProd');
    });

    it('mode 屬性應該反映當前模式', async () => {
      vi.stubEnv('VITE_USE_FRONTEND', 'true');

      const config = await import('../../src/api/config.js');

      expect(config.apiConfig.mode).toBe('frontend');
    });

    it('應該正確設定開發/生產環境標誌', async () => {
      const config = await import('../../src/api/config.js');

      expect(typeof config.apiConfig.isDev).toBe('boolean');
      expect(typeof config.apiConfig.isProd).toBe('boolean');
    });
  });

  describe('環境特定配置', () => {
    it('開發環境應該啟用請求日誌', async () => {
      vi.stubEnv('DEV', true);

      const config = await import('../../src/api/config.js');

      expect(config.ENABLE_REQUEST_LOGGING).toBe(true);
    });

    it('生產環境應該啟用錯誤追蹤', async () => {
      vi.stubEnv('PROD', true);

      const config = await import('../../src/api/config.js');

      expect(config.ENABLE_ERROR_TRACKING).toBe(true);
    });
  });

  describe('API 端點配置', () => {
    it('應該包含所有必要的端點', async () => {
      const config = await import('../../src/api/config.js');

      expect(config.API_ENDPOINTS).toHaveProperty('disasterAreas');
      expect(config.API_ENDPOINTS).toHaveProperty('grids');
      expect(config.API_ENDPOINTS).toHaveProperty('volunteerRegistrations');
      expect(config.API_ENDPOINTS).toHaveProperty('supplyDonations');
      expect(config.API_ENDPOINTS).toHaveProperty('gridDiscussions');
      expect(config.API_ENDPOINTS).toHaveProperty('announcements');
      expect(config.API_ENDPOINTS).toHaveProperty('users');
      expect(config.API_ENDPOINTS).toHaveProperty('functions');
      expect(config.API_ENDPOINTS).toHaveProperty('legacy');
      expect(config.API_ENDPOINTS).toHaveProperty('volunteers');
    });

    it('動態端點函數應該正確生成路徑', async () => {
      const config = await import('../../src/api/config.js');

      expect(config.API_ENDPOINTS.disasterArea('123')).toBe('/disaster-areas/123');
      expect(config.API_ENDPOINTS.grid('abc')).toBe('/grids/abc');
      expect(config.API_ENDPOINTS.user('user-1')).toBe('/users/user-1');
    });
  });
});
