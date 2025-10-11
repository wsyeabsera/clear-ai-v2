// Contaminants Tool - Query detected contaminants
import { MCPTool, ToolResult, Contaminant } from "./types.js";
import axios from "axios";

export class ContaminantsTool implements MCPTool {
  name = "contaminants-detected";
  description = "Query detected contaminants in shipments or facilities";

  schema = {
    params: {
      shipment_ids: {
        type: "array",
        description: "List of shipment IDs to check",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Facility ID to check contaminants",
        required: false,
      },
      date_from: {
        type: "string",
        description: "Start date for detection period",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date for detection period",
        required: false,
      },
      contaminant_type: {
        type: "string",
        description:
          "Filter by contaminant type (Lead, Mercury, Plastic, etc.)",
        required: false,
      },
      risk_level: {
        type: "string",
        description: "Filter by risk level (low, medium, high, critical)",
        required: false,
      },
    },
    returns: {
      type: "array",
      description: "List of detected contaminants with details",
    },
  };

  constructor(private apiBaseUrl: string) {}

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const queryParams = new URLSearchParams();

      if (params.shipment_ids) {
        queryParams.append("shipment_ids", params.shipment_ids.join(","));
      }
      if (params.facility_id)
        queryParams.append("facility_id", params.facility_id);
      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.contaminant_type)
        queryParams.append("type", params.contaminant_type);
      if (params.risk_level)
        queryParams.append("risk_level", params.risk_level);

      const response = await axios.get<Contaminant[]>(
        `${this.apiBaseUrl}/contaminants-detected?${queryParams.toString()}`
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

