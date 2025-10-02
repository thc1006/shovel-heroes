/**
 * Test Helpers Utilities
 */

export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

export async function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export function createMockUser(role = 'user') {
  const users = {
    admin: {
      id: 'user_admin',
      name: 'Admin User',
      email: 'admin@example.org',
      role: 'admin'
    },
    grid_manager: {
      id: 'user_manager',
      name: 'Grid Manager',
      email: 'manager@example.org',
      role: 'grid_manager'
    },
    user: {
      id: 'user_volunteer',
      name: 'Volunteer',
      email: 'volunteer@example.org',
      role: 'user'
    }
  };
  
  return users[role] || users.user;
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function mockLocalStorage() {
  const store = {};
  
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(key => delete store[key]); },
    get length() { return Object.keys(store).length; }
  };
}

export const randomData = {
  id: () => 'test_' + Math.random().toString(36).substr(2, 9),
  
  disasterArea: () => ({
    id: randomData.id(),
    name: 'Test Area ' + Math.floor(Math.random() * 100),
    center_lat: 23.5 + Math.random() * 0.5,
    center_lng: 121.0 + Math.random() * 0.5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),
  
  grid: (disasterAreaId = 'area_test') => ({
    id: randomData.id(),
    code: 'T-' + Math.floor(Math.random() * 100),
    grid_type: ['manpower', 'mud_disposal', 'supply_storage'][Math.floor(Math.random() * 3)],
    disaster_area_id: disasterAreaId,
    volunteer_needed: Math.floor(Math.random() * 20),
    volunteer_registered: Math.floor(Math.random() * 10),
    center_lat: 23.5 + Math.random() * 0.5,
    center_lng: 121.0 + Math.random() * 0.5,
    status: ['open', 'closed', 'pending'][Math.floor(Math.random() * 3)],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
};

export default {
  waitFor,
  flushPromises,
  createMockUser,
  delay,
  mockLocalStorage,
  randomData
};
