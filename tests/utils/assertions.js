/**
 * Test Assertions Utilities
 */

export function expectValidDisasterArea(obj) {
  if (!obj) throw new Error('DisasterArea object is null or undefined');
  
  const requiredFields = ['id', 'name', 'center_lat', 'center_lng', 'created_at', 'updated_at'];
  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (typeof obj.id !== 'string') throw new Error('id must be string');
  if (typeof obj.name !== 'string') throw new Error('name must be string');
  if (typeof obj.center_lat !== 'number') throw new Error('center_lat must be number');
  if (typeof obj.center_lng !== 'number') throw new Error('center_lng must be number');
  
  if (obj.center_lat < -90 || obj.center_lat > 90) {
    throw new Error('center_lat must be between -90 and 90');
  }
  if (obj.center_lng < -180 || obj.center_lng > 180) {
    throw new Error('center_lng must be between -180 and 180');
  }
  
  return true;
}

export function expectValidGrid(obj) {
  if (!obj) throw new Error('Grid object is null or undefined');
  
  const requiredFields = [
    'id', 'code', 'grid_type', 'disaster_area_id',
    'volunteer_needed', 'volunteer_registered',
    'center_lat', 'center_lng', 'status'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  const validGridTypes = ['mud_disposal', 'manpower', 'supply_storage', 'accommodation', 'food_area'];
  if (!validGridTypes.includes(obj.grid_type)) {
    throw new Error(`Invalid grid_type: ${obj.grid_type}`);
  }
  
  const validStatuses = ['open', 'closed', 'completed', 'pending'];
  if (!validStatuses.includes(obj.status)) {
    throw new Error(`Invalid status: ${obj.status}`);
  }
  
  if (obj.volunteer_needed < 0) {
    throw new Error('volunteer_needed must be >= 0');
  }
  if (obj.volunteer_registered < 0) {
    throw new Error('volunteer_registered must be >= 0');
  }
  
  return true;
}

export function expectValidVolunteer(obj, canViewPhone = false) {
  if (!obj) throw new Error('Volunteer object is null or undefined');
  
  const requiredFields = [
    'id', 'grid_id', 'user_id', 'volunteer_name', 'status', 'created_date'
  ];
  
  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  const validStatuses = ['pending', 'confirmed', 'arrived', 'completed', 'cancelled'];
  if (!validStatuses.includes(obj.status)) {
    throw new Error(`Invalid status: ${obj.status}`);
  }
  
  if (canViewPhone) {
    if (!('volunteer_phone' in obj)) {
      throw new Error('Expected volunteer_phone field when canViewPhone is true');
    }
  } else {
    if ('volunteer_phone' in obj) {
      throw new Error('volunteer_phone should not be present when canViewPhone is false');
    }
  }
  
  return true;
}

export function expectAPIError(error, expectedStatus = null) {
  if (!error) throw new Error('Error object is null or undefined');
  
  if (!error.message) {
    throw new Error('Error must have message field');
  }
  
  if (expectedStatus !== null) {
    const actualStatus = error.status || error.statusCode;
    if (actualStatus !== expectedStatus) {
      throw new Error(`Expected status ${expectedStatus}, got ${actualStatus}`);
    }
  }
  
  return true;
}

export default {
  expectValidDisasterArea,
  expectValidGrid,
  expectValidVolunteer,
  expectAPIError
};
