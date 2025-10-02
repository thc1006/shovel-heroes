/**
 * Mock Fetch Utility for Testing
 * 提供 chain 式 API 模擬 HTTP 請求
 */

class MockFetchBuilder {
  constructor() {
    this.routes = new Map();
    this.defaultDelay = 0;
  }

  /**
   * 設定 GET 請求的模擬回應
   * @param {string} path - API 路徑
   * @param {Object} response - 回應資料
   * @param {number} status - HTTP 狀態碼 (預設 200)
   * @param {number} delay - 延遲毫秒數 (預設 0)
   */
  mockGet(path, response, status = 200, delay = 0) {
    this.routes.set(`GET:${path}`, { response, status, delay });
    return this;
  }

  /**
   * 設定 POST 請求的模擬回應
   */
  mockPost(path, response, status = 201, delay = 0) {
    this.routes.set(`POST:${path}`, { response, status, delay });
    return this;
  }

  /**
   * 設定 PUT 請求的模擬回應
   */
  mockPut(path, response, status = 200, delay = 0) {
    this.routes.set(`PUT:${path}`, { response, status, delay });
    return this;
  }

  /**
   * 設定 DELETE 請求的模擬回應
   */
  mockDelete(path, response, status = 204, delay = 0) {
    this.routes.set(`DELETE:${path}`, { response, status, delay });
    return this;
  }

  /**
   * 設定 PATCH 請求的模擬回應
   */
  mockPatch(path, response, status = 200, delay = 0) {
    this.routes.set(`PATCH:${path}`, { response, status, delay });
    return this;
  }

  /**
   * 設定全域延遲
   */
  withDelay(milliseconds) {
    this.defaultDelay = milliseconds;
    return this;
  }

  /**
   * 模擬錯誤回應
   */
  mockError(method, path, status = 500, message = 'Internal Server Error') {
    this.routes.set(`${method}:${path}`, {
      response: { message, code: 'ERROR' },
      status,
      delay: 0
    });
    return this;
  }

  /**
   * 建立 fetch mock 函數
   */
  build() {
    return async (url, options = {}) => {
      const method = (options.method || 'GET').toUpperCase();

      // 解析 URL 路徑
      let path;
      try {
        const urlObj = new URL(url);
        path = urlObj.pathname + urlObj.search;
      } catch {
        path = url;
      }

      // 支援 URL 參數匹配
      const key = `${method}:${path}`;
      let mockData = this.routes.get(key);

      // 如果找不到精確匹配，嘗試使用正則匹配
      if (!mockData) {
        for (const [routeKey, data] of this.routes) {
          const [routeMethod, routePath] = routeKey.split(':');
          if (routeMethod === method && this._matchPath(path, routePath)) {
            mockData = data;
            break;
          }
        }
      }

      if (!mockData) {
        return {
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ message: 'Mock route not found', path, method }),
          text: async () => 'Mock route not found',
          headers: new Map()
        };
      }

      const { response, status, delay } = mockData;
      const actualDelay = delay || this.defaultDelay;

      // 模擬延遲
      if (actualDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, actualDelay));
      }

      // 建立模擬 Response 物件
      const mockResponse = {
        ok: status >= 200 && status < 300,
        status,
        statusText: this._getStatusText(status),
        headers: new Map([
          ['Content-Type', 'application/json'],
          ...(status === 429 ? [['Retry-After', '60']] : [])
        ]),
        json: async () => response,
        text: async () => JSON.stringify(response),
        blob: async () => new Blob([JSON.stringify(response)]),
        arrayBuffer: async () => new TextEncoder().encode(JSON.stringify(response)).buffer,
        clone: () => mockResponse
      };

      return mockResponse;
    };
  }

  /**
   * 路徑匹配 (支援簡單的動態參數)
   */
  _matchPath(actualPath, routePath) {
    // 移除 query string
    const cleanActual = actualPath.split('?')[0];
    const cleanRoute = routePath.split('?')[0];

    // 精確匹配
    if (cleanActual === cleanRoute) return true;

    // 動態參數匹配 (例如 /grids/:id)
    const routeParts = cleanRoute.split('/');
    const actualParts = cleanActual.split('/');

    if (routeParts.length !== actualParts.length) return false;

    return routeParts.every((part, i) => {
      return part.startsWith(':') || part === actualParts[i];
    });
  }

  /**
   * 取得 HTTP 狀態文字
   */
  _getStatusText(status) {
    const statusTexts = {
      200: 'OK',
      201: 'Created',
      204: 'No Content',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error'
    };
    return statusTexts[status] || 'Unknown';
  }

  /**
   * 重置所有模擬路由
   */
  reset() {
    this.routes.clear();
    this.defaultDelay = 0;
    return this;
  }

  /**
   * 取得已註冊的路由列表 (用於除錯)
   */
  getRoutes() {
    return Array.from(this.routes.keys());
  }
}

/**
 * 建立 Mock Fetch 實例
 * @returns {MockFetchBuilder}
 */
export function createMockFetch() {
  return new MockFetchBuilder();
}

/**
 * 快速建立常用的 API mock
 */
export function createQuickMock() {
  return createMockFetch()
    .mockGet('/disaster-areas', [])
    .mockGet('/grids', [])
    .mockGet('/volunteers', { data: [], can_view_phone: false, total: 0, status_counts: {} })
    .mockGet('/supply-donations', [])
    .mockGet('/announcements', []);
}

/**
 * 建立含授權錯誤的 mock
 */
export function createAuthErrorMock() {
  return createMockFetch()
    .mockError('POST', '/disaster-areas', 401, 'Unauthorized')
    .mockError('POST', '/grids', 403, 'Forbidden')
    .mockError('DELETE', '/grids/:id', 403, 'Forbidden');
}

/**
 * 建立含網路錯誤的 mock
 */
export function createNetworkErrorMock() {
  const builder = createMockFetch();
  const originalBuild = builder.build.bind(builder);

  builder.build = () => {
    return async () => {
      throw new Error('Network request failed');
    };
  };

  return builder;
}

export default { createMockFetch, createQuickMock, createAuthErrorMock, createNetworkErrorMock };
