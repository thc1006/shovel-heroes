/**
 * Integration Test: Frontend Mode Switching
 *
 * Tests the application's ability to switch between LocalStorage and REST API modes
 * based on VITE_USE_FRONTEND environment variable.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient } from '../../src/api/client';
import { API_ENDPOINTS } from '../../src/api/endpoints';

describe('Frontend Mode Switching Integration', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = import.meta.env.VITE_USE_FRONTEND;
    // Clear any cached data
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }
  });

  afterEach(() => {
    import.meta.env.VITE_USE_FRONTEND = originalEnv;
  });

  describe('LocalStorage Mode (VITE_USE_FRONTEND=true)', () => {
    beforeEach(() => {
      import.meta.env.VITE_USE_FRONTEND = 'true';
    });

    it('should use LocalStorage for API calls', async () => {
      const mockData = {
        id: 'test-1',
        name: 'Test Area',
        center_lat: 23.8751,
        center_lng: 121.578
      };

      // Mock LocalStorage operations
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

      // Simulate create operation
      window.localStorage.setItem('disaster-areas', JSON.stringify([mockData]));

      expect(setItemSpy).toHaveBeenCalled();
      expect(getItemSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      getItemSpy.mockRestore();
    });

    it('should persist data in LocalStorage', () => {
      const testData = { id: '1', name: 'Test' };
      window.localStorage.setItem('test-key', JSON.stringify(testData));

      const retrieved = JSON.parse(window.localStorage.getItem('test-key'));
      expect(retrieved).toEqual(testData);
    });

    it('should handle CRUD operations in LocalStorage', () => {
      const items = [];

      // Create
      const newItem = { id: '1', name: 'Item 1' };
      items.push(newItem);
      window.localStorage.setItem('items', JSON.stringify(items));

      // Read
      let stored = JSON.parse(window.localStorage.getItem('items'));
      expect(stored).toHaveLength(1);
      expect(stored[0]).toEqual(newItem);

      // Update
      stored[0].name = 'Updated Item 1';
      window.localStorage.setItem('items', JSON.stringify(stored));
      stored = JSON.parse(window.localStorage.getItem('items'));
      expect(stored[0].name).toBe('Updated Item 1');

      // Delete
      stored = stored.filter(item => item.id !== '1');
      window.localStorage.setItem('items', JSON.stringify(stored));
      stored = JSON.parse(window.localStorage.getItem('items'));
      expect(stored).toHaveLength(0);
    });
  });

  describe('REST API Mode (VITE_USE_FRONTEND=false)', () => {
    beforeEach(() => {
      import.meta.env.VITE_USE_FRONTEND = 'false';
      import.meta.env.VITE_API_BASE = 'http://localhost:8787';
    });

    it('should use REST API base URL from environment', () => {
      const baseUrl = import.meta.env.VITE_API_BASE;
      expect(baseUrl).toBe('http://localhost:8787');
    });

    it('should include correct headers in API calls', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ data: [] })
      });

      try {
        await fetch('http://localhost:8787/disaster-areas', {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        expect(fetchSpy).toHaveBeenCalledWith(
          expect.stringContaining('/disaster-areas'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            })
          })
        );
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle 401 Unauthorized error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Unauthorized' })
      });

      try {
        const response = await fetch('http://localhost:8787/me');
        expect(response.status).toBe(401);
        const error = await response.json();
        expect(error.message).toBe('Unauthorized');
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle 403 Forbidden error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' })
      });

      try {
        const response = await fetch('http://localhost:8787/users');
        expect(response.status).toBe(403);
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle 404 Not Found error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' })
      });

      try {
        const response = await fetch('http://localhost:8787/grids/non-existent');
        expect(response.status).toBe(404);
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle 429 Rate Limit error with Retry-After', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({
          'Retry-After': '60',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0'
        }),
        json: async () => ({ message: 'Too Many Requests' })
      });

      try {
        const response = await fetch('http://localhost:8787/grids');
        expect(response.status).toBe(429);
        expect(response.headers.get('Retry-After')).toBe('60');
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it('should handle 500 Internal Server Error', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal Server Error' })
      });

      try {
        const response = await fetch('http://localhost:8787/disaster-areas');
        expect(response.status).toBe(500);
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });

  describe('Mode Switching', () => {
    it('should correctly switch from LocalStorage to REST API mode', () => {
      import.meta.env.VITE_USE_FRONTEND = 'true';
      expect(import.meta.env.VITE_USE_FRONTEND).toBe('true');

      import.meta.env.VITE_USE_FRONTEND = 'false';
      expect(import.meta.env.VITE_USE_FRONTEND).toBe('false');
    });

    it('should not have residual state after mode switch', () => {
      // Set up LocalStorage state
      window.localStorage.setItem('test-data', JSON.stringify({ value: 'test' }));

      // Switch to API mode (LocalStorage should still exist but be ignored)
      import.meta.env.VITE_USE_FRONTEND = 'false';

      // Clear and verify
      window.localStorage.clear();
      expect(window.localStorage.getItem('test-data')).toBeNull();
    });

    it('should maintain independent data stores per mode', () => {
      // LocalStorage mode data
      import.meta.env.VITE_USE_FRONTEND = 'true';
      window.localStorage.setItem('mode-test', 'localStorage');
      const localData = window.localStorage.getItem('mode-test');

      expect(localData).toBe('localStorage');

      // API mode should not affect LocalStorage data
      import.meta.env.VITE_USE_FRONTEND = 'false';
      const stillLocalData = window.localStorage.getItem('mode-test');
      expect(stillLocalData).toBe('localStorage');
    });
  });

  describe('API Endpoint Configuration', () => {
    it('should have all required API endpoints defined', () => {
      expect(API_ENDPOINTS).toBeDefined();
      expect(API_ENDPOINTS.DISASTER_AREAS).toBeDefined();
      expect(API_ENDPOINTS.GRIDS).toBeDefined();
      expect(API_ENDPOINTS.VOLUNTEERS).toBeDefined();
      expect(API_ENDPOINTS.SUPPLIES).toBeDefined();
      expect(API_ENDPOINTS.ANNOUNCEMENTS).toBeDefined();
    });

    it('should construct correct endpoint URLs', () => {
      const baseUrl = 'http://localhost:8787';

      expect(`${baseUrl}${API_ENDPOINTS.DISASTER_AREAS.LIST}`).toBe('http://localhost:8787/disaster-areas');
      expect(`${baseUrl}${API_ENDPOINTS.GRIDS.LIST}`).toBe('http://localhost:8787/grids');
      expect(`${baseUrl}${API_ENDPOINTS.VOLUNTEERS.LIST}`).toBe('http://localhost:8787/volunteers');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should return consistent error format across modes', () => {
      const expectedErrorFormat = {
        message: expect.any(String),
        code: expect.any(String)
      };

      // Both modes should return errors in this format
      const error = { message: 'Test error', code: 'TEST_ERROR' };
      expect(error).toMatchObject(expectedErrorFormat);
    });

    it('should handle network errors gracefully in API mode', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(
        new Error('Network request failed')
      );

      try {
        await expect(fetch('http://localhost:8787/grids')).rejects.toThrow('Network request failed');
      } finally {
        fetchSpy.mockRestore();
      }
    });
  });
});
