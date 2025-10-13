/**
 * Tool-related type definitions
 * MCP tool interfaces and domain-specific types for waste management
 */

import type { ToolResult } from './agent.js';

// Re-export ToolResult from agent.ts for tool implementations
export type { ToolResult } from './agent.js';

/**
 * MCP Tool interface
 */
export interface MCPTool {
  name: string;
  description: string;
  schema: ToolSchema;
  execute(params: Record<string, any>): Promise<ToolResult>;
}

export interface ToolSchema {
  params: Record<string, ToolParam>;
  returns: {
    type: string;
    description: string;
  };
}

export interface ToolParam {
  type: string;
  description: string;
  required: boolean;
  default?: any;
  enum?: string[];
  min?: number;
  max?: number;
}

// Note: ToolResult is defined in agent.ts and re-exported from there
// Both agent and tool contexts use the same ToolResult type for consistency

/**
 * Domain-specific types (Waste Management)
 */

export interface Shipment {
  id: string;
  facility_id: string;
  date: string;
  status: ShipmentStatus;
  weight_kg: number;
  has_contaminants: boolean;
  origin?: string;
  destination?: string;
  waste_type?: string;
  waste_code?: string;
  carrier?: string;
  composition_notes?: string;
}

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'rejected';

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: FacilityType;
  capacity_tons: number;
  current_load_tons?: number;
  coordinates?: Coordinates;
  accepted_waste_types?: string[];
  rejected_waste_types?: string[];
  contact_email?: string;
  contact_phone?: string;
  operating_hours?: string;
}

export type FacilityType = 'sorting' | 'processing' | 'disposal';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Contaminant {
  id: string;
  shipment_id: string;
  facility_id?: string;
  type: string;
  concentration_ppm: number;
  risk_level: RiskLevel;
  detected_at: string;
  notes?: string;
  analysis_notes?: string;
  waste_item_detected?: string;
  explosive_level?: ChemicalLevel;
  so2_level?: ChemicalLevel;
  hcl_level?: ChemicalLevel;
  estimated_size?: number;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type ChemicalLevel = 'low' | 'medium' | 'high';

export interface Inspection {
  id: string;
  shipment_id: string;
  facility_id: string;
  date: string;
  status: InspectionStatus;
  inspector: string;
  notes?: string;
  contaminants_detected?: string[];
  risk_assessment?: string;
  inspection_type?: InspectionType;
  duration_minutes?: number;
  passed?: boolean;
  follow_up_required?: boolean;
  photos?: string[];
}

export type InspectionStatus = 'accepted' | 'rejected' | 'pending';
export type InspectionType = 'arrival' | 'processing' | 'departure' | 'random';

