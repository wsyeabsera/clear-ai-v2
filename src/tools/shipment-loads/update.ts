// Shipment Loads Update Tool - Update existing shipment load
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentLoadsUpdateTool extends BaseTool {
  name = "shipment_loads_update";
  description = "Update an existing shipment load";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment load ID to update",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID",
        required: false,
      },
      detected_at: {
        type: "string",
        description: "Detection timestamp (ISO 8601)",
        required: false,
      },
      camera_id: {
        type: "string",
        description: "Camera ID that detected the load",
        required: false,
      },
      waste_codes_detected: {
        type: "array",
        description: "Array of detected waste codes (e.g., [\"191212\", \"150101\"])",
        required: false,
      },
      total_weight_kg: {
        type: "number",
        description: "Total weight in kilograms",
        required: false,
      },
      image_url: {
        type: "string",
        description: "URL to the detection image",
        required: false,
      },
      analysis_confidence: {
        type: "number",
        description: "Analysis confidence level (0-1)",
        required: false,
      },
      matches_contract: {
        type: "boolean",
        description: "Whether the detected load matches the contract",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated shipment load details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Shipment load ID is required");
      }

      // Validate confidence range if provided
      if (params.analysis_confidence !== undefined && (params.analysis_confidence < 0 || params.analysis_confidence > 1)) {
        throw new Error("analysis_confidence must be between 0 and 1");
      }

      // Remove id from params for the request body
      const { id, ...updateData } = params;

      // Filter out undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await this.put(`/shipment-loads/${id}`, filteredUpdateData);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const load = apiData.success ? apiData.data : apiData;

      return this.success(load, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
