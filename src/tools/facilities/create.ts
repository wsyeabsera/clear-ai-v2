// Facilities Create Tool - Create new facility
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class FacilitiesCreateTool extends BaseTool {
  name = "facilities_create";
  description = "Create a new facility with all fields including accepted/rejected waste types and contact info";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique facility ID",
        required: true,
      },
      name: {
        type: "string",
        description: "Facility name",
        required: true,
      },
      location: {
        type: "string",
        description: "Facility location",
        required: true,
      },
      type: {
        type: "string",
        description: "Facility type (sorting, processing, disposal)",
        required: true,
      },
      capacity_tons: {
        type: "number",
        description: "Maximum capacity in tons",
        required: true,
      },
      current_load_tons: {
        type: "number",
        description: "Current load in tons",
        required: false,
      },
      coordinates: {
        type: "object",
        description: "Lat/lon coordinates {lat, lon}",
        required: false,
      },
      accepted_waste_types: {
        type: "array",
        description: "Array of accepted waste types",
        required: false,
      },
      rejected_waste_types: {
        type: "array",
        description: "Array of rejected waste types",
        required: false,
      },
      contact_email: {
        type: "string",
        description: "Contact email",
        required: false,
      },
      contact_phone: {
        type: "string",
        description: "Contact phone",
        required: false,
      },
      operating_hours: {
        type: "string",
        description: "Operating hours",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Created facility details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, [
        "id",
        "name",
        "location",
        "type",
        "capacity_tons",
      ]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const typeValidation = this.validateEnum(
        params.type,
        ["sorting", "processing", "disposal"],
        "type"
      );
      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }

      const response = await this.post("/facilities", params);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

