/**
 * Integration tests for Planner Agent
 * Tests with real LLM providers, no mocks
 */

import { PlannerAgent } from '../../../agents/planner.js';
import { LLMProvider } from '../../../shared/llm/provider.js';
import { MCPServer } from '../../../mcp/server.js';
import { getLLMConfigs } from '../../../shared/llm/config.js';
import { PlanSchema } from '../../../shared/validation/schemas.js';

describe('PlannerAgent Integration', () => {
  let planner: PlannerAgent;
  let llm: LLMProvider;
  let mcpServer: MCPServer;

  beforeAll(() => {
    // Initialize real LLM provider with fallback chain
    const llmConfigs = getLLMConfigs();
    llm = new LLMProvider(llmConfigs);

    // Initialize MCP server
    mcpServer = new MCPServer('test-server', '1.0.0');

    // Create planner with real services
    planner = new PlannerAgent(llm, mcpServer);
  });

  describe('Simple Queries', () => {
    it('should generate plan for shipment query with real LLM', async () => {
      const plan = await planner.plan('Get shipments from last week');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].tool).toBe('shipments');
      expect(plan.steps[0].params).toHaveProperty('date_from');
      expect(plan.steps[0].params).toHaveProperty('date_to');

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000); // Increased timeout for LLM call

    it('should generate plan for facility query', async () => {
      const plan = await planner.plan('Show me facilities in Hannover');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].tool).toBe('facilities');
      expect(plan.steps[0].params).toHaveProperty('location');
      expect(plan.steps[0].params.location).toContain('Hannover');

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);

    it('should generate plan for contaminant query', async () => {
      const plan = await planner.plan('Get today\'s contaminants');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      
      const hasContaminantTool = plan.steps.some(step => 
        step.tool === 'contaminants-detected'
      );
      expect(hasContaminantTool).toBe(true);

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);
  });

  describe('Complex Queries with Dependencies', () => {
    it('should generate multi-step plan for nested query', async () => {
      const plan = await planner.plan(
        'Get contaminated shipments from last week and their contaminant details'
      );

      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
      
      // First step should query shipments
      expect(plan.steps[0].tool).toBe('shipments');
      expect(plan.steps[0].params.has_contaminants).toBe(true);

      // Second step should query contaminants with dependency
      const contaminantStep = plan.steps.find(step => 
        step.tool === 'contaminants-detected'
      );
      expect(contaminantStep).toBeDefined();
      expect(contaminantStep?.depends_on).toBeDefined();
      expect(contaminantStep?.depends_on).toContain(0);

      // Should have template reference
      const hasTemplate = JSON.stringify(contaminantStep?.params).includes('${step[0]');
      expect(hasTemplate).toBe(true);

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);

    it('should generate plan for location-based nested query', async () => {
      const plan = await planner.plan(
        'Analyse today\'s contaminants in Hannover'
      );

      expect(plan.steps.length).toBeGreaterThanOrEqual(2);
      
      // Should query facilities first
      const facilityStep = plan.steps.find(step => step.tool === 'facilities');
      expect(facilityStep).toBeDefined();
      expect(facilityStep?.params.location).toContain('Hannover');

      // Should query contaminants with dependency
      const contaminantStep = plan.steps.find(step => 
        step.tool === 'contaminants-detected'
      );
      expect(contaminantStep).toBeDefined();
      expect(contaminantStep?.depends_on).toBeDefined();

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);

    it('should handle inspection-based queries', async () => {
      const plan = await planner.plan(
        'From the inspections accepted this week, did we detect any risky contaminants?'
      );

      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Should query inspections (might be combined with contaminants in one query)
      const hasInspectionOrContaminant = plan.steps.some(step => 
        step.tool === 'inspections' || step.tool === 'contaminants-detected'
      );
      expect(hasInspectionOrContaminant).toBe(true);

      // Should have status or risk_level filter
      const hasRelevantFilter = plan.steps.some(step => 
        step.params.status === 'accepted' || 
        step.params.risk_level || 
        step.params.has_risk_contaminants
      );
      expect(hasRelevantFilter).toBe(true);

      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);
  });

  describe('Temporal References', () => {
    it('should correctly parse "last week" reference', async () => {
      const plan = await planner.plan('Get shipments from last week');

      const shipmentStep = plan.steps.find(step => step.tool === 'shipments');
      expect(shipmentStep?.params.date_from).toBeDefined();
      expect(shipmentStep?.params.date_to).toBeDefined();

      // Verify dates are in correct format
      expect(shipmentStep?.params.date_from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(shipmentStep?.params.date_to).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify date range is approximately 7 days
      const from = new Date(shipmentStep?.params.date_from);
      const to = new Date(shipmentStep?.params.date_to);
      const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    }, 30000);

    it('should correctly parse "this week" reference', async () => {
      const plan = await planner.plan('Show inspections from this week');

      const inspectionStep = plan.steps.find(step => step.tool === 'inspections');
      expect(inspectionStep).toBeDefined();
      
      // Should have some date parameters (might be resolved dates or templates)
      const hasDateParams = inspectionStep?.params.date_from || inspectionStep?.params.date_to;
      expect(hasDateParams).toBeDefined();
    }, 30000);

    it('should correctly parse "today" reference', async () => {
      const plan = await planner.plan('Get today\'s contaminants');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Should query contaminants
      const hasContaminantTool = plan.steps.some(step => 
        step.tool === 'contaminants-detected'
      );
      expect(hasContaminantTool).toBe(true);
      
      // Should have some date parameter set
      const hasAnyDateParam = plan.steps.some(step => 
        step.params.date_from || step.params.date_to || step.params.date
      );
      expect(hasAnyDateParam).toBe(true);
    }, 30000);
  });

  describe('Plan Metadata', () => {
    it('should include query in metadata', async () => {
      const query = 'Get contaminated shipments';
      const plan = await planner.plan(query);

      expect(plan.metadata).toBeDefined();
      expect(plan.metadata?.query).toBe(query);
    }, 30000);

    it('should include timestamp in metadata', async () => {
      const plan = await planner.plan('test query');

      expect(plan.metadata).toBeDefined();
      expect(plan.metadata?.timestamp).toBeDefined();
      expect(plan.metadata?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }, 30000);
  });

  describe('Context Handling', () => {
    it('should incorporate context into planning', async () => {
      const context = {
        semantic: [
          { text: 'Previous query about Hannover', score: 0.9 }
        ],
        entities: ['facility:F1', 'location:Hannover']
      };

      const plan = await planner.plan('Show me the same data', context);

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle simple queries without complexity', async () => {
      const plan = await planner.plan('show me shipments');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      expect(plan.steps[0].tool).toBe('shipments');
      
      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);

    it('should handle queries with filters', async () => {
      const plan = await planner.plan('contaminated shipments from last week');

      expect(plan.steps).toBeDefined();
      expect(plan.steps.length).toBeGreaterThan(0);
      
      // Should query shipments
      const shipmentStep = plan.steps.find(s => s.tool === 'shipments');
      expect(shipmentStep).toBeDefined();
      expect(shipmentStep?.params.has_contaminants).toBe(true);
      
      // Validate against schema
      expect(() => PlanSchema.parse(plan)).not.toThrow();
    }, 30000);
  });

  describe('Plan Validation', () => {
    it('should produce executable plans with valid tool names', async () => {
      const plan = await planner.plan('Get all facilities and their shipments');

      // All tools should be from available set
      const validTools = ['shipments', 'facilities', 'contaminants-detected', 'inspections'];
      
      for (const step of plan.steps) {
        expect(validTools).toContain(step.tool);
      }
    }, 30000);

    it('should produce plans with valid dependencies', async () => {
      const plan = await planner.plan('Get contaminated shipments and their details');

      // Check all dependencies reference valid step indices
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];
        if (step.depends_on) {
          for (const depIndex of step.depends_on) {
            expect(depIndex).toBeGreaterThanOrEqual(0);
            expect(depIndex).toBeLessThan(plan.steps.length);
            expect(depIndex).toBeLessThan(i); // Dependencies must come before
          }
        }
      }
    }, 30000);
  });
});

