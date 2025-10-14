// Shipment Loads Create Tool - Create new shipment load
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentLoadsCreateTool extends BaseTool {
  name = "shipment_loads_create";
  description = "Create a new shipment load record";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique shipment load ID",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID",
        required: true,
      },
      detected_at: {
        type: "string",
        description: "Detection timestamp (ISO 8601)",
        required: true,
      },
      camera_id: {
        type: "string",
        description: "Camera ID that detected the load",
        required: true,
      },
      waste_codes_detected: {
        type: "array",
        description: "Array of detected waste codes (e.g., [\"191212\", \"150101\"])",
        required: true,
      },
      total_weight_kg: {
        type: "number",
        description: "Total weight in kilograms",
        required: true,
      },
      image_url: {
        type: "string",
        description: "URL to the detection image",
        required: false,
      },
      analysis_confidence: {
        type: "number",
        description: "Analysis confidence level (0-1)",
        required: true,
      },
      matches_contract: {
        type: "boolean",
        description: "Whether the detected load matches the contract",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Created shipment load details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate required fields
      if (!params.id || !params.shipment_id || !params.detected_at) {
        throw new Error("ID, shipment_id, and detected_at are required");
      }

      if (!params.camera_id || !params.waste_codes_detected) {
        throw new Error("camera_id and waste_codes_detected are required");
      }

      if (!Array.isArray(params.waste_codes_detected)) {
        throw new Error("waste_codes_detected must be an array");
      }

      if (!params.total_weight_kg || params.total_weight_kg <= 0) {
        throw new Error("total_weight_kg must be a positive number");
      }

      // Validate confidence range
      if (params.analysis_confidence === undefined || params.analysis_confidence < 0 || params.analysis_confidence > 1) {
        throw new Error("analysis_confidence must be between 0 and 1");
      }

      if (params.matches_contract === undefined) {
        throw new Error("matches_contract is required");
      }

      const response = await this.post("/shipment-loads", params);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const load = apiData.success ? apiData.data : apiData;

      return this.success(load, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
