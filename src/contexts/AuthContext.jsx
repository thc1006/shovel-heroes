/**
 * AuthContext - Authentication Context Provider
 *
 * Provides authentication state and functions throughout the application
 * Handles JWT token management, auto-refresh, and session persistence
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User } from '../api/endpoints/users.js';
import { http } from '../api/client.js';
import { API_ENDPOINTS } from '../api/config.js';
import { setGlobalAccessToken, setupAuthInterceptor } from './AuthContext.enhanced.jsx';

// Create context
const AuthContext = createContext(null);

// LocalStorage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER: 'auth_user',
};

/**
 * Decode JWT token to extract payload
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null if invalid
 */
function decodeJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return decoded;
  } catch (error) {
    console.error('[Auth] Failed to decode JWT:', error);
    return null;
  }
}

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
function isTokenExpired(token) {
  if (!token) return true;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;

  // Check if token expires in next 60 seconds (buffer for refresh)
  const expiryTime = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  const bufferTime = 60 * 1000; // 60 seconds

  return expiryTime - now < bufferTime;
}

/**
 * Get time until token expiry in milliseconds
 * @param {string} token - JWT token
 * @returns {number} Milliseconds until expiry, or 0 if expired
 */
function getTokenExpiryTime(token) {
  if (!token) return 0;

  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return 0;

  const expiryTime = decoded.exp * 1000;
  const now = Date.now();
  const timeUntilExpiry = expiryTime - now;

  return Math.max(0, timeUntilExpiry);
}

/**
 * AuthProvider Component
 * Wraps application to provide authentication context
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref to track refresh timer
  const refreshTimerRef = useRef(null);
  const isInitializedRef = useRef(false);
  const interceptorCleanupRef = useRef(null);

  /**
   * Save authentication data to localStorage
   */
  const saveToStorage = useCallback((accessToken, refreshToken, user) => {
    try {
      if (accessToken) localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      if (user) localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      console.log('[Auth] Saved to localStorage');
    } catch (error) {
      console.error('[Auth] Failed to save to localStorage:', error);
    }
  }, []);

  /**
   * Clear authentication data from localStorage
   */
  const clearStorage = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      console.log('[Auth] Cleared localStorage');
    } catch (error) {
      console.error('[Auth] Failed to clear localStorage:', error);
    }
  }, []);

  /**
   * Load authentication data from localStorage
   */
  const loadFromStorage = useCallback(() => {
    try {
      const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

      return {
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        user: storedUser ? JSON.parse(storedUser) : null,
      };
    } catch (error) {
      console.error('[Auth] Failed to load from localStorage:', error);
      return { accessToken: null, refreshToken: null, user: null };
    }
  }, []);

  /**
   * Set Authorization header for all API requests
   */
  const setAuthHeader = useCallback((token) => {
    // Update global token for authenticated HTTP client
    setGlobalAccessToken(token);

    if (token) {
      console.log('[Auth] Set Authorization header');
    } else {
      console.log('[Auth] Removed Authorization header');
    }
  }, []);

  /**
   * Schedule automatic token refresh before expiry
   */
  const scheduleTokenRefresh = useCallback((token) => {
    // Clear existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!token) return;

    const timeUntilExpiry = getTokenExpiryTime(token);
    if (timeUntilExpiry <= 0) return;

    // Schedule refresh 5 minutes before expiry
    const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

    console.log(`[Auth] Scheduling token refresh in ${Math.floor(refreshTime / 1000 / 60)} minutes`);

    refreshTimerRef.current = setTimeout(async () => {
      console.log('[Auth] Auto-refreshing token...');
      await refreshAccessToken();
    }, refreshTime);
  }, []);

  /**
   * Refresh access token using refresh token
   * @returns {Promise<boolean>} True if refresh successful
   */
  const refreshAccessToken = useCallback(async () => {
    // Prevent concurrent refresh attempts
    if (isRefreshing) {
      console.log('[Auth] Refresh already in progress, skipping');
      return false;
    }

    const currentRefreshToken = refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!currentRefreshToken) {
      console.log('[Auth] No refresh token available');
      return false;
    }

    if (isTokenExpired(currentRefreshToken)) {
      console.log('[Auth] Refresh token expired, logging out');
      await logout();
      return false;
    }

    setIsRefreshing(true);

    try {
      console.log('[Auth] Refreshing access token...');

      // Call refresh endpoint
      const response = await http.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      });

      if (response.accessToken) {
        console.log('[Auth] Token refresh successful');

        setAccessToken(response.accessToken);
        setAuthHeader(response.accessToken);
        saveToStorage(response.accessToken, currentRefreshToken, user);

        // Schedule next refresh
        scheduleTokenRefresh(response.accessToken);

        return true;
      } else {
        throw new Error('No access token in refresh response');
      }
    } catch (error) {
      console.error('[Auth] Token refresh failed:', error);

      // If refresh fails with 401, logout user
      if (error.status === 401) {
        console.log('[Auth] Refresh token invalid, logging out');
        await logout();
      }

      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, user, isRefreshing, setAuthHeader, saveToStorage, scheduleTokenRefresh]);

  /**
   * Login with credentials
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} Login response
   */
  const login = useCallback(async (credentials) => {
    try {
      console.log('[Auth] Logging in...');
      setIsLoading(true);

      const response = await User.login(credentials);

      if (!response.accessToken) {
        throw new Error('No access token in login response');
      }

      const userData = {
        id: response.user?.id || response.userId,
        email: response.user?.email || credentials.email,
        role: response.user?.role || 'user',
        phone_number: response.user?.phone_number || null,
        ...response.user,
      };

      // Update state
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken || null);
      setUser(userData);

      // Save to localStorage
      saveToStorage(response.accessToken, response.refreshToken, userData);

      // Set auth header for future requests
      setAuthHeader(response.accessToken);

      // Schedule token refresh
      if (response.accessToken) {
        scheduleTokenRefresh(response.accessToken);
      }

      console.log('[Auth] Login successful:', userData);

      return response;
    } catch (error) {
      console.error('[Auth] Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saveToStorage, setAuthHeader, scheduleTokenRefresh]);

  /**
   * Register new user
   * @param {Object} data - Registration data
   * @param {string} data.email - User email
   * @param {string} data.password - User password
   * @param {string} data.phone_number - User phone number
   * @returns {Promise<Object>} Registration response
   */
  const register = useCallback(async (data) => {
    try {
      console.log('[Auth] Registering user...');
      setIsLoading(true);

      const response = await User.register(data);

      // Auto-login after registration if tokens provided
      if (response.accessToken) {
        const userData = {
          id: response.user?.id || response.userId,
          email: response.user?.email || data.email,
          role: response.user?.role || 'user',
          phone_number: response.user?.phone_number || data.phone_number,
          ...response.user,
        };

        setAccessToken(response.accessToken);
        setRefreshToken(response.refreshToken || null);
        setUser(userData);

        saveToStorage(response.accessToken, response.refreshToken, userData);
        setAuthHeader(response.accessToken);

        if (response.accessToken) {
          scheduleTokenRefresh(response.accessToken);
        }

        console.log('[Auth] Registration and auto-login successful');
      } else {
        console.log('[Auth] Registration successful, please login');
      }

      return response;
    } catch (error) {
      console.error('[Auth] Registration failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [saveToStorage, setAuthHeader, scheduleTokenRefresh]);

  /**
   * Logout current user
   */
  const logout = useCallback(async () => {
    try {
      console.log('[Auth] Logging out...');

      // Clear refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }

      // Call logout endpoint (best effort, don't wait for response)
      try {
        await User.logout();
      } catch (error) {
        console.warn('[Auth] Logout API call failed (continuing anyway):', error);
      }

      // Clear state
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);

      // Clear localStorage
      clearStorage();

      // Remove auth header
      setAuthHeader(null);

      console.log('[Auth] Logout successful');
    } catch (error) {
      console.error('[Auth] Logout failed:', error);
    }
  }, [clearStorage, setAuthHeader]);

  /**
   * Check authentication status on mount
   * Validates stored token and restores session
   */
  const checkAuth = useCallback(async () => {
    try {
      console.log('[Auth] Checking authentication status...');

      const stored = loadFromStorage();

      if (!stored.accessToken) {
        console.log('[Auth] No stored token found');
        return;
      }

      // Check if access token is expired
      if (isTokenExpired(stored.accessToken)) {
        console.log('[Auth] Stored access token expired, attempting refresh...');

        // Try to refresh
        if (stored.refreshToken && !isTokenExpired(stored.refreshToken)) {
          setRefreshToken(stored.refreshToken);
          await refreshAccessToken();
          return;
        } else {
          console.log('[Auth] Refresh token also expired, clearing session');
          clearStorage();
          return;
        }
      }

      // Token is valid, restore session
      console.log('[Auth] Valid token found, restoring session');

      setAccessToken(stored.accessToken);
      setRefreshToken(stored.refreshToken);
      setUser(stored.user);
      setAuthHeader(stored.accessToken);

      // Schedule refresh
      scheduleTokenRefresh(stored.accessToken);

      // Optionally: verify token with backend by fetching user data
      try {
        const currentUser = await User.me();
        if (currentUser) {
          setUser(currentUser);
          saveToStorage(stored.accessToken, stored.refreshToken, currentUser);
        }
      } catch (error) {
        console.warn('[Auth] Failed to fetch current user:', error);

        // If token is invalid, clear session
        if (error.status === 401) {
          console.log('[Auth] Token invalid, clearing session');
          await logout();
        }
      }
    } catch (error) {
      console.error('[Auth] Auth check failed:', error);
      clearStorage();
    } finally {
      setIsLoading(false);
    }
  }, [loadFromStorage, clearStorage, setAuthHeader, scheduleTokenRefresh, refreshAccessToken, logout, saveToStorage]);

  /**
   * Initialize auth on mount
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      // Setup HTTP interceptor for 401 handling
      interceptorCleanupRef.current = setupAuthInterceptor(refreshAccessToken);

      checkAuth();
    }

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      if (interceptorCleanupRef.current) {
        interceptorCleanupRef.current();
      }
    };
  }, [checkAuth, refreshAccessToken]);


  // Calculate derived state
  const isAuthenticated = !!user && !!accessToken;

  // Context value
  const value = {
    // State
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    isRefreshing,

    // Functions
    login,
    logout,
    register,
    refreshAccessToken,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to use authentication context
 * @returns {Object} Authentication context value
 * @throws {Error} If used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

export default AuthContext;
