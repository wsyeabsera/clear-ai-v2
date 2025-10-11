// Contaminants Update Tool - Update existing contaminant
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ContaminantsUpdateTool extends BaseTool {
  name = "contaminants_update";
  description = "Update an existing contaminant record (partial updates supported)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contaminant ID to update",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Facility ID",
        required: false,
      },
      type: {
        type: "string",
        description: "Contaminant type",
        required: false,
      },
      concentration_ppm: {
        type: "number",
        description: "Concentration in ppm",
        required: false,
      },
      risk_level: {
        type: "string",
        description: "Risk level (low, medium, high, critical)",
        required: false,
      },
      detected_at: {
        type: "string",
        description: "Detection timestamp",
        required: false,
      },
      notes: {
        type: "string",
        description: "General notes",
        required: false,
      },
      analysis_notes: {
        type: "string",
        description: "Analysis notes",
        required: false,
      },
      waste_item_detected: {
        type: "string",
        description: "Waste item detected",
        required: false,
      },
      explosive_level: {
        type: "string",
        description: "Explosive level",
        required: false,
      },
      so2_level: {
        type: "string",
        description: "SO2 level",
        required: false,
      },
      hcl_level: {
        type: "string",
        description: "HCl level",
        required: false,
      },
      estimated_size: {
        type: "number",
        description: "Estimated size",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated contaminant details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      if (params.risk_level) {
        const riskValidation = this.validateEnum(
          params.risk_level,
          ["low", "medium", "high", "critical"],
          "risk_level"
        );
        if (!riskValidation.valid) {
          throw new Error(riskValidation.error);
        }
      }

      const { id, ...updateData } = params;
      const response = await this.put(`/contaminants-detected/${id}`, updateData);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

