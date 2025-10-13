/**
 * Unit tests for PlanValidator
 */

import { PlanValidator } from '../../../agents/planner/plan-validator.js';
import { ToolSchemaRegistry } from '../../../agents/planner/tool-schema-registry.js';
import { Plan, PlanStep, Intent } from '../../../shared/types/agent.js';

describe('PlanValidator', () => {
  let validator: PlanValidator;
  let toolRegistry: ToolSchemaRegistry;
  
  beforeEach(() => {
    toolRegistry = new ToolSchemaRegistry();
    validator = new PlanValidator(toolRegistry);
  });
  
  describe('validatePlan', () => {
    it('should validate a correct plan', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: 'Berlin' },
            depends_on: [],
            parallel: false
          },
          {
            tool: 'shipments_list',
            params: { facility_id: '${step[0].data[0].id}' },
            depends_on: [0],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['facility', 'shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject plan with no steps', () => {
      const plan: Plan = { steps: [] };
      const intent: Intent = {
        type: 'READ',
        entities: ['facility'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Plan has no steps');
    });
    
    it('should reject plan with unknown tool', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'unknown_tool',
            params: {},
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['facility'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Unknown tool: unknown_tool');
    });
    
    it('should reject plan with invalid dependencies', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: 'Berlin' },
            depends_on: [1], // Depends on future step
            parallel: false
          },
          {
            tool: 'shipments_list',
            params: { facility_id: 'F1' },
            depends_on: [0],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['facility'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('depends on future step'))).toBe(true);
    });
    
    it('should reject CREATE plan without create tools', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: 'Berlin' },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'CREATE',
        entities: ['shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('cannot create shipment without shipments_create'))).toBe(true);
    });
    
    it('should reject plan with invalid parameters', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments_list',
            params: { 
              status: 'invalid_status', // Invalid enum value
              limit: 2000 // Out of range
            },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const result = validator.validatePlan(plan, intent);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Must be one of: pending, in_transit, delivered, rejected'))).toBe(true);
      expect(result.errors.some(e => e.includes('Must be <= 1000'))).toBe(true);
    });
  });
  
  describe('validateExecutionFeasibility', () => {
    it('should validate feasible plan', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: 'Berlin' },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const result = validator.validateExecutionFeasibility(plan);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject plan with unavailable tools', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'unavailable_tool',
            params: {},
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const result = validator.validateExecutionFeasibility(plan);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Tool unavailable_tool is not available');
    });
    
    it('should reject plan with template referencing future step', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: '${step[1].data.location}' }, // References future step
            depends_on: [],
            parallel: false
          },
          {
            tool: 'shipments_list',
            params: { facility_id: 'F1' },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const result = validator.validateExecutionFeasibility(plan);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Template references future step 1');
    });
    
    it('should reject plan with conflicting parameters', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'contaminants_list',
            params: { 
              shipment_ids: 'S1,S2',
              facility_id: 'F1' // Conflicting parameters
            },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const result = validator.validateExecutionFeasibility(plan);
      
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Cannot specify both shipment_ids and facility_id');
    });
  });
  
  describe('getPlanSuggestions', () => {
    it('should suggest missing tools for CREATE intent', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: {},
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'CREATE',
        entities: ['shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const suggestions = validator.getPlanSuggestions(plan, intent);
      
      expect(suggestions.some(s => s.includes('shipments_create'))).toBe(true);
    });
    
    it('should suggest adding optional parameters', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'shipments_list',
            params: {}, // No optional parameters
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const suggestions = validator.getPlanSuggestions(plan, intent);
      
      expect(suggestions.some(s => s.includes('limit parameter'))).toBe(true);
      expect(suggestions.some(s => s.includes('date_from parameter'))).toBe(true);
    });
    
    it('should suggest parallel execution for independent steps', () => {
      const plan: Plan = {
        steps: [
          {
            tool: 'facilities_list',
            params: { location: 'Berlin' },
            depends_on: [],
            parallel: false
          },
          {
            tool: 'shipments_list',
            params: { facility_id: 'F1' },
            depends_on: [],
            parallel: false
          }
        ]
      };
      
      const intent: Intent = {
        type: 'READ',
        entities: ['facility', 'shipment'],
        operations: [],
        confidence: 0.8
      };
      
      const suggestions = validator.getPlanSuggestions(plan, intent);
      
      expect(suggestions.some(s => s.includes('parallel'))).toBe(true);
    });
  });
});
