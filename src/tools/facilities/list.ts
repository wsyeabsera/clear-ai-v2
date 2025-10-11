// Facilities List Tool - Query facilities with filters
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class FacilitiesListTool extends BaseTool {
  name = "facilities_list";
  description = "Query facilities with filters for location, type, capacity, and accepted waste types";

  schema = {
    params: {
      location: {
        type: "string",
        description: "Filter by location (partial match)",
        required: false,
      },
      type: {
        type: "string",
        description: "Facility type (sorting, processing, disposal)",
        required: false,
      },
      min_capacity: {
        type: "number",
        description: "Minimum capacity in tons",
        required: false,
      },
      ids: {
        type: "string",
        description: "Comma-separated facility IDs",
        required: false,
      },
    },
    returns: {
      type: "array",
      description: "List of facilities matching the criteria",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate enum values
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

      const queryParams: Record<string, string> = {};
      if (params.location) queryParams.location = params.location;
      if (params.type) queryParams.type = params.type;
      if (params.min_capacity) queryParams.min_capacity = params.min_capacity.toString();
      if (params.ids) queryParams.ids = params.ids;

      const response = await this.get("/facilities", queryParams);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

