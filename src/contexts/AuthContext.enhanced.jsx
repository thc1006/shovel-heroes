/**
 * Enhanced HTTP Client with Auth Integration
 *
 * This file provides an enhanced version of the http client that automatically
 * includes authentication headers. Import this instead of the base client
 * when making authenticated requests.
 */

import { http as baseHttp } from '../api/client.js';

/**
 * Global auth token storage
 * This is updated by AuthContext when tokens change
 */
let globalAccessToken = null;

/**
 * Set the global access token
 * Called by AuthContext when token updates
 */
export function setGlobalAccessToken(token) {
  globalAccessToken = token;
}

/**
 * Enhanced HTTP client with automatic auth header injection
 */
export const authenticatedHttp = {
  /**
   * GET request with auth
   */
  get: (path, options = {}) => {
    const headers = {
      ...options.headers,
      ...(globalAccessToken ? { 'Authorization': `Bearer ${globalAccessToken}` } : {}),
    };
    return baseHttp.get(path, { ...options, headers });
  },

  /**
   * POST request with auth
   */
  post: (path, body, options = {}) => {
    const headers = {
      ...options.headers,
      ...(globalAccessToken ? { 'Authorization': `Bearer ${globalAccessToken}` } : {}),
    };
    return baseHttp.post(path, body, { ...options, headers });
  },

  /**
   * PUT request with auth
   */
  put: (path, body, options = {}) => {
    const headers = {
      ...options.headers,
      ...(globalAccessToken ? { 'Authorization': `Bearer ${globalAccessToken}` } : {}),
    };
    return baseHttp.put(path, body, { ...options, headers });
  },

  /**
   * PATCH request with auth
   */
  patch: (path, body, options = {}) => {
    const headers = {
      ...options.headers,
      ...(globalAccessToken ? { 'Authorization': `Bearer ${globalAccessToken}` } : {}),
    };
    return baseHttp.patch(path, body, { ...options, headers });
  },

  /**
   * DELETE request with auth
   */
  delete: (path, options = {}) => {
    const headers = {
      ...options.headers,
      ...(globalAccessToken ? { 'Authorization': `Bearer ${globalAccessToken}` } : {}),
    };
    return baseHttp.delete(path, { ...options, headers });
  },
};

/**
 * Response interceptor for handling 401 errors
 * This should be called by AuthContext to set up automatic token refresh
 */
export function setupAuthInterceptor(refreshCallback) {
  // Store original methods
  const originalMethods = {
    get: baseHttp.get,
    post: baseHttp.post,
    put: baseHttp.put,
    patch: baseHttp.patch,
    delete: baseHttp.delete,
  };

  // Wrap each method to intercept 401 responses
  Object.keys(originalMethods).forEach(method => {
    baseHttp[method] = async (...args) => {
      try {
        return await originalMethods[method](...args);
      } catch (error) {
        // If 401 and we have a refresh callback, try to refresh
        if (error.status === 401 && refreshCallback) {
          console.log('[Auth] 401 error detected, attempting token refresh...');

          const refreshed = await refreshCallback();

          if (refreshed) {
            console.log('[Auth] Token refreshed, retrying request...');
            // Retry the original request with new token
            return await originalMethods[method](...args);
          } else {
            console.log('[Auth] Token refresh failed, propagating error');
          }
        }

        throw error;
      }
    };
  });

  return () => {
    // Cleanup function to restore original methods
    Object.keys(originalMethods).forEach(method => {
      baseHttp[method] = originalMethods[method];
    });
  };
}

export default authenticatedHttp;
