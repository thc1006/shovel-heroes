/**
 * Grids Endpoint Test Suite
 *
 * TDD London School Approach:
 * - Mock HTTP client interactions
 * - Verify API endpoint paths with query parameters
 * - Test grid type and status validation
 * - Test permission-based operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the HTTP client
vi.mock('../../../src/api/client.js', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Grid API - list(params)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should fetch all grids without filters', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        code: 'G-001',
        grid_type: 'mud_disposal',
        disaster_area_id: 'area_001',
        status: 'open',
      },
      {
        id: 'grid_002',
        code: 'G-002',
        grid_type: 'manpower',
        disaster_area_id: 'area_001',
        status: 'open',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grids');
    expect(result).toEqual(mockGrids);
    expect(result).toHaveLength(2);
  });

  it('should filter grids by disaster_area_id', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        code: 'G-001',
        disaster_area_id: 'area_001',
        grid_type: 'mud_disposal',
        status: 'open',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.list({ disaster_area_id: 'area_001' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grids?disaster_area_id=area_001');
    expect(result).toHaveLength(1);
    expect(result[0].disaster_area_id).toBe('area_001');
  });

  it('should filter grids by grid_type', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        code: 'G-001',
        grid_type: 'mud_disposal',
        status: 'open',
      },
      {
        id: 'grid_003',
        code: 'G-003',
        grid_type: 'mud_disposal',
        status: 'completed',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.list({ grid_type: 'mud_disposal' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grids?grid_type=mud_disposal');
    expect(result.every((g) => g.grid_type === 'mud_disposal')).toBe(true);
  });

  it('should filter grids by status', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        code: 'G-001',
        status: 'open',
      },
      {
        id: 'grid_002',
        code: 'G-002',
        status: 'open',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.list({ status: 'open' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grids?status=open');
    expect(result.every((g) => g.status === 'open')).toBe(true);
  });

  it('should combine multiple filters', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        disaster_area_id: 'area_001',
        grid_type: 'manpower',
        status: 'open',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.list({
      disaster_area_id: 'area_001',
      grid_type: 'manpower',
      status: 'open',
    });

    // Assert
    expect(http.get).toHaveBeenCalledWith(
      '/grids?disaster_area_id=area_001&grid_type=manpower&status=open'
    );
    expect(result).toHaveLength(1);
  });
});

describe('Grid API - get(id)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should fetch single grid by id', async () => {
    // Arrange
    const mockGrid = {
      id: 'grid_001',
      code: 'G-001',
      grid_type: 'mud_disposal',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      bounds: {
        north: 23.658,
        south: 23.656,
        east: 121.425,
        west: 121.423,
      },
      volunteer_needed: 20,
      volunteer_registered: 15,
      meeting_point: '光復鄉公所前',
      contact_info: '0912-345-678',
      supplies_needed: ['鏟子', '雨鞋', '口罩'],
      status: 'open',
    };

    http.get.mockResolvedValue(mockGrid);

    // Act
    const result = await Grid.get('grid_001');

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grids/grid_001');
    expect(result).toEqual(mockGrid);
    expect(result.id).toBe('grid_001');
  });

  it('should throw 404 when grid not found', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.get.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(Grid.get('non_existent')).rejects.toThrow();
    expect(http.get).toHaveBeenCalledWith('/grids/non_existent');
  });
});

describe('Grid API - create(data)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should successfully create grid with complete fields', async () => {
    // Arrange
    const newGrid = {
      code: 'G-NEW-001',
      grid_type: 'mud_disposal',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      bounds: {
        north: 23.658,
        south: 23.656,
        east: 121.425,
        west: 121.423,
      },
      volunteer_needed: 20,
      meeting_point: '光復鄉公所前',
      contact_info: '0912-345-678',
      supplies_needed: ['鏟子', '雨鞋', '口罩', '手套'],
      status: 'open',
    };

    const createdGrid = {
      id: 'grid_new_001',
      ...newGrid,
      volunteer_registered: 0,
      created_at: '2025-10-02T10:00:00Z',
      updated_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdGrid);

    // Act
    const result = await Grid.create(newGrid);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/grids', newGrid);
    expect(result).toEqual(createdGrid);
    expect(result.id).toBe('grid_new_001');
    expect(result.volunteer_registered).toBe(0);
  });

  it('should handle supplies_needed array correctly', async () => {
    // Arrange
    const newGrid = {
      code: 'G-SUP-001',
      grid_type: 'supply_storage',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 10,
      supplies_needed: ['飲用水', '便當', '醫療用品', '清潔用品'],
      status: 'open',
    };

    const createdGrid = {
      id: 'grid_sup_001',
      ...newGrid,
      volunteer_registered: 0,
      created_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdGrid);

    // Act
    const result = await Grid.create(newGrid);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/grids', newGrid);
    expect(result.supplies_needed).toEqual(['飲用水', '便當', '醫療用品', '清潔用品']);
    expect(result.supplies_needed).toHaveLength(4);
  });

  it('should validate grid_type - mud_disposal', async () => {
    // Arrange
    const validGrid = {
      code: 'G-MUD-001',
      grid_type: 'mud_disposal',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 30,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_001', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.grid_type).toBe('mud_disposal');
  });

  it('should validate grid_type - manpower', async () => {
    // Arrange
    const validGrid = {
      code: 'G-MAN-001',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 50,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_002', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.grid_type).toBe('manpower');
  });

  it('should validate grid_type - supply_storage', async () => {
    // Arrange
    const validGrid = {
      code: 'G-SUP-001',
      grid_type: 'supply_storage',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 10,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_003', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.grid_type).toBe('supply_storage');
  });

  it('should validate grid_type - accommodation', async () => {
    // Arrange
    const validGrid = {
      code: 'G-ACC-001',
      grid_type: 'accommodation',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 5,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_004', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.grid_type).toBe('accommodation');
  });

  it('should validate grid_type - food_area', async () => {
    // Arrange
    const validGrid = {
      code: 'G-FOOD-001',
      grid_type: 'food_area',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 15,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_005', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.grid_type).toBe('food_area');
  });

  it('should reject invalid grid_type', async () => {
    // Arrange
    const invalidGrid = {
      code: 'G-INV-001',
      grid_type: 'invalid_type',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 10,
      status: 'open',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [
        {
          field: 'grid_type',
          message: 'Grid type must be one of: mud_disposal, manpower, supply_storage, accommodation, food_area',
        },
      ],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(Grid.create(invalidGrid)).rejects.toThrow();
  });

  it('should validate status - open', async () => {
    // Arrange
    const validGrid = {
      code: 'G-001',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'open',
    };

    http.post.mockResolvedValue({ id: 'grid_001', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.status).toBe('open');
  });

  it('should validate status - closed', async () => {
    // Arrange
    const validGrid = {
      code: 'G-002',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'closed',
    };

    http.post.mockResolvedValue({ id: 'grid_002', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.status).toBe('closed');
  });

  it('should validate status - completed', async () => {
    // Arrange
    const validGrid = {
      code: 'G-003',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'completed',
    };

    http.post.mockResolvedValue({ id: 'grid_003', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.status).toBe('completed');
  });

  it('should validate status - pending', async () => {
    // Arrange
    const validGrid = {
      code: 'G-004',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'pending',
    };

    http.post.mockResolvedValue({ id: 'grid_004', ...validGrid });

    // Act
    const result = await Grid.create(validGrid);

    // Assert
    expect(result.status).toBe('pending');
  });

  it('should reject invalid status', async () => {
    // Arrange
    const invalidGrid = {
      code: 'G-INV-001',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'invalid_status',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [
        {
          field: 'status',
          message: 'Status must be one of: open, closed, completed, pending',
        },
      ],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(Grid.create(invalidGrid)).rejects.toThrow();
  });

  it('should require Bearer token (401)', async () => {
    // Arrange
    const newGrid = {
      code: 'G-001',
      grid_type: 'manpower',
      disaster_area_id: 'area_001',
      center_lat: 23.6571,
      center_lng: 121.4242,
      volunteer_needed: 20,
      status: 'open',
    };

    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';
    authError.body = JSON.stringify({ message: 'Authentication required' });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(Grid.create(newGrid)).rejects.toThrow();

    try {
      await Grid.create(newGrid);
    } catch (error) {
      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
    }
  });
});

describe('Grid API - update(id, data)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should update grid location (center_lat/lng)', async () => {
    // Arrange
    const updates = {
      center_lat: 23.6580,
      center_lng: 121.4250,
    };

    const updatedGrid = {
      id: 'grid_001',
      code: 'G-001',
      grid_type: 'manpower',
      ...updates,
      updated_at: '2025-10-02T11:00:00Z',
    };

    http.put.mockResolvedValue(updatedGrid);

    // Act
    const result = await Grid.update('grid_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/grids/grid_001', updates);
    expect(result.center_lat).toBe(23.6580);
    expect(result.center_lng).toBe(121.4250);
  });

  it('should auto-calculate volunteer_registered (IMPORTANT!)', async () => {
    // Arrange
    // Simulating backend auto-calculation when volunteers register
    const initialGrid = {
      id: 'grid_001',
      volunteer_needed: 20,
      volunteer_registered: 10,
    };

    // After 5 more volunteers register
    const updatedGrid = {
      ...initialGrid,
      volunteer_registered: 15, // Auto-calculated by backend
      updated_at: '2025-10-02T12:00:00Z',
    };

    http.put.mockResolvedValue(updatedGrid);

    // Act
    const result = await Grid.update('grid_001', {});

    // Assert
    expect(result.volunteer_registered).toBe(15);
    expect(result.volunteer_registered).toBeLessThanOrEqual(result.volunteer_needed);
  });

  it('should enforce permission check (grid_manager can only update own grids)', async () => {
    // Arrange
    const forbiddenError = new Error('Request failed with status 403');
    forbiddenError.status = 403;
    forbiddenError.statusText = 'Forbidden';
    forbiddenError.body = JSON.stringify({
      message: 'You can only update your own grids',
    });

    http.put.mockRejectedValue(forbiddenError);

    // Act & Assert
    await expect(
      Grid.update('grid_001', { status: 'completed' })
    ).rejects.toThrow();

    try {
      await Grid.update('grid_001', { status: 'completed' });
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.statusText).toBe('Forbidden');
    }
  });

  it('should successfully update when user has permission', async () => {
    // Arrange
    const updates = {
      status: 'completed',
      description: '任務已完成',
    };

    const updatedGrid = {
      id: 'grid_001',
      code: 'G-001',
      ...updates,
      updated_at: '2025-10-02T13:00:00Z',
    };

    http.put.mockResolvedValue(updatedGrid);

    // Act
    const result = await Grid.update('grid_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/grids/grid_001', updates);
    expect(result.status).toBe('completed');
  });
});

describe('Grid API - delete(id)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should successfully delete grid', async () => {
    // Arrange
    http.delete.mockResolvedValue({ success: true, message: 'Grid deleted' });

    // Act
    const result = await Grid.delete('grid_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/grids/grid_001');
    expect(result.success).toBe(true);
  });

  it('should enforce permission check for deletion', async () => {
    // Arrange
    const forbiddenError = new Error('Request failed with status 403');
    forbiddenError.status = 403;
    forbiddenError.statusText = 'Forbidden';
    forbiddenError.body = JSON.stringify({
      message: 'You can only delete your own grids',
    });

    http.delete.mockRejectedValue(forbiddenError);

    // Act & Assert
    await expect(Grid.delete('grid_001')).rejects.toThrow();

    try {
      await Grid.delete('grid_001');
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });
});

describe('Grid API - filter(filters)', () => {
  let Grid;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grids.js');
    Grid = module.Grid;
  });

  it('should use filter() as alias for list()', async () => {
    // Arrange
    const mockGrids = [
      {
        id: 'grid_001',
        disaster_area_id: 'area_001',
        grid_type: 'manpower',
        status: 'open',
      },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const result = await Grid.filter({
      disaster_area_id: 'area_001',
      status: 'open',
    });

    // Assert
    expect(http.get).toHaveBeenCalledWith(
      '/grids?disaster_area_id=area_001&status=open'
    );
    expect(result).toEqual(mockGrids);
  });

  it('should maintain backward compatibility with filter()', async () => {
    // Arrange
    const mockGrids = [
      { id: 'grid_001', grid_type: 'mud_disposal' },
      { id: 'grid_002', grid_type: 'mud_disposal' },
    ];

    http.get.mockResolvedValue(mockGrids);

    // Act
    const listResult = await Grid.list({ grid_type: 'mud_disposal' });
    const filterResult = await Grid.filter({ grid_type: 'mud_disposal' });

    // Assert
    expect(listResult).toEqual(filterResult);
  });
});
