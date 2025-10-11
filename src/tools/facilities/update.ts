// Facilities Update Tool - Update existing facility
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class FacilitiesUpdateTool extends BaseTool {
  name = "facilities_update";
  description = "Update an existing facility (partial updates supported)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Facility ID to update",
        required: true,
      },
      name: {
        type: "string",
        description: "Facility name",
        required: false,
      },
      location: {
        type: "string",
        description: "Facility location",
        required: false,
      },
      type: {
        type: "string",
        description: "Facility type (sorting, processing, disposal)",
        required: false,
      },
      capacity_tons: {
        type: "number",
        description: "Maximum capacity in tons",
        required: false,
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
      description: "Updated facility details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      if (params.type) {
        const typeValidation = this.validateEnum(
          params.type,
          ["sorting", "processing", "disposal"],
          "type"
        );
        if (!typeValidation.valid) {
          throw new Error(typeValidation.error);
        }
      }

      const { id, ...updateData } = params;
      const response = await this.put(`/facilities/${id}`, updateData);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

