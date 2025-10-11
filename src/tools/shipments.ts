// Shipments Tool - Query shipments with various filters
import { MCPTool, ToolResult, Shipment } from "./types.js";
import axios from "axios";

export class ShipmentsTool implements MCPTool {
  name = "shipments";
  description =
    "Query shipments with filters for date range, status, facility, and contamination status";

  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date (ISO 8601 format)",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date (ISO 8601 format)",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility ID",
        required: false,
      },
      status: {
        type: "string",
        description:
          "Shipment status (pending, in_transit, delivered, rejected)",
        required: false,
      },
      has_contaminants: {
        type: "boolean",
        description: "Filter by contamination status",
        required: false,
      },
      limit: {
        type: "number",
        description: "Maximum results to return",
        required: false,
        default: 100,
      },
    },
    returns: {
      type: "array",
      description: "List of shipments matching the criteria",
    },
  };

  constructor(private apiBaseUrl: string) {}

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Build query parameters
      const queryParams = new URLSearchParams();

      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.facility_id)
        queryParams.append("facility_id", params.facility_id);
      if (params.status) queryParams.append("status", params.status);
      if (params.has_contaminants !== undefined) {
        queryParams.append(
          "has_contaminants",
          params.has_contaminants.toString()
        );
      }
      queryParams.append("limit", (params.limit || 100).toString());

      const response = await axios.get<Shipment[]>(
        `${this.apiBaseUrl}/shipments?${queryParams.toString()}`
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

