/**
 * Template resolver tests
 */

import {
  resolveTemplateParams,
  hasTemplates,
  extractTemplates,
  getStepDependencies,
} from '../../../shared/utils/template.js';
import { mockToolResults, createMockToolResult } from '../fixtures/shared-test-data.js';

describe('Template Resolver', () => {
  describe('resolveTemplateParams', () => {
    it('should resolve basic template', () => {
      const params = { data: '${step[0].data}' };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.data).toEqual(mockToolResults[0]!.data);
    });
    
    it('should resolve wildcard mapping', () => {
      const params = { ids: '${step[0].data.*.id}' };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.ids).toEqual(['S1', 'S2', 'S3']);
    });
    
    it('should resolve array index', () => {
      const params = { firstId: '${step[0].data[0].id}' };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.firstId).toBe('S1');
    });
    
    it('should resolve nested property', () => {
      const params = { location: '${step[1].data.location}' };
      const results = [mockToolResults[0]!, mockToolResults[1]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.location).toBe('Hannover');
    });
    
    it('should handle multiple templates in same params', () => {
      const params = {
        ids: '${step[0].data.*.id}',
        location: '${step[1].data.location}',
      };
      const results = [mockToolResults[0]!, mockToolResults[1]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.ids).toEqual(['S1', 'S2', 'S3']);
      expect(resolved.location).toBe('Hannover');
    });
    
    it('should pass through non-template values', () => {
      const params = {
        template: '${step[0].data}',
        static: 'static value',
        number: 42,
      };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.static).toBe('static value');
      expect(resolved.number).toBe(42);
    });
    
    it('should handle nested objects', () => {
      const params = {
        nested: {
          template: '${step[0].data.*.id}',
          static: 'value',
        },
      };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.nested.template).toEqual(['S1', 'S2', 'S3']);
      expect(resolved.nested.static).toBe('value');
    });
    
    it('should handle arrays', () => {
      const params = {
        items: ['${step[0].data[0].id}', 'static', '${step[0].data[1].id}'],
      };
      const results = [mockToolResults[0]!];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.items).toEqual(['S1', 'static', 'S2']);
    });
    
    it('should throw error for missing step', () => {
      const params = { data: '${step[5].data}' };
      const results = [mockToolResults[0]!];
      
      expect(() => resolveTemplateParams(params, results)).toThrow('Step 5 not found');
    });
    
    it('should throw error for failed step', () => {
      const params = { data: '${step[2].data}' };
      const results = [
        mockToolResults[0]!,
        mockToolResults[1]!,
        mockToolResults[2]!, // This one failed
      ];
      
      expect(() => resolveTemplateParams(params, results)).toThrow('Step 2 failed');
    });
    
    it('should throw error for undefined property', () => {
      const params = { data: '${step[0].data.nonexistent}' };
      const results = [mockToolResults[0]!];
      
      expect(() => resolveTemplateParams(params, results)).toThrow('undefined');
    });
    
    it('should throw error for wildcard on non-array', () => {
      const params = { data: '${step[1].data.*.id}' };
      const results = [mockToolResults[0]!, mockToolResults[1]!];
      
      expect(() => resolveTemplateParams(params, results)).toThrow('non-array');
    });
    
    it('should handle empty array result from wildcard filter', () => {
      const result = createMockToolResult({
        data: [{ name: 'Item 1' }, { name: 'Item 2' }], // No 'id' property
      });
      const params = { ids: '${step[0].data.*.id}' };
      const results = [result];
      
      const resolved = resolveTemplateParams(params, results);
      
      expect(resolved.ids).toEqual([]);
    });
  });
  
  describe('hasTemplates', () => {
    it('should detect template in string', () => {
      expect(hasTemplates('${step[0].data}')).toBe(true);
    });
    
    it('should detect template in object', () => {
      expect(hasTemplates({ key: '${step[0].data}' })).toBe(true);
    });
    
    it('should detect template in array', () => {
      expect(hasTemplates(['${step[0].data}', 'static'])).toBe(true);
    });
    
    it('should detect template in nested structure', () => {
      expect(hasTemplates({
        nested: {
          array: ['${step[0].data}'],
        },
      })).toBe(true);
    });
    
    it('should return false for no templates', () => {
      expect(hasTemplates('static string')).toBe(false);
      expect(hasTemplates({ key: 'value' })).toBe(false);
      expect(hasTemplates(['item1', 'item2'])).toBe(false);
    });
    
    it('should return false for primitives', () => {
      expect(hasTemplates(42)).toBe(false);
      expect(hasTemplates(true)).toBe(false);
      expect(hasTemplates(null)).toBe(false);
    });
  });
  
  describe('extractTemplates', () => {
    it('should extract template from string', () => {
      const templates = extractTemplates('${step[0].data}');
      
      expect(templates).toEqual(['step[0].data']);
    });
    
    it('should extract multiple templates from string', () => {
      const templates = extractTemplates('${step[0].data} and ${step[1].data}');
      
      expect(templates).toEqual(['step[0].data', 'step[1].data']);
    });
    
    it('should extract templates from object', () => {
      const templates = extractTemplates({
        a: '${step[0].data}',
        b: '${step[1].data}',
      });
      
      expect(templates).toContain('step[0].data');
      expect(templates).toContain('step[1].data');
    });
    
    it('should extract templates from array', () => {
      const templates = extractTemplates([
        '${step[0].data}',
        'static',
        '${step[1].data}',
      ]);
      
      expect(templates).toContain('step[0].data');
      expect(templates).toContain('step[1].data');
    });
    
    it('should extract templates from nested structure', () => {
      const templates = extractTemplates({
        nested: {
          array: ['${step[0].data}', '${step[2].result}'],
        },
      });
      
      expect(templates).toContain('step[0].data');
      expect(templates).toContain('step[2].result');
    });
    
    it('should return empty array for no templates', () => {
      expect(extractTemplates('static')).toEqual([]);
      expect(extractTemplates({ key: 'value' })).toEqual([]);
    });
  });
  
  describe('getStepDependencies', () => {
    it('should extract step dependencies', () => {
      const params = {
        ids: '${step[0].data.*.id}',
        location: '${step[2].data.location}',
      };
      
      const deps = getStepDependencies(params);
      
      expect(deps).toEqual([0, 2]);
    });
    
    it('should return unique dependencies', () => {
      const params = {
        a: '${step[0].data}',
        b: '${step[0].data.name}',
        c: '${step[1].data}',
      };
      
      const deps = getStepDependencies(params);
      
      expect(deps).toEqual([0, 1]);
    });
    
    it('should return sorted dependencies', () => {
      const params = {
        a: '${step[3].data}',
        b: '${step[1].data}',
        c: '${step[2].data}',
      };
      
      const deps = getStepDependencies(params);
      
      expect(deps).toEqual([1, 2, 3]);
    });
    
    it('should handle nested templates', () => {
      const params = {
        nested: {
          a: '${step[5].data}',
          b: '${step[0].data}',
        },
      };
      
      const deps = getStepDependencies(params);
      
      expect(deps).toEqual([0, 5]);
    });
    
    it('should return empty array for no templates', () => {
      const params = {
        static: 'value',
        number: 42,
      };
      
      const deps = getStepDependencies(params);
      
      expect(deps).toEqual([]);
    });
  });
});

