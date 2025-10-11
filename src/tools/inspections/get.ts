// Inspections Get Tool - Get single inspection by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class InspectionsGetTool extends BaseTool {
  name = "inspections_get";
  description = "Get a single inspection by ID with all details including type, duration, and photos";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Inspection ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Inspection details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.get(`/inspections/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

