/**
 * Zod validation schemas for runtime type checking
 * Provides validation for all major types in the system
 */

import { z } from 'zod';

/**
 * Agent Schemas
 */

export const PlanStepSchema = z.object({
  tool: z.string().min(1),
  params: z.record(z.string(), z.any()),
  depends_on: z.array(z.number()).optional(),
  parallel: z.boolean().optional(),
});

export const PlanMetadataSchema = z.object({
  query: z.string(),
  timestamp: z.string(),
  estimated_duration_ms: z.number().optional(),
});

export const PlanSchema = z.object({
  steps: z.array(PlanStepSchema).nonempty(),
  metadata: PlanMetadataSchema.optional(),
});

export const ErrorDetailsSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const ToolResultMetadataSchema = z.object({
  executionTime: z.number(),
  timestamp: z.string(),
  retries: z.number().optional(),
});

export const ToolResultSchema = z.object({
  success: z.boolean(),
  tool: z.string(),
  data: z.any().optional(),
  error: ErrorDetailsSchema.optional(),
  metadata: ToolResultMetadataSchema,
});

export const InsightSchema = z.object({
  type: z.enum(['trend', 'pattern', 'correlation', 'comparison']),
  description: z.string(),
  confidence: z.number().min(0).max(1),
  supporting_data: z.array(z.any()),
});

export const RelationshipSchema = z.object({
  type: z.string(),
  target_entity_id: z.string(),
  strength: z.number().optional(),
});

export const EntitySchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  attributes: z.record(z.string(), z.any()),
  relationships: z.array(RelationshipSchema).optional(),
});

export const AnomalySchema = z.object({
  type: z.enum(['outlier', 'unexpected', 'missing', 'threshold_exceeded']),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affected_entities: z.array(z.string()),
  data: z.any(),
});

export const AnalysisMetadataSchema = z.object({
  tool_results_count: z.number(),
  successful_results: z.number().optional(),
  failed_results: z.number().optional(),
  analysis_time_ms: z.number(),
});

export const AnalysisSchema = z.object({
  summary: z.string().nonempty(),
  insights: z.array(InsightSchema),
  entities: z.array(EntitySchema),
  anomalies: z.array(AnomalySchema),
  metadata: AnalysisMetadataSchema,
});

export const ResponseMetadataSchema = z.object({
  request_id: z.string(),
  total_duration_ms: z.number(),
  timestamp: z.string(),
  error: z.boolean().optional(),
});

export const FinalResponseSchema = z.object({
  message: z.string(),
  tools_used: z.array(z.string()),
  data: z.any().optional(),
  analysis: AnalysisSchema.optional(),
  metadata: ResponseMetadataSchema,
});

/**
 * Tool Schemas
 */

export const CoordinatesSchema = z.object({
  lat: z.number(),
  lon: z.number(),
});

export const ShipmentStatusSchema = z.enum(['pending', 'in_transit', 'delivered', 'rejected']);

export const ShipmentSchema = z.object({
  id: z.string(),
  facility_id: z.string(),
  date: z.string(),
  status: ShipmentStatusSchema,
  weight_kg: z.number(),
  has_contaminants: z.boolean(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  waste_type: z.string().optional(),
  waste_code: z.string().optional(),
  carrier: z.string().optional(),
  composition_notes: z.string().optional(),
});

export const FacilityTypeSchema = z.enum(['sorting', 'processing', 'disposal']);

export const FacilitySchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string(),
  type: FacilityTypeSchema,
  capacity_tons: z.number(),
  current_load_tons: z.number().optional(),
  coordinates: CoordinatesSchema.optional(),
  accepted_waste_types: z.array(z.string()).optional(),
  rejected_waste_types: z.array(z.string()).optional(),
  contact_email: z.string().optional(),
  contact_phone: z.string().optional(),
  operating_hours: z.string().optional(),
});

export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);
export const ChemicalLevelSchema = z.enum(['low', 'medium', 'high']);

export const ContaminantSchema = z.object({
  id: z.string(),
  shipment_id: z.string(),
  facility_id: z.string().optional(),
  type: z.string(),
  concentration_ppm: z.number(),
  risk_level: RiskLevelSchema,
  detected_at: z.string(),
  notes: z.string().optional(),
  analysis_notes: z.string().optional(),
  waste_item_detected: z.string().optional(),
  explosive_level: ChemicalLevelSchema.optional(),
  so2_level: ChemicalLevelSchema.optional(),
  hcl_level: ChemicalLevelSchema.optional(),
  estimated_size: z.number().optional(),
});

export const InspectionStatusSchema = z.enum(['accepted', 'rejected', 'pending']);
export const InspectionTypeSchema = z.enum(['arrival', 'processing', 'departure', 'random']);

export const InspectionSchema = z.object({
  id: z.string(),
  shipment_id: z.string(),
  facility_id: z.string(),
  date: z.string(),
  status: InspectionStatusSchema,
  inspector: z.string(),
  notes: z.string().optional(),
  contaminants_detected: z.array(z.string()).optional(),
  risk_assessment: z.string().optional(),
  inspection_type: InspectionTypeSchema.optional(),
  duration_minutes: z.number().optional(),
  passed: z.boolean().optional(),
  follow_up_required: z.boolean().optional(),
  photos: z.array(z.string()).optional(),
});

/**
 * Memory Schemas
 */

export const EventTypeSchema = z.enum(['request', 'tool_call', 'insight', 'error']);

export const EventRelationshipsSchema = z.object({
  caused_by: z.array(z.string()).optional(),
  led_to: z.array(z.string()).optional(),
  relates_to: z.array(z.string()).optional(),
});

export const EpisodicEventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  timestamp: z.string(),
  data: z.any(),
  relationships: EventRelationshipsSchema.optional(),
});

export const SemanticMetadataSchema = z.object({
  type: z.enum(['summary', 'insight', 'entity', 'query']),
  timestamp: z.string(),
  source: z.string().optional(),
  entities: z.array(z.string()).optional(),
}).passthrough(); // Allow additional properties

export const SemanticRecordSchema = z.object({
  id: z.string(),
  text: z.string(),
  embedding: z.array(z.number()),
  metadata: SemanticMetadataSchema,
});

/**
 * Helper functions for validation
 */

export function validatePlan(data: unknown) {
  return PlanSchema.parse(data);
}

export function validateToolResult(data: unknown) {
  return ToolResultSchema.parse(data);
}

export function validateAnalysis(data: unknown) {
  return AnalysisSchema.parse(data);
}

export function validateFinalResponse(data: unknown) {
  return FinalResponseSchema.parse(data);
}

export function validateShipment(data: unknown) {
  return ShipmentSchema.parse(data);
}

export function validateFacility(data: unknown) {
  return FacilitySchema.parse(data);
}

export function validateContaminant(data: unknown) {
  return ContaminantSchema.parse(data);
}

export function validateInspection(data: unknown) {
  return InspectionSchema.parse(data);
}

export function validateEpisodicEvent(data: unknown) {
  return EpisodicEventSchema.parse(data);
}

export function validateSemanticRecord(data: unknown) {
  return SemanticRecordSchema.parse(data);
}

