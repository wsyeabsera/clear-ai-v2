// Contracts Update Tool - Update existing contract
import { BaseTool } from "../base-tool.js";
import { ToolResult } from "../../shared/types/tool.js";

export class ContractsUpdateTool extends BaseTool {
  name = "contracts_update";
  description = "Update an existing contract";

  schema = {
    params: {
      id: {
        type: "string",
        description: "Contract ID to update",
        required: true,
      },
      producer_id: {
        type: "string",
        description: "Producer ID",
        required: false,
      },
      facility_id: {
        type: "string",
        description: "Facility ID",
        required: false,
      },
      waste_types_declared: {
        type: "array",
        description: "Array of waste type codes (e.g., [\"191212\", \"150101\"])",
        required: false,
      },
      start_date: {
        type: "string",
        description: "Contract start date (ISO 8601)",
        required: false,
      },
      end_date: {
        type: "string",
        description: "Contract end date (ISO 8601)",
        required: false,
      },
      max_weight_kg: {
        type: "number",
        description: "Maximum weight in kilograms",
        required: false,
      },
      status: {
        type: "string",
        description: "Contract status (active, expired, suspended)",
        required: false,
      },
      terms: {
        type: "string",
        description: "Contract terms and conditions",
        required: false,
      },
    },
    returns: {
      type: "object",
      description: "Updated contract details",
    },
  };

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      if (!params.id) {
        throw new Error("Contract ID is required");
      }

      // Validate enum values if provided
      if (params.status) {
        const statusValidation = this.validateEnum(
          params.status,
          ["active", "expired", "suspended"],
          "status"
        );
        if (!statusValidation.valid) {
          throw new Error(statusValidation.error);
        }
      }

      // Remove id from params for the request body
      const { id, ...updateData } = params;

      // Filter out undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );

      const response = await this.put(`/contracts/${id}`, filteredUpdateData);

      // Unwrap API response to get just the data object
      const apiData = response.data as any;
      const contract = apiData.success ? apiData.data : apiData;

      return this.success(contract, Date.now() - startTime);
    } catch (error: any) {
      return this.error(error, Date.now() - startTime);
    }
  }
}
