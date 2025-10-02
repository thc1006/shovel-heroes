/**
 * Supply Donations Endpoint Test Suite
 *
 * TDD London School Approach:
 * - Mock HTTP client interactions
 * - Verify API endpoint paths and parameters
 * - Test validation, authorization, and PII protection
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

describe('SupplyDonation API - list()', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should fetch all supply donations successfully', async () => {
    // Arrange
    const mockDonations = [
      {
        id: 'supply_001',
        grid_id: 'grid_001',
        supply_name: '礦泉水',
        quantity: 100,
        unit: '箱',
        donor_name: '愛心企業A',
        status: 'confirmed',
        delivery_method: 'direct',
        created_date: '2025-09-24T10:00:00Z',
      },
      {
        id: 'supply_002',
        grid_id: 'grid_002',
        supply_name: '便當',
        quantity: 200,
        unit: '個',
        donor_name: '愛心企業B',
        status: 'delivered',
        delivery_method: 'pickup_point',
        created_date: '2025-09-24T11:00:00Z',
      },
    ];

    http.get.mockResolvedValue(mockDonations);

    // Act
    const result = await SupplyDonation.list();

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations');
    expect(result).toEqual(mockDonations);
    expect(result).toHaveLength(2);
  });

  it('should filter donations by grid_id', async () => {
    // Arrange
    const mockFiltered = [
      {
        id: 'supply_001',
        grid_id: 'grid_001',
        supply_name: '礦泉水',
        quantity: 100,
        unit: '箱',
        status: 'confirmed',
      },
    ];

    http.get.mockResolvedValue(mockFiltered);

    // Act
    const result = await SupplyDonation.list({ grid_id: 'grid_001' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?grid_id=grid_001');
    expect(result).toHaveLength(1);
    expect(result[0].grid_id).toBe('grid_001');
  });

  it('should filter donations by status - pledged', async () => {
    // Arrange
    const mockPledged = [
      {
        id: 'supply_003',
        supply_name: '睡袋',
        status: 'pledged',
      },
    ];

    http.get.mockResolvedValue(mockPledged);

    // Act
    const result = await SupplyDonation.list({ status: 'pledged' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=pledged');
    expect(result[0].status).toBe('pledged');
  });

  it('should filter donations by status - confirmed', async () => {
    // Arrange
    http.get.mockResolvedValue([{ id: 's1', status: 'confirmed' }]);

    // Act
    const result = await SupplyDonation.list({ status: 'confirmed' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=confirmed');
  });

  it('should filter donations by status - in_transit', async () => {
    // Arrange
    http.get.mockResolvedValue([{ id: 's1', status: 'in_transit' }]);

    // Act
    const result = await SupplyDonation.list({ status: 'in_transit' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=in_transit');
  });

  it('should filter donations by status - delivered', async () => {
    // Arrange
    http.get.mockResolvedValue([{ id: 's1', status: 'delivered' }]);

    // Act
    const result = await SupplyDonation.list({ status: 'delivered' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=delivered');
  });

  it('should filter donations by status - cancelled', async () => {
    // Arrange
    http.get.mockResolvedValue([{ id: 's1', status: 'cancelled' }]);

    // Act
    const result = await SupplyDonation.list({ status: 'cancelled' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=cancelled');
  });

  it('should support sorting by -created_date (descending)', async () => {
    // Arrange
    const mockSorted = [
      { id: 'supply_002', created_date: '2025-09-24T11:00:00Z' },
      { id: 'supply_001', created_date: '2025-09-24T10:00:00Z' },
    ];

    http.get.mockResolvedValue(mockSorted);

    // Act
    const result = await SupplyDonation.list({ sort: '-created_date' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?sort=-created_date');
    expect(result[0].id).toBe('supply_002'); // Newest first
  });

  it('should return empty array when no donations exist', async () => {
    // Arrange
    http.get.mockResolvedValue([]);

    // Act
    const result = await SupplyDonation.list();

    // Assert
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});

describe('SupplyDonation API - get(id)', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should fetch single donation by id', async () => {
    // Arrange
    const mockDonation = {
      id: 'supply_001',
      grid_id: 'grid_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '愛心企業A',
      donor_phone: '0912345678', // PII - should be controlled
      delivery_method: 'direct',
      status: 'confirmed',
      notes: '請於下午3點前送達',
      created_date: '2025-09-24T10:00:00Z',
    };

    http.get.mockResolvedValue(mockDonation);

    // Act
    const result = await SupplyDonation.get('supply_001');

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations/supply_001');
    expect(result).toEqual(mockDonation);
    expect(result.id).toBe('supply_001');
  });

  it('should throw 404 when donation not found', async () => {
    // Arrange
    const notFoundError = new Error('Request failed with status 404');
    notFoundError.status = 404;
    notFoundError.statusText = 'Not Found';

    http.get.mockRejectedValue(notFoundError);

    // Act & Assert
    await expect(SupplyDonation.get('non_existent')).rejects.toThrow();
    expect(http.get).toHaveBeenCalledWith('/supply-donations/non_existent');
  });
});

describe('SupplyDonation API - create(data)', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should successfully create donation record', async () => {
    // Arrange
    const newDonation = {
      grid_id: 'grid_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '愛心企業A',
      donor_phone: '0912345678',
      delivery_method: 'direct',
      status: 'pledged',
      notes: '下週一配送',
    };

    const createdDonation = {
      id: 'supply_new_001',
      ...newDonation,
      created_date: '2025-10-02T10:00:00Z',
      updated_date: '2025-10-02T10:00:00Z',
    };

    http.post.mockResolvedValue(createdDonation);

    // Act
    const result = await SupplyDonation.create(newDonation);

    // Assert
    expect(http.post).toHaveBeenCalledWith('/supply-donations', newDonation);
    expect(result).toEqual(createdDonation);
    expect(result.id).toBe('supply_new_001');
  });

  it('should create donation with complete fields', async () => {
    // Arrange
    const completeDonation = {
      grid_id: 'grid_001',
      supply_name: '睡袋',
      quantity: 50,
      unit: '個',
      donor_name: '張三',
      donor_phone: '0987654321',
      donor_email: 'zhang@example.com',
      delivery_method: 'pickup_point',
      pickup_address: '花蓮縣光復鄉中正路100號',
      expected_delivery_date: '2025-10-05',
      status: 'confirmed',
      notes: '需要冷藏',
    };

    http.post.mockResolvedValue({
      id: 'supply_complete_001',
      ...completeDonation,
      created_date: '2025-10-02T10:00:00Z',
    });

    // Act
    const result = await SupplyDonation.create(completeDonation);

    // Assert
    expect(result.donor_email).toBe('zhang@example.com');
    expect(result.pickup_address).toBe('花蓮縣光復鄉中正路100號');
    expect(result.expected_delivery_date).toBe('2025-10-05');
  });

  it('should reject invalid delivery_method - not in enum', async () => {
    // Arrange
    const invalidDonation = {
      grid_id: 'grid_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '愛心企業',
      delivery_method: 'invalid_method', // Invalid
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'delivery_method',
        message: 'delivery_method must be one of: direct, pickup_point, volunteer_pickup',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(SupplyDonation.create(invalidDonation)).rejects.toThrow();
  });

  it('should accept delivery_method: direct', async () => {
    // Arrange
    const donation = {
      grid_id: 'grid_001',
      supply_name: '物資',
      quantity: 10,
      unit: '箱',
      donor_name: '企業A',
      delivery_method: 'direct',
    };

    http.post.mockResolvedValue({ id: 's1', ...donation });

    // Act
    const result = await SupplyDonation.create(donation);

    // Assert
    expect(result.delivery_method).toBe('direct');
  });

  it('should accept delivery_method: pickup_point', async () => {
    // Arrange
    const donation = {
      grid_id: 'grid_001',
      supply_name: '物資',
      quantity: 10,
      unit: '箱',
      donor_name: '企業B',
      delivery_method: 'pickup_point',
    };

    http.post.mockResolvedValue({ id: 's2', ...donation });

    // Act
    const result = await SupplyDonation.create(donation);

    // Assert
    expect(result.delivery_method).toBe('pickup_point');
  });

  it('should accept delivery_method: volunteer_pickup', async () => {
    // Arrange
    const donation = {
      grid_id: 'grid_001',
      supply_name: '物資',
      quantity: 10,
      unit: '箱',
      donor_name: '企業C',
      delivery_method: 'volunteer_pickup',
    };

    http.post.mockResolvedValue({ id: 's3', ...donation });

    // Act
    const result = await SupplyDonation.create(donation);

    // Assert
    expect(result.delivery_method).toBe('volunteer_pickup');
  });

  it('should reject invalid status - not in enum', async () => {
    // Arrange
    const invalidDonation = {
      grid_id: 'grid_001',
      supply_name: '物資',
      quantity: 10,
      unit: '箱',
      donor_name: '企業',
      delivery_method: 'direct',
      status: 'invalid_status', // Invalid
    };

    const validationError = new Error('Request failed with status 400');
    validationError.status = 400;
    validationError.body = JSON.stringify({
      message: 'Validation failed',
      errors: [{
        field: 'status',
        message: 'status must be one of: pledged, confirmed, in_transit, delivered, cancelled',
      }],
    });

    http.post.mockRejectedValue(validationError);

    // Act & Assert
    await expect(SupplyDonation.create(invalidDonation)).rejects.toThrow();
  });

  it('should require Bearer token (401 Unauthorized)', async () => {
    // Arrange
    const newDonation = {
      grid_id: 'grid_001',
      supply_name: '物資',
      quantity: 10,
      unit: '箱',
      donor_name: '企業',
      delivery_method: 'direct',
    };

    const authError = new Error('Request failed with status 401');
    authError.status = 401;
    authError.statusText = 'Unauthorized';
    authError.body = JSON.stringify({ message: 'Authentication required' });

    http.post.mockRejectedValue(authError);

    // Act & Assert
    await expect(SupplyDonation.create(newDonation)).rejects.toThrow();

    try {
      await SupplyDonation.create(newDonation);
    } catch (error) {
      expect(error.status).toBe(401);
      expect(error.statusText).toBe('Unauthorized');
    }
  });
});

describe('SupplyDonation API - update(id, data)', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should successfully update donation status', async () => {
    // Arrange
    const updates = {
      status: 'delivered',
      actual_delivery_date: '2025-10-02',
    };

    const updatedDonation = {
      id: 'supply_001',
      grid_id: 'grid_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      status: 'delivered',
      actual_delivery_date: '2025-10-02',
      updated_date: '2025-10-02T12:00:00Z',
    };

    http.put.mockResolvedValue(updatedDonation);

    // Act
    const result = await SupplyDonation.update('supply_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/supply-donations/supply_001', updates);
    expect(result).toEqual(updatedDonation);
    expect(result.status).toBe('delivered');
  });

  it('should successfully update delivery information', async () => {
    // Arrange
    const updates = {
      delivery_method: 'volunteer_pickup',
      pickup_address: '花蓮縣光復鄉新地址',
      expected_delivery_date: '2025-10-05',
    };

    const updatedDonation = {
      id: 'supply_001',
      ...updates,
      updated_date: '2025-10-02T13:00:00Z',
    };

    http.put.mockResolvedValue(updatedDonation);

    // Act
    const result = await SupplyDonation.update('supply_001', updates);

    // Assert
    expect(http.put).toHaveBeenCalledWith('/supply-donations/supply_001', updates);
    expect(result.delivery_method).toBe('volunteer_pickup');
    expect(result.pickup_address).toBe('花蓮縣光復鄉新地址');
  });

  it('should check authorization for update (403 Forbidden)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only admin or grid_manager can update donations',
    });

    http.put.mockRejectedValue(authError);

    // Act & Assert
    await expect(
      SupplyDonation.update('supply_001', { status: 'delivered' })
    ).rejects.toThrow();

    try {
      await SupplyDonation.update('supply_001', { status: 'delivered' });
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });
});

describe('SupplyDonation API - delete(id)', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should successfully delete donation', async () => {
    // Arrange
    http.delete.mockResolvedValue({
      success: true,
      message: 'Supply donation deleted',
    });

    // Act
    const result = await SupplyDonation.delete('supply_001');

    // Assert
    expect(http.delete).toHaveBeenCalledWith('/supply-donations/supply_001');
    expect(result.success).toBe(true);
  });

  it('should check authorization for delete (403 Forbidden)', async () => {
    // Arrange
    const authError = new Error('Request failed with status 403');
    authError.status = 403;
    authError.statusText = 'Forbidden';
    authError.body = JSON.stringify({
      message: 'Only admin can delete donations',
    });

    http.delete.mockRejectedValue(authError);

    // Act & Assert
    await expect(SupplyDonation.delete('supply_001')).rejects.toThrow();

    try {
      await SupplyDonation.delete('supply_001');
    } catch (error) {
      expect(error.status).toBe(403);
    }
  });
});

describe('SupplyDonation API - filter()', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should be an alias for list() method', async () => {
    // Arrange
    const mockDonations = [
      { id: 'supply_001', status: 'confirmed' },
    ];

    http.get.mockResolvedValue(mockDonations);

    // Act
    const result = await SupplyDonation.filter({ status: 'confirmed' });

    // Assert
    expect(http.get).toHaveBeenCalledWith('/supply-donations?status=confirmed');
    expect(result).toEqual(mockDonations);
  });
});

describe('SupplyDonation API - PII Protection (donor_phone)', () => {
  let SupplyDonation;
  let http;

  beforeEach(async () => {
    vi.clearAllMocks();
    const clientModule = await import('../../../src/api/client.js');
    http = clientModule.http;
    const module = await import('../../../src/api/endpoints/supplies.js');
    SupplyDonation = module.SupplyDonation;
  });

  it('should hide donor_phone for non-admin users', async () => {
    // Arrange - Simulating backend response where donor_phone is masked
    const publicDonation = {
      id: 'supply_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '愛心企業A',
      donor_phone: null, // Hidden for non-admin
      status: 'confirmed',
    };

    http.get.mockResolvedValue(publicDonation);

    // Act
    const result = await SupplyDonation.get('supply_001');

    // Assert
    expect(result.donor_phone).toBeNull();
  });

  it('should show donor_phone for admin users', async () => {
    // Arrange - Simulating backend response with admin privileges
    const adminDonation = {
      id: 'supply_001',
      supply_name: '礦泉水',
      quantity: 100,
      unit: '箱',
      donor_name: '愛心企業A',
      donor_phone: '0912345678', // Visible for admin
      status: 'confirmed',
    };

    http.get.mockResolvedValue(adminDonation);

    // Act
    const result = await SupplyDonation.get('supply_001');

    // Assert
    expect(result.donor_phone).toBe('0912345678');
  });
});
