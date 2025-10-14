// Shipment Compositions Get Tool - Get single shipment composition by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentCompositionsGetTool extends BaseTool {
  name = "shipment_compositions_get";
  description = "Get a single shipment composition by ID with all details";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment composition ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Shipment composition details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Shipment composition ID is required");
      }

      const response = await this.get(`/shipment-compositions/${params.id}`);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const composition = apiData.success ? apiData.data : apiData;

      return this.success(composition, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
