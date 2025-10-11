// Facilities Delete Tool - Delete facility
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class FacilitiesDeleteTool extends BaseTool {
  name = "facilities_delete";
  description = "Delete a facility by ID";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Facility ID to delete",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Deletion confirmation",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.delete(`/facilities/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

