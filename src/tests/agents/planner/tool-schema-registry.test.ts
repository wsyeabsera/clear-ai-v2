/**
 * Unit tests for ToolSchemaRegistry
 */

import { ToolSchemaRegistry } from '../../../agents/planner/tool-schema-registry.js';

describe('ToolSchemaRegistry', () => {
  let registry: ToolSchemaRegistry;
  
  beforeEach(() => {
    registry = new ToolSchemaRegistry();
  });
  
  describe('getSchema', () => {
    it('should return schema for existing tool', () => {
      const schema = registry.getSchema('shipments_list');
      
      expect(schema).toBeDefined();
      expect(schema?.name).toBe('shipments_list');
      expect(schema?.description).toContain('Query shipments');
    });
    
    it('should return undefined for non-existing tool', () => {
      const schema = registry.getSchema('non_existing_tool');
      
      expect(schema).toBeUndefined();
    });
  });
  
  describe('getAllSchemas', () => {
    it('should return all registered schemas', () => {
      const schemas = registry.getAllSchemas();
      
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas.some(s => s.name === 'shipments_list')).toBe(true);
      expect(schemas.some(s => s.name === 'facilities_list')).toBe(true);
      expect(schemas.some(s => s.name === 'contaminants_list')).toBe(true);
    });
  });
  
  describe('getSchemaNames', () => {
    it('should return all tool names', () => {
      const names = registry.getSchemaNames();
      
      expect(names).toContain('shipments_list');
      expect(names).toContain('shipments_create');
      expect(names).toContain('facilities_list');
      expect(names).toContain('contaminants_list');
      expect(names).toContain('inspections_list');
    });
  });
  
  describe('validateParameters', () => {
    describe('shipments_list validation', () => {
      it('should validate valid parameters', () => {
        const params = {
          facility_id: 'F1',
          status: 'pending',
          has_contaminants: true,
          limit: 100
        };
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should reject invalid enum values', () => {
        const params = {
          status: 'invalid_status'
        };
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Must be one of: pending, in_transit, delivered, rejected');
      });
      
      it('should reject out of range numeric values', () => {
        const params = {
          limit: 2000
        };
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Must be <= 1000');
      });
    });
    
    describe('shipments_create validation', () => {
      it('should validate all required parameters', () => {
        const params = {
          id: 'S1',
          facility_id: 'F1',
          date: '2024-01-15',
          status: 'pending',
          weight_kg: 1000,
          has_contaminants: false,
          origin: 'Berlin',
          destination: 'Munich',
          waste_type: 'plastic',
          carrier: 'Green Logistics'
        };
        
        const result = registry.validateParameters('shipments_create', params);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
      
      it('should reject missing required parameters', () => {
        const params = {
          id: 'S1',
          facility_id: 'F1'
          // Missing other required parameters
        };
        
        const result = registry.validateParameters('shipments_create', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Missing required parameter'))).toBe(true);
      });
      
      it('should reject negative weight', () => {
        const params = {
          id: 'S1',
          facility_id: 'F1',
          date: '2024-01-15',
          status: 'pending',
          weight_kg: -100,
          has_contaminants: false,
          origin: 'Berlin',
          destination: 'Munich',
          waste_type: 'plastic',
          carrier: 'Green Logistics'
        };
        
        const result = registry.validateParameters('shipments_create', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Must be >= 0');
      });
    });
    
    describe('type validation', () => {
      it('should validate string types', () => {
        const params = { facility_id: 123 }; // Should be string
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Expected string, got number');
      });
      
      it('should validate boolean types', () => {
        const params = { has_contaminants: 'true' }; // Should be boolean
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Expected boolean, got string');
      });
      
      it('should validate number types', () => {
        const params = { limit: '100' }; // Should be number
        
        const result = registry.validateParameters('shipments_list', params);
        
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('Expected number, got string');
      });
    });
    
    it('should return error for unknown tool', () => {
      const result = registry.validateParameters('unknown_tool', {});
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown tool: unknown_tool');
    });
  });
  
  describe('getToolsForIntent', () => {
    it('should return CREATE tools for CREATE intent', () => {
      const tools = registry.getToolsForIntent('CREATE', ['shipment']);
      
      expect(tools).toContain('shipments_create');
    });
    
    it('should return READ tools for READ intent', () => {
      const tools = registry.getToolsForIntent('READ', ['shipment']);
      
      expect(tools).toContain('shipments_list');
    });
    
    it('should return ANALYZE tools for ANALYZE intent', () => {
      const tools = registry.getToolsForIntent('ANALYZE', ['contaminant']);
      
      expect(tools).toContain('contaminants_list');
    });
    
    it('should filter by entities', () => {
      const shipmentTools = registry.getToolsForIntent('READ', ['shipment']);
      const facilityTools = registry.getToolsForIntent('READ', ['facility']);
      
      expect(shipmentTools).toContain('shipments_list');
      expect(facilityTools).toContain('facilities_list');
      expect(shipmentTools).not.toContain('facilities_list');
    });
  });
  
  describe('getRequiredParameters', () => {
    it('should return required parameters for tool with requirements', () => {
      const required = registry.getRequiredParameters('shipments_create');
      
      expect(required).toContain('id');
      expect(required).toContain('facility_id');
      expect(required).toContain('weight_kg');
    });
    
    it('should return empty array for tool without requirements', () => {
      const required = registry.getRequiredParameters('shipments_list');
      
      expect(required).toHaveLength(0);
    });
    
    it('should return empty array for unknown tool', () => {
      const required = registry.getRequiredParameters('unknown_tool');
      
      expect(required).toHaveLength(0);
    });
  });
  
  describe('getParameterDescription', () => {
    it('should return parameter description', () => {
      const description = registry.getParameterDescription('shipments_list', 'facility_id');
      
      expect(description).toContain('Single facility ID');
    });
    
    it('should return undefined for unknown tool', () => {
      const description = registry.getParameterDescription('unknown_tool', 'param');
      
      expect(description).toBeUndefined();
    });
    
    it('should return undefined for unknown parameter', () => {
      const description = registry.getParameterDescription('shipments_list', 'unknown_param');
      
      expect(description).toBeUndefined();
    });
  });
});
