// Waste Producers Create Tool - Create new waste producer
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class WasteProducersCreateTool extends BaseTool {
  name = "waste_producers_create";
  description = "Create a new waste producer";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Unique waste producer ID",
        required: true,
      },
      name: {
        type: "string",
        description: "Producer name",
        required: true,
      },
      type: {
        type: "string",
        description: "Producer type (industrial, commercial, municipal)",
        required: true,
      },
      location: {
        type: "string",
        description: "Producer location",
        required: true,
      },
      contact_email: {
        type: "string",
        description: "Contact email address",
        required: true,
      },
      contact_phone: {
        type: "string",
        description: "Contact phone number",
        required: true,
      },
      license_number: {
        type: "string",
        description: "License number",
        required: true,
      },
      active_contracts: {
        type: "number",
        description: "Number of active contracts (defaults to 0)",
        required: false,
        default: 0,
      },
    },
    returns: {
      type: "object",
      description: "Created waste producer details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      // Validate enum values
      const typeValidation = this.validateEnum(
        params.type,
        ["industrial", "commercial", "municipal"],
        "type"
      );
      if (!typeValidation.valid) {
        throw new Error(typeValidation.error);
      }

      // Validate required fields
      if (!params.id || !params.name || !params.location) {
        throw new Error("ID, name, and location are required");
      }

      if (!params.contact_email || !params.contact_phone || !params.license_number) {
        throw new Error("contact_email, contact_phone, and license_number are required");
      }

      // Set default for active_contracts if not provided
      if (params.active_contracts === undefined) {
        params.active_contracts = 0;
      }

      const response = await this.post("/waste-producers", params);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const producer = apiData.success ? apiData.data : apiData;

      return this.success(producer, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
