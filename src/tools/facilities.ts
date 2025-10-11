// Facilities Tool - Query waste management facilities
import { MCPTool, ToolResult, Facility } from "./types.js";
import axios from "axios";

export class FacilitiesTool implements MCPTool {
  name = "facilities";
  description =
    "Query waste management facilities with filters for location, type, and capacity";

  schema = {
    params: {
      location: {
        type: "string",
        description: "City or region name (e.g., 'Hannover')",
        required: false,
      },
      type: {
        type: "string",
        description: "Facility type (sorting, processing, disposal)",
        required: false,
      },
      min_capacity: {
        type: "number",
        description: "Minimum capacity in tons",
        required: false,
      },
      facility_ids: {
        type: "array",
        description: "Specific facility IDs to retrieve",
        required: false,
      },
    },
    returns: {
      type: "array",
      description: "List of facilities matching the criteria",
    },
  };

  constructor(private apiBaseUrl: string) {}

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const queryParams = new URLSearchParams();

      if (params.location) queryParams.append("location", params.location);
      if (params.type) queryParams.append("type", params.type);
      if (params.min_capacity)
        queryParams.append("min_capacity", params.min_capacity.toString());
      if (params.facility_ids) {
        queryParams.append("ids", params.facility_ids.join(","));
      }

      const response = await axios.get<Facility[]>(
        `${this.apiBaseUrl}/facilities?${queryParams.toString()}`
      );

      return {
        success: true,
        data: response.data,
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message,
        },
        metadata: {
          tool: this.name,
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

