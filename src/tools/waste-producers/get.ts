// Waste Producers Get Tool - Get single waste producer by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class WasteProducersGetTool extends BaseTool {
  name = "waste_producers_get";
  description = "Get a single waste producer by ID with all details";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Waste producer ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Waste producer details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Waste producer ID is required");
      }

      const response = await this.get(`/waste-producers/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const producer = apiData.success ? apiData.data : apiData;

      return this.success(producer, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
