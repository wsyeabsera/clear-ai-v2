/**
 * Validation schemas tests
 */

import {
  PlanSchema,
  ToolResultSchema,
  AnalysisSchema,
  FinalResponseSchema,
  ShipmentSchema,
  FacilitySchema,
  ContaminantSchema,
  InspectionSchema,
  EpisodicEventSchema,
  SemanticRecordSchema,
  validatePlan,
  validateToolResult,
  validateAnalysis,
  validateFinalResponse,
  validateShipment,
  validateFacility,
  validateContaminant,
  validateInspection,
} from '../../../shared/validation/schemas.js';
import { mockPlan, mockAnalysis } from '../fixtures/shared-test-data.js';

describe('Validation Schemas', () => {
  describe('PlanSchema', () => {
    it('should validate valid plan', () => {
      const result = PlanSchema.safeParse(mockPlan);
      
      expect(result.success).toBe(true);
    });
    
    it('should require at least one step', () => {
      const invalidPlan = { steps: [], metadata: mockPlan.metadata };
      const result = PlanSchema.safeParse(invalidPlan);
      
      expect(result.success).toBe(false);
    });
    
    it('should validate plan with minimal data', () => {
      const minimalPlan = {
        steps: [{ tool: 'test', params: {} }],
      };
      const result = PlanSchema.safeParse(minimalPlan);
      
      expect(result.success).toBe(true);
    });
    
    it('should allow optional depends_on', () => {
      const plan = {
        steps: [
          { tool: 'step1', params: {} },
          { tool: 'step2', params: {}, depends_on: [0] },
        ],
      };
      const result = PlanSchema.safeParse(plan);
      
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid step', () => {
      const invalidPlan = {
        steps: [{ tool: '', params: {} }], // Empty tool name
      };
      const result = PlanSchema.safeParse(invalidPlan);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('ToolResultSchema', () => {
    it('should validate successful tool result', () => {
      const toolResult = {
        success: true,
        tool: 'shipments',
        data: [{ id: 'S1' }],
        metadata: {
          executionTime: 150,
          timestamp: '2025-10-11T10:00:00Z',
        },
      };
      const result = ToolResultSchema.safeParse(toolResult);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate failed tool result', () => {
      const toolResult = {
        success: false,
        tool: 'shipments',
        error: {
          code: '500',
          message: 'Internal error',
        },
        metadata: {
          executionTime: 50,
          timestamp: '2025-10-11T10:00:00Z',
        },
      };
      const result = ToolResultSchema.safeParse(toolResult);
      
      expect(result.success).toBe(true);
    });
    
    it('should allow optional retries in metadata', () => {
      const toolResult = {
        success: true,
        tool: 'test',
        metadata: {
          executionTime: 100,
          timestamp: '2025-10-11T10:00:00Z',
          retries: 2,
        },
      };
      const result = ToolResultSchema.safeParse(toolResult);
      
      expect(result.success).toBe(true);
    });
    
    it('should require metadata fields', () => {
      const toolResult = {
        success: true,
        tool: 'test',
        metadata: {}, // Missing required fields
      };
      const result = ToolResultSchema.safeParse(toolResult);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('AnalysisSchema', () => {
    it('should validate valid analysis', () => {
      const result = AnalysisSchema.safeParse(mockAnalysis);
      
      expect(result.success).toBe(true);
    });
    
    it('should require non-empty summary', () => {
      const invalidAnalysis = {
        ...mockAnalysis,
        summary: '',
      };
      const result = AnalysisSchema.safeParse(invalidAnalysis);
      
      expect(result.success).toBe(false);
    });
    
    it('should validate insight types', () => {
      const analysis = {
        ...mockAnalysis,
        insights: [
          {
            type: 'trend',
            description: 'Test',
            confidence: 0.8,
            supporting_data: [],
          },
        ],
      };
      const result = AnalysisSchema.safeParse(analysis);
      
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid insight type', () => {
      const analysis = {
        ...mockAnalysis,
        insights: [
          {
            type: 'invalid',
            description: 'Test',
            confidence: 0.8,
            supporting_data: [],
          },
        ],
      };
      const result = AnalysisSchema.safeParse(analysis);
      
      expect(result.success).toBe(false);
    });
    
    it('should validate confidence range', () => {
      const analysis = {
        ...mockAnalysis,
        insights: [
          {
            type: 'trend',
            description: 'Test',
            confidence: 1.5, // Out of range
            supporting_data: [],
          },
        ],
      };
      const result = AnalysisSchema.safeParse(analysis);
      
      expect(result.success).toBe(false);
    });
    
    it('should validate anomaly severity', () => {
      const severities = ['low', 'medium', 'high', 'critical'];
      
      severities.forEach(severity => {
        const analysis = {
          ...mockAnalysis,
          anomalies: [
            {
              type: 'outlier',
              description: 'Test',
              severity,
              affected_entities: [],
              data: {},
            },
          ],
        };
        const result = AnalysisSchema.safeParse(analysis);
        
        expect(result.success).toBe(true);
      });
    });
  });
  
  describe('FinalResponseSchema', () => {
    it('should validate valid final response', () => {
      const response = {
        message: 'Found 3 shipments',
        tools_used: ['shipments'],
        metadata: {
          request_id: 'req_123',
          total_duration_ms: 500,
          timestamp: '2025-10-11T10:00:00Z',
        },
      };
      const result = FinalResponseSchema.safeParse(response);
      
      expect(result.success).toBe(true);
    });
    
    it('should allow optional data and analysis', () => {
      const response = {
        message: 'Found 3 shipments',
        tools_used: ['shipments'],
        data: { shipments: [] },
        analysis: mockAnalysis,
        metadata: {
          request_id: 'req_123',
          total_duration_ms: 500,
          timestamp: '2025-10-11T10:00:00Z',
        },
      };
      const result = FinalResponseSchema.safeParse(response);
      
      expect(result.success).toBe(true);
    });
    
    it('should require metadata fields', () => {
      const response = {
        message: 'Test',
        tools_used: [],
        metadata: {
          request_id: 'req_123',
          // Missing required fields
        },
      };
      const result = FinalResponseSchema.safeParse(response);
      
      expect(result.success).toBe(false);
    });
  });
  
  describe('ShipmentSchema', () => {
    it('should validate valid shipment', () => {
      const shipment = {
        id: 'S1',
        facility_id: 'F1',
        date: '2025-10-11',
        status: 'delivered',
        weight_kg: 1500,
        has_contaminants: false,
      };
      const result = ShipmentSchema.safeParse(shipment);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate shipment with optional fields', () => {
      const shipment = {
        id: 'S1',
        facility_id: 'F1',
        date: '2025-10-11',
        status: 'in_transit',
        weight_kg: 1500,
        has_contaminants: false,
        origin: 'Berlin',
        destination: 'Hamburg',
        waste_type: 'plastic',
        waste_code: 'W001',
        carrier: 'Transport Co',
        composition_notes: 'Mixed plastic waste',
      };
      const result = ShipmentSchema.safeParse(shipment);
      
      expect(result.success).toBe(true);
    });
    
    it('should enforce status enum', () => {
      const validStatuses = ['pending', 'in_transit', 'delivered', 'rejected'];
      
      validStatuses.forEach(status => {
        const shipment = {
          id: 'S1',
          facility_id: 'F1',
          date: '2025-10-11',
          status,
          weight_kg: 1500,
          has_contaminants: false,
        };
        expect(ShipmentSchema.safeParse(shipment).success).toBe(true);
      });
      
      const invalidShipment = {
        id: 'S1',
        facility_id: 'F1',
        date: '2025-10-11',
        status: 'invalid',
        weight_kg: 1500,
        has_contaminants: false,
      };
      expect(ShipmentSchema.safeParse(invalidShipment).success).toBe(false);
    });
  });
  
  describe('FacilitySchema', () => {
    it('should validate valid facility', () => {
      const facility = {
        id: 'F1',
        name: 'Hannover Sorting Center',
        location: 'Hannover',
        type: 'sorting',
        capacity_tons: 500,
      };
      const result = FacilitySchema.safeParse(facility);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate facility with coordinates', () => {
      const facility = {
        id: 'F1',
        name: 'Test Facility',
        location: 'Berlin',
        type: 'processing',
        capacity_tons: 1000,
        coordinates: {
          lat: 52.52,
          lon: 13.405,
        },
      };
      const result = FacilitySchema.safeParse(facility);
      
      expect(result.success).toBe(true);
    });
    
    it('should enforce type enum', () => {
      const validTypes = ['sorting', 'processing', 'disposal'];
      
      validTypes.forEach(type => {
        const facility = {
          id: 'F1',
          name: 'Test',
          location: 'Berlin',
          type,
          capacity_tons: 500,
        };
        expect(FacilitySchema.safeParse(facility).success).toBe(true);
      });
    });
  });
  
  describe('ContaminantSchema', () => {
    it('should validate valid contaminant', () => {
      const contaminant = {
        id: 'C1',
        shipment_id: 'S1',
        type: 'Lead',
        concentration_ppm: 150,
        risk_level: 'high',
        detected_at: '2025-10-11T10:00:00Z',
      };
      const result = ContaminantSchema.safeParse(contaminant);
      
      expect(result.success).toBe(true);
    });
    
    it('should enforce risk level enum', () => {
      const validLevels = ['low', 'medium', 'high', 'critical'];
      
      validLevels.forEach(risk_level => {
        const contaminant = {
          id: 'C1',
          shipment_id: 'S1',
          type: 'Lead',
          concentration_ppm: 150,
          risk_level,
          detected_at: '2025-10-11T10:00:00Z',
        };
        expect(ContaminantSchema.safeParse(contaminant).success).toBe(true);
      });
    });
    
    it('should validate chemical level enums', () => {
      const contaminant = {
        id: 'C1',
        shipment_id: 'S1',
        type: 'Chemical',
        concentration_ppm: 100,
        risk_level: 'medium',
        detected_at: '2025-10-11T10:00:00Z',
        explosive_level: 'high',
        so2_level: 'medium',
        hcl_level: 'low',
      };
      const result = ContaminantSchema.safeParse(contaminant);
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('InspectionSchema', () => {
    it('should validate valid inspection', () => {
      const inspection = {
        id: 'I1',
        shipment_id: 'S1',
        facility_id: 'F1',
        date: '2025-10-11',
        status: 'accepted',
        inspector: 'John Doe',
      };
      const result = InspectionSchema.safeParse(inspection);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate inspection with all optional fields', () => {
      const inspection = {
        id: 'I1',
        shipment_id: 'S1',
        facility_id: 'F1',
        date: '2025-10-11',
        status: 'rejected',
        inspector: 'Jane Smith',
        notes: 'Contaminants detected',
        contaminants_detected: ['Lead', 'Mercury'],
        risk_assessment: 'High risk',
        inspection_type: 'arrival',
        duration_minutes: 45,
        passed: false,
        follow_up_required: true,
        photos: ['photo1.jpg', 'photo2.jpg'],
      };
      const result = InspectionSchema.safeParse(inspection);
      
      expect(result.success).toBe(true);
    });
    
    it('should enforce status enum', () => {
      const validStatuses = ['accepted', 'rejected', 'pending'];
      
      validStatuses.forEach(status => {
        const inspection = {
          id: 'I1',
          shipment_id: 'S1',
          facility_id: 'F1',
          date: '2025-10-11',
          status,
          inspector: 'John Doe',
        };
        expect(InspectionSchema.safeParse(inspection).success).toBe(true);
      });
    });
    
    it('should enforce inspection type enum', () => {
      const validTypes = ['arrival', 'processing', 'departure', 'random'];
      
      validTypes.forEach(inspection_type => {
        const inspection = {
          id: 'I1',
          shipment_id: 'S1',
          facility_id: 'F1',
          date: '2025-10-11',
          status: 'accepted',
          inspector: 'John Doe',
          inspection_type,
        };
        expect(InspectionSchema.safeParse(inspection).success).toBe(true);
      });
    });
  });
  
  describe('EpisodicEventSchema', () => {
    it('should validate valid episodic event', () => {
      const event = {
        id: 'evt_123',
        type: 'request',
        timestamp: '2025-10-11T10:00:00Z',
        data: { query: 'test' },
      };
      const result = EpisodicEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
    });
    
    it('should validate event with relationships', () => {
      const event = {
        id: 'evt_123',
        type: 'tool_call',
        timestamp: '2025-10-11T10:00:00Z',
        data: { tool: 'shipments' },
        relationships: {
          caused_by: ['evt_122'],
          led_to: ['evt_124'],
          relates_to: ['evt_125'],
        },
      };
      const result = EpisodicEventSchema.safeParse(event);
      
      expect(result.success).toBe(true);
    });
    
    it('should enforce event type enum', () => {
      const validTypes = ['request', 'tool_call', 'insight', 'error'];
      
      validTypes.forEach(type => {
        const event = {
          id: 'evt_123',
          type,
          timestamp: '2025-10-11T10:00:00Z',
          data: {},
        };
        expect(EpisodicEventSchema.safeParse(event).success).toBe(true);
      });
    });
  });
  
  describe('SemanticRecordSchema', () => {
    it('should validate valid semantic record', () => {
      const record = {
        id: 'sem_123',
        text: 'Test summary',
        embedding: new Array(1536).fill(0.1),
        metadata: {
          type: 'summary',
          timestamp: '2025-10-11T10:00:00Z',
        },
      };
      const result = SemanticRecordSchema.safeParse(record);
      
      expect(result.success).toBe(true);
    });
    
    it('should allow additional metadata properties', () => {
      const record = {
        id: 'sem_123',
        text: 'Test',
        embedding: [0.1, 0.2, 0.3],
        metadata: {
          type: 'insight',
          timestamp: '2025-10-11T10:00:00Z',
          custom_field: 'custom_value',
          another_field: 123,
        },
      };
      const result = SemanticRecordSchema.safeParse(record);
      
      expect(result.success).toBe(true);
    });
  });
  
  describe('Helper validation functions', () => {
    it('should validate using helper functions', () => {
      expect(() => validatePlan(mockPlan)).not.toThrow();
      expect(() => validateAnalysis(mockAnalysis)).not.toThrow();
    });
    
    it('should throw on invalid data', () => {
      expect(() => validatePlan({ steps: [] })).toThrow();
    });
  });
});

