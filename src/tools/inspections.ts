// Inspections Tool - Query shipment inspections
import { MCPTool, ToolResult, Inspection } from "../shared/types/tool.js";
import axios from "axios";

export class InspectionsTool implements MCPTool {
  name = "inspections";
  description =
    "Query shipment inspections with filters for status, date, and results";

  schema = {
    params: {
      date_from: {
        type: "string",
        description: "Start date for inspection period",
        required: false,
      },
      date_to: {
        type: "string",
        description: "End date for inspection period",
        required: false,
      },
      status: {
        type: "string",
        description: "Inspection status (accepted, rejected, pending)",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Filter by facility where inspection occurred",
        required: false,
      },
      shipment_id: {
        type: "string",
        description: "Filter by specific shipment",
        required: false,
      },
      has_risk_contaminants: {
        type: "boolean",
        description: "Filter inspections that detected risky contaminants",
        required: false,
      },
    },
    returns: {
      type: "array",
      description: "List of inspections matching the criteria",
    },
  };

  constructor(private apiBaseUrl: string) {}

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const queryParams = new URLSearchParams();

      if (params.date_from) queryParams.append("date_from", params.date_from);
      if (params.date_to) queryParams.append("date_to", params.date_to);
      if (params.status) queryParams.append("status", params.status);
      if (params.facility_id)
        queryParams.append("facility_id", params.facility_id);
      if (params.shipment_id)
        queryParams.append("shipment_id", params.shipment_id);
      if (params.has_risk_contaminants !== undefined) {
        queryParams.append(
          "has_risk_contaminants",
          params.has_risk_contaminants.toString()
        );
      }

      const response = await axios.get<Inspection[]>(
        `${this.apiBaseUrl}/inspections?${queryParams.toString()}`
      );

      return {
        success: true,
        tool: this.name,
        data: response.data,
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      return {
        success: false,
        tool: this.name,
        error: {
          code: error.response?.status?.toString() || "UNKNOWN",
          message: error.message,
        
        },
        metadata: {
          executionTime: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }
}

