// Tool interfaces and types for the MCP server

export interface MCPTool {
  name: string;
  description: string;
  schema: ToolSchema;
  execute(params: Record<string, any>): Promise<ToolResult>;
}

export interface ToolSchema {
  params: Record<string, {
    type: string;
    description: string;
    required: boolean;
    default?: any;
  }>;
  returns: {
    type: string;
    description: string;
  };
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
  metadata: {
    tool: string;
    executionTime: number;
    timestamp: string;
  };
}

// Waste management domain types
export interface Shipment {
  id: string;
  facility_id: string;
  date: string;
  status: 'pending' | 'in_transit' | 'delivered' | 'rejected';
  weight_kg: number;
  has_contaminants: boolean;
  origin?: string;
  destination?: string;
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  type: 'sorting' | 'processing' | 'disposal';
  capacity_tons: number;
  current_load_tons?: number;
  coordinates?: {
    lat: number;
    lon: number;
  };
}

export interface Contaminant {
  id: string;
  shipment_id: string;
  facility_id?: string;
  type: string;
  concentration_ppm: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  notes?: string;
}

export interface Inspection {
  id: string;
  shipment_id: string;
  facility_id: string;
  date: string;
  status: 'accepted' | 'rejected' | 'pending';
  inspector: string;
  notes?: string;
  contaminants_detected?: string[];
  risk_assessment?: string;
}

