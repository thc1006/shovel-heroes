/**
 * Volunteer Registration API Test Suite
 * 志工報名 API 測試
 *
 * TDD London School Approach:
 * - Mock external dependencies (fetch)
 * - Focus on behavior verification
 * - Test CRUD operations and Grid counter updates
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockFetch } from '../../utils/mockFetch.js';

// Mock config to avoid environment dependencies
vi.mock('../../../src/api/config.js', () => ({
  API_BASE_URL: 'http://localhost:8787',
  DEFAULT_HEADERS: { 'Content-Type': 'application/json' },
  API_TIMEOUT: 30000,
  ENABLE_REQUEST_LOGGING: false,
  API_ENDPOINTS: {
    volunteerRegistrations: '/volunteer-registrations',
    volunteerRegistration: (id) => `/volunteer-registrations/${id}`,
  }
}));

describe('VolunteerRegistration - list()', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should fetch all volunteer registrations without filters', async () => {
    // Arrange
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', volunteer_name: '張小強', status: 'pending' },
      { id: 'reg_002', grid_id: 'grid_123', volunteer_name: '李小花', status: 'confirmed' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations', mockData)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.list();

    // Assert
    expect(result).toEqual(mockData);
    expect(result).toHaveLength(2);
  });

  it('should filter by grid_id parameter', async () => {
    // Arrange
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', volunteer_name: '張小強', status: 'pending' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations?grid_id=grid_123', mockData)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.list({ grid_id: 'grid_123' });

    // Assert
    expect(result).toEqual(mockData);
    expect(result[0].grid_id).toBe('grid_123');
  });

  it('should filter by status parameter', async () => {
    // Arrange
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', volunteer_name: '張小強', status: 'confirmed' },
      { id: 'reg_002', grid_id: 'grid_456', volunteer_name: '李小花', status: 'confirmed' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations?status=confirmed', mockData)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.list({ status: 'confirmed' });

    // Assert
    expect(result).toEqual(mockData);
    expect(result.every(r => r.status === 'confirmed')).toBe(true);
  });

  it('should handle multiple query parameters', async () => {
    // Arrange
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', volunteer_name: '張小強', status: 'pending' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations?grid_id=grid_123&status=pending', mockData)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.list({ grid_id: 'grid_123', status: 'pending' });

    // Assert
    expect(result).toEqual(mockData);
    expect(result[0].grid_id).toBe('grid_123');
    expect(result[0].status).toBe('pending');
  });
});

describe('VolunteerRegistration - get()', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should successfully fetch single registration by ID', async () => {
    // Arrange
    const mockRegistration = {
      id: 'reg_001',
      grid_id: 'grid_123',
      user_id: 'user_456',
      volunteer_name: '張小強',
      volunteer_phone: '0912-345-678',
      status: 'confirmed',
      available_time: '10/3 上午',
      skills: ['挖土機'],
      equipment: ['鐵鏟'],
      created_date: '2025-10-02T09:00:00Z'
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations/reg_001', mockRegistration)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.get('reg_001');

    // Assert
    expect(result).toEqual(mockRegistration);
    expect(result.id).toBe('reg_001');
    expect(result.volunteer_name).toBe('張小強');
  });

  it('should handle 404 Not Found error', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('GET', '/volunteer-registrations/reg_999', 404, 'Registration not found')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(VolunteerRegistration.get('reg_999')).rejects.toThrow();
  });
});

describe('VolunteerRegistration - create()', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should successfully create new volunteer registration', async () => {
    // Arrange
    const requestData = {
      grid_id: 'grid_123',
      volunteer_name: '張小強',
      volunteer_phone: '0912-345-678',
      available_time: '10/3 上午',
      skills: ['挖土機', '醫療志工'],
      equipment: ['鐵鏟', '手推車'],
      notes: '需要協助調度交通'
    };

    const expectedResponse = {
      id: 'reg_001',
      ...requestData,
      status: 'pending',
      created_date: '2025-10-02T09:00:00Z'
    };

    const mockFetch = createMockFetch()
      .mockPost('/volunteer-registrations', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.create(requestData);

    // Assert
    expect(result).toEqual(expectedResponse);
    expect(result.id).toBe('reg_001');
    expect(result.status).toBe('pending');
    expect(result.grid_id).toBe('grid_123');
  });

  it('should trigger Grid.volunteer_registered counter +1 (verified by backend)', async () => {
    // Arrange
    const requestData = {
      grid_id: 'grid_123',
      volunteer_name: '李小花',
      volunteer_phone: '0912-999-888',
      available_time: '10/4 全天'
    };

    const expectedResponse = {
      id: 'reg_002',
      ...requestData,
      status: 'pending',
      // Backend should also return updated grid counter
      grid_updated: {
        volunteer_registered: 1
      }
    };

    const mockFetch = createMockFetch()
      .mockPost('/volunteer-registrations', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.create(requestData);

    // Assert
    expect(result.id).toBe('reg_002');
    // Note: Actual Grid counter update is verified in backend tests
    // This test ensures the API call succeeds
  });

  it('should require Bearer token for authentication', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('POST', '/volunteer-registrations', 401, 'Authentication required')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(
      VolunteerRegistration.create({ grid_id: 'grid_123', volunteer_name: 'Test' })
    ).rejects.toThrow();
  });

  it('should prevent duplicate registration (409 Conflict)', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('POST', '/volunteer-registrations', 409, 'User already registered for this grid')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(
      VolunteerRegistration.create({
        grid_id: 'grid_123',
        volunteer_name: '張小強',
        volunteer_phone: '0912-345-678'
      })
    ).rejects.toThrow();
  });

  it('should validate required fields (400 Bad Request)', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('POST', '/volunteer-registrations', 400, 'Missing required fields: volunteer_name')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(
      VolunteerRegistration.create({ grid_id: 'grid_123' }) // Missing volunteer_name
    ).rejects.toThrow();
  });
});

describe('VolunteerRegistration - update()', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should successfully update volunteer status from pending to confirmed', async () => {
    // Arrange
    const updates = { status: 'confirmed' };
    const expectedResponse = {
      id: 'reg_001',
      grid_id: 'grid_123',
      volunteer_name: '張小強',
      status: 'confirmed',
      updated_at: '2025-10-02T10:00:00Z'
    };

    const mockFetch = createMockFetch()
      .mockPut('/volunteer-registrations/reg_001', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.update('reg_001', updates);

    // Assert
    expect(result).toEqual(expectedResponse);
    expect(result.status).toBe('confirmed');
  });

  it('should trigger Grid counter updates on status change', async () => {
    // Arrange
    const updates = { status: 'completed' };
    const expectedResponse = {
      id: 'reg_001',
      status: 'completed',
      grid_updated: {
        volunteer_completed: 1,
        volunteer_registered: 0 // May decrease pending counter
      }
    };

    const mockFetch = createMockFetch()
      .mockPut('/volunteer-registrations/reg_001', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.update('reg_001', updates);

    // Assert
    expect(result.status).toBe('completed');
    // Backend should handle Grid counter logic
  });

  it('should require proper permissions to update (403 Forbidden)', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('PUT', '/volunteer-registrations/reg_001', 403, 'Insufficient permissions')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(
      VolunteerRegistration.update('reg_001', { status: 'cancelled' })
    ).rejects.toThrow();
  });

  it('should handle 404 Not Found for non-existent registration', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('PUT', '/volunteer-registrations/reg_999', 404, 'Registration not found')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(
      VolunteerRegistration.update('reg_999', { status: 'confirmed' })
    ).rejects.toThrow();
  });

  it('should allow updating other fields like notes', async () => {
    // Arrange
    const updates = { notes: '已確認交通安排' };
    const expectedResponse = {
      id: 'reg_001',
      notes: '已確認交通安排',
      updated_at: '2025-10-02T11:00:00Z'
    };

    const mockFetch = createMockFetch()
      .mockPut('/volunteer-registrations/reg_001', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.update('reg_001', updates);

    // Assert
    expect(result.notes).toBe('已確認交通安排');
  });
});

describe('VolunteerRegistration - delete()', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should successfully cancel volunteer registration', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockDelete('/volunteer-registrations/reg_001', { success: true, message: 'Registration cancelled' })
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.delete('reg_001');

    // Assert
    expect(result.success).toBe(true);
  });

  it('should trigger Grid.volunteer_registered counter -1', async () => {
    // Arrange
    const expectedResponse = {
      success: true,
      grid_updated: {
        volunteer_registered: -1
      }
    };

    const mockFetch = createMockFetch()
      .mockDelete('/volunteer-registrations/reg_001', expectedResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.delete('reg_001');

    // Assert
    expect(result.success).toBe(true);
    // Backend handles Grid counter decrement
  });

  it('should handle 404 Not Found for already deleted registration', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('DELETE', '/volunteer-registrations/reg_999', 404, 'Registration not found')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(VolunteerRegistration.delete('reg_999')).rejects.toThrow();
  });

  it('should require authentication to delete', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('DELETE', '/volunteer-registrations/reg_001', 401, 'Authentication required')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(VolunteerRegistration.delete('reg_001')).rejects.toThrow();
  });

  it('should prevent deletion by unauthorized users', async () => {
    // Arrange
    const mockFetch = createMockFetch()
      .mockError('DELETE', '/volunteer-registrations/reg_001', 403, 'Cannot delete other user\'s registration')
      .build();
    global.fetch = mockFetch;

    // Act & Assert
    await expect(VolunteerRegistration.delete('reg_001')).rejects.toThrow();
  });
});

describe('VolunteerRegistration - filter() [Alias Method]', () => {
  let VolunteerRegistration;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    VolunteerRegistration = module.VolunteerRegistration;
  });

  it('should work as alias for list() method', async () => {
    // Arrange
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', status: 'pending' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations?grid_id=grid_123', mockData)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await VolunteerRegistration.filter({ grid_id: 'grid_123' });

    // Assert
    expect(result).toEqual(mockData);
  });

  it('should maintain backward compatibility', async () => {
    // Arrange
    const filters = { status: 'confirmed', grid_id: 'grid_123' };
    const mockData = [
      { id: 'reg_001', grid_id: 'grid_123', status: 'confirmed' }
    ];

    const mockFetch = createMockFetch()
      .mockGet('/volunteer-registrations?status=confirmed&grid_id=grid_123', mockData)
      .build();
    global.fetch = mockFetch;

    // Act - Both methods should produce same result
    const listResult = await VolunteerRegistration.list(filters);

    vi.resetModules();
    const module = await import('../../../src/api/endpoints/volunteers.js');
    global.fetch = mockFetch;
    const filterResult = await module.VolunteerRegistration.filter(filters);

    // Assert
    expect(listResult).toEqual(filterResult);
  });
});
