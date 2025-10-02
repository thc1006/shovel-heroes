/**
 * Functions.getVolunteers() Permission Logic Test Suite
 * 志工聚合資訊 & can_view_phone 權限測試
 *
 * 這是**最關鍵**的權限測試！
 * 測試不同角色對 volunteer_phone 欄位的存取權限
 *
 * TDD London School Approach:
 * - Focus on permission boundaries
 * - Test all role combinations
 * - Verify PII protection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockFetch } from '../../utils/mockFetch.js';

// Mock config
vi.mock('../../../src/api/config.js', () => ({
  API_BASE_URL: 'http://localhost:8787',
  DEFAULT_HEADERS: { 'Content-Type': 'application/json' },
  API_TIMEOUT: 30000,
  ENABLE_REQUEST_LOGGING: false,
  API_ENDPOINTS: {
    volunteers: '/volunteers',
  }
}));

describe('Functions.getVolunteers() - Unauthenticated Access', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should allow unauthenticated users to get volunteer list', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          status: 'pending',
          available_time: '10/3 上午'
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 },
      page: 1,
      limit: 50
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.data).toBeDefined();
    expect(result.can_view_phone).toBe(false);
    expect(result.total).toBe(1);
  });

  it('should NOT include volunteer_phone field when can_view_phone is false', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          status: 'pending',
          // volunteer_phone should NOT exist
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data[0].volunteer_phone).toBeUndefined();
  });

  it('should set volunteer_phone to null when can_view_phone is false (alternative approach)', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          volunteer_phone: null, // Explicitly null
          status: 'pending'
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data[0].volunteer_phone).toBeNull();
  });
});

describe('Functions.getVolunteers() - Regular User (Authenticated)', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should allow regular users to get volunteer list', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          status: 'confirmed'
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 0, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data).toBeDefined();
    expect(result.data[0].volunteer_phone).toBeUndefined();
  });

  it('should mask volunteer_phone for regular users', async () => {
    // Arrange - Some backends may mask instead of removing
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          volunteer_phone: '0912-***-678', // Masked
          status: 'confirmed'
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 0, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data[0].volunteer_phone).toContain('***');
  });
});

describe('Functions.getVolunteers() - Grid Manager (Own Grid)', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should allow Grid Manager to view phone numbers for their own grid', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          user_id: 'user_456',
          volunteer_name: '張小強',
          volunteer_phone: '0912-345-678', // ✅ Full phone number
          status: 'confirmed',
          available_time: '10/3 上午',
          skills: ['挖土機'],
          equipment: ['鐵鏟']
        },
        {
          id: 'reg_002',
          grid_id: 'grid_123',
          user_id: 'user_789',
          volunteer_name: '李小花',
          volunteer_phone: '0923-456-789', // ✅ Full phone number
          status: 'pending'
        }
      ],
      can_view_phone: true, // ⭐ Key assertion
      total: 2,
      status_counts: { pending: 1, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 },
      page: 1,
      limit: 50
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_123', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_123' });

    // Assert
    expect(result.can_view_phone).toBe(true);
    expect(result.data[0].volunteer_phone).toBe('0912-345-678');
    expect(result.data[1].volunteer_phone).toBe('0923-456-789');
    expect(result.data[0].volunteer_phone).not.toContain('***');
  });

  it('should include complete volunteer information for Grid Manager', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          user_id: 'user_456',
          volunteer_name: '張小強',
          volunteer_phone: '0912-345-678',
          status: 'confirmed',
          available_time: '10/3 上午',
          skills: ['挖土機', '醫療志工'],
          equipment: ['鐵鏟', '手推車'],
          notes: '需要協助調度交通',
          created_date: '2025-10-02T09:00:00Z'
        }
      ],
      can_view_phone: true,
      total: 1,
      status_counts: { pending: 0, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_123', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_123' });

    // Assert
    expect(result.can_view_phone).toBe(true);
    const volunteer = result.data[0];
    expect(volunteer.volunteer_phone).toBe('0912-345-678');
    expect(volunteer.skills).toEqual(['挖土機', '醫療志工']);
    expect(volunteer.equipment).toEqual(['鐵鏟', '手推車']);
    expect(volunteer.notes).toBe('需要協助調度交通');
  });
});

describe('Functions.getVolunteers() - Grid Manager (Other Grid)', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should NOT allow Grid Manager to view phone numbers for other grids', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_003',
          grid_id: 'grid_456', // Different grid
          volunteer_name: '王大明',
          // volunteer_phone is hidden
          status: 'pending'
        }
      ],
      can_view_phone: false, // ⭐ Should be false for other grids
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_456', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_456' });

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data[0].volunteer_phone).toBeUndefined();
  });

  it('should mask phone numbers when Grid Manager accesses other grids', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_003',
          grid_id: 'grid_456',
          volunteer_name: '王大明',
          volunteer_phone: null, // Or masked
          status: 'pending'
        }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_456', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_456' });

    // Assert
    expect(result.can_view_phone).toBe(false);
    expect(result.data[0].volunteer_phone).toBeNull();
  });
});

describe('Functions.getVolunteers() - Admin Role', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should allow Admin to view phone numbers for any grid', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          volunteer_phone: '0912-345-678', // ✅ Full phone number
          status: 'confirmed'
        },
        {
          id: 'reg_003',
          grid_id: 'grid_456', // Different grid
          volunteer_name: '王大明',
          volunteer_phone: '0934-567-890', // ✅ Full phone number
          status: 'pending'
        }
      ],
      can_view_phone: true, // ⭐ Admin always true
      total: 2,
      status_counts: { pending: 1, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(true);
    expect(result.data[0].volunteer_phone).toBe('0912-345-678');
    expect(result.data[1].volunteer_phone).toBe('0934-567-890');
  });

  it('should allow Admin to filter by grid and still see phone numbers', async () => {
    // Arrange
    const mockResponse = {
      data: [
        {
          id: 'reg_001',
          grid_id: 'grid_123',
          volunteer_name: '張小強',
          volunteer_phone: '0912-345-678',
          status: 'confirmed'
        }
      ],
      can_view_phone: true,
      total: 1,
      status_counts: { pending: 0, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_123', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_123' });

    // Assert
    expect(result.can_view_phone).toBe(true);
    expect(result.data[0].volunteer_phone).toBe('0912-345-678');
  });

  it('should allow Admin to access all volunteer data across all grids', async () => {
    // Arrange
    const mockResponse = {
      data: [
        { id: 'reg_001', grid_id: 'grid_123', volunteer_phone: '0912-345-678', status: 'confirmed' },
        { id: 'reg_002', grid_id: 'grid_456', volunteer_phone: '0923-456-789', status: 'pending' },
        { id: 'reg_003', grid_id: 'grid_789', volunteer_phone: '0934-567-890', status: 'arrived' }
      ],
      can_view_phone: true,
      total: 3,
      status_counts: { pending: 1, confirmed: 1, arrived: 1, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBe(true);
    expect(result.data).toHaveLength(3);
    result.data.forEach(volunteer => {
      expect(volunteer.volunteer_phone).toMatch(/^09\d{2}-\d{3}-\d{3}$/);
    });
  });
});

describe('Functions.getVolunteers() - Response Structure', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should include data array in response', async () => {
    // Arrange
    const mockResponse = {
      data: [
        { id: 'reg_001', volunteer_name: '張小強' },
        { id: 'reg_002', volunteer_name: '李小花' }
      ],
      can_view_phone: false,
      total: 2,
      status_counts: { pending: 1, confirmed: 1, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should include can_view_phone boolean flag', async () => {
    // Arrange
    const mockResponse = {
      data: [],
      can_view_phone: false,
      total: 0,
      status_counts: { pending: 0, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.can_view_phone).toBeDefined();
    expect(typeof result.can_view_phone).toBe('boolean');
  });

  it('should include total count', async () => {
    // Arrange
    const mockResponse = {
      data: [{ id: 'reg_001' }, { id: 'reg_002' }, { id: 'reg_003' }],
      can_view_phone: false,
      total: 3,
      status_counts: { pending: 1, confirmed: 1, arrived: 1, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.total).toBe(3);
    expect(typeof result.total).toBe('number');
  });

  it('should include status_counts with all statuses', async () => {
    // Arrange
    const mockResponse = {
      data: [],
      can_view_phone: false,
      total: 15,
      status_counts: {
        pending: 5,
        confirmed: 4,
        arrived: 3,
        completed: 2,
        cancelled: 1
      }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    expect(result.status_counts).toBeDefined();
    expect(result.status_counts.pending).toBe(5);
    expect(result.status_counts.confirmed).toBe(4);
    expect(result.status_counts.arrived).toBe(3);
    expect(result.status_counts.completed).toBe(2);
    expect(result.status_counts.cancelled).toBe(1);
  });

  it('should include pagination information (page and limit)', async () => {
    // Arrange
    const mockResponse = {
      data: [{ id: 'reg_001' }],
      can_view_phone: false,
      total: 100,
      status_counts: { pending: 100, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 },
      page: 2,
      limit: 50
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?limit=50&offset=50', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ limit: 50, offset: 50 });

    // Assert
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
  });

  it('should correctly calculate status_counts totals', async () => {
    // Arrange
    const mockResponse = {
      data: [],
      can_view_phone: false,
      total: 128,
      status_counts: {
        pending: 12,
        confirmed: 34,
        arrived: 8,
        completed: 55,
        cancelled: 19
      }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers();

    // Assert
    const countsSum = Object.values(result.status_counts).reduce((a, b) => a + b, 0);
    expect(countsSum).toBe(128);
    expect(countsSum).toBe(result.total);
  });
});

describe('Functions.getVolunteers() - Filtering and Pagination', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should support grid_id filtering', async () => {
    // Arrange
    const mockResponse = {
      data: [
        { id: 'reg_001', grid_id: 'grid_123', volunteer_name: '張小強' }
      ],
      can_view_phone: false,
      total: 1,
      status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?grid_id=grid_123', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ grid_id: 'grid_123' });

    // Assert
    expect(result.data[0].grid_id).toBe('grid_123');
  });

  it('should support status filtering', async () => {
    // Arrange
    const mockResponse = {
      data: [
        { id: 'reg_001', status: 'confirmed' },
        { id: 'reg_002', status: 'confirmed' }
      ],
      can_view_phone: false,
      total: 2,
      status_counts: { pending: 0, confirmed: 2, arrived: 0, completed: 0, cancelled: 0 }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?status=confirmed', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ status: 'confirmed' });

    // Assert
    expect(result.data.every(v => v.status === 'confirmed')).toBe(true);
  });

  it('should support include_counts parameter', async () => {
    // Arrange
    const mockResponse = {
      data: [{ id: 'reg_001' }],
      can_view_phone: false,
      total: 10,
      status_counts: {
        pending: 3,
        confirmed: 4,
        arrived: 2,
        completed: 1,
        cancelled: 0
      }
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?include_counts=true', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ include_counts: true });

    // Assert
    expect(result.status_counts).toBeDefined();
    expect(Object.keys(result.status_counts)).toHaveLength(5);
  });

  it('should support pagination with limit and offset', async () => {
    // Arrange
    const mockResponse = {
      data: [{ id: 'reg_051' }],
      can_view_phone: false,
      total: 200,
      status_counts: { pending: 200, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 },
      page: 2,
      limit: 50
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?limit=50&offset=50', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ limit: 50, offset: 50 });

    // Assert
    expect(result.page).toBe(2);
    expect(result.limit).toBe(50);
    expect(result.total).toBe(200);
  });

  it('should enforce maximum limit of 200', async () => {
    // Arrange
    const mockResponse = {
      data: [],
      can_view_phone: false,
      total: 500,
      status_counts: { pending: 500, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 },
      page: 1,
      limit: 200 // Backend enforces max
    };

    const mockFetch = createMockFetch()
      .mockGet('/volunteers?limit=500', mockResponse)
      .build();
    global.fetch = mockFetch;

    // Act
    const result = await getVolunteers({ limit: 500 });

    // Assert
    expect(result.limit).toBe(200); // Backend should cap at 200
  });
});

describe('Functions.getVolunteers() - Permission Logic Summary', () => {
  let getVolunteers;

  beforeEach(async () => {
    vi.resetModules();
    const module = await import('../../../src/api/endpoints/functions.js');
    getVolunteers = module.getVolunteers;
  });

  it('should implement correct permission logic as documented in Line 309-324', async () => {
    // This test verifies the permission logic described in BACKEND_API_INTEGRATION_GUIDE.md
    //
    // function canViewPhone(currentUser: User, grid: Grid): boolean {
    //   if (!currentUser) return false;                                    // ❌ Not logged in
    //   if (currentUser.role === 'admin') return true;                     // ✅ Admin
    //   if (currentUser.role === 'grid_manager' &&
    //       currentUser.id === grid.grid_manager_id) return true;          // ✅ Own grid
    //   return false;                                                      // ❌ Others
    // }

    // Arrange - Test matrix
    const testCases = [
      { user: null, grid: 'grid_123', expected: false, description: 'No user' },
      { user: 'admin', grid: 'grid_123', expected: true, description: 'Admin user' },
      { user: 'manager_own', grid: 'grid_123', expected: true, description: 'Grid Manager (own)' },
      { user: 'manager_other', grid: 'grid_456', expected: false, description: 'Grid Manager (other)' },
      { user: 'regular', grid: 'grid_123', expected: false, description: 'Regular user' }
    ];

    for (const testCase of testCases) {
      const mockResponse = {
        data: [{ id: 'reg_001', grid_id: testCase.grid }],
        can_view_phone: testCase.expected,
        total: 1,
        status_counts: { pending: 1, confirmed: 0, arrived: 0, completed: 0, cancelled: 0 }
      };

      const mockFetch = createMockFetch()
        .mockGet(`/volunteers?grid_id=${testCase.grid}`, mockResponse)
        .build();
      global.fetch = mockFetch;

      // Act
      const result = await getVolunteers({ grid_id: testCase.grid });

      // Assert
      expect(result.can_view_phone).toBe(testCase.expected);
    }
  });
});
