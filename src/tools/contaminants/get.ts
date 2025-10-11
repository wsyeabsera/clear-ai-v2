// Contaminants Get Tool - Get single contaminant by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContaminantsGetTool extends BaseTool {
  name = "contaminants_get";
  description = "Get a single contaminant by ID with all details including chemical levels and analysis notes";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contaminant ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Contaminant details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.get(`/contaminants-detected/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

