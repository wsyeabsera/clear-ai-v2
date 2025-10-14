// Shipment Loads List Tool - Query shipment loads with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentLoadsListTool extends BaseTool {
  name = "shipment_loads_list";
  description = "Query shipment loads with filters for shipment, camera, detection date, and waste codes";

  schema = {
    params: {
      shipment_id: {
        type: "string",
        description: "Filter by shipment ID",
        required: false,
      },
      camera_id: {
        type: "string",
        description: "Filter by camera ID",
        required: false,
      },
      detected_at_from: {
        type: "string",
        description: "Filter loads detected from this date (ISO 8601)",
        required: false,
      },
      detected_at_to: {
        type: "string",
        description: "Filter loads detected until this date (ISO 8601)",
        required: false,
      },
      waste_code: {
        type: "string",
        description: "Filter by detected waste code (e.g., 191212, 150101)",
        required: false,
      },
      matches_contract: {
        type: "boolean",
        description: "Filter by contract match status",
        required: false,
      },
      min_confidence: {
        type: "number",
        description: "Minimum analysis confidence (0-1)",
        required: false,
      },
      max_confidence: {
        type: "number",
        description: "Maximum analysis confidence (0-1)",
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
      description: "List of shipment loads matching the criteria",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate confidence range
      if (params.min_confidence !== undefined && (params.min_confidence < 0 || params.min_confidence > 1)) {
        throw new Error("min_confidence must be between 0 and 1");
      }
      if (params.max_confidence !== undefined && (params.max_confidence < 0 || params.max_confidence > 1)) {
        throw new Error("max_confidence must be between 0 and 1");
      }

      // Build query parameters
      const queryParams: Record<string, string> = {};
      
      if (params.shipment_id) queryParams.shipment_id = params.shipment_id;
      if (params.camera_id) queryParams.camera_id = params.camera_id;
      if (params.detected_at_from) queryParams.detected_at_from = params.detected_at_from;
      if (params.detected_at_to) queryParams.detected_at_to = params.detected_at_to;
      if (params.waste_code) queryParams.waste_code = params.waste_code;
      if (params.matches_contract !== undefined) queryParams.matches_contract = params.matches_contract.toString();
      if (params.min_confidence !== undefined) queryParams.min_confidence = params.min_confidence.toString();
      if (params.max_confidence !== undefined) queryParams.max_confidence = params.max_confidence.toString();
      queryParams.limit = (params.limit || 100).toString();

      const response = await this.get("/shipment-loads", queryParams);

      // Unwrap API response to get just the data array
      const apiData = response.data as any;
      const loads = apiData.success ? apiData.data : apiData;

      return this.success(loads, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
