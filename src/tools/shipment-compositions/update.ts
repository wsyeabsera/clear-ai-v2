// Shipment Compositions Update Tool - Update existing shipment composition
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentCompositionsUpdateTool extends BaseTool {
  name = "shipment_compositions_update";
  description = "Update an existing shipment composition";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment composition ID to update",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID",
        required: false,
      },
      waste_code: {
        type: "string",
        description: "European waste code (e.g., 191212, 150101)",
        required: false,
      },
      waste_description: {
        type: "string",
        description: "Description of the waste type",
        required: false,
      },
      percentage: {
        type: "number",
        description: "Percentage of this waste type (0-100)",
        required: false,
      },
      weight_kg: {
        type: "number",
        description: "Weight in kilograms",
        required: false,
      },
      detected_by: {
        type: "string",
        description: "Detection method (camera, manual, sensor)",
        required: false,
      },
      confidence: {
        type: "number",
        description: "Confidence level (0-1)",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated shipment composition details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Shipment composition ID is required");
      }

      // Validate enum values if provided
      if (params.detected_by) {
        const detectedByValidation = this.validateEnum(
          params.detected_by,
          ["camera", "manual", "sensor"],
          "detected_by"
        );
        if (!detectedByValidation.valid) {
          throw new Error(detectedByValidation.error);
        }
      }

      // Validate percentage range if provided
      if (params.percentage !== undefined && (params.percentage < 0 || params.percentage > 100)) {
        throw new Error("percentage must be between 0 and 100");
      }

      // Validate confidence range if provided
      if (params.confidence !== undefined && (params.confidence < 0 || params.confidence > 1)) {
        throw new Error("confidence must be between 0 and 1");
      }

      // Remove id from params for the request body
      const { id, ...updateData } = params;

      // Filter out undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await this.put(`/shipment-compositions/${id}`, filteredUpdateData);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const composition = apiData.success ? apiData.data : apiData;

      return this.success(composition, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
