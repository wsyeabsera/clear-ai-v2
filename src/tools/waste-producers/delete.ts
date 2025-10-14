// Waste Producers Delete Tool - Delete waste producer
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class WasteProducersDeleteTool extends BaseTool {
  name = "waste_producers_delete";
  description = "Delete a waste producer by ID";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Waste producer ID to delete",
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
      if (!params.id) {
        throw new Error("Waste producer ID is required");
      }

      const response = await this.delete(`/waste-producers/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const result = apiData.success ? apiData : { success: true, message: "Waste producer deleted successfully" };

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
