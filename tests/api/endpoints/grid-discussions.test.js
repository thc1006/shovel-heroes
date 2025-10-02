/**
 * Grid Discussions Endpoint Test Suite
 *
 * TDD London School Approach:
 * - Mock HTTP client interactions
 * - Verify API endpoint paths and parameters
 * - Test validation, authorization, and content moderation
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

describe('GridDiscussion API - list()', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should list all discussions successfully', async () => {
    // Arrange
    const mockDiscussions = [
      {
        id: 'disc_001',
        grid_id: 'grid_001',
        user_id: 'user_001',
        user_name: '張三',
        content: '這個區域需要更多志工協助清淤',
        created_at: '2025-09-24T10:00:00Z',
      },
      {
        id: 'disc_002',
        grid_id: 'grid_001',
        user_id: 'user_002',
        user_name: '李四',
        content: '我已經聯絡當地村長，明天會有物資送達',
        created_at: '2025-09-24T11:00:00Z',
      },
    ];

    http.get.mockResolvedValue(mockDiscussions);

    // Act
    const result = await GridDiscussion.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions');
    expect(result).toEqual(mockDiscussions);
    expect(result).toHaveLength(2);
  });

  it('should filter discussions by grid_id (recommended)', async () => {
    // Arrange
    const mockFiltered = [
      {
        id: 'disc_001',
        grid_id: 'grid_001',
        user_id: 'user_001',
        content: '需要志工',
        created_at: '2025-09-24T10:00:00Z',
      },
    ];

    http.get.mockResolvedValue(mockFiltered);

    // Act
    const result = await GridDiscussion.list({ grid_id: 'grid_001' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions?grid_id=grid_001');
    expect(result).toHaveLength(1);
    expect(result[0].grid_id).toBe('grid_001');
  });

  it('should support pagination with limit parameter', async () => {
    // Arrange
    const mockPaginated = [
      { id: 'disc_001', content: 'Message 1' },
      { id: 'disc_002', content: 'Message 2' },
      { id: 'disc_003', content: 'Message 3' },
    ];

    http.get.mockResolvedValue(mockPaginated);

    // Act
    const result = await GridDiscussion.list({ limit: 3 });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions?limit=3');
    expect(result).toHaveLength(3);
  });

  it('should combine grid_id and limit for filtered pagination', async () => {
    // Arrange
    const mockData = [
      { id: 'disc_001', grid_id: 'grid_001', content: 'Message 1' },
      { id: 'disc_002', grid_id: 'grid_001', content: 'Message 2' },
    ];

    http.get.mockResolvedValue(mockData);

    // Act
    const result = await GridDiscussion.list({ grid_id: 'grid_001', limit: 2 });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions?grid_id=grid_001&limit=2');
    expect(result).toHaveLength(2);
    expect(result[0].grid_id).toBe('grid_001');
  });

  it('should return empty array when no discussions exist', async () => {
    // Arrange
    http.get.mockResolvedValue([]);

    // Act
    const result = await GridDiscussion.list();

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('GridDiscussion API - get(id)', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should fetch single discussion by id', async () => {
    // Arrange
    const mockDiscussion = {
      id: 'disc_001',
      grid_id: 'grid_001',
      user_id: 'user_001',
      user_name: '張三',
      user_role: 'volunteer',
      content: '這個區域已經完成清淤，感謝所有志工的幫助！',
      created_at: '2025-09-24T10:00:00Z',
      updated_at: '2025-09-24T10:00:00Z',
    };

    http.get.mockResolvedValue(mockDiscussion);

    // Act
    const result = await GridDiscussion.get('disc_001');

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions/disc_001');
    expect(result).toEqual(mockDiscussion);
    expect(result.id).toBe('disc_001');
  });

  it('should throw 404 when discussion not found', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.get.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(GridDiscussion.get('non_existent')).rejects.toThrow();
    expect(http.get).toHaveBeenCalledWith('/grid-discussions/non_existent');
  });
});

describe('GridDiscussion API - create(data)', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should successfully create discussion message', async () => {
    // Arrange
    const newDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '需要更多志工協助清淤工作',
    };

    const createdDiscussion = {
      id: 'disc_new_001',
      ...newDiscussion,
      user_name: '張三',
      created_at: '2025-10-02T10:00:00Z',
      updated_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdDiscussion);

    // Act
    const result = await GridDiscussion.create(newDiscussion);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/grid-discussions', newDiscussion);
    expect(result).toEqual(createdDiscussion);
    expect(result.id).toBe('disc_new_001');
  });

  it('should create message with all required fields', async () => {
    // Arrange
    const completeDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '明天下午三點會有物資車送達，請志工協助卸貨',
    };

    http.post.mockResolvedValue({
      id: 'disc_complete_001',
      ...completeDiscussion,
      created_at: '2025-10-02T10:00:00Z',
    });

    // Act
    const result = await GridDiscussion.create(completeDiscussion);

    // Assert
    expect(result.grid_id).toBe('grid_001');
    expect(result.user_id).toBe('user_001');
    expect(result.content).toBe('明天下午三點會有物資車送達，請志工協助卸貨');
  });

  it('should require Bearer token (401 Unauthorized)', async () => {
    // Arrange
    const newDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '測試留言',
    };

    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';
    authError.body = JSON.stringify({ message: 'Authentication required' });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(GridDiscussion.create(newDiscussion)).rejects.toThrow();

    try {
      await GridDiscussion.create(newDiscussion);
    } catch (error) {
      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
    }
  });

  it('should reject empty content', async () => {
    // Arrange
    const invalidDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '', // Empty content
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'content',
        message: 'Content cannot be empty',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(GridDiscussion.create(invalidDiscussion)).rejects.toThrow();
  });

  it('should reject whitespace-only content', async () => {
    // Arrange
    const invalidDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '   ', // Whitespace only
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'content',
        message: 'Content cannot be empty or whitespace only',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(GridDiscussion.create(invalidDiscussion)).rejects.toThrow();
  });
});

describe('GridDiscussion API - update(id, data)', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should successfully update discussion (author only)', async () => {
    // Arrange
    const updates = {
      content: '更新後的內容：需要10位志工協助',
    };

    const updatedDiscussion = {
      id: 'disc_001',
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '更新後的內容：需要10位志工協助',
      created_at: '2025-09-24T10:00:00Z',
      updated_at: '2025-10-02T12:00:00Z',
    };

    http.put.mockResolvedValue(updatedDiscussion);

    // Act
    const result = await GridDiscussion.update('disc_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/grid-discussions/disc_001', updates);
    expect(result).toEqual(updatedDiscussion);
    expect(result.content).toBe('更新後的內容：需要10位志工協助');
  });

  it('should check authorization - only author or admin (403 Forbidden)', async () => {
    // Arrange
    const updates = {
      content: '嘗試修改他人留言',
    };

    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only the author or admin can edit this discussion',
    });

    http.put.mockRejectedValue(authError);

    // Act & Assert
    await expect(GridDiscussion.update('disc_001', updates)).rejects.toThrow();

    try {
      await GridDiscussion.update('disc_001', updates);
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.statusText).toBe('Forbidden');
    }
  });

  it('should allow admin to update any discussion', async () => {
    // Arrange - Simulating admin update
    const updates = {
      content: '[管理員編輯] 此訊息已被修正',
    };

    const adminUpdated = {
      id: 'disc_001',
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '[管理員編輯] 此訊息已被修正',
      edited_by: 'admin_001',
      updated_at: '2025-10-02T13:00:00Z',
    };

    http.put.mockResolvedValue(adminUpdated);

    // Act
    const result = await GridDiscussion.update('disc_001', updates);

    // Assert
    expect(result.content).toBe('[管理員編輯] 此訊息已被修正');
    expect(result.edited_by).toBe('admin_001');
  });
});

describe('GridDiscussion API - delete(id)', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should successfully delete discussion (author only)', async () => {
    // Arrange
    http.delete.mockResolvedValue({
      success: true,
      message: 'Discussion deleted',
    });

    // Act
    const result = await GridDiscussion.delete('disc_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/grid-discussions/disc_001');
    expect(result.success).toBe(true);
  });

  it('should check authorization - only author or admin (403 Forbidden)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only the author or admin can delete this discussion',
    });

    http.delete.mockRejectedValue(authError);

    // Act & Assert
    await expect(GridDiscussion.delete('disc_001')).rejects.toThrow();

    try {
      await GridDiscussion.delete('disc_001');
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.statusText).toBe('Forbidden');
    }
  });

  it('should allow admin to delete any discussion', async () => {
    // Arrange - Simulating admin delete
    http.delete.mockResolvedValue({
      success: true,
      message: 'Discussion deleted by admin',
      deleted_by: 'admin_001',
    });

    // Act
    const result = await GridDiscussion.delete('disc_001');

    // Assert
    expect(result.success).toBe(true);
    expect(result.deleted_by).toBe('admin_001');
  });

  it('should throw 404 when deleting non-existent discussion', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.delete.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(GridDiscussion.delete('non_existent')).rejects.toThrow();
  });
});

describe('GridDiscussion API - filter()', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should be an alias for list() method', async () => {
    // Arrange
    const mockDiscussions = [
      { id: 'disc_001', grid_id: 'grid_001', content: 'Test' },
    ];

    http.get.mockResolvedValue(mockDiscussions);

    // Act
    const result = await GridDiscussion.filter({ grid_id: 'grid_001' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/grid-discussions?grid_id=grid_001');
    expect(result).toEqual(mockDiscussions);
  });
});

describe('GridDiscussion API - Integration Scenarios', () => {
  let GridDiscussion;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/grid-discussions.js');
    GridDiscussion = module.GridDiscussion;
  });

  it('should complete full CRUD lifecycle', async () => {
    // ========== CREATE ==========
    const newDiscussion = {
      grid_id: 'grid_001',
      user_id: 'user_001',
      content: '測試討論留言',
    };

    const created = {
      id: 'disc_test_001',
      ...newDiscussion,
      created_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(created);
    const createdResult = await GridDiscussion.create(newDiscussion);
    expect(createdResult.id).toBe('disc_test_001');

    // ========== READ ==========
    http.get.mockResolvedValue(created);
    const fetched = await GridDiscussion.get('disc_test_001');
    expect(fetched).toEqual(created);

    // ========== UPDATE ==========
    const updates = { content: '已更新的討論內容' };
    const updated = {
      ...created,
      ...updates,
      updated_at: '2025-10-02T11:00:00Z',
    };

    http.put.mockResolvedValue(updated);
    const updatedResult = await GridDiscussion.update('disc_test_001', updates);
    expect(updatedResult.content).toBe('已更新的討論內容');

    // ========== DELETE ==========
    http.delete.mockResolvedValue({ success: true });
    const deleted = await GridDiscussion.delete('disc_test_001');
    expect(deleted.success).toBe(true);

    // ========== VERIFY DELETE ==========
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    http.get.mockRejectedValue(notFoundError);

    await expect(GridDiscussion.get('disc_test_001')).rejects.toThrow();
  });
});
