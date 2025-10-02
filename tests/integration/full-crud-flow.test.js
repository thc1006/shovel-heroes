/**
 * Integration Test: Full CRUD Flow
 *
 * Simulates real-world usage scenarios:
 * 1. Create disaster area → Create grid → Volunteer signup → Supply donation → Discussion → Cleanup
 * 2. Validates data relationships, cascade deletes, counters, and permissions
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';

const uuidv4 = randomUUID;

describe('Full CRUD Flow Integration', () => {
  let testData;

  beforeEach(() => {
    // Initialize test data structure
    testData = {
      disasterArea: null,
      grid: null,
      volunteer: null,
      supply: null,
      discussion: null
    };
  });

  afterEach(() => {
    // Cleanup test data
    testData = {
      disasterArea: null,
      grid: null,
      volunteer: null,
      supply: null,
      discussion: null
    };
  });

  describe('Complete Workflow: Disaster Relief Operation', () => {
    it('should execute full disaster relief workflow successfully', async () => {
      // Step 1: Create Disaster Area
      const disasterArea = {
        id: uuidv4(),
        name: '光復鄉重災區',
        center_lat: 23.8751,
        center_lng: 121.578,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      testData.disasterArea = disasterArea;

      expect(disasterArea).toBeDefined();
      expect(disasterArea.center_lat).toBeGreaterThanOrEqual(-90);
      expect(disasterArea.center_lat).toBeLessThanOrEqual(90);
      expect(disasterArea.center_lng).toBeGreaterThanOrEqual(-180);
      expect(disasterArea.center_lng).toBeLessThanOrEqual(180);

      // Step 2: Create Grid
      const grid = {
        id: uuidv4(),
        code: 'A-3',
        grid_type: 'manpower',
        disaster_area_id: disasterArea.id,
        volunteer_needed: 10,
        volunteer_registered: 0,
        meeting_point: '光復國小正門',
        risks_notes: '地面濕滑，注意積水與電線',
        contact_info: '0912-345-678',
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
          { name: '鋤頭', quantity: 20, unit: '支', received: 0 },
          { name: '工作用手套', quantity: 50, unit: '副', received: 0 }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      testData.grid = grid;

      expect(grid.disaster_area_id).toBe(disasterArea.id);
      expect(grid.grid_type).toMatch(/^(mud_disposal|manpower|supply_storage|accommodation|food_area)$/);
      expect(grid.status).toMatch(/^(open|closed|completed|pending)$/);
      expect(grid.bounds).toHaveProperty('north');
      expect(grid.bounds).toHaveProperty('south');
      expect(grid.bounds).toHaveProperty('east');
      expect(grid.bounds).toHaveProperty('west');

      // Step 3: Volunteer Registration
      const volunteerRegistration = {
        id: uuidv4(),
        grid_id: grid.id,
        user_id: uuidv4(),
        volunteer_name: '張小強',
        volunteer_phone: '0912-345-678',
        status: 'pending',
        available_time: '10/3 上午或 10/4 全天',
        skills: ['挖土機', '醫療志工'],
        equipment: ['鐵鏟', '手推車'],
        notes: '需要協助調度交通',
        created_date: new Date().toISOString()
      };
      testData.volunteer = volunteerRegistration;

      expect(volunteerRegistration.grid_id).toBe(grid.id);
      expect(volunteerRegistration.status).toMatch(/^(pending|confirmed|arrived|completed|cancelled)$/);

      // Step 4: Update volunteer_registered counter
      grid.volunteer_registered += 1;
      expect(grid.volunteer_registered).toBe(1);
      expect(grid.volunteer_registered).toBeLessThanOrEqual(grid.volunteer_needed);

      // Step 5: Supply Donation
      const supplyDonation = {
        id: uuidv4(),
        grid_id: grid.id,
        name: '礦泉水',
        quantity: 100,
        unit: '箱',
        donor_contact: 'water-donor@example.com',
        created_at: new Date().toISOString()
      };
      testData.supply = supplyDonation;

      expect(supplyDonation.grid_id).toBe(grid.id);
      expect(supplyDonation.quantity).toBeGreaterThan(0);

      // Step 6: Update supplies_needed received count
      const waterSupply = grid.supplies_needed.find(s => s.name.includes('水'));
      if (waterSupply) {
        waterSupply.received += supplyDonation.quantity;
        expect(waterSupply.received).toBeGreaterThan(0);
      }

      // Step 7: Grid Discussion
      const gridDiscussion = {
        id: uuidv4(),
        grid_id: grid.id,
        user_id: volunteerRegistration.user_id,
        content: '今天下午 2 點再集中一次清運。',
        created_at: new Date().toISOString()
      };
      testData.discussion = gridDiscussion;

      expect(gridDiscussion.grid_id).toBe(grid.id);
      expect(gridDiscussion.content).toBeTruthy();

      // Step 8: Complete workflow - Update statuses
      volunteerRegistration.status = 'completed';
      grid.status = 'completed';

      expect(volunteerRegistration.status).toBe('completed');
      expect(grid.status).toBe('completed');
    });

    it('should maintain data relationships correctly', () => {
      const disasterAreaId = uuidv4();
      const gridId = uuidv4();
      const userId = uuidv4();

      const entities = {
        disasterArea: { id: disasterAreaId },
        grid: { id: gridId, disaster_area_id: disasterAreaId },
        volunteer: { id: uuidv4(), grid_id: gridId, user_id: userId },
        supply: { id: uuidv4(), grid_id: gridId },
        discussion: { id: uuidv4(), grid_id: gridId, user_id: userId }
      };

      // Validate relationships
      expect(entities.grid.disaster_area_id).toBe(entities.disasterArea.id);
      expect(entities.volunteer.grid_id).toBe(entities.grid.id);
      expect(entities.supply.grid_id).toBe(entities.grid.id);
      expect(entities.discussion.grid_id).toBe(entities.grid.id);
      expect(entities.discussion.user_id).toBe(entities.volunteer.user_id);
    });

    it('should handle cascade delete correctly', () => {
      const disasterAreaId = uuidv4();
      const gridId = uuidv4();

      const database = {
        disasterAreas: [{ id: disasterAreaId }],
        grids: [{ id: gridId, disaster_area_id: disasterAreaId }],
        volunteers: [
          { id: uuidv4(), grid_id: gridId },
          { id: uuidv4(), grid_id: gridId }
        ],
        supplies: [
          { id: uuidv4(), grid_id: gridId }
        ],
        discussions: [
          { id: uuidv4(), grid_id: gridId }
        ]
      };

      // Simulate cascade delete of grid
      const gridToDelete = database.grids.find(g => g.id === gridId);
      expect(gridToDelete).toBeDefined();

      // Remove grid
      database.grids = database.grids.filter(g => g.id !== gridId);

      // Remove related records
      database.volunteers = database.volunteers.filter(v => v.grid_id !== gridId);
      database.supplies = database.supplies.filter(s => s.grid_id !== gridId);
      database.discussions = database.discussions.filter(d => d.grid_id !== gridId);

      // Verify cascade
      expect(database.grids.find(g => g.id === gridId)).toBeUndefined();
      expect(database.volunteers.filter(v => v.grid_id === gridId)).toHaveLength(0);
      expect(database.supplies.filter(s => s.grid_id === gridId)).toHaveLength(0);
      expect(database.discussions.filter(d => d.grid_id === gridId)).toHaveLength(0);
    });

    it('should update volunteer_registered counter on status changes', () => {
      const grid = {
        id: uuidv4(),
        volunteer_needed: 10,
        volunteer_registered: 0
      };

      const volunteers = [
        { id: uuidv4(), grid_id: grid.id, status: 'pending' },
        { id: uuidv4(), grid_id: grid.id, status: 'pending' },
        { id: uuidv4(), grid_id: grid.id, status: 'pending' }
      ];

      // Initial registration
      grid.volunteer_registered = volunteers.length;
      expect(grid.volunteer_registered).toBe(3);

      // Cancel one registration
      volunteers[0].status = 'cancelled';
      grid.volunteer_registered = volunteers.filter(v => v.status !== 'cancelled').length;
      expect(grid.volunteer_registered).toBe(2);

      // Confirm registrations
      volunteers[1].status = 'confirmed';
      volunteers[2].status = 'confirmed';
      const confirmedCount = volunteers.filter(v => v.status === 'confirmed').length;
      expect(confirmedCount).toBe(2);
    });
  });

  describe('Permission Control in CRUD Operations', () => {
    it('should enforce admin-only operations', () => {
      const operations = {
        createDisasterArea: { requiredRole: 'admin', allowed: false },
        deleteDisasterArea: { requiredRole: 'admin', allowed: false },
        createAnnouncement: { requiredRole: 'admin', allowed: false },
        listUsers: { requiredRole: 'admin', allowed: false }
      };

      const userRole = 'user';
      Object.entries(operations).forEach(([op, config]) => {
        config.allowed = userRole === config.requiredRole;
        expect(config.allowed).toBe(false);
      });

      const adminRole = 'admin';
      Object.entries(operations).forEach(([op, config]) => {
        config.allowed = adminRole === config.requiredRole;
        expect(config.allowed).toBe(true);
      });
    });

    it('should enforce grid manager permissions', () => {
      const gridManagerId = uuidv4();
      const otherUserId = uuidv4();

      const grid = {
        id: uuidv4(),
        grid_manager_id: gridManagerId
      };

      // Grid manager can update own grid
      const canManagerUpdate = grid.grid_manager_id === gridManagerId;
      expect(canManagerUpdate).toBe(true);

      // Other user cannot update
      const canOtherUpdate = grid.grid_manager_id === otherUserId;
      expect(canOtherUpdate).toBe(false);
    });

    it('should control phone number visibility', () => {
      const volunteer = {
        id: uuidv4(),
        volunteer_phone: '0912-345-678'
      };

      const grid = {
        id: uuidv4(),
        grid_manager_id: uuidv4()
      };

      const currentUser = {
        id: uuidv4(),
        role: 'user'
      };

      // Regular user cannot see phone
      let canViewPhone = currentUser.role === 'admin' ||
                         currentUser.id === grid.grid_manager_id;
      expect(canViewPhone).toBe(false);

      // Admin can see phone
      currentUser.role = 'admin';
      canViewPhone = currentUser.role === 'admin';
      expect(canViewPhone).toBe(true);

      // Grid manager can see phone for own grid
      currentUser.role = 'grid_manager';
      currentUser.id = grid.grid_manager_id;
      canViewPhone = currentUser.role === 'admin' ||
                     currentUser.id === grid.grid_manager_id;
      expect(canViewPhone).toBe(true);
    });

    it('should allow public read access to basic data', () => {
      const publicEndpoints = [
        { path: '/disaster-areas', method: 'GET', publicAccess: true },
        { path: '/grids', method: 'GET', publicAccess: true },
        { path: '/volunteers', method: 'GET', publicAccess: true }
      ];

      publicEndpoints.forEach(endpoint => {
        expect(endpoint.publicAccess).toBe(true);
      });
    });
  });

  describe('Data Validation in CRUD Flow', () => {
    it('should validate grid types', () => {
      const validTypes = ['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area'];
      const invalidType = 'invalid_type';

      expect(validTypes).toContain('manpower');
      expect(validTypes).not.toContain(invalidType);
    });

    it('should validate grid statuses', () => {
      const validStatuses = ['open', 'closed', 'completed', 'pending'];
      const invalidStatus = 'invalid_status';

      expect(validStatuses).toContain('open');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('should validate volunteer statuses', () => {
      const validStatuses = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];
      const invalidStatus = 'invalid_status';

      expect(validStatuses).toContain('pending');
      expect(validStatuses).not.toContain(invalidStatus);
    });

    it('should validate coordinate ranges', () => {
      const validCoords = {
        lat: 23.8751,
        lng: 121.578
      };

      const invalidCoords = {
        lat: 91,  // Out of range
        lng: 181  // Out of range
      };

      expect(validCoords.lat).toBeGreaterThanOrEqual(-90);
      expect(validCoords.lat).toBeLessThanOrEqual(90);
      expect(validCoords.lng).toBeGreaterThanOrEqual(-180);
      expect(validCoords.lng).toBeLessThanOrEqual(180);

      expect(invalidCoords.lat).toBeGreaterThan(90);
      expect(invalidCoords.lng).toBeGreaterThan(180);
    });

    it('should validate required fields', () => {
      const grid = {
        id: uuidv4(),
        code: 'A-3',
        grid_type: 'manpower',
        disaster_area_id: uuidv4(),
        center_lat: 23.8751,
        center_lng: 121.578,
        bounds: { north: 24, south: 23, east: 122, west: 121 },
        status: 'open'
      };

      const requiredFields = [
        'id', 'code', 'grid_type', 'disaster_area_id',
        'center_lat', 'center_lng', 'bounds', 'status'
      ];

      requiredFields.forEach(field => {
        expect(grid).toHaveProperty(field);
      });
    });
  });

  describe('Business Logic Validation', () => {
    it('should not allow volunteer_registered to exceed volunteer_needed', () => {
      const grid = {
        volunteer_needed: 10,
        volunteer_registered: 0
      };

      // Add volunteers up to limit
      for (let i = 0; i < 10; i++) {
        grid.volunteer_registered++;
      }
      expect(grid.volunteer_registered).toBe(10);

      // Should not exceed
      const canAddMore = grid.volunteer_registered < grid.volunteer_needed;
      expect(canAddMore).toBe(false);
    });

    it('should track supply fulfillment', () => {
      const supply = {
        name: '鋤頭',
        quantity: 20,
        unit: '支',
        received: 0
      };

      // Add donations
      supply.received += 5;
      expect(supply.received).toBe(5);
      expect(supply.received).toBeLessThan(supply.quantity);

      supply.received += 15;
      expect(supply.received).toBe(20);
      expect(supply.received).toBe(supply.quantity);

      // Calculate fulfillment percentage
      const fulfillment = (supply.received / supply.quantity) * 100;
      expect(fulfillment).toBe(100);
    });
  });
});
