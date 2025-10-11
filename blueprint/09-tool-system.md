# Tool System & MCP Server Blueprint

## Overview
The MCP (Model Context Protocol) server provides a standardized interface for tools that agents can discover and execute. Each tool is self-contained, testable, and follows a common interface.

## Architecture

### Tool Interface

```typescript
// src/tools/types.ts
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
```

### MCP Server

```typescript
// src/mcp/server.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { MCPTool } from "../tools/types";

export class MCPServer {
  private server: Server;
  private tools: Map<string, MCPTool>;
  
  constructor(name: string, version: string) {
    this.server = new Server({ name, version }, {
      capabilities: {
        tools: {}
      }
    });
    this.tools = new Map();
  }
  
  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }
  
  async start(): Promise<void> {
    // Setup tool handlers
    this.setupHandlers();
    
    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
  
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler("tools/list", async () => {
      return {
        tools: Array.from(this.tools.values()).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: this.convertSchemaToJSON(tool.schema)
        }))
      };
    });
    
    // Execute tool
    this.server.setRequestHandler("tools/call", async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);
      
      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }
      
      const result = await tool.execute(args);
      return result;
    });
  }
  
  private convertSchemaToJSON(schema: ToolSchema): any {
    // Convert internal schema to JSON Schema format
    const properties: any = {};
    const required: string[] = [];
    
    for (const [key, value] of Object.entries(schema.params)) {
      properties[key] = {
        type: value.type,
        description: value.description
      };
      if (value.default !== undefined) {
        properties[key].default = value.default;
      }
      if (value.required) {
        required.push(key);
      }
    }
    
    return {
      type: "object",
      properties,
      required
    };
  }
}
```

## Waste Management Tools

### 1. Shipments Tool

```typescript
// src/tools/shipments.ts
import { MCPTool, ToolResult } from "./types";
import axios from "axios";

export class ShipmentsTool implements MCPTool {
  name = "shipments";
  description = "Query shipments with filters for date range, status, facility, and contamination status";
  
  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date (ISO 8601 format)",
        required: false
      },
      date_to: {
        type: "string",
        description: "End date (ISO 8601 format)",
        required: false
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false
      },
      status: {
        type: "string",
        description: "Shipment status (pending, in_transit, delivered, rejected)",
        required: false
      },
      has_contaminants: {
        type: "boolean",
        description: "Filter by contamination status",
        required: false
      },
      limit: {
        type: "number",
        description: "Maximum results to return",
        required: false,
        default: 100
      }
    },
    returns: {
      type: "array",
      description: "List of shipments matching the criteria"
    }
  };
  
  constructor(private apiBaseUrl: string) {}
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      
      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.facility_id) queryParams.append("facility_id", params.facility_id);
      if (params.status) queryParams.append("status", params.status);
      if (params.has_contaminants !== undefined) {
        queryParams.append("has_contaminants", params.has_contaminants.toString());
      }
      queryParams.append("limit", (params.limit || 100).toString());
      
      const response = await axios.get(
        `${this.apiBaseUrl}/shipments?${queryParams.toString()}`
      );
      
      return {
        success: true,
        data: response.data,
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

### 2. Facilities Tool

```typescript
// src/tools/facilities.ts
import { MCPTool, ToolResult } from "./types";
import axios from "axios";

export class FacilitiesTool implements MCPTool {
  name = "facilities";
  description = "Query waste management facilities with filters for location, type, and capacity";
  
  schema = {
    params: {
      location: {
        type: "string",
        description: "City or region name (e.g., 'Hannover')",
        required: false
      },
      type: {
        type: "string",
        description: "Facility type (sorting, processing, disposal)",
        required: false
      },
      min_capacity: {
        type: "number",
        description: "Minimum capacity in tons",
        required: false
      },
      facility_ids: {
        type: "array",
        description: "Specific facility IDs to retrieve",
        required: false
      }
    },
    returns: {
      type: "array",
      description: "List of facilities matching the criteria"
    }
  };
  
  constructor(private apiBaseUrl: string) {}
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const queryParams = new URLSearchParams();
      
      if (params.location) queryParams.append("location", params.location);
      if (params.type) queryParams.append("type", params.type);
      if (params.min_capacity) queryParams.append("min_capacity", params.min_capacity.toString());
      if (params.facility_ids) {
        queryParams.append("ids", params.facility_ids.join(","));
      }
      
      const response = await axios.get(
        `${this.apiBaseUrl}/facilities?${queryParams.toString()}`
      );
      
      return {
        success: true,
        data: response.data,
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

### 3. Contaminants Tool

```typescript
// src/tools/contaminants.ts
import { MCPTool, ToolResult } from "./types";
import axios from "axios";

export class ContaminantsTool implements MCPTool {
  name = "contaminants-detected";
  description = "Query detected contaminants in shipments or facilities";
  
  schema = {
    params: {
      shipment_ids: {
        type: "array",
        description: "List of shipment IDs to check",
        required: false
      },
      facility_id: {
        type: "string",
        description: "Facility ID to check contaminants",
        required: false
      },
      date_from: {
        type: "string",
        description: "Start date for detection period",
        required: false
      },
      date_to: {
        type: "string",
        description: "End date for detection period",
        required: false
      },
      contaminant_type: {
        type: "string",
        description: "Filter by contaminant type (Lead, Mercury, Plastic, etc.)",
        required: false
      },
      risk_level: {
        type: "string",
        description: "Filter by risk level (low, medium, high, critical)",
        required: false
      }
    },
    returns: {
      type: "array",
      description: "List of detected contaminants with details"
    }
  };
  
  constructor(private apiBaseUrl: string) {}
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const queryParams = new URLSearchParams();
      
      if (params.shipment_ids) {
        queryParams.append("shipment_ids", params.shipment_ids.join(","));
      }
      if (params.facility_id) queryParams.append("facility_id", params.facility_id);
      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.contaminant_type) queryParams.append("type", params.contaminant_type);
      if (params.risk_level) queryParams.append("risk_level", params.risk_level);
      
      const response = await axios.get(
        `${this.apiBaseUrl}/contaminants-detected?${queryParams.toString()}`
      );
      
      return {
        success: true,
        data: response.data,
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

### 4. Inspections Tool

```typescript
// src/tools/inspections.ts
import { MCPTool, ToolResult } from "./types";
import axios from "axios";

export class InspectionsTool implements MCPTool {
  name = "inspections";
  description = "Query shipment inspections with filters for status, date, and results";
  
  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date for inspection period",
        required: false
      },
      date_to: {
        type: "string",
        description: "End date for inspection period",
        required: false
      },
      status: {
        type: "string",
        description: "Inspection status (accepted, rejected, pending)",
        required: false
      },
      facility_id: {
        type: "string",
        description: "Filter by facility where inspection occurred",
        required: false
      },
      shipment_id: {
        type: "string",
        description: "Filter by specific shipment",
        required: false
      },
      has_risk_contaminants: {
        type: "boolean",
        description: "Filter inspections that detected risky contaminants",
        required: false
      }
    },
    returns: {
      type: "array",
      description: "List of inspections matching the criteria"
    }
  };
  
  constructor(private apiBaseUrl: string) {}
  
  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const queryParams = new URLSearchParams();
      
      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.status) queryParams.append("status", params.status);
      if (params.facility_id) queryParams.append("facility_id", params.facility_id);
      if (params.shipment_id) queryParams.append("shipment_id", params.shipment_id);
      if (params.has_risk_contaminants !== undefined) {
        queryParams.append("has_risk_contaminants", params.has_risk_contaminants.toString());
      }
      
      const response = await axios.get(
        `${this.apiBaseUrl}/inspections?${queryParams.toString()}`
      );
      
      return {
        success: true,
        data: response.data,
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
```

## Tool Registry

```typescript
// src/tools/index.ts
import { MCPServer } from "../mcp/server";
import { ShipmentsTool } from "./shipments";
import { FacilitiesTool } from "./facilities";
import { ContaminantsTool } from "./contaminants";
import { InspectionsTool } from "./inspections";

export function registerAllTools(server: MCPServer, apiBaseUrl: string): void {
  // Register all tools
  server.registerTool(new ShipmentsTool(apiBaseUrl));
  server.registerTool(new FacilitiesTool(apiBaseUrl));
  server.registerTool(new ContaminantsTool(apiBaseUrl));
  server.registerTool(new InspectionsTool(apiBaseUrl));
}

export { ShipmentsTool, FacilitiesTool, ContaminantsTool, InspectionsTool };
```

## Testing Strategy

### Unit Tests

```typescript
// src/tests/tools/shipments.test.ts
import nock from 'nock';
import { ShipmentsTool } from '../../tools/shipments';

describe('ShipmentsTool', () => {
  let tool: ShipmentsTool;
  const apiUrl = 'https://api.wasteer.dev';
  
  beforeEach(() => {
    tool = new ShipmentsTool(apiUrl);
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should fetch shipments with date filter', async () => {
    const mockData = [
      { id: 'S1', date: '2025-10-05', facility_id: 'F1', status: 'delivered' }
    ];
    
    nock(apiUrl)
      .get('/shipments')
      .query({ date_from: '2025-10-04', date_to: '2025-10-11', limit: '100' })
      .reply(200, mockData);
    
    const result = await tool.execute({
      date_from: '2025-10-04',
      date_to: '2025-10-11'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(result.metadata.tool).toBe('shipments');
    expect(result.metadata.executionTime).toBeGreaterThan(0);
  });
  
  it('should handle API errors gracefully', async () => {
    nock(apiUrl)
      .get('/shipments')
      .query(true)
      .reply(500, { error: 'Internal Server Error' });
    
    const result = await tool.execute({});
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error?.code).toBe('500');
  });
  
  it('should filter shipments with contaminants', async () => {
    const mockData = [
      { id: 'S2', has_contaminants: true }
    ];
    
    nock(apiUrl)
      .get('/shipments')
      .query({ has_contaminants: 'true', limit: '100' })
      .reply(200, mockData);
    
    const result = await tool.execute({ has_contaminants: true });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockData);
  });
});
```

## Mock Data Fixtures

```typescript
// src/tests/fixtures/waste-data.ts
export const mockShipments = [
  {
    id: 'S1',
    facility_id: 'F1',
    date: '2025-10-05',
    status: 'delivered',
    weight_kg: 1500,
    has_contaminants: false
  },
  {
    id: 'S2',
    facility_id: 'F2',
    date: '2025-10-06',
    status: 'rejected',
    weight_kg: 800,
    has_contaminants: true
  }
];

export const mockFacilities = [
  {
    id: 'F1',
    name: 'Hannover Sorting Center',
    location: 'Hannover',
    type: 'sorting',
    capacity_tons: 500
  },
  {
    id: 'F2',
    name: 'Berlin Processing Plant',
    location: 'Berlin',
    type: 'processing',
    capacity_tons: 1000
  }
];

export const mockContaminants = [
  {
    id: 'C1',
    shipment_id: 'S2',
    type: 'Lead',
    concentration_ppm: 150,
    risk_level: 'high',
    detected_at: '2025-10-06T10:30:00Z'
  }
];

export const mockInspections = [
  {
    id: 'I1',
    shipment_id: 'S1',
    facility_id: 'F1',
    date: '2025-10-05',
    status: 'accepted',
    inspector: 'John Doe',
    notes: 'Clean shipment'
  },
  {
    id: 'I2',
    shipment_id: 'S2',
    facility_id: 'F2',
    date: '2025-10-06',
    status: 'rejected',
    inspector: 'Jane Smith',
    notes: 'High lead concentration detected',
    contaminants_detected: ['Lead']
  }
];
```

## Configuration

```typescript
// src/config/tools.config.ts
export const toolsConfig = {
  apiBaseUrl: process.env.WASTEER_API_URL || 'https://api.wasteer.dev',
  timeout: parseInt(process.env.TOOL_TIMEOUT || '30000'),
  retries: parseInt(process.env.TOOL_RETRIES || '3'),
  retryDelay: parseInt(process.env.TOOL_RETRY_DELAY || '1000')
};
```

## Next Steps

1. Implement MCP server class
2. Implement each tool with full test coverage
3. Create mock data fixtures
4. Test end-to-end MCP server functionality
5. Add error handling and retry logic
6. Document tool usage examples

