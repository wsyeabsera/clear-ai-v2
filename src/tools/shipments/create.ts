// Shipments Create Tool - Create new shipment
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ShipmentsCreateTool extends BaseTool {
  name = "shipments_create";
  description = "Create a new shipment with all fields including waste type, carrier, and composition notes";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique shipment ID",
        required: true,
      },
      facility_id: {
        type: "string",
        description: "Destination facility ID",
        required: true,
      },
      date: {
        type: "string",
        description: "Shipment date (ISO 8601 format)",
        required: true,
      },
      status: {
        type: "string",
        description: "Shipment status (pending, in_transit, delivered, rejected)",
        required: true,
      },
      weight_kg: {
        type: "number",
        description: "Weight in kilograms",
        required: true,
      },
      has_contaminants: {
        type: "boolean",
        description: "Whether contaminants were detected",
        required: true,
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
        description: "Type of waste (plastic, metal, paper, industrial, etc.)",
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
      description: "Created shipment details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate required fields
      const validation = this.validateRequired(params, [
        "id",
        "facility_id",
        "date",
        "status",
        "weight_kg",
        "has_contaminants",
      ]);
      if (!validation.valid) {
        throw new Error(`Missing required fields: ${validation.missing?.join(", ")}`);
      }

      // Validate enum values
      const statusValidation = this.validateEnum(
        params.status,
        ["pending", "in_transit", "delivered", "rejected"],
        "status"
      );
      if (!statusValidation.valid) {
        throw new Error(statusValidation.error);
      }

      const response = await this.post("/shipments", params);

      return this.success(response.data, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}

