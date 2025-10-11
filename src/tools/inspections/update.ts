// Inspections Update Tool - Update existing inspection
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class InspectionsUpdateTool extends BaseTool {
  name = "inspections_update";
  description = "Update an existing inspection (partial updates supported)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Inspection ID to update",
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
      date: {
        type: "string",
        description: "Inspection date",
        required: false,
      },
      status: {
        type: "string",
        description: "Inspection status",
        required: false,
      },
      inspector: {
        type: "string",
        description: "Inspector name",
        required: false,
      },
      notes: {
        type: "string",
        description: "Notes",
        required: false,
      },
      contaminants_detected: {
        type: "array",
        description: "Contaminants detected",
        required: false,
      },
      risk_assessment: {
        type: "string",
        description: "Risk assessment",
        required: false,
      },
      inspection_type: {
        type: "string",
        description: "Inspection type",
        required: false,
      },
      duration_minutes: {
        type: "number",
        description: "Duration in minutes",
        required: false,
      },
      passed: {
        type: "boolean",
        description: "Passed status",
        required: false,
      },
      follow_up_required: {
        type: "boolean",
        description: "Follow-up required",
        required: false,
      },
      photos: {
        type: "array",
        description: "Photo URLs",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated inspection details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["accepted", "rejected", "pending"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      if (params.inspection_type) {
        const typeValidation = this.validateEnum(
          params.inspection_type,
          ["arrival", "processing", "departure", "random"],
          "inspection_type"
        );
        if (!typeValidation.valid) {
          throw new Error(typeValidation.error);
        }
      }

      const { id, ...updateData } = params;
      const response = await this.put(`/inspections/${id}`, updateData);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

