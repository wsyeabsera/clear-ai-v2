// Inspections Create Tool - Create new inspection
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class InspectionsCreateTool extends BaseTool {
  name = "inspections_create";
  description = "Create a new inspection record with all fields including type, duration, and photos";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique inspection ID",
        required: true,
      },
      shipment_id: {
        type: "string",
        description: "Shipment ID being inspected",
        required: true,
      },
      facility_id: {
        type: "string",
        description: "Facility ID where inspection occurred",
        required: true,
      },
      date: {
        type: "string",
        description: "Inspection date (ISO 8601)",
        required: true,
      },
      status: {
        type: "string",
        description: "Inspection status (accepted, rejected, pending)",
        required: true,
      },
      inspector: {
        type: "string",
        description: "Name of the inspector",
        required: true,
      },
      notes: {
        type: "string",
        description: "General notes",
        required: false,
      },
      contaminants_detected: {
        type: "array",
        description: "Array of contaminant types detected",
        required: false,
      },
      risk_assessment: {
        type: "string",
        description: "Risk assessment summary",
        required: false,
      },
      inspection_type: {
        type: "string",
        description: "Type of inspection (arrival, processing, departure, random)",
        required: false,
      },
      duration_minutes: {
        type: "number",
        description: "Duration of inspection in minutes",
        required: false,
      },
      passed: {
        type: "boolean",
        description: "Whether inspection passed",
        required: false,
      },
      follow_up_required: {
        type: "boolean",
        description: "Whether follow-up is needed",
        required: false,
      },
      photos: {
        type: "array",
        description: "Array of photo URLs",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Created inspection details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, [
        "id",
        "shipment_id",
        "facility_id",
        "date",
        "status",
        "inspector",
      ]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const statusValidation = this.validateEnum(
        params.status,
        ["accepted", "rejected", "pending"],
        "status"
      );
      if (!statusValidation.valid) {
        throw new Error(statusValidation.error);
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

      const response = await this.post("/inspections", params);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

