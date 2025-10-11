// Shipments Delete Tool - Delete shipment
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../types.js";

export class ShipmentsDeleteTool extends BaseTool {
  name = "shipments_delete";
  description = "Delete a shipment by ID";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment ID to delete",
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
      // Validate required fields
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      const response = await this.delete(`/shipments/${params.id}`);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

