// Shipments Update Tool - Update existing shipment
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentsUpdateTool extends BaseTool {
  name = "shipments_update";
  description = "Update an existing shipment (partial updates supported)";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Shipment ID to update",
        required: true,
      },
      facility_id: {
        type: "string",
        description: "Destination facility ID",
        required: false,
      },
      date: {
        type: "string",
        description: "Shipment date (ISO 8601 format)",
        required: false,
      },
      status: {
        type: "string",
        description: "Shipment status (pending, in_transit, delivered, rejected)",
        required: false,
      },
      weight_kg: {
        type: "number",
        description: "Weight in kilograms",
        required: false,
      },
      has_contaminants: {
        type: "boolean",
        description: "Whether contaminants were detected",
        required: false,
      },
      origin: {
        type: "string",
        description: "Origin location",
        required: false,
      },
      destination: {
        type: "string",
        description: "Destination location",
        required: false,
      },
      waste_type: {
        type: "string",
        description: "Type of waste",
        required: false,
      },
      waste_code: {
        type: "string",
        description: "Waste classification code",
        required: false,
      },
      carrier: {
        type: "string",
        description: "Transport company name",
        required: false,
      },
      composition_notes: {
        type: "string",
        description: "Description of waste composition",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated shipment details",
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

      // Validate enum values if provided
      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["pending", "in_transit", "delivered", "rejected"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      const { id, ...updateData } = params;
      const response = await this.put(`/shipments/${id}`, updateData);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

