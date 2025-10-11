// Shipments Get Tool - Get single shipment by ID
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ShipmentsGetTool extends BaseTool {
  name = "shipments_get";
  description = "Get a single shipment by ID with all details including enhanced fields";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment ID",
        required: true,
      },
    },
    returns: {
      type: "object",
      description: "Shipment details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate required fields
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.get(`/shipments/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

