/**
 * Unit tests for StepReferenceResolver
 */

import { StepReferenceResolver } from '../../../agents/executor/reference-resolver.js';
import { StepResultCache } from '../../../agents/executor/step-cache.js';

describe('StepReferenceResolver', () => {
  let resolver: StepReferenceResolver;
  let cache: StepResultCache;
  
  beforeEach(() => {
    resolver = new StepReferenceResolver();
    cache = new StepResultCache();
  });
  
  describe('resolveReferences', () => {
    it('should resolve simple step reference', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1', name: 'Test Facility' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toBe('F1');
    });
    
    it('should resolve array access', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1', name: 'Facility 1' }, { id: 'F2', name: 'Facility 2' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data[0].id}',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toBe('F1');
    });
    
    it('should resolve wildcard mapping', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1' }, { id: 'F2' }, { id: 'F3' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.*.id}',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toEqual(['F1', 'F2', 'F3']);
    });
    
    it('should resolve nested object access', () => {
      cache.set(0, {
        success: true,
        data: {
          facility: {
            details: {
              id: 'F1',
              location: 'Berlin'
            }
          }
        },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.facility.details.id}',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toBe('F1');
    });
    
    it('should resolve references in object parameters', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const params = {
        facility_id: '${step[0].data[0].id}',
        status: 'pending'
      };
      
      const result = resolver.resolveReferences(params, cache);
      
      expect(result.success).toBe(true);
      expect(result.resolved).toEqual({
        facility_id: 'F1',
        status: 'pending'
      });
    });
    
    it('should resolve references in array parameters', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'S1' }, { id: 'S2' }],
        timestamp: new Date(),
        tool: 'shipments_list',
        params: {}
      });
      
      const params = {
        shipment_ids: '${step[0].data.*.id}',
        filters: ['${step[0].data[0].id}']
      };
      
      const result = resolver.resolveReferences(params, cache);
      
      expect(result.success).toBe(true);
      expect(result.resolved).toEqual({
        shipment_ids: ['S1', 'S2'],
        filters: ['S1']
      });
    });
    
    it('should handle missing step gracefully', () => {
      const result = resolver.resolveReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Step 0 not found in cache');
    });
    
    it('should handle failed step gracefully', () => {
      cache.set(0, {
        success: false,
        data: null,
        error: 'API timeout',
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Step 0 failed: API timeout');
    });
    
    it('should handle invalid path gracefully', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.nonexistent.field}',
        cache
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Path not found');
    });
    
    it('should handle array index out of bounds', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data[5].id}',
        cache
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Array index 5 out of bounds');
    });
    
    it('should handle wildcard on non-array', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        '${step[0].data.*.id}',
        cache
      );
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wildcard used on non-array');
    });
    
    it('should handle non-template strings', () => {
      const result = resolver.resolveReferences(
        'This is a regular string',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toBe('This is a regular string');
    });
    
    it('should handle mixed content', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const result = resolver.resolveReferences(
        'Facility ID: ${step[0].data[0].id}',
        cache
      );
      
      expect(result.success).toBe(true);
      expect(result.resolved).toBe('Facility ID: F1');
    });
  });
  
  describe('validateReferences', () => {
    it('should validate successful references', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const validation = resolver.validateReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should catch missing step references', () => {
      const validation = resolver.validateReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Step 0 not found in cache');
    });
    
    it('should catch failed step references', () => {
      cache.set(0, {
        success: false,
        data: null,
        error: 'Network error',
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const validation = resolver.validateReferences(
        '${step[0].data.id}',
        cache
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Step 0 failed: Network error');
    });
    
    it('should catch invalid paths', () => {
      cache.set(0, {
        success: true,
        data: { id: 'F1' },
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      const validation = resolver.validateReferences(
        '${step[0].data.invalid.path}',
        cache
      );
      
      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('Invalid path in step 0');
    });
    
    it('should validate complex nested parameters', () => {
      cache.set(0, {
        success: true,
        data: [{ id: 'F1' }],
        timestamp: new Date(),
        tool: 'facilities_list',
        params: {}
      });
      
      cache.set(1, {
        success: true,
        data: [{ id: 'S1' }],
        timestamp: new Date(),
        tool: 'shipments_list',
        params: {}
      });
      
      const params = {
        facility_id: '${step[0].data[0].id}',
        shipment_ids: '${step[1].data.*.id}',
        filters: ['${step[0].data[0].id}']
      };
      
      const validation = resolver.validateReferences(params, cache);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });
});
