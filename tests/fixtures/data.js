/**
 * Test Fixtures - Mock Data
 * 符合 BACKEND_API_INTEGRATION_GUIDE.md 的資料結構
 */

/**
 * 災區 (Disaster Areas) Mock 資料
 */
export const mockDisasterAreas = [
  {
    id: 'area_01HZYQ9W123ABCDEF',
    name: '光復鄉重災區',
    center_lat: 23.8751,
    center_lng: 121.578,
    created_at: '2025-09-23T08:00:00Z',
    updated_at: '2025-09-23T08:00:00Z'
  },
  {
    id: 'area_01HZYQ9W456GHIJK',
    name: '富源村淹水區',
    center_lat: 23.8820,
    center_lng: 121.5650,
    created_at: '2025-09-23T09:30:00Z',
    updated_at: '2025-09-23T09:30:00Z'
  }
];

/**
 * 網格 (Grids) Mock 資料
 */
export const mockGrids = [
  {
    id: 'grid_01HZYQ9WABC123',
    code: 'A-1',
    grid_type: 'manpower',
    disaster_area_id: 'area_01HZYQ9W123ABCDEF',
    volunteer_needed: 10,
    volunteer_registered: 8,
    center_lat: 23.87525,
    center_lng: 121.57812,
    bounds: {
      north: 23.876,
      south: 23.874,
      east: 121.579,
      west: 121.577
    },
    status: 'open',
    supplies_needed: [
      { name: '鋤頭', quantity: 20, unit: '支', received: 15 }
    ],
    meeting_point: '光復國小正門',
    contact_info: '0912-345-678',
    created_at: '2025-09-23T08:30:00Z',
    updated_at: '2025-09-24T14:20:00Z'
  },
  {
    id: 'grid_01HZYQ9WDEF456',
    code: 'A-2',
    grid_type: 'mud_disposal',
    disaster_area_id: 'area_01HZYQ9W123ABCDEF',
    volunteer_needed: 0,
    volunteer_registered: 0,
    center_lat: 23.87600,
    center_lng: 121.57900,
    status: 'completed',
    created_at: '2025-09-23T09:00:00Z',
    updated_at: '2025-09-23T09:00:00Z'
  }
];

/**
 * 志工 Mock 資料
 */
export const mockVolunteers = [
  {
    id: 'reg_01HZYQ9WABC123',
    grid_id: 'grid_01HZYQ9WABC123',
    user_id: 'user_01',
    volunteer_name: '張小強',
    volunteer_phone: '0912-345-678',
    status: 'confirmed',
    created_date: '2025-10-02T09:00:00Z'
  }
];

/**
 * 物資 Mock 資料
 */
export const mockSupplies = [
  {
    id: 'donation_01',
    grid_id: 'grid_01HZYQ9WABC123',
    supply_name: '礦泉水',
    quantity: 100,
    unit: '箱',
    status: 'confirmed',
    created_date: '2025-10-02T08:00:00Z'
  }
];

export default {
  mockDisasterAreas,
  mockGrids,
  mockVolunteers,
  mockSupplies
};
