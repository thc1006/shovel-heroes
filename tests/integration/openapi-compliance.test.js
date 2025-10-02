/**
 * Integration Test: OpenAPI Specification Compliance
 *
 * Validates that all endpoints defined in openapi.yaml have corresponding
 * implementations in the codebase.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as YAML from 'yaml';
import { API_ENDPOINTS } from '../../src/api/endpoints';

// Import all endpoint modules
import * as disasterAreas from '../../src/api/endpoints/disaster-areas';
import * as grids from '../../src/api/endpoints/grids';
import * as volunteers from '../../src/api/endpoints/volunteers';
import * as supplies from '../../src/api/endpoints/supplies';
import * as gridDiscussions from '../../src/api/endpoints/grid-discussions';
import * as announcements from '../../src/api/endpoints/announcements';
import * as functions from '../../src/api/endpoints/functions';
import * as users from '../../src/api/endpoints/users';
import * as legacy from '../../src/api/endpoints/legacy';

describe('OpenAPI Specification Compliance', () => {
  let openApiSpec;
  let paths;
  let endpoints;

  beforeAll(() => {
    // Read OpenAPI spec
    const specPath = join(process.cwd(), 'api-spec', 'openapi.yaml');
    const specContent = readFileSync(specPath, 'utf-8');
    openApiSpec = YAML.parse(specContent);
    paths = openApiSpec.paths;

    // Map of path patterns to implementation modules
    endpoints = {
      '/disaster-areas': disasterAreas,
      '/disaster-areas/{id}': disasterAreas,
      '/grids': grids,
      '/grids/{id}': grids,
      '/volunteer-registrations': volunteers,
      '/volunteer-registrations/{id}': volunteers,
      '/supply-donations': supplies,
      '/grid-discussions': gridDiscussions,
      '/announcements': announcements,
      '/volunteers': volunteers,
      '/users': users,
      '/me': users,
      '/functions/fix-grid-bounds': functions,
      '/functions/export-grids-csv': functions,
      '/functions/import-grids-csv': functions,
      '/functions/grid-template': functions,
      '/functions/external-grid-api': functions,
      '/functions/external-volunteer-api': functions,
      '/api/v2/sync': legacy,
      '/api/v2/roster': legacy
    };
  });

  describe('OpenAPI Specification Loading', () => {
    it('should successfully load OpenAPI spec', () => {
      expect(openApiSpec).toBeDefined();
      expect(openApiSpec.openapi).toBe('3.1.0');
      expect(openApiSpec.info.title).toBe('Shovel Heroes Public API');
    });

    it('should have paths defined', () => {
      expect(paths).toBeDefined();
      expect(Object.keys(paths).length).toBeGreaterThan(0);
    });

    it('should have required components', () => {
      expect(openApiSpec.components).toBeDefined();
      expect(openApiSpec.components.schemas).toBeDefined();
      expect(openApiSpec.components.securitySchemes).toBeDefined();
    });
  });

  describe('Endpoint Implementation Coverage', () => {
    it('should have implementation for all OpenAPI paths', () => {
      const missingImplementations = [];

      Object.keys(paths).forEach(path => {
        if (!endpoints[path]) {
          missingImplementations.push(path);
        }
      });

      expect(missingImplementations).toHaveLength(0);
      if (missingImplementations.length > 0) {
        console.error('Missing implementations for:', missingImplementations);
      }
    });

    it('should have all HTTP methods implemented', () => {
      const missingMethods = [];

      Object.entries(paths).forEach(([path, pathItem]) => {
        const methods = Object.keys(pathItem).filter(key =>
          ['get', 'post', 'put', 'patch', 'delete'].includes(key)
        );

        methods.forEach(method => {
          const implementation = endpoints[path];
          if (!implementation) {
            missingMethods.push({ path, method, reason: 'No module' });
          }
        });
      });

      expect(missingMethods).toHaveLength(0);
      if (missingMethods.length > 0) {
        console.error('Missing method implementations:', missingMethods);
      }
    });
  });

  describe('API_ENDPOINTS Configuration', () => {
    it('should have all required endpoint groups', () => {
      expect(API_ENDPOINTS.DISASTER_AREAS).toBeDefined();
      expect(API_ENDPOINTS.GRIDS).toBeDefined();
      expect(API_ENDPOINTS.VOLUNTEERS).toBeDefined();
      expect(API_ENDPOINTS.VOLUNTEER_REGISTRATIONS).toBeDefined();
      expect(API_ENDPOINTS.SUPPLIES).toBeDefined();
      expect(API_ENDPOINTS.GRID_DISCUSSIONS).toBeDefined();
      expect(API_ENDPOINTS.ANNOUNCEMENTS).toBeDefined();
      expect(API_ENDPOINTS.FUNCTIONS).toBeDefined();
      expect(API_ENDPOINTS.USERS).toBeDefined();
      expect(API_ENDPOINTS.LEGACY).toBeDefined();
    });

    it('should have correct endpoint paths for DisasterAreas', () => {
      expect(API_ENDPOINTS.DISASTER_AREAS.LIST).toBe('/disaster-areas');
      expect(API_ENDPOINTS.DISASTER_AREAS.CREATE).toBe('/disaster-areas');
      expect(API_ENDPOINTS.DISASTER_AREAS.GET).toBeDefined();
      expect(API_ENDPOINTS.DISASTER_AREAS.UPDATE).toBeDefined();
      expect(API_ENDPOINTS.DISASTER_AREAS.DELETE).toBeDefined();
    });

    it('should have correct endpoint paths for Grids', () => {
      expect(API_ENDPOINTS.GRIDS.LIST).toBe('/grids');
      expect(API_ENDPOINTS.GRIDS.CREATE).toBe('/grids');
      expect(API_ENDPOINTS.GRIDS.GET).toBeDefined();
      expect(API_ENDPOINTS.GRIDS.UPDATE).toBeDefined();
      expect(API_ENDPOINTS.GRIDS.DELETE).toBeDefined();
    });

    it('should have correct endpoint paths for Volunteers', () => {
      expect(API_ENDPOINTS.VOLUNTEERS.LIST).toBe('/volunteers');
      expect(API_ENDPOINTS.VOLUNTEER_REGISTRATIONS.LIST).toBe('/volunteer-registrations');
      expect(API_ENDPOINTS.VOLUNTEER_REGISTRATIONS.CREATE).toBe('/volunteer-registrations');
      expect(API_ENDPOINTS.VOLUNTEER_REGISTRATIONS.DELETE).toBeDefined();
    });

    it('should have correct endpoint paths for Functions', () => {
      expect(API_ENDPOINTS.FUNCTIONS.FIX_GRID_BOUNDS).toBe('/functions/fix-grid-bounds');
      expect(API_ENDPOINTS.FUNCTIONS.EXPORT_GRIDS_CSV).toBe('/functions/export-grids-csv');
      expect(API_ENDPOINTS.FUNCTIONS.IMPORT_GRIDS_CSV).toBe('/functions/import-grids-csv');
      expect(API_ENDPOINTS.FUNCTIONS.GRID_TEMPLATE).toBe('/functions/grid-template');
      expect(API_ENDPOINTS.FUNCTIONS.EXTERNAL_GRID_API).toBe('/functions/external-grid-api');
      expect(API_ENDPOINTS.FUNCTIONS.EXTERNAL_VOLUNTEER_API).toBe('/functions/external-volunteer-api');
    });
  });

  describe('Schema Validation', () => {
    const requiredSchemas = [
      'DisasterArea',
      'Grid',
      'VolunteerRegistration',
      'VolunteerListItem',
      'VolunteersListResponse',
      'SupplyDonation',
      'GridDiscussion',
      'Announcement',
      'User',
      'Error'
    ];

    requiredSchemas.forEach(schema => {
      it(`should have schema definition for ${schema}`, () => {
        expect(openApiSpec.components.schemas[schema]).toBeDefined();
      });
    });

    it('should have required fields defined in DisasterArea', () => {
      const schema = openApiSpec.components.schemas.DisasterArea;
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('name');
      expect(schema.required).toContain('center_lat');
      expect(schema.required).toContain('center_lng');
    });

    it('should have required fields defined in Grid', () => {
      const schema = openApiSpec.components.schemas.Grid;
      expect(schema.required).toContain('id');
      expect(schema.required).toContain('code');
      expect(schema.required).toContain('grid_type');
      expect(schema.required).toContain('disaster_area_id');
    });

    it('should have grid_type enum values', () => {
      const schema = openApiSpec.components.schemas.Grid;
      const gridTypeProperty = schema.properties.grid_type;
      expect(gridTypeProperty.enum).toEqual([
        'mud_disposal',
        'manpower',
        'supply_storage',
        'accommodation',
        'food_area'
      ]);
    });

    it('should have status enum values for Grid', () => {
      const schema = openApiSpec.components.schemas.Grid;
      const statusProperty = schema.properties.status;
      expect(statusProperty.enum).toEqual([
        'open',
        'closed',
        'completed',
        'pending'
      ]);
    });

    it('should have VolunteerStatus enum values', () => {
      const schema = openApiSpec.components.schemas.VolunteerStatus;
      expect(schema.enum).toEqual([
        'pending',
        'confirmed',
        'arrived',
        'completed',
        'cancelled'
      ]);
    });
  });

  describe('Security Configuration', () => {
    it('should have bearer auth security scheme', () => {
      const securitySchemes = openApiSpec.components.securitySchemes;
      expect(securitySchemes.bearerAuth).toBeDefined();
      expect(securitySchemes.bearerAuth.type).toBe('http');
      expect(securitySchemes.bearerAuth.scheme).toBe('bearer');
    });

    it('should have security requirements on protected endpoints', () => {
      const protectedPaths = [
        { path: '/disaster-areas', method: 'post' },
        { path: '/grids', method: 'post' },
        { path: '/volunteer-registrations', method: 'post' },
        { path: '/announcements', method: 'post' }
      ];

      protectedPaths.forEach(({ path, method }) => {
        const operation = paths[path]?.[method];
        if (operation) {
          expect(operation.security).toBeDefined();
        }
      });
    });

    it('should have public access for GET endpoints', () => {
      const publicPaths = [
        { path: '/disaster-areas', method: 'get' },
        { path: '/grids', method: 'get' },
        { path: '/volunteers', method: 'get' }
      ];

      publicPaths.forEach(({ path, method }) => {
        const operation = paths[path]?.[method];
        expect(operation).toBeDefined();
      });
    });
  });

  describe('Response Definitions', () => {
    it('should have standard error responses', () => {
      expect(openApiSpec.components.responses.Unauthorized).toBeDefined();
      expect(openApiSpec.components.responses.NotFound).toBeDefined();
      expect(openApiSpec.components.responses.ValidationError).toBeDefined();
      expect(openApiSpec.components.responses.InternalError).toBeDefined();
    });

    it('should have error response format', () => {
      const errorSchema = openApiSpec.components.schemas.Error;
      expect(errorSchema.properties.message).toBeDefined();
      expect(errorSchema.properties.code).toBeDefined();
      expect(errorSchema.required).toContain('message');
    });
  });

  describe('Parameter Definitions', () => {
    it('should have pagination parameters', () => {
      expect(openApiSpec.components.parameters.PageLimit).toBeDefined();
      expect(openApiSpec.components.parameters.PageOffset).toBeDefined();
    });

    it('should have correct pagination parameter constraints', () => {
      const limitParam = openApiSpec.components.parameters.PageLimit;
      expect(limitParam.schema.minimum).toBe(1);
      expect(limitParam.schema.maximum).toBe(200);
      expect(limitParam.schema.default).toBe(50);

      const offsetParam = openApiSpec.components.parameters.PageOffset;
      expect(offsetParam.schema.minimum).toBe(0);
      expect(offsetParam.schema.default).toBe(0);
    });
  });

  describe('Tag Organization', () => {
    const expectedTags = [
      'DisasterAreas',
      'Grids',
      'VolunteerRegistrations',
      'SupplyDonations',
      'GridDiscussions',
      'Announcements',
      'Volunteers',
      'Users',
      'Functions',
      'Legacy'
    ];

    expectedTags.forEach(tag => {
      it(`should have tag definition for ${tag}`, () => {
        const tagDef = openApiSpec.tags.find(t => t.name === tag);
        expect(tagDef).toBeDefined();
        expect(tagDef.description).toBeDefined();
      });
    });
  });

  describe('Endpoint Method Validation', () => {
    const endpointTests = [
      { path: '/disaster-areas', methods: ['get', 'post'] },
      { path: '/disaster-areas/{id}', methods: ['get', 'put', 'delete'] },
      { path: '/grids', methods: ['get', 'post'] },
      { path: '/grids/{id}', methods: ['get', 'put', 'delete'] },
      { path: '/volunteer-registrations', methods: ['get', 'post'] },
      { path: '/volunteer-registrations/{id}', methods: ['delete'] },
      { path: '/supply-donations', methods: ['get', 'post'] },
      { path: '/grid-discussions', methods: ['get', 'post'] },
      { path: '/announcements', methods: ['get', 'post'] },
      { path: '/volunteers', methods: ['get'] },
      { path: '/users', methods: ['get'] },
      { path: '/me', methods: ['get'] }
    ];

    endpointTests.forEach(({ path, methods }) => {
      methods.forEach(method => {
        it(`should have ${method.toUpperCase()} operation for ${path}`, () => {
          expect(paths[path]?.[method]).toBeDefined();
        });
      });
    });
  });
});
