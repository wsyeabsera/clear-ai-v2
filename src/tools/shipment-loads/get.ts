// Shipment Loads Get Tool - Get single shipment load by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentLoadsGetTool extends BaseTool {
  name = "shipment_loads_get";
  description = "Get a single shipment load by ID with all details";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment load ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Shipment load details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Shipment load ID is required");
      }

      const response = await this.get(`/shipment-loads/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const load = apiData.success ? apiData.data : apiData;

      return this.success(load, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
