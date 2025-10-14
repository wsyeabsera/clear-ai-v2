// Waste Producers Update Tool - Update existing waste producer
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class WasteProducersUpdateTool extends BaseTool {
  name = "waste_producers_update";
  description = "Update an existing waste producer";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Waste producer ID to update",
        required: true,
      },
      name: {
        type: "string",
        description: "Producer name",
        required: false,
      },
      type: {
        type: "string",
        description: "Producer type (industrial, commercial, municipal)",
        required: false,
      },
      location: {
        type: "string",
        description: "Producer location",
        required: false,
      },
      contact_email: {
        type: "string",
        description: "Contact email address",
        required: false,
      },
      contact_phone: {
        type: "string",
        description: "Contact phone number",
        required: false,
      },
      license_number: {
        type: "string",
        description: "License number",
        required: false,
      },
      active_contracts: {
        type: "number",
        description: "Number of active contracts",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated waste producer details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Waste producer ID is required");
      }

      // Validate enum values if provided
      if (params.type) {
        const typeValidation = this.validateEnum(
          params.type,
          ["industrial", "commercial", "municipal"],
          "type"
        );
        if (!typeValidation.valid) {
          throw new Error(typeValidation.error);
        }
      }

      // Remove id from params for the request body
      const { id, ...updateData } = params;

      // Filter out undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await this.put(`/waste-producers/${id}`, filteredUpdateData);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const producer = apiData.success ? apiData.data : apiData;

      return this.success(producer, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
