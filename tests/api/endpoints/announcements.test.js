/**
 * Announcements Endpoint Test Suite
 *
 * TDD London School Approach:
 * - Mock HTTP client interactions
 * - Verify API endpoint paths and parameters
 * - Test validation, authorization (admin-only), and Markdown support
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

describe('Announcement API - list()', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should fetch all announcements successfully', async () => {
    // Arrange
    const mockAnnouncements = [
      {
        id: 'ann_001',
        title: '光復災區救援進度更新',
        body: '截至目前，已完成80%的清淤工作...',
        priority: 'high',
        created_at: '2025-09-24T10:00:00Z',
      },
      {
        id: 'ann_002',
        title: '志工報到流程說明',
        body: '請所有志工於早上8點前往集合點報到...',
        priority: 'medium',
        created_at: '2025-09-24T09:00:00Z',
      },
    ];

    http.get.mockResolvedValue(mockAnnouncements);

    // Act
    const result = await Announcement.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/announcements');
    expect(result).toEqual(mockAnnouncements);
    expect(result).toHaveLength(2);
  });

  it('should support sort parameter', async () => {
    // Arrange
    const mockSorted = [
      { id: 'ann_002', created_at: '2025-09-24T11:00:00Z', title: 'Latest' },
      { id: 'ann_001', created_at: '2025-09-24T10:00:00Z', title: 'Older' },
    ];

    http.get.mockResolvedValue(mockSorted);

    // Act
    const result = await Announcement.list({ sort: '-created_at' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/announcements?sort=-created_at');
    expect(result[0].title).toBe('Latest'); // Newest first
  });

  it('should support limit parameter for pagination', async () => {
    // Arrange
    const mockLimited = [
      { id: 'ann_001', title: 'Announcement 1' },
      { id: 'ann_002', title: 'Announcement 2' },
      { id: 'ann_003', title: 'Announcement 3' },
    ];

    http.get.mockResolvedValue(mockLimited);

    // Act
    const result = await Announcement.list({ limit: 3 });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/announcements?limit=3');
    expect(result).toHaveLength(3);
  });

  it('should combine sort and limit parameters', async () => {
    // Arrange
    const mockData = [
      { id: 'ann_003', title: 'Latest' },
      { id: 'ann_002', title: 'Second' },
    ];

    http.get.mockResolvedValue(mockData);

    // Act
    const result = await Announcement.list({ sort: '-created_at', limit: 2 });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/announcements?sort=-created_at&limit=2');
    expect(result).toHaveLength(2);
  });

  it('should return empty array when no announcements exist', async () => {
    // Arrange
    http.get.mockResolvedValue([]);

    // Act
    const result = await Announcement.list();

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('Announcement API - get(id)', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should fetch single announcement by id', async () => {
    // Arrange
    const mockAnnouncement = {
      id: 'ann_001',
      title: '光復災區救援進度更新',
      body: '## 最新進度\n\n截至目前，已完成80%的清淤工作...\n\n### 感謝\n\n感謝所有志工的辛勞付出！',
      priority: 'high',
      author_id: 'admin_001',
      author_name: '系統管理員',
      created_at: '2025-09-24T10:00:00Z',
      updated_at: '2025-09-24T10:00:00Z',
    };

    http.get.mockResolvedValue(mockAnnouncement);

    // Act
    const result = await Announcement.get('ann_001');

    // Assert
    expect(http.get).toHaveBeenCalledWith('/announcements/ann_001');
    expect(result).toEqual(mockAnnouncement);
    expect(result.id).toBe('ann_001');
  });

  it('should throw 404 when announcement not found', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.get.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(Announcement.get('non_existent')).rejects.toThrow();
    expect(http.get).toHaveBeenCalledWith('/announcements/non_existent');
  });
});

describe('Announcement API - create(data)', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should successfully create announcement with title and body', async () => {
    // Arrange
    const newAnnouncement = {
      title: '重要公告：明日活動異動',
      body: '由於天氣因素，明日活動延期至下週舉行。',
    };

    const createdAnnouncement = {
      id: 'ann_new_001',
      ...newAnnouncement,
      priority: 'medium',
      author_id: 'admin_001',
      created_at: '2025-10-02T10:00:00Z',
      updated_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdAnnouncement);

    // Act
    const result = await Announcement.create(newAnnouncement);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/announcements', newAnnouncement);
    expect(result).toEqual(createdAnnouncement);
    expect(result.id).toBe('ann_new_001');
  });

  it('should support Markdown in body content', async () => {
    // Arrange
    const markdownAnnouncement = {
      title: 'Markdown 格式測試',
      body: `# 標題一\n\n## 標題二\n\n### 重點項目\n\n- 項目 1\n- 項目 2\n- 項目 3\n\n**粗體文字** 和 *斜體文字*\n\n> 引用區塊\n\n\`\`\`javascript\nconsole.log('Hello World');\n\`\`\``,
    };

    http.post.mockResolvedValue({
      id: 'ann_markdown_001',
      ...markdownAnnouncement,
      created_at: '2025-10-02T10:00:00Z',
    });

    // Act
    const result = await Announcement.create(markdownAnnouncement);

    // Assert
    expect(result.body).toContain('# 標題一');
    expect(result.body).toContain('**粗體文字**');
    expect(result.body).toContain('```javascript');
  });

  it('should create announcement with priority', async () => {
    // Arrange
    const urgentAnnouncement = {
      title: '緊急通知',
      body: '請所有志工立即返回集合點',
      priority: 'urgent',
    };

    http.post.mockResolvedValue({
      id: 'ann_urgent_001',
      ...urgentAnnouncement,
      created_at: '2025-10-02T10:00:00Z',
    });

    // Act
    const result = await Announcement.create(urgentAnnouncement);

    // Assert
    expect(result.priority).toBe('urgent');
  });

  it('should ONLY allow Admin to create announcements (403 Forbidden)', async () => {
    // Arrange
    const newAnnouncement = {
      title: '測試公告',
      body: '測試內容',
    };

    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only administrators can create announcements',
    });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(Announcement.create(newAnnouncement)).rejects.toThrow();

    try {
      await Announcement.create(newAnnouncement);
    } catch (error) {
      expect(error.status).toBe(403);
      expect(error.statusText).toBe('Forbidden');
    }
  });

  it('should require authentication (401 Unauthorized)', async () => {
    // Arrange
    const newAnnouncement = {
      title: '測試公告',
      body: '測試內容',
    };

    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';
    authError.body = JSON.stringify({ message: 'Authentication required' });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(Announcement.create(newAnnouncement)).rejects.toThrow();

    try {
      await Announcement.create(newAnnouncement);
    } catch (error) {
      expect(error.status).toBe(401);
    }
  });

  it('should validate required title field', async () => {
    // Arrange
    const invalidAnnouncement = {
      // Missing title
      body: '只有內容沒有標題',
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'title',
        message: 'Title is required',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(Announcement.create(invalidAnnouncement)).rejects.toThrow();
  });

  it('should validate required body field', async () => {
    // Arrange
    const invalidAnnouncement = {
      title: '只有標題',
      // Missing body
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'body',
        message: 'Body is required',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(Announcement.create(invalidAnnouncement)).rejects.toThrow();
  });
});

describe('Announcement API - update(id, data)', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should successfully update announcement (admin only)', async () => {
    // Arrange
    const updates = {
      title: '更新後的標題',
      body: '更新後的內容',
    };

    const updatedAnnouncement = {
      id: 'ann_001',
      title: '更新後的標題',
      body: '更新後的內容',
      priority: 'high',
      created_at: '2025-09-24T10:00:00Z',
      updated_at: '2025-10-02T12:00:00Z',
    };

    http.put.mockResolvedValue(updatedAnnouncement);

    // Act
    const result = await Announcement.update('ann_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/announcements/ann_001', updates);
    expect(result).toEqual(updatedAnnouncement);
    expect(result.title).toBe('更新後的標題');
  });

  it('should ONLY allow Admin to update (403 Forbidden)', async () => {
    // Arrange
    const updates = {
      title: '嘗試更新',
      body: '無權限用戶',
    };

    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only administrators can update announcements',
    });

    http.put.mockRejectedValue(authError);

    // Act & Assert
    await expect(Announcement.update('ann_001', updates)).rejects.toThrow();

    try {
      await Announcement.update('ann_001', updates);
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });

  it('should support partial update', async () => {
    // Arrange
    const partialUpdate = {
      priority: 'urgent',
    };

    const updated = {
      id: 'ann_001',
      title: '原標題',
      body: '原內容',
      priority: 'urgent',
      updated_at: '2025-10-02T13:00:00Z',
    };

    http.put.mockResolvedValue(updated);

    // Act
    const result = await Announcement.update('ann_001', partialUpdate);

    // Assert
    expect(result.priority).toBe('urgent');
    expect(result.title).toBe('原標題'); // Unchanged
  });
});

describe('Announcement API - delete(id)', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should successfully delete announcement (admin only)', async () => {
    // Arrange
    http.delete.mockResolvedValue({
      success: true,
      message: 'Announcement deleted',
    });

    // Act
    const result = await Announcement.delete('ann_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/announcements/ann_001');
    expect(result.success).toBe(true);
  });

  it('should ONLY allow Admin to delete (403 Forbidden)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only administrators can delete announcements',
    });

    http.delete.mockRejectedValue(authError);

    // Act & Assert
    await expect(Announcement.delete('ann_001')).rejects.toThrow();

    try {
      await Announcement.delete('ann_001');
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });

  it('should throw 404 when deleting non-existent announcement', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.delete.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(Announcement.delete('non_existent')).rejects.toThrow();
  });
});

describe('Announcement API - Integration Scenarios', () => {
  let Announcement;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/announcements.js');
    Announcement = module.Announcement;
  });

  it('should complete admin-only CRUD lifecycle', async () => {
    // ========== CREATE (Admin Only) ==========
    const newAnnouncement = {
      title: '測試公告',
      body: '測試內容',
    };

    const created = {
      id: 'ann_test_001',
      ...newAnnouncement,
      created_at: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(created);
    const createdResult = await Announcement.create(newAnnouncement);
    expect(createdResult.id).toBe('ann_test_001');

    // ========== READ (Public) ==========
    http.get.mockResolvedValue(created);
    const fetched = await Announcement.get('ann_test_001');
    expect(fetched).toEqual(created);

    // ========== UPDATE (Admin Only) ==========
    const updates = {
      title: '已更新的公告',
      body: '已更新的內容',
    };

    const updated = {
      ...created,
      ...updates,
      updated_at: '2025-10-02T11:00:00Z',
    };

    http.put.mockResolvedValue(updated);
    const updatedResult = await Announcement.update('ann_test_001', updates);
    expect(updatedResult.title).toBe('已更新的公告');

    // ========== DELETE (Admin Only) ==========
    http.delete.mockResolvedValue({ success: true });
    const deleted = await Announcement.delete('ann_test_001');
    expect(deleted.success).toBe(true);

    // ========== VERIFY DELETE ==========
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    http.get.mockRejectedValue(notFoundError);

    await expect(Announcement.get('ann_test_001')).rejects.toThrow();
  });
});
