// Contaminants Delete Tool - Delete contaminant
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ContaminantsDeleteTool extends BaseTool {
  name = "contaminants_delete";
  description = "Delete a contaminant record by ID";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contaminant ID to delete",
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

      const response = await this.delete(`/contaminants-detected/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

