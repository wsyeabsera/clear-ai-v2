// Contaminants Create Tool - Create new contaminant record
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ContaminantsCreateTool extends BaseTool {
  name = "contaminants_create";
  description = "Create a new contaminant detection record with all enhanced fields including chemical levels";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique contaminant ID",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID where detected",
        required: true,
      },
      facility_id: {
        type: "string",
        description: "Facility ID where detected",
        required: false,
      },
      type: {
        type: "string",
        description: "Contaminant type (Lead, Mercury, Plastic, etc.)",
        required: true,
      },
      concentration_ppm: {
        type: "number",
        description: "Concentration in parts per million",
        required: true,
      },
      risk_level: {
        type: "string",
        description: "Risk level (low, medium, high, critical)",
        required: true,
      },
      detected_at: {
        type: "string",
        description: "Detection timestamp (ISO 8601)",
        required: true,
      },
      notes: {
        type: "string",
        description: "General notes",
        required: false,
      },
      analysis_notes: {
        type: "string",
        description: "Detailed analysis notes",
        required: false,
      },
      waste_item_detected: {
        type: "string",
        description: "Specific waste item detected",
        required: false,
      },
      explosive_level: {
        type: "string",
        description: "Explosive level (low, medium, high)",
        required: false,
      },
      so2_level: {
        type: "string",
        description: "SO2 level (low, medium, high)",
        required: false,
      },
      hcl_level: {
        type: "string",
        description: "HCl level (low, medium, high)",
        required: false,
      },
      estimated_size: {
        type: "number",
        description: "Estimated size/volume",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Created contaminant details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, [
        "id",
        "shipment_id",
        "type",
        "concentration_ppm",
        "risk_level",
        "detected_at",
      ]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const riskValidation = this.validateEnum(
        params.risk_level,
        ["low", "medium", "high", "critical"],
        "risk_level"
      );
      if (!riskValidation.valid) {
        throw new Error(riskValidation.error);
      }

      const response = await this.post("/contaminants-detected", params);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

