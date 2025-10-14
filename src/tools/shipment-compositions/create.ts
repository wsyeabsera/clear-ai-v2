// Shipment Compositions Create Tool - Create new shipment composition
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentCompositionsCreateTool extends BaseTool {
  name = "shipment_compositions_create";
  description = "Create a new shipment composition record";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique shipment composition ID",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID",
        required: true,
      },
      waste_code: {
        type: "string",
        description: "European waste code (e.g., 191212, 150101)",
        required: true,
      },
      waste_description: {
        type: "string",
        description: "Description of the waste type",
        required: true,
      },
      percentage: {
        type: "number",
        description: "Percentage of this waste type (0-100)",
        required: true,
      },
      weight_kg: {
        type: "number",
        description: "Weight in kilograms",
        required: true,
      },
      detected_by: {
        type: "string",
        description: "Detection method (camera, manual, sensor)",
        required: true,
      },
      confidence: {
        type: "number",
        description: "Confidence level (0-1)",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Created shipment composition details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate enum values
      const detectedByValidation = this.validateEnum(
        params.detected_by,
        ["camera", "manual", "sensor"],
        "detected_by"
      );
      if (!detectedByValidation.valid) {
        throw new Error(detectedByValidation.error);
      }

      // Validate required fields
      if (!params.id || !params.shipment_id || !params.waste_code) {
        throw new Error("ID, shipment_id, and waste_code are required");
      }

      if (!params.waste_description) {
        throw new Error("waste_description is required");
      }

      // Validate percentage range
      if (params.percentage === undefined || params.percentage < 0 || params.percentage > 100) {
        throw new Error("percentage must be between 0 and 100");
      }

      if (!params.weight_kg || params.weight_kg <= 0) {
        throw new Error("weight_kg must be a positive number");
      }

      // Validate confidence range
      if (params.confidence === undefined || params.confidence < 0 || params.confidence > 1) {
        throw new Error("confidence must be between 0 and 1");
      }

      const response = await this.post("/shipment-compositions", params);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const composition = apiData.success ? apiData.data : apiData;

      return this.success(composition, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
