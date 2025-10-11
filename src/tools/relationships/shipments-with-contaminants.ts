// Shipments with Contaminants - Relationship Tool
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentsWithContaminantsTool extends BaseTool {
  name = "shipments_get_with_contaminants";
  description = "Get a shipment with all its detected contaminants in one call";

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
      description: "Shipment data with contaminants array",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      const validation = this.validateRequired(params, ["id"]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      // Get shipment
      const shipmentResponse = await this.get(`/shipments/${params.id}`);
      const shipment = shipmentResponse.data;

      // Get contaminants for this shipment
      const contaminantsResponse = await this.get("/contaminants-detected", {
        shipment_ids: params.id,
      });

      // Combine data
      const result = {
        ...shipment,
        contaminants: contaminantsResponse.data?.data || [],
      };

      return this.success(result, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

