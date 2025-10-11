// Facilities Get Tool - Get single facility by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class FacilitiesGetTool extends BaseTool {
  name = "facilities_get";
  description = "Get a single facility by ID with all details including contact info and accepted waste types";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Facility ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Facility details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.get(`/facilities/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

