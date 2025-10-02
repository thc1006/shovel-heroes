/**
 * Disaster Areas Endpoint Test Suite
 *
 * TDD London School Approach:
 * - Mock HTTP client interactions
 * - Verify API endpoint paths and parameters
 * - Test validation and authorization
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

describe('DisasterArea API - list()', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should fetch all disaster areas successfully', async () => {
    // Arrange
    const mockAreas = [
      {
        id: 'area_001',
        name: '光復鄉馬太鞍溪災區',
        county: '花蓮縣',
        township: '光復鄉',
        center_lat: 23.6571,
        center_lng: 121.4242,
        status: 'active',
      },
      {
        id: 'area_002',
        name: '瑞穗鄉舞鶴台地災區',
        county: '花蓮縣',
        township: '瑞穗鄉',
        center_lat: 23.5456,
        center_lng: 121.3789,
        status: 'active',
      },
    ];

    http.get.mockResolvedValue(mockAreas);

    // Act
    const result = await DisasterArea.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/disaster-areas');
    expect(result).toEqual(mockAreas);
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no disaster areas exist', async () => {
    // Arrange
    http.get.mockResolvedValue([]);

    // Act
    const result = await DisasterArea.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/disaster-areas');
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('DisasterArea API - get(id)', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should fetch single disaster area by id', async () => {
    // Arrange
    const mockArea = {
      id: 'area_001',
      name: '光復鄉馬太鞍溪災區',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 121.4242,
      description: '馬太鞍堰塞湖溢流造成嚴重淤泥',
      status: 'active',
      created_at: '2025-09-23T08:00:00Z',
    };

    http.get.mockResolvedValue(mockArea);

    // Act
    const result = await DisasterArea.get('area_001');

    // Assert
    expect(http.get).toHaveBeenCalledWith('/disaster-areas/area_001');
    expect(result).toEqual(mockArea);
    expect(result.id).toBe('area_001');
  });

  it('should throw 404 error when disaster area not found', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.get.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(DisasterArea.get('non_existent')).rejects.toThrow();
    expect(http.get).toHaveBeenCalledWith('/disaster-areas/non_existent');
  });
});

describe('DisasterArea API - create(data)', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should successfully create disaster area with 201', async () => {
    // Arrange
    const newArea = {
      name: '光復鄉馬太鞍溪災區',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 121.4242,
      description: '馬太鞍堰塞湖溢流造成嚴重淤泥',
      status: 'active',
    };

    const createdArea = {
      id: 'area_new_001',
      ...newArea,
      created_at: '2025-10-02T10:00:00Z',
      updated_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdArea);

    // Act
    const result = await DisasterArea.create(newArea);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/disaster-areas', newArea);
    expect(result).toEqual(createdArea);
    expect(result.id).toBe('area_new_001');
  });

  it('should reject invalid latitude (< -90)', async () => {
    // Arrange
    const invalidArea = {
      name: 'Test Area',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: -91, // Invalid
      center_lng: 121.4242,
      status: 'active',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{ field: 'center_lat', message: 'Latitude must be between -90 and 90' }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(DisasterArea.create(invalidArea)).rejects.toThrow();
    expect(http.post).toHaveBeenCalledWith('/disaster-areas', invalidArea);
  });

  it('should reject invalid latitude (> 90)', async () => {
    // Arrange
    const invalidArea = {
      name: 'Test Area',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 91, // Invalid
      center_lng: 121.4242,
      status: 'active',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{ field: 'center_lat', message: 'Latitude must be between -90 and 90' }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(DisasterArea.create(invalidArea)).rejects.toThrow();
  });

  it('should reject invalid longitude (< -180)', async () => {
    // Arrange
    const invalidArea = {
      name: 'Test Area',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: -181, // Invalid
      status: 'active',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{ field: 'center_lng', message: 'Longitude must be between -180 and 180' }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(DisasterArea.create(invalidArea)).rejects.toThrow();
  });

  it('should reject invalid longitude (> 180)', async () => {
    // Arrange
    const invalidArea = {
      name: 'Test Area',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 181, // Invalid
      status: 'active',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{ field: 'center_lng', message: 'Longitude must be between -180 and 180' }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(DisasterArea.create(invalidArea)).rejects.toThrow();
  });

  it('should require Bearer token (401 Unauthorized)', async () => {
    // Arrange
    const newArea = {
      name: 'Test Area',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 121.4242,
      status: 'active',
    };

    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';
    authError.body = JSON.stringify({ message: 'Authentication required' });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(DisasterArea.create(newArea)).rejects.toThrow();

    try {
      await DisasterArea.create(newArea);
    } catch (error) {
      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
    }
  });
});

describe('DisasterArea API - update(id, data)', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should successfully update disaster area', async () => {
    // Arrange
    const updates = {
      description: '已完成大部分清淤工作',
      status: 'recovering',
    };

    const updatedArea = {
      id: 'area_001',
      name: '光復鄉馬太鞍溪災區',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 121.4242,
      ...updates,
      updated_at: '2025-10-02T12:00:00Z',
    };

    http.put.mockResolvedValue(updatedArea);

    // Act
    const result = await DisasterArea.update('area_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/disaster-areas/area_001', updates);
    expect(result).toEqual(updatedArea);
    expect(result.status).toBe('recovering');
  });

  it('should support partial update', async () => {
    // Arrange
    const partialUpdate = {
      status: 'completed',
    };

    const updatedArea = {
      id: 'area_001',
      name: '光復鄉馬太鞍溪災區',
      status: 'completed',
      updated_at: '2025-10-02T13:00:00Z',
    };

    http.put.mockResolvedValue(updatedArea);

    // Act
    const result = await DisasterArea.update('area_001', partialUpdate);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/disaster-areas/area_001', partialUpdate);
    expect(result.status).toBe('completed');
  });

  it('should throw 404 when updating non-existent area', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.put.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(
      DisasterArea.update('non_existent', { status: 'active' })
    ).rejects.toThrow();
  });

  it('should require authorization (401)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';

    http.put.mockRejectedValue(authError);

    // Act & Assert
    await expect(
      DisasterArea.update('area_001', { status: 'completed' })
    ).rejects.toThrow();

    try {
      await DisasterArea.update('area_001', { status: 'completed' });
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });
});

describe('DisasterArea API - delete(id)', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should successfully delete disaster area', async () => {
    // Arrange
    http.delete.mockResolvedValue({ success: true, message: 'Disaster area deleted' });

    // Act
    const result = await DisasterArea.delete('area_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/disaster-areas/area_001');
    expect(result.success).toBe(true);
  });

  it('should require authorization (401)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';

    http.delete.mockRejectedValue(authError);

    // Act & Assert
    await expect(DisasterArea.delete('area_001')).rejects.toThrow();

    try {
      await DisasterArea.delete('area_001');
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });

  it('should throw 404 when deleting non-existent area', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.delete.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(DisasterArea.delete('non_existent')).rejects.toThrow();
  });

  it('should cascade delete related grids', async () => {
    // Arrange
    const cascadeResponse = {
      success: true,
      message: 'Disaster area deleted',
      deleted_grids: ['grid_001', 'grid_002', 'grid_003'],
    };

    http.delete.mockResolvedValue(cascadeResponse);

    // Act
    const result = await DisasterArea.delete('area_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/disaster-areas/area_001');
    expect(result.deleted_grids).toHaveLength(3);
    expect(result.deleted_grids).toContain('grid_001');
  });
});

describe('DisasterArea API - Integration Scenarios', () => {
  let DisasterArea;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/disaster-areas.js');
    DisasterArea = module.DisasterArea;
  });

  it('should complete full CRUD lifecycle', async () => {
    // ========== CREATE ==========
    const newArea = {
      name: '測試災區',
      county: '花蓮縣',
      township: '光復鄉',
      center_lat: 23.6571,
      center_lng: 121.4242,
      description: '測試用災區',
      status: 'active',
    };

    const createdArea = {
      id: 'area_test_001',
      ...newArea,
      created_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdArea);

    const created = await DisasterArea.create(newArea);
    expect(created.id).toBe('area_test_001');

    // ========== READ ==========
    http.get.mockResolvedValue(createdArea);
    const fetched = await DisasterArea.get('area_test_001');
    expect(fetched).toEqual(createdArea);

    // ========== UPDATE ==========
    const updates = {
      description: '已更新描述',
      status: 'recovering',
    };

    const updatedArea = {
      ...createdArea,
      ...updates,
      updated_at: '2025-10-02T11:00:00Z',
    };

    http.put.mockResolvedValue(updatedArea);
    const updated = await DisasterArea.update('area_test_001', updates);
    expect(updated.status).toBe('recovering');
    expect(updated.description).toBe('已更新描述');

    // ========== DELETE ==========
    http.delete.mockResolvedValue({ success: true });
    const deleted = await DisasterArea.delete('area_test_001');
    expect(deleted.success).toBe(true);

    // ========== VERIFY DELETE ==========
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    http.get.mockRejectedValue(notFoundError);

    await expect(DisasterArea.get('area_test_001')).rejects.toThrow();
  });
});
