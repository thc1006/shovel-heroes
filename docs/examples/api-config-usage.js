/**
 * API Config 使用範例
 *
 * 展示如何使用新的模式切換功能
 */

import {
  API_MODE,
  isFrontendMode,
  isRestMode,
  apiConfig
} from '@/api';

// ============================================
// 範例 1: 檢查當前模式
// ============================================

console.log('當前 API 模式:', API_MODE); // 'frontend' 或 'rest'

if (isFrontendMode()) {
  console.log('✅ 使用前端 LocalStorage 模式');
  // 在這裡實作 LocalStorage 邏輯
} else {
  console.log('✅ 使用 REST API 模式');
  // 在這裡實作 HTTP 請求邏輯
}

// ============================================
// 範例 2: 條件式 API 呼叫
// ============================================

async function fetchData() {
  if (isFrontendMode()) {
    // 前端模式：從 LocalStorage 讀取
    const data = localStorage.getItem('app_data');
    return JSON.parse(data || '[]');
  } else {
    // REST 模式：從後端 API 讀取
    const response = await fetch(`${apiConfig.baseURL}/api/data`, {
      headers: apiConfig.headers,
      timeout: apiConfig.timeout,
    });
    return response.json();
  }
}

// ============================================
// 範例 3: 根據模式選擇不同的儲存策略
// ============================================

class DataStore {
  constructor() {
    this.mode = API_MODE;
  }

  async save(key, value) {
    if (isFrontendMode()) {
      // LocalStorage 模式
      localStorage.setItem(key, JSON.stringify(value));
      console.log(`[Frontend] 已儲存至 LocalStorage: ${key}`);
    } else {
      // REST API 模式
      const response = await fetch(`${apiConfig.baseURL}/api/save`, {
        method: 'POST',
        headers: apiConfig.headers,
        body: JSON.stringify({ key, value }),
      });
      console.log(`[REST] 已儲存至後端: ${key}`);
      return response.json();
    }
  }

  async load(key) {
    if (isFrontendMode()) {
      // LocalStorage 模式
      const data = localStorage.getItem(key);
      return JSON.parse(data || 'null');
    } else {
      // REST API 模式
      const response = await fetch(`${apiConfig.baseURL}/api/load/${key}`);
      return response.json();
    }
  }
}

// ============================================
// 範例 4: 使用 apiConfig 物件
// ============================================

console.log('完整配置:', {
  mode: apiConfig.mode,
  baseURL: apiConfig.baseURL,
  timeout: apiConfig.timeout,
  isDev: apiConfig.isDev,
  isProd: apiConfig.isProd,
});

// ============================================
// 範例 5: React 元件中使用
// ============================================

import React, { useEffect, useState } from 'react';

function DataComponent() {
  const [data, setData] = useState([]);
  const [mode, setMode] = useState(API_MODE);

  useEffect(() => {
    async function loadData() {
      if (isFrontendMode()) {
        // 前端模式
        const localData = localStorage.getItem('items');
        setData(JSON.parse(localData || '[]'));
      } else {
        // REST 模式
        const response = await fetch(`${apiConfig.baseURL}/api/items`);
        const items = await response.json();
        setData(items);
      }
    }

    loadData();
  }, []);

  return (
    <div>
      <div className="mb-4 p-4 bg-blue-100 rounded">
        <p className="font-bold">當前模式: {mode}</p>
        <p className="text-sm text-gray-600">
          {isFrontendMode()
            ? '使用 LocalStorage 本地儲存'
            : `連接至 ${apiConfig.baseURL}`
          }
        </p>
      </div>

      <ul>
        {data.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}

// ============================================
// 範例 6: 環境變數配置說明
// ============================================

/*
在 .env.local 檔案中設定：

# 前端 LocalStorage 模式
VITE_USE_FRONTEND=true

# REST API 模式
VITE_USE_FRONTEND=false
VITE_API_BASE=http://localhost:8787
VITE_API_TIMEOUT=30000

# 生產環境
VITE_USE_FRONTEND=false
VITE_API_BASE=https://api.example.com
VITE_API_TIMEOUT=60000
*/

// ============================================
// 範例 7: 模式切換工具函數
// ============================================

export function createApiClient() {
  return {
    mode: API_MODE,

    async get(endpoint) {
      if (isFrontendMode()) {
        const key = `cache_${endpoint}`;
        return JSON.parse(localStorage.getItem(key) || 'null');
      } else {
        const response = await fetch(`${apiConfig.baseURL}${endpoint}`);
        return response.json();
      }
    },

    async post(endpoint, data) {
      if (isFrontendMode()) {
        const key = `cache_${endpoint}`;
        localStorage.setItem(key, JSON.stringify(data));
        return data;
      } else {
        const response = await fetch(`${apiConfig.baseURL}${endpoint}`, {
          method: 'POST',
          headers: apiConfig.headers,
          body: JSON.stringify(data),
        });
        return response.json();
      }
    },

    isFrontend: isFrontendMode,
    isRest: isRestMode,
  };
}

// 使用範例
const api = createApiClient();

if (api.isFrontend()) {
  console.log('✅ 前端模式已啟用');
} else {
  console.log('✅ REST API 模式已啟用，連接至:', apiConfig.baseURL);
}

// ============================================
// 範例 8: 測試用模擬函數
// ============================================

export function mockApiMode(useFrontend = true) {
  // 在測試中使用，暫時覆寫模式檢查
  const originalMode = API_MODE;

  return {
    restore: () => {
      // 恢復原始模式
      console.log('已恢復原始模式:', originalMode);
    },
    currentMode: useFrontend ? 'frontend' : 'rest',
  };
}

// ============================================
// 範例 9: 錯誤處理
// ============================================

async function safeApiCall(endpoint) {
  try {
    if (isFrontendMode()) {
      const data = localStorage.getItem(endpoint);
      if (!data) {
        throw new Error('本地資料不存在');
      }
      return JSON.parse(data);
    } else {
      const response = await fetch(`${apiConfig.baseURL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP 錯誤: ${response.status}`);
      }
      return response.json();
    }
  } catch (error) {
    console.error(`[${API_MODE}] API 呼叫失敗:`, error);
    throw error;
  }
}

// ============================================
// 範例 10: 效能監控
// ============================================

async function monitoredApiCall(endpoint) {
  const startTime = performance.now();

  try {
    const result = await (isFrontendMode()
      ? fetchFromLocalStorage(endpoint)
      : fetchFromRestApi(endpoint)
    );

    const duration = performance.now() - startTime;
    console.log(`[${API_MODE}] ${endpoint} 完成於 ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[${API_MODE}] ${endpoint} 失敗於 ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

function fetchFromLocalStorage(key) {
  return Promise.resolve(
    JSON.parse(localStorage.getItem(key) || 'null')
  );
}

async function fetchFromRestApi(endpoint) {
  const response = await fetch(`${apiConfig.baseURL}${endpoint}`);
  return response.json();
}
